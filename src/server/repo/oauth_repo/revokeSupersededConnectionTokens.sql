UPDATE oauth_tokens
SET status = 'revoked', revoked_at = :revoked_at
WHERE status = 'active'
  AND connection_id IN (
    SELECT connection.connection_id
    FROM oauth_connections AS connection
    JOIN oauth_clients AS client ON client.client_id = connection.client_id
    WHERE connection.user_id = :user_id
      AND connection.status = 'active'
      AND connection.connection_id <> :connection_id
      AND client.client_name = :client_name
  );
