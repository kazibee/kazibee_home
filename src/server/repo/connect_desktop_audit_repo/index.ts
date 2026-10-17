import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, run } from "sqlstack";

export type ConnectDesktopAuditKind =
  | "claim.created" | "claim.accepted" | "claim.denied"
  | "desktop.renamed" | "desktop.revoked";

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopAuditRepo {
  @Query()
  async appendEvent(_params: {
    audit_event_id: string;
    device_id: string;
    claim_id: string | null;
    actor_user_id: string | null;
    event_kind: ConnectDesktopAuditKind;
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
