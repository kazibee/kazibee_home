import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export interface ConnectDesktopCredential {
  credential_id: string;
  device_id: string;
  generation: number;
  token_hash: string;
  audience: "desktop-relay";
  status: "active" | "revoked";
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

@QueryBinder()
@Component()
export default class ConnectDesktopCredentialRepo {
  @Query()
  createCredential(_params: Omit<ConnectDesktopCredential, "status" | "revoked_at" | "audience">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query() @Single
  findByTokenHash(_params: { token_hash: string }): Promise<ConnectDesktopCredential | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  revokeForDevice(_params: { device_id: string; revoked_at: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
