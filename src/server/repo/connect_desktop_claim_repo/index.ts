import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export type ConnectDesktopClaimStatus = "pending" | "accepted" | "denied";
export interface ConnectDesktopClaim {
  claim_id: string;
  device_id: string;
  bootstrap_token_hash: string;
  short_code_hash: string;
  idempotency_key: string;
  envelope_hash: string;
  status: ConnectDesktopClaimStatus;
  created_at: string;
  expires_at: string;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decision_idempotency_key: string | null;
}

@QueryBinder()
@Component()
export default class ConnectDesktopClaimRepo {
  @Query()
  createClaim(_params: Omit<ConnectDesktopClaim, "status" | "decided_at" | "decided_by_user_id" | "decision_idempotency_key">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query() @Single
  findByClaimId(_params: { claim_id: string }): Promise<ConnectDesktopClaim | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query() @Single
  findByCodeHash(_params: { short_code_hash: string }): Promise<ConnectDesktopClaim | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query() @Single
  findByIdempotencyKey(_params: { idempotency_key: string }): Promise<ConnectDesktopClaim | null> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  acceptPending(_params: { claim_id: string; decided_at: string; decided_by_user_id: string; decision_idempotency_key: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Query()
  denyPending(_params: { claim_id: string; decided_at: string; decided_by_user_id: string; decision_idempotency_key: string }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }
}
