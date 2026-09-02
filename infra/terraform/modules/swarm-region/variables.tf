variable "envs" {
  description = "Environments that share this region's infrastructure. Each gets its own task-definition families and SSM tree /kazibee_web/<env>/swarm/*."
  type        = list(string)
  default     = ["dev", "prod"]
  validation {
    condition     = alltrue([for e in var.envs : contains(["dev", "prod"], e)])
    error_message = "envs may only contain dev and prod."
  }
}

variable "region" {
  description = "Region this module instance manages (must match the provider alias passed in)."
  type        = string
}

variable "account_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "subnet_cidrs" {
  description = "CIDRs of the two public subnets. Set explicitly after import if the hand-made subnets differ from cidrsubnet(vpc_cidr, 8, i)."
  type        = list(string)
  default     = null
}

variable "subnet_azs" {
  description = "AZ names for the two public subnets. Set explicitly after import to match the hand-made subnets."
  type        = list(string)
  default     = null
}

variable "execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}

variable "image_digest_by_env" {
  description = "sha256:... digest of the released head image per environment. A null (or missing) entry means: do not register task definitions for that environment yet."
  type        = map(string)
  default     = {}
}

variable "website_origin_by_env" {
  description = "KAZIBEE_SWARM_ORIGIN per environment."
  type        = map(string)
  default = {
    dev  = "https://dev.kazibee.com"
    prod = "https://kazibee.com"
  }
}

variable "ecr_primary" {
  description = "true only in the region that owns the ECR repository (us-east-1) and replicates to the secondary."
  type        = bool
  default     = false
}

variable "ecr_replication_region" {
  description = "Secondary region that receives ECR replication (primary only)."
  type        = string
  default     = null
}

variable "image_repository_url" {
  description = "ECR repository URL to pull from when this module does not own the repo (replicated regions). null = use the repo created here (requires ecr_primary)."
  type        = string
  default     = null
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "head_classes" {
  description = "Fargate sizes per resource class (AWS Setup Runbook §6)."
  type = map(object({
    cpu    = number
    memory = number
  }))
  default = {
    head_micro  = { cpu = 256, memory = 512 }
    head_small  = { cpu = 256, memory = 1024 }
    head_medium = { cpu = 256, memory = 2048 }
    head_large  = { cpu = 512, memory = 4096 }
  }
}
