import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

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
  async createAccount(_params: {
    user_id: string;
    username: string;
    email: string;
    email_verified_at: string | null;
    password_hash: string | null;
    status: ConnectAccountStatus;
    created_at: string;
    updated_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByUsername(_params: { username: string }) {
    return Trust.tryAsync(
      () => run<ConnectAccount | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByEmail(_params: { email: string }) {
    return Trust.tryAsync(
      () => run<ConnectAccount | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Single
  @Query()
  async findPasswordlessByEmail(_params: { email: string }) {
    return Trust.tryAsync(
      () => run<ConnectAccount | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async setPassword(_params: {
    user_id: string;
    username: string;
    password_hash: string;
    updated_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByUserId(_params: { user_id: string }) {
    return Trust.tryAsync(
      () => run<ConnectAccount | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }
}
