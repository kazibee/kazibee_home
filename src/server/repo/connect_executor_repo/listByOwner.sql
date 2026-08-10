SELECT * FROM connect_executors
WHERE owner_user_id = :owner_user_id
ORDER BY created_at DESC, executor_id
LIMIT :limit;
