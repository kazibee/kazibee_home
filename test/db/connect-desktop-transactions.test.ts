/**
 * ConnectDesktopLogic @transaction methods against REAL SQL.
 *
 * Real IoC graph (testDinner over the production desktops.yaml source),
 * real repos, real production migration DDL on an isolated testPostgres
 * database. This tier covers exactly what the unit tier cannot: the
 * transactional createClaim/decide/rename/revoke paths, including the
 * decide() queue that serializes decideTransaction.
 *
 * The root registers its own SqlStack (composeProductionSql(...).module) at
 * composition — sqlstack 3.3's explicit per-IoC-root contract.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";
import { testDinner } from "@noego/dinner/testing";
import type { TestPostgresDatabase } from "sqlstack/testing";
import type { Database } from "sqlstack";
import ConnectDesktopController from "../../src/server/controller/connect_desktop.controller";
import ConnectDesktopLogic from "../../src/server/logic/connect_desktop.logic";
import type { ConnectDesktopActor } from "../../src/server/services/connect_desktop_actor_resolver";
import type {
  DesktopClaimCreateInput,
  DesktopClaimDecisionInput,
} from "../../src/server/services/connect_desktop_request_parser";
import { createHash } from "node:crypto";
import {
  buildProductionDatabase,
  composeProductionSql,
  seedAccount,
} from "../helpers/production-schema";

const desktopsSource = parseYaml(
  readFileSync(path.resolve(__dirname, "../../src/server/openapi/connect/desktops.yaml"), "utf8"),
) as Record<string, unknown>;

const USER_ID = "usr_dbdesktop1";
const TOKEN_A = "A".repeat(43);
const TOKEN_B = "B".repeat(43);
const TOKEN_C = "C".repeat(43);
const actor: ConnectDesktopActor = {
  role: "browser_session",
  userId: USER_ID,
  sessionId: "ses_dbdesktop1",
};

const createInput = (n: string, token: string): DesktopClaimCreateInput => ({
  kind: "desktop.claim.create.request",
  protocolVersion: "1.0",
  claimId: `clm_dbdesk${n}`,
  deviceId: `dev_dbdesk${n}`,
  actorRole: "desktop_device",
  displayName: `Desktop ${n}`,
  platform: "macos",
  architecture: "arm64",
  desktopVersion: "1.2.3",
  keyFingerprint: "a".repeat(64),
  idempotencyKey: `idem_dbdesk_${n}_0123456789`,
  correlationId: `cor_dbdesk${n}`,
});

const decisionInput = (
  n: string,
  decision: "accept" | "deny",
  key = "aaaa",
): DesktopClaimDecisionInput => ({
  kind: "desktop.claim.decision.request",
  protocolVersion: "1.0",
  claimId: `clm_dbdesk${n}`,
  sessionId: "ses_dbdesktop1",
  actorRole: "browser_session",
  decision,
  idempotencyKey: `idem_dbdeskdec_${n}_${key}`,
  correlationId: `cor_dbdeskdec${n}`,
});

let built: TestPostgresDatabase;
let database: Database;
let env: Awaited<ReturnType<ReturnType<typeof testDinner>["build"]>>;
let logic: ConnectDesktopLogic;

const rows = (sql: string, params: unknown[] = []) =>
  built.query(sql, params) as Promise<Record<string, unknown>[]>;

beforeAll(async () => {
  built = await buildProductionDatabase();
  await seedAccount(built, USER_ID);
  const sql = await composeProductionSql(built, "db-desktop");
  database = sql.database;
  env = await testDinner(desktopsSource)
    .use(sql.module)
    .select({ module: "connectDesktops" })
    .controllers({ "connect_desktop.controller": ConnectDesktopController })
    .hooks({})
    .build();
  logic = await env.get<ConnectDesktopLogic>(ConnectDesktopLogic);
});

afterAll(async () => {
  await env?.dispose();
  await database?.close();
  await built?.dispose();
});

describe("ConnectDesktopLogic transactional paths against real SQL", () => {
  it("createClaim persists the device + claim rows and returns the challenge envelope", async () => {
    const input = createInput("001", TOKEN_A);
    const result = await logic.createClaim(actor, input, TOKEN_A);
    expect(result.outcome).toBe("created");
    if (result.outcome !== "created" && result.outcome !== "retry") throw new Error("unreachable");
    expect(result.challenge).toMatchObject({
      claimId: input.claimId,
      displayName: input.displayName,
      platform: "macos",
      architecture: "arm64",
      desktopVersion: "1.2.3",
      keyFingerprint: input.keyFingerprint,
    });
    expect(result.challenge.shortCode).toMatch(/^[A-Z]{4}-[A-Z]{4}$/);
    expect(result.challenge.claimUrl).toContain(`/claim/${input.claimId}`);

    const claimRows = await rows(
      "SELECT * FROM connect_desktop_claims WHERE claim_id = $1",
      [input.claimId],
    );
    expect(claimRows).toHaveLength(1);
    expect(claimRows[0]).toMatchObject({
      device_id: input.deviceId,
      status: "pending",
      idempotency_key: input.idempotencyKey,
      decided_by_user_id: null,
    });
    const deviceRows = await rows(
      "SELECT * FROM connect_desktop_devices WHERE device_id = $1",
      [input.deviceId],
    );
    expect(deviceRows[0]).toMatchObject({
      state: "pending",
      owner_user_id: null,
      credential_generation: 0,
      display_name: input.displayName,
    });
    const audit = await rows(
      "SELECT event_kind FROM connect_desktop_audit_events WHERE device_id = $1",
      [input.deviceId],
    );
    expect(audit).toEqual([{ event_kind: "claim.created" }]);
  });

  it("createClaim is idempotent for the exact same envelope (retry) and conflicts on drift", async () => {
    const input = createInput("001", TOKEN_A);
    const retry = await logic.createClaim(actor, input, TOKEN_A);
    expect(retry.outcome).toBe("retry");

    const drift = await logic.createClaim(
      actor,
      { ...input, displayName: "Renamed Envelope" },
      TOKEN_A,
    );
    expect(drift).toEqual({ outcome: "conflict" });

    // Still exactly one claim row and one claim.created audit event.
    const count = await rows(
      "SELECT count(*)::int AS n FROM connect_desktop_claims WHERE claim_id = $1",
      [input.claimId],
    );
    expect(count[0].n).toBe(1);
  });

  it("decide(accept) transitions claim + device rows, mints a generation-1 credential, and audits", async () => {
    const input = createInput("002", TOKEN_B);
    await logic.createClaim(actor, input, TOKEN_B);
    const decision = decisionInput("002", "accept");
    const result = await logic.decide(actor, decision);
    expect(result).toMatchObject({
      outcome: "accepted",
      deviceId: input.deviceId,
      websiteAccountId: USER_ID,
    });
    if (result.outcome !== "accepted") throw new Error("unreachable");
    expect(result.websiteDeploymentId).toMatch(/^wdp_[A-Za-z0-9]{32}$/);

    const claim = (await rows(
      "SELECT * FROM connect_desktop_claims WHERE claim_id = $1",
      [input.claimId],
    ))[0];
    expect(claim).toMatchObject({
      status: "accepted",
      decided_by_user_id: USER_ID,
      decision_idempotency_key: decision.idempotencyKey,
    });
    const device = (await rows(
      "SELECT * FROM connect_desktop_devices WHERE device_id = $1",
      [input.deviceId],
    ))[0];
    expect(device).toMatchObject({
      state: "active",
      owner_user_id: USER_ID,
      credential_generation: 1,
    });
    const credentials = await rows(
      "SELECT generation, status, audience FROM connect_desktop_credentials WHERE device_id = $1",
      [input.deviceId],
    );
    expect(credentials).toEqual([
      { generation: 1, status: "active", audience: "desktop-relay" },
    ]);
    const audit = await rows(
      "SELECT event_kind FROM connect_desktop_audit_events WHERE device_id = $1 ORDER BY occurred_at",
      [input.deviceId],
    );
    expect(audit.map((row) => row.event_kind)).toEqual(["claim.created", "claim.accepted"]);
  });

  it("decide(accept) replay is idempotent for the same key and replayed for a different key", async () => {
    const same = await logic.decide(actor, decisionInput("002", "accept"));
    expect(same.outcome).toBe("accepted");
    const different = await logic.decide(actor, decisionInput("002", "accept", "bbbb"));
    expect(different).toEqual({ outcome: "replayed" });
  });

  it("decide(deny) marks the claim denied and appends the audit row", async () => {
    const input = createInput("003", TOKEN_C);
    await logic.createClaim(actor, input, TOKEN_C);
    const result = await logic.decide(actor, decisionInput("003", "deny"));
    expect(result).toEqual({ outcome: "denied" });
    const claim = (await rows(
      "SELECT status, decided_by_user_id FROM connect_desktop_claims WHERE claim_id = $1",
      [input.claimId],
    ))[0];
    expect(claim).toEqual({ status: "denied", decided_by_user_id: USER_ID });
    const audit = await rows(
      "SELECT event_kind FROM connect_desktop_audit_events WHERE device_id = $1 ORDER BY occurred_at",
      [input.deviceId],
    );
    expect(audit.map((row) => row.event_kind)).toEqual(["claim.created", "claim.denied"]);
  });

  it("concurrent decides on one claim are serialized by the decision queue: one wins, one replays", async () => {
    const input = createInput("004", TOKEN_A.replace(/A/g, "D"));
    await logic.createClaim(actor, input, TOKEN_A.replace(/A/g, "D"));
    const [first, second] = await Promise.all([
      logic.decide(actor, decisionInput("004", "accept", "one1")),
      logic.decide(actor, decisionInput("004", "accept", "two2")),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(outcomes).toEqual(["accepted", "replayed"]);
    const credentials = await rows(
      "SELECT count(*)::int AS n FROM connect_desktop_credentials WHERE device_id = $1",
      [input.deviceId],
    );
    expect(credentials[0].n).toBe(1);
  });

  it("rename updates the owned active device row and audits desktop.renamed", async () => {
    const result = await logic.rename(actor, {
      kind: "desktop.rename.request",
      protocolVersion: "1.0",
      deviceId: "dev_dbdesk002",
      displayName: "Renamed Desktop",
      idempotencyKey: "idem_dbdeskren_0123456789",
      correlationId: "cor_dbdeskren01",
    });
    expect(result.outcome).toBe("renamed");
    if (result.outcome !== "renamed") throw new Error("unreachable");
    expect(result.device.display_name).toBe("Renamed Desktop");
    const device = (await rows(
      "SELECT display_name FROM connect_desktop_devices WHERE device_id = $1",
      ["dev_dbdesk002"],
    ))[0];
    expect(device).toEqual({ display_name: "Renamed Desktop" });
    const audit = await rows(
      "SELECT count(*)::int AS n FROM connect_desktop_audit_events WHERE device_id = $1 AND event_kind = 'desktop.renamed'",
      ["dev_dbdesk002"],
    );
    expect(audit[0].n).toBe(1);
  });

  it("rename of a device the actor does not own is not-found and writes nothing", async () => {
    const result = await logic.rename(
      { ...actor, userId: "usr_intruder99" },
      {
        kind: "desktop.rename.request",
        protocolVersion: "1.0",
        deviceId: "dev_dbdesk002",
        displayName: "Stolen",
        idempotencyKey: "idem_dbdeskren_9876543210",
        correlationId: "cor_dbdeskren02",
      },
    );
    expect(result).toEqual({ outcome: "not-found" });
    const device = (await rows(
      "SELECT display_name FROM connect_desktop_devices WHERE device_id = $1",
      ["dev_dbdesk002"],
    ))[0];
    expect(device).toEqual({ display_name: "Renamed Desktop" });
  });

  it("revoke fences the credential generation, revokes credentials, audits, and is idempotent", async () => {
    const input = {
      kind: "desktop.action.request" as const,
      protocolVersion: "1.0" as const,
      deviceId: "dev_dbdesk002",
      action: "revoke" as const,
      idempotencyKey: "idem_dbdeskrev_0123456789",
      correlationId: "cor_dbdeskrev01",
    };
    const result = await logic.revoke(actor, input);
    expect(result.outcome).toBe("revoked");
    if (result.outcome !== "revoked") throw new Error("unreachable");
    expect(result.device).toMatchObject({ state: "revoked", credential_generation: 2 });

    const device = (await rows(
      "SELECT state, credential_generation FROM connect_desktop_devices WHERE device_id = $1",
      ["dev_dbdesk002"],
    ))[0];
    expect(device).toEqual({ state: "revoked", credential_generation: 2 });
    const credentials = await rows(
      "SELECT status, revoked_at IS NOT NULL AS stamped FROM connect_desktop_credentials WHERE device_id = $1",
      ["dev_dbdesk002"],
    );
    expect(credentials).toEqual([{ status: "revoked", stamped: true }]);
    const audit = await rows(
      "SELECT count(*)::int AS n FROM connect_desktop_audit_events WHERE device_id = $1 AND event_kind = 'desktop.revoked'",
      ["dev_dbdesk002"],
    );
    expect(audit[0].n).toBe(1);

    // Idempotent second revoke: same terminal state, no second fence bump.
    const again = await logic.revoke(actor, { ...input, correlationId: "cor_dbdeskrev02" });
    expect(again.outcome).toBe("revoked");
    const after = (await rows(
      "SELECT credential_generation FROM connect_desktop_devices WHERE device_id = $1",
      ["dev_dbdesk002"],
    ))[0];
    expect(after).toEqual({ credential_generation: 2 });
  });

  it("atomically selects exactly one owner when two authenticated accounts race", async () => {
    // Ported from test/integration/api/connect-desktops.test.ts.
    const token = "J".repeat(43);
    const input = createInput("005", token);
    await seedAccount(built, "usr_dbdeskrace2");
    const rival: ConnectDesktopActor = {
      role: "browser_session",
      userId: "usr_dbdeskrace2",
      sessionId: "ses_dbdeskrace2",
    };
    await logic.createClaim(actor, input, token);
    const [first, second] = await Promise.all([
      logic.decide(actor, decisionInput("005", "accept", "raa1")),
      logic.decide(rival, { ...decisionInput("005", "accept", "rbb2"), sessionId: rival.sessionId }),
    ]);
    expect([first.outcome, second.outcome].sort()).toEqual(["accepted", "replayed"]);
    const winner = first.outcome === "accepted" ? actor : rival;

    const device = (await rows(
      "SELECT owner_user_id, state, credential_generation FROM connect_desktop_devices WHERE device_id = $1",
      [input.deviceId],
    ))[0];
    expect(device).toEqual({
      owner_user_id: winner.userId,
      state: "active",
      credential_generation: 1,
    });
    expect(await rows(
      "SELECT device_id, generation, token_hash, status FROM connect_desktop_credentials WHERE device_id = $1",
      [input.deviceId],
    )).toEqual([{
      device_id: input.deviceId,
      generation: 1,
      token_hash: createHash("sha256").update(token).digest("hex"),
      status: "active",
    }]);
    expect(await rows(
      "SELECT actor_user_id FROM connect_desktop_audit_events WHERE device_id = $1 AND event_kind = 'claim.accepted'",
      [input.deviceId],
    )).toEqual([{ actor_user_id: winner.userId }]);
  });

  it("never persists the raw bootstrap token or short code", async () => {
    // Ported from the redaction sweeps in test/integration/api/connect-desktops.test.ts.
    const token = "K".repeat(43);
    const input = createInput("006", token);
    const result = await logic.createClaim(actor, input, token);
    if (result.outcome !== "created") throw new Error("Expected a fresh challenge");
    await logic.decide(actor, decisionInput("006", "accept"));

    const persisted = JSON.stringify(await Promise.all([
      rows("SELECT * FROM connect_desktop_devices WHERE device_id = $1", [input.deviceId]),
      rows("SELECT * FROM connect_desktop_claims WHERE claim_id = $1", [input.claimId]),
      rows("SELECT * FROM connect_desktop_credentials WHERE device_id = $1", [input.deviceId]),
      rows("SELECT * FROM connect_desktop_audit_events WHERE device_id = $1", [input.deviceId]),
    ]));
    expect(persisted).not.toContain(token);
    expect(persisted).not.toContain(result.challenge.shortCode);
    expect(persisted).toContain(createHash("sha256").update(token).digest("hex"));
  });
});
