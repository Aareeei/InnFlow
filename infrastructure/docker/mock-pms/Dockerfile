# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/mock-pms/package.json ./apps/mock-pms/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json ./packages/domain/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p apps/mock-pms/public
RUN pnpm --filter @innflow/database db:generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @innflow/mock-pms build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/mock-pms/public ./apps/mock-pms/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/mock-pms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/mock-pms/.next/static ./apps/mock-pms/.next/static
USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "apps/mock-pms/server.js"]
