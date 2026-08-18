import { Component, Inject, LoadAs } from "@noego/ioc";
import type { SseSink as Response } from "./sse_stream";
import ConnectDesktopDeviceRepo from "../repo/connect_desktop_device_repo";
import ConnectExecutorRepo from "../repo/connect_executor_repo";
import TraceAdapter, { type TracePort } from "../observability/trace_adapter";
import {
  ConnectClock, ConnectIdGenerator, ConnectScheduler, type ConnectScheduledTask,
  WebsiteLoggerAdapter, type WebsiteLoggerPort,
} from "./connect_auth_primitives";
import type { DesktopRelayActor } from "./connect_desktop_actor_resolver";
import ConnectExecutorConnectionRegistry from "./connect_executor_connection_registry";
import type { ExecutorOutboundFrame } from "./connect_relay_request_parser";
import type { ClientCommandFrame } from "./connect_client_relay_request_parser";
import ConnectWebsiteDeploymentIdentityService from "./connect_website_deployment_identity_service";

const PROTOCOL = "1.0";
const ACCEPT_TIMEOUT_MS = 5_000;
const MAX_CONNECTIONS = 256;
const MAX_ROUTES = 1_024;
const MAX_PENDING_ACCEPTS = 256;
const MAX_DEVICE_IN_FLIGHT = 32;
const RATE_WINDOW_MS = 60_000;
const MAX_COMMANDS_PER_WINDOW = 120;

type AcceptedFrame = ExecutorOutboundFrame & {
  kind: "command.accepted"; commandId: string; idempotencyKey: string; executorId: string;
};
type RelayOutputFrame = ExecutorOutboundFrame & {
  kind: "command.result" | "executor.event" | "events.replay.result" | "events.replay.gap" | "error";
};

interface DesktopConnection {
  fence: string;
  deviceId: string;
  generation: number;
  response: Response;
}
interface Route {
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  executorId: string;
  deviceId: string;
  desktopFence: string;
}
interface PendingAccept {
  route: Route;
  timeout: ConnectScheduledTask;
  resolve(value: CommandDispatchResult): void;
}
export type CommandDispatchResult =
  | { outcome: "accepted"; frame: AcceptedFrame }
  | { outcome: "executor-offline" | "backpressure" | "accept-timeout" | "unauthorized" | "overloaded" | "website-deployment-mismatch" | "invalid-envelope" };
export interface ClientExecutorSummary {
  executorId: string;
  displayName: string;
  state: "active" | "revoked";
  online: boolean;
  presence: "online" | "offline" | "stale";
  protocolVersion: "1.0";
}

@Component({ scope: LoadAs.Singleton })
export default class ConnectClientRelayService {
  private readonly desktops = new Map<string, DesktopConnection>();
  private readonly byCommand = new Map<string, Route>();
  private readonly byCorrelation = new Map<string, Route>();
  private readonly pending = new Map<string, PendingAccept>();
  private readonly rates = new Map<string, { windowStartedMs: number; count: number }>();
  private readonly logger: WebsiteLoggerPort;
  private readonly trace: TracePort;

  constructor(
    @Inject(ConnectDesktopDeviceRepo) private readonly desktopRepo: ConnectDesktopDeviceRepo,
    @Inject(ConnectExecutorRepo) private readonly executorRepo: ConnectExecutorRepo,
    @Inject(ConnectExecutorConnectionRegistry) private readonly executors: ConnectExecutorConnectionRegistry,
    @Inject(ConnectClock) private readonly clock: ConnectClock,
    @Inject(ConnectIdGenerator) private readonly ids: ConnectIdGenerator,
    @Inject(ConnectScheduler) private readonly scheduler: ConnectScheduler,
    @Inject(WebsiteLoggerAdapter) loggers: WebsiteLoggerAdapter,
    @Inject(TraceAdapter) traces: TraceAdapter,
    @Inject(ConnectWebsiteDeploymentIdentityService)
    private readonly deploymentIdentity: ConnectWebsiteDeploymentIdentityService,
  ) {
    this.logger = loggers.forSource("connect-client-relay");
    this.trace = traces.forSource("ConnectClientRelayService");
    this.executors.onDisconnect((executorId) => this.fenceExecutor(executorId));
  }

  open(actor: DesktopRelayActor, response: Response): string {
    const previous = this.desktops.get(actor.deviceId);
    if (previous) {
      this.write(previous, this.safeError("revoked", "Desktop channel was replaced", "cor_channeltakeover"));
      previous.response.end();
      this.removeDesktopRoutes(actor.deviceId, previous.fence, "takeover");
      this.desktops.delete(actor.deviceId);
    }
    while (this.desktops.size >= MAX_CONNECTIONS) {
      const oldest = this.desktops.values().next().value as DesktopConnection | undefined;
      if (!oldest) break;
      this.close(oldest.deviceId, oldest.fence);
      oldest.response.end();
    }
    const connection = {
      deviceId: actor.deviceId, generation: actor.generation,
      fence: this.ids.channelFenceId(), response,
    };
    this.desktops.set(actor.deviceId, connection);
    return connection.fence;
  }

  close(deviceId: string, fence: string): void {
    const current = this.desktops.get(deviceId);
    if (!current || current.fence !== fence) return;
    this.desktops.delete(deviceId);
    this.rates.delete(deviceId);
    this.removeDesktopRoutes(deviceId, fence, "disconnect");
  }

  async listExecutors(actor: DesktopRelayActor): Promise<ClientExecutorSummary[]> {
    const executors = await this.executorRepo.listByOwner({
      owner_user_id: actor.ownerUserId,
      limit: 100,
    });
    return executors.map((executor) => {
      const presence = this.executors.presence(executor.executor_id);
      return {
        executorId: executor.executor_id,
        displayName: executor.display_name,
        state: executor.state as "active" | "revoked",
        online: presence === "online",
        presence,
        protocolVersion: PROTOCOL,
      };
    });
  }

  revokeDesktop(deviceId: string, correlationId: string): void {
    const current = this.desktops.get(deviceId);
    if (current) {
      this.write(current, this.safeError("revoked", "Desktop credential was revoked", correlationId));
      current.response.end();
      this.desktops.delete(deviceId);
    }
    this.removeDesktopRoutes(deviceId, current?.fence, "revoked");
    this.rates.delete(deviceId);
  }

  async command(
    actor: DesktopRelayActor, frame: ClientCommandFrame, byteCount: number,
  ): Promise<CommandDispatchResult> {
    if (frame.websiteDeploymentId !== await this.deploymentIdentity.get()) {
      return { outcome: "website-deployment-mismatch" };
    }
    const nestedFence = this.nestedTargetFence(frame);
    if (nestedFence) return { outcome: nestedFence };
    const connection = this.desktops.get(actor.deviceId);
    if (!connection || connection.generation !== actor.generation
      || frame.deviceId !== actor.deviceId || frame.actorRole !== "desktop_device") {
      return { outcome: "unauthorized" };
    }
    if (!this.takeRate(actor.deviceId)) return { outcome: "overloaded" };
    let desktop;
    let executor;
    try {
      [desktop, executor] = await Promise.all([
        this.desktopRepo.findByDeviceId({ device_id: actor.deviceId }),
        this.executorRepo.findByExecutorId({ executor_id: frame.executorId }),
      ]);
    } catch {
      return { outcome: "executor-offline" };
    }
    if (!desktop || desktop.state !== "active" || !desktop.owner_user_id
      || desktop.credential_generation !== actor.generation
      || !executor || executor.state !== "active"
      || executor.owner_user_id !== desktop.owner_user_id
      || !this.executors.matches(executor.executor_id, executor.device_id, executor.credential_generation)) {
      return { outcome: "executor-offline" };
    }
    if (this.pending.size >= MAX_PENDING_ACCEPTS || this.byCommand.size >= MAX_ROUTES
      || this.deviceRouteCount(actor.deviceId) >= MAX_DEVICE_IN_FLIGHT
      || this.byCommand.has(frame.commandId) || this.byCorrelation.has(frame.correlationId)) {
      return { outcome: "overloaded" };
    }
    const route: Route = {
      commandId: frame.commandId, correlationId: frame.correlationId,
      idempotencyKey: frame.idempotencyKey, executorId: frame.executorId,
      deviceId: actor.deviceId, desktopFence: connection.fence,
    };
    const result = new Promise<CommandDispatchResult>((resolve) => {
      const timeout = this.scheduler.schedule(ACCEPT_TIMEOUT_MS, () => {
        const pending = this.pending.get(frame.commandId);
        if (!pending || pending.route !== route) return;
        this.removeRoute(route);
        resolve({ outcome: "accept-timeout" });
        this.record("accept-timeout", route, byteCount);
      });
      this.pending.set(frame.commandId, { route, timeout, resolve });
      this.byCommand.set(frame.commandId, route);
      this.byCorrelation.set(frame.correlationId, route);
    });
    const dispatched = this.executors.dispatch(frame.executorId, frame);
    if (!dispatched.ok) {
      const pending = this.pending.get(frame.commandId);
      if (pending?.route === route) {
        pending.timeout.cancel();
        this.removeRoute(route);
        pending.resolve({ outcome: dispatched.reason });
      }
    } else {
      this.record("command-dispatched", route, byteCount);
    }
    return result;
  }

  receive(executorId: string, frame: ExecutorOutboundFrame): boolean {
    if (frame.kind === "channel.hello" || frame.kind === "channel.heartbeat") return false;
    const routed = frame.kind === "command.accepted"
      ? this.accept(executorId, frame as AcceptedFrame)
      : this.routeOutput(executorId, frame as RelayOutputFrame);
    if (!routed) {
      const context = {
        executorId, kind: frame.kind, correlationId: frame.correlationId,
        observedAt: this.clock.now().toISOString(),
        byteCount: Buffer.byteLength(JSON.stringify(frame)),
      };
      this.logger.warn("unrouted-executor-output", context);
      this.trace.warn("unrouted-executor-output", context);
    }
    return routed;
  }

  fenceExecutor(executorId: string): void {
    for (const route of [...this.byCommand.values()]) {
      if (route.executorId !== executorId) continue;
      const connection = this.desktops.get(route.deviceId);
      if (connection?.fence === route.desktopFence) {
        this.write(connection, this.safeError(
          "executor-offline", "Executor is offline", route.correlationId,
        ));
      }
      this.removeRoute(route, { outcome: "executor-offline" });
    }
  }

  private accept(executorId: string, frame: AcceptedFrame): boolean {
    const pending = this.pending.get(frame.commandId);
    if (!pending || pending.route.executorId !== executorId
      || pending.route.correlationId !== frame.correlationId
      || pending.route.idempotencyKey !== frame.idempotencyKey) return false;
    pending.timeout.cancel();
    this.pending.delete(frame.commandId);
    pending.resolve({ outcome: "accepted", frame });
    this.record("command-accepted", pending.route, Buffer.byteLength(JSON.stringify(frame)));
    return true;
  }

  private routeOutput(executorId: string, frame: RelayOutputFrame): boolean {
    const commandId = "commandId" in frame && typeof frame.commandId === "string"
      ? frame.commandId : null;
    const route = commandId ? this.byCommand.get(commandId)
      : this.byCorrelation.get(frame.correlationId);
    if (!route || route.executorId !== executorId) return false;
    const connection = this.desktops.get(route.deviceId);
    if (!connection || connection.fence !== route.desktopFence) {
      this.removeRoute(route);
      return false;
    }
    const written = this.write(connection, frame);
    const terminal = frame.kind === "command.result" || frame.kind === "error"
      || frame.kind === "events.replay.result" || frame.kind === "events.replay.gap";
    this.record(written ? "output-routed" : "desktop-backpressure", route,
      Buffer.byteLength(JSON.stringify(frame)));
    if (!written) {
      connection.response.end();
      this.desktops.delete(route.deviceId);
      this.removeDesktopRoutes(route.deviceId, route.desktopFence, "backpressure");
    } else if (terminal) {
      this.removeRoute(route);
    }
    return written;
  }

  private write(connection: DesktopConnection, event: Record<string, unknown>): boolean {
    if (connection.response.writableEnded) return false;
    const envelope = {
      kind: "owner.sse.event", protocolVersion: PROTOCOL,
      deviceId: connection.deviceId, actorRole: "desktop_device", event,
    };
    return connection.response.write(`data: ${JSON.stringify(envelope)}\n\n`);
  }

  private removeDesktopRoutes(deviceId: string, fence: string | undefined, reason: string): void {
    for (const route of [...this.byCommand.values()]) {
      if (route.deviceId === deviceId && (!fence || route.desktopFence === fence)) {
        this.removeRoute(route, { outcome: "unauthorized" });
        this.record(`desktop-${reason}`, route, 0);
      }
    }
  }

  private removeRoute(route: Route, pendingResult?: CommandDispatchResult): void {
    if (this.byCommand.get(route.commandId) === route) this.byCommand.delete(route.commandId);
    if (this.byCorrelation.get(route.correlationId) === route) this.byCorrelation.delete(route.correlationId);
    const pending = this.pending.get(route.commandId);
    if (pending?.route === route) {
      pending.timeout.cancel();
      this.pending.delete(route.commandId);
      if (pendingResult) pending.resolve(pendingResult);
    }
  }

  private deviceRouteCount(deviceId: string): number {
    let count = 0;
    for (const route of this.byCommand.values()) if (route.deviceId === deviceId) count += 1;
    return count;
  }

  private takeRate(deviceId: string): boolean {
    const now = this.clock.now().getTime();
    const current = this.rates.get(deviceId);
    if (!current || now - current.windowStartedMs >= RATE_WINDOW_MS) {
      this.rates.set(deviceId, { windowStartedMs: now, count: 1 });
      return true;
    }
    if (current.count >= MAX_COMMANDS_PER_WINDOW) return false;
    current.count += 1;
    return true;
  }

  private nestedTargetFence(
    frame: ClientCommandFrame,
  ): "website-deployment-mismatch" | "invalid-envelope" | null {
    const payload = frame.payload;
    if (!this.object(payload)) return "invalid-envelope";
    if (frame.operation === "conversation.create") {
      if (payload.websiteDeploymentId !== frame.websiteDeploymentId) {
        return "website-deployment-mismatch";
      }
      return payload.executorId === frame.executorId ? null : "invalid-envelope";
    }
    if (!["thread.send", "thread.retry", "thread.cancel"].includes(frame.operation)) return null;
    const receipt = payload.expectedExecutionBinding;
    // The explicitly documented legacy first-send adapter has no receipt. It
    // is schema-discriminated by phase:start and is removed after migration.
    if (frame.operation === "thread.send" && receipt === undefined && payload.phase === "start") {
      return null;
    }
    if (!this.object(receipt)) return "invalid-envelope";
    if (receipt.websiteDeploymentId !== frame.websiteDeploymentId) {
      return "website-deployment-mismatch";
    }
    if (receipt.executorId !== frame.executorId
      || receipt.conversationId !== payload.conversationId) {
      return "invalid-envelope";
    }
    return null;
  }

  private object(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private safeError(code: "revoked" | "executor-offline", message: string, correlationId: string) {
    return { kind: "error", protocolVersion: PROTOCOL, code, message,
      retryable: code === "executor-offline", correlationId };
  }

  private record(event: string, route: Route, byteCount: number): void {
    const context = {
      commandId: route.commandId, correlationId: route.correlationId,
      executorId: route.executorId, deviceId: route.deviceId,
      observedAt: this.clock.now().toISOString(), byteCount,
    };
    this.logger.info(event, context);
    this.trace.info(event, context);
  }
}
