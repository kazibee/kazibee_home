import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectClientRelayLogic from "../logic/connect_client_relay.logic";
import {
  ConnectDesktopRelayActorResolver,
} from "../services/connect_desktop_actor_resolver";
import { createSseStream } from "../services/sse_stream";
import ConnectClientRelayRequestParser, {
  type ClientRelayFailure,
} from "../services/connect_client_relay_request_parser";

import { WebsiteLoggerAdapter, type WebsiteLoggerPort } from "../services/connect_auth_primitives";

type Context = { req: Request; res: Response };
const PROTOCOL = "1.0";

@Component()
export default class ConnectClientRelayController {
  private readonly logger: WebsiteLoggerPort;

  constructor(
    @Inject(ConnectClientRelayLogic) private readonly logic: ConnectClientRelayLogic,
    @Inject(ConnectClientRelayRequestParser) private readonly parser: ConnectClientRelayRequestParser,
    @Inject(ConnectDesktopRelayActorResolver) private readonly actors: ConnectDesktopRelayActorResolver,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
  ) { this.logger = loggers.forSource("connect-client-relay"); }

  async commands({ req, res }: Context) {
    res.setHeader("x-kazi-protocol-version", PROTOCOL);
    const resolved = await this.actors.resolve(req);
    if (!resolved.ok) return this.failure(res, "unauthorized", "cor_invalid000");
    const parsed = this.parser.command(req.body);
    if (!parsed.ok) return this.failure(res, parsed.reason, parsed.correlationId);
    const result = await this.logic.command(resolved.actor, parsed.value, parsed.byteCount);
    if (result.outcome === "accepted") return res.status(200).json(result.frame);
    if (result.outcome === "unauthorized") {
      return this.failure(res, "unauthorized", parsed.value.correlationId);
    }
    if (result.outcome === "overloaded") {
      return this.failure(res, "backpressure", parsed.value.correlationId);
    }
    return this.failure(res, result.outcome, parsed.value.correlationId);
  }

  async executors({ req, res }: Context) {
    res.setHeader("x-kazi-protocol-version", PROTOCOL);
    const correlationId = this.parser.queryCorrelation(req.query.correlationId);
    if (!correlationId || Object.keys(req.query).some((key) => key !== "correlationId")) {
      return this.failure(res, "invalid-envelope", correlationId ?? "cor_invalid000");
    }
    const resolved = await this.actors.resolve(req);
    if (!resolved.ok) return this.failure(res, "unauthorized", correlationId);
    this.logger.info("connect.discovery.started", { correlationId, action: "list-executors", outcome: "started" });
    let executors;
    try {
      executors = await this.logic.listExecutors(resolved.actor);
    } catch (error) {
      this.logger.error("connect.discovery.failed", { correlationId, action: "list-executors", outcome: "failed", reason: "discovery-unavailable" });
      throw error;
    }
    this.logger.info("connect.discovery.completed", {
      correlationId, action: "list-executors", outcome: "completed", executorCount: executors.length,
      executors: executors.map(({ executorId, state, online, presence, protocolVersion }) => ({
        executorId, state, online, presence, protocolVersion,
      })),
    });
    return res.status(200).json({
      kind: "executor.list.response",
      protocolVersion: PROTOCOL,
      executors,
      correlationId,
    });
  }

  async events({ req, res }: Context) {
    const resolved = await this.actors.resolve(req);
    if (!resolved.ok) {
      res.setHeader("x-kazi-protocol-version", PROTOCOL);
      return this.failure(res, "unauthorized", "cor_invalid000");
    }
    const { response, sink } = createSseStream();
    response.headers.set("x-kazi-protocol-version", PROTOCOL);
    const fence = this.logic.open(resolved.actor, sink);
    sink.onClose(() => this.logic.close(resolved.actor.deviceId, fence));
    return response;
  }

  private failure(res: Response, reason: ClientRelayFailure, correlationId: string) {
    this.logger.warn("connect.relay.rejected", { correlationId, action: "reject-request", outcome: "rejected", reason });
    const status = reason === "protocol-version-mismatch" ? 409
      : reason === "website-deployment-mismatch" ? 409
      : reason === "payload-too-large" ? 413
        : reason === "unauthorized" ? 401
          : reason === "backpressure" ? 429
            : reason === "invalid-envelope" ? 400 : 503;
    const executorOffline = reason === "executor-offline" || reason === "accept-timeout";
    const code = executorOffline ? "executor-offline"
      : reason === "protocol-version-mismatch" ? reason
        : reason === "website-deployment-mismatch" ? reason
        : reason === "unauthorized" ? "revoked" : "invalid-envelope";
    const message = executorOffline ? "Executor is offline"
      : reason === "unauthorized" ? "Authentication failed"
        : reason === "protocol-version-mismatch" ? "Protocol version mismatch"
          : reason === "website-deployment-mismatch" ? "Website deployment mismatch"
          : reason === "backpressure" ? "Relay is backpressured" : "Invalid request envelope";
    return res.status(status).json({
      kind: "error", protocolVersion: PROTOCOL, code, message,
      retryable: executorOffline || reason === "backpressure", correlationId,
    });
  }
}
