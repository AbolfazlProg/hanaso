#!/usr/bin/env bash
# =============================================================================
# update-hanaso.sh — sandbox test driver (TASK-HANASO-DEPLOY-02 §7)
# =============================================================================
# Runs the REAL updater script against a fully ISOLATED simulation:
#   - a real throwaway git repo (real `git worktree` mechanics),
#   - a fake deploy dir (the REAL shared-VPS compose file + a fake .env),
#   - mock docker/curl/df binaries (see mock-bin/) that record every call.
# It never touches Docker, the network, the VPS, or KOTODAMA.
#
# Usage: bash infra/deploy/sandbox-tests/run.sh [--keep]
# Exit 0 = all scenarios PASS.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
UPDATER="${REPO_ROOT}/infra/deploy/update-hanaso.sh"
MOCK="${HERE}/mock-bin"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

ROOT="$(mktemp -d /tmp/hanaso-simtests.XXXXXX)"
PASS=0; FAIL=0

ok()  { PASS=$((PASS + 1)); printf '      ✔ %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '      ✘ %s\n' "$1"; }

section() { printf '\n── %s ──────────────────────────────────────────\n' "$1"; }

assert_exit() { # want got desc
  if [ "$1" = "$2" ]; then ok "$3 (exit=$2)"; else bad "$3 — want exit $1, got $2"; fi
}
assert_exit_nonzero() {
  if [ "$1" != 0 ]; then ok "$2 (exit=$1)"; else bad "$2 — expected failure, got exit 0"; fi
}
env_image() { grep -E '^HANASO_WEB_IMAGE=' "$1/.env" | head -1 | cut -d= -f2-; }
assert_env_image() { # deploydir want desc
  local got; got="$(env_image "$1")"
  if [ "${got:-}" = "$2" ]; then ok "$3"; else bad "$3 — .env has '${got}', want '$2'"; fi
}
assert_env_unchanged() { # deploydir original desc
  assert_env_image "$1" "$2" "$3 (server state untouched)"
}
calls_has()        { grep -qF "$2" "$1/sim/calls.log" 2>/dev/null; }
assert_called()    { if calls_has "$1" "$2"; then ok "$3"; else bad "$3 (missing call: $2)"; fi; }
assert_not_called(){ if calls_has "$1" "$2"; then bad "$3 (forbidden call present: $2)"; else ok "$3"; fi; }
out_has()          { grep -qF "$2" "$1/out.log" 2>/dev/null; }
assert_out()       { if out_has "$1" "$2"; then ok "$3"; else bad "$3 (output missing: $2)"; fi; }
assert_file()      { if [ -e "$1" ]; then ok "$2"; else bad "$2 (missing: $1)"; fi; }
assert_no_file()   { if [ ! -e "$1" ]; then ok "$2"; else bad "$2 (exists but must NOT: $1)"; fi; }

# -----------------------------------------------------------------------------
# fixture: a real git repo with BASE (live) and TARGET (release) commits
# -----------------------------------------------------------------------------
section "fixture setup"
FIX="${ROOT}/fixture-repo"
git init -q --initial-branch=main "${FIX}"
git -C "${FIX}" config user.email sim@hanaso.local
git -C "${FIX}" config user.name "sim"
mkdir -p "${FIX}/infra/docker"
echo "FROM node:24-alpine # fixture placeholder" > "${FIX}/infra/docker/Dockerfile"
echo "fixture" > "${FIX}/marker.txt"
git -C "${FIX}" add -A
git -C "${FIX}" commit -qm "base (simulated live code)"
BASE_SHA="$(git -C "${FIX}" rev-parse HEAD)"
echo "release-change" >> "${FIX}/marker.txt"
git -C "${FIX}" commit -qam "target release (simulated)"
TARGET_SHA="$(git -C "${FIX}" rev-parse HEAD)"
# unreachable origin — every real `git fetch` fails (scenario 5 relies on it)
git -C "${FIX}" remote add origin "file:///nonexistent-hanaso-remote"
echo "  fixture repo: ${FIX}"
echo "  BASE_SHA=${BASE_SHA:0:12}  TARGET_SHA=${TARGET_SHA:0:12}"

NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${TARGET_SHA}"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${BASE_SHA}"

# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------
prep() { # scenario-name → creates $ROOT/<name>/{deploy,sim}; echoes dir
  local d="${ROOT}/${1}"
  mkdir -p "${d}/sim" "${d}/deploy"
  cp "${REPO_ROOT}/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml" "${d}/deploy/docker-compose.yml"
  cat > "${d}/deploy/.env" <<EOF
HANASO_WEB_IMAGE=${OLD_IMAGE}
POSTGRES_USER=hanaso
POSTGRES_PASSWORD=sim-not-a-real-secret
POSTGRES_DB=hanaso
EOF
  cp "${REPO_ROOT}/scripts/smoke.sh" "${d}/deploy/smoke.sh"
  cat > "${d}/sim/config.env" <<EOF
SIM_DISK_MB=20000
SIM_PREV_VERSION=1.0.0-sim-prev
EOF
  cat > "${d}/sim/state.env" <<EOF
CURRENT_IMAGE=${OLD_IMAGE}
CURRENT_COMMIT=${BASE_SHA}
CURRENT_VERSION=1.0.0-sim-prev
PHASE=before
EOF
  touch "${d}/sim/calls.log"
  echo "${d}"
}

run_update() { # scenario-dir [updater-args...]
  local d="$1"; shift
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_REPO_DIR="${FIX}"
    export HANASO_TARGET_SHA="${TARGET_SHA}"
    export HANASO_TARGET_VERSION="1.0.0-sim-target"
    export HANASO_TARGET_BRANCH="main"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    bash "${UPDATER}" "$@"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

run_update_badsha() { # scenario-dir — target commit that can never be fetched
  local d="$1"
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_REPO_DIR="${FIX}"
    export HANASO_TARGET_SHA="1111111111111111111111111111111111111111"
    export HANASO_TARGET_VERSION="1.0.0-sim-ghost"
    export HANASO_TARGET_BRANCH="main"
    bash "${UPDATER}"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

exit_of() { cat "$1/exit.code" 2>/dev/null || echo 199; }

# =============================================================================
section "S1 — happy path: healthy simulated host, update to the pinned target"
D="$(prep s1-happy)"
run_update "${D}"
assert_exit 0 "$(exit_of "${D}")" "S1 updater exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S1 .env switched to the new image"
assert_called "${D}" "docker build" "S1 image built from the pinned commit"
assert_called "${D}" "compose run --rm migrate" "S1 one-shot migrate ran (idempotent)"
assert_called "${D}" "compose up: web worker" "S1 web+worker recreated"
assert_called "${D}" "compose exec worker db-cli backup" "S1 DB backup taken BEFORE the swap"
assert_out "${D}" "UPDATE COMPLETE" "S1 success banner"
assert_file "${D}/deploy/update-history" "S1 update-history dir created"
assert_out "${D}" "1.0.0-sim-target" "S1 health gate matched the pinned version"
assert_out "${D}" "smoke: ALL GREEN" "S1 smoke passed"
assert_out "${D}" "KOTODAMA" "S1 KOTODAMA witness reported"

# =============================================================================
section "S2 — update from a previous version + rollback subcommand round-trip"
D="$(prep s2-roundtrip)"
run_update "${D}"
assert_exit 0 "$(exit_of "${D}")" "S2 update exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S2 .env at the new image"
assert_out "${D}" "${OLD_IMAGE}" "S2 previous image recorded as rollback target"
run_update "${D}" rollback
assert_exit 0 "$(exit_of "${D}")" "S2 rollback subcommand exits 0"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S2 .env restored to the previous image"
assert_called "${D}" "compose up: web worker" "S2 rollback recreated web+worker"
# now update again — must succeed again (idempotent machinery, fresh state)
run_update "${D}"
assert_exit 0 "$(exit_of "${D}")" "S2 re-update after rollback exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S2 .env back at the new image"

# =============================================================================
section "S3 — docker missing/broken → preflight fails, nothing changes"
D="$(prep s3-nodocker)"
echo "SIM_NO_DOCKER=1" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S3 updater fails"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S3 .env untouched"
assert_not_called "${D}" "docker build" "S3 no build attempted"
assert_not_called "${D}" "compose run" "S3 no migrate attempted"
assert_not_called "${D}" "compose exec" "S3 no DB backup attempted"

# =============================================================================
section "S4 — low disk → preflight fails, nothing changes"
D="$(prep s4-lowdisk)"
sed -i 's/^SIM_DISK_MB=.*/SIM_DISK_MB=800/' "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S4 updater fails"
assert_out "${D}" "not enough disk" "S4 clear disk error message"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S4 .env untouched"
assert_not_called "${D}" "docker build" "S4 no build attempted"

# =============================================================================
section "S5 — GitHub unreachable → fetch fails BEFORE any server change"
D="$(prep s5-github)"
run_update_badsha "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S5 updater fails"
assert_out "${D}" "git fetch failed — nothing was changed" "S5 honest no-change message"
assert_out "${D}" "credential" "S5 one-time credential guidance shown"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S5 .env untouched"
assert_not_called "${D}" "docker build" "S5 no build attempted"
assert_not_called "${D}" "compose exec" "S5 no DB backup attempted"

# =============================================================================
section "S6 — build failure → aborts BEFORE the swap (server unchanged)"
D="$(prep s6-buildfail)"
echo "SIM_BUILD_FAIL=1" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S6 updater fails"
assert_out "${D}" "docker build FAILED — nothing was changed" "S6 honest abort message"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S6 .env untouched (no swap happened)"
assert_not_called "${D}" "compose run" "S6 no migrate attempted"
assert_not_called "${D}" "compose up: web worker" "S6 web never recreated"

# =============================================================================
section "S7 — migration failure AFTER the swap → automatic rollback"
D="$(prep s7-migratefail)"
echo "SIM_MIGRATE_FAIL=1" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S7 updater fails"
assert_out "${D}" "rolling the APP back" "S7 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S7 .env restored to the previous image"
assert_called "${D}" "compose up: web worker" "S7 rollback recreated web+worker"
assert_out "${D}" "rolled back" "S7 rollback health gate passed"

# =============================================================================
section "S8 — health gate failure (new web never serves) → automatic rollback"
D="$(prep s8-healthfail)"
echo "SIM_STUCK_OLD=1" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S8 updater fails"
assert_out "${D}" "health gate failed" "S8 health-gate failure reported"
assert_out "${D}" "rolling the APP back" "S8 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S8 .env restored to the previous image"

# =============================================================================
section "S9 — re-run while already on the target → no-op, zero mutation"
D="$(prep s9-noop)"
sed -i "s|^CURRENT_COMMIT=.*|CURRENT_COMMIT=${TARGET_SHA}|" "${D}/sim/state.env"
sed -i "s|^CURRENT_VERSION=.*|CURRENT_VERSION=1.0.0-sim-target|" "${D}/sim/state.env"
sed -i "s|^CURRENT_IMAGE=.*|CURRENT_IMAGE=${NEW_IMAGE}|" "${D}/sim/state.env"
sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${NEW_IMAGE}|" "${D}/deploy/.env"
run_update "${D}"
assert_exit 0 "$(exit_of "${D}")" "S9 re-run exits 0 (idempotent)"
assert_out "${D}" "already running target commit" "S9 no-op message"
assert_not_called "${D}" "docker build" "S9 no rebuild"
assert_not_called "${D}" "compose run" "S9 no migrate re-run"
assert_not_called "${D}" "compose up" "S9 no container changes"
assert_not_called "${D}" "compose exec" "S9 no extra DB backup"

# =============================================================================
section "S10 — rollback to the previous version via the history record"
D="$(prep s10-rollbackcmd)"
run_update "${D}"
assert_exit 0 "$(exit_of "${D}")" "S10 update first (expected success)"
run_update "${D}" rollback
assert_exit 0 "$(exit_of "${D}")" "S10 rollback exits 0"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S10 .env back at the previous image"
assert_out "${D}" "rollback complete" "S10 rollback banner"
assert_called "${D}" "compose up: web worker" "S10 web+worker recreated by rollback"

# =============================================================================
section "S11 — DB backup failure → aborts BEFORE any change (bonus)"
D="$(prep s11-backupfail)"
echo "SIM_BACKUP_FAIL=1" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S11 updater fails"
assert_out "${D}" "database backup FAILED — aborting BEFORE any change" "S11 honest abort"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S11 .env untouched"

# =============================================================================
section "S12 — KOTODAMA witness degrades after the swap → rollback (bonus)"
D="$(prep s12-kotodama)"
echo "SIM_KOTODAMA_AFTER=503" >> "${D}/sim/config.env"
run_update "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S12 updater fails"
assert_out "${D}" "INVESTIGATE" "S12 KOTODAMA change reported"
assert_out "${D}" "rolling the APP back" "S12 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S12 .env restored"

# =============================================================================
section "S13 — status subcommand is read-only (bonus)"
D="$(prep s13-status)"
run_update "${D}" status
assert_exit 0 "$(exit_of "${D}")" "S13 status exits 0"
assert_out "${D}" "1.0.0-sim-prev" "S13 reports the current version"
assert_not_called "${D}" "docker build" "S13 no mutations"
assert_not_called "${D}" "compose run" "S13 no mutations (migrate)"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S13 .env untouched"

# =============================================================================
section "GLOBAL — KOTODAMA / isolation invariants across ALL scenarios"
VIOL=0
for d in "${ROOT}"/s*/; do
  if grep -qiE 'compose down' "${d}/sim/calls.log" 2>/dev/null; then
    bad "no 'compose down' ever (${d})"; VIOL=1
  fi
  if grep -qE 'docker inspect (kotodama|bbb| genesis)' "${d}/sim/calls.log" 2>/dev/null; then
    bad "non-hanaso container touched (${d})"; VIOL=1
  fi
  if grep -qE 'docker (system prune|restart|stop|rm) ' "${d}/sim/calls.log" 2>/dev/null; then
    bad "global docker mutation (${d})"; VIOL=1
  fi
done
[ "${VIOL}" = 0 ] && ok "no 'compose down', no non-hanaso containers, no global docker mutations in any scenario"

# =============================================================================
printf '\n══════════════════════════════════════════════\n'
printf '  SANDBOX TESTS: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf '  work dir: %s\n' "${ROOT}"
if [ "${KEEP}" = 1 ]; then
  printf '  (kept for inspection — remove manually)\n'
else
  rm -rf "${ROOT}" && printf '  (work dir cleaned)\n'
fi
[ "${FAIL}" = 0 ]
