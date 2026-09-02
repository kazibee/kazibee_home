account_id = "083123597636"

# Per-environment released image digest (value of /kazibee_web/<env>/swarm/image_digest).
# While an entry is null, no task definitions are registered for that env and
# the plan can reach no-op. Promote to prod by copying dev's digest here.
image_digest_by_env = {
  dev  = "sha256:a21d369b9afcb1987f6848d1b5ea1272ef05bc191c79b019d5cff971e3b57b1e" # pushed 2026-09-02 from desktop repo b5d7cc0
  prod = null
}

vpc_cidr_us_east_1 = "10.60.0.0/16"
vpc_cidr_us_east_2 = "10.61.0.0/16"

# Hand-made subnets (read from EC2 on 2026-09-02): .1 and .2, not .0 and .1.
subnet_cidrs_us_east_1 = ["10.60.1.0/24", "10.60.2.0/24"]
subnet_azs_us_east_1   = ["us-east-1a", "us-east-1b"]
subnet_cidrs_us_east_2 = ["10.61.1.0/24", "10.61.2.0/24"]
subnet_azs_us_east_2   = ["us-east-2a", "us-east-2b"]

log_retention_days = 14
