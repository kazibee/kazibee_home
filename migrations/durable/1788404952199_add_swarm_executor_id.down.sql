DROP INDEX IF EXISTS swarms_executor_idx;

ALTER TABLE swarms
  DROP COLUMN IF EXISTS executor_id;
