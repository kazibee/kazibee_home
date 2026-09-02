UPDATE swarms SET state = 'stopping'
WHERE swarm_id = :swarm_id AND owner_user_id = :owner_user_id AND state = 'active';
