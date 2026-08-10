import { Component } from "@noego/ioc";
import { Query, QueryBinder, SqlStackError } from "sqlstack";

export type ConnectDesktopAuditKind =
  | "claim.created" | "claim.accepted" | "claim.denied"
  | "desktop.renamed" | "desktop.revoked";

@QueryBinder()
@Component()
export default class ConnectDesktopAuditRepo {
  @Query()
  appendEvent(_params: {
    audit_event_id: string;
    device_id: string;
    claim_id: string | null;
    actor_user_id: string | null;
    event_kind: ConnectDesktopAuditKind;
    credential_generation: number;
    occurred_at: string;
    correlation_id: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
