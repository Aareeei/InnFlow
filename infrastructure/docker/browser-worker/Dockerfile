# syntax=docker/dockerfile:1

FROM node:20-bookworm AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/browser-worker/package.json ./apps/browser-worker/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/storage/package.json ./packages/storage/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/workflows/package.json ./packages/workflows/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @innflow/database db:generate
RUN pnpm --filter @innflow/browser-worker build

FROM mcr.microsoft.com/playwright:v1.49.1-noble AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=builder --chown=pwuser:pwuser /app/apps/browser-worker/dist ./dist
COPY --from=builder --chown=pwuser:pwuser /app/apps/browser-worker/package.json ./
COPY --from=builder --chown=pwuser:pwuser /app/node_modules ./node_modules
COPY --from=builder --chown=pwuser:pwuser /app/packages ./packages

USER pwuser
CMD ["node", "dist/main.js"]
