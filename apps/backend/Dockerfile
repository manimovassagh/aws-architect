# ── Stage 1: Install + Build ────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

RUN npm ci

COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/
COPY tsconfig.base.json ./

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/backend

# ── Stage 2: Production runtime ────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/backend/dist apps/backend/dist

EXPOSE 3001

CMD ["node", "apps/backend/dist/index.js"]
