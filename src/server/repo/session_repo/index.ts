import { Component } from "@noego/ioc";
import { QueryBinder, Query, Single, SqlStackError } from "sqlstack";

export interface Session {
  session_id: string;
  user_id: string;
  device_id: string;
  device_type: string | null;
  session_fence_message_id: number;
  status: string;
  created_at: string;
  last_heartbeat_at: string | null;
  closed_at: string | null;
}

@QueryBinder()
@Component()
export default class SessionRepo {
  @Query()
  createSession(_params: { session_id: string; user_id: string; device_id: string; device_type: string | null; session_fence_message_id: number }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findBySessionId(_params: { session_id: string }): Promise<Session | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  findActiveByDeviceId(_params: { device_id: string }): Promise<Session[]> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  closeSession(_params: { session_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  updateHeartbeat(_params: { session_id: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
