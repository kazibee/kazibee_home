import { Component, LoadAs } from "@noego/ioc";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface Swarm {
  swarm_id: string;
  owner_user_id: string;
  env: "dev" | "prod";
  region: string;
  resource_class: string;
  state: "active" | "stopping" | "stopped";
  created_at: string;
  stopped_at: string | null;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class SwarmRepo {
  @Query()
  createSwarm(_params: {
    swarm_id: string; owner_user_id: string; env: string; region: string;
    resource_class: string; created_at: string;
  }): Promise<void> { return run(); }

  @Single
  @Query()
  findById(_params: { swarm_id: string }): Promise<Swarm | null> { return run(); }

  @Single
  @Query()
  findByIdAndOwner(_params: { swarm_id: string; owner_user_id: string }): Promise<Swarm | null> {
    return run();
  }

  @Query()
  markStopping(_params: { swarm_id: string; owner_user_id: string }): Promise<void> { return run(); }

  @Query()
  markStopped(_params: { swarm_id: string; owner_user_id: string; stopped_at: string }): Promise<void> {
    return run();
  }
}
