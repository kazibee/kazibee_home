UPDATE oauth_connection_executors
SET scope = 'read'
WHERE connection_id = :connection_id
  AND scope = 'read_write';
