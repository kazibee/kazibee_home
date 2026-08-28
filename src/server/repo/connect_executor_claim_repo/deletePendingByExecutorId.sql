DELETE FROM connect_executor_claims
WHERE executor_id = :executor_id
  AND status = 'pending';
