# Global IAM for the agent swarm (AWS Setup Runbook §2).
# Creates one launcher USER per environment (each scoped to its own SSM tree
# and its own task-definition families), plus the two ECS roles, which are
# shared by every environment.
# Deliberately NO aws_iam_access_key: launcher keys are created by an operator
# and stored in SSM by hand so the secret never enters state.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

locals {
  envs = toset(var.envs)

  # The hand-made dev user has no suffix; every other environment is suffixed.
  launcher_name = { for e in local.envs : e => e == "dev" ? "kazibee-swarm-launcher" : "kazibee-swarm-launcher-${e}" }

  task_execution_name = "kazibee-swarm-task-execution"
  task_role_name      = "kazibee-swarm-head"

  cluster_arns = [
    for r in var.regions : "arn:aws:ecs:${r}:${var.account_id}:cluster/${var.cluster_name}"
  ]
  task_definition_arns = {
    for e in local.envs : e => [
      for r in var.regions : "arn:aws:ecs:${r}:${var.account_id}:task-definition/kazibee-swarm-head-*-arm64-${e}:*"
    ]
  }
  task_arns = [
    for r in var.regions : "arn:aws:ecs:${r}:${var.account_id}:task/${var.cluster_name}/*"
  ]
}

# ---------------------------------------------------------------- 2.1 launcher (per env)

resource "aws_iam_user" "launcher" {
  for_each = local.envs
  name     = local.launcher_name[each.key]
  tags     = { Name = local.launcher_name[each.key], "kazibee:env" = each.key, "kazibee:service" = "swarm" }
}

data "aws_iam_policy_document" "launcher" {
  for_each = local.envs

  # ecs:RunTask authorizes on the task-definition ARN; the cluster is a condition key.
  # Only this environment's families are allowed, so a dev Worker cannot start prod heads.
  statement {
    sid       = "RunTask"
    actions   = ["ecs:RunTask"]
    resources = local.task_definition_arns[each.key]
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = local.cluster_arns
    }
  }

  # Tasks share the cluster; the kazibee:env tag set at RunTask time is the only
  # per-environment discriminator. Restrict stop/describe to same-env tasks.
  statement {
    sid       = "ManageTasks"
    actions   = ["ecs:StopTask", "ecs:DescribeTasks"]
    resources = local.task_arns
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = local.cluster_arns
    }
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/kazibee:env"
      values   = [each.key]
    }
  }

  statement {
    sid       = "TagOnRun"
    actions   = ["ecs:TagResource"]
    resources = local.task_arns
    condition {
      test     = "StringEquals"
      variable = "ecs:CreateAction"
      values   = ["RunTask"]
    }
  }

  statement {
    sid       = "ListTasks"
    actions   = ["ecs:ListTasks"]
    resources = ["*"]
    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = local.cluster_arns
    }
  }

  statement {
    sid     = "PassRoles"
    actions = ["iam:PassRole"]
    resources = [
      aws_iam_role.task_execution.arn,
      aws_iam_role.task.arn,
    ]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid       = "ReadSwarmParameters"
    actions   = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:*:${var.account_id}:parameter/kazibee_web/${each.key}/swarm/*"]
  }

  statement {
    sid       = "LaunchValidation"
    actions   = ["ec2:DescribeSubnets", "ec2:DescribeSecurityGroups"]
    resources = ["*"]
  }
}

resource "aws_iam_user_policy" "launcher" {
  for_each = local.envs
  name     = local.launcher_name[each.key]
  user     = aws_iam_user.launcher[each.key].name
  policy   = data.aws_iam_policy_document.launcher[each.key].json
}

# ----------------------------------------------------------- 2.2 / 2.3 roles (shared)

data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = local.task_execution_name
  description        = "ECS task execution role for Kazibee swarm heads"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
  tags               = { Name = local.task_execution_name }
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role: no permissions for milestone 1 (head talks only to the website).
resource "aws_iam_role" "task" {
  name               = local.task_role_name
  description        = "Runtime role for Kazibee swarm heads; no milestone-1 permissions"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
  tags               = { Name = local.task_role_name }
}
