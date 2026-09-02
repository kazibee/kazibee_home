output "cluster_arn" {
  value = aws_ecs_cluster.swarm.arn
}

output "vpc_id" {
  value = aws_vpc.swarm.id
}

output "subnet_ids" {
  value = aws_subnet.public[*].id
}

output "security_group_id" {
  value = aws_security_group.head.id
}

output "log_group" {
  value = aws_cloudwatch_log_group.heads.name
}

# { env => { class => task definition ARN } }
output "task_definition_arns" {
  value = {
    for e in var.envs : e => {
      for k, td in aws_ecs_task_definition.head : local.head_tasks[k].class => td.arn if local.head_tasks[k].env == e
    }
  }
}

output "ecr_repository_url" {
  value = var.ecr_primary ? aws_ecr_repository.head[0].repository_url : null
}
