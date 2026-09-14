/**
 * Fail-closed branches of ConnectWebsiteDeploymentIdentityService over the
 * original-config root testApp (connectClientRelay module, whose service graph
 * owns the deployment identity; no server, no database). The service is the
 * real production singleton resolved from the built root and its @Query repo
 * boundary is controlled through singular method replacements on the actual
 * token — the happy singleton path lives in the DB tier. resourceCase owns
 * environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, test as control } from "@noego/testing";
import ConnectWebsiteDeploymentIdentityService from "../../../src/server/services/connect_website_deployment_identity_service";
import ConnectWebsiteDeploymentIdentityRepo from "../../../src/server/repo/connect_website_deployment_identity_repo";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectClientRelay"] } } as const;

describe("ConnectWebsiteDeploymentIdentityService fail-closed guards", () => {
  it("throws when the freshly created singleton cannot be re-read", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.returns(Promise.resolve(null)))
      .method(ConnectWebsiteDeploymentIdentityRepo, "createIfMissing", control.returns(Promise.resolve(undefined)))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get())
      .rejects.toThrow("Website deployment identity persistence invariant failed");
  }));

  it("throws when the persisted identity is malformed", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton",
        control.returns(Promise.resolve({ singleton_key: 1, website_deployment_id: "wdp_short" })))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get())
      .rejects.toThrow("Persisted Website deployment identity is invalid");
  }));

  it("mints and validates a fresh identity when none exists yet", resourceCase(async (scope) => {
    let stored: string | null = null;
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.watch(() =>
        async () => (stored ? { singleton_key: 1, website_deployment_id: stored } : null)))
      .method(ConnectWebsiteDeploymentIdentityRepo, "createIfMissing", control.watch(() =>
        async (input: { website_deployment_id: string }) => {
          stored = input.website_deployment_id;
        }))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get()).resolves.toMatch(/^wdp_[a-f0-9]{32}$/);
  }));
});
