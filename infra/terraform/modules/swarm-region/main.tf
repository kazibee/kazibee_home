# Per-region swarm infrastructure (AWS Setup Runbook §3–§6 + §2.5 non-secret SSM).
# Instantiate once per region with a region-scoped provider alias.
#
# Environment model (Environment Separation doc, Option B): the VPC, subnets,
# SG, cluster, log group and ECR repo are SHARED by every environment in
# var.envs. What differs per environment is the task-definition family
# (kazibee-swarm-head-<class>-arm64-<env>), the pinned image digest, the
# KAZIBEE_SWARM_ORIGIN the head talks to, and the SSM tree
# /kazibee_web/<env>/swarm/* the Worker reads at launch time.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  cluster_name   = "kazibee-swarm"
  sg_name        = "kazibee-swarm-head"
  log_group_name = "/kazibee/swarm/heads"
  ecr_repo_name  = "kazibee/swarm-head"

  envs       = toset(var.envs)
  ssm_prefix = { for e in local.envs : e => "/kazibee_web/${e}/swarm" }

  subnet_cidrs = coalesce(var.subnet_cidrs, [cidrsubnet(var.vpc_cidr, 8, 0), cidrsubnet(var.vpc_cidr, 8, 1)])
  subnet_azs   = coalesce(var.subnet_azs, slice(data.aws_availability_zones.available.names, 0, 2))

  image_repository_url = var.ecr_primary ? aws_ecr_repository.head[0].repository_url : var.image_repository_url

  # Environments that have a released digest register task definitions.
  released_envs = { for e in local.envs : e => var.image_digest_by_env[e] if lookup(var.image_digest_by_env, e, null) != null }

  # "<env>/<class>" → { env, class, cpu, memory } for every released env × class.
  head_tasks = {
    for pair in setproduct(keys(local.released_envs), keys(var.head_classes)) :
    "${pair[0]}/${pair[1]}" => {
      env    = pair[0]
      class  = pair[1]
      cpu    = var.head_classes[pair[1]].cpu
      memory = var.head_classes[pair[1]].memory
    }
  }

  tags = {
    "kazibee:env"     = "shared"
    "kazibee:service" = "swarm"
  }
  env_tags = { for e in local.envs : e => merge(local.tags, { "kazibee:env" = e }) }
}

# ------------------------------------------------------------ §3 networking (shared)

resource "aws_vpc" "swarm" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(local.tags, { Name = local.cluster_name })
}

resource "aws_internet_gateway" "swarm" {
  vpc_id = aws_vpc.swarm.id
  tags   = merge(local.tags, { Name = local.cluster_name })
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.swarm.id
  cidr_block              = local.subnet_cidrs[count.index]
  availability_zone       = local.subnet_azs[count.index]
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${local.cluster_name}-public-${count.index}" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.swarm.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.swarm.id
  }
  tags = merge(local.tags, { Name = "${local.cluster_name}-public" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Ingress: none. Egress: HTTPS + DNS only. Inline rules so a single import
# of the SG (sg-...) captures the hand-made rules.
resource "aws_security_group" "head" {
  name        = local.sg_name
  description = "Kazibee swarm heads: no ingress, HTTPS and DNS egress only" # must match the hand-made SG: description forces replacement
  vpc_id      = aws_vpc.swarm.id

  # No rule descriptions: the hand-made rules have none, and adding them would
  # revoke + re-authorize every egress rule on the first apply.
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.tags, { Name = local.sg_name })
}

# ------------------------------------------------------------ §4 cluster + logs (shared)

resource "aws_ecs_cluster" "swarm" {
  name = local.cluster_name
  tags = merge(local.tags, { Name = local.cluster_name })
}

resource "aws_ecs_cluster_capacity_providers" "swarm" {
  cluster_name       = aws_ecs_cluster.swarm.name
  capacity_providers = ["FARGATE"]
}

# Log streams are prefixed "<env>/<class>" so shared-group logs stay separable.
resource "aws_cloudwatch_log_group" "heads" {
  name              = local.log_group_name
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

# ------------------------------------------------------------ §5 ECR (primary only)

resource "aws_ecr_repository" "head" {
  count                = var.ecr_primary ? 1 : 0
  name                 = local.ecr_repo_name
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = local.tags
}

# Account-level resource (one per account); lives in the primary region.
resource "aws_ecr_replication_configuration" "head" {
  count = var.ecr_primary && var.ecr_replication_region != null ? 1 : 0
  replication_configuration {
    rule {
      destination {
        region      = var.ecr_replication_region
        registry_id = var.account_id
      }
      repository_filter {
        filter      = local.ecr_repo_name
        filter_type = "PREFIX_MATCH"
      }
    }
  }
}

# ------------------------------------------------------------ §6 task definitions (per env)

resource "aws_ecs_task_definition" "head" {
  for_each = local.head_tasks

  family                   = "kazibee-swarm-head-${each.value.class}-arm64-${each.value.env}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(each.value.cpu)
  memory                   = tostring(each.value.memory)
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  volume {
    name = "run-kazibee"
  }
  volume {
    name = "provider-home"
  }

  container_definitions = jsonencode([
    {
      name                   = "head"
      image                  = "${local.image_repository_url}@${local.released_envs[each.value.env]}"
      essential              = true
      user                   = "10001:10001"
      readonlyRootFilesystem = true
      stopTimeout            = 30
      portMappings           = []
      # ECS echoes these empty collections back; declaring them keeps the plan a no-op.
      mountPoints    = []
      systemControls = []
      volumesFrom    = []
      linuxParameters = {
        initProcessEnabled = true
        capabilities       = { add = [], drop = ["ALL"] }
        tmpfs = [
          { containerPath = "/run/kazibee", size = 64, mountOptions = ["rw", "nosuid", "nodev", "noexec"] },
          { containerPath = "/provider-home", size = 256, mountOptions = ["rw", "nosuid", "nodev"] },
        ]
      }
      environment = [
        { name = "KAZIBEE_SWARM_ORIGIN", value = var.website_origin_by_env[each.value.env] },
        { name = "KAZIBEE_SWARM_ENV", value = each.value.env },
        { name = "KAZIBEE_HEAD_CLASS", value = each.value.class },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.heads.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "${each.value.env}/${each.value.class}"
        }
      }
    }
  ])

  tags = local.env_tags[each.value.env]
}

# ------------------------------------------------------------ §2.5 non-secret SSM (per env)

# One copy of every non-secret parameter per environment tree so each Worker
# reads only /kazibee_web/<its env>/swarm/*. Type String on purpose: none of
# these are secret. (The hand-made ones are SecureString; import + apply
# converts them in place.) SSM parameters are regional: this module's provider
# alias decides which region's parameter store they land in.

resource "aws_ssm_parameter" "cluster_arn" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/cluster_arn"
  type     = "String"
  value    = aws_ecs_cluster.swarm.arn
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "subnet_ids" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/subnet_ids"
  type     = "String"
  value    = join(",", aws_subnet.public[*].id)
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "security_group_id" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/security_group_id"
  type     = "String"
  value    = aws_security_group.head.id
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "log_group" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/log_group"
  type     = "String"
  value    = aws_cloudwatch_log_group.heads.name
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "vpc_id" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/vpc_id"
  type     = "String"
  value    = aws_vpc.swarm.id
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "internet_gateway_id" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/internet_gateway_id"
  type     = "String"
  value    = aws_internet_gateway.swarm.id
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "route_table_id" {
  for_each = local.envs
  name     = "${local.ssm_prefix[each.key]}/${var.region}/route_table_id"
  type     = "String"
  value    = aws_route_table.public.id
  tags     = local.env_tags[each.key]
}

resource "aws_ssm_parameter" "task_definition" {
  for_each = aws_ecs_task_definition.head
  name     = "${local.ssm_prefix[local.head_tasks[each.key].env]}/${var.region}/task_definition/${local.head_tasks[each.key].class}"
  type     = "String"
  value    = each.value.arn
  tags     = local.env_tags[local.head_tasks[each.key].env]
}

# Region-less parameter; written once, from the primary region only.
resource "aws_ssm_parameter" "image_digest" {
  for_each = var.ecr_primary ? local.released_envs : {}
  name     = "${local.ssm_prefix[each.key]}/image_digest"
  type     = "String"
  value    = each.value
  tags     = local.env_tags[each.key]
}
