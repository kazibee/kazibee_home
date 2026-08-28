import path from "node:path";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { MigrationRunnerFactory } from "@noego/proper";
import type { TestProject } from "vitest/node";
import type { PostgresTestRunInfo } from "./helpers/postgres-test-types";

const DEFAULT_ADMIN_URL = "postgres://noego:noego_dev@localhost:5432/postgres";

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe PostgreSQL database identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function databaseUrl(adminUrl: string, databaseName: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function withAdmin(
  adminUrl: string,
  operation: (client: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await operation(client);
  } finally {
    await client.end();
  }
}

async function migrate(configFile: string, databaseUrlValue: string): Promise<void> {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrlValue;
  const runner = await MigrationRunnerFactory.create(configFile);
  try {
    const pending = await runner.getPendingMigrations();
    await runner.migrate(pending, true);
  } finally {
    await runner.close();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
}

async function dropRunDatabases(adminUrl: string, databasePrefix: string): Promise<void> {
  await withAdmin(adminUrl, async (client) => {
    const result = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY datname DESC",
      [`${databasePrefix}%`],
    );
    for (const { datname } of result.rows) {
      await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(datname)} WITH (FORCE)`);
    }
  });
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? DEFAULT_ADMIN_URL;
  const runId = `${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  const databasePrefix = `kazibee_test_${runId}_`;
  const durableTemplate = `${databasePrefix}durable_template`;
  const fullTemplate = `${databasePrefix}full_template`;
  const root = process.cwd();

  try {
    await withAdmin(adminUrl, async (client) => {
      await client.query(`CREATE DATABASE ${quoteIdentifier(durableTemplate)}`);
    });
    await migrate(
      path.resolve(root, "proper.durable.json"),
      databaseUrl(adminUrl, durableTemplate),
    );

    await withAdmin(adminUrl, async (client) => {
      await client.query(
        `CREATE DATABASE ${quoteIdentifier(fullTemplate)} TEMPLATE ${quoteIdentifier(durableTemplate)}`,
      );
    });
    await migrate(
      path.resolve(root, "proper.relay.json"),
      databaseUrl(adminUrl, fullTemplate),
    );
  } catch (error) {
    await dropRunDatabases(adminUrl, databasePrefix);
    throw error;
  }

  const runInfo: PostgresTestRunInfo = {
    runId,
    databasePrefix,
    adminUrl,
    durableTemplate,
    fullTemplate,
  };
  project.provide("postgresTestRun", runInfo);

  return async () => {
    await dropRunDatabases(adminUrl, databasePrefix);
  };
}
