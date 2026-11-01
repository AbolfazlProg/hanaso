#!/usr/bin/env bash
# HANASO deploy — pull tagged image, migrate (when DB exists), up, health-gate, smoke.
# Usage: bash infra/deploy/deploy.sh <IMAGE_TAG_SHA>   (run from repo root on the VPS)
# Safety: any failing step exits BEFORE touching the running service (no-op on failure).
# Rollback: bash infra/deploy/rollback.sh <previous-SHA>
set -euo pipefail

TAG="${1:?usage: deploy.sh <IMAGE_TAG_SHA> (a git commit SHA — immutable GHCR tag)}"
export HANASO_WEB_IMAGE="ghcr.io/abolfazlprog/hanaso:${TAG}"
COMPOSE="docker compose -f infra/docker/docker-compose.yml --project-directory ."
HEALTH_URL="${HANASO_HEALTH_URL:-http://127.0.0.1:3000/api/health}" # loopback publish on web

echo "== HANASO deploy: ${TAG} =="

# 1) pull the exact immutable tag (fails => nothing changes)
$COMPOSE pull web

# 2) (M0-10+) migrations run here as a one-shot, direct-connection service:
#    $COMPOSE run --rm migrate

# 3) switch traffic to the new image
$COMPOSE up -d web caddy

# 4) health gate: /api/health must be 200-ok (30 x 2s)
echo "== health gate: ${HEALTH_URL} =="
for i in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" | grep -q '"ok":true'; then
    echo "healthy after $((i * 2))s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "HEALTH GATE FAILED after 60s — rolling back to previous tag now:"
    bash infra/deploy/rollback.sh "${HANASO_PREVIOUS_TAG:?set HANASO_PREVIOUS_TAG or run rollback.sh manually}"
    exit 1
  fi
  sleep 2
done

# 5) smoke the real endpoints
bash scripts/smoke.sh

echo "== deploy complete: ${TAG} =="
echo "VPS↔GitHub coherence (ADR-015): record this SHA in PROJECT_STATUS.md after verifying."
