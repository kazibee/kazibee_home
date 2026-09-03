SELECT *
FROM swarms
WHERE owner_user_id = :owner_user_id AND idempotency_key = :idempotency_key;
