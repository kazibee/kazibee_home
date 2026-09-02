SELECT * FROM swarm_machines WHERE swarm_id = :swarm_id AND state <> 'stopped' ORDER BY created_at ASC;
