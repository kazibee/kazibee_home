import { describe, expect, it } from "vitest";
import ConnectAgentSessionService from "../../../src/server/services/connect_agent_session_service";
import type {
  ConnectAgentHandoff,
  ConnectAgentSession,
} from "../../../src/server/repo/connect_agent_session_repo";

class FakeRepo {
  handoff: ConnectAgentHandoff | null = null;
  sessions: ConnectAgentSession[] = [];

  async createHandoff(value: Omit<ConnectAgentHandoff, "consumed_at">) {
    this.handoff = { ...value, consumed_at: null };
  }

  async consumeHandoff({ token_hash, consumed_at }: { token_hash: string; consumed_at: string }) {
    if (!this.handoff || this.handoff.token_hash !== token_hash || this.handoff.consumed_at
      || new Date(this.handoff.expires_at).getTime() <= new Date(consumed_at).getTime()) return null;
    this.handoff = { ...this.handoff, consumed_at };
    return this.handoff;
  }

  async createSession(value: Omit<ConnectAgentSession, "revoked_at">) {
    this.sessions.push({ ...value, revoked_at: null });
  }

  async findByTokenHash() { return null; }
  async touchSession() {}
}

function service(repo: FakeRepo, now: Date) {
  return new ConnectAgentSessionService(
    repo as never,
    {} as never,
    {
      randomToken: () => "a".repeat(43),
      hashToken: (value: string) => "hash:" + value,
    } as never,
    { now: () => new Date(now) } as never,
    {} as never,
  );
}

describe("ConnectAgentSessionService handoffs", () => {
  it("consumes a handoff token exactly once", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const repo = new FakeRepo();
    repo.handoff = {
      token_hash: "hash:" + "t".repeat(43),
      user_id: "usr_12345678",
      executor_id: "exe_12345678",
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 60_000).toISOString(),
      consumed_at: null,
    };
    const target = service(repo, now);
    expect((await target.consumeHandoff("t".repeat(43))).ok).toBe(true);
    expect((await target.consumeHandoff("t".repeat(43))).ok).toBe(false);
    expect(repo.sessions).toHaveLength(1);
  });

  it("rejects an expired handoff token", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const repo = new FakeRepo();
    repo.handoff = {
      token_hash: "hash:" + "t".repeat(43),
      user_id: "usr_12345678",
      executor_id: "exe_12345678",
      created_at: new Date(now.getTime() - 120_000).toISOString(),
      expires_at: new Date(now.getTime() - 1).toISOString(),
      consumed_at: null,
    };
    expect((await service(repo, now).consumeHandoff("t".repeat(43))).ok).toBe(false);
    expect(repo.sessions).toHaveLength(0);
  });
});
