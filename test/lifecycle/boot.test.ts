/**
 * src/server/repo/boot.ts initDatabase contract against real PostgreSQL —
 * explicit legacy deployment-bootstrap lifecycle qualification.
 *
 * Every case owns a fresh SQLStack fixture database (or two) and a FRESH
 * native Node process (test/lifecycle/helpers/native-case-program.mjs) that
 * imports the actual boot module and the real sqlstack adapters. The
 * process-global SqlStackDB registry therefore starts empty in every case,
 * and each case builds its own precondition (for example "a default already
 * exists") inside its own process instead of relying on a previous case.
 *
 * The describe label keeps its historical "order matters" wording so the
 * case identities are stable, but the cases are now order-INDEPENDENT: the
 * native processes are independent of the selected test ordering.
 *
 * Only fixture URLs and scenario data cross the process boundary (via env);
 * a COUNT over the fixture's connect_accounts table proves the child's
 * connection is a real one to the database the URL named. The parent owns
 * fixture disposal; the child never drops databases.
 */
import { describe, it, expect } from "vitest";
import { resourceCase } from "@noego/testing";
import { testPostgres, DEFAULT_ADMIN_URL, type TestPostgresDatabase } from "sqlstack/testing";
import { spawnNativeCase, type CaseOutcome, type Scenario } from "./helpers/process-driver";

const BOOT_SCHEMA = {
  version: 1,
  dialect: "postgres",
  sql: ["CREATE TABLE connect_accounts (id TEXT PRIMARY KEY);"],
};
const ADMIN = { adminUrl: process.env.SQLSTACK_TEST_PG_URL ?? DEFAULT_ADMIN_URL };
const POISON_URL = "postgres://nobody:nope@127.0.0.1:1/does_not_exist";
const CHILD_TIMEOUT_MS = 20_000; // below the lifecycle project's 30s testTimeout

const databaseName = (url: string) => new URL(url).pathname.slice(1);

async function runCase(
  scope: { own<T extends { dispose(): unknown }>(r: T, owner?: string): T },
  scenario: Scenario,
  fixtures: 1 | 2,
  extra: { poisonUrl?: string } = {},
): Promise<{ outcome: CaseOutcome; a: TestPostgresDatabase; b?: TestPostgresDatabase }> {
  // Fixtures first, child second: reverse-order disposal kills/awaits a
  // still-alive child BEFORE the fixture databases are dropped.
  const a = scope.own(await testPostgres(BOOT_SCHEMA, ADMIN).build(), "fixture-a");
  const b = fixtures === 2 ? scope.own(await testPostgres(BOOT_SCHEMA, ADMIN).build(), "fixture-b") : undefined;
  const child = scope.own(
    spawnNativeCase({ scenario, fixtureUrlA: a.url, fixtureUrlB: b?.url, timeoutMs: CHILD_TIMEOUT_MS, ...extra }),
    `native-${scenario}`,
  );
  const outcome = await child.outcome();
  // Surface the child's own assertion failure (with its stderr) before anything else.
  expect(outcome.report.error, outcome.stderr).toBeNull();
  expect(outcome.report.ok).toBe(true);
  expect(outcome.exitCode).toBe(0);
  expect(outcome.signal).toBeNull();
  expect(outcome.provenance.bootSourceSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(outcome.provenance.childNodeVersion).toMatch(/^v\d+/);
  return { outcome, a, b };
}

describe("initDatabase (order matters: fresh -> existing default -> injected)", () => {
  it("with no default registered, creates a connection from DATABASE_URL and registers it as default", resourceCase(async (scope) => {
    const { outcome, a } = await runCase(scope, "fresh-default", 1);
    const obs = outcome.report.observations!;
    expect(obs.dialect).toBe("postgres");
    expect(obs.defaultIsBootCreated).toBe(true);
    expect(obs.primaryIsBootCreated).toBe(true);
    expect(obs.exportedIsBootCreated).toBe(true);
    // It is a live connection to the database DATABASE_URL named.
    expect(obs.connectAccountsCount).toBe(0);
    expect(obs.connectedDatabaseName).toBe(databaseName(a.url));
  }));

  it("with a default already registered, returns it without creating a new connection", resourceCase(async (scope) => {
    // The default is created IN this case's own process; DATABASE_URL is then
    // poisoned so any attempt to connect again would fail.
    const { outcome, a } = await runCase(scope, "existing-default", 1, { poisonUrl: POISON_URL });
    const obs = outcome.report.observations!;
    expect(obs.secondIsFirst).toBe(true);
    expect(obs.exportedIsFirst).toBe(true);
    expect(obs.defaultIsFirst).toBe(true);
    expect(obs.connectAccountsCount).toBe(0);
    expect(obs.connectedDatabaseName).toBe(databaseName(a.url));
  }));

  it("with an injected connection, registers it as the new default and returns it", resourceCase(async (scope) => {
    // Precondition (a boot-created default over fixture A) is built in the
    // same process; the injected adapter targets fixture B.
    const { outcome, a, b } = await runCase(scope, "injected-swaps-default", 2);
    const obs = outcome.report.observations!;
    expect(obs.returnedIsInjected).toBe(true);
    expect(obs.exportedIsInjected).toBe(true);
    expect(obs.defaultIsInjected).toBe(true);
    expect(obs.namedInjectedIsInjected).toBe(true);
    // Re-injecting the connection that is already the default is a no-op
    // (the current === database branch) and still returns it.
    expect(obs.reinjectionReturnedSame).toBe(true);
    expect(obs.injectedConnectedDatabaseName).toBe(databaseName(b!.url));
    expect(obs.bootCreatedConnectedDatabaseName).toBe(databaseName(a.url));
    expect(obs.injectedConnectAccountsCount).toBe(0);
  }));
});
