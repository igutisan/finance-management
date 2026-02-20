# Budget API - Dockerfile
# Multi-stage Docker build for Bun runtime

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# Run in development mode with hot reload
CMD ["bun", "run", "--watch", "src/index.ts"]

# Production build (future use)
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

# Run in production mode
CMD ["bun", "run", "src/index.ts"]
