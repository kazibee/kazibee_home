# Swarm infrastructure (Terraform)

Terraform for the agent-swarm AWS resources (ECS Fargate heads). Source runbooks:
Kazidoc → `20 — Products/Kazibee Desktop/agent_swarms/03 — AWS Setup Runbook.md`,
`04 — Terraform Conversion Runbook.md`, and `05 — Environment Separation — dev vs prod.md`.
The Cloudflare Worker is the only AWS caller, so this repo owns the infra.

Principles: import, don't recreate; secrets never enter state; one region
module applied per region + one global IAM module; task definitions live here.

## Environment model (Option B — shared infra, per-env task definitions)

One physical set of infrastructure per region (VPC, subnets, SG, cluster
`kazibee-swarm`, log group `/kazibee/swarm/heads`, ECR `kazibee/swarm-head`)
is shared by dev and prod. What is per environment:

| Per env                | dev                                   | prod                                   |
| ---------------------- | ------------------------------------- | -------------------------------------- |
| task-definition family | `kazibee-swarm-head-<class>-arm64-dev` | `kazibee-swarm-head-<class>-arm64-prod` |
| image digest           | `image_digest_by_env.dev`             | `image_digest_by_env.prod`             |
| head origin            | `https://dev.kazibee.com`             | `https://kazibee.com`                  |
| launcher user          | `kazibee-swarm-launcher`              | `kazibee-swarm-launcher-prod`          |
| SSM tree               | `/kazibee_web/dev/swarm/*`            | `/kazibee_web/prod/swarm/*`            |
| log stream prefix      | `dev/<class>`                         | `prod/<class>`                         |

Each launcher may only read its own SSM tree and `ecs:RunTask` its own
task-definition families, so a dev Worker cannot start prod heads. Task
stop/describe is additionally restricted to tasks tagged `kazibee:env=<env>`
— the Worker must pass that tag on `RunTask`.

## Layout

```
bootstrap/            state bucket + lock table (local state, applied once)
modules/swarm-iam/    launcher users (one per env) + inline policies,
                      task execution role, task role
modules/swarm-region/ vpc, 2 public subnets, igw, route table, sg, ecs cluster,
                      log group, ecr (primary only) + replication,
                      per-env task definitions, per-env non-secret SSM parameters
envs/shared/          the single root; imports the hand-made resources (imports.tf)
```

Pins: Terraform `>= 1.6`, `hashicorp/aws ~> 5.60`.

## Credentials

Every command below needs a profile with IAM/EC2/ECS/ECR/Logs/SSM/S3/DynamoDB
rights. The `kazibee` profile is currently the `kazibee_deploy` user (SSM + S3
only) and **cannot** plan or apply; use an operator profile and export it as
`AWS_PROFILE`.

## 1. Bootstrap state (once)

```bash
cd infra/terraform/bootstrap
AWS_PROFILE=<operator> terraform init && terraform apply
```

If `kazibee-terraform-state` is taken: `-var state_bucket_name=kazibee-terraform-state-083123597636`
and update `bucket` in `envs/shared/backend.tf`.

## 2. Import the hand-made resources

`envs/shared/imports.tf` carries every id (read from
`/kazibee_web/{dev,prod}/swarm/<region>/*` on 2026-09-02). Decide whether the
ECR repo import block applies (remove it if the repo was never created by
hand), then:

```bash
cd infra/terraform/envs/shared
AWS_PROFILE=<operator> terraform init
AWS_PROFILE=<operator> terraform plan  -var-file=shared.tfvars   # expect: N to import, 1 add (launcher-prod user + policy), 0 destroy
AWS_PROFILE=<operator> terraform apply -var-file=shared.tfvars
AWS_PROFILE=<operator> terraform plan  -var-file=shared.tfvars   # expect: No changes.
```

Expected on the first plan and how to handle it:

- Subnet CIDR/AZ: set `subnet_cidrs_us_east_*` / `subnet_azs_us_east_*` in `shared.tfvars` to the real values.
- Dev launcher inline policy: in-place update (families now scoped to `-dev`, task tag condition added). Fine. Never accept a replace.
- SSM parameter `type` SecureString → String and tags: in-place update, expected.
- SG description / tags: make the module match reality.
- `kazibee-swarm-launcher-prod` + its policy: the only creates.

Then delete `imports.tf` and commit.

## 3. Things that stay manual

1. Bootstrap (above).
2. Launcher access keys, one per env:
   `aws iam create-access-key --user-name kazibee-swarm-launcher` (dev) /
   `--user-name kazibee-swarm-launcher-prod` (prod), then
   `aws ssm put-parameter --type SecureString --overwrite --name /kazibee_web/<env>/swarm/aws/access_key_id …`
   and `…/secret_access_key`. The prod tree currently holds a copy of the dev
   key; replace it with the prod user's key, then delete that old key from
   the prod tree only.
3. Worker secrets: `AWS_PROFILE=kazibee ./scripts/sync-secrets-from-ssm.sh` (mappings already present), then redeploy the Worker(s).
4. Image push: `desktops/demo-assistant/swarm-runtime/scripts/push.sh` builds, pushes
   `kazibee/swarm-head:<git sha>` (replicated to us-east-2) and prints the digest.
   Terraform owns `/kazibee_web/<env>/swarm/image_digest` and the task
   definitions: set `image_digest_by_env.dev` in `shared.tfvars` to that digest
   and apply (first release 2026-09-02:
   `sha256:a21d369b9afcb1987f6848d1b5ea1272ef05bc191c79b019d5cff971e3b57b1e`).
   Promote to prod by copying the same digest into `image_digest_by_env.prod`
   and applying. While an entry is `null` no task definitions (or
   `task_definition/*` SSM params) exist for that env.

## 4. If prod ever needs its own infrastructure (Option A)

Add a new root (`envs/prod`) that instantiates the same modules with
`envs = ["prod"]` and suffixed names, and remove `"prod"` from `local.envs`
in `envs/shared/main.tf` in the same change — otherwise two roots fight over
the same SSM parameter names. See Kazidoc doc 05 §5.

## 5. CI

`.github/workflows/terraform-swarm.yml`: PRs touching `infra/terraform/**` get
`fmt -check`, `validate`, and a `plan` posted as a PR comment;
`workflow_dispatch` runs `apply`. Both run under the `production` GitHub
environment because the single root owns prod's SSM tree. Its
`TERRAFORM_AWS_ACCESS_KEY_ID` / `TERRAFORM_AWS_SECRET_ACCESS_KEY` belong to the
dedicated, manually bootstrapped `infra_deploy_kazibee` user. Its inline policy
is `infra/iam/infra_deploy_kazibee-policy.json`; its key is stored in SSM under
`/kazibee_web/shared/aws/infra/` and synced to the `production` environment.
Keep these names separate from the Worker deployment's `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY`, which remain the narrow `kazibee_deploy` credentials.
