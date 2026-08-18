import { Component, Inject } from "@noego/ioc";
import type { SseSink as Response } from "../services/sse_stream";
import ConnectClientRelayService from "../services/connect_client_relay_service";
import type { DesktopRelayActor } from "../services/connect_desktop_actor_resolver";
import type { ClientCommandFrame } from "../services/connect_client_relay_request_parser";

@Component()
export default class ConnectClientRelayLogic {
  constructor(@Inject(ConnectClientRelayService) private readonly service: ConnectClientRelayService) {}

  command(actor: DesktopRelayActor, frame: ClientCommandFrame, byteCount: number) {
    return this.service.command(actor, frame, byteCount);
  }
  open(actor: DesktopRelayActor, response: Response) {
    return this.service.open(actor, response);
  }
  close(deviceId: string, fence: string) {
    this.service.close(deviceId, fence);
  }
  listExecutors(actor: DesktopRelayActor) {
    return this.service.listExecutors(actor);
  }
}
