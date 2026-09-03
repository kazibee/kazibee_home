import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import { test as control } from "@noego/testing";
import SwarmController from "../../../src/server/controller/swarm.controller";
import SwarmMachineRepo from "../../../src/server/repo/swarm_machine_repo";
import SwarmRepo from "../../../src/server/repo/swarm_repo";
import ConnectExecutorActorResolver from "../../../src/server/services/connect_executor_actor_resolver";
import SwarmAwsService from "../../../src/server/services/swarm_aws_service";
import Env from "../../../src/server/services/env";
import RawRequest from "../../../src/server/services/raw_request";

const source = parseYaml(
  readFileSync(path.resolve(__dirname, "../../../src/server/openapi/swarms/swarms.yaml"), "utf8"),
) as Record<string, unknown>;

const SWARM_ID = "swm_12345678";
const MACHINE_ID = "mch_12345678";

function route(method: "get" | "post", routePath: string) {
  return testDinner(source)
    .select({ route: { method, path: routePath } })
    .controllers({ "swarm.controller": SwarmController })
    .hooks({});
}

describe("swarm controller authentication through testDinner", () => {
  it("returns 401 when create has no owner session", async () => {
    const env = await route("post", "/v1/swarms/").build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/",
      body: { env: "dev", region: "us-east-1", resourceClass: "head_micro" },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, code: "OWNER_AUTH_REQUIRED" });
    await env.dispose();
  });

  it("returns 401 for a channel upgrade with wrong bearer headers before repository access", async () => {
    const raw = new Request(
      "https://kazibee.test/v1/swarms/" + SWARM_ID + "/machines/" + MACHINE_ID + "/channel",
      {
        headers: {
          Upgrade: "websocket",
          authorization: "Bearer wrong",
          "x-kazi-swarm-id": SWARM_ID,
          "x-kazi-machine-id": MACHINE_ID,
          "x-kazi-audience": "not-swarm-head",
          "x-kazi-protocol-version": "0.9",
        },
      },
    );
    const env = await route("get", "/v1/swarms/{swarmId}/machines/{machineId}/channel")
      .methods([
        [RawRequest, { get: control.returns(raw) }],
        [SwarmMachineRepo, { findById: control.never() }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "GET",
      path: "/v1/swarms/" + SWARM_ID + "/machines/" + MACHINE_ID + "/channel",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, code: "CHANNEL_AUTH_FAILED" });
    await env.verify();
    await env.dispose();
  });

  it("creates a swarm for the authenticated browser owner", async () => {
    const env = await route("post", "/v1/swarms/")
      .methods([
        [ConnectExecutorActorResolver, {
          browser: control.once(control.returns(Promise.resolve({
            ok: true,
            actor: { role: "browser_session", userId: "usr_12345678", sessionId: "ses_12345678" },
          }))),
        }],
        [Env, { string: control.returns("dev") }],
        [SwarmRepo, { createSwarm: control.once(control.returns(Promise.resolve({
          swarm_id: SWARM_ID,
          owner_user_id: "usr_12345678",
          env: "dev",
          region: "us-east-1",
          resource_class: "head_micro",
          state: "active",
          client_swarm_id: null,
          idempotency_key: null,
          created_at: "2026-09-02T10:00:00.000Z",
          stopped_at: null,
        }))) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/?sessionId=ses_12345678",
      headers: { "x-csrf-token": "csrf-token-123456" },
      body: { env: "dev", region: "us-east-1", resourceClass: "head_micro" },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ state: "active" });
    await env.verify();
    await env.dispose();
  });

  it("persists a machine token hash before returning a successful launch", async () => {
    const swarm = {
      swarm_id: SWARM_ID,
      owner_user_id: "usr_12345678",
      env: "dev",
      region: "us-east-2",
      resource_class: "head_micro",
      state: "active",
      created_at: "2026-09-02T10:00:00.000Z",
      stopped_at: null,
    };
    const env = await route("post", "/v1/swarms/{swarmId}/machines")
      .methods([
        [ConnectExecutorActorResolver, {
          browser: control.once(control.returns(Promise.resolve({
            ok: true,
            actor: { role: "browser_session", userId: "usr_12345678", sessionId: "ses_12345678" },
          }))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(swarm))),
        }],
        [SwarmAwsService, {
          launchConfig: control.once(control.returns(Promise.resolve({
            clusterArn: "arn:cluster",
            subnetIds: ["subnet-1"],
            securityGroupId: "sg-1",
            taskDefinitionArn: "arn:task-def",
          }))),
          launch: control.once(control.returns(Promise.resolve({
            taskArn: "arn:task",
            taskDefinitionArn: "arn:task-def",
          }))),
        }],
        [SwarmMachineRepo, {
          createMachine: control.once(control.returns(Promise.resolve())),
          markRunning: control.once(control.returns(Promise.resolve())),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/" + SWARM_ID + "/machines?sessionId=ses_12345678",
      headers: { "x-csrf-token": "csrf-token-123456" },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ecsTaskArn: "arn:task" });
    await env.verify();
    await env.dispose();
  });
});


describe("swarm executor ownership and idempotency", () => {
  const executorActor = {
    ok: true as const,
    actor: {
      role: "executor_device" as const,
      executorId: "exe_12345678",
      deviceId: "dev_12345678",
      generation: 1,
      userId: "usr_12345678",
    },
  };
  const existing = (overrides: Record<string, unknown> = {}) => ({
    swarm_id: SWARM_ID,
    owner_user_id: "usr_12345678",
    env: "dev",
    region: "us-east-1",
    resource_class: "head_micro",
    state: "active",
    client_swarm_id: null,
    idempotency_key: "desktop-key-123",
    created_at: "2026-09-02T10:00:00.000Z",
    stopped_at: null,
    ...overrides,
  });
  const authorization = { authorization: "Bearer executor-credential-token-123" };

  it("creates a swarm for an authenticated executor device", async () => {
    const created = existing({ client_swarm_id: SWARM_ID });
    const env = await route("post", "/v1/swarms/")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [Env, { string: control.returns("dev") }],
        [SwarmRepo, {
          findByOwnerAndIdempotencyKey: control.once(control.returns(Promise.resolve(null))),
          createSwarm: control.once(control.returns(Promise.resolve(created))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/",
      headers: authorization,
      body: {
        env: "dev",
        region: "us-east-1",
        resourceClass: "head_micro",
        clientSwarmId: SWARM_ID,
        idempotencyKey: "desktop-key-123",
      },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ swarmId: SWARM_ID, state: "active" });
    await env.verify();
    await env.dispose();
  });

  it("replays an idempotent create without inserting", async () => {
    const env = await route("post", "/v1/swarms/")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [Env, { string: control.returns("dev") }],
        [SwarmRepo, {
          findByOwnerAndIdempotencyKey: control.once(control.returns(Promise.resolve(existing()))),
          createSwarm: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/",
      headers: authorization,
      body: {
        env: "dev", region: "us-east-1", resourceClass: "head_micro",
        idempotencyKey: "desktop-key-123",
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ swarmId: SWARM_ID, state: "active" });
    await env.verify();
    await env.dispose();
  });

  it("rejects a different create body under the same idempotency key", async () => {
    const env = await route("post", "/v1/swarms/")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [Env, { string: control.returns("dev") }],
        [SwarmRepo, {
          findByOwnerAndIdempotencyKey: control.once(control.returns(Promise.resolve(existing()))),
          createSwarm: control.never(),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/",
      headers: authorization,
      body: {
        env: "dev", region: "us-west-2", resourceClass: "head_micro",
        idempotencyKey: "desktop-key-123",
      },
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: true, code: "IDEMPOTENCY_CONFLICT" });
    await env.verify();
    await env.dispose();
  });

  it("rejects a duplicate client swarm id", async () => {
    const env = await route("post", "/v1/swarms/")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [Env, { string: control.returns("dev") }],
        [SwarmRepo, {
          createSwarm: control.once(control.returns(Promise.resolve(null))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/",
      headers: authorization,
      body: {
        env: "dev", region: "us-east-1", resourceClass: "head_micro", clientSwarmId: SWARM_ID,
      },
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: true, code: "SWARM_ID_TAKEN" });
    await env.verify();
    await env.dispose();
  });

  it("hides another user's swarm from an executor", async () => {
    const env = await route("get", "/v1/swarms/{swarmId}")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(null))),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "GET",
      path: "/v1/swarms/" + SWARM_ID,
      headers: authorization,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: true, code: "SWARM_NOT_FOUND" });
    await env.verify();
    await env.dispose();
  });

  it("accepts executor liveness for its own swarm", async () => {
    const coordinator = {
      idFromName: (_name: string) => "unused",
      get: (_id: unknown) => ({ fetch: async () => Response.json({}) }),
    };
    const env = await route("post", "/v1/swarms/{swarmId}/liveness")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(existing()))),
        }],
        [SwarmMachineRepo, {
          listNonStoppedBySwarm: control.once(control.returns(Promise.resolve([]))),
        }],
        [Env, { get: control.once(control.returns(coordinator)) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/" + SWARM_ID + "/liveness",
      headers: authorization,
      body: { desktopSeenAt: "2026-09-02T10:00:00.000Z" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, delivered: 0, total: 0 });
    await env.verify();
    await env.dispose();
  });

  it("lets an executor launch a machine in its own swarm", async () => {
    const env = await route("post", "/v1/swarms/{swarmId}/machines")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(existing()))),
        }],
        [SwarmAwsService, {
          launchConfig: control.once(control.returns(Promise.resolve({
            clusterArn: "arn:cluster",
            subnetIds: ["subnet-1"],
            securityGroupId: "sg-1",
            taskDefinitionArn: "arn:task-def",
          }))),
          launch: control.once(control.returns(Promise.resolve({
            taskArn: "arn:task",
            taskDefinitionArn: "arn:task-def",
          }))),
        }],
        [SwarmMachineRepo, {
          createMachine: control.once(control.returns(Promise.resolve())),
          markRunning: control.once(control.returns(Promise.resolve())),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/" + SWARM_ID + "/machines",
      headers: authorization,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ecsTaskArn: "arn:task" });
    await env.verify();
    await env.dispose();
  });

  it("lets an executor read its own swarm detail", async () => {
    const coordinator = {
      idFromName: (_name: string) => "unused",
      get: (_id: unknown) => ({ fetch: async () => Response.json({}) }),
    };
    const env = await route("get", "/v1/swarms/{swarmId}")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(existing()))),
        }],
        [SwarmMachineRepo, {
          listBySwarm: control.once(control.returns(Promise.resolve([]))),
        }],
        [Env, { get: control.returns(coordinator) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "GET",
      path: "/v1/swarms/" + SWARM_ID,
      headers: authorization,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ swarmId: SWARM_ID, machines: [] });
    await env.verify();
    await env.dispose();
  });

  it("lets an executor stop its own swarm", async () => {
    const coordinator = {
      idFromName: (_name: string) => "unused",
      get: (_id: unknown) => ({ fetch: async () => Response.json({}) }),
    };
    const env = await route("post", "/v1/swarms/{swarmId}/stop")
      .methods([
        [ConnectExecutorActorResolver, {
          device: control.once(control.returns(Promise.resolve(executorActor))),
        }],
        [SwarmRepo, {
          findByIdAndOwner: control.once(control.returns(Promise.resolve(existing()))),
          markStopping: control.once(control.returns(Promise.resolve())),
          markStopped: control.once(control.returns(Promise.resolve())),
        }],
        [SwarmMachineRepo, {
          listNonStoppedBySwarm: control.once(control.returns(Promise.resolve([]))),
        }],
        [Env, { get: control.returns(coordinator) }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: "/v1/swarms/" + SWARM_ID + "/stop",
      headers: authorization,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ swarmId: SWARM_ID, state: "stopped" });
    await env.verify();
    await env.dispose();
  });

});
