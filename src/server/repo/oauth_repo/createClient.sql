INSERT INTO oauth_clients (
  client_id, kind, client_name, redirect_uris, metadata, status, created_at, updated_at
)
VALUES (
  :client_id, :kind, :client_name, CAST(:redirect_uris AS JSONB),
  CAST(:metadata AS JSONB), :status, :created_at, :updated_at
);
