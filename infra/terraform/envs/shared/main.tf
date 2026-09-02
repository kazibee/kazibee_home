# The single swarm root (Environment Separation doc, Option B).
#
# One set of infrastructure per region — VPC, subnets, SG, cluster, log group,
# ECR — shared by dev and prod. Per-environment: task-definition families,
# pinned image digest, launcher user, and the /kazibee_web/<env>/swarm/* SSM
# tree the Worker reads at launch time.
#
# Resource names carry NO suffix because that is how they were created by hand
# (imports.tf). If prod ever needs its own infrastructure, that becomes a new
# root (Option A) and "prod" leaves local.envs here in the same change.

locals {
  envs    = ["dev", "prod"]
  regions = ["us-east-1", "us-east-2"]
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = { "kazibee:managed-by" = "terraform" }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = { "kazibee:managed-by" = "terraform" }
  }
}

provider "aws" {
  alias  = "us_east_2"
  region = "us-east-2"
  default_tags {
    tags = { "kazibee:managed-by" = "terraform" }
  }
}

module "iam" {
  source     = "../../modules/swarm-iam"
  account_id = var.account_id
  envs       = local.envs
  regions    = local.regions
}

module "us_east_1" {
  source    = "../../modules/swarm-region"
  providers = { aws = aws.us_east_1 }

  envs                   = local.envs
  region                 = "us-east-1"
  account_id             = var.account_id
  vpc_cidr               = var.vpc_cidr_us_east_1
  subnet_cidrs           = var.subnet_cidrs_us_east_1
  subnet_azs             = var.subnet_azs_us_east_1
  execution_role_arn     = module.iam.task_execution_role_arn
  task_role_arn          = module.iam.task_role_arn
  image_digest_by_env    = var.image_digest_by_env
  ecr_primary            = true
  ecr_replication_region = "us-east-2"
  log_retention_days     = var.log_retention_days
  head_classes           = var.head_classes
}

module "us_east_2" {
  source    = "../../modules/swarm-region"
  providers = { aws = aws.us_east_2 }

  envs                 = local.envs
  region               = "us-east-2"
  account_id           = var.account_id
  vpc_cidr             = var.vpc_cidr_us_east_2
  subnet_cidrs         = var.subnet_cidrs_us_east_2
  subnet_azs           = var.subnet_azs_us_east_2
  execution_role_arn   = module.iam.task_execution_role_arn
  task_role_arn        = module.iam.task_role_arn
  image_digest_by_env  = var.image_digest_by_env
  ecr_primary          = false
  image_repository_url = "${var.account_id}.dkr.ecr.us-east-2.amazonaws.com/kazibee/swarm-head" # replicated copy
  log_retention_days   = var.log_retention_days
  head_classes         = var.head_classes
}

output "launcher_user_names" {
  value = module.iam.launcher_user_names
}

output "us_east_1" {
  value = {
    vpc_id            = module.us_east_1.vpc_id
    cluster_arn       = module.us_east_1.cluster_arn
    subnet_ids        = module.us_east_1.subnet_ids
    security_group_id = module.us_east_1.security_group_id
    log_group         = module.us_east_1.log_group
    task_definitions  = module.us_east_1.task_definition_arns
    ecr_repository    = module.us_east_1.ecr_repository_url
  }
}

output "us_east_2" {
  value = {
    vpc_id            = module.us_east_2.vpc_id
    cluster_arn       = module.us_east_2.cluster_arn
    subnet_ids        = module.us_east_2.subnet_ids
    security_group_id = module.us_east_2.security_group_id
    log_group         = module.us_east_2.log_group
    task_definitions  = module.us_east_2.task_definition_arns
  }
}
