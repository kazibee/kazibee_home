import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export type ConnectBrowserSessionStatus = "active" | "revoked";

export interface ConnectBrowserSession {
  session_id: string;
  user_id: string;
  session_token_hash: string;
  csrf_token_hash: string;
  status: ConnectBrowserSessionStatus;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class ConnectBrowserSessionRepo {
  @Query()
  async createSession(_params: {
    session_id: string;
    user_id: string;
    session_token_hash: string;
    csrf_token_hash: string;
    status: ConnectBrowserSessionStatus;
    created_at: string;
    last_seen_at: string;
    idle_expires_at: string;
    absolute_expires_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByTokenHash(_params: { session_token_hash: string }) {
    return Trust.tryAsync(
      () => run<ConnectBrowserSession | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async touchSession(_params: {
    session_id: string;
    last_seen_at: string;
    idle_expires_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async revokeSession(_params: { session_id: string; revoked_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
