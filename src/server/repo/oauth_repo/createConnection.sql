INSERT INTO oauth_connections (
  connection_id, user_id, client_id, approved_scope, allow_shell, allow_web,
  status, created_at, revoked_at
)
VALUES (
  :connection_id, :user_id, :client_id, :approved_scope, :allow_shell, :allow_web,
  :status, :created_at, :revoked_at
);
