INSERT INTO swarms (
  swarm_id, owner_user_id, env, region, resource_class, state,
  client_swarm_id, idempotency_key, executor_id, created_at
) VALUES (
  :swarm_id, :owner_user_id, :env, :region, :resource_class, 'active',
  :client_swarm_id, :idempotency_key, :executor_id, :created_at
)
ON CONFLICT DO NOTHING
RETURNING *;
