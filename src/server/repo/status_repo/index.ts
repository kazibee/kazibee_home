import { Component } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { QueryBinder, Query, run } from "sqlstack";

@QueryBinder()
@Component()
export default class StatusRepo {
  @Query()
  async checkDatabase() {
    return Trust.tryAsync(
      () => run<{ result: number }>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

}
