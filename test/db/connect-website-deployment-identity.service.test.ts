import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeTestDatabase, resetTestDatabase } from "../helpers/test-db";
import ConnectWebsiteDeploymentIdentityRepo from "../../src/server/repo/connect_website_deployment_identity_repo";
import ConnectWebsiteDeploymentIdentityService from "../../src/server/services/connect_website_deployment_identity_service";

describe("ConnectWebsiteDeploymentIdentityService", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterEach(async () => {
    await closeTestDatabase();
  });

  it("mints one strict persisted singleton and reuses it in a rebuilt service", async () => {
    const first = new ConnectWebsiteDeploymentIdentityService(
      new ConnectWebsiteDeploymentIdentityRepo(),
    );
    const firstId = await first.get();
    expect(firstId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);
    await expect(first.get()).resolves.toBe(firstId);

    const rebuilt = new ConnectWebsiteDeploymentIdentityService(
      new ConnectWebsiteDeploymentIdentityRepo(),
    );
    await expect(rebuilt.get()).resolves.toBe(firstId);
    const rows = await new ConnectWebsiteDeploymentIdentityRepo().findSingleton();
    expect(rows).toMatchObject({
      singleton_key: 1,
      website_deployment_id: firstId,
    });
  });
});
