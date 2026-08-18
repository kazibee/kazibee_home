import { Component } from "@noego/ioc";
import { Query, QueryBinder, Single, SqlStackError } from "sqlstack";

export interface ConnectWebsiteDeploymentIdentity {
  singleton_key: 1;
  website_deployment_id: string;
  created_at: string;
}

@QueryBinder()
@Component()
export default class ConnectWebsiteDeploymentIdentityRepo {
  @Query()
  createIfMissing(_params: {
    website_deployment_id: string;
    created_at: string;
  }): Promise<void> {
    throw new SqlStackError("Not implemented");
  }

  @Single
  @Query()
  findSingleton(): Promise<ConnectWebsiteDeploymentIdentity | null> {
    throw new SqlStackError("Not implemented");
  }
}
