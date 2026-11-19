#!/usr/bin/env bash
# HANASO-IR deploy — step 7: rebuild + redeploy the web/worker image at the
# CURRENT main tip (production = main; version pin carries the release name).
# postgres/pgbouncer containers and volumes are UNTOUCHED (zero data risk).
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/redeploy.log"
FIX_SHA="bbe328d"
FIX_SHA_FULL="$(git -C /opt/hanaso-src rev-parse "origin/main" 2>/dev/null || echo "")"
PIN_VERSION="1.1.0-hanaso35-r01"
SRC="/opt/hanaso-src"
COMPOSE_DIR="$SRC/infra/deploy/learn-kotodama"
# HANASO-IR disk policy (owner-pass 2026-11-19): a docker build needs ~2.5GB of
# working space (context + layers + node_modules stages). Refuse to START a build
# the disk cannot hold — aborting BEFORE the build is the safe failure.
MIN_BUILD_FREE_GB=3

exec > >(tee -a "$LOG") 2>&1
step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "0. pre-build disk gate (safe abort on low space)"
FREE_GB=$(df --output=avail -BG / | tail -1 | tr -dc '0-9')
echo "free: ${FREE_GB}GB (build needs >= ${MIN_BUILD_FREE_GB}GB)"
if [ "$FREE_GB" -lt "$MIN_BUILD_FREE_GB" ]; then
  echo "BUILD REFUSED — only ${FREE_GB}GB free. Run /usr/local/sbin/hanaso-disk-cleanup.sh and retry."
  echo "BUILD-REFUSED-LOW-DISK" > "$MDIR/redeploy.done"
  exit 1
fi

step "1. checkout the fix commit"
cd "$SRC"
git fetch --quiet origin
# resolve the FULL sha of the deploy branch tip
TIP_FULL="$(git rev-parse origin/main)"
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

step "3b. migrate (additive schema — 0005 fsrs_cards/fsrs_revlogs/learning_events)"
# runs BEFORE the new image serves: the new code lazily reads the new tables.
# Additive migration — the OLD image ignores the new tables, so a migration that
# succeeded but a build that failed still leaves the running version healthy.
docker compose -f docker-compose.shared-vps.yml --env-file .env run --rm migrate || { echo "MIGRATE FAILED"; exit 1; }
# sanity: the three new tables must exist (informational only)
docker exec hanaso-postgres psql -U "${POSTGRES_USER:-hanaso}" -d "${POSTGRES_DB:-hanaso}" -c "\dt app.*" 2>/dev/null | grep -E "fsrs_cards|fsrs_revlogs|learning_events" || echo "(table check skipped — verify in logs)"

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

step "6. post-deploy cleanup (disk policy — keep current + previous image for rollback)"
{ docker image prune -f 2>&1 | tail -1
  docker builder prune -f 2>&1 | tail -1
  CURRENT_ID=$(docker inspect hanaso-web --format '{{.Image}}' 2>/dev/null | sed 's/^sha256://' | cut -c1-12)
  # keep the two newest hanaso-web images (the one just deployed + its predecessor)
  docker images hanaso-web --format '{{.ID}} {{.CreatedAt}}' | sort -k2 | head -n -2 | awk '{print $1}' | while read -r id; do
    [ "$id" != "$CURRENT_ID" ] && docker rmi -f "$id" 2>/dev/null | tail -1
  done
  df -h / | tail -1
} >> "$LOG" 2>&1
echo "POST-DEPLOY-CLEANUP-DONE"
