DELETE FROM oauth_connection_executors
WHERE connection_id = :connection_id
  AND executor_id = :executor_id;
