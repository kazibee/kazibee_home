import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

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
@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopClaimRepo {
  @Query()
  async createClaim(_params: Omit<ConnectDesktopClaim, "status" | "decided_at" | "decided_by_user_id" | "decision_idempotency_key">) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByClaimId(_params: { claim_id: string }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopClaim | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByCodeHash(_params: { short_code_hash: string }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopClaim | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByIdempotencyKey(_params: { idempotency_key: string }) {
    return Trust.tryAsync(
      () => run<ConnectDesktopClaim | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async acceptPending(_params: { claim_id: string; decided_at: string; decided_by_user_id: string; decision_idempotency_key: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Query()
  async denyPending(_params: { claim_id: string; decided_at: string; decided_by_user_id: string; decision_idempotency_key: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
