#!/usr/bin/env bash
# HANASO rollback — redeploy a previously-green immutable SHA (ADR-010: rollback = redeploy).
# Usage: bash infra/deploy/rollback.sh <previous-SHA>       (run from repo root on the VPS)
set -euo pipefail

TAG="${1:?usage: rollback.sh <previous-green-SHA>}"
COMPOSE="docker compose -f infra/docker/docker-compose.yml"
HEALTH_URL="${HANASO_HEALTH_URL:-http://127.0.0.1:3000/api/health}"

echo "== HANASO rollback to: ${TAG} =="
$COMPOSE pull web
HANASO_WEB_IMAGE="ghcr.io/abolfazlprog/hanaso:${TAG}" $COMPOSE up -d web caddy

for i in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" | grep -q '"ok":true'; then
    echo "rollback healthy after $((i * 2))s"
    bash scripts/smoke.sh || true # smoke best-effort during rollback
    echo "== rollback complete: ${TAG} =="
    exit 0
  fi
  sleep 2
done

echo "ROLLBACK HEALTH GATE FAILED — investigate manually (docker compose logs web)."
exit 1
