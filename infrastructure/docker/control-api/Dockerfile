# syntax=docker/dockerfile:1

FROM node:20-bookworm AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/control-api/package.json ./apps/control-api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/storage/package.json ./packages/storage/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/workflows/package.json ./packages/workflows/
COPY packages/ai/package.json ./packages/ai/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @innflow/database db:generate
RUN pnpm --filter @innflow/control-api build

FROM node:20-bookworm AS runner
RUN groupadd --system --gid 1001 innflow && useradd --system --uid 1001 --gid innflow innflow
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=innflow:innflow /app/node_modules ./node_modules
COPY --from=builder --chown=innflow:innflow /app/packages ./packages
COPY --from=builder --chown=innflow:innflow /app/apps/control-api/dist ./apps/control-api/dist
COPY --from=builder --chown=innflow:innflow /app/apps/control-api/package.json ./apps/control-api/package.json
COPY --from=builder --chown=innflow:innflow /app/apps/control-api/node_modules ./apps/control-api/node_modules

USER innflow
WORKDIR /app/apps/control-api
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "dist/main.js"]
