# Bot Service (WhatsApp) - Dockerfile
# Multi-stage Docker build for Bun runtime

FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install system dependencies needed by native modules (libsignal, sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Dev dependencies (includes eslint, etc.)
FROM base AS deps-dev
COPY package.json bun.lock* ./
RUN bun install --no-frozen-lockfile

# Prod dependencies only
FROM base AS deps-prod
COPY package.json bun.lock* ./
RUN bun install --no-frozen-lockfile --production

# Development stage
FROM base AS development
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

EXPOSE 3002

CMD ["bun", "run", "--watch", "app.js"]

# Production stage  
FROM oven/bun:1.2-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps-prod /app/node_modules ./node_modules
COPY . .

EXPOSE 3002

CMD ["bun", "run", "app.js"]
