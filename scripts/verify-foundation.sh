#!/usr/bin/env bash
# HANASO verify-foundation — ALL local quality gates with real evidence (quality-gates skill).
# Exit non-zero on the first failing gate. Run before every PR (Definition of Done §1).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==== [1/7] install (frozen) ===="
command -v pnpm >/dev/null 2>&1 || { echo "pnpm 12.16.1 required (npm i -g pnpm@12.16.1)" >&2; exit 1; }
pnpm install --frozen-lockfile

echo "==== [2/7] format:check ===="
pnpm format:check

echo "==== [3/7] lint ===="
pnpm lint

echo "==== [4/7] typecheck ===="
pnpm typecheck

echo "==== [5/7] unit tests ===="
pnpm test

echo "==== [6/7] build ===="
pnpm build

echo "==== [7/7] smoke (production standalone server) + secret scan ===="
# Production-faithful: run the standalone server (same as the Docker image CMD).
# The skeleton has NO db layer — an unrelated DATABASE_URL in the ambient
# environment would (correctly!) make /api/ready report 503, so it is unset here.
env -u DATABASE_URL PORT=3100 HOSTNAME=127.0.0.1 node apps/web/.next/standalone/apps/web/server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
READY=0
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3100/api/health >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo "server did not become healthy on :3100 within 30s (check for a stale process holding the port)" >&2
  exit 1
fi
HANASO_BASE_URL=http://127.0.0.1:3100 bash scripts/smoke.sh
kill $SERVER_PID 2>/dev/null || true

# secret scan: token-like strings must not appear in tracked files
echo "==== secret scan ===="
if git ls-files -z \
  | xargs -0 grep -InE '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' \
  -- 2>/dev/null; then
  echo "SECRET SCAN FAILED" >&2
  exit 1
fi
echo "secret scan: clean"

echo "==== ALL GATES GREEN ===="
