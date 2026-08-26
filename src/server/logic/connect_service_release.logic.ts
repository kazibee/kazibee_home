import { Component, Inject } from "@noego/ioc";
import ConnectServiceReleaseResolver, {
  type ServiceReleaseCandidate,
  type ServiceReleaseResolveRequest,
} from "../services/connect_service_release_resolver";

@Component()
export default class ConnectServiceReleaseLogic {
  constructor(
    @Inject(ConnectServiceReleaseResolver) private resolver: ConnectServiceReleaseResolver,
  ) {}

  /** Public by product decision: anyone running Kazibee Desktop may resolve —
   *  no actor, sign-in, subscription, or device credential is required. */
  async resolve(request: ServiceReleaseResolveRequest): Promise<ServiceReleaseCandidate> {
    return this.resolver.resolve(request);
  }
}
