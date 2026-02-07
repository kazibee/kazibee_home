import { Component } from "@noego/ioc";
import { QueryBinder, Query, SqlStackError } from "sqlstack";

@QueryBinder()
@Component()
export default class StatusRepo {
  @Query()
  checkDatabase(): Promise<{ result: number }> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  getFrameworkName(): Promise<{ name: string }> {
    throw new SqlStackError("Not implemented");
  }
}
