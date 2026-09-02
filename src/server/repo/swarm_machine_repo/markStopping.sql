UPDATE swarm_machines SET state = 'stopping' WHERE machine_id = :machine_id AND state NOT IN ('stopping', 'stopped');
