/**
 * Swarm member MCP relay (`POST /v1/swarms/{swarmId}/mcp`) through
 * testDinner (no server, no database, no coordinator).
 *
 * The website is a pure relay: it resolves the swarm's bound Desktop
 * executor and forwards the opaque `swarm:<token>` bearer inside the
 * remote_tool.call payload. Dispatch is stubbed so the exact forwarded
 * target can be asserted.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import { test as control } from "@noego/testing";
import SwarmMcpController from "../../../src/server/controller/swarm_mcp.controller";
import SwarmRepo from "../../../src/server/repo/swarm_repo";
import RemoteToolDispatchService from "../../../src/server/services/remote_tool_dispatch_service";

const source = parseYaml(
  readFileSync(path.resolve(__dirname, "../../../src/server/openapi/swarms/swarms.yaml"), "utf8"),
) as Record<string, unknown>;

const SWARM_ID = "swm_12345678";
const EXECUTOR_ID = "exe_desktop01";
const TOKEN = "swarm:" + "t".repeat(64);
const MCP_PATH = "/v1/swarms/" + SWARM_ID + "/mcp";

const swarm = (overrides: Record<string, unknown> = {}) => ({
  swarm_id: SWARM_ID,
  owner_user_id: "usr_12345678",
  env: "dev",
  region: "us-east-1",
  resource_class: "head_micro",
  state: "active",
  client_swarm_id: SWARM_ID,
  idempotency_key: "swarm-create-1",
  executor_id: EXECUTOR_ID,
  created_at: "2026-09-02T10:00:00.000Z",
  stopped_at: null,
  ...overrides,
});

function route() {
  return testDinner(source)
    .select({ route: { method: "post", path: "/v1/swarms/{swarmId}/mcp" } })
    .controllers({ "swarm_mcp.controller": SwarmMcpController })
    .hooks({});
}

describe("swarm member MCP relay through testDinner", () => {
  it("rejects requests without a swarm bearer before touching the repository", async () => {
    const env = await route()
      .methods([[SwarmRepo, { findById: control.never() }]])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: MCP_PATH,
      body: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: true, code: "SWARM_BEARER_REQUIRED" });
    await env.verify();
    await env.dispose();
  });

  it("rejects owner PAT/OAuth-shaped bearers as swarm bearers", async () => {
    const env = await route()
      .methods([[SwarmRepo, { findById: control.never() }]])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + "G".repeat(43) },
      body: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(response.status).toBe(401);
    await env.verify();
    await env.dispose();
  });

  it("answers 404 for a stopped swarm and 409 for a swarm without a bound executor", async () => {
    const stopped = await route()
      .methods([[SwarmRepo, { findById: control.once(control.returns(Promise.resolve(swarm({ state: "stopped" })))) }]])
      .build();
    const stoppedResponse = await stopped.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(stoppedResponse.status).toBe(404);
    await stopped.verify();
    await stopped.dispose();

    const unbound = await route()
      .methods([[SwarmRepo, { findById: control.once(control.returns(Promise.resolve(swarm({ executor_id: null })))) }]])
      .build();
    const unboundResponse = await unbound.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(unboundResponse.status).toBe(409);
    expect(await unboundResponse.json()).toEqual({ error: true, code: "SWARM_EXECUTOR_UNBOUND" });
    await unbound.verify();
    await unbound.dispose();
  });

  it("negotiates initialize and acknowledges notifications without dispatching", async () => {
    const env = await route()
      .methods([
        [SwarmRepo, { findById: control.returns(Promise.resolve(swarm())) }],
        [RemoteToolDispatchService, { callTarget: control.never() }],
      ])
      .build();
    const initialize = await env.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
    });
    expect(initialize.status).toBe(200);
    expect(await initialize.json()).toMatchObject({
      id: 1,
      result: { protocolVersion: "2025-03-26", serverInfo: { name: "Kazibee Swarm Member Tools" } },
    });
    const notification = await env.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", method: "notifications/initialized" },
    });
    expect(notification.status).toBe(202);
    await env.verify();
    await env.dispose();
  });

  it("forwards tools/list as tool_help to the swarm's executor with the opaque bearer", async () => {
    const calls: unknown[] = [];
    const env = await route()
      .methods([
        [SwarmRepo, { findById: control.once(control.returns(Promise.resolve(swarm()))) }],
        [RemoteToolDispatchService, {
          callTarget: control.watch(() => async (target: unknown, toolName: string, args: unknown) => {
            calls.push({ target, toolName, args });
            return {
              ok: true,
              status: "succeeded",
              payload: { tools: [{ name: "swarm_group", description: "Group actions", inputSchema: { type: "object" } }] },
              effectState: "none",
            };
          }),
        }],
      ])
      .build();
    const response = await env.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: { tools: [{ name: "swarm_group", description: "Group actions", inputSchema: { type: "object" } }] },
    });
    expect(calls).toEqual([{
      target: {
        executorId: EXECUTOR_ID,
        workspaceId: "*",
        scopes: [],
        grantId: "swarm:" + SWARM_ID,
        toolSessionId: "rts_swarm_12345678",
        authorization: TOKEN,
      },
      toolName: "tool_help",
      args: {},
    }]);
    await env.verify();
    await env.dispose();
  });

  it("maps executor denials to isError tool results and offline routing to JSON-RPC errors", async () => {
    const denied = await route()
      .methods([
        [SwarmRepo, { findById: control.once(control.returns(Promise.resolve(swarm()))) }],
        [RemoteToolDispatchService, {
          callTarget: control.once(control.returns(Promise.resolve({
            ok: false,
            code: "EXECUTION_TICKET_INVALID",
            message: "The swarm runtime binding is revoked, stale, incomplete, or does not allow this tool.",
            retryable: false,
            effectState: "none",
          }))),
        }],
      ])
      .build();
    const deniedResponse = await denied.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "writeFile", arguments: { path: "a.ts" } } },
    });
    expect(deniedResponse.status).toBe(200);
    expect(await deniedResponse.json()).toMatchObject({
      id: 3,
      result: { isError: true, structuredContent: { ok: false, code: "EXECUTION_TICKET_INVALID" } },
    });
    await denied.verify();
    await denied.dispose();

    const offline = await route()
      .methods([
        [SwarmRepo, { findById: control.once(control.returns(Promise.resolve(swarm()))) }],
        [RemoteToolDispatchService, {
          callTarget: control.once(control.returns(Promise.resolve({
            ok: false,
            code: "EXECUTOR_OFFLINE",
            message: "Executor routing failed.",
          }))),
        }],
      ])
      .build();
    const offlineResponse = await offline.dinner.request({
      method: "POST",
      path: MCP_PATH,
      headers: { authorization: "Bearer " + TOKEN },
      body: { jsonrpc: "2.0", id: 4, method: "tools/list" },
    });
    expect(offlineResponse.status).toBe(200);
    expect(await offlineResponse.json()).toMatchObject({ id: 4, error: { code: -32603 } });
    await offline.verify();
    await offline.dispose();
  });
});
