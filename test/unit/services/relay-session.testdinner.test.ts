/**
 * Relay stack at logic/service depth (no server, no database).
 *
 * The pairing/relay HTTP controllers are deliberate kill-switches (always
 * 503), so route depth cannot exercise the real services. The honest surface
 * for RelayLogic, RelayService, SessionService, PairingService and MessageBus
 * is therefore the real IoC graph via testIoc(), with only the @Query repos
 * (SqlStack boundary) replaced through .methods().
 */
import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { testIoc, test as control } from "@noego/testing";
import RelayLogic from "../../../src/server/logic/relay.logic";
import RelayService from "../../../src/server/services/relay_service";
import SessionService from "../../../src/server/services/session_service";
import PairingService from "../../../src/server/services/pairing_service";
import MessageBus from "../../../src/server/services/message_bus";
import SSEConnectionManager from "../../../src/server/services/sse_connection_manager";
import TraceAdapter from "../../../src/server/observability/trace_adapter";
import DeviceRepo, { type Device } from "../../../src/server/repo/device_repo";
import MessageRepo, { type Message } from "../../../src/server/repo/message_repo";
import SessionRepo, { type Session } from "../../../src/server/repo/session_repo";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../../src/server/errors/domain_errors";

const AUTH_TOKEN = "sk_deadbeefcafe";
const AUTH_HASH = bcrypt.hashSync(AUTH_TOKEN, 4);

const device = (over: Partial<Device> = {}): Device => ({
  device_id: "dev_desktop",
  user_id: "user_a",
  device_name: "Desk",
  device_type: "desktop",
  auth_token_hash: AUTH_HASH,
  pairing_code: null,
  pairing_expires_at: null,
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const message = (over: Partial<Message> = {}): Message => ({
  message_id: 1,
  from_user_id: "user_a",
  from_device_id: "dev_desktop",
  target_kind: "device",
  target_user_id: null,
  target_device_id: "dev_phone",
  type: "note",
  request_id: null,
  correlation_id: null,
  payload: null,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const session = (over: Partial<Session> = {}): Session => ({
  session_id: "sess_old",
  user_id: "user_a",
  device_id: "dev_desktop",
  device_type: "desktop",
  session_fence_message_id: 5,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  last_heartbeat_at: null,
  closed_at: null,
  ...over,
});

const sendParams = (over: Record<string, unknown> = {}) => ({
  fromUserId: "user_a",
  fromDeviceId: "dev_desktop",
  targetKind: "device",
  targetUserId: null,
  targetDeviceId: "dev_phone",
  type: "note",
  requestId: null,
  correlationId: null,
  payload: { hello: "world" } as unknown,
  ...over,
});

const repoStubs = (
  config: Partial<Record<"device" | "message" | "session", Record<string, unknown>>>,
) => {
  const map = new Map<unknown, Record<string, any>>();
  if (config.device) map.set(DeviceRepo, config.device);
  if (config.message) map.set(MessageRepo, config.message);
  if (config.session) map.set(SessionRepo, config.session);
  return map;
};

describe("RelayService (real service, stubbed SQL boundary)", () => {
  it("authenticates a device by id + token and records last-seen", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByDeviceId: control.once(control.returns(Promise.resolve(device()))),
          updateLastSeen: control.once(control.returns(Promise.resolve())),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    const result = await svc.authenticateDeviceByIdAndToken("dev_desktop", AUTH_TOKEN);
    expect(result.user_id).toBe("user_a");
    await env.verify();
    await env.dispose();
  });

  it("rejects an unknown device with NotFoundError", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByDeviceId: control.returns(Promise.resolve(null)),
          updateLastSeen: control.never(),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.authenticateDeviceByIdAndToken("dev_x", AUTH_TOKEN)).rejects.toThrow(NotFoundError);
    await env.verify();
    await env.dispose();
  });

  it("rejects a device without a configured token hash", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByDeviceId: control.returns(Promise.resolve(device({ auth_token_hash: null }))),
          updateLastSeen: control.never(),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.authenticateDeviceByIdAndToken("dev_desktop", AUTH_TOKEN)).rejects.toThrow(UnauthorizedError);
    await env.verify();
    await env.dispose();
  });

  it("rejects a wrong token without touching last-seen", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByDeviceId: control.returns(Promise.resolve(device())),
          updateLastSeen: control.never(),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.authenticateDeviceByIdAndToken("dev_desktop", "sk_wrong")).rejects.toThrow(UnauthorizedError);
    await env.verify();
    await env.dispose();
  });

  it("authenticateDevice (token-only path) is explicitly unsupported", async () => {
    const env = await testIoc().build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.authenticateDevice("sk_any")).rejects.toThrow(/authenticateDeviceByIdAndToken/);
    await env.dispose();
  });

  it("persists before publishing and hands the stored row to the bus", async () => {
    const stored = message({ message_id: 42, request_id: "req_1", payload: JSON.stringify({ hello: "world" }) });
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          findByRequestId: control.once(control.returns(Promise.resolve(null))),
          createMessage: control.once(control.returns(Promise.resolve())),
          getLastInsertedId: control.once(control.returns(Promise.resolve({ message_id: 42 }))),
          findByMessageId: control.once(control.returns(Promise.resolve(stored))),
        },
      }))
      .build();
    const bus = await env.get<MessageBus>(MessageBus);
    const published: Message[] = [];
    bus.subscribe((m) => published.push(m));

    const svc = await env.get<RelayService>(RelayService);
    const result = await svc.sendMessage(sendParams({ requestId: "req_1" }));

    expect(result).toEqual({ accepted: true, messageId: 42, createdAt: stored.created_at });
    expect(published).toEqual([stored]);
    await env.verify();
    await env.dispose();
  });

  it("returns the original message on an idempotent retry without re-persisting", async () => {
    const existing = message({ message_id: 7, request_id: "req_dup" });
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          findByRequestId: control.once(control.returns(Promise.resolve(existing))),
          createMessage: control.never(),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    const result = await svc.sendMessage(sendParams({ requestId: "req_dup" }));
    expect(result).toEqual({ accepted: true, messageId: 7, createdAt: existing.created_at });
    await env.verify();
    await env.dispose();
  });

  it("rejects requestId reuse with different content as a ConflictError", async () => {
    const existing = message({ message_id: 7, request_id: "req_dup", type: "other-type" });
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          findByRequestId: control.returns(Promise.resolve(existing)),
          createMessage: control.never(),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.sendMessage(sendParams({ requestId: "req_dup" }))).rejects.toThrow(ConflictError);
    await env.verify();
    await env.dispose();
  });

  it("survives a missing readback row: no publish, fallback createdAt", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          createMessage: control.once(control.returns(Promise.resolve())),
          getLastInsertedId: control.once(control.returns(Promise.resolve({ message_id: 9 }))),
          findByMessageId: control.once(control.returns(Promise.resolve(null))),
        },
      }))
      .build();
    const bus = await env.get<MessageBus>(MessageBus);
    const published: Message[] = [];
    bus.subscribe((m) => published.push(m));

    const svc = await env.get<RelayService>(RelayService);
    // No requestId and a null payload: idempotency lookup and JSON payload both skipped.
    const result = await svc.sendMessage(sendParams({ payload: null }));
    expect(result.accepted).toBe(true);
    expect(result.messageId).toBe(9);
    expect(typeof result.createdAt).toBe("string");
    expect(published).toEqual([]);
    await env.verify();
    await env.dispose();
  });

  it("delegates visible-message reads to the repo with the exact cursor", async () => {
    const rows = [message({ message_id: 11 })];
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          findVisibleSince: control.once(control.returns(Promise.resolve(rows))),
        },
      }))
      .build();
    const svc = await env.get<RelayService>(RelayService);
    await expect(svc.getVisibleMessagesSince("dev_phone", "user_a", 10)).resolves.toEqual(rows);
    await env.verify();
    await env.dispose();
  });
});

describe("SessionService (real service, stubbed SQL boundary)", () => {
  it("bootstraps a fresh session for a new device at the high-water mark", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: {
          findActiveByDeviceId: control.once(control.returns(Promise.resolve([]))),
          closeSession: control.never(),
          createSession: control.once(control.returns(Promise.resolve())),
        },
        message: {
          getHighWaterMark: control.once(control.returns(Promise.resolve({ hwm: 10 }))),
        },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    const result = await svc.createSession("user_a", "dev_desktop", "desktop", null, null);

    expect(result.sessionId).toMatch(/^sess_[0-9a-f]{16}$/);
    expect(result.userId).toBe("user_a");
    expect(result.deviceId).toBe("dev_desktop");
    expect(result.sessionFenceMessageId).toBe(10);
    expect(result.startAfterMessageId).toBe(10);
    expect(result.heartbeatIntervalMs).toBe(15000);
    expect(result.retryMinMs).toBe(500);
    expect(result.retryMaxMs).toBe(5000);
    expect(result).not.toHaveProperty("replayGap");

    // The stream token it minted verifies through the same service.
    const decoded = svc.verifyStreamToken(result.streamToken);
    expect(decoded).toMatchObject({
      sessionId: result.sessionId,
      userId: "user_a",
      deviceId: "dev_desktop",
    });
    await env.verify();
    await env.dispose();
  });

  it("resumes on an old fence, closes the previous session, and flags the replay gap", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: {
          findActiveByDeviceId: control.once(control.returns(Promise.resolve([session()]))),
          closeSession: control.once(control.returns(Promise.resolve())),
          createSession: control.once(control.returns(Promise.resolve())),
        },
        message: {
          getHighWaterMark: control.once(control.returns(Promise.resolve({ hwm: 10 }))),
        },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    // Client cursor 2 is behind the resumed fence 5 -> replay gap.
    const result = await svc.createSession("user_a", "dev_desktop", "desktop", 2, "resume");
    expect(result.sessionFenceMessageId).toBe(5);
    expect(result.startAfterMessageId).toBe(5);
    expect(result).toMatchObject({ replayGap: true, oldestRetainedMessageId: 6 });
    await env.verify();
    await env.dispose();
  });

  it("resumeMode=fresh ignores the old fence and re-fences at the high-water mark", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: {
          findActiveByDeviceId: control.once(control.returns(Promise.resolve([session()]))),
          closeSession: control.once(control.returns(Promise.resolve())),
          createSession: control.once(control.returns(Promise.resolve())),
        },
        message: {
          getHighWaterMark: control.once(control.returns(Promise.resolve({ hwm: 10 }))),
        },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    const result = await svc.createSession("user_a", "dev_desktop", "desktop", 12, "fresh");
    expect(result.sessionFenceMessageId).toBe(10);
    // Client cursor ahead of the fence wins the start-after computation.
    expect(result.startAfterMessageId).toBe(12);
    expect(result).not.toHaveProperty("replayGap");
    await env.verify();
    await env.dispose();
  });

  it("validateSession returns the active session row", async () => {
    const active = session({ session_id: "sess_ok" });
    const env = await testIoc()
      .methods(repoStubs({
        session: { findBySessionId: control.once(control.returns(Promise.resolve(active))) },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    await expect(svc.validateSession("sess_ok")).resolves.toEqual(active);
    await env.verify();
    await env.dispose();
  });

  it("validateSession rejects unknown and closed sessions", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: {
          findBySessionId: control.calls([
            control.returns(Promise.resolve(null)),
            control.returns(Promise.resolve(session({ status: "closed" }))),
          ]),
        },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    await expect(svc.validateSession("sess_missing")).rejects.toThrow(UnauthorizedError);
    await expect(svc.validateSession("sess_closed")).rejects.toThrow(UnauthorizedError);
    await env.dispose();
  });

  it("verifyStreamToken rejects garbage tokens", async () => {
    const env = await testIoc().build();
    const svc = await env.get<SessionService>(SessionService);
    expect(() => svc.verifyStreamToken("not-a-jwt")).toThrow(UnauthorizedError);
    await env.dispose();
  });

  it("updateHeartbeat delegates to the repo", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: { updateHeartbeat: control.once(control.returns(Promise.resolve())) },
      }))
      .build();
    const svc = await env.get<SessionService>(SessionService);
    await svc.updateHeartbeat("sess_ok");
    await env.verify();
    await env.dispose();
  });
});

describe("PairingService.claimPairing (real service, stubbed SQL boundary)", () => {
  it("rejects an unknown pairing code", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByPairingCode: control.once(control.returns(Promise.resolve(null))),
          clearPairingCode: control.never(),
          createDevice: control.never(),
        },
      }))
      .build();
    const svc = await env.get<PairingService>(PairingService);
    await expect(svc.claimPairing("abc123", null, null)).rejects.toThrow(NotFoundError);
    await env.verify();
    await env.dispose();
  });

  it("rejects an expired code and burns it", async () => {
    const expired = device({ pairing_code: "ABCDEF", pairing_expires_at: "2020-01-01T00:00:00Z" });
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByPairingCode: control.once(control.returns(Promise.resolve(expired))),
          clearPairingCode: control.once(control.returns(Promise.resolve())),
          createDevice: control.never(),
        },
      }))
      .build();
    const svc = await env.get<PairingService>(PairingService);
    await expect(svc.claimPairing("abcdef", "My phone", "phone")).rejects.toThrow(ValidationError);
    await env.verify();
    await env.dispose();
  });

  it("claims a valid code: burns it, creates the mobile device, notifies the desktop", async () => {
    const desktop = device({
      pairing_code: "ABCDEF",
      pairing_expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    let createdDevice: Record<string, unknown> | undefined;
    const stored = message({ message_id: 99, type: "pairing.claimed", target_device_id: "dev_desktop" });
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByPairingCode: control.once(control.returns(Promise.resolve(desktop))),
          clearPairingCode: control.once(control.returns(Promise.resolve())),
          createDevice: control.watch((_original) => async (params: Record<string, unknown>) => {
            createdDevice = params;
          }),
        },
        message: {
          createMessage: control.once(control.returns(Promise.resolve())),
          getLastInsertedId: control.once(control.returns(Promise.resolve({ message_id: 99 }))),
          findByMessageId: control.once(control.returns(Promise.resolve(stored))),
        },
      }))
      .build();
    const bus = await env.get<MessageBus>(MessageBus);
    const published: Message[] = [];
    bus.subscribe((m) => published.push(m));

    const svc = await env.get<PairingService>(PairingService);
    const result = await svc.claimPairing("abcdef", "My phone", null);

    expect(result.userId).toBe("user_a");
    expect(result.deviceId).toMatch(/^dev_[0-9a-f]{12}$/);
    expect(result.authToken).toMatch(/^sk_[0-9a-f]{64}$/);
    expect(result.desktopDeviceId).toBe("dev_desktop");
    expect(result.desktopDeviceName).toBe("Desk");
    expect(createdDevice).toMatchObject({
      user_id: "user_a",
      device_type: "phone",
      pairing_code: null,
    });
    // The mobile token stored is a bcrypt hash of the raw one returned.
    expect(bcrypt.compareSync(result.authToken, String(createdDevice?.auth_token_hash))).toBe(true);
    // pairing.claimed message went through the real relay path onto the bus.
    expect(published).toEqual([stored]);
    await env.verify();
    await env.dispose();
  });

  it("still hands the mobile its credentials when the notify publish fails", async () => {
    const desktop = device({ pairing_code: "ABCDEF", pairing_expires_at: null });
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByPairingCode: control.once(control.returns(Promise.resolve(desktop))),
          clearPairingCode: control.once(control.returns(Promise.resolve())),
          createDevice: control.once(control.returns(Promise.resolve())),
        },
        message: {
          createMessage: control.once(control.throws(new Error("insert failed"))),
        },
      }))
      .build();
    const svc = await env.get<PairingService>(PairingService);
    const result = await svc.claimPairing("abcdef", null, "tablet");
    expect(result.userId).toBe("user_a");
    expect(result.authToken).toMatch(/^sk_/);
    await env.verify();
    await env.dispose();
  });

  it("authenticateByToken (token-only path) is explicitly unsupported", async () => {
    const env = await testIoc().build();
    const svc = await env.get<PairingService>(PairingService);
    await expect(svc.authenticateByToken("sk_any")).rejects.toThrow(ValidationError);
    await env.dispose();
  });

  it("lists a user's devices and flags the current one", async () => {
    const rows = [
      device({ device_id: "dev_desktop", last_seen_at: "2026-01-02T00:00:00Z" }),
      device({ device_id: "dev_phone", device_name: "Phone", device_type: "phone" }),
    ];
    const env = await testIoc()
      .methods(repoStubs({
        device: { findByUserId: control.once(control.returns(Promise.resolve(rows))) },
      }))
      .build();
    const svc = await env.get<PairingService>(PairingService);
    const result = await svc.getDevicesForUser("user_a", "dev_phone");
    expect(result).toEqual([
      {
        deviceId: "dev_desktop",
        deviceName: "Desk",
        deviceType: "desktop",
        lastSeenAt: "2026-01-02T00:00:00Z",
        isCurrentDevice: false,
      },
      {
        deviceId: "dev_phone",
        deviceName: "Phone",
        deviceType: "phone",
        lastSeenAt: null,
        isCurrentDevice: true,
      },
    ]);
    await env.verify();
    await env.dispose();
  });
});

describe("RelayLogic (real logic over real services, stubbed SQL boundary)", () => {
  it("token-only authentication is explicitly unsupported", async () => {
    const env = await testIoc().build();
    const logic = await env.get<RelayLogic>(RelayLogic);
    await expect(logic.authenticateDevice("sk_any")).rejects.toThrow(/authenticateDeviceById/);
    await env.dispose();
  });

  it("authenticates by id through the real relay service", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        device: {
          findByDeviceId: control.once(control.returns(Promise.resolve(device()))),
          updateLastSeen: control.once(control.returns(Promise.resolve())),
        },
      }))
      .build();
    const logic = await env.get<RelayLogic>(RelayLogic);
    const result = await logic.authenticateDeviceById("dev_desktop", AUTH_TOKEN);
    expect(result.device_id).toBe("dev_desktop");
    await env.verify();
    await env.dispose();
  });

  it("creates a session, wires the bus exactly once, and round-trips the stream token", async () => {
    const env = await testIoc()
      .methods(repoStubs({
        session: {
          findActiveByDeviceId: control.returns(Promise.resolve([])),
          createSession: control.returns(Promise.resolve()),
          findBySessionId: control.once(control.returns(Promise.resolve(session({ session_id: "sess_v" })))),
        },
        message: {
          getHighWaterMark: control.returns(Promise.resolve({ hwm: 0 })),
        },
      }))
      .build();
    const logic = await env.get<RelayLogic>(RelayLogic);
    const boot = await logic.createSession("user_a", "dev_desktop", "desktop", null, null);
    expect(boot.sessionId).toMatch(/^sess_/);
    expect(logic.verifyStreamToken(boot.streamToken)).toMatchObject({ userId: "user_a" });
    await expect(logic.validateSession("sess_v")).resolves.toMatchObject({ session_id: "sess_v" });
    await env.verify();
    await env.dispose();
  });

  it("bridges bus publishes into the SSE manager after getSSEManager()", async () => {
    const stored = message({ message_id: 5, target_kind: "device", target_device_id: "dev_phone", payload: JSON.stringify({ n: 1 }) });
    const env = await testIoc()
      .methods(repoStubs({
        message: {
          createMessage: control.once(control.returns(Promise.resolve())),
          getLastInsertedId: control.once(control.returns(Promise.resolve({ message_id: 5 }))),
          findByMessageId: control.once(control.returns(Promise.resolve(stored))),
        },
      }))
      .build();
    const logic = await env.get<RelayLogic>(RelayLogic);
    const manager = logic.getSSEManager();
    expect(manager).toBe(await env.get<SSEConnectionManager>(SSEConnectionManager));

    const writes: string[] = [];
    manager.attach("sess_p", "user_a", "dev_phone", {
      write(chunk: string) { writes.push(chunk); return true; },
      end() {},
      writableEnded: false,
      onClose() {},
    });
    manager.markReplayComplete("sess_p");

    // Real path: logic -> relay service -> bus -> manager -> sink.
    const result = await logic.sendMessage(sendParams());
    expect(result.messageId).toBe(5);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("event: message");
    expect(writes[0]).toContain('"messageId":5');
    await env.verify();
    await env.dispose();
  });

  it("delegates visible-message reads through the real relay service", async () => {
    const rows = [message({ message_id: 3 })];
    const env = await testIoc()
      .methods(repoStubs({
        message: { findVisibleSince: control.once(control.returns(Promise.resolve(rows))) },
      }))
      .build();
    const logic = await env.get<RelayLogic>(RelayLogic);
    await expect(logic.getVisibleMessagesSince("dev_phone", "user_a", 2)).resolves.toEqual(rows);
    await env.verify();
    await env.dispose();
  });
});

describe("MessageBus (real in-memory pub/sub)", () => {
  const bus = () => new MessageBus(new TraceAdapter());

  it("publishes to every subscriber in subscription order", () => {
    const b = bus();
    const seen: string[] = [];
    b.subscribe(() => seen.push("first"));
    b.subscribe(() => seen.push("second"));
    b.publish(message());
    expect(seen).toEqual(["first", "second"]);
  });

  it("a throwing handler does not stop delivery to later handlers", () => {
    const b = bus();
    const seen: number[] = [];
    b.subscribe(() => { throw new Error("boom"); });
    b.subscribe((m) => seen.push(m.message_id));
    expect(() => b.publish(message({ message_id: 8 }))).not.toThrow();
    expect(seen).toEqual([8]);
  });

  it("unsubscribe removes only that handler and is idempotent", () => {
    const b = bus();
    const seen: string[] = [];
    const unsubscribe = b.subscribe(() => seen.push("a"));
    b.subscribe(() => seen.push("b"));
    unsubscribe();
    unsubscribe(); // second call is a no-op
    b.publish(message());
    expect(seen).toEqual(["b"]);
  });

  it("publishing with no subscribers is a no-op", () => {
    expect(() => bus().publish(message())).not.toThrow();
  });
});
