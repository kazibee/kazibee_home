UPDATE connect_executors
SET state = 'revoked', credential_generation = credential_generation + 1, updated_at = :updated_at
WHERE executor_id = :executor_id AND owner_user_id = :owner_user_id AND state = 'active';
