# ───────────────────────── Build stage ─────────────────────────
FROM node:22-slim AS builder

# OpenSSL is required by Prisma's engine/tooling
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (including dev) for the build
COPY package*.json ./
RUN npm ci

# Copy source and generate the Prisma client, then compile TypeScript
COPY . .
RUN npm run build

# Remove dev dependencies so they are not carried into the runtime image
RUN npm prune --omit=dev

# ──────────────────────── Runtime stage ────────────────────────
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules and compiled output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/openapi.json ./openapi.json

# Run as the unprivileged user that the node image provides
USER node

EXPOSE 3000

# Basic container healthcheck against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
