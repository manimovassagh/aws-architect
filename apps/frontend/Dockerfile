# ── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

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

# ── Stage 2: Serve static files with nginx ───────────────────
FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1
