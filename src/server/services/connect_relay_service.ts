import { Component, Inject } from "@noego/ioc";
import type { Response } from "express";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import ConnectExecutorConnectionRegistry, {
  ConnectExecutorDispatchPort, type ExecutorDispatchResult,
  type ExecutorInboundFrame,
} from "./connect_executor_connection_registry";
import { ConnectClock } from "./connect_auth_primitives";
import type { ConnectExecutorActor } from "./connect_executor_actor_resolver";
import type { ExecutorOutboundFrame } from "./connect_relay_request_parser";
import ConnectClientRelayService from "./connect_client_relay_service";

@Component()
export default class ConnectRelayService implements ConnectExecutorDispatchPort {
  constructor(
    @Inject(ConnectExecutorConnectionRegistry) private readonly registry: ConnectExecutorConnectionRegistry,
    @Inject(ConnectExecutorRepo) private readonly executors: ConnectExecutorRepo,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectClientRelayService) private readonly clients: ConnectClientRelayService,
  ) {}

  async receive(actor: Extract<ConnectExecutorActor, { role: "executor_device" }>, frame: ExecutorOutboundFrame) {
    const at = this.clock.now().toISOString();
    if (frame.kind === "channel.hello" || frame.kind === "channel.heartbeat") {
      await this.executors.updatePresence({
        executor_id: actor.executorId, device_id: actor.deviceId,
        credential_generation: actor.generation, last_seen_at: at,
      });
      this.registry.touch(actor.executorId, actor.generation);
      if (frame.kind === "channel.hello") {
        this.registry.hello(actor.executorId, actor.generation, frame.correlationId);
      }
    }
    if (frame.kind !== "channel.hello" && frame.kind !== "channel.heartbeat") {
      this.clients.receive(actor.executorId, frame);
    }
    return frame.kind === "channel.hello" || frame.kind === "channel.heartbeat"
      ? {
        kind: "channel.ack", protocolVersion: "1.0", executorId: actor.executorId,
        acknowledgedKind: frame.kind, correlationId: frame.correlationId,
      } : null;
  }

  open(actor: Extract<ConnectExecutorActor, { role: "executor_device" }>, response: Response): string {
    return this.registry.open({ ...actor, response });
  }
  close(executorId: string, fence: string): void {
    this.registry.close(executorId, fence);
  }
  dispatch(executorId: string, frame: ExecutorInboundFrame): ExecutorDispatchResult {
    return this.registry.dispatch(executorId, frame);
  }
}
