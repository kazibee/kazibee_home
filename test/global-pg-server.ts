/**
 * db-tier global setup: bring up the disposable RAM-backed PostgreSQL
 * server (test/docker-compose.test-pg.yml) for sqlstack's testPostgres,
 * and shut it down when the run completes — but only if this run started
 * it (a server left running by the developer is left alone).
 *
 * Workers inherit SQLSTACK_TEST_PG_URL, so testPostgres(...) needs no
 * explicit adminUrl. Set KAZIBEE_KEEP_TEST_PG=1 to keep the container
 * across runs for a faster local loop.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const COMPOSE_FILE = path.resolve(__dirname, "docker-compose.test-pg.yml");
const PROJECT = "kazibee-test-pg";
const ADMIN_URL = "postgres://postgres:postgres@127.0.0.1:55433/postgres";

function compose(args: string[]): string {
  return execFileSync("docker", ["compose", "-p", PROJECT, "-f", COMPOSE_FILE, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

let startedByThisRun = false;

export async function setup(): Promise<void> {
  process.env.SQLSTACK_TEST_PG_URL = ADMIN_URL;
  // Keep the legacy migrated-template setup (global-setup.ts) on the
  // disposable server too — never the developer's Postgres on 5432.
  process.env.TEST_DATABASE_ADMIN_URL ??= ADMIN_URL;
  const running = compose(["ps", "--status=running", "--services"]).trim();
  if (running.includes("postgres")) return; // developer-managed server; leave it alone
  compose(["up", "-d", "--wait"]);
  startedByThisRun = true;
}

export async function teardown(): Promise<void> {
  if (!startedByThisRun) return;
  if (process.env.KAZIBEE_KEEP_TEST_PG === "1") return;
  compose(["down", "-v"]);
}
