INSERT INTO swarms (
  swarm_id, owner_user_id, env, region, resource_class, state, created_at
) VALUES (
  :swarm_id, :owner_user_id, :env, :region, :resource_class, 'active', :created_at
);
