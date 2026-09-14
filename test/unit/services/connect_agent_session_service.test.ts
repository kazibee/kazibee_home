/**
 * ConnectAgentSessionService handoff consumption over the original-config
 * root testApp (connectAgentHandoffs module, no server, no database). The
 * service is the real production singleton resolved from the built root; the
 * clock and credential primitives are pinned through singular method
 * controls, and the @Query repo boundary is replaced per case by watched
 * method replacements closing over that case's own in-memory handoff/session
 * state. resourceCase owns environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control, testStub } from "@noego/testing";
import ConnectAgentSessionService from "../../../src/server/services/connect_agent_session_service";
import ConnectAgentSessionRepo, {
  type ConnectAgentHandoff,
  type ConnectAgentSession,
} from "../../../src/server/repo/connect_agent_session_repo";
import { ConnectClock, ConnectCredentials } from "../../../src/server/services/connect_auth_primitives";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectAgentHandoffs"] } } as const;

// Deterministic clock and credential primitives on their actual tokens.
const primitives = (now: Date) => testStub()
  .method(ConnectClock, "now", control.watch(() => () => new Date(now)))
  .method(ConnectCredentials, "randomToken", control.returns("a".repeat(43)))
  .method(ConnectCredentials, "hashToken", control.watch(() => (value: string) => "hash:" + value));

describe("ConnectAgentSessionService handoffs", () => {
  it("consumes a handoff token exactly once", resourceCase(async (scope) => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const store: { handoff: ConnectAgentHandoff | null; sessions: ConnectAgentSession[] } = {
      handoff: {
        token_hash: "hash:" + "t".repeat(43),
        user_id: "usr_12345678",
        executor_id: "exe_12345678",
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 60_000).toISOString(),
        consumed_at: null,
      },
      sessions: [],
    };
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .use(primitives(now))
      .method(ConnectAgentSessionRepo, "consumeHandoff", control.watch(() =>
        async ({ token_hash, consumed_at }: { token_hash: string; consumed_at: string }) => {
          if (!store.handoff || store.handoff.token_hash !== token_hash || store.handoff.consumed_at
            || new Date(store.handoff.expires_at).getTime() <= new Date(consumed_at).getTime()) return null;
          store.handoff = { ...store.handoff, consumed_at };
          return store.handoff;
        }))
      .method(ConnectAgentSessionRepo, "createSession", control.watch(() =>
        async (value: Omit<ConnectAgentSession, "revoked_at">) => {
          store.sessions.push({ ...value, revoked_at: null });
        }))
      .build());
    const target = await env.get<ConnectAgentSessionService>(ConnectAgentSessionService);
    expect((await target.consumeHandoff("t".repeat(43))).ok).toBe(true);
    expect((await target.consumeHandoff("t".repeat(43))).ok).toBe(false);
    expect(store.sessions).toHaveLength(1);
  }));

  it("rejects an expired handoff token", resourceCase(async (scope) => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const store: { handoff: ConnectAgentHandoff | null; sessions: ConnectAgentSession[] } = {
      handoff: {
        token_hash: "hash:" + "t".repeat(43),
        user_id: "usr_12345678",
        executor_id: "exe_12345678",
        created_at: new Date(now.getTime() - 120_000).toISOString(),
        expires_at: new Date(now.getTime() - 1).toISOString(),
        consumed_at: null,
      },
      sessions: [],
    };
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .use(primitives(now))
      .method(ConnectAgentSessionRepo, "consumeHandoff", control.watch(() =>
        async ({ token_hash, consumed_at }: { token_hash: string; consumed_at: string }) => {
          if (!store.handoff || store.handoff.token_hash !== token_hash || store.handoff.consumed_at
            || new Date(store.handoff.expires_at).getTime() <= new Date(consumed_at).getTime()) return null;
          store.handoff = { ...store.handoff, consumed_at };
          return store.handoff;
        }))
      .method(ConnectAgentSessionRepo, "createSession", control.watch(() =>
        async (value: Omit<ConnectAgentSession, "revoked_at">) => {
          store.sessions.push({ ...value, revoked_at: null });
        }))
      .build());
    const target = await env.get<ConnectAgentSessionService>(ConnectAgentSessionService);
    expect((await target.consumeHandoff("t".repeat(43))).ok).toBe(false);
    expect(store.sessions).toHaveLength(0);
  }));
});
