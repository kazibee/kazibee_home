import { Component, Inject, LoadAs } from "@noego/ioc";
import { transaction } from "sqlstack";
import ConnectDesktopService from "../services/connect_desktop_service";
import type { ConnectDesktopActor } from "../services/connect_desktop_actor_resolver";
import type {
  DesktopClaimCreateInput, DesktopClaimDecisionInput, DesktopRenameInput, DesktopRevokeInput,
} from "../services/connect_desktop_request_parser";

@Component({ scope: LoadAs.Singleton })
export default class ConnectDesktopLogic {
  // sqlstack binds SQLite transactions to one connection. Queue the short
  // decision transaction so concurrent HTTP requests cannot overlap BEGINs.
  private claimDecisionTail: Promise<void> = Promise.resolve();

  constructor(@Inject(ConnectDesktopService) private readonly service: ConnectDesktopService) {}

  @transaction
  createClaim(_actor: ConnectDesktopActor, input: DesktopClaimCreateInput, token: string) {
    return this.service.createClaim(input, token);
  }

  claimStatus(_actor: ConnectDesktopActor, claimId: string, token: string | null) {
    return this.service.status(claimId, token);
  }

  review(_actor: ConnectDesktopActor, lookup: { claimId?: string; code?: string }) {
    return this.service.review(lookup);
  }

  async decide(actor: ConnectDesktopActor, input: DesktopClaimDecisionInput) {
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
  private decideTransaction(actor: ConnectDesktopActor, input: DesktopClaimDecisionInput) {
    return this.service.decide(actor, input);
  }

  list(actor: ConnectDesktopActor) {
    return this.service.list(actor);
  }

  detail(actor: ConnectDesktopActor, deviceId: string) {
    return this.service.detail(actor, deviceId);
  }

  @transaction
  rename(actor: ConnectDesktopActor, input: DesktopRenameInput) {
    return this.service.rename(actor, input);
  }

  @transaction
  revoke(actor: ConnectDesktopActor, input: DesktopRevokeInput) {
    return this.service.revoke(actor, input);
  }
}
