variable "account_id" {
  description = "AWS account id that owns the swarm."
  type        = string
}

variable "envs" {
  description = "Environments that get a launcher user. Each user may only read /kazibee_web/<env>/swarm/* and run kazibee-swarm-head-*-arm64-<env> task definitions."
  type        = list(string)
  default     = ["dev", "prod"]
  validation {
    condition     = alltrue([for e in var.envs : contains(["dev", "prod"], e)])
    error_message = "envs may only contain dev and prod."
  }
}

variable "regions" {
  description = "Regions that host the swarm cluster (used to scope the launcher policies)."
  type        = list(string)
}

variable "cluster_name" {
  description = "ECS cluster name (same in every region, shared by every environment)."
  type        = string
  default     = "kazibee-swarm"
}
