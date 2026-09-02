import { Component } from "@noego/ioc";
import { QueryBinder, Query, run } from "sqlstack";

@QueryBinder()
@Component()
export default class StatusRepo {
  @Query()
  checkDatabase(): Promise<{ result: number }> {
    return run();
  }

}
