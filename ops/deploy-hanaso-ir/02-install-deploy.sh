#!/usr/bin/env bash
# HANASO-IR deploy — step 2: install prerequisites + full production deployment.
# Runs ON the new server via the web terminal (mission-mandated path).
#
# Secrets policy: POSTGRES_PASSWORD + HANASO_SESSION_SECRET are generated ON the
# server with openssl and written ONLY to /opt/hanaso-src/infra/deploy/learn-kotodama/.env
# (git-ignored). Nothing secret ever passes through GitHub or these logs.
#
# Release pin (evidence-based): e2ae9d96e7bab9e38bb15124df6bfd3c788e984e
#   = 1.1.0-hanaso32-r01 — first FULLY green CI (run 43868581700: verify 858/858,
#   compose smoke with real backup/restore drill, image build), contains the
#   production remediation fixes; product diff vs current main tip = docs/scripts only.
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/deploy.log"
PIN_SHA="e2ae9d96e7bab9e38bb15124df6bfd3c788e984e"
PIN_VERSION="1.1.0-hanaso32-r01"
SRC="/opt/hanaso-src"
COMPOSE_DIR="$SRC/infra/deploy/learn-kotodama"
ENV_FILE="$COMPOSE_DIR/.env"

exec > >(tee -a "$LOG") 2>&1

step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "0. pre-flight"
if [ ! -d "$MDIR" ]; then echo "MDIR missing — run 01-recon first"; exit 1; fi
echo "server: $(hostname)  cores: $(nproc)  mem: $(free -m | awk 'NR==2{print $2}')MB  disk-root: $(df -h / | awk 'NR==2{print $4}') free"

step "0b. swap safety (build needs headroom)"
if [ "$(free -m | awk 'NR==2{print $2}')" -lt 4000 ] && [ -z "$(swapon --show 2>/dev/null)" ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "2G swapfile created+enabled"
else
  echo "swap ok or enough RAM — skipped"
fi
swapon --show || true

step "1. apt: docker + compose v2 + helpers"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 ca-certificates curl git openssl jq >/dev/null
systemctl enable --now docker
docker --version
docker compose version

step "2. source checkout at pinned release"
if [ ! -d "$SRC/.git" ]; then
  git clone --quiet https://github.com/AbolfazlProg/hanaso "$SRC"
fi
git -C "$SRC" fetch --quiet origin
git -C "$SRC" checkout --quiet --force "$PIN_SHA"
echo "checked out: $(git -C "$SRC" rev-parse --short HEAD)  subject: $(git -C "$SRC" log -1 --format=%s | head -c 80)"

step "3. .env with server-side generated secrets (never in git)"
if [ -f "$ENV_FILE" ]; then
  echo ".env already exists — keeping (idempotent re-run)"
else
  PG_PW="$(openssl rand -hex 24)"
  SESS="$(openssl rand -hex 32)"
  umask 077
  cat > "$ENV_FILE" <<ENV
HANASO_WEB_IMAGE=hanaso-web:$PIN_SHA
HANASO_SESSION_SECRET=$SESS
POSTGRES_USER=hanaso
POSTGRES_PASSWORD=$PG_PW
POSTGRES_DB=hanaso
ENV
  umask 022
  echo ".env written ($(stat -c%s "$ENV_FILE") bytes, mode $(stat -c%a "$ENV_FILE"))"
fi

step "4. production image (pull GHCR if public, else build from pinned source)"
if docker pull "ghcr.io/abolfazlprog/hanaso:$PIN_SHA" >/dev/null 2>&1; then
  docker tag "ghcr.io/abolfazlprog/hanaso:$PIN_SHA" "hanaso-web:$PIN_SHA"
  echo "image pulled from GHCR"
else
  echo "GHCR pull not available anonymously — building locally (same command as CI)"
  docker build -f "$SRC/infra/docker/Dockerfile" \
    --build-arg "NEXT_PUBLIC_BUILD_SHA=$PIN_SHA" \
    --build-arg "NEXT_PUBLIC_APP_VERSION=$PIN_VERSION" \
    -t "hanaso-web:$PIN_SHA" "$SRC"
fi
docker images "hanaso-web:$PIN_SHA" --format '{{.Repository}}:{{.Tag}} {{.Size}} {{.CreatedSince}}'

step "5. database bring-up (staged: postgres → pgbouncer → migrate → all)"
cd "$COMPOSE_DIR"
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d postgres
for i in $(seq 1 60); do
  docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso >/dev/null 2>&1 && break
  sleep 2
done
docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T postgres pg_isready -U hanaso -d hanaso || { echo "postgres never became ready"; exit 1; }
echo "postgres ready"
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d pgbouncer
sleep 5
docker compose -f docker-compose.shared-vps.yml --env-file .env run --rm migrate
echo "migrate exit: $?"

step "6. web + worker up"
docker compose -f docker-compose.shared-vps.yml --env-file .env up -d
sleep 3
docker compose -f docker-compose.shared-vps.yml --env-file .env ps

step "7. health gate (loopback 3100)"
READY=0
for i in $(seq 1 60); do
  BODY=$(curl -fsS http://127.0.0.1:3100/api/ready 2>/dev/null || true)
  if echo "$BODY" | grep -q '"database":{"status":"ok"'; then READY=1; break; fi
  sleep 2
done
echo "ready(attempt $i): ${BODY:-<none>}"
[ "$READY" = 1 ] || { echo "READY GATE FAILED"; docker compose -f docker-compose.shared-vps.yml --env-file .env logs --tail 40 web; exit 1; }
HEALTH=$(curl -fsS http://127.0.0.1:3100/api/health)
echo "health: $HEALTH"
echo "$HEALTH" | grep -q "$PIN_SHA" || echo "WARN: health commit does not match pin"

step "8. worker schedules (pg-boss through pgbouncer)"
OUT=$(docker compose -f docker-compose.shared-vps.yml --env-file .env exec -T worker node apps/web/.tools/db-cli.mjs jobs 2>/dev/null || true)
echo "$OUT" | head -c 600 || true
echo
echo "$OUT" | grep -q 'ops.backup' && echo "worker schedules OK (ops.backup present)" || echo "WARN: schedules not confirmed yet (worker may still be starting)"

step "9. boot persistence"
systemctl is-enabled docker
docker compose -f docker-compose.shared-vps.yml --env-file .env ps --format '{{.Name}} {{.State}}' 2>/dev/null || true
echo "restart policy: unless-stopped (in compose) + docker enabled ⇒ auto-start on reboot"

echo "STEP-DONE-DEPLOY"
echo DONE > "$MDIR/deploy.done"
