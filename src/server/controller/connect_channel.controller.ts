import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectChannelAuthService from "../services/connect_channel_auth_service";
import Env from "../services/env";
import RawRequest from "../services/raw_request";

type Context = { req: Request; res: Response };

interface CoordinatorNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: globalThis.Request): Promise<globalThis.Response> };
}

function asCoordinator(value: unknown): CoordinatorNamespace | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  const candidate = value as Partial<CoordinatorNamespace>;
  if (typeof candidate.idFromName !== "function" || typeof candidate.get !== "function") return null;
  return candidate as CoordinatorNamespace;
}

const EXECUTOR_ID = /^exe_[A-Za-z0-9]{8,64}$/;
const DEVICE_ID = /^dev_[A-Za-z0-9]{8,64}$/;
const GENERATION = /^[1-9][0-9]{0,15}$/;
const BEARER = /^Bearer [A-Za-z0-9_-]{16,200}$/;

/**
 * Executor channel upgrade — `GET /v1/connect/executors/{executorId}/channel`.
 *
 * The executor dials out and holds one WebSocket to its ExecutorCoordinator
 * Durable Object. This controller authenticates the upgrade and forwards the
 * raw request; it never proxies frames itself, because a per-isolate proxy
 * would reintroduce exactly the process-memory routing the coordinator exists
 * to replace.
 */
@Component()
export default class ConnectChannelController {
  constructor(
    @Inject(Env) private readonly env: Env,
    @Inject(RawRequest) private readonly rawRequest: RawRequest,
    @Inject(ConnectChannelAuthService) private readonly auth: ConnectChannelAuthService,
  ) {}

  async connect({ req, res }: Context) {
    const executorId = req.params?.executorId;
    if (typeof executorId !== "string" || !EXECUTOR_ID.test(executorId)) {
      return res.status(400).json({ error: true, code: "INVALID_EXECUTOR_ID" });
    }

    const raw = this.rawRequest.get();
    if (!raw) {
      return res.status(500).json({ error: true, code: "RAW_REQUEST_UNAVAILABLE" });
    }
    if (raw.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return res.status(426).json({ error: true, code: "UPGRADE_REQUIRED" });
    }

    // Fail closed on channel identity before any Durable Object is touched:
    // an unauthenticated upgrade must not be able to spin up a coordinator
    // instance or displace a live executor's fence.
    const authorization = raw.headers.get("authorization");
    const deviceId = raw.headers.get("x-kazi-device-id");
    const headerExecutorId = raw.headers.get("x-kazi-executor-id");
    const generation = raw.headers.get("x-kazi-credential-generation");
    const audience = raw.headers.get("x-kazi-audience");
    const protocolVersion = raw.headers.get("x-kazi-protocol-version");

    if (!authorization || !BEARER.test(authorization)
      || !deviceId || !DEVICE_ID.test(deviceId)
      || headerExecutorId !== executorId
      || !generation || !GENERATION.test(generation)
      || audience !== "executor-relay"
      || protocolVersion !== "1.1") {
      return res.status(401).json({ error: true, code: "CHANNEL_AUTH_FAILED" });
    }

    // The bearer is the executor credential (the bootstrap token, promoted at
    // claim acceptance). Verified against the credential row on every upgrade
    // — hash match, executor, device, and generation must all agree.
    const verdict = await this.auth.authenticate({
      token: authorization.slice("Bearer ".length),
      executorId,
      deviceId,
      generation: Number(generation),
    });
    if (!verdict.ok) {
      return res.status(401).json({ error: true, code: "CHANNEL_AUTH_FAILED" });
    }

    const coordinator = asCoordinator(this.env.get("EXECUTOR_COORDINATOR"));
    if (!coordinator) {
      return res.status(503).json({ error: true, code: "COORDINATOR_UNAVAILABLE" });
    }

    return coordinator.get(coordinator.idFromName(executorId)).fetch(raw);
  }

  /**
   * Credential check for the local dev coordinator, which terminates the
   * executor WebSocket itself (node dev cannot upgrade) and delegates auth
   * here so production and dev share one verification implementation. The
   * presented credential is the authentication; the endpoint reveals only
   * ok/not-ok.
   */
  async authenticate({ req, res }: Context) {
    const body = req.body as {
      authorization?: string;
      executorId?: string;
      deviceId?: string;
      generation?: string;
      audience?: string;
      protocolVersion?: string;
    } | undefined;

    if (!body
      || typeof body.authorization !== "string" || !BEARER.test(body.authorization)
      || typeof body.executorId !== "string" || !EXECUTOR_ID.test(body.executorId)
      || typeof body.deviceId !== "string" || !DEVICE_ID.test(body.deviceId)
      || typeof body.generation !== "string" || !GENERATION.test(body.generation)
      || body.audience !== "executor-relay"
      || body.protocolVersion !== "1.1") {
      return res.status(401).json({ ok: false });
    }

    const verdict = await this.auth.authenticate({
      token: body.authorization.slice("Bearer ".length),
      executorId: body.executorId,
      deviceId: body.deviceId,
      generation: Number(body.generation),
    });
    if (!verdict.ok) return res.status(401).json({ ok: false });
    return res.json({ ok: true, executorId: verdict.executorId, generation: verdict.generation });
  }
}
