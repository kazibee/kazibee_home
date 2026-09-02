INSERT INTO swarm_machines (
  machine_id, swarm_id, task_definition_arn, region, state, token_hash, created_at
) VALUES (
  :machine_id, :swarm_id, :task_definition_arn, :region, 'launching', :token_hash, :created_at
);
