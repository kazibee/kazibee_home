import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export type ConnectAccountStatus = "active" | "disabled";

export interface ConnectAccount {
  user_id: string;
  username: string;
  password_hash: string;
  status: ConnectAccountStatus;
  created_at: string;
}

@QueryBinder()
@Component()
export default class ConnectAccountRepo {
  @Query()
  createAccount(_params: {
    user_id: string;
    username: string;
    password_hash: string;
    status: ConnectAccountStatus;
    created_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  @Single
  findByUsername(_params: { username: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  @Single
  findByUserId(_params: { user_id: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }
}
