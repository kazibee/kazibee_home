UPDATE connect_executors
SET display_name = :display_name, updated_at = :updated_at
WHERE executor_id = :executor_id AND owner_user_id = :owner_user_id AND state = 'active';
