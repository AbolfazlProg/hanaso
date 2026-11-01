#!/usr/bin/env bash
# HANASO smoke — real HTTP checks against a RUNNING instance.
# Local:   pnpm --filter web build && pnpm --filter web start &  then: bash scripts/smoke.sh
# Preview: HANASO_BASE_URL=https://preview.hanaso.ir bash scripts/smoke.sh
set -euo pipefail

BASE="${HANASO_BASE_URL:-http://127.0.0.1:3000}"

fail() { echo "SMOKE FAIL: $1" >&2; exit 1; }

echo "== smoke: ${BASE} =="

# 1) health
health=$(curl -fsS "${BASE}/api/health" || fail "/api/health unreachable")
echo "health: ${health}"
echo "${health}" | grep -q '"ok":true' || fail "/api/health not ok"
echo "${health}" | grep -q '"service":"hanaso-web"' || fail "/api/health wrong service"

# 2) ready
ready=$(curl -fsS "${BASE}/api/ready" || fail "/api/ready unreachable")
echo "ready: ${ready}"
echo "${ready}" | grep -q '"ok":true' || fail "/api/ready not ok"

# 3) home page renders (Persian RTL shell)
page=$(curl -fsS "${BASE}/" || fail "home page unreachable")
echo "${page}" | grep -q 'dir="rtl"' || fail "home page missing RTL shell"
echo "${page}" | grep -q 'lang="ja"' || fail "home page missing Japanese LTR block"

echo "== smoke: ALL GREEN =="
