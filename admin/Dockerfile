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

# NEXT_PUBLIC_* values are inlined at build time. admin builds via `dotenv next build`,
# so the build-time config is written to a .env file the dotenv CLI loads.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_PATH=/api
ARG NEXT_PUBLIC_APP_NAME=Web app starter
ARG NEXT_PUBLIC_BASE_PATH=
ARG BASE_PATH=
ARG DOMAIN_NAME=localhost
ARG NEXT_PUBLIC_FEATURE_SHOW_USER_PASSWORDS=false
ARG HEALTH_AUTH=false
ARG HEALTH_USERNAME=
ARG HEALTH_PASSWORD=
RUN printf '%s\n' \
  "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" \
  "NEXT_PUBLIC_API_PATH=$NEXT_PUBLIC_API_PATH" \
  "NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME" \
  "NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH" \
  "BASE_PATH=$BASE_PATH" \
  "DOMAIN_NAME=$DOMAIN_NAME" \
  "NEXT_PUBLIC_FEATURE_SHOW_USER_PASSWORDS=$NEXT_PUBLIC_FEATURE_SHOW_USER_PASSWORDS" \
  "HEALTH_AUTH=$HEALTH_AUTH" \
  "HEALTH_USERNAME=$HEALTH_USERNAME" \
  "HEALTH_PASSWORD=$HEALTH_PASSWORD" \
  > .env

ENV NEXT_TELEMETRY_DISABLED=1
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
# next-i18next resolves this at runtime (serverSideTranslations) in standalone mode.
COPY --from=builder /app/next-i18next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
