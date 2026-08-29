UPDATE oauth_connections
SET status = 'revoked', revoked_at = :revoked_at
WHERE status = 'active'
  AND user_id = :user_id
  AND connection_id <> :connection_id
  AND client_id IN (
    SELECT client_id FROM oauth_clients WHERE client_name = :client_name
  );
