import { Component, Inject, LoadAs } from "@noego/ioc";
import { transaction } from "sqlstack";
import ConnectExecutorService from "../services/connect_executor_service";
import type { ConnectExecutorActor } from "../services/connect_executor_actor_resolver";
import type { ClaimCreateInput, ClaimDecisionInput, RenameInput, RevokeInput } from "../services/connect_executor_request_parser";

@Component({ scope: LoadAs.Singleton })
export default class ConnectExecutorLogic {
  // sqlstack binds SQLite transactions to one connection. Queue the short
  // decision transaction so concurrent HTTP requests cannot overlap BEGINs.
  private claimDecisionTail: Promise<void> = Promise.resolve();

  constructor(@Inject(ConnectExecutorService) private readonly service: ConnectExecutorService) {}

  @transaction
  createClaim(_actor: ConnectExecutorActor, input: ClaimCreateInput, token: string) {
    return this.service.createClaim(input, token);
  }

  claimStatus(_actor: ConnectExecutorActor, claimId: string, token: string | null) {
    return this.service.status(claimId, token);
  }

  review(_actor: ConnectExecutorActor, lookup: { claimId?: string; code?: string }) {
    return this.service.review(lookup);
  }

  async decide(actor: ConnectExecutorActor, input: ClaimDecisionInput) {
    let release!: () => void;
    const predecessor = this.claimDecisionTail;
    this.claimDecisionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return await this.decideTransaction(actor, input);
    } finally {
      release();
    }
  }

  @transaction
  private decideTransaction(actor: ConnectExecutorActor, input: ClaimDecisionInput) {
    return this.service.decide(actor, input);
  }

  list(actor: ConnectExecutorActor) {
    return this.service.list(actor);
  }

  detail(actor: ConnectExecutorActor, executorId: string) {
    return this.service.detail(actor, executorId);
  }

  presence(executorId: string) {
    return this.service.presence(executorId);
  }

  @transaction
  rename(actor: ConnectExecutorActor, input: RenameInput) {
    return this.service.rename(actor, input);
  }

  @transaction
  revoke(actor: ConnectExecutorActor, input: RevokeInput) {
    return this.service.revoke(actor, input);
  }
}
