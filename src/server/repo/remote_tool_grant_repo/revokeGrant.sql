UPDATE remote_tool_grants SET state = 'revoked', revoked_at = :revoked_at
WHERE grant_id = :grant_id AND owner_user_id = :owner_user_id AND state = 'active';
