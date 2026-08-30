import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export type ConnectAccountStatus = "active" | "disabled";

export interface ConnectAccount {
  user_id: string;
  username: string;
  email: string;
  email_verified_at: string | null;
  password_hash: string | null;
  status: ConnectAccountStatus;
  created_at: string;
  updated_at: string;
}

@QueryBinder()
@Component()
export default class ConnectAccountRepo {
  @Query()
  createAccount(_params: {
    user_id: string;
    username: string;
    email: string;
    email_verified_at: string | null;
    password_hash: string | null;
    status: ConnectAccountStatus;
    created_at: string;
    updated_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByUsername(_params: { username: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByEmail(_params: { email: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findPasswordlessByEmail(_params: { email: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  setPassword(_params: {
    user_id: string;
    username: string;
    password_hash: string;
    updated_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByUserId(_params: { user_id: string }): Promise<ConnectAccount | null> {
    throw new SqlStackError("Not implemented");
  }
}
