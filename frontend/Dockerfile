# Install dependencies only when needed
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so they must be present now.
# The prebuild step (middleware-envs-generator.mjs) and next.config cleanEnv read process.env.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=Web app starter
ARG NEXT_PUBLIC_BASE_PATH=
ARG BASE_PATH=
ARG ADMIN_URL=
ARG NEXT_PUBLIC_PROTECTED_ROUTES=
ARG DOMAIN_NAME=localhost
ARG HEALTH_AUTH=false
ARG HEALTH_USERNAME=
ARG HEALTH_PASSWORD=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    BASE_PATH=$BASE_PATH \
    ADMIN_URL=$ADMIN_URL \
    NEXT_PUBLIC_PROTECTED_ROUTES=$NEXT_PUBLIC_PROTECTED_ROUTES \
    DOMAIN_NAME=$DOMAIN_NAME \
    HEALTH_AUTH=$HEALTH_AUTH \
    HEALTH_USERNAME=$HEALTH_USERNAME \
    HEALTH_PASSWORD=$HEALTH_PASSWORD \
    NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# Production image — Next standalone output
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
