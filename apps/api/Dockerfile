# syntax=docker/dockerfile:1

FROM node:20-bookworm AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @virgo/config run build
RUN pnpm --filter @virgo/api build
RUN pnpm deploy --filter @virgo/api --prod /workspace/deploy/api

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

COPY --from=builder /workspace/deploy/api ./
COPY --from=builder /workspace/apps/api/dist ./dist
COPY --from=builder /workspace/apps/api/prisma ./prisma

USER nestjs
EXPOSE 4000
CMD ["node", "dist/main.js"]
