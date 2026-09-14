import { Component, Inject } from "@noego/ioc";
import { RunTaskCommand, StopTaskCommand } from "@aws-sdk/client-ecs";
import { GetParametersCommand } from "@aws-sdk/client-ssm";
import Env from "./env";
import SwarmAwsClients, { type SwarmAwsClientConfig } from "./swarm_aws_clients";
import type { Swarm } from "../repo/swarm_repo";

export interface SwarmLaunchConfig {
  clusterArn: string;
  subnetIds: string[];
  securityGroupId: string;
  taskDefinitionArn: string;
}

export class SwarmImageNotReleasedError extends Error {}
export class SwarmLaunchConfigurationError extends Error {}

@Component()
export default class SwarmAwsService {
  constructor(
    @Inject(Env) private readonly env: Env,
    @Inject(SwarmAwsClients) private readonly clients: SwarmAwsClients,
  ) {}

  async launch(
    swarm: Swarm,
    machineId: string,
    token: string,
    providedConfig?: SwarmLaunchConfig,
  ): Promise<{ taskArn: string; taskDefinitionArn: string }> {
    const config = providedConfig ?? await this.launchConfig(swarm);
    const result = await this.clients.sendEcs(this.clientConfig(swarm.region), new RunTaskCommand({
      cluster: config.clusterArn,
      taskDefinition: config.taskDefinitionArn,
      launchType: "FARGATE",
      platformVersion: "1.4.0",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: config.subnetIds,
          securityGroups: [config.securityGroupId],
          assignPublicIp: "ENABLED",
        },
      },
      tags: [
        { key: "kazibee:env", value: swarm.env },
        { key: "kazibee:swarm", value: swarm.swarm_id },
        { key: "kazibee:machine", value: machineId },
      ],
      enableECSManagedTags: true,
      propagateTags: "TASK_DEFINITION",
      overrides: {
        containerOverrides: [{
          name: "head",
          environment: [
            { name: "KAZIBEE_MACHINE_TOKEN", value: token },
            { name: "KAZIBEE_SWARM_ID", value: swarm.swarm_id },
            { name: "KAZIBEE_MACHINE_ID", value: machineId },
          ],
        }],
      },
    }));
    const taskArn = result.tasks?.[0]?.taskArn;
    if (!taskArn) throw new SwarmLaunchConfigurationError("ECS did not return a task ARN");
    return { taskArn, taskDefinitionArn: config.taskDefinitionArn };
  }

  async launchConfig(swarm: Swarm): Promise<SwarmLaunchConfig> {
    const prefix = "/kazibee_web/" + swarm.env + "/swarm/" + swarm.region;
    const names = [
      prefix + "/cluster_arn",
      prefix + "/subnet_ids",
      prefix + "/security_group_id",
      prefix + "/task_definition/" + swarm.resource_class,
    ];
    const result = await this.clients.sendSsm(
      this.clientConfig(swarm.region),
      new GetParametersCommand({ Names: names, WithDecryption: true }),
    );
    const values = new Map<string, string>(
      (result.Parameters ?? []).map((parameter): [string, string] => [parameter.Name ?? "", parameter.Value ?? ""]),
    );
    const taskDefinitionArn = values.get(names[3]);
    if (!taskDefinitionArn) throw new SwarmImageNotReleasedError("Swarm head image is not released");
    const clusterArn = values.get(names[0]);
    const subnetValue = values.get(names[1]);
    const securityGroupId = values.get(names[2]);
    if (!clusterArn || !subnetValue || !securityGroupId) {
      throw new SwarmLaunchConfigurationError("Swarm launch configuration is incomplete");
    }
    const subnetIds = this.parseSubnets(subnetValue);
    if (subnetIds.length === 0) throw new SwarmLaunchConfigurationError("Swarm subnet configuration is empty");
    return { clusterArn, subnetIds, securityGroupId, taskDefinitionArn };
  }

  async stop(swarm: Swarm, taskArn: string): Promise<void> {
    const clusterName = "/kazibee_web/" + swarm.env + "/swarm/" + swarm.region + "/cluster_arn";
    const response = await this.clients.sendSsm(
      this.clientConfig(swarm.region),
      new GetParametersCommand({ Names: [clusterName], WithDecryption: true }),
    );
    const cluster = response.Parameters?.[0]?.Value;
    if (!cluster) throw new SwarmLaunchConfigurationError("Swarm cluster configuration is missing");
    await this.clients.sendEcs(
      this.clientConfig(swarm.region),
      new StopTaskCommand({ cluster, task: taskArn, reason: "swarm_stopped" }),
    );
  }

  private clientConfig(region: string): SwarmAwsClientConfig {
    const accessKeyId = this.env.string("SWARM_AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.env.string("SWARM_AWS_SECRET_ACCESS_KEY");
    if (!accessKeyId || !secretAccessKey) {
      throw new SwarmLaunchConfigurationError("Swarm AWS credentials are unavailable");
    }
    return { region, credentials: { accessKeyId, secretAccessKey } };
  }

  private parseSubnets(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === "string");
    } catch {
      // SSM also accepts a comma-separated value for operator convenience.
    }
    return raw.split(",").map((value) => value.trim()).filter(Boolean);
  }
}
