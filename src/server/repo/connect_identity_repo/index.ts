import { Component } from "@noego/ioc";
import { Query, QueryBinder, run } from "sqlstack";

@QueryBinder()
@Component()
export default class ConnectIdentityRepo {
  @Query()
  linkGoogle(_params: {
    id: string;
    user_id: string;
    provider_subject: string;
    email: string;
    created_at: string;
  }): Promise<void> {
    return run();
  }
}
