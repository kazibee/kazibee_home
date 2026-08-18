import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

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
  createSession(_params: {
    session_id: string;
    user_id: string;
    session_token_hash: string;
    csrf_token_hash: string;
    status: ConnectBrowserSessionStatus;
    created_at: string;
    last_seen_at: string;
    idle_expires_at: string;
    absolute_expires_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByTokenHash(_params: { session_token_hash: string }): Promise<ConnectBrowserSession | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  touchSession(_params: {
    session_id: string;
    last_seen_at: string;
    idle_expires_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeSession(_params: { session_id: string; revoked_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
