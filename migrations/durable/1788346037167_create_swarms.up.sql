-- Agent Swarms (Phase 3): swarms owned by a website user and the Fargate
-- machines launched for them. Machine tokens are stored as hashes only.
CREATE TABLE swarms (
  swarm_id        TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL,
  env             TEXT NOT NULL CHECK (env IN ('dev', 'prod')),
  region          TEXT NOT NULL,
  resource_class  TEXT NOT NULL,
  state           TEXT NOT NULL CHECK (state IN ('active', 'stopping', 'stopped')),
  created_at      TEXT NOT NULL,
  stopped_at      TEXT NULL
);

CREATE INDEX swarms_owner_idx ON swarms (owner_user_id, created_at DESC);

CREATE TABLE swarm_machines (
  machine_id          TEXT PRIMARY KEY,
  swarm_id            TEXT NOT NULL REFERENCES swarms (swarm_id),
  ecs_task_arn        TEXT NULL,
  task_definition_arn TEXT NOT NULL,
  region              TEXT NOT NULL,
  state               TEXT NOT NULL CHECK (state IN ('launching', 'running', 'stopping', 'stopped', 'failed')),
  token_hash          TEXT NOT NULL,
  token_generation    INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  last_seen_at        TEXT NULL,
  stopped_at          TEXT NULL,
  failure             TEXT NULL
);

CREATE INDEX swarm_machines_swarm_idx ON swarm_machines (swarm_id, created_at ASC);
CREATE INDEX swarm_machines_token_hash_idx ON swarm_machines (token_hash);
