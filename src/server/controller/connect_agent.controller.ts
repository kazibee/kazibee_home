import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import ConnectAgentSessionService from "../services/connect_agent_session_service";
import ConnectSessionAuthService from "../services/connect_session_auth_service";
import ConnectAuthPolicy from "../services/connect_auth_policy";
import Env from "../services/env";
import OAuthOrigins from "../services/oauth_origins";
import RawRequest from "../services/raw_request";

const AGENT_SESSION_COOKIE = "__Host-kazi_agent_session";
const EXECUTOR_ID = /^exe_[A-Za-z0-9]{8,64}$/;

type Context = { req: Request; res: Response };

interface CoordinatorNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: globalThis.Request): Promise<globalThis.Response> };
}

interface AssetBinding {
  fetch(request: globalThis.Request): Promise<globalThis.Response>;
}

function coordinatorNamespace(value: unknown): CoordinatorNamespace | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  const candidate = value as Partial<CoordinatorNamespace>;
  return typeof candidate.idFromName === "function" && typeof candidate.get === "function"
    ? candidate as CoordinatorNamespace
    : null;
}

function cookie(req: Request, name: string): string | null {
  const cookies: unknown = req.cookies;
  if (!cookies || typeof cookies !== "object" || Array.isArray(cookies)) return null;
  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === "string" ? value : null;
}

@Component()
export default class ConnectAgentController {
  constructor(
    @Inject(ConnectAgentSessionService) private readonly sessions: ConnectAgentSessionService,
    @Inject(ConnectSessionAuthService) private readonly connectSessions: ConnectSessionAuthService,
    @Inject(ConnectAuthPolicy) private readonly authPolicy: ConnectAuthPolicy,
    @Inject(OAuthOrigins) private readonly origins: OAuthOrigins,
    @Inject(Env) private readonly env: Env,
    @Inject(RawRequest) private readonly rawRequest: RawRequest,
  ) {}

  async createHandoff({ req, res }: Context) {
    const executorId = (req.body as { executorId?: unknown } | undefined)?.executorId;
    if (typeof executorId !== "string" || !EXECUTOR_ID.test(executorId)) {
      return res.status(400).json({ error: true, code: "INVALID_EXECUTOR_ID" });
    }
    const csrfHeader = req.headers["x-csrf-token"];
    const auth = await this.connectSessions.authorizeMutation(
      cookie(req, this.authPolicy.sessionCookieName),
      cookie(req, this.authPolicy.csrfCookieName),
      typeof csrfHeader === "string" ? csrfHeader : null,
    );
    if (!auth.ok) return res.status(auth.reason === "csrf" ? 403 : 401).json({ error: true });
    const handoff = await this.sessions.createHandoff(auth.value.account.user_id, executorId);
    if (!handoff.ok) return res.status(404).json({ error: true, code: "EXECUTOR_OFFLINE" });
    return res.status(201).json({
      url: `${this.origins.agentOrigin}/handoff/${handoff.token}`,
    });
  }

  async handoff({ req, res }: Context) {
    const token = typeof req.params?.token === "string" ? req.params.token : "";
    const session = await this.sessions.consumeHandoff(token);
    if (!session.ok) {
      return res.redirect(302, `${this.origins.websiteOrigin}/connect?agent=expired`);
    }
    res.cookie(AGENT_SESSION_COOKIE, session.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.redirect(302, "/");
  }

  async home({ req, res }: Context) {
    const session = await this.sessions.authenticate(cookie(req, AGENT_SESSION_COOKIE));
    if (!session) return res.redirect(302, `${this.origins.websiteOrigin}/connect`);
    const raw = this.rawRequest.get();
    const assets = this.env.get("ASSETS") as Partial<AssetBinding> | undefined;
    if (!raw || !assets || typeof assets.fetch !== "function") {
      return res.status(503).send("Web Agent renderer is unavailable.");
    }
    const index = await assets.fetch(new globalThis.Request(new URL("/index.html", raw.url)));
    const headers = new Headers(index.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Content-Security-Policy", this.csp());
    headers.set("X-Frame-Options", "DENY");
    return new globalThis.Response(index.body, { status: index.status, headers });
  }

  async connect({ req, res }: Context) {
    const raw = this.rawRequest.get();
    if (!raw || raw.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return res.status(426).json({ error: true, code: "UPGRADE_REQUIRED" });
    }
    if (raw.headers.get("Origin") !== this.origins.agentOrigin) {
      return res.status(403).json({ error: true, code: "ORIGIN_MISMATCH" });
    }
    const session = await this.sessions.authenticate(cookie(req, AGENT_SESSION_COOKIE));
    if (!session) return res.status(401).json({ error: true, code: "SESSION_REQUIRED" });
    const coordinator = coordinatorNamespace(this.env.get("EXECUTOR_COORDINATOR"));
    if (!coordinator) return res.status(503).json({ error: true, code: "COORDINATOR_UNAVAILABLE" });

    const headers = new Headers(raw.headers);
    headers.set("x-kazi-account-ref", session.user_id);
    headers.set("x-kazi-executor-id", session.executor_id);
    headers.set(
      "x-kazi-session-id",
      `vs_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    );
    const forwarded = new globalThis.Request("https://coordinator/viewer", {
      method: "GET",
      headers,
    });
    return coordinator.get(coordinator.idFromName(session.executor_id)).fetch(forwarded);
  }

  async asset({ req, res }: Context) {
    const session = await this.sessions.authenticate(cookie(req, AGENT_SESSION_COOKIE));
    if (!session) return res.status(401).json({ error: true, code: "SESSION_REQUIRED" });
    const path = typeof req.query?.path === "string" ? req.query.path : "";
    if (!path.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(path)) {
      return res.status(400).json({ error: true, code: "INVALID_PATH" });
    }
    const coordinator = coordinatorNamespace(this.env.get("EXECUTOR_COORDINATOR"));
    if (!coordinator) return res.status(503).json({ error: true, code: "COORDINATOR_UNAVAILABLE" });

    const request = new globalThis.Request("https://coordinator/session-invoke", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kazi-account-ref": session.user_id,
      },
      body: JSON.stringify({ channel: "assets.read", payload: { path } }),
    });
    let response: globalThis.Response;
    try {
      response = await Promise.race([
        coordinator.get(coordinator.idFromName(session.executor_id)).fetch(request),
        new Promise<globalThis.Response>((resolve) => setTimeout(
          () => resolve(globalThis.Response.json({ code: "TIMEOUT" }, { status: 504 })),
          30_000,
        )),
      ]);
    } catch {
      return res.status(504).json({ error: true, code: "TIMEOUT" });
    }
    if (response.status === 504) return res.status(504).json({ error: true, code: "TIMEOUT" });
    const frame = await response.json().catch(() => null) as {
      type?: unknown;
      value?: { mimeType?: unknown; bytesBase64?: unknown; error?: unknown };
    } | null;
    if (!response.ok || frame?.type !== "result" || frame.value?.error
      || typeof frame.value?.mimeType !== "string"
      || typeof frame.value?.bytesBase64 !== "string") {
      return res.status(404).json({ error: true, code: "ASSET_NOT_FOUND" });
    }
    const decoded = atob(frame.value.bytesBase64);
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return new globalThis.Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": frame.value.mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  private csp(): string {
    const host = new URL(this.origins.agentOrigin).host;
    return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
      + "img-src 'self' data: blob:; connect-src 'self' wss://" + host
      + "; frame-ancestors 'none';";
  }
}
