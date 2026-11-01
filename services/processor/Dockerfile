# ==============================================================================
# DeploySentinel Event Processor Service — Hardened Multi-Stage Dockerfile
# Base: Node 22 Alpine (Minimal attack surface)
# ==============================================================================

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# --- Step 1: Install workspace dependencies ---
FROM base AS deps
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/db/package.json ./packages/db/
COPY packages/generated/package.json ./packages/generated/
COPY packages/shared/package.json ./packages/shared/
COPY packages/telemetry/package.json ./packages/telemetry/
COPY packages/ai/package.json ./packages/ai/
COPY services/api/package.json ./services/api/
COPY services/processor/package.json ./services/processor/
COPY services/investigator/package.json ./services/investigator/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# --- Step 2: Build packages and Processor service ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/services ./services
COPY --from=deps /app/apps ./apps
COPY . .

ENV NODE_ENV=production
RUN pnpm turbo run build --filter=@deploysentinel/processor...

# --- Step 3: Hardened non-root runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HEALTH_PORT=4001

# Non-root user with minimal privilege
RUN addgroup --system --gid 10001 deploysentinel && \
    adduser --system --uid 10001 --ingroup deploysentinel deploysentinel

COPY --from=builder --chown=deploysentinel:deploysentinel /app/node_modules ./node_modules
COPY --from=builder --chown=deploysentinel:deploysentinel /app/packages ./packages
COPY --from=builder --chown=deploysentinel:deploysentinel /app/services/processor/dist ./services/processor/dist
COPY --from=builder --chown=deploysentinel:deploysentinel /app/services/processor/package.json ./services/processor/package.json
COPY --from=builder --chown=deploysentinel:deploysentinel /app/package.json ./package.json

USER deploysentinel

EXPOSE 4001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4001/health/live || exit 1

CMD ["node", "services/processor/dist/index.js"]
