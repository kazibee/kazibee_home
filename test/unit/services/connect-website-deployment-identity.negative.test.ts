/**
 * Fail-closed branches of ConnectWebsiteDeploymentIdentityService with a
 * stubbed repo — the happy singleton path lives in the DB tier.
 */
import { describe, expect, it, vi } from "vitest";
import ConnectWebsiteDeploymentIdentityService from "../../../src/server/services/connect_website_deployment_identity_service";
import type ConnectWebsiteDeploymentIdentityRepo from "../../../src/server/repo/connect_website_deployment_identity_repo";

function serviceWith(repo: Record<string, unknown>) {
  return new ConnectWebsiteDeploymentIdentityService(
    repo as unknown as ConnectWebsiteDeploymentIdentityRepo,
  );
}

describe("ConnectWebsiteDeploymentIdentityService fail-closed guards", () => {
  it("throws when the freshly created singleton cannot be re-read", async () => {
    const subject = serviceWith({
      findSingleton: vi.fn(async () => null),
      createIfMissing: vi.fn(async () => undefined),
    });
    await expect(subject.get())
      .rejects.toThrow("Website deployment identity persistence invariant failed");
  });

  it("throws when the persisted identity is malformed", async () => {
    const subject = serviceWith({
      findSingleton: vi.fn(async () => ({ singleton_key: 1, website_deployment_id: "wdp_short" })),
    });
    await expect(subject.get())
      .rejects.toThrow("Persisted Website deployment identity is invalid");
  });

  it("mints and validates a fresh identity when none exists yet", async () => {
    let stored: string | null = null;
    const subject = serviceWith({
      findSingleton: vi.fn(async () => (stored ? { singleton_key: 1, website_deployment_id: stored } : null)),
      createIfMissing: vi.fn(async (input: { website_deployment_id: string }) => {
        stored = input.website_deployment_id;
      }),
    });
    await expect(subject.get()).resolves.toMatch(/^wdp_[a-f0-9]{32}$/);
  });
});
