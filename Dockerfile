# ============================================================================
# CORPER WEE — PRODUCTION MULTI-STAGE DOCKERFILE
# Serves the Express + WebSocket API, Player Web App, and Admin Portal
# ============================================================================

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN npm ci

COPY . .

# Compile both main player bundle (index.html) and admin portal bundle (admin.html)
RUN npm run lint && npm run build

# Build standalone admin-portal SPA artifact as well for separate CDN/Nginx hosting
WORKDIR /app/admin-portal
RUN npm ci && npm run build

# ----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S corperwee && adduser -S corperwee -G corperwee

COPY package.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/metadata.json ./metadata.json

RUN chown -R corperwee:corperwee /app
USER corperwee

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health/live >/dev/null || exit 1

CMD ["npx", "tsx", "server.ts"]
