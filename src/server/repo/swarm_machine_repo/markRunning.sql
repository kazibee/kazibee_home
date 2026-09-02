UPDATE swarm_machines SET state = 'running', ecs_task_arn = :ecs_task_arn WHERE machine_id = :machine_id;
