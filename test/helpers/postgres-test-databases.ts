import { inject } from "vitest";
import { Client, Pool } from "pg";
import { createPgDb, type Database } from "sqlstack";
import type { PostgresTestProfile, PostgresTestRunInfo } from "./postgres-test-types";

let databaseCounter = 0;

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

async function dropDatabase(adminUrl: string, databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}

export interface PostgresTestDatabase {
  name: string;
  url: string;
  profile: PostgresTestProfile;
  database: Database;
  pool: Pool;
  close(): Promise<void>;
}

export function getPostgresTestRun(): PostgresTestRunInfo {
  return inject("postgresTestRun");
}

export async function createPostgresTestDatabase(
  profile: PostgresTestProfile = "full",
): Promise<PostgresTestDatabase> {
  const run = getPostgresTestRun();
  const template = profile === "durable" ? run.durableTemplate : run.fullTemplate;
  const counter = ++databaseCounter;
  const name = `${run.databasePrefix}w${process.pid}_${counter}`.slice(0, 63);
  const url = databaseUrl(run.adminUrl, name);

  const admin = new Client({ connectionString: run.adminUrl });
  await admin.connect();
  try {
    await admin.query(
      `CREATE DATABASE ${quoteIdentifier(name)} TEMPLATE ${quoteIdentifier(template)}`,
    );
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: url, max: 4 });
  const database = createPgDb(pool);
  let closed = false;

  return {
    name,
    url,
    profile,
    database,
    pool,
    async close() {
      if (closed) return;
      closed = true;
      await database.close();
      await pool.end();
      await dropDatabase(run.adminUrl, name);
    },
  };
}
