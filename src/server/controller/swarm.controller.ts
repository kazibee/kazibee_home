import { Component, Inject } from "@noego/ioc";
import type { CompatRequest as Request, CompatResponse as Response } from "@noego/dinner";
import { getLogger } from "@noego/logger";
import { Result } from "@noego/trust";
import { randomUUID } from "node:crypto";
import ConnectExecutorActorResolver from "../services/connect_executor_actor_resolver";
import { ConnectCredentials } from "../services/connect_auth_primitives";
import Env from "../services/env";
import RawRequest from "../services/raw_request";
import SwarmAwsService, {
  SwarmImageNotReleasedError,
  SwarmLaunchConfigurationError,
} from "../services/swarm_aws_service";
import SwarmRepo, { type Swarm } from "../repo/swarm_repo";
import SwarmMachineRepo, { type SwarmMachine } from "../repo/swarm_machine_repo";
import type { RepoFailure } from "../repo/repo_failure";
import {
  MACHINE_ID,
  MACHINE_TOKEN,
  SWARM_HEAD_AUDIENCE,
  SWARM_HEAD_PROTOCOL_VERSION,
  SWARM_ID,
  parseHeadInboundFrame,
  type HeadClass,
} from "../../shared/swarm_head_protocol";

type Context = { req: Request; res: Response };
type Owner = { userId: string; sessionId: string };
interface CoordinatorNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(req: globalThis.Request): Promise<globalThis.Response> };
}

const HEAD_CLASSES = new Set<HeadClass>(["head_micro", "head_small", "head_medium", "head_large"]);
const SEND_KINDS = new Set([
  "thread.start",
  "thread.message",
  "thread.interrupt",
  "thread.close",
  "credential.deliver",
  "head.stop",
]);

const logger = getLogger("kazibee:swarm-controller");

function asCoordinator(value: unknown): CoordinatorNamespace | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  const candidate = value as Partial<CoordinatorNamespace>;
  if (typeof candidate.idFromName !== "function" || typeof candidate.get !== "function") return null;
  return candidate as CoordinatorNamespace;
}

@Component()
export default class SwarmController {
  constructor(
    @Inject(Env) private readonly env: Env,
    @Inject(RawRequest) private readonly rawRequest: RawRequest,
    @Inject(ConnectExecutorActorResolver) private readonly actors: ConnectExecutorActorResolver,
    @Inject(ConnectCredentials) private readonly credentials: ConnectCredentials,
    @Inject(SwarmRepo) private readonly swarms: SwarmRepo,
    @Inject(SwarmMachineRepo) private readonly machines: SwarmMachineRepo,
    @Inject(SwarmAwsService) private readonly aws: SwarmAwsService,
  ) {}

  async create({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "create", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const body = req.body as {
      env?: unknown;
      region?: unknown;
      resourceClass?: unknown;
      clientSwarmId?: unknown;
      idempotencyKey?: unknown;
    } | undefined;
    const ownEnv = this.deploymentEnv();
    if (!body || body.env !== ownEnv || typeof body.region !== "string"
      || !/^[a-z]{2}-[a-z]+-[1-9]$/.test(body.region)
      || typeof body.resourceClass !== "string" || !HEAD_CLASSES.has(body.resourceClass as HeadClass)
      || (body.clientSwarmId !== undefined
        && (typeof body.clientSwarmId !== "string" || !SWARM_ID.test(body.clientSwarmId)))
      || (body.idempotencyKey !== undefined
        && (typeof body.idempotencyKey !== "string"
          || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 128))) {
      return this.error(res, 400, "INVALID_SWARM_REQUEST");
    }
    const clientSwarmId = typeof body.clientSwarmId === "string" ? body.clientSwarmId : null;
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : null;
    const matchesRequest = (swarm: Swarm) => swarm.env === ownEnv
      && swarm.region === body.region
      && swarm.resource_class === body.resourceClass
      && swarm.client_swarm_id === clientSwarmId;

    if (idempotencyKey) {
      const replay = await this.swarms.findByOwnerAndIdempotencyKey({
        owner_user_id: owner.userId,
        idempotency_key: idempotencyKey,
      });
      if (!replay.ok) return this.unavailable(res, "create", replay.error);
      const existing = replay.value;
      if (existing) {
        if (!matchesRequest(existing)) return this.error(res, 409, "IDEMPOTENCY_CONFLICT");
        return res.status(200).json({ swarmId: existing.swarm_id, state: existing.state });
      }
    }

    const swarmId = clientSwarmId ?? this.id("swm");
    const inserted = await this.swarms.createSwarm({
      swarm_id: swarmId,
      owner_user_id: owner.userId,
      env: ownEnv,
      region: body.region,
      resource_class: body.resourceClass,
      client_swarm_id: clientSwarmId,
      idempotency_key: idempotencyKey,
      executor_id: owner.sessionId.startsWith("executor:") ? owner.sessionId.slice("executor:".length) : null,
      created_at: new Date().toISOString(),
    });
    if (!inserted.ok) return this.unavailable(res, "create", inserted.error);
    const created = inserted.value;
    if (created) return res.status(201).json({ swarmId, state: created.state });

    if (idempotencyKey) {
      const replay = await this.swarms.findByOwnerAndIdempotencyKey({
        owner_user_id: owner.userId,
        idempotency_key: idempotencyKey,
      });
      if (!replay.ok) return this.unavailable(res, "create", replay.error);
      const existing = replay.value;
      if (existing) {
        if (!matchesRequest(existing)) return this.error(res, 409, "IDEMPOTENCY_CONFLICT");
        return res.status(200).json({ swarmId: existing.swarm_id, state: existing.state });
      }
    }
    return this.error(res, 409, "SWARM_ID_TAKEN");
  }

  async launchMachine({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "launch-machine", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedSwarm(req, owner);
    if (!found.ok) return this.unavailable(res, "launch-machine", found.error);
    const swarm = found.value;
    if (!swarm) return this.error(res, 404, "SWARM_NOT_FOUND");
    if (swarm.state !== "active") return this.error(res, 409, "SWARM_NOT_ACTIVE");

    let config;
    try {
      config = await this.aws.launchConfig(swarm);
    } catch (error) {
      return this.launchError(res, error);
    }

    const machineId = this.id("mch");
    const token = this.credentials.randomToken();
    const created = await this.machines.createMachine({
      machine_id: machineId,
      swarm_id: swarm.swarm_id,
      task_definition_arn: config.taskDefinitionArn,
      region: swarm.region,
      token_hash: this.credentials.hashToken(token),
      created_at: new Date().toISOString(),
    });
    if (!created.ok) return this.unavailable(res, "launch-machine", created.error);
    try {
      const launched = await this.aws.launch(swarm, machineId, token, config);
      const running = await this.machines.markRunning({ machine_id: machineId, ecs_task_arn: launched.taskArn });
      // Recording the running task is part of the launch: when it fails, the
      // machine is marked failed and the launch reported failed, as before.
      if (!running.ok) return this.launchFailed(res, machineId, running.error);
      return res.status(201).json({ machineId, ecsTaskArn: launched.taskArn });
    } catch {
      return this.launchFailed(res, machineId);
    }
  }

  async channel({ req, res }: Context) {
    const swarmId = req.params?.swarmId;
    const machineId = req.params?.machineId;
    if (typeof swarmId !== "string" || !SWARM_ID.test(swarmId)
      || typeof machineId !== "string" || !MACHINE_ID.test(machineId)) {
      return this.error(res, 401, "CHANNEL_AUTH_FAILED");
    }
    const raw = this.rawRequest.get();
    if (!raw || raw.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return this.error(res, raw ? 426 : 500, raw ? "UPGRADE_REQUIRED" : "RAW_REQUEST_UNAVAILABLE");
    }
    const authorization = raw.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token || !MACHINE_TOKEN.test(token)
      || raw.headers.get("x-kazi-swarm-id") !== swarmId
      || raw.headers.get("x-kazi-machine-id") !== machineId
      || raw.headers.get("x-kazi-audience") !== SWARM_HEAD_AUDIENCE
      || raw.headers.get("x-kazi-protocol-version") !== SWARM_HEAD_PROTOCOL_VERSION) {
      return this.error(res, 401, "CHANNEL_AUTH_FAILED");
    }
    const found = await this.machines.findById({ swarm_id: swarmId, machine_id: machineId });
    if (!found.ok) return this.unavailable(res, "channel", found.error);
    const machine = found.value;
    if (!machine || machine.state === "stopped"
      || !this.credentials.matchesHash(token, machine.token_hash)) {
      return this.error(res, 401, "CHANNEL_AUTH_FAILED");
    }
    const coordinator = this.coordinator();
    if (!coordinator) return this.error(res, 503, "COORDINATOR_UNAVAILABLE");
    return coordinator.get(coordinator.idFromName(machineId)).fetch(raw);
  }

  async send({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "send", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedMachine(req, owner);
    if (!found.ok) return this.unavailable(res, "send", found.error);
    const target = found.value;
    if (!target) return this.error(res, 404, "MACHINE_NOT_FOUND");
    const frame = req.body;
    const parsed = parseHeadInboundFrame(JSON.stringify(frame), target.machine.machine_id);
    if (!parsed || !SEND_KINDS.has(parsed.kind)) return this.error(res, 400, "INVALID_FRAME");
    return this.proxy(res, await this.coordinatorRequest(target.machine.machine_id, "/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(frame),
    }));
  }

  async events({ req, res }: Context) {
    const resolved = await this.owner(req, false);
    if (!resolved.ok) return this.unavailable(res, "events", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedMachine(req, owner);
    if (!found.ok) return this.unavailable(res, "events", found.error);
    const target = found.value;
    if (!target) return this.error(res, 404, "MACHINE_NOT_FOUND");
    const after = typeof req.query.after === "string" ? req.query.after : "0";
    const limit = typeof req.query.limit === "string" ? req.query.limit : "100";
    const path = "/events?after=" + encodeURIComponent(after) + "&limit=" + encodeURIComponent(limit);
    return this.proxy(res, await this.coordinatorRequest(target.machine.machine_id, path));
  }

  async liveness({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "liveness", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedSwarm(req, owner);
    if (!found.ok) return this.unavailable(res, "liveness", found.error);
    const swarm = found.value;
    if (!swarm) return this.error(res, 404, "SWARM_NOT_FOUND");
    const body = req.body as { desktopSeenAt?: unknown } | undefined;
    if (!body || typeof body.desktopSeenAt !== "string"
      || !Number.isFinite(Date.parse(body.desktopSeenAt))) {
      return this.error(res, 400, "INVALID_LIVENESS");
    }
    if (!this.coordinator()) return this.error(res, 503, "COORDINATOR_UNAVAILABLE");
    const listed = await this.machines.listNonStoppedBySwarm({ swarm_id: swarm.swarm_id });
    if (!listed.ok) return this.unavailable(res, "liveness", listed.error);
    const machines = listed.value;
    let delivered = 0;
    await Promise.all(machines.map(async (machine) => {
      const response = await this.coordinatorRequest(machine.machine_id, "/liveness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ desktopSeenAt: body.desktopSeenAt }),
      });
      if (response.ok) delivered += 1;
    }));
    return res.json({ ok: true, delivered, total: machines.length });
  }

  async stopMachine({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "stop-machine", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedMachine(req, owner);
    if (!found.ok) return this.unavailable(res, "stop-machine", found.error);
    const target = found.value;
    if (!target) return this.error(res, 404, "MACHINE_NOT_FOUND");
    if (!this.coordinator()) return this.error(res, 503, "COORDINATOR_UNAVAILABLE");
    try {
      const stopped = await this.stopOne(target.swarm, target.machine);
      if (!stopped.ok) return this.stopFailed(res, "MACHINE_STOP_FAILED", stopped.error);
      return res.json({ machineId: target.machine.machine_id, state: "stopped" });
    } catch {
      return this.error(res, 502, "MACHINE_STOP_FAILED");
    }
  }

  async stop({ req, res }: Context) {
    const resolved = await this.owner(req, true);
    if (!resolved.ok) return this.unavailable(res, "stop", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedSwarm(req, owner);
    if (!found.ok) return this.unavailable(res, "stop", found.error);
    const swarm = found.value;
    if (!swarm) return this.error(res, 404, "SWARM_NOT_FOUND");
    if (!this.coordinator()) return this.error(res, 503, "COORDINATOR_UNAVAILABLE");
    const stopping = await this.swarms.markStopping({ swarm_id: swarm.swarm_id, owner_user_id: owner.userId });
    if (!stopping.ok) return this.unavailable(res, "stop", stopping.error);
    const listed = await this.machines.listNonStoppedBySwarm({ swarm_id: swarm.swarm_id });
    if (!listed.ok) return this.unavailable(res, "stop", listed.error);
    try {
      for (const machine of listed.value) {
        const stopped = await this.stopOne(swarm, machine);
        if (!stopped.ok) return this.stopFailed(res, "SWARM_STOP_FAILED", stopped.error);
      }
    } catch {
      return this.error(res, 502, "SWARM_STOP_FAILED");
    }
    const stoppedAt = new Date().toISOString();
    const marked = await this.swarms.markStopped({
      swarm_id: swarm.swarm_id,
      owner_user_id: owner.userId,
      stopped_at: stoppedAt,
    });
    if (!marked.ok) return this.unavailable(res, "stop", marked.error);
    return res.json({ swarmId: swarm.swarm_id, state: "stopped" });
  }

  async detail({ req, res }: Context) {
    const resolved = await this.owner(req, false);
    if (!resolved.ok) return this.unavailable(res, "detail", resolved.error);
    const owner = resolved.value;
    if (!owner) return this.error(res, 401, "OWNER_AUTH_REQUIRED");
    const found = await this.ownedSwarm(req, owner);
    if (!found.ok) return this.unavailable(res, "detail", found.error);
    const swarm = found.value;
    if (!swarm) return this.error(res, 404, "SWARM_NOT_FOUND");
    if (!this.coordinator()) return this.error(res, 503, "COORDINATOR_UNAVAILABLE");
    const listed = await this.machines.listBySwarm({ swarm_id: swarm.swarm_id });
    if (!listed.ok) return this.unavailable(res, "detail", listed.error);
    const projected = await Promise.all(listed.value.map(async (machine) => {
      const presenceResponse = await this.coordinatorRequest(machine.machine_id, "/presence");
      const presence = await presenceResponse.json();
      return {
        machineId: machine.machine_id,
        ecsTaskArn: machine.ecs_task_arn,
        taskDefinitionArn: machine.task_definition_arn,
        region: machine.region,
        state: machine.state,
        createdAt: machine.created_at,
        stoppedAt: machine.stopped_at,
        failure: machine.failure,
        presence,
      };
    }));
    return res.json({
      swarmId: swarm.swarm_id,
      env: swarm.env,
      region: swarm.region,
      resourceClass: swarm.resource_class,
      state: swarm.state,
      createdAt: swarm.created_at,
      stoppedAt: swarm.stopped_at,
      machines: projected,
    });
  }

  /** The signed-in owner, null when the caller is not one, or the lookup's repository failure. */
  private async owner(req: Request, mutation: boolean) {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : null;
    if (sessionId) {
      const result = await this.actors.browser(req, sessionId, mutation);
      if (!result.ok && result.reason === "unavailable") return Result.err(result.failure);
      if (!result.ok || result.actor.role !== "browser_session") return Result.ok<Owner | null>(null);
      return Result.ok<Owner | null>({ userId: result.actor.userId, sessionId: result.actor.sessionId });
    }

    const authorization = req.headers.authorization;
    const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    const result = await this.actors.device(token);
    if (!result.ok && result.reason === "unavailable") return Result.err(result.failure);
    if (!result.ok || result.actor.role !== "executor_device" || !result.actor.userId) return Result.ok<Owner | null>(null);
    return Result.ok<Owner | null>({ userId: result.actor.userId, sessionId: "executor:" + result.actor.executorId });
  }

  private async ownedSwarm(req: Request, owner: Owner) {
    const swarmId = req.params?.swarmId;
    if (typeof swarmId !== "string" || !SWARM_ID.test(swarmId)) return Result.ok<Swarm | null>(null);
    return this.swarms.findByIdAndOwner({ swarm_id: swarmId, owner_user_id: owner.userId });
  }

  private async ownedMachine(req: Request, owner: Owner) {
    const found = await this.ownedSwarm(req, owner);
    if (!found.ok) return found;
    const swarm = found.value;
    const machineId = req.params?.machineId;
    if (!swarm || typeof machineId !== "string" || !MACHINE_ID.test(machineId)) {
      return Result.ok<{ swarm: Swarm; machine: SwarmMachine } | null>(null);
    }
    const machine = await this.machines.findById({ swarm_id: swarm.swarm_id, machine_id: machineId });
    if (!machine.ok) return machine;
    return Result.ok(machine.value ? { swarm, machine: machine.value } : null);
  }

  private deploymentEnv(): "dev" | "prod" {
    const explicit = this.env.string("KAZI_SWARM_ENV");
    if (explicit === "prod" || explicit === "dev") return explicit;
    return this.env.string("KAZI_WEBSITE_ORIGIN") === "https://kazibee.com" ? "prod" : "dev";
  }

  private id(prefix: "swm" | "mch"): string {
    return prefix + "_" + randomUUID().replace(/-/g, "");
  }

  private coordinator(): CoordinatorNamespace | null {
    return asCoordinator(this.env.get("SWARM_MACHINE_COORDINATOR"));
  }

  private coordinatorRequest(machineId: string, path: string, init?: RequestInit): Promise<globalThis.Response> {
    const coordinator = this.coordinator();
    if (!coordinator) {
      return Promise.resolve(Response.json({ code: "COORDINATOR_UNAVAILABLE" }, { status: 503 }));
    }
    return coordinator.get(coordinator.idFromName(machineId)).fetch(
      new globalThis.Request("https://swarm-coordinator.internal" + path, init),
    );
  }

  /** Stops one machine; a repository failure is returned, an AWS or coordinator failure thrown (as before). */
  private async stopOne(swarm: Swarm, machine: SwarmMachine) {
    if (machine.state === "stopped") return Result.ok(undefined);
    const stopping = await this.machines.markStopping({ machine_id: machine.machine_id });
    if (!stopping.ok) return stopping;
    await this.coordinatorRequest(machine.machine_id, "/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "head.stop",
        protocolVersion: SWARM_HEAD_PROTOCOL_VERSION,
        machineId: machine.machine_id,
        reason: "swarm_stopped",
        graceMs: 15_000,
        sentAt: new Date().toISOString(),
      }),
    });
    if (machine.ecs_task_arn) await this.aws.stop(swarm, machine.ecs_task_arn);
    const stopped = await this.machines.markStopped({
      machine_id: machine.machine_id,
      stopped_at: new Date().toISOString(),
    });
    if (!stopped.ok) return stopped;
    return Result.ok(undefined);
  }

  private async proxy(res: Response, response: globalThis.Response) {
    const payload = await response.json();
    return res.status(response.status).json(payload);
  }

  private launchError(res: Response, error: unknown) {
    if (error instanceof SwarmImageNotReleasedError) return this.error(res, 409, "IMAGE_NOT_RELEASED");
    if (error instanceof SwarmLaunchConfigurationError) {
      return this.error(res, 503, "LAUNCH_CONFIG_UNAVAILABLE");
    }
    return this.error(res, 502, "MACHINE_LAUNCH_FAILED");
  }

  /** The launch failed after the machine row exists: mark it failed and report the launch failed. */
  private async launchFailed(res: Response, machineId: string, failure?: RepoFailure) {
    if (failure) logger.error("Swarm machine launch could not be recorded", { machineId, kind: failure.kind, error: failure.cause });
    const marked = await this.machines.markFailed({
      machine_id: machineId,
      failure: "ECS_RUN_TASK_FAILED",
      stopped_at: new Date().toISOString(),
    });
    if (!marked.ok) return this.unavailable(res, "launch-machine", marked.error);
    return this.error(res, 502, "MACHINE_LAUNCH_FAILED");
  }

  /** Stopping could not record a machine's state: reported as the stop failure it always was. */
  private stopFailed(res: Response, code: "MACHINE_STOP_FAILED" | "SWARM_STOP_FAILED", failure: RepoFailure) {
    logger.error("Swarm stop could not record machine state", { code, kind: failure.kind, error: failure.cause });
    return this.error(res, 502, code);
  }

  /** A repository lookup or write failed below this action: logged here, answered 500. */
  private unavailable(res: Response, action: string, failure: RepoFailure) {
    logger.error("Swarm request repository failure", { action, kind: failure.kind, error: failure.cause });
    return this.error(res, 500, "INTERNAL_ERROR");
  }

  private error(res: Response, status: number, code: string) {
    return res.status(status).json({ error: true, code });
  }
}
