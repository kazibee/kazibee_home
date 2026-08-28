import { Component } from "@noego/ioc";
import { Query, QueryBinder, SqlStackError } from "sqlstack";

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
    throw new SqlStackError("Not implemented");
  }
}
