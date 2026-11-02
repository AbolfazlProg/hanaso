#!/usr/bin/env bash
# HANASO verify-foundation — ALL local quality gates with real evidence (quality-gates skill).
# Exit non-zero on the first failing gate. Run before every PR (Definition of Done §1).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==== [1/9] install (frozen) ===="
command -v pnpm >/dev/null 2>&1 || { echo "pnpm 12.16.1 required (npm i -g pnpm@12.16.1)" >&2; exit 1; }
pnpm install --frozen-lockfile

echo "==== [2/9] format:check ===="
pnpm format:check

echo "==== [3/9] lint ===="
pnpm lint

echo "==== [4/9] stylelint (RTL logical gate — TASK-M0-09 AC-1) ===="
pnpm --filter web lint:css

echo "==== [5/9] typecheck ===="
pnpm typecheck

echo "==== [6/9] unit tests ===="
pnpm test

# 6b (optional): real-PostgreSQL integration suite — runs when TEST_DATABASE_URL points
# at a PostgreSQL 18 (CI always provides one; local dev needs a running instance).
# pg_dump presence alone is NOT enough (PR #74 review r3/S3): an older client would
# silently skip the drill's 5 tests while the gate still prints "integration tests".
if [ -n "${TEST_DATABASE_URL:-}" ] && command -v pg_dump >/dev/null 2>&1; then
  PGDUMP_MAJOR="$(pg_dump --version 2>/dev/null | sed -n 's/^pg_dump (PostgreSQL) \([0-9][0-9]*\).*/\1/p')"
  if [ -n "${PGDUMP_MAJOR}" ] && [ "${PGDUMP_MAJOR}" -ge 18 ]; then
    echo "==== [6b/9] integration tests (real PostgreSQL, pg_dump ${PGDUMP_MAJOR}) ===="
    pnpm --filter web test:integration
  else
    echo "==== [6b/9] integration tests: SKIP (pg_dump major '${PGDUMP_MAJOR:-unknown}' < 18 — the drill would silently skip) ===="
  fi
else
  echo "==== [6b/9] integration tests: SKIP (no TEST_DATABASE_URL or pg_dump on PATH) ===="
fi

echo "==== [7/9] build ===="
pnpm build

echo "==== [7b/9] font budget (spike M0-07 §۶-۲) ===="
pnpm --filter web check:fonts

echo "==== [8/9] smoke (production standalone server, no DATABASE_URL) ===="
# Production-faithful: run the standalone server (same as the Docker image CMD).
# The no-DB path is intentionally exercised here (in-memory repositories); the
# with-DB path is covered by the integration suite + the live /api/ready check.
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

echo "==== [9/9] secret scan ===="
if git ls-files -z \
  | xargs -0 grep -InE '(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' \
  -- 2>/dev/null; then
  echo "SECRET SCAN FAILED" >&2
  exit 1
fi
echo "secret scan: clean"

echo "==== ALL GATES GREEN ===="
