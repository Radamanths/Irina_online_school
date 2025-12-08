# Backups Stack

Terraform module that wires AWS Backup (for RDS/Postgres) and S3 lifecycle policies for media uploads.

## Usage

```hcl
module "virgo_backups" {
  source = "../../infrastructure/terraform/backups"

  aws_region                  = "eu-central-1"
  project_name                = "virgo-school"
  rds_cluster_arn             = "arn:aws:rds:eu-central-1:123456789012:cluster/virgo-prod"
  kms_key_arn                 = "arn:aws:kms:eu-central-1:123456789012:key/abc123"
  assets_bucket_name          = "virgo-media-prod"
  assets_glacier_transition_days = 45
  assets_expiration_days         = 365
}
```

Apply with:

```powershell
cd infrastructure/terraform/backups
terraform init
terraform plan -var-file=prod.tfvars
terraform apply
```

## What it does

1. Creates a dedicated AWS Backup vault + plan that snapshots the RDS cluster every day at 03:00 UTC and retains snapshots for 35 days (configurable).
2. Creates/attaches an IAM role with `AWSBackupServiceRolePolicyForBackup` so AWS Backup can manage the snapshots.
3. Registers the target RDS cluster ARN in the plan selection.
4. (Optional) Enforces an S3 lifecycle policy that moves media objects to GLACIER storage after 30 days and fully deletes them after `assets_expiration_days`.

## Inputs

See `variables.tf` for the full list. At minimum you must provide:

- `aws_region`
- `rds_cluster_arn`

`assets_bucket_name` can stay empty if lifecycle rules aren’t needed yet.

## Outputs

- `backup_vault_name`
- `backup_plan_id`
- `backup_role_arn`

Use these for monitoring or AWS Config guardrails.
