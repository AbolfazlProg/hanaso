#!/usr/bin/env bash
# =============================================================================
# run-deploy05.sh — sandbox test driver for the ONE-COMMAND DELIVERY layer (v2)
# TASK-HANASO-DEPLOY-05 §4 (2026-11-08) · v2 harness for the v10.1 heredoc
# block (TASK-HANASO-18, 2026-11-12)
# =============================================================================
# WHAT THIS TESTS (and how it stays honest):
#   The EXACT production command block is extracted from OWNER-COMMAND.txt at
#   the repository root (the multi-line `bash -s -- <<'HANASO-V10'` heredoc)
#   and executed UNMODIFIED (only its environment is redirected):
#     - the GitHub download URLs (api.github.com / codeload.github.com — the
#       two v10 paths; raw was dropped in v10) are served by mock-bin/curl from
#       the REAL git blobs of a local BARE MIRROR of this repository
#       (HANASO_SIM_ORIGIN) — so the bootstrap SHA-256 pinned in the command
#       matches byte-for-byte and the pinned tooling commit resolves;
#     - the bootstrap's git transport is redirected with HANASO_REPO_URL to the
#       same mirror (anonymous file:// — GIT_CONFIG_GLOBAL/SYSTEM = /dev/null,
#       GIT_TERMINAL_PROMPT=0): real ls-remote / clone / fetch / worktree on the
#       real repository content, zero credentials;
#     - docker/curl/df are the mock-bin stubs (run-deploy04.sh mechanics), so the
#       updater runs its REAL control flow against a simulated shared-VPS stack
#       whose fixture mirrors the REAL production state: live image
#       ghcr.io/abolfazlprog/hanaso:777fb2b6… (1.0.0-hanaso16-r01 — verified
#       live via /api/health on 2026-11-12) → target 1.0.0-hanaso17-r01 @
#       3f41f6ee… (TASK-HANASO-17: home dashboard, unified navigation, lesson
#       replay, one-CTA completion, 7-day resume expiration — the actual
#       planned update).
#   It never touches real Docker, the real GitHub, the VPS, or KOTODAMA.
#
# Scenario map (delivery layer — the updater mechanics are covered by
# run-deploy04.sh; here the entrypoint is always the REAL command block):
#   P0  static safety of the command text (heredoc invocation `bash -s --` +
#       QUOTED delimiter, R/W/D pins present & repo-consistent, subcommand
#       passthrough "$@", both v10 paths present, raw paths absent, TLS never
#       weakened, no latest/token)
#   P1  happy path via api.github.com (full end-to-end update to the real pin)
#   P2  api 403 (rate limit) → codeload fallback (ordering asserted)
#   P3  api TLS-blocked → codeload fallback
#   P4  api + codeload BOTH down → honest abort, NOTHING executed
#   P5  api down + codeload serves a corrupt tarball → extraction-failure abort,
#       NOTHING executed
#   P6  tampered bootstrap content → SHA-256 gate rejects, NOTHING executed
#   P7  HTML error page instead of the script → SHA-256 gate rejects
#   P8  idempotent re-run of the same command block (no-op, no rebuild)
#   P9  subcommand passthrough via `bash -s -- status`: read-only report
#   P10 update → `bash -s -- rollback` → update round-trip
#   P11 migrate failure after the swap → automatic rollback
#   P12 global KOTODAMA / TLS / isolation sweep across ALL scenarios (incl.
#       "no raw path, no --resolve anywhere" — the v10 contract)
#
# Usage: bash infra/deploy/sandbox-tests/run-deploy05.sh [--keep]
# Exit 0 = all scenarios PASS.  Requires OWNER-COMMAND.txt at the repo root
# (present from the DEPLOY-05 docs commit / branch tip).
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
MOCK="${HERE}/mock-bin"
OWNER_CMD_FILE="${REPO_ROOT}/OWNER-COMMAND.txt"
BOOTSTRAP="${REPO_ROOT}/infra/deploy/bootstrap-hanaso.sh"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

# real production constants (fixture mirrors them — verified live 2026-11-12)
OLD_SHA="777fb2b61afdc9021090d60ad23986c93c7d4d66"
OLD_VERSION="1.0.0-hanaso16-r01"
TARGET_SHA_REAL="3f41f6ee510e28914934ddc83375a0e1d49405a3"
TARGET_VERSION_REAL="1.0.0-hanaso17-r01"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${OLD_SHA}"
NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${TARGET_SHA_REAL}"

ROOT="$(mktemp -d /tmp/hanaso-deploy05.XXXXXX)"
PASS=0; FAIL=0

ok()  { PASS=$((PASS + 1)); printf '      ✔ %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '      ✘ %s\n' "$1"; }
section() { printf '\n── %s ──────────────────────────────────────────\n' "$1"; }

assert_exit() { # want got desc
  if [ "$1" = "$2" ]; then ok "$3 (exit=$2)"; else bad "$3 — want exit $1, got exit $2"; fi
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
calls_has()        { grep -qF -- "$2" "$1/sim/calls.log" 2>/dev/null; }
assert_called()    { if calls_has "$1" "$2"; then ok "$3"; else bad "$3 (missing call: $2)"; fi; }
assert_not_called(){ if calls_has "$1" "$2"; then bad "$3 (forbidden call present: $2)"; else ok "$3"; fi; }
out_has()          { grep -qF -- "$2" "$1/out.log" 2>/dev/null; }
assert_out()       { if out_has "$1" "$2"; then ok "$3 (output has: $2)"; else bad "$3 (output missing: $2)"; fi; }
assert_no_file()   { if [ ! -e "$1" ]; then ok "$2"; else bad "$2 (exists but must NOT: $1)"; fi; }
assert_is_git()    { if git -C "$1" rev-parse --is-inside-work-tree >/dev/null 2>&1; then ok "$2"; else bad "$2 (not a git work tree: $1)"; fi; }
line_of() { grep -nF -- "$2" "$1/sim/calls.log" 2>/dev/null | head -1 | cut -d: -f1; }
assert_before() { # dir needleA needleB desc
  local a b; a="$(line_of "$1" "$2")"; b="$(line_of "$1" "$3")"
  if [ -n "${a}" ] && [ -n "${b}" ] && [ "${a}" -lt "${b}" ]; then ok "$4 (call order ok)"; else bad "$4 — '$2' not before '$3' (lines: '${a:-none}'/'${b:-none}')"; fi
}

# -----------------------------------------------------------------------------
# fixture origin: a bare mirror of the REAL repository (anonymous origin).
# The command block's REAL pinned tooling SHA and REAL bootstrap SHA-256 resolve
# against it exactly like against github.com.
# -----------------------------------------------------------------------------
section "fixture — bare mirror of the real repository (anonymous origin)"
if [ ! -f "${OWNER_CMD_FILE}" ]; then
  echo "FATAL: ${OWNER_CMD_FILE} not found — run from a checkout that includes the DEPLOY-05 docs (branch tip)." >&2
  exit 1
fi
# The v10.1 production block: the whole heredoc, first line to delimiter line.
CMD="$(sed -n "/^bash -s -- <<'HANASO-V10'$/,/^HANASO-V10\$/p" "${OWNER_CMD_FILE}")"
if [ -z "${CMD}" ]; then
  echo "FATAL: v10.1 heredoc block (bash -s -- <<'HANASO-V10' … HANASO-V10) not found in ${OWNER_CMD_FILE}" >&2
  exit 1
fi
R="$(printf '%s\n' "${CMD}" | grep -oE '^R=[0-9a-f]{40}$' | cut -d= -f2)"
W="$(printf '%s\n' "${CMD}" | grep -oE '^W=[0-9a-f]{64}$' | cut -d= -f2)"
D="$(printf '%s\n' "${CMD}" | grep -oE '^D=[0-9a-f]{40}$' | cut -d= -f2)"

MIRROR="${ROOT}/origin-mirror.git"
git clone -q --bare "file://${REPO_ROOT}" "${MIRROR}" || { echo "FATAL: mirror clone failed" >&2; exit 1; }
REPO_URL="file://${MIRROR}"
echo "  origin mirror : ${REPO_URL}"
echo "  tooling pin   : ${R:-<EXTRACT FAILED>}"
echo "  bootstrap sha : ${W:-<EXTRACT FAILED>}"
echo "  target pin    : ${D:-<EXTRACT FAILED>}"

# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------
prep() { # scenario-name → $ROOT/<name>/{deploy,sim}; fixture = REAL production state
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
SIM_PREV_VERSION=${OLD_VERSION}
EOF
  cat > "${d}/sim/state.env" <<EOF
CURRENT_IMAGE=${OLD_IMAGE}
CURRENT_COMMIT=${OLD_SHA}
CURRENT_VERSION=${OLD_VERSION}
PHASE=before
EOF
  touch "${d}/sim/calls.log"
  echo "${d}"
}

run_ol() { # scenario-dir [subcommand] — run the REAL command block, env redirected.
             # A subcommand (status/rollback) is injected into the FIRST line
             # exactly the way the owner is told to do it in OWNER-COMMAND.txt:
             #   bash -s -- status <<'HANASO-V10'
  local d="$1"; shift
  local sub="${1:-}"
  local runner="${CMD}"
  if [ -n "${sub}" ]; then
    runner="$(printf '%s\n' "${CMD}" | sed -e "1s/^bash -s -- <</bash -s -- ${sub} <</")"
  fi
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export GIT_CONFIG_GLOBAL=/dev/null
    export GIT_CONFIG_SYSTEM=/dev/null
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_SIM_ORIGIN="${MIRROR}"
    export HANASO_REPO_URL="${REPO_URL}"
    export HANASO_SRC_DIR="${d}/src"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    eval "${runner}"
  ) > "${d}/out.log" 2>&1
  echo "$?" > "${d}/exit.code"
}

exit_of() { cat "$1/exit.code" 2>/dev/null || echo 199; }

# =============================================================================
section "P0 — static safety of the production command block (no execution)"
FIRST_LINE="$(printf '%s\n' "${CMD}" | head -1)"
if [ "${FIRST_LINE}" = "bash -s -- <<'HANASO-V10'" ]; then
  ok "P0 invocation is the subcommand-capable heredoc (bash -s -- <<'HANASO-V10')"
else
  bad "P0 first line is '${FIRST_LINE}' — want bash -s -- <<'HANASO-V10'"
fi
if printf '%s\n' "${CMD}" | grep -qF -- 'HANASO_DEPLOY_SHA="$R" HANASO_TARGET_SHA="$D" bash "$T" "$@"'; then
  ok "P0 executes the verified bootstrap with pinned SHAs and subcommand passthrough (\"\$@\")"
else
  bad "P0 execution handoff with \"\$@\" passthrough not found"
fi
[ -n "${R}" ] && ok "P0 tooling SHA pin present (${R:0:12})" || bad "P0 tooling SHA pin MISSING"
[ -n "${W}" ] && ok "P0 bootstrap SHA-256 pin present (${W:0:12})" || bad "P0 bootstrap SHA-256 pin MISSING"
[ -n "${D}" ] && ok "P0 target SHA pin present (${D:0:12})" || bad "P0 target SHA pin MISSING"
if [ -n "${D}" ] && [ "${D}" = "${TARGET_SHA_REAL}" ]; then
  ok "P0 target pin is the REAL release target ${TARGET_VERSION_REAL}"
else
  bad "P0 target pin ${D:-<none>} != fixture release target ${TARGET_SHA_REAL}"
fi
if [ -n "${R}" ] && [ -n "${D}" ] && [ "${R}" != "${D}" ]; then
  ok "P0 tooling pin and target pin are distinct commits"
else
  bad "P0 tooling pin == target pin (must be distinct)"
fi
if git -C "${REPO_ROOT}" cat-file -e "${R}^{commit}" 2>/dev/null; then
  ok "P0 pinned tooling commit exists in the repository"
else
  bad "P0 pinned tooling commit ${R} NOT in the repository"
fi
if git -C "${REPO_ROOT}" cat-file -e "${D}^{commit}" 2>/dev/null; then
  ok "P0 pinned target commit exists in the repository"
else
  bad "P0 pinned target commit ${D} NOT in the repository"
fi
PIN_SHA="$(git -C "${REPO_ROOT}" show "${R}:infra/deploy/bootstrap-hanaso.sh" 2>/dev/null | sha256sum | cut -d' ' -f1)"
if [ -n "${W}" ] && [ "${PIN_SHA}" = "${W}" ]; then
  ok "P0 bootstrap SHA-256 pin matches the real blob at the pinned commit"
else
  bad "P0 bootstrap SHA-256 pin mismatch: command pins ${W:0:16}, blob is ${PIN_SHA:0:16}"
fi
if git -C "${REPO_ROOT}" show "${R}:infra/deploy/bootstrap-hanaso.sh" 2>/dev/null | grep -qF -- "${D}"; then
  ok "P0 bootstrap at the tooling commit defaults to the same target pin (anti-drift)"
else
  bad "P0 bootstrap at ${R:0:12} does not reference target ${D:0:12}"
fi
if git -C "${REPO_ROOT}" show "${R}:infra/deploy/update-hanaso.sh" 2>/dev/null | grep -qF -- "${TARGET_VERSION_REAL}"; then
  ok "P0 updater at the tooling commit pins version ${TARGET_VERSION_REAL}"
else
  bad "P0 updater at ${R:0:12} does not pin ${TARGET_VERSION_REAL}"
fi
for frag in "api.github.com/repos/" "codeload.github.com/"; do
  if printf '%s\n' "${CMD}" | grep -qF -- "${frag}"; then ok "P0 delivery path present: ${frag}"; else bad "P0 delivery path MISSING: ${frag}"; fi
done
for frag in "raw.githubusercontent.com" "--resolve"; do
  if printf '%s\n' "${CMD}" | grep -qF -- "${frag}"; then bad "P0 dropped-v9 fragment still present: ${frag}"; else ok "P0 v9 fragment correctly absent: ${frag}"; fi
done
if printf '%s\n' "${CMD}" | grep -qF -- '| sha256sum -c -'; then
  ok "P0 real SHA-256 verification before execution (sha256sum -c -)"
else
  bad "P0 SHA-256 verification not found in the command"
fi
if printf '%s\n' "${CMD}" | grep -qF -- 'set -euo pipefail'; then
  ok "P0 strict mode (set -euo pipefail) at the top of the block"
else
  bad "P0 set -euo pipefail missing"
fi
FORBIDDEN=0
for frag in "--insecure" "--no-check-certificate" "-k " "latest" "ghp_" "token" "password" "wget"; do
  if printf '%s\n' "${CMD}" | grep -qiF -- "${frag}"; then bad "P0 FORBIDDEN fragment in command: ${frag}"; FORBIDDEN=1; fi
done
[ "${FORBIDDEN}" = 0 ] && ok "P0 no TLS-weakening / latest / token / wget fragments in the command"
TLS_SRC=0
for f in "${BOOTSTRAP}" "${REPO_ROOT}/infra/deploy/update-hanaso.sh" "${MOCK}/curl"; do
  if grep -qE -- '(^|[[:space:]])-[kK]([[:space:]]|$)|--insecure|--no-check-certificate' "${f}"; then
    bad "P0 TLS-weakening flag found in ${f}"; TLS_SRC=1
  fi
done
[ "${TLS_SRC}" = 0 ] && ok "P0 no TLS-weakening flags in bootstrap/updater/mock sources"

# =============================================================================
section "P1 — happy path via api.github.com → full update to the REAL pin"
D="$(prep p1-api)"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P1 command block exits 0"
assert_out "${D}" "bootstrap delivered via api.github.com" "P1 bootstrap delivered by path 1 (api) — path reported"
assert_out "${D}" "[hanaso] 2/3  verify SHA-256" "P1 real SHA-256 gate reached"
assert_is_git "${D}/src" "P1 source workspace created (anonymous clone of the mirror)"
assert_out "${D}" "target commit verified   : ${TARGET_SHA_REAL}" "P1 the REAL pinned target commit verified"
assert_out "${D}" "integrity OK" "P1 bootstrap byte-identical to the pinned tooling commit"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P1 .env switched to the real target image"
assert_called "${D}" "docker build" "P1 image built from the pinned commit"
assert_called "${D}" "compose run --rm migrate" "P1 one-shot migrate ran"
assert_out "${D}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P1 success banner with the real version"
assert_out "${D}" "${TARGET_VERSION_REAL}" "P1 health gate matched the real pinned version"
assert_out "${D}" "smoke: ALL GREEN" "P1 smoke passed"
assert_out "${D}" "KOTODAMA" "P1 KOTODAMA witness reported"
assert_not_called "${D}" "https://codeload.github.com/" "P1 no fallback needed (api served first)"

# =============================================================================
section "P2 — api 403 (rate limit, the sandbox's own live condition) → codeload"
D="$(prep p2-apifail)"
echo "SIM_DL_API=403" >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P2 command block exits 0 despite api 403"
assert_out "${D}" "api.github.com failed (real curl error above) — trying codeload.github.com" "P2 api failure noticed honestly"
assert_out "${D}" "The requested URL returned error: 403" "P2 the REAL curl error text is shown (not hidden)"
assert_out "${D}" "bootstrap delivered via codeload.github.com" "P2 bootstrap delivered by path 2 (codeload)"
assert_before "${D}" "https://api.github.com/" "https://codeload.github.com/" "P2 api tried BEFORE codeload"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P2 update completed via the fallback path"
assert_out "${D}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P2 success banner"

# =============================================================================
section "P3 — api TLS-blocked → codeload fallback"
D="$(prep p3-apitls)"
printf 'SIM_DL_API=tls\n' >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P3 command block exits 0 via codeload"
assert_out "${D}" "bootstrap delivered via codeload.github.com" "P3 bootstrap delivered by path 2 (codeload)"
assert_out "${D}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P3 success banner"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P3 update completed via the fallback path"

# =============================================================================
section "P4 — api + codeload BOTH down → honest abort, NOTHING executed"
D="$(prep p4-allfail)"
printf 'SIM_DL_API=403\nSIM_DL_CODELOAD=500\n' >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "P4 command block fails"
assert_out "${D}" "ALL bootstrap download paths failed (api.github.com and codeload.github.com)" "P4 honest all-paths-failed error"
assert_out "${D}" "The requested URL returned error: 403" "P4 real api error text visible"
assert_out "${D}" "The requested URL returned error: 500" "P4 real codeload error text visible"
assert_out "${D}" "NOTHING was executed or changed" "P4 explicit nothing-executed promise"
assert_no_file "${D}/src" "P4 source workspace NOT created"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "P4 .env untouched"
assert_not_called "${D}" "docker build" "P4 nothing executed on the 'server'"

# =============================================================================
section "P5 — api down + codeload serves a CORRUPT tarball → extraction abort"
D="$(prep p5-corrupt)"
printf 'SIM_DL_API=403\nSIM_DL_CODELOAD=corrupt\n' >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "P5 command block fails"
assert_out "${D}" "codeload tarball fetched but extraction FAILED" "P5 explicit extraction-failure error"
assert_out "${D}" "NOTHING was executed or changed" "P5 explicit nothing-executed promise"
assert_no_file "${D}/src" "P5 source workspace NOT created"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "P5 .env untouched"
assert_not_called "${D}" "docker build" "P5 no docker call at all"

# =============================================================================
section "P6 — tampered bootstrap content → REAL SHA-256 gate rejects it"
D="$(prep p6-tamper)"
echo "SIM_DL_TAMPER=1" >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "P6 command block fails"
assert_out "${D}" "FAILED" "P6 SHA-256 mismatch reported by sha256sum -c"
assert_no_file "${D}/src" "P6 source workspace NOT created"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "P6 .env untouched"
assert_not_called "${D}" "docker build" "P6 no docker call at all"

# =============================================================================
section "P7 — HTML error page instead of the script → SHA-256 gate rejects it"
D="$(prep p7-htmlpage)"
echo "SIM_DL_HTML=1" >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "P7 command block fails"
assert_out "${D}" "FAILED" "P7 proxy/gateway page rejected by the hash gate"
assert_no_file "${D}/src" "P7 nothing created"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "P7 .env untouched"

# =============================================================================
section "P8 — idempotent re-run of the same command block (no-op)"
D="$(prep p8-rerun)"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P8 first run exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P8 first run updated"
mv "${D}/sim/calls.log" "${D}/sim/calls.run1.log"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P8 second run exits 0"
assert_out "${D}" "already running target commit" "P8 second run is a no-op at the pinned target"
assert_not_called "${D}" "docker build" "P8 no rebuild on re-run"
assert_not_called "${D}" "compose run" "P8 no migrate re-run"
assert_not_called "${D}" "compose up" "P8 no container changes on re-run"

# =============================================================================
section "P9 — subcommand passthrough via first line: 'status' is read-only"
D="$(prep p9-status)"
run_ol "${D}" status
assert_exit 0 "$(exit_of "${D}")" "P9 status exits 0"
assert_out "${D}" "${OLD_VERSION}" "P9 reports the current (production) version"
assert_out "${D}" "${TARGET_VERSION_REAL}" "P9 reports the pinned target version"
assert_not_called "${D}" "docker build" "P9 no mutations"
assert_not_called "${D}" "compose run" "P9 no mutations (migrate)"
assert_env_unchanged "${D}/deploy" "${OLD_IMAGE}" "P9 .env untouched"
assert_is_git "${D}/src" "P9 source workspace created (needed to run the pinned updater)"

# =============================================================================
section "P10 — update → rollback → update round-trip through the command block"
D="$(prep p10-roundtrip)"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P10 update exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P10 .env at the new image"
run_ol "${D}" rollback
assert_exit 0 "$(exit_of "${D}")" "P10 rollback subcommand exits 0"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "P10 .env restored to the previous (production) image"
assert_out "${D}" "ROLLBACK app image" "P10 rollback banner"
run_ol "${D}"
assert_exit 0 "$(exit_of "${D}")" "P10 re-update after rollback exits 0"
assert_env_image "${D}/deploy" "${NEW_IMAGE}" "P10 .env back at the new image"

# =============================================================================
section "P11 — migrate failure after the swap → automatic rollback"
D="$(prep p11-migratefail)"
echo "SIM_MIGRATE_FAIL=1" >> "${D}/sim/config.env"
run_ol "${D}"
assert_exit_nonzero "$(exit_of "${D}")" "P11 command block fails"
assert_out "${D}" "rolling the APP back" "P11 automatic rollback fired"
assert_env_image "${D}/deploy" "${OLD_IMAGE}" "P11 .env restored to the previous image"
assert_out "${D}" "rolled back" "P11 rollback health gate passed"
assert_out "${D}" "Database backup from this run" "P11 DB backup still recorded (data protected)"

# =============================================================================
section "P12 — GLOBAL sweep: KOTODAMA / isolation / TLS / no-raw across ALL scenarios"
VIOL=0
for d in "${ROOT}"/p*/; do
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
  if grep -qE -- '(^|[[:space:]])-[kK]([[:space:]]|$)|--insecure|--no-check-certificate' "${d}/sim/calls.log" 2>/dev/null; then
    bad "TLS-weakening flag in a curl call (${d})"; VIOL=1
  fi
  if grep -q -- '--resolve' "${d}/sim/calls.log" 2>/dev/null; then
    bad "--resolve call present — raw paths are dropped in v10 (${d})"; VIOL=1
  fi
  if grep -q -- 'raw.githubusercontent.com' "${d}/sim/calls.log" 2>/dev/null; then
    bad "raw.githubusercontent.com called — raw paths are dropped in v10 (${d})"; VIOL=1
  fi
done
[ "${VIOL}" = 0 ] && ok "no compose down, no non-hanaso containers, no global docker mutations, no rm -rf, no TLS weakening, no raw path / no --resolve anywhere (the v10 contract)"

# =============================================================================
printf '\n══════════════════════════════════════════════\n'
printf '  DEPLOY-05 DELIVERY TESTS: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf '  work dir: %s\n' "${ROOT}"
if [ "${KEEP}" = 1 ]; then
  printf '  (kept for inspection — remove manually)\n'
else
  rm -rf "${ROOT}" && printf '  (work dir cleaned)\n'
fi
[ "${FAIL}" = 0 ]
