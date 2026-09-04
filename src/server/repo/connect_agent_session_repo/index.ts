import { Component } from "@noego/ioc";
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
  createHandoff(_params: Omit<ConnectAgentHandoff, "consumed_at">): Promise<void> {
    return run();
  }

  @Single
  @Query()
  consumeHandoff(_params: { token_hash: string; consumed_at: string }): Promise<ConnectAgentHandoff | null> {
    return run();
  }

  @Query()
  createSession(_params: Omit<ConnectAgentSession, "revoked_at">): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findByTokenHash(_params: { session_token_hash: string }): Promise<ConnectAgentSession | null> {
    return run();
  }

  @Query()
  touchSession(_params: { session_id: string; last_seen_at: string; idle_expires_at: string }): Promise<void> {
    return run();
  }
}
