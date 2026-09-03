-- The Desktop executor that created the swarm; the swarm MCP relay routes
-- member tool calls to it. NULL for swarms created from a browser session.
ALTER TABLE swarms
  ADD COLUMN executor_id TEXT NULL;

CREATE INDEX swarms_executor_idx ON swarms (executor_id) WHERE executor_id IS NOT NULL;
