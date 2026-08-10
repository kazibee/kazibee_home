import { Component, Inject, LoadAs } from "@noego/ioc";
import { randomBytes } from "node:crypto";
import ConnectWebsiteDeploymentIdentityRepo from "../repo/connect_website_deployment_identity_repo";

const WEBSITE_DEPLOYMENT_ID = /^wdp_[A-Za-z0-9]{32}$/;

@Component({ scope: LoadAs.Singleton })
export default class ConnectWebsiteDeploymentIdentityService {
  private identity: Promise<string> | undefined;

  constructor(
    @Inject(ConnectWebsiteDeploymentIdentityRepo)
    private readonly identities: ConnectWebsiteDeploymentIdentityRepo,
  ) {}

  get(): Promise<string> {
    this.identity ??= this.loadOrCreate();
    return this.identity;
  }

  private async loadOrCreate(): Promise<string> {
    const existing = await this.identities.findSingleton();
    if (existing) return this.assertValid(existing.website_deployment_id);

    const candidate = `wdp_${randomBytes(16).toString("hex")}`;
    await this.identities.createIfMissing({
      website_deployment_id: candidate,
      created_at: new Date().toISOString(),
    });
    const persisted = await this.identities.findSingleton();
    if (!persisted) throw new Error("Website deployment identity persistence invariant failed");
    return this.assertValid(persisted.website_deployment_id);
  }

  private assertValid(value: string): string {
    if (!WEBSITE_DEPLOYMENT_ID.test(value)) {
      throw new Error("Persisted Website deployment identity is invalid");
    }
    return value;
  }
}
