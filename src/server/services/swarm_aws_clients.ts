import { Component, LoadAs } from "@noego/ioc";
import {
  ECSClient,
  type RunTaskCommand,
  type RunTaskCommandOutput,
  type StopTaskCommand,
  type StopTaskCommandOutput,
} from "@aws-sdk/client-ecs";
import { type GetParametersCommand, type GetParametersCommandOutput, SSMClient } from "@aws-sdk/client-ssm";

export interface SwarmAwsClientConfig {
  region: string;
  credentials: { accessKeyId: string; secretAccessKey: string };
}

/**
 * AWS ECS/SSM boundary for swarm heads: constructs a per-call regional client
 * with the supplied credentials and sends one SDK command. Launch/stop
 * decisions and SSM parameter interpretation belong to SwarmAwsService.
 */
@Component({ scope: LoadAs.Singleton })
export default class SwarmAwsClients {
  sendEcs(config: SwarmAwsClientConfig, command: RunTaskCommand): Promise<RunTaskCommandOutput>;
  sendEcs(config: SwarmAwsClientConfig, command: StopTaskCommand): Promise<StopTaskCommandOutput>;
  async sendEcs(config: SwarmAwsClientConfig, command: RunTaskCommand | StopTaskCommand): Promise<unknown> {
    const client = new ECSClient(config);
    try {
      return await client.send(command as never);
    } finally {
      client.destroy();
    }
  }

  async sendSsm(config: SwarmAwsClientConfig, command: GetParametersCommand): Promise<GetParametersCommandOutput> {
    const client = new SSMClient(config);
    try {
      return await client.send(command);
    } finally {
      client.destroy();
    }
  }
}
