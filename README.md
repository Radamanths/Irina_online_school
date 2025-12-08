# Virgo School Platform

Monorepo for the new Virgo School experience: multilingual marketing site, LMS, admin panel, and supporting infrastructure.

## Stack Overview

- **Frontend**: Next.js 15 (App Router, TypeScript, RU/EN i18n) located in `apps/web`.
- **Admin Panel**: Next.js SPA with protected routes in `apps/admin`.
- **API**: NestJS 11 + Prisma + PostgreSQL in `apps/api`.
- **Shared packages**: Design system and config helpers in `packages/`.
- **Infrastructure**: Terraform modules, Dockerfiles, GitHub Actions workflows, and migration scripts.

## Repository Layout

```
apps/
  web/        # public site + student dashboard
  admin/      # dedicated admin SPA
  api/        # backend services
packages/
  ui/         # design system + Storybook stories
  config/     # shared tsconfig/jest config
infrastructure/
  terraform/  # IaC blueprints
migrations/   # data + content migration scripts
admin-manual/ # ops + content team guides
```

## Getting Started

1. **Install dependencies**
  ```powershell
  corepack enable
  pnpm install
  ```
2. **Configure environment vars**
  ```powershell
  Copy-Item apps/api/.env.example apps/api/.env
  Copy-Item apps/web/.env.example apps/web/.env.local
  ```
  Update `DATABASE_URL` in `apps/api/.env` if your local Postgres connection string differs.
    The marketing site also reads `GOOGLE_SITE_VERIFICATION` from `apps/web/.env.local` to render the Search Console `<meta name="google-site-verification" ...>` tag (leave it blank for local work).
3. **Start dev services**
   ```powershell
   pnpm dev
   ```
   This runs web (port 3000), admin (3001), and API (4000) via turborepo dev script.

### Optional Python tooling

`palette_extract.py` under the repo root is the only Python helper and it just needs Pillow (install with `pip install pillow` if you are *not* using the bundled `.venv`). There is no `requirements.txt` for the web platform itself.

### Using Neon for Postgres

Neon provides a managed Postgres instance that works out of the box with Prisma.

1. Create a project at [Neon](https://neon.tech) and note the connection string that looks like
  `postgresql://USER:PASSWORD@ep-sunny-123456.us-east-1.aws.neon.tech/neondb?sslmode=require`.
2. Paste this value into `apps/api/.env` as `DATABASE_URL` (keep the `?sslmode=require` suffix so TLS stays enabled).
3. Apply the schema locally:
  ```powershell
  pnpm --filter @virgo/api prisma:migrate
  ```
4. Start the stack with `pnpm dev`; the API will now talk to your Neon database.

## Documentation

- `admin-manual/` — operations handbook and CMS workflows.
- `docs/` — brand assets (already provided) and future design references.
- `docs/search-console.md` — пошаговая инструкция по верификации домена и проверке ссылок в Google Search Console.
- `apps/admin/README.md` — запуск панелей и описание текущих разделов админки.
- `tools/wp-migrate.ts` — WordPress export migrator.

### Docker images

Каждое приложение теперь имеет собственный многоступенчатый Dockerfile:

- Маркетинг-сайт: `docker build -f apps/web/Dockerfile -t virgo-web .` → `docker run --rm -p 3000:3000 --env-file apps/web/.env.local virgo-web`.
- Админ-панель: `docker build -f apps/admin/Dockerfile -t virgo-admin .` → `docker run --rm -p 3001:3001 virgo-admin`.
- API: `docker build -f apps/api/Dockerfile -t virgo-api .` → `docker run --rm -p 4000:4000 --env-file apps/api/.env virgo-api`.

Все Dockerfile используют pnpm 9, поэтому перед сборкой убедитесь, что `corepack enable` выполнен на локальной машине/CI. `.dockerignore` исключает артефакты `node_modules`, `.next`, `.turbo` и бренд-бандлы, чтобы контекст оставался компактным.

### WordPress migration CLI

Normalize legacy WP exports to a structured JSON snapshot ready for Prisma seeds:

```powershell
# Dry-run summary directly from the WP REST API
pnpm migrate:dry-run --source https://legacy.virgo.school --type pages --limit 50

# Process a local JSON dump and write migrations/wp/wp-export-<timestamp>.json
pnpm migrate:run --input ./backups/wp-pages.json --slug-prefix marketing
```

Flags are documented inline in `tools/wp-migrate.ts` and support HTTP basic auth (`--username/--password`), locale defaults, and slug prefixes.

### WordPress import CLI

Transform the JSON snapshot into database records for the `Translation` table:

```powershell
# Preview keys that would be written (no DB changes)
pnpm migrate:import --input ./migrations/wp/wp-export-1731970000000.json --dry-run

# Import a single locale into Postgres
pnpm migrate:import --input ./migrations/wp/wp-export-1731970000000.json --locale en
```

Each WP page produces keys like `pages.about.title`, `pages.about.content`, and `pages.about.seo.title` with RU/EN payloads, so the marketing site can read them through `/translations/{locale}`.

### Translations API

- `GET /translations/{locale}` — aggregates all rows from the Prisma `Translation` table into a nested dictionary used by `next-intl`. When the database is empty, the endpoint falls back to the static JSON dictionaries in `apps/web/messages` so the marketing site stays functional.

### Legacy redirects

- `apps/web/next.config.mjs` contains the permanent redirect map for legacy WordPress slugs (`/programs/...`).
- Update the `legacyCourseSlugs` list when new courses replace older slugs, and keep `supportedLocales` in sync with the i18n config so both RU/EN paths redirect correctly.
- Each change deploys alongside the Next.js app (CloudFront/edge rules can mirror the same list if needed).

## Status

This repository currently contains scaffolding and reference implementations per the technical plan. Each folder explains setup details in its own README.
