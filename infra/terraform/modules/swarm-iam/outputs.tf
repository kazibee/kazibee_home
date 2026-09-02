# { env => launcher user name }
output "launcher_user_names" {
  value = { for e, u in aws_iam_user.launcher : e => u.name }
}

output "task_execution_role_arn" {
  value = aws_iam_role.task_execution.arn
}

output "task_role_arn" {
  value = aws_iam_role.task.arn
}
