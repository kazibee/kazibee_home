import { Component, LoadAs } from "@noego/ioc";
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
  createIfMissing(_params: {
    website_deployment_id: string;
    created_at: string;
  }): Promise<void> {
    return run();
  }

  @Single
  @Query()
  findSingleton(): Promise<ConnectWebsiteDeploymentIdentity | null> {
    return run();
  }
}
