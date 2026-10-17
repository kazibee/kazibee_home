import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, run } from "sqlstack";

@QueryBinder()
@Component()
export default class ConnectIdentityRepo {
  @Query()
  async linkGoogle(_params: {
    id: string;
    user_id: string;
    provider_subject: string;
    email: string;
    created_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
