# Install dependencies only when needed
FROM node:20-slim AS deps
# openssl is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:20-slim AS builder
# openssl must be present so `prisma generate` detects the correct engine target.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client before tsc (the build imports @prisma/client types).
RUN yarn prisma:generate
RUN yarn build

# Production image
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nodejs

# Bring in the built app, node_modules, prisma schema + migrations and package.json.
COPY --from=builder --chown=nodejs:nodejs /app/ ./

# Writable data dir for the SQLite DB, sessions and logs (also a volume mount point).
RUN mkdir -p /app/data/database /app/data/logs /app/data/sessions \
  && chown -R nodejs:nodejs /app/data \
  && chmod +x docker-entrypoint.sh

USER nodejs

EXPOSE 3000

# Invoke via sh so a missing exec bit (e.g. Windows checkout) doesn't break startup.
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
