#!/usr/bin/env bash
# =============================================================================
# run-deploy04.sh — sandbox test driver for the ZERO-CREDENTIAL one-command flow
# TASK-HANASO-DEPLOY-04 §9
# =============================================================================
# Runs the REAL bootstrap-hanaso.sh + REAL update-hanaso.sh against a fully
# ISOLATED simulation:
#   - a real local "origin" repository (bare) standing in for the PUBLIC
#     GitHub repo — reached via an anonymous file:// URL with NO git
#     credentials configured (GIT_CONFIG_GLOBAL/SYSTEM pointed at /dev/null);
#   - the real bootstrap mechanics: ls-remote probe → clone/fetch of the source
#     workspace → pinned-commit verification → worktree at the pinned deploy
#     commit → the real updater from that worktree;
#   - mock docker/curl/df binaries (mock-bin/) recording every call.
# It never touches real Docker, GitHub, the VPS, or KOTODAMA.
#
# Usage: bash infra/deploy/sandbox-tests/run-deploy04.sh [--keep]
# Exit 0 = all scenarios PASS.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
BOOTSTRAP="${REPO_ROOT}/infra/deploy/bootstrap-hanaso.sh"
MOCK="${HERE}/mock-bin"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

ROOT="$(mktemp -d /tmp/hanaso-deploy04.XXXXXX)"
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
assert_env_unchanged() { assert_env_image "$1" "$2" "$3 (server state untouched)"; }
calls_has()        { grep -qF "$2" "$1/sim/calls.log" 2>/dev/null; }
assert_called()    { if calls_has "$1" "$2"; then ok "$3"; else bad "$3 (missing call: $2)"; fi; }
assert_not_called(){ if calls_has "$1" "$2"; then bad "$3 (forbidden call present: $2)"; else ok "$3"; fi; }
out_has()          { grep -qF "$2" "$1/out.log" 2>/dev/null; }
assert_out()       { if out_has "$1" "$2"; then ok "$3 (output has: $2)"; else bad "$3 (output missing: $2)"; fi; }
assert_file()      { if [ -e "$1" ]; then ok "$2"; else bad "$2 (missing: $1)"; fi; }
assert_no_file()   { if [ ! -e "$1" ]; then ok "$2"; else bad "$2 (exists but must NOT: $1)"; fi; }
assert_glob_file() { if ls $1 >/dev/null 2>&1; then ok "$2"; else bad "$2 (no match: $1)"; fi; }
assert_is_git()    { if git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1; then ok "$2"; else bad "$2 (not a git work tree: $1)"; fi; }

# -----------------------------------------------------------------------------
# fixture: a bare "origin" repo standing in for the PUBLIC GitHub repository
#   main        → base app content
#   tl08-cta01  → TARGET release commit (the pinned app version)
#   tl08-deploy04 → tip = DEPLOY commit containing the REAL deploy scripts
# -----------------------------------------------------------------------------
section "fixture setup — bare origin (stands in for public GitHub)"
WORK="${ROOT}/fixture-work"
ORIGIN="${ROOT}/fixture-origin.git"
mkdir -p "${WORK}/infra/docker" "${WORK}/infra/deploy/learn-kotodama" "${WORK}/scripts"
echo "FROM node:24-alpine # fixture placeholder" > "${WORK}/infra/docker/Dockerfile"
echo "fixture" > "${WORK}/marker.txt"
cp "${REPO_ROOT}/scripts/smoke.sh" "${WORK}/scripts/smoke.sh"
git -C "${WORK}" init -q --initial-branch=main
git -C "${WORK}" config user.email sim@hanaso.local
git -C "${WORK}" config user.name sim
git -C "${WORK}" add -A && git -C "${WORK}" commit -qm "base (simulated live code)"
BASE_SHA="$(git -C "${WORK}" rev-parse HEAD)"

git -C "${WORK}" checkout -qb tl08-cta01
echo "release-change" >> "${WORK}/marker.txt"
git -C "${WORK}" commit -qam "target release (simulated)"
TARGET_SHA="$(git -C "${WORK}" rev-parse HEAD)"

git -C "${WORK}" checkout -qb tl08-deploy04
cp "${REPO_ROOT}/infra/deploy/bootstrap-hanaso.sh" "${WORK}/infra/deploy/bootstrap-hanaso.sh"
cp "${REPO_ROOT}/infra/deploy/update-hanaso.sh"    "${WORK}/infra/deploy/update-hanaso.sh"
cp "${REPO_ROOT}/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml" \
   "${WORK}/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml"
git -C "${WORK}" add -A && git -C "${WORK}" commit -qm "deploy tooling (simulated)"
DEPLOY_SHA="$(git -C "${WORK}" rev-parse HEAD)"

git clone -q --bare "${WORK}" "${ORIGIN}"
git -C "${ORIGIN}" symbolic-ref HEAD refs/heads/main
REPO_URL="file://${ORIGIN}"
echo "  origin: ${REPO_URL}"
echo "  BASE=${BASE_SHA:0:8} TARGET=${TARGET_SHA:0:8} DEPLOY=${DEPLOY_SHA:0:8}"

NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${TARGET_SHA}"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${BASE_SHA}"

# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------
prep() { # scenario-name → creates $ROOT/<name>/{deploy,src,sim}; echoes dir
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

run_boot() { # scenario-dir [bootstrap-args...] — the REAL one-command entrypoint
  local d="$1"; shift
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    # anonymous proof: no global/system git config → no credential helper can
    # exist; GIT_TERMINAL_PROMPT=0 forbids any interactive prompt.
    export GIT_CONFIG_GLOBAL=/dev/null
    export GIT_CONFIG_SYSTEM=/dev/null
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_REPO_URL="${REPO_URL}"
    export HANASO_SRC_DIR="${d}/src"
    export HANASO_DEPLOY_SHA="${DEPLOY_SHA}"
    export HANASO_TARGET_SHA="${TARGET_SHA}"
    export HANASO_TARGET_VERSION="1.0.0-sim-target"
    export HANASO_TARGET_BRANCH="tl08-cta01"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    export HANASO_CHECKHOST_DELAY=0
    bash "${BOOTSTRAP}" "$@"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

run_boot_url() { # scenario-dir repo-url [extra env as K=V ...]
  local d="$1" url="$2"; shift 2
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_REPO_URL="${url}"
    export HANASO_SRC_DIR="${d}/src"
    export HANASO_DEPLOY_SHA="${DEPLOY_SHA}"
    export HANASO_TARGET_SHA="${TARGET_SHA}"
    export HANASO_TARGET_VERSION="1.0.0-sim-target"
    export HANASO_TARGET_BRANCH="tl08-cta01"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    for kv in "$@"; do export "${kv}"; done
    export HANASO_CHECKHOST_DELAY=0
    bash "${BOOTSTRAP}"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

run_update_direct() { # scenario-dir — the REAL updater invoked directly (no bootstrap)
  local d="$1"
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_REPO_URL="${REPO_URL}"
    export HANASO_SRC_DIR="${d}/src"
    export HANASO_TARGET_SHA="${TARGET_SHA}"
    export HANASO_TARGET_VERSION="1.0.0-sim-target"
    export HANASO_TARGET_BRANCH="tl08-cta01"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    export HANASO_CHECKHOST_DELAY=0
    bash "${REPO_ROOT}/infra/deploy/update-hanaso.sh"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

exit_of() { cat "$1/exit.code" 2>/dev/null || echo 199; }

# =============================================================================
section "S1 — fresh install: NO workspace yet → anonymous clone + full update"
D="$(prep s1-fresh)"
assert_no_file "${D}/src" "S1 no source workspace beforehand"
run_boot "${D}"
assert_exit 0 "$(exit_of "${D}")" "S1 bootstrap+updater exit 0"
assert_is_git "${D}/src" "S1 source workspace created (anonymous clone)"
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
assert_out "${D}" "updater pinned at commit" "S1 updater executed at the pinned commit"
assert_out "${D}" "integrity OK" "S1 bootstrap byte-identical to the pinned commit"
assert_glob_file "${D}/deploy/.env.backup-*" "S1 .env backup kept (data never deleted)"

# =============================================================================
section "S2 — update from a previous version + rollback subcommand round-trip"
D="$(prep s2-roundtrip)"
run_boot "${D}"
assert_exit 0 "$(exit_of "${D}")" "S2 update exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S2 .env at the new image"
assert_out "${D}" "${OLD_IMAGE}" "S2 previous image recorded as rollback target"
run_boot "${D}" rollback
assert_exit 0 "$(exit_of "${D}")" "S2 rollback subcommand exits 0"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S2 .env restored to the previous image"
assert_called "${D}" "compose up: web worker" "S2 rollback recreated web+worker"
run_boot "${D}"
assert_exit 0 "$(exit_of "${D}")" "S2 re-update after rollback exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S2 .env back at the new image"

# =============================================================================
section "S3 — workspace already exists → fetch (no re-clone), idempotent update"
D="$(prep s3-fetchpath)"
run_boot "${D}"
assert_exit 0 "$(exit_of "${D}")" "S3 first run (clone path) exits 0"
mv "${D}/sim/calls.log" "${D}/sim/calls.run1.log"   # isolate run-2 calls
run_boot "${D}"
assert_exit 0 "$(exit_of "${D}")" "S3 second run exits 0"
assert_out "${D}" "existing clone found — fetching" "S3 second run FETCHED (no re-clone)"
assert_out "${D}" "already running target commit" "S3 no-op: already at the pinned target"
assert_not_called "${D}" "docker build" "S3 no rebuild on re-run"
assert_not_called "${D}" "compose run" "S3 no migrate re-run"
assert_not_called "${D}" "compose up" "S3 no container changes on re-run"

# =============================================================================
section "S4 — docker missing → updater preflight fails, server unchanged"
D="$(prep s4-nodocker)"
echo "SIM_NO_DOCKER=1" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S4 bootstrap fails (updater preflight)"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S4 .env untouched"
assert_not_called "${D}" "docker build" "S4 no build attempted"
assert_not_called "${D}" "compose run" "S4 no migrate attempted"
assert_not_called "${D}" "compose exec" "S4 no DB backup attempted"

# =============================================================================
section "S5 — GitHub unreachable → REAL git error shown, nothing created"
D="$(prep s5-unreachable)"
run_boot_url "${D}" "file:///nonexistent-hanaso-remote"
assert_exit_nonzero "$(exit_of "${D}")" "S5 bootstrap fails"
assert_out "${D}" "Anonymous access to" "S5 honest anonymous-access failure header"
assert_out "${D}" "no longer public" "S5 guidance: visibility / network, NO credential setup"
assert_out "${D}" "does not appear to be a git repository" "S5 REAL git error shown verbatim (not swallowed)"
assert_out "${D}" "nothing was changed" "S5 explicit no-change promise"
assert_no_file "${D}/src" "S5 source workspace NOT created"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S5 .env untouched"
assert_not_called "${D}" "docker build" "S5 no build attempted"

# =============================================================================
section "S6 — SRC dir exists but is NOT a git clone → refused, not deleted"
D="$(prep s6-srcdir-nogit)"
mkdir -p "${D}/src/subdir"
echo "precious-existing-file" > "${D}/src/keepme.txt"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S6 bootstrap fails"
assert_out "${D}" "NOT a git clone — refusing to delete or overwrite" "S6 honest refusal"
assert_file "${D}/src/keepme.txt" "S6 existing files preserved (nothing deleted)"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S6 .env untouched"
assert_not_called "${D}" "docker build" "S6 no build attempted"

# =============================================================================
section "S7 — deploy dir not found → honest per-path diagnostics, nothing touched"
D="$(prep s7-nodeploydir)"
rm -rf "${D}/deploy"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S7 bootstrap fails (updater deploy-dir detection)"
assert_out "${D}" "deploy dir not found" "S7 honest deploy-dir failure"
assert_out "${D}" "docker-compose.yml=no" "S7 per-path findings reported"
assert_out "${D}" "NOT touched" "S7 existing dirs explicitly not touched"
assert_is_git "${D}/src" "S7 source workspace itself was still created (harmless)"

# =============================================================================
section "S8 — deploy dir exists but wrong stack signature → not selected"
D="$(prep s8-wrongsig)"
sed -i 's/hanaso-postgres/other-postgres/; s/hanaso-pgbouncer/other-pgbouncer/' "${D}/deploy/docker-compose.yml"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S8 bootstrap fails"
assert_out "${D}" "deploy dir not found" "S8 wrong-signature dir rejected"
assert_out "${D}" "compose-signature=NO" "S8 signature mismatch reported"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S8 .env untouched"
assert_file "${D}/deploy/smoke.sh" "S8 foreign deploy dir contents preserved"

# =============================================================================
section "S9 — low disk → preflight fails, nothing changes"
D="$(prep s9-lowdisk)"
sed -i 's/^SIM_DISK_MB=.*/SIM_DISK_MB=800/' "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S9 updater fails"
assert_out "${D}" "not enough disk" "S9 clear disk error message"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S9 .env untouched"
assert_not_called "${D}" "docker build" "S9 no build attempted"

# =============================================================================
section "S10 — build failure → aborts BEFORE the swap (server unchanged)"
D="$(prep s10-buildfail)"
echo "SIM_BUILD_FAIL=1" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S10 updater fails"
assert_out "${D}" "docker build FAILED — nothing was changed" "S10 honest abort message"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S10 .env untouched (no swap happened)"
assert_not_called "${D}" "compose run" "S10 no migrate attempted"
assert_not_called "${D}" "compose up: web worker" "S10 web never recreated"

# =============================================================================
section "S11 — migration failure AFTER the swap → automatic rollback"
D="$(prep s11-migratefail)"
echo "SIM_MIGRATE_FAIL=1" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S11 updater fails"
assert_out "${D}" "rolling the APP back" "S11 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S11 .env restored to the previous image"
assert_called "${D}" "compose up: web worker" "S11 rollback recreated web+worker"
assert_out "${D}" "rolled back" "S11 rollback health gate passed"

# =============================================================================
section "S12 — health gate failure (new web never serves) → automatic rollback"
D="$(prep s12-healthfail)"
echo "SIM_STUCK_OLD=1" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S12 updater fails"
assert_out "${D}" "health gate failed" "S12 health-gate failure reported"
assert_out "${D}" "rolling the APP back" "S12 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S12 .env restored to the previous image"

# =============================================================================
section "S13 — DB backup failure → aborts BEFORE any change"
D="$(prep s13-backupfail)"
echo "SIM_BACKUP_FAIL=1" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S13 updater fails"
assert_out "${D}" "database backup FAILED — aborting BEFORE any change" "S13 honest abort"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S13 .env untouched"

# =============================================================================
section "S14 — KOTODAMA witness degrades after the swap → rollback + INVESTIGATE"
D="$(prep s14-kotodama)"
echo "SIM_KOTODAMA_AFTER=503" >> "${D}/sim/config.env"
run_boot "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "S14 updater fails"
assert_out "${D}" "INVESTIGATE" "S14 KOTODAMA change reported"
assert_out "${D}" "rolling the APP back" "S14 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "S14 .env restored"

# =============================================================================
section "S15 — status subcommand is read-only"
D="$(prep s15-status)"
run_boot "${D}" status
assert_exit 0 "$(exit_of "${D}")" "S15 status exits 0"
assert_out "${D}" "1.0.0-sim-prev" "S15 reports the current version"
assert_not_called "${D}" "docker build" "S15 no mutations"
assert_not_called "${D}" "compose run" "S15 no mutations (migrate)"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S15 .env untouched"

# =============================================================================
section "S16 — ghost pinned target commit → bootstrap honest abort"
D="$(prep s16-ghosttarget)"
run_boot_url "${D}" "${REPO_URL}" "HANASO_TARGET_SHA=1111111111111111111111111111111111111111"
assert_exit_nonzero "$(exit_of "${D}")" "S16 bootstrap fails"
assert_out "${D}" "not found in the repository" "S16 pinned-commit verification fired"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S16 .env untouched"
assert_not_called "${D}" "docker build" "S16 no build attempted"

# =============================================================================
section "S17 — modified bootstrap file → integrity warning, updater still pinned"
D="$(prep s17-integrity)"
MOD="${ROOT}/s17-modified-bootstrap.sh"
sed 's/^# HANASO bootstrap — zero-credential one-command entrypoint (v3)$/# HANASO bootstrap — TAMPERED FOR TEST/' \
  "${BOOTSTRAP}" > "${MOD}"
(
  cd /
  export PATH="${MOCK}:${PATH}"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  export HANASO_SIM_DIR="${D}/sim" HANASO_REPO_URL="${REPO_URL}" HANASO_SRC_DIR="${D}/src"
  export HANASO_DEPLOY_SHA="${DEPLOY_SHA}" HANASO_TARGET_SHA="${TARGET_SHA}"
  export HANASO_TARGET_VERSION="1.0.0-sim-target" HANASO_TARGET_BRANCH="tl08-cta01"
  export HANASO_DEPLOY_DIR="${D}/deploy" HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
  export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
  export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
  export HANASO_KOTODAMA_URL="https://kotodama.ir/"
  bash "${MOD}"
) > "${D}/out.log" 2>&1
echo "$?" > "${D}/exit.code"
assert_exit 0 "$(exit_of "${D}")" "S17 modified bootstrap still completes (updater pinned)"
assert_out "${D}" "differs from" "S17 integrity WARNING printed"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "S17 update still ran from the pinned updater"

# =============================================================================
section "S18 — one-liner integrity guard (REAL SHA-256) rejects a corrupted download"
D="$(prep s18-oneliner)"
T="${ROOT}/s18-dl.sh"
WANT_SHA="$(sha256sum "${BOOTSTRAP}" | cut -d' ' -f1)"
printf '<html>gateway error page</html>\n' > "${T}"
GUARD_RC=0
[ "$(sha256sum "${T}" | cut -d' ' -f1)" = "${WANT_SHA}" ] || GUARD_RC=1
assert_exit 1 "${GUARD_RC}" "S18 corrupted download rejected by the SHA-256 gate"
cp "${BOOTSTRAP}" "${T}"
GUARD_RC=0
[ "$(sha256sum "${T}" | cut -d' ' -f1)" = "${WANT_SHA}" ] || GUARD_RC=1
assert_exit 0 "${GUARD_RC}" "S18 genuine bootstrap passes the SHA-256 gate"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S18 nothing executed — server untouched"

# =============================================================================
section "S19 — updater invoked directly with a broken remote → honest guidance"
D="$(prep s19-directbroken)"
git clone -q "${REPO_URL}" "${D}/src"
git -C "${D}/src" remote set-url origin "file:///nonexistent-hanaso-remote"
(
  cd /
  export PATH="${MOCK}:${PATH}"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  export HANASO_SIM_DIR="${D}/sim" HANASO_REPO_URL="${REPO_URL}" HANASO_SRC_DIR="${D}/src"
  export HANASO_TARGET_SHA="2222222222222222222222222222222222222222"
  export HANASO_TARGET_VERSION="1.0.0-sim-ghost" HANASO_TARGET_BRANCH="tl08-cta01"
  export HANASO_DEPLOY_DIR="${D}/deploy" HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
  export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
  export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
  export HANASO_KOTODAMA_URL="https://kotodama.ir/"
  bash "${REPO_ROOT}/infra/deploy/update-hanaso.sh"
) > "${D}/out.log" 2>&1
echo "$?" > "${D}/exit.code"
assert_exit_nonzero "$(exit_of "${D}")" "S19 updater fails"
assert_out "${D}" "ANONYMOUS HTTPS" "S19 anonymous/public guidance (no credential advice)"
assert_out "${D}" "re-privatized" "S19 visibility guidance"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "S19 .env untouched"
assert_not_called "${D}" "docker build" "S19 no build attempted"

# =============================================================================
section "S20 — SRC_DIR pointed at the deploy dir → refused (separation guard)"
D="$(prep s20-samepath)"
run_boot_url "${D}" "${REPO_URL}" "HANASO_SRC_DIR=${D}/deploy"
assert_exit_nonzero "$(exit_of "${D}")" "S20 bootstrap fails"
assert_out "${D}" "refusing to delete or overwrite" "S20 separation guard fired (deploy dir not a clone → refused)"
assert_file "${D}/deploy/smoke.sh" "S20 deploy dir untouched"
assert_file "${D}/deploy/.env" "S20 deploy .env untouched"
assert_not_called "${D}" "docker build" "S20 no build attempted"


# =============================================================================
section "G1 — HANASO-16 three-tier gate: PRE-EXISTING public outage (the TL-14 incident) → ABORT before any change"
D="$(prep g1-preexisting)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=broken\nSIM_EXTERNAL=broken\nSIM_KOTODAMA_BEFORE=000\nSIM_KOTODAMA_AFTER=000\n' >> "${D}/sim/config.env"
run_update_direct "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "G1 updater aborts (public endpoint verifiably broken at baseline)"
assert_out "${D}" "INGRESS_PREEXISTING_BROKEN" "G1 explicit pre-existing-front-line diagnosis"
assert_out "${D}" "aborting BEFORE any change" "G1 nothing-changed guarantee stated"
assert_out "${D}" "tier 3 independent verdict (baseline): BROKEN" "G1 independent tier-3 evidence recorded"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "G1 .env untouched"
assert_not_called "${D}" "docker build" "G1 no build attempted"
assert_not_called "${D}" "compose run --rm migrate" "G1 no migrate ran"
assert_not_called "${D}" "compose exec worker db-cli backup" "G1 no backup needed (nothing will change)"

# =============================================================================
section "G2 — escape hatch: ALLOW_UNVERIFIED_INGRESS=1 deploys anyway; gate classifies, smoke goes local"
D="$(prep g2-allowunverified)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=broken\nSIM_EXTERNAL=broken\n' >> "${D}/sim/config.env"
(
  cd /
  export PATH="${MOCK}:${PATH}"
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  export HANASO_SIM_DIR="${D}/sim" HANASO_REPO_URL="${REPO_URL}" HANASO_SRC_DIR="${D}/src"
  export HANASO_TARGET_SHA="${TARGET_SHA}" HANASO_TARGET_VERSION="1.0.0-sim-target" HANASO_TARGET_BRANCH="tl08-cta01"
  export HANASO_DEPLOY_DIR="${D}/deploy" HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
  export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
  export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
  export HANASO_KOTODAMA_URL="https://kotodama.ir/"
  export HANASO_CHECKHOST_DELAY=0 HANASO_ALLOW_UNVERIFIED_INGRESS=1
  bash "${REPO_ROOT}/infra/deploy/update-hanaso.sh"
) > "${D}/out.log" 2>&1
echo "$?" > "${D}/exit.code"
assert_exit 0 "$(exit_of "${D}")" "G2 escape-hatch deploy completes"
assert_out "${D}" "deploying DESPITE the broken/unverifiable public path" "G2 escape hatch acknowledged"
assert_out "${D}" "Keeping the release" "G2 gate keeps the healthy release (no pointless rollback)"
assert_out "${D}" "smoke runs against http://127.0.0.1:3100" "G2 smoke rerouted to the local app plane"
assert_out "${D}" "INGRESS_PREEXISTING_BROKEN_PUBLIC_DOWN" "G2 final classification recorded"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "G2 release actually deployed"

# =============================================================================
section "G3 — hairpin artifact: public self-probe fails, independent tier 3 says the world CAN reach it → release stands"
D="$(prep g3-hairpin)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=broken\nSIM_EXTERNAL=ok\n' >> "${D}/sim/config.env"
run_update_direct "${D}"
assert_exit 0 "$(exit_of "${D}")" "G3 hairpin-artifact deploy completes"
assert_out "${D}" "hairpin/self-probe network artifact" "G3 artifact correctly identified"
assert_out "${D}" "PUBLIC_OK_SELF_PROBE_ARTIFACT" "G3 classification recorded"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "G3 release deployed (no rollback)"

# =============================================================================
section "G4 — tier 3 unavailable (check-host API down) → honest EXTERNAL_UNVERIFIED, no rollback"
D="$(prep g4-unverified)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=broken\nSIM_CHECKHOST_API=down\n' >> "${D}/sim/config.env"
run_update_direct "${D}"
assert_exit 0 "$(exit_of "${D}")" "G4 unverified-external deploy completes"
assert_out "${D}" "EXTERNAL_UNVERIFIED" "G4 status recorded explicitly"
assert_out "${D}" "verify from a phone/other network" "G4 owner follow-up hint printed"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "G4 release deployed (no rollback)"

# =============================================================================
section "G5 — healthy baseline, public path BREAKS in the deploy window → REAL rollback"
D="$(prep g5-deploybroke)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=after-swap-broken\nSIM_EXTERNAL=broken\n' >> "${D}/sim/config.env"
run_update_direct "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "G5 updater fails (deploy broke the public path)"
assert_out "${D}" "this deploy window broke the public path" "G5 deploy-caused breakage identified"
assert_out "${D}" "rolling the APP back" "G5 app rolled back"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "G5 .env restored to the previous image"

# =============================================================================
section "G6 — tier 2a (ingress-direct) broken at baseline with tier 3 unverifiable → abort before any change"
D="$(prep g6-ingresslocal)"
git clone -q "${REPO_URL}" "${D}/src"
printf 'SIM_PUBLIC_SELF=broken\nSIM_INGRESS_DIRECT=broken\nSIM_CHECKHOST_API=down\n' >> "${D}/sim/config.env"
run_update_direct "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "G6 updater aborts (proxy broken on the host)"
assert_out "${D}" "tier 2a ingress-direct broken at baseline" "G6 local ingress diagnosis"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "G6 .env untouched"
assert_not_called "${D}" "docker build" "G6 no build attempted"

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
  if grep -qE 'rm -rf' "${d}/out.log" 2>/dev/null; then
    bad "rm -rf appeared in output (${d})"; VIOL=1
  fi
done
[ "${VIOL}" = 0 ] && ok "no 'compose down', no non-hanaso containers, no global docker mutations, no rm -rf in any scenario"

# =============================================================================
printf '\n══════════════════════════════════════════════\n'
printf '  DEPLOY-04 SANDBOX TESTS: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf '  work dir: %s\n' "${ROOT}"
if [ "${KEEP}" = 1 ]; then
  printf '  (kept for inspection — remove manually)\n'
else
  rm -rf "${ROOT}" && printf '  (work dir cleaned)\n'
fi
[ "${FAIL}" = 0 ]
