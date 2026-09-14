import { Component, LoadAs } from "@noego/ioc";

/**
 * Outbound HTTP boundary to a dev coordinator speaking the ExecutorCoordinator
 * /presence and /dispatch contract over plain HTTP (Node dev has no Durable
 * Object runtime). Routing decisions belong to RemoteToolDispatchService.
 */
@Component({ scope: LoadAs.Singleton })
export default class RemoteToolCoordinatorClient {
  fetch(request: Request): Promise<Response> {
    return fetch(request);
  }
}
