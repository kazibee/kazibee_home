import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface ConnectAgentHandoff {
  token_hash: string;
  user_id: string;
  executor_id: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

export interface ConnectAgentSession {
  session_id: string;
  session_token_hash: string;
  user_id: string;
  executor_id: string;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  expires_at: string;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class ConnectAgentSessionRepo {
  @Query()
  async createHandoff(_params: Omit<ConnectAgentHandoff, "consumed_at">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async consumeHandoff(_params: { token_hash: string; consumed_at: string }) {
    return Trust.tryAsync(
      () => run<ConnectAgentHandoff | null>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async createSession(_params: Omit<ConnectAgentSession, "revoked_at">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByTokenHash(_params: { session_token_hash: string }) {
    return Trust.tryAsync(
      () => run<ConnectAgentSession | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async touchSession(_params: { session_id: string; last_seen_at: string; idle_expires_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
