/**
 * src/server/repo/boot.ts error and first-registration paths — explicit
 * legacy deployment-bootstrap lifecycle qualification.
 *
 * Companion to boot.test.ts. Each case owns a fresh SQLStack fixture and a
 * FRESH native Node process, so the "no default at all" branch of the
 * injected path is reachable in every case, and the fault seams are Node's
 * native ones inside the child (see helpers/native-case-program.mjs):
 *
 *   - adapter fault:  mock.module('sqlstack/adapters') makes createPgDb
 *                     throw before any Database exists; initDatabase logs
 *                     and rethrows that same error, registering nothing.
 *   - registry fault: mock.method(SqlStackDB, 'register') throws for both
 *                     register attempts; initDatabase warns and still
 *                     returns the injected connection; the old default
 *                     survives while the exported DATABASE points at the
 *                     new injected connection.
 *
 * The describe label keeps its historical "order matters" wording for stable
 * case identity, but the cases are order-INDEPENDENT now. No fake databases
 * or adapters: successful adapters are the real createPgDb over the fixture.
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
const CHILD_TIMEOUT_MS = 20_000; // below the lifecycle project's 30s testTimeout

const databaseName = (url: string) => new URL(url).pathname.slice(1);

async function runCase(
  scope: { own<T extends { dispose(): unknown }>(r: T, owner?: string): T },
  scenario: Scenario,
): Promise<{ outcome: CaseOutcome; built: TestPostgresDatabase }> {
  // Fixture first, child second: reverse-order disposal kills/awaits a
  // still-alive child BEFORE the fixture database is dropped.
  const built = scope.own(await testPostgres(BOOT_SCHEMA, ADMIN).build(), "fixture");
  const child = scope.own(
    spawnNativeCase({ scenario, fixtureUrlA: built.url, timeoutMs: CHILD_TIMEOUT_MS }),
    `native-${scenario}`,
  );
  const outcome = await child.outcome();
  expect(outcome.report.error, outcome.stderr).toBeNull();
  expect(outcome.report.ok).toBe(true);
  expect(outcome.exitCode).toBe(0);
  expect(outcome.signal).toBeNull();
  expect(outcome.provenance.bootSourceSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(outcome.provenance.childNodeVersion).toMatch(/^v\d+/);
  return { outcome, built };
}

describe("initDatabase error paths (order matters: failed fresh -> injected-first -> register failure)", () => {
  it("logs and rethrows when creating the connection fails, registering nothing", resourceCase(async (scope) => {
    const { outcome } = await runCase(scope, "adapter-failure");
    const obs = outcome.report.observations!;
    expect(obs.rejectedWithSameError).toBe(true);
    expect(obs.registryStillEmpty).toBe(true);
    expect(obs.exportedUnset).toBe(true);
  }));

  it("registers an injected connection as default when no default exists yet", resourceCase(async (scope) => {
    const { outcome, built } = await runCase(scope, "injected-first");
    const obs = outcome.report.observations!;
    expect(obs.returnedIsInjected).toBe(true);
    expect(obs.exportedIsInjected).toBe(true);
    expect(obs.defaultIsInjected).toBe(true);
    expect(obs.namedInjectedIsInjected).toBe(true);
    expect(obs.connectAccountsCount).toBe(0);
    expect(obs.connectedDatabaseName).toBe(databaseName(built.url));
  }));

  it("warns and still returns the injected connection when registration throws", resourceCase(async (scope) => {
    // Precondition (an injected default) is registered in the same process
    // before the registry's register is made to throw.
    const { outcome } = await runCase(scope, "register-failure");
    const obs = outcome.report.observations!;
    expect(obs.returnedIsSecondInjected).toBe(true);
    expect(obs.exportedIsSecondInjected).toBe(true);
    // The registry rejected the swap, so the previous default survives.
    expect(obs.defaultIsFirstInjected).toBe(true);
    expect(obs.registerAttempts).toBe(2);
    expect(obs.secondInjectedConnectAccountsCount).toBe(0);
  }));
});
