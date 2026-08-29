SELECT
  client_id, kind, client_name, redirect_uris, metadata, status, created_at, updated_at
FROM oauth_clients
WHERE client_id = :client_id
LIMIT 1;
