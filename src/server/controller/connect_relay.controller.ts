import { Component, Inject } from "@noego/ioc";
import type { Request, Response } from "express";
import ConnectRelayLogic from "../logic/connect_relay.logic";
import ConnectRelayRequestParser, { type RelayRequestFailure } from "../services/connect_relay_request_parser";
import { ConnectExecutorDeviceAuthVerifier } from "../services/connect_executor_actor_resolver";

type Context = { req: Request; res: Response };
const PROTOCOL = "1.0";

@Component()
export default class ConnectRelayController {
  constructor(
    @Inject(ConnectRelayLogic) private readonly logic: ConnectRelayLogic,
    @Inject(ConnectRelayRequestParser) private readonly parser: ConnectRelayRequestParser,
    @Inject(ConnectExecutorDeviceAuthVerifier) private readonly auth: ConnectExecutorDeviceAuthVerifier,
  ) {}

  async post({ req, res }: Context) {
    res.setHeader("x-kazi-protocol-version", PROTOCOL);
    const authenticated = await this.authenticate(req);
    if (!authenticated.ok) return this.failure(res, authenticated.reason, "cor_relayinvalid");
    const parsed = this.parser.frame(req.body, authenticated.actor);
    if (!parsed.ok) return this.failure(res, parsed.reason, parsed.correlationId);
    const response = await this.logic.receive(authenticated.actor, parsed.value);
    return response ? res.status(200).json(response) : res.status(204).end();
  }

  async events({ req, res }: Context) {
    res.setHeader("x-kazi-protocol-version", PROTOCOL);
    const authenticated = await this.authenticate(req);
    if (!authenticated.ok) return this.failure(res, authenticated.reason, "cor_relayinvalid");
    res.status(200);
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    res.flushHeaders();
    const fence = this.logic.open(authenticated.actor, res);
    const close = () => {
      res.off("close", close);
      res.off("error", close);
      this.logic.close(authenticated.actor.executorId, fence);
    };
    res.once("close", close);
    res.once("error", close);
  }

  private async authenticate(req: Request) {
    const headers = this.parser.headers(req);
    if (!headers.ok) return headers;
    const verified = await this.auth.verify(headers.token);
    if (!verified.ok || verified.actor.role !== "executor_device"
      || verified.actor.executorId !== headers.executorId
      || verified.actor.deviceId !== headers.deviceId
      || verified.actor.generation !== headers.generation) {
      return { ok: false as const, reason: "unauthorized" as const };
    }
    return { ok: true as const, actor: verified.actor };
  }
  private failure(res: Response, reason: RelayRequestFailure, correlationId: string) {
    const status = reason === "protocol-version-mismatch" ? 409
      : reason === "payload-too-large" ? 413
        : reason === "unauthorized" ? 401 : 400;
    return res.status(status).json({
      kind: "error", protocolVersion: PROTOCOL,
      code: reason === "payload-too-large" ? "invalid-envelope"
        : reason === "unauthorized" ? "revoked" : reason,
      message: reason === "unauthorized" ? "Authentication failed"
        : reason === "protocol-version-mismatch" ? "Protocol version mismatch"
          : "Invalid request envelope",
      retryable: false, correlationId,
    });
  }
}
