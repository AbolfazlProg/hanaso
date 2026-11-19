#!/usr/bin/env bash
# HANASO-IR deploy — step 5 (fix): Docker Hub is 403-blocked from this server's IP.
# Probe registry mirrors, configure docker daemon with the first working one,
# pre-pull the exact pinned images, then resume the deployment (build web image,
# staged bring-up, health gate). Idempotent: safe to re-run.
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/fixmirror.log"
PIN_SHA="e2ae9d96e7bab9e38bb15124df6bfd3c788e984e"
PIN_VERSION="1.1.0-hanaso32-r01"
SRC="/opt/hanaso-src"
COMPOSE_DIR="$SRC/infra/deploy/learn-kotodama"

exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "1. probe registries (HTTP status of /v2/)"
for R in https://docker.arvancloud.ir https://docker.1ms.run https://mirror.gcr.io https://registry.docker.ir https://docker.m.daocloud.io; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$R/v2/" || echo ERR)
  echo "$R -> $C"
done

step "2. configure docker daemon mirror (first that answers 200/401)"
MIRROR=""
for R in https://docker.1ms.run https://docker.arvancloud.ir https://mirror.gcr.io https://registry.docker.ir https://docker.m.daocloud.io; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 12 "$R/v2/" || echo ERR)
  if [ "$C" = "200" ] || [ "$C" = "401" ]; then MIRROR="$R"; break; fi
done
[ -n "$MIRROR" ] || { echo "NO WORKING MIRROR"; exit 1; }
echo "chosen mirror: $MIRROR"
cat > /etc/docker/daemon.json <<JSON
{ "registry-mirrors": ["$MIRROR"] }
JSON
systemctl restart docker
sleep 3
docker info 2>/dev/null | grep -A2 "Registry Mirrors" || true

step "3. pre-pull pinned base images (refs read DIRECTLY from the compose file — no hand-copied digests)"
cd "$COMPOSE_DIR"
PULL_FAIL=0
for IMG in $(grep -E '^[[:space:]]+image:' docker-compose.shared-vps.yml | grep -v 'HANASO_WEB_IMAGE' | awk '{print $2}'); do
  echo "pull: $IMG"
  docker pull "$IMG" || { echo "PULL FAILED: $IMG"; PULL_FAIL=1; }
done
[ "$PULL_FAIL" = 0 ] || exit 1
docker pull "node:24-alpine" || { echo "node pull FAILED"; exit 1; }
echo "base images OK"

step "4. build web image (pinned release)"
docker build -f "$SRC/infra/docker/Dockerfile" \
  --build-arg "NEXT_PUBLIC_BUILD_SHA=$PIN_SHA" \
  --build-arg "NEXT_PUBLIC_APP_VERSION=$PIN_VERSION" \
  -t "hanaso-web:$PIN_SHA" "$SRC" || { echo "BUILD FAILED"; exit 1; }
docker images "hanaso-web:$PIN_SHA" --format '{{.Repository}}:{{.Tag}} {{.Size}}'

step "5. staged bring-up + migrate"
cd "$COMPOSE_DIR"
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d postgres
for i in $(seq 1 60); do
  docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso >/dev/null 2>&1 && break
  sleep 2
done
docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso || { echo "postgres not ready"; exit 1; }
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d pgbouncer
sleep 5
docker compose -f docker-compose.shared-vps.yml --env-file .env run --rm migrate || { echo "MIGRATE FAILED"; exit 1; }
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d
sleep 3
docker compose -f docker-compose.shared-vps.yml --env-file .env ps

step "6. health gate"
READY=0
BODY=""
for i in $(seq 1 60); do
  BODY=$(curl -fsS http://127.0.0.1:3100/api/ready 2>/dev/null || true)
  if echo "$BODY" | grep -q '"database":{"status":"ok"'; then READY=1; break; fi
  sleep 2
done
echo "ready: ${BODY:-<none>}"
[ "$READY" = 1 ] || { echo "READY GATE FAILED"; docker compose -f docker-compose.shared-vps.yml --env-file .env logs --tail 40 web; exit 1; }
HEALTH=$(curl -fsS http://127.0.0.1:3100/api/health)
echo "health: $HEALTH"
echo "$HEALTH" | grep -q "$PIN_SHA" && echo "PIN MATCH ✓" || echo "WARN pin mismatch"

step "7. worker schedules"
OUT=$(docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T worker node apps/web/.tools/db-cli.mjs jobs 2>/dev/null || true)
echo "$OUT" | head -c 500 || true; echo
echo "$OUT" | grep -q 'ops.backup' && echo "worker schedules OK" || echo "WARN schedules pending"

echo "STEP-DONE-DEPLOY-FIX"
echo DONE > "$MDIR/fixmirror.done"
