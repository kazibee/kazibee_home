import { beforeEach, describe, expect, it, vi } from "vitest";
import Env from "../../../src/server/services/env";
import type { Swarm } from "../../../src/server/repo/swarm_repo";

const calls = vi.hoisted(() => ({
  ecsSend: vi.fn(),
  ssmSend: vi.fn(),
}));

vi.mock("@aws-sdk/client-ecs", () => ({
  ECSClient: class {
    send(command: unknown) { return calls.ecsSend(command); }
  },
  RunTaskCommand: class {
    constructor(public readonly input: Record<string, unknown>) {}
  },
  StopTaskCommand: class {
    constructor(public readonly input: Record<string, unknown>) {}
  },
}));

vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send(command: unknown) { return calls.ssmSend(command); }
  },
  GetParametersCommand: class {
    constructor(public readonly input: Record<string, unknown>) {}
  },
}));

const { default: SwarmAwsService } = await import("../../../src/server/services/swarm_aws_service");

const swarm: Swarm = {
  swarm_id: "swm_12345678",
  owner_user_id: "usr_12345678",
  env: "dev",
  region: "us-east-2",
  resource_class: "head_micro",
  state: "active",
  created_at: "2026-09-02T10:00:00.000Z",
  stopped_at: null,
};

function service() {
  const env = new Env();
  env.load({
    SWARM_AWS_ACCESS_KEY_ID: "test-access-key",
    SWARM_AWS_SECRET_ACCESS_KEY: "test-secret-key",
  });
  return new SwarmAwsService(env);
}

describe("SwarmAwsService", () => {
  beforeEach(() => {
    calls.ecsSend.mockReset();
    calls.ssmSend.mockReset();
  });

  it("loads regional SSM launch config and includes required ECS tags and head overrides", async () => {
    calls.ssmSend.mockResolvedValue({
      Parameters: [
        { Name: "/kazibee_web/dev/swarm/us-east-2/cluster_arn", Value: "arn:cluster" },
        { Name: "/kazibee_web/dev/swarm/us-east-2/subnet_ids", Value: '["subnet-a","subnet-b"]' },
        { Name: "/kazibee_web/dev/swarm/us-east-2/security_group_id", Value: "sg-1" },
        { Name: "/kazibee_web/dev/swarm/us-east-2/task_definition/head_micro", Value: "arn:task-def" },
      ],
    });
    calls.ecsSend.mockResolvedValue({ tasks: [{ taskArn: "arn:task" }] });

    const subject = service();
    const result = await subject.launch(swarm, "mch_12345678", "machine-secret-token");
    expect(result).toEqual({ taskArn: "arn:task", taskDefinitionArn: "arn:task-def" });

    const runTask = calls.ecsSend.mock.calls[0]![0] as { input: Record<string, any> };
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
    expect(runTask.input.overrides.containerOverrides[0].environment).toEqual([
      { name: "KAZIBEE_MACHINE_TOKEN", value: "machine-secret-token" },
      { name: "KAZIBEE_SWARM_ID", value: "swm_12345678" },
      { name: "KAZIBEE_MACHINE_ID", value: "mch_12345678" },
    ]);
  });

  it("uses StopTask for the persisted ECS task ARN", async () => {
    calls.ssmSend.mockResolvedValue({
      Parameters: [{ Name: "/kazibee_web/dev/swarm/us-east-2/cluster_arn", Value: "arn:cluster" }],
    });
    calls.ecsSend.mockResolvedValue({});
    await service().stop(swarm, "arn:task");
    const stopTask = calls.ecsSend.mock.calls[0]![0] as { input: Record<string, unknown> };
    expect(stopTask.input).toEqual({
      cluster: "arn:cluster",
      task: "arn:task",
      reason: "swarm_stopped",
    });
  });
});
