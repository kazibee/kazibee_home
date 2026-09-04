import { Component, Inject } from "@noego/ioc";
import ConnectAgentSessionRepo, {
  type ConnectAgentSession,
} from "../repo/connect_agent_session_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import { ConnectClock, ConnectCredentials } from "./connect_auth_primitives";
import Env from "./env";

const HANDOFF_TTL_MS = 60_000;
const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

interface CoordinatorNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: Request): Promise<Response> };
}

function coordinatorNamespace(value: unknown): CoordinatorNamespace | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  const candidate = value as Partial<CoordinatorNamespace>;
  return typeof candidate.idFromName === "function" && typeof candidate.get === "function"
    ? candidate as CoordinatorNamespace
    : null;
}

export type AgentSessionResult =
  | { ok: true; token: string; session: ConnectAgentSession }
  | { ok: false };

@Component()
export default class ConnectAgentSessionService {
  constructor(
    @Inject(ConnectAgentSessionRepo) private readonly repo: ConnectAgentSessionRepo,
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(Env) private readonly env: Env,
  ) {}

  async createHandoff(userId: string, executorId: string): Promise<{ ok: true; token: string } | { ok: false }> {
    const executor = await this.executors.findByExecutorId({ executor_id: executorId });
    if (!executor || executor.state !== "active" || executor.owner_user_id !== userId) return { ok: false };
    const coordinator = coordinatorNamespace(this.env.get("EXECUTOR_COORDINATOR"));
    if (!coordinator) return { ok: false };
    let presence: Response;
    try {
      presence = await coordinator.get(coordinator.idFromName(executorId)).fetch(
        new Request("https://coordinator/presence"),
      );
    } catch {
      return { ok: false };
    }
    const body = await presence.json().catch(() => null) as { state?: unknown } | null;
    if (!presence.ok || body?.state !== "online") return { ok: false };

    const token = this.credentials.randomToken();
    const createdAt = this.clock.now();
    await this.repo.createHandoff({
      token_hash: this.credentials.hashToken(token),
      user_id: userId,
      executor_id: executorId,
      created_at: createdAt.toISOString(),
      expires_at: new Date(createdAt.getTime() + HANDOFF_TTL_MS).toISOString(),
    });
    return { ok: true, token };
  }

  async consumeHandoff(token: string): Promise<AgentSessionResult> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { ok: false };
    const now = this.clock.now();
    const handoff = await this.repo.consumeHandoff({
      token_hash: this.credentials.hashToken(token),
      consumed_at: now.toISOString(),
    });
    if (!handoff) return { ok: false };

    const sessionToken = this.credentials.randomToken();
    const absolute = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    const session: ConnectAgentSession = {
      session_id: `ags_${crypto.randomUUID().replace(/-/g, "")}`,
      session_token_hash: this.credentials.hashToken(sessionToken),
      user_id: handoff.user_id,
      executor_id: handoff.executor_id,
      created_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      idle_expires_at: new Date(now.getTime() + SESSION_IDLE_MS).toISOString(),
      expires_at: absolute.toISOString(),
      revoked_at: null,
    };
    await this.repo.createSession(session);
    return { ok: true, token: sessionToken, session };
  }

  async authenticate(token: string | null): Promise<ConnectAgentSession | null> {
    if (!token) return null;
    const session = await this.repo.findByTokenHash({
      session_token_hash: this.credentials.hashToken(token),
    });
    if (!session || session.revoked_at) return null;
    const now = this.clock.now();
    if (new Date(session.idle_expires_at).getTime() <= now.getTime()
      || new Date(session.expires_at).getTime() <= now.getTime()) return null;
    const idle = new Date(Math.min(
      now.getTime() + SESSION_IDLE_MS,
      new Date(session.expires_at).getTime(),
    )).toISOString();
    await this.repo.touchSession({
      session_id: session.session_id,
      last_seen_at: now.toISOString(),
      idle_expires_at: idle,
    });
    return { ...session, last_seen_at: now.toISOString(), idle_expires_at: idle };
  }
}
