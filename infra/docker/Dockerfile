# HANASO web — multi-stage production image (KB ADR-003/010)
# node:24-alpine · non-root · standalone output · HEALTHCHECK on /api/health
# Build context = repository root (workspace), because of the pnpm workspace layout.

# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app ./
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_VERSION=dev
ARG NEXT_PUBLIC_BUILD_SHA=dev
ARG NEXT_PUBLIC_ENV=production
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_BUILD_SHA=$NEXT_PUBLIC_BUILD_SHA
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
RUN pnpm --filter web build

# ---- runner ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# non-root user (alpine built-in)
RUN addgroup -S app && adduser -S app -G app
# pnpm workspace standalone keeps the relative layout: apps/web/server.js
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
