import { Component, Inject, LoadAs } from "@noego/ioc";
import { randomBytes } from "node:crypto";
import { Result } from "@noego/trust";
import ConnectWebsiteDeploymentIdentityRepo from "../repo/connect_website_deployment_identity_repo";
import type { RepoFailure } from "../repo/repo_failure";

const WEBSITE_DEPLOYMENT_ID = /^wdp_[A-Za-z0-9]{32}$/;

/**
 * Why the deployment identity is unavailable: the repository failed, the
 * singleton could not be re-read after creating it, or the stored value is
 * malformed. Each fails closed: callers answer `failed`, never a made-up id.
 */
export type DeploymentIdentityFailure =
  | RepoFailure
  | { kind: "deployment_identity_not_persisted" }
  | { kind: "deployment_identity_invalid" };

@Component({ scope: LoadAs.Singleton })
export default class ConnectWebsiteDeploymentIdentityService {
  /**
   * The lookup in flight or its successful result, shared by every caller of
   * this root. A failed lookup is not kept: the next caller tries again.
   */
  private identity: Promise<Result<string, DeploymentIdentityFailure>> | undefined;

  constructor(
    @Inject(ConnectWebsiteDeploymentIdentityRepo)
    private readonly identities: ConnectWebsiteDeploymentIdentityRepo,
  ) {}

  get(): Promise<Result<string, DeploymentIdentityFailure>> {
    this.identity ??= this.loadOnce();
    return this.identity;
  }

  private async loadOnce(): Promise<Result<string, DeploymentIdentityFailure>> {
    const identity = await this.loadOrCreate();
    if (!identity.ok) this.identity = undefined;
    return identity;
  }

  private async loadOrCreate(): Promise<Result<string, DeploymentIdentityFailure>> {
    const existing = await this.identities.findSingleton();
    if (!existing.ok) return existing;
    if (existing.value) return this.validated(existing.value.website_deployment_id);

    const candidate = `wdp_${randomBytes(16).toString("hex")}`;
    const created = await this.identities.createIfMissing({
      website_deployment_id: candidate,
      created_at: new Date().toISOString(),
    });
    if (!created.ok) return created;
    const persisted = await this.identities.findSingleton();
    if (!persisted.ok) return persisted;
    if (!persisted.value) return Result.err({ kind: "deployment_identity_not_persisted" });
    return this.validated(persisted.value.website_deployment_id);
  }

  private validated(value: string) {
    if (!WEBSITE_DEPLOYMENT_ID.test(value)) {
      return Result.err({ kind: "deployment_identity_invalid" });
    }
    return Result.ok(value);
  }
}
