/**
 * Spawns one fresh Node process per native lifecycle case, running
 * native-case-program.mjs with the actual repo TypeScript loaded through tsx
 * and Node's native module mocks enabled for the fault seams.
 *
 * The parent passes ONLY fixture URLs and scenario data through the
 * environment; nothing from the parent process (closures, containers,
 * registry state) crosses the process boundary. DATABASE_URL is stripped so
 * the child's boot reads only what the case sets.
 *
 * The returned handle is a TestResource: own it in the case scope AFTER the
 * fixtures so scope disposal kills/awaits a still-alive child BEFORE the
 * fixture databases are dropped.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");
const PROGRAM = path.join(HERE, "native-case-program.mjs");
const BOOT_SOURCE = path.join(REPO_ROOT, "src/server/repo/boot.ts");
const RESULT_MARKER = "KAZIBEE_LIFECYCLE_RESULT ";
const COVERAGE_ROOT = path.join(REPO_ROOT, "coverage/native-lifecycle");

export type Scenario =
  | "fresh-default"
  | "existing-default"
  | "injected-swaps-default"
  | "adapter-failure"
  | "injected-first"
  | "register-failure";

export interface CaseInput {
  scenario: Scenario;
  fixtureUrlA: string;
  fixtureUrlB?: string;
  poisonUrl?: string;
  /** Upper bound for the child's whole run; must stay below the vitest testTimeout. */
  timeoutMs?: number;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  errors?: SerializedError[];
}

export interface CaseReport {
  ok: boolean;
  scenario: string;
  runtime: { node: string; pid: number };
  observations: Record<string, unknown> | null;
  error: SerializedError | null;
}

export interface CaseOutcome {
  report: CaseReport;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  /** Provenance hashes without any connection URL. */
  provenance: {
    bootSourceSha256: string;
    childNodeVersion: string;
    coverageDir: string;
    coverageProfileSha256: string[];
  };
}

export interface NativeCase {
  /** Resolves when the child has exited (or been killed on timeout). */
  outcome(): Promise<CaseOutcome>;
  /** TestResource: kills and awaits the child if still alive. Idempotent. */
  dispose(): Promise<void>;
}

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

function extractReport(stdout: string): CaseReport | undefined {
  const lines = stdout.split("\n").filter((line) => line.startsWith(RESULT_MARKER));
  const last = lines.at(-1);
  if (!last) return undefined;
  return JSON.parse(last.slice(RESULT_MARKER.length)) as CaseReport;
}

function coverageHashes(dir: string): string[] {
  const profiles = readdirSync(dir).filter((name) => name.startsWith("coverage-") && name.endsWith(".json")).sort();
  if (!profiles.length) throw new Error("Native lifecycle coverage profile missing");
  return profiles.map((name) => sha256(readFileSync(path.join(dir, name))));
}

export function spawnNativeCase(input: CaseInput): NativeCase {
  const timeoutMs = input.timeoutMs ?? 20_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs >= 30000) throw new RangeError("Child timeout must be positive and below 30 seconds");
  mkdirSync(COVERAGE_ROOT, { recursive: true });
  const coverageDir = mkdtempSync(path.join(COVERAGE_ROOT, input.scenario + "-"));
  const sourceBefore = sha256(readFileSync(BOOT_SOURCE));
  const programBefore = sha256(readFileSync(PROGRAM));

  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.DATABASE_URL;
  for (const key of Object.keys(env)) if (key.startsWith("KAZIBEE_LIFECYCLE_") || key.startsWith("VITEST")) delete env[key];
  env.KAZIBEE_LIFECYCLE_SCENARIO = input.scenario;
  env.KAZIBEE_LIFECYCLE_FIXTURE_URL_A = input.fixtureUrlA;
  if (input.fixtureUrlB) env.KAZIBEE_LIFECYCLE_FIXTURE_URL_B = input.fixtureUrlB;
  if (input.poisonUrl) env.KAZIBEE_LIFECYCLE_POISON_URL = input.poisonUrl;
  env.NODE_V8_COVERAGE = coverageDir;
  // The child must not inherit vitest's own loader options.
  delete env.NODE_OPTIONS;
  delete env.VITEST;
  delete env.VITEST_WORKER_ID;
  delete env.VITEST_POOL_ID;

  const child: ChildProcess = spawn(
    process.execPath,
    ["--import", "tsx", "--experimental-test-module-mocks", PROGRAM],
    { cwd: REPO_ROOT, env, stdio: ["ignore", "pipe", "pipe"] },
  );

  let stdout = "";
  let stderr = "";
  child.stdout!.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
  child.stderr!.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });

  let timedOut = false;
  let exited = false;
  let spawnError: Error | undefined;
  const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("error", error => { spawnError = error; });
    // close, not exit: all stdout/stderr and native coverage files must be complete.
    child.once("close", (code, signal) => { exited = true; resolve({ code, signal }); });
  });
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);

  const outcome: Promise<CaseOutcome> = exit.then(({ code, signal }) => {
    clearTimeout(timer);
    if (spawnError) throw spawnError;
    if (sha256(readFileSync(BOOT_SOURCE)) !== sourceBefore || sha256(readFileSync(PROGRAM)) !== programBefore) throw new Error("Native lifecycle input changed during the case");
    const parsed = extractReport(stdout);
    const report: CaseReport = parsed ?? {
      ok: false,
      scenario: input.scenario,
      runtime: { node: "unknown", pid: child.pid ?? -1 },
      observations: null,
      error: {
        name: timedOut ? "ChildTimeout" : "MissingReport",
        message: timedOut
          ? `child exceeded ${timeoutMs}ms and was killed`
          : `child exited (code=${code}, signal=${signal}) without a result line`,
      },
    };
    const result: CaseOutcome = {
      report,
      exitCode: code,
      signal,
      stdout,
      stderr,
      provenance: {
        bootSourceSha256: sourceBefore,
        childNodeVersion: report.runtime.node,
        coverageDir,
        coverageProfileSha256: coverageHashes(coverageDir),
      },
    };
    writeFileSync(path.join(coverageDir, "case-report.json"), JSON.stringify({ report, exitCode: code, signal, provenance: { ...result.provenance, programSha256: programBefore } }, null, 2) + "\n");
    return result;
  });
  // A rejected outcome nobody awaited must not become an unhandled rejection.
  outcome.catch(() => {});

  let disposing: Promise<void> | undefined;
  return {
    outcome: () => outcome,
    dispose() {
      if (!disposing) disposing = (async () => {
        const stoppedForCleanup = !exited;
        if (stoppedForCleanup) child.kill("SIGKILL");
        try {
          await exit;
          const result = await outcome;
          if (!stoppedForCleanup && (result.exitCode !== 0 || !result.report.ok)) {
            throw new Error("Native lifecycle process failed: " + (result.report.error?.message ?? String(result.exitCode)));
          }
        } finally { clearTimeout(timer); }
      })();
      return disposing;
    },
  };
}
