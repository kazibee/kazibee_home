UPDATE swarm_machines SET state = 'stopped', stopped_at = :stopped_at WHERE machine_id = :machine_id;
