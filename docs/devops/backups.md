# Backup Strategy

Goal: automated daily RDS snapshots + lifecycle management for the media bucket.

## Terraform module

`infrastructure/terraform/backups` provisions:

1. AWS Backup Vault + Plan (`daily` rule at 03:00 UTC, retention configurable).
2. IAM role with `AWSBackupServiceRolePolicyForBackup`.
3. Backup selection that targets the production RDS cluster/instance by ARN.
4. Optional S3 lifecycle policy that moves cold media objects to GLACIER and deletes them after a retention period.

### Quick start

```powershell
cd infrastructure/terraform/backups
copy prod.tfvars.example prod.tfvars
# edit with your ARNs/bucket names
terraform init
terraform plan -var-file=prod.tfvars
terraform apply
```

Example `prod.tfvars`:

```hcl
aws_region          = "eu-central-1"
rds_cluster_arn     = "arn:aws:rds:eu-central-1:123456789012:cluster/virgo-prod"
project_name        = "virgo-school"
aws_profile         = "virgo-prod"
assets_bucket_name  = "virgo-media-prod"
assets_glacier_transition_days = 45
assets_expiration_days        = 365
```

> `kms_key_arn` is optional but recommended so vault contents stay encrypted under a customer-managed key.

## Verification checklist

- `aws backup list-backup-plan-summaries` shows the plan and next run time.
- CloudWatch Logs for `AWSBackupManagedResource` contain success messages.
- RDS console shows snapshots named `daily-rds-snapshots`.
- `aws s3api get-bucket-lifecycle-configuration --bucket <assets bucket>` reflects the GLACIER transition rule.

## On-call handbook

1. To restore, pick the latest recovery point under the vault -> "Restore" -> target a temporary cluster, then migrate data.
2. For media rollbacks, fetch the object from GLACIER or re-upload from your artifact store.
3. Update `backup_retention_days` during promo windows if you need longer lookback.

## Future improvements

- Add `aws_backup_plan` rules for DynamoDB/ElastiCache when those services appear.
- Wire plan + vault metrics into Prometheus (available via `AWS/Backup`).
- Attach SNS notifications for failed backup jobs.
