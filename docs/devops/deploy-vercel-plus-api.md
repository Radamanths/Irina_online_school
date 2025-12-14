# Deploy: Vercel (web + admin) + API without Docker

This repo is a pnpm workspace (Turbo monorepo):
- Frontends: `apps/web` (public site), `apps/admin` (admin panel) — Next.js 15
- Backend: `apps/api` — NestJS + Prisma

Recommended deployment:
- `apps/web` and `apps/admin` on **Vercel**
- `apps/api` on **Render** or **Railway** as a plain Node service (no Docker)

## 1) Deploy `apps/web` to Vercel

Create a new Vercel Project from this repository.

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Env Vars (minimum):
  - `NEXT_PUBLIC_API_BASE` = `https://api.your-domain.com`
  - Optional (for a link to admin from the site):
    - `NEXT_PUBLIC_ADMIN_URL` = `https://admin.your-domain.com`
    - `NEXT_PUBLIC_ENABLE_ADMIN_LINK` = `true`

Notes:
- This repo includes `apps/web/vercel.json` that sets install/build commands for pnpm-workspaces.

## 2) Deploy `apps/admin` to Vercel

Create a second Vercel Project from the same repository.

- Root Directory: `apps/admin`
- Framework Preset: Next.js
- Env Vars (minimum):
  - `NEXT_PUBLIC_API_BASE` = `https://api.your-domain.com`

Notes:
- This repo includes `apps/admin/vercel.json` that sets install/build commands for pnpm-workspaces.

## 3) Deploy `apps/api` to Render (no Docker)

This repo includes a `render.yaml` blueprint for the API.

### Option A — Blueprint (recommended)

- In Render: **New** → **Blueprint** → select the repo
- Set secret env vars in the created service:
  - `DATABASE_URL`
  - `CORS_ORIGINS` (comma-separated list of allowed origins)
    - Example: `https://your-domain.com,https://admin.your-domain.com`

Render will also set `PORT` automatically; the API already respects `process.env.PORT`.

### Option B — Manual service

- Type: Web Service
- Environment: Node
- Build:
  - `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @virgo/config run build && pnpm --filter @virgo/api run build`
- Start:
  - `pnpm --filter @virgo/api start:prod`
- Health check path:
  - `/health`

## 4) CORS for production

By default, the API allows only localhost.

For production set either:
- `CORS_ORIGINS` to your real domains (recommended), e.g.
  - `https://your-domain.com,https://admin.your-domain.com`

Optionally allow Vercel preview deployments:
- `CORS_ALLOW_VERCEL_PREVIEWS=true`

## 5) Database migrations (Prisma)

On production environments, use:
- `pnpm --filter @virgo/api prisma:migrate:deploy`

How to run it depends on your host:
- Render: run it as a one-off command in Shell, or as a separate Release step.
- Railway: run it as a deploy command, or a one-off command.
