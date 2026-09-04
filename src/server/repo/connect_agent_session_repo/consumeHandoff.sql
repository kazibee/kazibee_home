-- CTE + final SELECT so the driver returns rows as an array: the query
-- runner only applies the @Single row shape to SELECT/CTE results, and a
-- bare UPDATE ... RETURNING comes back as a write result instead of rows
-- (which made the consumed handoff look truthy with no columns, so the
-- follow-up session insert failed with "Parameter :user_id is undefined").
WITH consumed AS (
  UPDATE connect_agent_handoffs
  SET consumed_at = :consumed_at
  WHERE token_hash = :token_hash
    AND consumed_at IS NULL
    AND expires_at > :consumed_at
  RETURNING *
)
SELECT * FROM consumed;
