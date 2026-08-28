#!/usr/bin/env bash
# Sync app secrets from AWS SSM Parameter Store into GitHub Actions secrets.
#
# SSM is the source of truth; GitHub environment secrets are the delivery
# mechanism the deploy workflows read (no AWS calls at deploy time). Run this
# after rotating anything in SSM:
#
#   AWS_PROFILE=kazibee ./scripts/sync-secrets-from-ssm.sh
#
# Mapping (add rows as new secrets appear):
#   /kazibee_web/dev/google/client_id      -> env dev        GOOGLE_CLIENT_ID
#   /kazibee_web/dev/google/client_secret  -> env dev        GOOGLE_CLIENT_SECRET
#   /kazibee_web/prod/google/client_id     -> env production GOOGLE_CLIENT_ID
#   /kazibee_web/prod/google/client_secret -> env production GOOGLE_CLIENT_SECRET
#
# Requires: aws CLI with SSM read access, gh CLI authenticated with admin on
# the repo. Values never touch disk or logs; they pipe straight to gh.
set -euo pipefail

REPO="kazibee/kazibee_home"
REGION="${AWS_REGION:-us-east-1}"

# "ssm-path github-environment secret-name" per line.
MAPPINGS=(
  "/kazibee_web/dev/google/client_id       dev        GOOGLE_CLIENT_ID"
  "/kazibee_web/dev/google/client_secret   dev        GOOGLE_CLIENT_SECRET"
  "/kazibee_web/prod/google/client_id      production GOOGLE_CLIENT_ID"
  "/kazibee_web/prod/google/client_secret  production GOOGLE_CLIENT_SECRET"
)

for mapping in "${MAPPINGS[@]}"; do
  read -r ssm_path environment secret_name <<<"$mapping"
  aws ssm get-parameter \
    --region "$REGION" \
    --name "$ssm_path" \
    --with-decryption \
    --query Parameter.Value \
    --output text \
    | gh secret set "$secret_name" --env "$environment" --repo "$REPO"
  echo "synced $ssm_path -> $environment/$secret_name"
done
