import { Component, Inject } from "@noego/ioc";
import type { SseSink as Response } from "../services/sse_stream";
import ConnectRelayService from "../services/connect_relay_service";
import type { ConnectExecutorActor } from "../services/connect_executor_actor_resolver";
import type { ExecutorOutboundFrame } from "../services/connect_relay_request_parser";

@Component()
export default class ConnectRelayLogic {
  constructor(@Inject(ConnectRelayService) private readonly service: ConnectRelayService) {}
  receive(actor: Extract<ConnectExecutorActor, { role: "executor_device" }>, frame: ExecutorOutboundFrame) {
    return this.service.receive(actor, frame);
  }
  open(actor: Extract<ConnectExecutorActor, { role: "executor_device" }>, response: Response) {
    return this.service.open(actor, response);
  }
  close(executorId: string, fence: string) {
    this.service.close(executorId, fence);
  }
}
