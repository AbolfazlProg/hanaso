#!/usr/bin/env bash
# HANASO-IR deploy — step 6: resume staged bring-up with the 1-core override
# (image already built in step 05; postgres/pgbouncer images pulled).
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/resume.log"
PIN_SHA="e2ae9d96e7bab9e38bb15124df6bfd3c788e984e"
SRC="/opt/hanaso-src"
COMPOSE_DIR="$SRC/infra/deploy/learn-kotodama"
# the server checkout is pinned to the PRODUCT commit (pre-dates this deploy dir), so
# fetch the override straight from the deploy branch instead of copying from $SRC
OV_URL="https://raw.githubusercontent.com/AbolfazlProg/hanaso/66366ed/ops/deploy-hanaso-ir/docker-compose.hanaso-ir-1core.yml"
curl -fsSL "$OV_URL" -o "$COMPOSE_DIR/docker-compose.hanaso-ir-1core.yml" || { echo "override fetch FAILED"; exit 1; }
echo "override in place: $(grep -c 'cpus' "$COMPOSE_DIR/docker-compose.hanaso-ir-1core.yml") cpus entries"

CF="-f docker-compose.shared-vps.yml -f docker-compose.hanaso-ir-1core.yml"

exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "1. config sanity (merged)"
cd "$COMPOSE_DIR"
docker compose $CF --env-file .env config --services

step "2. postgres"
docker compose $CF --env-file .env up -d postgres || { echo "postgres up FAILED"; exit 1; }
for i in $(seq 1 60); do
  docker compose $CF --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso >/dev/null 2>&1 && break
  sleep 2
done
docker compose $CF --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso || { echo "postgres not ready"; exit 1; }
echo "postgres ready"

step "3. pgbouncer"
docker compose $CF --env-file .env up -d pgbouncer
sleep 6
docker compose $CF --env-file .env ps pgbouncer || true

step "4. migrate + seed (direct connection)"
docker compose $CF --env-file .env run --rm migrate || { echo "MIGRATE FAILED"; exit 1; }

step "5. web + worker"
docker compose $CF --env-file .env up -d || { echo "up FAILED"; exit 1; }
sleep 3
docker compose $CF --env-file .env ps

step "6. health gate (loopback 3100)"
READY=0; BODY=""
for i in $(seq 1 90); do
  BODY=$(curl -fsS http://127.0.0.1:3100/api/ready 2>/dev/null || true)
  if echo "$BODY" | grep -q '"database":{"status":"ok"'; then READY=1; break; fi
  sleep 2
done
echo "ready: ${BODY:-<none>}"
[ "$READY" = 1 ] || { echo "READY GATE FAILED"; docker compose $CF --env-file .env logs --tail 50 web; exit 1; }
HEALTH=$(curl -fsS http://127.0.0.1:3100/api/health)
echo "health: $HEALTH"
echo "$HEALTH" | grep -q "$PIN_SHA" && echo "PIN MATCH ✓" || echo "WARN pin mismatch"

step "7. worker schedules (pg-boss)"
OUT=""
for i in $(seq 1 30); do
  OUT=$(docker compose $CF --env-file .env exec -T worker node apps/web/.tools/db-cli.mjs jobs 2>/dev/null || true)
  echo "$OUT" | grep -q 'ops.backup' && break
  sleep 2
done
echo "$OUT" | head -c 500 || true; echo
echo "$OUT" | grep -q 'ops.backup' && echo "worker schedules OK" || echo "WARN schedules pending"

step "8. boot persistence check"
systemctl is-enabled docker
docker compose $CF --env-file .env ps --format '{{.Name}} {{.State}}' || true

echo "STEP-DONE-RESUME"
echo DONE > "$MDIR/resume.done"
