terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  backend "s3" {
    bucket         = "kazibee-terraform-state"
    key            = "swarm/shared/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "kazibee-terraform-locks"
    encrypt        = true
  }
}
