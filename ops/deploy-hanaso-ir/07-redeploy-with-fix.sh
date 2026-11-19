#!/usr/bin/env bash
# HANASO-IR deploy — step 7: rebuild + redeploy the web/worker image with the
# production-QA fix (progress route: chapter dialogues no longer 500).
# postgres/pgbouncer containers and volumes are UNTOUCHED (zero data risk).
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/redeploy.log"
FIX_SHA="bbe328d"
FIX_SHA_FULL="$(git -C /opt/hanaso-src rev-parse "origin/feat/HANASO-IR-PROD-DEPLOY" 2>/dev/null || echo "")"
PIN_VERSION="1.1.0-hanaso34-r01"
SRC="/opt/hanaso-src"
COMPOSE_DIR="$SRC/infra/deploy/learn-kotodama"

exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "1. checkout the fix commit"
cd "$SRC"
git fetch --quiet origin
# resolve the FULL sha of the deploy branch tip
TIP_FULL="$(git rev-parse origin/feat/HANASO-IR-PROD-DEPLOY)"
echo "deploy branch tip: $TIP_FULL"
git checkout --quiet --force "$TIP_FULL"
echo "checked out: $(git rev-parse --short HEAD)"

step "2. rebuild image (pinned to the fix commit)"
docker build -f "$SRC/infra/docker/Dockerfile" \
  --build-arg "NEXT_PUBLIC_BUILD_SHA=$TIP_FULL" \
  --build-arg "NEXT_PUBLIC_APP_VERSION=$PIN_VERSION" \
  -t "hanaso-web:$TIP_FULL" "$SRC" || { echo "BUILD FAILED"; exit 1; }
docker images "hanaso-web:$TIP_FULL" --format '{{.Repository}}:{{.Tag}} {{.Size}}'

step "3. point compose at the new image (only HANASO_WEB_IMAGE line changes)"
sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=hanaso-web:$TIP_FULL|" "$COMPOSE_DIR/.env"
grep -c "HANASO_WEB_IMAGE=hanaso-web:$TIP_FULL" "$COMPOSE_DIR/.env" && echo ".env updated"
cd "$COMPOSE_DIR"
CF="-f docker-compose.shared-vps.yml -f docker-compose.hanaso-ir-1core.yml"

step "4. recreate web + worker (postgres/pgbouncer untouched)"
docker compose $CF --env-file .env up -d web worker || { echo "up FAILED"; exit 1; }
sleep 5
docker compose $CF --env-file .env ps

step "5. health gate (new commit must be live)"
READY=0; BODY=""
for i in $(seq 1 90); do
  BODY=$(curl -fsS http://127.0.0.1:3100/api/ready 2>/dev/null || true)
  if echo "$BODY" | grep -q '"database":{"status":"ok"'; then READY=1; break; fi
  sleep 2
done
echo "ready: ${BODY:-<none>}"
[ "$READY" = 1 ] || { echo "READY GATE FAILED"; exit 1; }
HEALTH=$(curl -fsS http://127.0.0.1:3100/api/health)
echo "health: $HEALTH"
echo "$HEALTH" | grep -q "$TIP_FULL" && echo "NEW SHA LIVE ✓" || { echo "SHA MISMATCH"; exit 1; }
echo "$HEALTH" | grep -q "$PIN_VERSION" && echo "VERSION ✓ ($PIN_VERSION)"

echo "STEP-DONE-REDEPLOY"
echo DONE > "$MDIR/redeploy.done"
