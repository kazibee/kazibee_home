/**
 * Swarm head ↔ Kazibee cloud runtime-control channel (`swarm_head_v1`).
 *
 * This is the "runtime-control channel" of Agent Swarms spec §7.2: one
 * outbound WebSocket per Fargate machine ("head") to the website. It carries
 * bootstrap, liveness, thread lifecycle, streamed provider events, and
 * credential delivery. It is NOT a tool API: tools flow over the provider's
 * own MCP client → mcp.kazibee.com → the desktop executor (spec §7.2, §13).
 *
 * Shared contract. The canonical copy lives here (Kazibee Desktop repo,
 * `shared/swarm/head_protocol.ts`); the website (`websites/kazibee`) vendors a
 * byte-identical copy at `src/shared/swarm_head_protocol.ts`. Closed frame
 * set, closed string enums, ids prefix-checked — no free-form operations.
 *
 * Upgrade request (head → cloud):
 *   GET {origin}/v1/swarms/{swarmId}/machines/{machineId}/channel
 *   authorization:            Bearer <machine token>   (per-machine, minted at RunTask, env override)
 *   x-kazi-swarm-id:          swm_…
 *   x-kazi-machine-id:        mch_…
 *   x-kazi-audience:          swarm-head
 *   x-kazi-protocol-version:  1.0
 * Keepalive: the head sends the literal text "ping"; the cloud auto-answers "pong".
 */

export const SWARM_HEAD_PROTOCOL_VERSION = '1.0' as const;
export const SWARM_HEAD_AUDIENCE = 'swarm-head' as const;

export const SWARM_ID = /^swm_[A-Za-z0-9]{8,64}$/;
export const MACHINE_ID = /^mch_[A-Za-z0-9]{8,64}$/;
export const THREAD_ID = /^thr_[A-Za-z0-9]{8,64}$/;
export const MACHINE_TOKEN = /^[A-Za-z0-9_-]{32,200}$/;

export type SwarmProvider = 'codex' | 'claude';
export type SwarmEnv = 'dev' | 'prod';
export type HeadClass = 'head_micro' | 'head_small' | 'head_medium' | 'head_large';

/** Spec §8.4 runtime states, projected per thread on this machine. */
export type ThreadState =
  | 'starting'
  | 'ready'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'closed';

export type HeadState = 'booting' | 'credential_ready' | 'ready' | 'stopping';

/** Liveness (kazidoc 02 §reliability): the head exits when either budget lapses. */
export const HEAD_LIVENESS = {
  /** No `desktop.liveness` relayed by the cloud for this long → self-terminate. */
  desktopSilenceMs: 180_000,
  /** Channel offline (not reconnected) for this long → self-terminate. */
  channelOfflineMs: 180_000,
  /** Head heartbeat cadence while connected. */
  heartbeatIntervalMs: 20_000,
  /** Cloud relays desktop liveness at least this often while the desktop is online. */
  desktopLivenessIntervalMs: 30_000,
} as const;

export const HEAD_FRAME_LIMITS = {
  inboundFrameBytes: 256 * 1024,
  outboundFrameBytes: 192 * 1024,
  /** Provider events larger than this are truncated by the head before sending. */
  eventPayloadBytes: 128 * 1024,
} as const;

// ---------------------------------------------------------------- head → cloud

export interface HeadHelloFrame {
  kind: 'head.hello';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  swarmId: string;
  machineId: string;
  env: SwarmEnv;
  headClass: HeadClass;
  /** Image digest baked at build time (sha256:…), for cloud-side pinning checks. */
  imageDigest: string | null;
  headVersion: string;
  providers: Array<{ provider: SwarmProvider; version: string }>;
  /** Threads this machine will accept concurrently (kazidoc 02: capacity ledger). */
  maxThreads: number;
  /** Threads already alive on reconnect, so the cloud can reconcile. */
  threads: Array<{ threadId: string; state: ThreadState }>;
  correlationId: string;
  sentAt: string;
}

export interface HeadHeartbeatFrame {
  kind: 'head.heartbeat';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  state: HeadState;
  threads: Array<{ threadId: string; state: ThreadState }>;
  /** Process RSS in bytes; the cloud uses it for sizing telemetry only. */
  rssBytes: number;
  sentAt: string;
}

/** Spec §10.5: hash-only acknowledgement; never echoes token material. */
export interface CredentialAcceptedFrame {
  kind: 'credential.accepted';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  provider: SwarmProvider;
  credentialSessionId: string;
  envelopeHash: string;
  sentAt: string;
}

export interface CredentialRejectedFrame {
  kind: 'credential.rejected';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  provider: SwarmProvider;
  credentialSessionId: string;
  code: 'HASH_MISMATCH' | 'UNSUPPORTED_ENVELOPE' | 'WRITE_FAILED';
  sentAt: string;
}

export interface ThreadStateFrame {
  kind: 'thread.state';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  state: ThreadState;
  /** Provider-native thread/session id once known (Codex thread id, Claude session id). */
  providerThreadId: string | null;
  /** Monotonic per thread; the cloud drops out-of-order state. */
  seq: number;
  detail?: string;
  sentAt: string;
}

/**
 * One streamed provider event. `event` is the provider's native event object
 * (Codex app-server JSON-RPC notification params / Claude stream-json line),
 * bounded to HEAD_FRAME_LIMITS.eventPayloadBytes with `truncated: true` when cut.
 */
export interface ThreadEventFrame {
  kind: 'thread.event';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  provider: SwarmProvider;
  seq: number;
  event: unknown;
  truncated: boolean;
  sentAt: string;
}

/** Terminal result of one turn (a `thread.start` or `thread.message`). */
export interface ThreadTurnResultFrame {
  kind: 'thread.turn.result';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  turnId: string;
  seq: number;
  result:
    | { status: 'completed'; finalText: string; usage: unknown | null }
    | { status: 'interrupted' }
    | { status: 'failed'; error: { code: string; message: string; retryable: boolean } };
  sentAt: string;
}

export interface HeadShutdownFrame {
  kind: 'head.shutdown';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  reason: 'desktop_silence' | 'channel_offline' | 'cloud_stop' | 'sigterm' | 'fatal';
  detail?: string;
  sentAt: string;
}

export type HeadOutboundFrame =
  | HeadHelloFrame
  | HeadHeartbeatFrame
  | CredentialAcceptedFrame
  | CredentialRejectedFrame
  | ThreadStateFrame
  | ThreadEventFrame
  | ThreadTurnResultFrame
  | HeadShutdownFrame;

// ---------------------------------------------------------------- cloud → head

export interface HeadHelloAckFrame {
  kind: 'head.hello.ack';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  /** Channel generation; frames from an older fence are dropped by the cloud. */
  machineFence: string;
  correlationId: string;
  acceptedAt: string;
}

/**
 * Relay of desktop presence. The cloud sends this while the owning desktop's
 * Connect channel is online; absence for HEAD_LIVENESS.desktopSilenceMs is the
 * head's signal to self-terminate (user rule: "ping from the desktop or shut
 * down after 3 minutes").
 */
export interface DesktopLivenessFrame {
  kind: 'desktop.liveness';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  desktopSeenAt: string;
  sentAt: string;
}

/**
 * Provider credential delivery (user decision: copied OAuth). V1 envelope is
 * `plain` over the TLS channel; `hpke` (spec §10.4) is reserved. Files are
 * written under the provider home on tmpfs and never logged.
 */
export interface CredentialDeliverFrame {
  kind: 'credential.deliver';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  provider: SwarmProvider;
  credentialSessionId: string;
  envelope:
    | { kind: 'plain'; files: Array<{ relativePath: string; contentBase64: string; mode: number }> }
    | { kind: 'hpke'; recipientKeyId: string; ciphertextBase64: string };
  /** sha256 of the canonical envelope JSON; the head echoes it in credential.accepted. */
  envelopeHash: string;
  sentAt: string;
}

/** Per-thread MCP binding (spec §8.5 / kazidoc 02 Phase 5): the tool bearer is per thread. */
export interface ThreadMcpBinding {
  url: string;
  bearer: string;
  /** Sent to the provider as tool timeout; bounded by the cloud's 60 s request budget. */
  toolTimeoutSec: number;
}

export interface ThreadStartFrame {
  kind: 'thread.start';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  turnId: string;
  provider: SwarmProvider;
  model: string;
  reasoningLevel: 'minimal' | 'low' | 'medium' | 'high' | 'max' | null;
  fastMode: boolean;
  /** Logical agent this thread acts as (kazidoc 02: thread = agent). */
  agentId: string;
  displayName: string;
  /** Additive system/developer instructions; the head never invents its own. */
  instructions: string;
  prompt: string;
  mcp: ThreadMcpBinding;
  sentAt: string;
}

export interface ThreadMessageFrame {
  kind: 'thread.message';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  turnId: string;
  prompt: string;
  sentAt: string;
}

export interface ThreadInterruptFrame {
  kind: 'thread.interrupt';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  sentAt: string;
}

export interface ThreadCloseFrame {
  kind: 'thread.close';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  threadId: string;
  /** Erase provider-side thread state for this thread (rollouts/sessions). */
  erase: boolean;
  sentAt: string;
}

export interface HeadStopFrame {
  kind: 'head.stop';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  machineId: string;
  reason: 'swarm_stopped' | 'replaced' | 'revoked' | 'idle_reclaim';
  /** Grace before the head exits regardless of thread state. */
  graceMs: number;
  sentAt: string;
}

export interface HeadChannelErrorFrame {
  kind: 'channel.error';
  protocolVersion: typeof SWARM_HEAD_PROTOCOL_VERSION;
  code: string;
  message: string;
  fatal: boolean;
}

export type HeadInboundFrame =
  | HeadHelloAckFrame
  | DesktopLivenessFrame
  | CredentialDeliverFrame
  | ThreadStartFrame
  | ThreadMessageFrame
  | ThreadInterruptFrame
  | ThreadCloseFrame
  | HeadStopFrame
  | HeadChannelErrorFrame;

const INBOUND_KINDS = new Set<HeadInboundFrame['kind']>([
  'head.hello.ack',
  'desktop.liveness',
  'credential.deliver',
  'thread.start',
  'thread.message',
  'thread.interrupt',
  'thread.close',
  'head.stop',
  'channel.error',
]);

const OUTBOUND_KINDS = new Set<HeadOutboundFrame['kind']>([
  'head.hello',
  'head.heartbeat',
  'credential.accepted',
  'credential.rejected',
  'thread.state',
  'thread.event',
  'thread.turn.result',
  'head.shutdown',
]);

/** Head-side parse of a cloud frame. Returns null on any protocol violation. */
export function parseHeadInboundFrame(raw: string, expectedMachineId: string): HeadInboundFrame | null {
  if (raw.length > HEAD_FRAME_LIMITS.inboundFrameBytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const frame = parsed as Partial<HeadInboundFrame> & { machineId?: unknown };
  if (frame.protocolVersion !== SWARM_HEAD_PROTOCOL_VERSION) return null;
  if (!frame.kind || !INBOUND_KINDS.has(frame.kind)) return null;
  if (frame.kind !== 'channel.error' && frame.machineId !== expectedMachineId) return null;
  if (frame.kind === 'thread.start') {
    const start = frame as Partial<ThreadStartFrame>;
    if (typeof start.threadId !== 'string' || !THREAD_ID.test(start.threadId)) return null;
    if (start.provider !== 'codex' && start.provider !== 'claude') return null;
    if (!start.mcp || typeof start.mcp.url !== 'string' || typeof start.mcp.bearer !== 'string') return null;
    if (!start.mcp.url.startsWith('https://')) return null;
  }
  return frame as HeadInboundFrame;
}

/** Cloud-side parse of a head frame. Returns null on any protocol violation. */
export function parseHeadOutboundFrame(raw: string, expectedMachineId: string): HeadOutboundFrame | null {
  if (raw.length > HEAD_FRAME_LIMITS.outboundFrameBytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const frame = parsed as Partial<HeadOutboundFrame> & { machineId?: unknown };
  if (frame.protocolVersion !== SWARM_HEAD_PROTOCOL_VERSION) return null;
  if (!frame.kind || !OUTBOUND_KINDS.has(frame.kind)) return null;
  if (frame.machineId !== expectedMachineId) return null;
  return frame as HeadOutboundFrame;
}

/** Environment the cloud injects at RunTask (spec §10.2 V1 path) plus the task-definition statics. */
export interface HeadBootEnvironment {
  /** Override: per-machine bearer for this channel. Redacted from all diagnostics. */
  KAZIBEE_MACHINE_TOKEN: string;
  KAZIBEE_SWARM_ID: string;
  KAZIBEE_MACHINE_ID: string;
  /** Static (task definition). */
  KAZIBEE_SWARM_ORIGIN: string;
  KAZIBEE_SWARM_ENV: SwarmEnv;
  KAZIBEE_HEAD_CLASS: HeadClass;
}

export const HEAD_BOOT_ENV_KEYS: ReadonlyArray<keyof HeadBootEnvironment> = [
  'KAZIBEE_MACHINE_TOKEN',
  'KAZIBEE_SWARM_ID',
  'KAZIBEE_MACHINE_ID',
  'KAZIBEE_SWARM_ORIGIN',
  'KAZIBEE_SWARM_ENV',
  'KAZIBEE_HEAD_CLASS',
];
