import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, run } from "sqlstack";

export type ConnectExecutorAuditKind =
  | "claim.created" | "claim.accepted" | "claim.denied"
  | "executor.renamed" | "executor.revoked";

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorAuditRepo {
  @Query()
  async appendEvent(_params: {
    audit_event_id: string;
    executor_id: string;
    claim_id: string | null;
    actor_user_id: string | null;
    event_kind: ConnectExecutorAuditKind;
    credential_generation: number;
    occurred_at: string;
    correlation_id: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
