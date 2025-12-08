# Virgo Platform Launch Guide

This guide describes how to bootstrap a new environment (local, staging, prod) for the marketing site, LMS, and admin panel.

## 1. Prerequisites

- Node.js 20 LTS + pnpm 9
- Docker (for NestJS API + Postgres in local dev)
- AWS credentials with access to S3 + RDS (staging/prod)
- Stripe + YooKassa test accounts
- Supabase project for auth (students) and admin JWT issuer

## 2. Repository bootstrap

```powershell
pnpm install
pnpm turbo run build --filter=...
```

- `pnpm install` must run from repo root to populate workspaces (`apps/*`, `packages/*`).
- Copy `.env.example` to `.env.local` for each app. Minimum variables:
  - `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - `DATABASE_URL`
  - `STRIPE_SECRET_KEY`, `YOO_KASSA_SECRET`
  - `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

## 3. Local services

```powershell
# Start database + redis
docker compose -f infrastructure/docker-compose.yml up -d postgres redis

# Run API
pnpm --filter @virgo/api dev

# Run admin
pnpm --filter @virgo/admin dev

# Run marketing site
pnpm --filter @virgo/web dev
```

- Prisma migrations are executed via `pnpm --filter @virgo/api prisma migrate deploy` after DB is up.
- Seed data lives in `apps/api/prisma/seed.ts` and can be triggered with `pnpm --filter @virgo/api db:seed`.

## 4. Staging deployment checklist

1. Merge feature branch to `develop` to trigger GitHub Action pipelines (lint, test, build).
2. Terraform applies infrastructure changes (ECS service counts, Redis sizing, S3 buckets).
3. Deploy sequence:
   - API container tagged `staging-<sha>` pushed to ECR and rolled out via ECS blue/green.
   - Next.js apps deployed to Vercel staging project via `vercel deploy --prebuilt`.
4. Run smoke tests (`pnpm --filter @virgo/api test:e2e`) pointing to staging URLs.
5. QA verifies admin CRUD flows, payments in test mode, and Search Console sitemap updates.

## 5. Production launch checklist

- Freeze `develop` and fast-forward `main` once staging is validated.
- Rotate secrets in AWS Secrets Manager and update Vercel env vars.
- Bump Stripe + YooKassa credentials to live mode; ensure webhooks are pointed to new endpoints.
- Execute `pnpm turbo run build --filter=@virgo/web...` for prod to ensure deterministic assets.
- After deployment:
  - Run Datadog dashboard to watch error rates.
  - Validate admin uploads (S3) and payment webhooks.
  - Create first backup snapshot manually as a point-in-time anchor.

## 6. Rollback

- API: redeploy previous ECS task definition revision.
- Web/Admin: `vercel rollback <deployment-id>`.
- Database: use RDS PITR (point in time restore) and repoint ECS via Secrets Manager.

Keep this guide close to `docs/documentation` and update after every major infra change.
