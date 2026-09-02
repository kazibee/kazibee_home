UPDATE swarms SET state = 'stopped', stopped_at = :stopped_at
WHERE swarm_id = :swarm_id AND owner_user_id = :owner_user_id;
