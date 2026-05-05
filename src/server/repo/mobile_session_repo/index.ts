import { Component } from "@noego/ioc";
import { QueryBinder, Query, Single, SqlStackError } from "sqlstack";

export interface MobileSession {
  id: number;
  device_id: number;
  session_token: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class MobileSessionRepo {
  @Query()
  @Single
  findByToken(params: { session_token: string }): Promise<MobileSession | null> {
    throw new SqlStackError("Not implemented");
  }
}
