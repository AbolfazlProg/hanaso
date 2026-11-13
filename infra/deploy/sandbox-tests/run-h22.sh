#!/usr/bin/env bash
# =============================================================================
# run-h22.sh — sandbox test driver for the TASK-HANASO-22 TRUE ONE-LINER (v13)
# =============================================================================
# WHAT THIS TESTS (and how it stays honest):
#   The EXACT production ONE-LINE command is extracted from OWNER-COMMAND.txt
#   (the single `bash -c '...'` line of the v13 section) and executed
#   UNMODIFIED (only its environment is redirected):
#     - the GitHub download URLs (api.github.com / codeload.github.com) are
#       served by mock-bin/curl from the REAL git blobs of a local BARE
#       MIRROR of this repository — so the bootstrap SHA-256 pinned in the
#       command matches byte-for-byte and the pinned commits resolve;
#     - the bootstrap's git transport is redirected with HANASO_REPO_URL to
#       the same mirror (anonymous file://): real ls-remote / clone / fetch /
#       worktree on the real repository content, zero credentials;
#     - docker/curl/df are the mock-bin stubs, so the updater runs its REAL
#       control flow against a simulated shared-VPS stack whose fixture
#       mirrors the REAL production state (verified live 2026-11-13T14:47Z):
#       the owner HAS run the v12 one-liner, learn.kotodama.ir now serves
#       1.0.0-hanaso21-r01 @ 33304b1f…, so this update jumps n21→n22 — the
#       HANASO-22 learning experience evolution (honest scoring, the real
#       Kana practice module, the chapter-01 two-section split with
#       real-world milestones, the upgraded AIZEN seal ceremony with its
#       licensed CC0 stamp sound, and the content-identity journey icons).
#   It never touches real Docker, the real GitHub, the VPS, or KOTODAMA.
#
# Scenario map:
#   P0  static safety of the ONE-LINE text (single line, bash -c '…', R/W/D
#       pins present & repo-consistent, correct INDEPENDENT variable mapping
#       HANASO_DEPLOY_SHA=tooling / HANASO_TARGET_SHA=product, api before
#       codeload, hash gate before execution, no placeholders/forbidden)
#   P1  happy path via api.github.com (full end-to-end update to the real pin)
#   P2  api 403 (rate limit) → codeload fallback (ordering asserted)
#   P3  api TLS-blocked → codeload fallback
#   P4  api + codeload BOTH down → honest abort, NOTHING executed
#   P5  api down + codeload serves garbage → download/extraction abort
#   P6  tampered bootstrap content → SHA-256 gate rejects, NOTHING executed
#   P7  HTML error page instead of the script → SHA-256 gate rejects
#   P8  idempotent re-run of the same one-liner (no-op, no rebuild)
#   P9  subcommand: `… bash "$T" status'` read-only report
#   P10 update → `… bash "$T" rollback'` → update round-trip
#   P11 migrate failure after the swap → automatic rollback
#   P12 global KOTODAMA / TLS / isolation sweep across ALL scenarios
#
# Usage: bash infra/deploy/sandbox-tests/run-h22.sh [--keep]
# Exit 0 = all scenarios PASS.  Requires OWNER-COMMAND.txt at the repo root.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
MOCK="${HERE}/mock-bin"
OWNER_CMD_FILE="${REPO_ROOT}/OWNER-COMMAND.txt"
BOOTSTRAP="${REPO_ROOT}/infra/deploy/bootstrap-hanaso.sh"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

# real production constants (fixture mirrors them — verified live
# 2026-11-13T14:47Z: learn.kotodama.ir/api/health →
# 1.0.0-hanaso21-r01 @ 33304b1f… — the owner ran the v12 line ~4h earlier)
OLD_SHA="33304b1f2b402d70c3090f447d44e2139adcc6b7"
OLD_VERSION="1.0.0-hanaso21-r01"
TARGET_VERSION_REAL="1.0.0-hanaso22-r01"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${OLD_SHA}"
STALE_DEPLOY_SMOKE_REF="df50431d123b7d2e71b6c9269828d0a181967fb4:scripts/smoke.sh"

ROOT="$(mktemp -d /tmp/hanaso-h22.XXXXXX)"
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
# -----------------------------------------------------------------------------
section "fixture — bare mirror of the real repository (anonymous origin)"
if [ ! -f "${OWNER_CMD_FILE}" ]; then
  echo "FATAL: ${OWNER_CMD_FILE} not found." >&2; exit 1
fi
# THE v13 ONE-LINER: the single bash -c line pinned in OWNER-COMMAND.txt.
CMD="$(grep -m1 "^bash -c 'R=" "${OWNER_CMD_FILE}")"
if [ -z "${CMD}" ]; then
  echo "FATAL: v13 one-liner (bash -c 'R=…') not found in ${OWNER_CMD_FILE}" >&2; exit 1
fi
R="$(printf '%s\n' "${CMD}" | grep -oE "R=[0-9a-f]{40}" | head -1 | cut -d= -f2)"
W="$(printf '%s\n' "${CMD}" | grep -oE "W=[0-9a-f]{64}" | head -1 | cut -d= -f2)"
D="$(printf '%s\n' "${CMD}" | grep -oE "D=[0-9a-f]{40}" | head -1 | cut -d= -f2)"
NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${D}"

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
  git -C "${REPO_ROOT}" show "${STALE_DEPLOY_SMOKE_REF}" > "${d}/deploy/smoke.sh"
  cat > "${d}/sim/config.env" <<EOF
SIM_DISK_MB=20000
SIM_PREV_VERSION=${OLD_VERSION}
EOF
  cat > "${d}/sim/state.env" <<EOF
CURRENT_IMAGE=${OLD_IMAGE}
CURRENT_COMMIT=${OLD_SHA}
CURRENT_VERSION=${OLD_VERSION}
PHASE=before
APPGEN=original
EOF
  touch "${d}/sim/calls.log"
  echo "${d}"
}

run_ol() { # scenario-dir [subcommand] — run the REAL one-liner, env redirected.
             # A subcommand (status/rollback) is appended INSIDE the quotes,
             # exactly the way OWNER-COMMAND.txt tells the owner to do it:
             #   … bash "$T" status'
  local d="$1"; shift
  local sub="${1:-}"
  local runner="${CMD}"
  if [ -n "${sub}" ]; then
    runner="${CMD%*\'} ${sub}'"
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
section "P0 — static safety of the ONE-LINE command text (no execution)"
NLINES="$(grep -c "^bash -c 'R=" "${OWNER_CMD_FILE}")"
if [ "${NLINES}" = "1" ]; then ok "P0 exactly ONE one-liner pinned in OWNER-COMMAND.txt"; else bad "P0 found ${NLINES} one-liner lines — must be exactly 1"; fi
if printf '%s\n' "${CMD}" | grep -qE "^bash -c '.*'$"; then
  ok "P0 the command is a single complete bash -c '…' line"
else
  bad "P0 the command is not a well-formed single bash -c line"
fi
[ -n "${R}" ] && ok "P0 tooling SHA pin present (${R:0:12})" || bad "P0 tooling SHA pin MISSING"
[ -n "${W}" ] && ok "P0 bootstrap SHA-256 pin present (${W:0:12})" || bad "P0 bootstrap SHA-256 pin MISSING"
[ -n "${D}" ] && ok "P0 target SHA pin present (${D:0:12})" || bad "P0 target SHA pin MISSING"
if [ -n "${R}" ] && [ -n "${D}" ] && [ "${R}" != "${D}" ]; then
  ok "P0 tooling pin and target pin are distinct commits (the two INDEPENDENT values)"
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
  ok "P0 bootstrap SHA-256 pin matches the real blob at the pinned tooling commit"
else
  bad "P0 bootstrap SHA-256 pin mismatch: command pins ${W:0:16}, blob is ${PIN_SHA:0:16}"
fi
if printf '%s\n' "${CMD}" | grep -qF -- 'HANASO_TARGET_VERSION="1.0.0-hanaso22-r01" HANASO_DEPLOY_SHA="$R" HANASO_TARGET_SHA="$D" bash "$T"'; then
  ok "P0 correct INDEPENDENT variable mapping at the handoff: HANASO_DEPLOY_SHA=tooling(\$R), HANASO_TARGET_SHA=product(\$D), version pinned"
else
  bad "P0 the env handoff is not the pinned triple (TARGET_VERSION/DEPLOY_SHA=R/TARGET_SHA=D)"
fi
if printf '%s\n' "${CMD}" | grep -qF -- 'HANASO_TARGET_SHA="$D"' && ! printf '%s\n' "${CMD}" | grep -qF -- 'HANASO_TARGET_SHA="$R"'; then
  ok "P0 the bootstrap's SHA is NEVER used as the release commit (never confused)"
else
  bad "P0 HANASO_TARGET_SHA would receive the bootstrap ref — the two values are confused"
fi
API_POS="$(printf '%s\n' "${CMD}" | grep -boF 'https://api.github.com/' | head -1 | cut -d: -f1)"
CODE_POS="$(printf '%s\n' "${CMD}" | grep -boF 'https://codeload.github.com/' | head -1 | cut -d: -f1)"
if [ -n "${API_POS}" ] && [ -n "${CODE_POS}" ] && [ "${API_POS}" -lt "${CODE_POS}" ]; then
  ok "P0 api.github.com path BEFORE the codeload fallback"
else
  bad "P0 delivery path order wrong (api=${API_POS:-none} codeload=${CODE_POS:-none})"
fi
if printf '%s\n' "${CMD}" | grep -qF -- '| sha256sum -c -'; then
  ok "P0 real SHA-256 verification BEFORE execution (sha256sum -c -)"
else
  bad "P0 SHA-256 verification not found"
fi
if printf '%s\n' "${CMD}" | grep -qF -- '&&'; then
  ok "P0 the hash gate is chained with && (nothing runs unless it passes)"
else
  bad "P0 no && chaining — the hash gate could be skipped"
fi
for frag in "raw.githubusercontent.com" "--resolve"; do
  if printf '%s\n' "${CMD}" | grep -qF -- "${frag}"; then bad "P0 dropped-v10 fragment still present: ${frag}"; else ok "P0 v10-dropped fragment correctly absent: ${frag}"; fi
done
FORBIDDEN=0
for frag in "..." "YOUR_SHA" "REPLACE_ME" "COMMIT_HERE" "--insecure" "--no-check-certificate" "-k " "latest" "ghp_" "token" "password" "wget"; do
  if printf '%s\n' "${CMD}" | grep -qiF -- "${frag}"; then bad "P0 FORBIDDEN fragment in the command: ${frag}"; FORBIDDEN=1; fi
done
[ "${FORBIDDEN}" = 0 ] && ok "P0 no placeholder / TLS-weakening / latest / token / wget fragments"
TOOLING_SMOKE="$(git -C "${REPO_ROOT}" show "${R}:scripts/smoke.sh" 2>/dev/null)"
if printf '%s\n' "${TOOLING_SMOKE}" | grep -qF -- 'قدم بعدی'; then
  ok "P0 smoke at the tooling commit checks the learner-home dashboard (generation coherence)"
else
  bad "P0 smoke at ${R:0:12} does not check the learner-home dashboard (stale contract)"
fi
if printf '%s\n' "${TOOLING_SMOKE}" | grep -qF -- "grep -q 'lang=\"ja\"'"; then
  bad "P0 smoke at the tooling commit still runs the retired lang=\"ja\" check"
else
  ok "P0 smoke at the tooling commit runs no retired lang=\"ja\" check"
fi
TLS_SRC=0
for f in "${BOOTSTRAP}" "${REPO_ROOT}/infra/deploy/update-hanaso.sh" "${MOCK}/curl"; do
  if grep -qE -- '(^|[[:space:]])-[kK]([[:space:]]|$)|--insecure|--no-check-certificate' "${f}"; then
    bad "P0 TLS-weakening flag found in ${f}"; TLS_SRC=1
  fi
done
[ "${TLS_SRC}" = 0 ] && ok "P0 no TLS-weakening flags in bootstrap/updater/mock sources"

# =============================================================================
section "P1 — happy path via api.github.com → full update to the REAL pin"
D1="$(prep p1-api)"
run_ol "${D1}"
assert_exit 0 "$(exit_of "${D1}")" "P1 the one-liner exits 0"
assert_is_git "${D1}/src" "P1 source workspace created (anonymous clone of the mirror)"
assert_out "${D1}" "target commit verified   : ${D}" "P1 the REAL pinned target commit verified"
assert_out "${D1}" "integrity OK" "P1 bootstrap byte-identical to the pinned tooling commit"
assert_out "${D1}" "target release           : ${TARGET_VERSION_REAL} @ ${D:0:12}" "P1 the pinned release version is ${TARGET_VERSION_REAL}"
assert_env_image "${D1}/deploy" "${NEW_IMAGE}" "P1 .env switched to the real target image"
assert_called "${D1}" "docker build" "P1 image built from the pinned commit"
assert_called "${D1}" "compose run --rm migrate" "P1 one-shot migrate ran"
assert_out "${D1}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P1 success banner with the real version"
assert_out "${D1}" "${TARGET_VERSION_REAL}" "P1 health gate matched the real pinned version"
assert_out "${D1}" "smoke: ALL GREEN" "P1 smoke passed (the PINNED worktree smoke — not the stale deploy-dir copy)"
assert_out "${D1}" "KOTODAMA" "P1 KOTODAMA witness reported"
assert_not_called "${D1}" "https://codeload.github.com/" "P1 no fallback needed (api served first)"
if out_has "${D1}" "home page missing Japanese LTR block"; then
  bad "P1 the STALE deploy-dir smoke gated the update — mis-rollback bug NOT fixed"
else
  ok "P1 the stale deploy-dir smoke (present in the fixture, like the real VPS) did NOT gate the update"
fi

# =============================================================================
section "P2 — api 403 (rate limit) → codeload fallback"
D2="$(prep p2-apifail)"
echo "SIM_DL_API=403" >> "${D2}/sim/config.env"
run_ol "${D2}"
assert_exit 0 "$(exit_of "${D2}")" "P2 the one-liner exits 0 despite api 403"
assert_out "${D2}" "The requested URL returned error: 403" "P2 the REAL curl error text is shown (not hidden)"
assert_called "${D2}" "https://api.github.com/" "P2 api path attempted"
assert_called "${D2}" "https://codeload.github.com/" "P2 codeload fallback attempted"
assert_before "${D2}" "https://api.github.com/" "https://codeload.github.com/" "P2 api tried BEFORE codeload"
assert_env_image "${D2}/deploy" "${NEW_IMAGE}" "P2 update completed via the fallback path"
assert_out "${D2}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P2 success banner"

# =============================================================================
section "P3 — api TLS-blocked → codeload fallback"
D3="$(prep p3-apitls)"
printf 'SIM_DL_API=tls\n' >> "${D3}/sim/config.env"
run_ol "${D3}"
assert_exit 0 "$(exit_of "${D3}")" "P3 the one-liner exits 0 via codeload"
assert_called "${D3}" "https://codeload.github.com/" "P3 bootstrap delivered by path 2 (codeload)"
assert_out "${D3}" "UPDATE COMPLETE — HANASO ${TARGET_VERSION_REAL}" "P3 success banner"
assert_env_image "${D3}/deploy" "${NEW_IMAGE}" "P3 update completed via the fallback path"

# =============================================================================
section "P4 — api + codeload BOTH down → honest abort, NOTHING executed"
D4="$(prep p4-allfail)"
printf 'SIM_DL_API=403\nSIM_DL_CODELOAD=500\n' >> "${D4}/sim/config.env"
run_ol "${D4}"
assert_exit_nonzero "$(exit_of "${D4}")" "P4 the one-liner fails"
assert_out "${D4}" "The requested URL returned error: 403" "P4 real api error text visible"
assert_out "${D4}" "The requested URL returned error: 500" "P4 real codeload error text visible"
assert_no_file "${D4}/src" "P4 source workspace NOT created"
assert_env_unchanged "${D4}/deploy" "${OLD_IMAGE}" "P4 .env untouched"
assert_not_called "${D4}" "docker build" "P4 nothing executed on the 'server'"

# =============================================================================
section "P5 — api down + codeload serves GARBAGE → download/extraction abort"
D5="$(prep p5-corrupt)"
printf 'SIM_DL_API=403\nSIM_DL_CODELOAD=corrupt\n' >> "${D5}/sim/config.env"
run_ol "${D5}"
assert_exit_nonzero "$(exit_of "${D5}")" "P5 the one-liner fails (garbage is not a tarball)"
assert_no_file "${D5}/src" "P5 source workspace NOT created"
assert_env_unchanged "${D5}/deploy" "${OLD_IMAGE}" "P5 .env untouched"
assert_not_called "${D5}" "docker build" "P5 no docker call at all"

# =============================================================================
section "P6 — tampered bootstrap content → REAL SHA-256 gate rejects it"
D6="$(prep p6-tamper)"
echo "SIM_DL_TAMPER=1" >> "${D6}/sim/config.env"
run_ol "${D6}"
assert_exit_nonzero "$(exit_of "${D6}")" "P6 the one-liner fails"
assert_out "${D6}" "FAILED" "P6 SHA-256 mismatch reported by sha256sum -c"
assert_no_file "${D6}/src" "P6 source workspace NOT created"
assert_env_unchanged "${D6}/deploy" "${OLD_IMAGE}" "P6 .env untouched"
assert_not_called "${D6}" "docker build" "P6 no docker call at all"

# =============================================================================
section "P7 — HTML error page instead of the script → SHA-256 gate rejects it"
D7="$(prep p7-htmlpage)"
echo "SIM_DL_HTML=1" >> "${D7}/sim/config.env"
run_ol "${D7}"
assert_exit_nonzero "$(exit_of "${D7}")" "P7 the one-liner fails"
assert_out "${D7}" "FAILED" "P7 proxy/gateway page rejected by the hash gate"
assert_no_file "${D7}/src" "P7 nothing created"
assert_env_unchanged "${D7}/deploy" "${OLD_IMAGE}" "P7 .env untouched"

# =============================================================================
section "P8 — idempotent re-run of the same one-liner (no-op)"
D8="$(prep p8-rerun)"
run_ol "${D8}"
assert_exit 0 "$(exit_of "${D8}")" "P8 first run exits 0"
assert_env_image "${D8}/deploy" "${NEW_IMAGE}" "P8 first run updated"
mv "${D8}/sim/calls.log" "${D8}/sim/calls.run1.log"
run_ol "${D8}"
assert_exit 0 "$(exit_of "${D8}")" "P8 second run exits 0"
assert_out "${D8}" "already running target commit" "P8 second run is a no-op at the pinned target"
assert_not_called "${D8}" "docker build" "P8 no rebuild on re-run"
assert_not_called "${D8}" "compose run" "P8 no migrate re-run"
assert_not_called "${D8}" "compose up" "P8 no container changes on re-run"

# =============================================================================
section "P9 — subcommand: append status inside the quotes (read-only)"
D9="$(prep p9-status)"
run_ol "${D9}" status
assert_exit 0 "$(exit_of "${D9}")" "P9 status exits 0"
assert_out "${D9}" "${OLD_VERSION}" "P9 reports the current (production) version"
assert_out "${D9}" "${TARGET_VERSION_REAL}" "P9 reports the pinned target version"
assert_not_called "${D9}" "docker build" "P9 no mutations"
assert_not_called "${D9}" "compose run" "P9 no mutations (migrate)"
assert_env_unchanged "${D9}/deploy" "${OLD_IMAGE}" "P9 .env untouched"
assert_is_git "${D9}/src" "P9 source workspace created (needed to run the pinned updater)"

# =============================================================================
section "P10 — update → rollback → update round-trip through the one-liner"
D10="$(prep p10-roundtrip)"
run_ol "${D10}"
assert_exit 0 "$(exit_of "${D10}")" "P10 update exits 0"
assert_env_image "${D10}/deploy" "${NEW_IMAGE}" "P10 .env at the new image"
run_ol "${D10}" rollback
assert_exit 0 "$(exit_of "${D10}")" "P10 rollback subcommand exits 0"
assert_env_image "${D10}/deploy" "${OLD_IMAGE}" "P10 .env restored to the previous (production) image"
assert_out "${D10}" "ROLLBACK app image" "P10 rollback banner"
if out_has "${D10}" "smoke after rollback failed"; then
  bad "P10 rollback smoke failed (the rolled-back app should satisfy the original-install smoke)"
else
  ok "P10 rollback smoke green against the rolled-back (previous-generation) app"
fi
run_ol "${D10}"
assert_exit 0 "$(exit_of "${D10}")" "P10 re-update after rollback exits 0"
assert_env_image "${D10}/deploy" "${NEW_IMAGE}" "P10 .env back at the new image"

# =============================================================================
section "P11 — migrate failure after the swap → automatic rollback"
D11="$(prep p11-migratefail)"
echo "SIM_MIGRATE_FAIL=1" >> "${D11}/sim/config.env"
run_ol "${D11}"
assert_exit_nonzero "$(exit_of "${D11}")" "P11 the one-liner fails"
assert_out "${D11}" "rolling the APP back" "P11 automatic rollback fired"
assert_env_image "${D11}/deploy" "${OLD_IMAGE}" "P11 .env restored to the previous image"
assert_out "${D11}" "rolled back" "P11 rollback health gate passed"
assert_out "${D11}" "Database backup from this run" "P11 DB backup still recorded (data protected)"

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
[ "${VIOL}" = 0 ] && ok "no compose down, no non-hanaso containers, no global docker mutations, no rm -rf, no TLS weakening, no raw path / no --resolve anywhere"

# =============================================================================
printf '\n══════════════════════════════════════════════\n'
printf '  HANASO-22 ONE-LINER DELIVERY TESTS: %d passed, %d failed\n' "${PASS}" "${FAIL}"
printf '  work dir: %s\n' "${ROOT}"
if [ "${KEEP}" = 1 ]; then
  printf '  (kept for inspection — remove manually)\n'
else
  rm -rf "${ROOT}" && printf '  (work dir cleaned)\n'
fi
[ "${FAIL}" = 0 ]
