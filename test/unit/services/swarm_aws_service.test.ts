/**
 * SwarmAwsService launch/stop against a stubbed AWS boundary.
 *
 * The subject is the real production instance resolved from the
 * original-config root testApp (swarms module, no server, no database). The
 * AWS boundary is the injectable SwarmAwsClients (ECS/SSM send), replaced per
 * case through immutable method controls; the real SDK command classes are
 * what the service constructs and what the assertions inspect. Credentials
 * come from a caller-built Env. resourceCase owns environment cleanup.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { testApp } from "@noego/app";
import { resourceCase, testStub, test as control } from "@noego/testing";
import type { RunTaskCommand, StopTaskCommand } from "@aws-sdk/client-ecs";
import Env from "../../../src/server/services/env";
import SwarmAwsService from "../../../src/server/services/swarm_aws_service";
import SwarmAwsClients from "../../../src/server/services/swarm_aws_clients";
import type { Swarm } from "../../../src/server/repo/swarm_repo";

const CONFIG = path.resolve(__dirname, "../../../noego.config.yml");
const SELECT = { server: { module: ["swarms"] } } as const;

const swarm: Swarm = {
  swarm_id: "swm_12345678",
  owner_user_id: "usr_12345678",
  env: "dev",
  region: "us-east-2",
  resource_class: "head_micro",
  state: "active",
  client_swarm_id: null,
  idempotency_key: null,
  executor_id: null,
  created_at: "2026-09-02T10:00:00.000Z",
  stopped_at: null,
};

// Credentials for one case: a caller-built Env; process.env is never mutated.
const credentials = () => {
  const env = new Env();
  env.load({
    SWARM_AWS_ACCESS_KEY_ID: "test-access-key",
    SWARM_AWS_SECRET_ACCESS_KEY: "test-secret-key",
  });
  return env;
};

describe("SwarmAwsService", () => {
  it("loads regional SSM launch config and includes required ECS tags and head overrides", resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, credentials)
      .method(SwarmAwsClients, "sendSsm", control.returns(Promise.resolve({
        Parameters: [
          { Name: "/kazibee_web/dev/swarm/us-east-2/cluster_arn", Value: "arn:cluster" },
          { Name: "/kazibee_web/dev/swarm/us-east-2/subnet_ids", Value: '["subnet-a","subnet-b"]' },
          { Name: "/kazibee_web/dev/swarm/us-east-2/security_group_id", Value: "sg-1" },
          { Name: "/kazibee_web/dev/swarm/us-east-2/task_definition/head_micro", Value: "arn:task-def" },
        ],
      })))
      .method(SwarmAwsClients, "sendEcs", control.returns(Promise.resolve({ tasks: [{ taskArn: "arn:task" }] })))
      .build();

    const subject = await env.get<SwarmAwsService>(SwarmAwsService);
    const result = await subject.launch(swarm, "mch_12345678", "machine-secret-token");
    expect(result).toEqual({ taskArn: "arn:task", taskDefinitionArn: "arn:task-def" });

    const runTask = control.inspect(env, SwarmAwsClients, "sendEcs").calls[0]!.args[1] as RunTaskCommand;
    expect(runTask.input).toMatchObject({
      launchType: "FARGATE",
      platformVersion: "1.4.0",
      enableECSManagedTags: true,
      propagateTags: "TASK_DEFINITION",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: ["subnet-a", "subnet-b"],
          securityGroups: ["sg-1"],
          assignPublicIp: "ENABLED",
        },
      },
    });
    expect(runTask.input.tags).toEqual(expect.arrayContaining([
      { key: "kazibee:env", value: "dev" },
      { key: "kazibee:swarm", value: "swm_12345678" },
      { key: "kazibee:machine", value: "mch_12345678" },
    ]));
    expect(runTask.input.overrides!.containerOverrides![0].environment).toEqual([
      { name: "KAZIBEE_MACHINE_TOKEN", value: "machine-secret-token" },
      { name: "KAZIBEE_SWARM_ID", value: "swm_12345678" },
      { name: "KAZIBEE_MACHINE_ID", value: "mch_12345678" },
    ]);
  }));

  it("uses StopTask for the persisted ECS task ARN", resourceCase(async () => {
    const env = await testApp(CONFIG).select(SELECT).use(testStub())
      .function(Env, credentials)
      .method(SwarmAwsClients, "sendSsm", control.returns(Promise.resolve({
        Parameters: [{ Name: "/kazibee_web/dev/swarm/us-east-2/cluster_arn", Value: "arn:cluster" }],
      })))
      .method(SwarmAwsClients, "sendEcs", control.returns(Promise.resolve({})))
      .build();
    const subject = await env.get<SwarmAwsService>(SwarmAwsService);
    await subject.stop(swarm, "arn:task");
    const stopTask = control.inspect(env, SwarmAwsClients, "sendEcs").calls[0]!.args[1] as StopTaskCommand;
    expect(stopTask.input).toEqual({
      cluster: "arn:cluster",
      task: "arn:task",
      reason: "swarm_stopped",
    });
  }));
});
