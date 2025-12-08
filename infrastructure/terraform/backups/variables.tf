variable "aws_region" {
  description = "AWS region that hosts the RDS cluster and S3 bucket"
  type        = string
}

variable "aws_profile" {
  description = "Optional shared credentials profile"
  type        = string
  default     = null
}

variable "project_name" {
  description = "Prefix for created resources"
  type        = string
  default     = "virgo-platform"
}

variable "rds_cluster_arn" {
  description = "ARN of the production RDS cluster or instance to protect"
  type        = string
}

variable "kms_key_arn" {
  description = "Optional KMS key ARN for encrypting the backup vault"
  type        = string
  default     = null
}

variable "backup_retention_days" {
  description = "How many days to keep automated RDS snapshots"
  type        = number
  default     = 35
}

variable "assets_bucket_name" {
  description = "Name of the S3 bucket with uploaded media"
  type        = string
  default     = ""
}

variable "assets_glacier_transition_days" {
  description = "When to move cold media to GLACIER"
  type        = number
  default     = 30
}

variable "assets_expiration_days" {
  description = "Delete objects entirely after N days (0 disables deletion)"
  type        = number
  default     = 0
}
