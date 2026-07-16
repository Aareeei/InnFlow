# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/workflow-worker/package.json ./apps/workflow-worker/
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
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @innflow/database db:generate
RUN pnpm --filter @innflow/workflow-worker build

FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 innflow && adduser --system --uid 1001 --ingroup innflow innflow
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=innflow:innflow /app/apps/workflow-worker/dist ./dist
COPY --from=builder --chown=innflow:innflow /app/apps/workflow-worker/package.json ./
COPY --from=builder --chown=innflow:innflow /app/node_modules ./node_modules
COPY --from=builder --chown=innflow:innflow /app/packages ./packages

USER innflow
CMD ["node", "dist/main.js"]
