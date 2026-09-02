variable "account_id" {
  type = string
}

variable "image_digest_by_env" {
  description = "sha256:... of the released head image per environment (mirrors /kazibee_web/<env>/swarm/image_digest). A null entry registers no task definitions for that environment."
  type        = map(string)
  default = {
    dev  = null
    prod = null
  }
}

variable "vpc_cidr_us_east_1" {
  type    = string
  default = "10.60.0.0/16"
}

variable "vpc_cidr_us_east_2" {
  type    = string
  default = "10.61.0.0/16"
}

variable "subnet_cidrs_us_east_1" {
  type    = list(string)
  default = null
}

variable "subnet_azs_us_east_1" {
  type    = list(string)
  default = null
}

variable "subnet_cidrs_us_east_2" {
  type    = list(string)
  default = null
}

variable "subnet_azs_us_east_2" {
  type    = list(string)
  default = null
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "head_classes" {
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
