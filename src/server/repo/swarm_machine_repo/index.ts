import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
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
  async createMachine(_params: {
    machine_id: string; swarm_id: string; task_definition_arn: string; region: string;
    token_hash: string; created_at: string;
  }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Single
  @Query()
  async findById(_params: { swarm_id: string; machine_id: string }) {
    return Trust.tryAsync(() => run<SwarmMachine | null>(), (cause) => ({ kind: "query_failed", cause }));
  }

  @Query()
  async listBySwarm(_params: { swarm_id: string }) {
    return Trust.tryAsync(() => run<SwarmMachine[]>(), (cause) => ({ kind: "query_failed", cause }));
  }

  @Query()
  async listNonStoppedBySwarm(_params: { swarm_id: string }) {
    return Trust.tryAsync(() => run<SwarmMachine[]>(), (cause) => ({ kind: "query_failed", cause }));
  }

  @Query()
  async markRunning(_params: { machine_id: string; ecs_task_arn: string }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Query()
  async markStopping(_params: { machine_id: string }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Query()
  async markStopped(_params: { machine_id: string; stopped_at: string }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Query()
  async markFailed(_params: { machine_id: string; failure: string; stopped_at: string }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }
}
