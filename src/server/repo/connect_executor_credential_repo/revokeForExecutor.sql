UPDATE connect_executor_credentials
SET status = 'revoked', revoked_at = :revoked_at
WHERE executor_id = :executor_id AND status = 'active';
