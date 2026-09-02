import { Component, LoadAs } from "@noego/ioc";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface SwarmMachine {
  machine_id: string;
  swarm_id: string;
  ecs_task_arn: string | null;
  task_definition_arn: string;
  region: string;
  state: "launching" | "running" | "stopping" | "stopped" | "failed";
  token_hash: string;
  token_generation: number;
  created_at: string;
  last_seen_at: string | null;
  stopped_at: string | null;
  failure: string | null;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class SwarmMachineRepo {
  @Query()
  createMachine(_params: {
    machine_id: string; swarm_id: string; task_definition_arn: string; region: string;
    token_hash: string; created_at: string;
  }): Promise<void> { return run(); }

  @Single
  @Query()
  findById(_params: { swarm_id: string; machine_id: string }): Promise<SwarmMachine | null> { return run(); }

  @Query()
  listBySwarm(_params: { swarm_id: string }): Promise<SwarmMachine[]> { return run(); }

  @Query()
  listNonStoppedBySwarm(_params: { swarm_id: string }): Promise<SwarmMachine[]> { return run(); }

  @Query()
  markRunning(_params: { machine_id: string; ecs_task_arn: string }): Promise<void> { return run(); }

  @Query()
  markStopping(_params: { machine_id: string }): Promise<void> { return run(); }

  @Query()
  markStopped(_params: { machine_id: string; stopped_at: string }): Promise<void> { return run(); }

  @Query()
  markFailed(_params: { machine_id: string; failure: string; stopped_at: string }): Promise<void> { return run(); }
}
