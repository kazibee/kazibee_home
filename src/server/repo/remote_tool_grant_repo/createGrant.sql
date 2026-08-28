INSERT INTO remote_tool_grants (
  grant_id, owner_user_id, executor_id, workspace_id, scopes, token_hash, state, created_at, expires_at
) VALUES (
  :grant_id, :owner_user_id, :executor_id, :workspace_id, :scopes, :token_hash, 'active', :created_at, :expires_at
);
