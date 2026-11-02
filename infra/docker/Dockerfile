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

# ---- pg toolchain source (pinned to the exact same digest the VPS compose runs) ----
# postgres:18-alpine @ 2026-10-26 — keep in sync with docker-compose.shared-vps.yml
FROM postgres:18-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5 AS pg

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
# M0-10 DB layer: self-contained ops tools (worker + db-cli bundles), the committed
# migrations, the dialogue content YAML (seed source) — same major as postgres:18.
COPY --from=build --chown=app:app /app/apps/web/.tools ./apps/web/.tools
COPY --from=build --chown=app:app /app/apps/web/db/migrations ./apps/web/db/migrations
COPY --from=build --chown=app:app /app/apps/web/src/modules/dialogue/content ./apps/web/src/modules/dialogue/content
COPY --from=build --chown=app:app /app/apps/web/src/modules/audio/content ./apps/web/src/modules/audio/content

# pg_dump/pg_restore/psql/pg_isready for the nightly backup job — binaries AND their
# whole shared-library closure come from the SAME postgres image the stack runs
# (guaranteed major 18). PR #74 review r2/S2: node:24-alpine does not ship libicu/
# liblz4/libzstd/libxml2 that the postgres binaries link, so the libs are copied into
# a private prefix and every tool is a tiny wrapper invoking the postgres image's own
# musl loader with --library-path — fully self-contained, zero dependency on the node
# base image's libs. The build FAILS if any tool cannot execute (gate below).
COPY --from=pg /usr/local/bin/pg_dump /usr/local/bin/pg_restore /usr/local/bin/psql /usr/local/bin/pg_isready /opt/pg/bin/
COPY --from=pg /lib /opt/pg/lib-root/
COPY --from=pg /usr/lib /opt/pg/lib-usr/
COPY --from=pg /usr/local/lib /opt/pg/lib-local/
RUN set -eux; \
    mkdir -p /opt/pg/lib; \
    for d in /opt/pg/lib-root /opt/pg/lib-usr /opt/pg/lib-local; do \
      find "$d" -maxdepth 1 -name '*.so*' -exec cp -L '{}' /opt/pg/lib/ \; ; \
    done; \
    rm -rf /opt/pg/lib-root /opt/pg/lib-usr /opt/pg/lib-local; \
    for t in pg_dump pg_restore psql pg_isready; do \
      printf '#!/bin/sh\nexec /opt/pg/lib/ld-musl-x86_64.so.1 --library-path /opt/pg/lib /opt/pg/bin/%s "$@"\n' "$t" \
        > "/usr/local/bin/$t"; \
      chmod +x "/usr/local/bin/$t"; \
    done; \
    # BUILD-TIME GATE (review r2/S2): the shipped toolchain must actually execute —
    # a missing shared library fails the build here instead of the first nightly
    # backup on the VPS. The compose smoke job in CI additionally runs a REAL
    # dump+restore drill inside this image.
    pg_dump --version; \
    pg_restore --version; \
    psql --version; \
    pg_isready --version
RUN mkdir -p /backups && chown app:app /backups
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
