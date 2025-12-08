output "backup_vault_name" {
  value       = aws_backup_vault.primary.name
  description = "Name of the AWS Backup vault"
}

output "backup_plan_id" {
  value       = aws_backup_plan.daily.id
  description = "ID of the daily backup plan"
}

output "backup_role_arn" {
  value       = aws_iam_role.backup.arn
  description = "IAM role used by AWS Backup"
}
