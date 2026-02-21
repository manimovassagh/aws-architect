# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/

RUN npm ci

# Copy source and build
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=apps/frontend

# Ensure public dir exists for COPY (may be empty)
RUN mkdir -p apps/frontend/public

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static apps/frontend/.next/static

COPY --from=builder /app/apps/frontend/public apps/frontend/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

CMD ["node", "apps/frontend/server.js"]
