# ── Stage 1: Install + Build ────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/

RUN npm ci

COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/frontend

# ── Stage 2: Production runtime ────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public apps/frontend/public 2>/dev/null || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/frontend/server.js"]
