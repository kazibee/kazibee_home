export type PostgresTestProfile = "durable" | "full";

export interface PostgresTestRunInfo {
  runId: string;
  databasePrefix: string;
  adminUrl: string;
  durableTemplate: string;
  fullTemplate: string;
}

declare module "vitest" {
  export interface ProvidedContext {
    postgresTestRun: PostgresTestRunInfo;
  }
}
