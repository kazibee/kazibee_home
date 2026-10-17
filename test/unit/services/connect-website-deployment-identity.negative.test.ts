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
import { Result } from "@noego/trust";
import ConnectWebsiteDeploymentIdentityService from "../../../src/server/services/connect_website_deployment_identity_service";
import ConnectWebsiteDeploymentIdentityRepo from "../../../src/server/repo/connect_website_deployment_identity_repo";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["connectClientRelay"] } } as const;

describe("ConnectWebsiteDeploymentIdentityService fail-closed guards", () => {
  it("fails closed when the freshly created singleton cannot be re-read", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.returns(Promise.resolve(Result.ok(null))))
      .method(ConnectWebsiteDeploymentIdentityRepo, "createIfMissing", control.returns(Promise.resolve(Result.ok(undefined))))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get())
      .resolves.toEqual(Result.err({ kind: "deployment_identity_not_persisted" }));
  }));

  it("fails closed when the persisted identity is malformed", resourceCase(async (scope) => {
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton",
        control.returns(Promise.resolve(Result.ok({ singleton_key: 1, website_deployment_id: "wdp_short" }))))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get())
      .resolves.toEqual(Result.err({ kind: "deployment_identity_invalid" }));
  }));

  it("fails closed with the repository failure when the singleton cannot be read", resourceCase(async (scope) => {
    const cause = new Error("connection refused");
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton",
        control.returns(Promise.resolve(Result.err({ kind: "query_failed", cause }))))
      .method(ConnectWebsiteDeploymentIdentityRepo, "createIfMissing", control.never())
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get()).resolves.toEqual(Result.err({ kind: "query_failed", cause }));
    await env.verify();
  }));

  it("mints and validates a fresh identity when none exists yet", resourceCase(async (scope) => {
    let stored: string | null = null;
    const env = scope.environment(await testApp(CONFIG).select(SELECT)
      .method(ConnectWebsiteDeploymentIdentityRepo, "findSingleton", control.watch(() =>
        async () => Result.ok(stored ? { singleton_key: 1, website_deployment_id: stored } : null)))
      .method(ConnectWebsiteDeploymentIdentityRepo, "createIfMissing", control.watch(() =>
        async (input: { website_deployment_id: string }) => {
          stored = input.website_deployment_id;
          return Result.ok(undefined);
        }))
      .build());
    const subject = await env.get<ConnectWebsiteDeploymentIdentityService>(ConnectWebsiteDeploymentIdentityService);
    await expect(subject.get()).resolves.toEqual(Result.ok(expect.stringMatching(/^wdp_[a-f0-9]{32}$/)));
  }));
});
