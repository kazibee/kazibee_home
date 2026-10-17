import { Component, LoadAs } from "@noego/ioc";
import { Trust } from "@noego/trust";
import { Query, QueryBinder, Single, run } from "sqlstack";

export interface ConnectWebsiteDeploymentIdentity {
  singleton_key: 1;
  website_deployment_id: string;
  created_at: string;
}

@QueryBinder()
@Component({ scope: LoadAs.Singleton })
export default class ConnectWebsiteDeploymentIdentityRepo {
  @Query()
  async createIfMissing(_params: {
    website_deployment_id: string;
    created_at: string;
  }) {
    return Trust.tryAsync(
      () => run<void>(),
      (cause) => ({ kind: "write_failed", cause }),
    );
  }

  @Single
  @Query()
  async findSingleton() {
    return Trust.tryAsync(
      () => run<ConnectWebsiteDeploymentIdentity | null>(),
      (cause) => ({ kind: "query_failed", cause }),
    );
  }
}
