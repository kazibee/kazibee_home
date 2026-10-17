import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface Swarm {
  swarm_id: string;
  owner_user_id: string;
  env: "dev" | "prod";
  region: string;
  resource_class: string;
  state: "active" | "stopping" | "stopped";
  client_swarm_id: string | null;
  idempotency_key: string | null;
  /** Desktop executor that owns this swarm's runtime bindings; relay target. */
  executor_id: string | null;
  created_at: string;
  stopped_at: string | null;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class SwarmRepo {
  @Single
  @Query()
  async createSwarm(_params: {
    swarm_id: string; owner_user_id: string; env: string; region: string;
    resource_class: string; client_swarm_id: string | null; idempotency_key: string | null;
    executor_id: string | null; created_at: string;
  }) {
    return Trust.tryAsync(() => run<Swarm | null>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Single
  @Query()
  async findById(_params: { swarm_id: string }) {
    return Trust.tryAsync(() => run<Swarm | null>(), (cause) => ({ kind: "query_failed", cause }));
  }

  @Single
  @Query()
  async findByIdAndOwner(_params: { swarm_id: string; owner_user_id: string }) {
    return Trust.tryAsync(
      () => run<Swarm | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Single
  @Query()
  async findByOwnerAndIdempotencyKey(
    _params: { owner_user_id: string; idempotency_key: string },
  ) {
    return Trust.tryAsync(
      () => run<Swarm | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }

  @Query()
  async markStopping(_params: { swarm_id: string; owner_user_id: string }) {
    return Trust.tryAsync(() => run<void>(), (cause) => ({ kind: "write_failed", cause }));
  }

  @Query()
  async markStopped(_params: { swarm_id: string; owner_user_id: string; stopped_at: string }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }
}
