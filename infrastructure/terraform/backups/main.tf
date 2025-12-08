terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

locals {
  project_name = var.project_name != "" ? var.project_name : "virgo-platform"
}

resource "aws_backup_vault" "primary" {
  name        = "${local.project_name}-backup-vault"
  kms_key_arn = var.kms_key_arn
}

resource "aws_backup_plan" "daily" {
  name = "${local.project_name}-daily-plan"

  rule {
    rule_name         = "daily-rds-snapshots"
    target_vault_name = aws_backup_vault.primary.name
    schedule          = "cron(0 3 * * ? *)" # 03:00 UTC daily

    lifecycle {
      delete_after = var.backup_retention_days
    }
  }
}

data "aws_iam_policy_document" "backup_assume" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["backup.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "backup" {
  name               = "${local.project_name}-backup-role"
  assume_role_policy = data.aws_iam_policy_document.backup_assume.json
}

resource "aws_iam_role_policy_attachment" "backup_service" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_backup_selection" "rds_cluster" {
  iam_role_arn  = aws_iam_role.backup.arn
  plan_id       = aws_backup_plan.daily.id
  selection_name = "${local.project_name}-rds"

  resources = [var.rds_cluster_arn]
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  count = var.assets_bucket_name == "" ? 0 : 1

  bucket = var.assets_bucket_name

  rule {
    id     = "assets-lifecycle"
    status = "Enabled"

    filter {} # apply to entire bucket

    transition {
      days          = var.assets_glacier_transition_days
      storage_class = "GLACIER"
    }

    expiration {
      days = var.assets_expiration_days
    }
  }
}
