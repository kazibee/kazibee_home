import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export type ConnectExecutorClaimStatus = "pending" | "accepted" | "denied";
export interface ConnectExecutorClaim {
  claim_id: string;
  executor_id: string;
  bootstrap_token_hash: string;
  short_code_hash: string;
  idempotency_key: string;
  envelope_hash: string;
  status: ConnectExecutorClaimStatus;
  created_at: string;
  expires_at: string;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decision_idempotency_key: string | null;
}

@QueryBinder()
@Component()
export default class ConnectExecutorClaimRepo {
  @Query()
  createClaim(_params: Omit<ConnectExecutorClaim, "status" | "decided_at" | "decided_by_user_id" | "decision_idempotency_key">): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByClaimId(_params: { claim_id: string }): Promise<ConnectExecutorClaim | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByCodeHash(_params: { short_code_hash: string }): Promise<ConnectExecutorClaim | null> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findByIdempotencyKey(_params: { idempotency_key: string }): Promise<ConnectExecutorClaim | null> {
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
