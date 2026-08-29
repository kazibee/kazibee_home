-- CTE + final SELECT so the driver returns rows as an array: the query
-- runner only applies the @Single row shape to SELECT/CTE results, and a
-- bare UPDATE ... RETURNING comes back as a write result instead of rows.
WITH consumed AS (
  UPDATE oauth_codes
  SET consumed_at = :consumed_at
  WHERE code_hash = :code_hash
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING *
)
SELECT * FROM consumed;
