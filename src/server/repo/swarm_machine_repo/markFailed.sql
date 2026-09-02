UPDATE swarm_machines SET state = 'failed', failure = :failure, stopped_at = :stopped_at WHERE machine_id = :machine_id;
