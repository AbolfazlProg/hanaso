#!/usr/bin/env bash
# =============================================================================
# run-install-h26.sh — TASK-HANASO-26 (A3): the FULL one-command install path,
# end to end, in the sandbox — with the FINAL pins and the FINAL one-liner.
#
# What makes this different from the stale run-h22.sh:
#   - the fixture .env mirrors the REAL current VPS state (the owner's
#     /opt/hanaso/.env predates TASK-24 → NO HANASO_SESSION_SECRET, NO
#     HANASO_LEGACY_TOKEN_CUTOFF — exactly the state that produced the v14
#     FATAL);
#   - the bootstrap under test is the NEW one (with prepare_security_env);
#   - assertions prove the whole chain: one-liner download paths (mocked
#     GitHub) → SHA-256 gate → clone/verify → ENV PREP (secret generated,
#     cutoff set once, no leak) → the updater's A3 gate PASSES (no FATAL) →
#     image build + compose swap + smoke → .env keeps every original var and
#     gains exactly the two keys → re-run is a clean no-op.
#
# Usage: bash infra/deploy/sandbox-tests/run-install-h26.sh [--keep]
# Exit 0 = all PASS.
# =============================================================================
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
MOCK="${HERE}/mock-bin"
OWNER_CMD_FILE="${REPO_ROOT}/OWNER-COMMAND.txt"

# --- the REAL production constants this release jumps from → to ------------
OLD_SHA="33304b1f2b402d70c3090f447d44e2139adcc6b7"          # live h21 (verified 2026-11-13)
OLD_VERSION="1.0.0-hanaso21-r01"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${OLD_SHA}"

ROOT="$(mktemp -d /tmp/hanaso-h26.XXXXXX)"
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf '      ✔ %s\n' "$1"; }
bad() { FAIL=$((FAIL+1)); printf '      ✘ %s\n' "$1"; }
section() { printf '\n── %s ──────────────────────────────────────────\n' "$1"; }
assert_exit() { if [ "$1" = "$2" ]; then ok "$3 (exit=$2)"; else bad "$3 — want exit $1, got exit $2"; fi; }
env_get() { sed -n "s/^$2=//p" "$1/.env" | tail -1; }
calls_has() { grep -qF -- "$2" "$1/sim/calls.log" 2>/dev/null; }
assert_called() { if calls_has "$1" "$2"; then ok "$3"; else bad "$3 (missing: $2)"; fi; }
out_has() { grep -qF -- "$2" "$1/out.log" 2>/dev/null; }
assert_out() { if out_has "$1" "$2"; then ok "$3"; else bad "$3 (missing output: $2)"; fi; }

# --- extract the FINAL one-liner from OWNER-COMMAND.txt ---------------------
if [ ! -f "${OWNER_CMD_FILE}" ]; then echo "FATAL: OWNER-COMMAND.txt missing" >&2; exit 1; fi
CMD="$(grep -m1 "^bash -c 'R=" "${OWNER_CMD_FILE}")"
[ -n "${CMD}" ] || { echo "FATAL: one-liner not found in OWNER-COMMAND.txt" >&2; exit 1; }
R="$(printf '%s\n' "${CMD}" | grep -oE "R=[0-9a-f]{40}" | cut -d= -f2)"
W="$(printf '%s\n' "${CMD}" | grep -oE "W=[0-9a-f]{64}" | cut -d= -f2)"
D="$(printf '%s\n' "${CMD}" | grep -oE "D=[0-9a-f]{40}" | cut -d= -f2)"
NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${D}"
section "pins"
echo "  tooling R=${R:0:12}  W=${W:0:12}…  target D=${D:0:12}"

# --- the fixture origin: a bare mirror of the REAL repository ----------------
MIRROR="${ROOT}/origin-mirror.git"
git clone -q --bare "file://${REPO_ROOT}" "${MIRROR}" || { echo "FATAL: mirror clone failed" >&2; exit 1; }

# --- P0: the tooling pin must contain the NEW bootstrap (with env prep) ------
section "P0 — static pins"
git -C "${REPO_ROOT}" show "${R}:infra/deploy/bootstrap-hanaso.sh" > "${ROOT}/boot-at-R.sh" 2>/dev/null
if grep -q "prepare_security_env" "${ROOT}/boot-at-R.sh"; then
  ok "tooling commit carries the env-prep bootstrap"
else
  bad "tooling commit ${R:0:12} does NOT carry prepare_security_env — wrong pin!"
fi
PIN_SHA="$(sha256sum "${ROOT}/boot-at-R.sh" | cut -d' ' -f1)"
[ "${PIN_SHA}" = "${W}" ] && ok "bootstrap SHA-256 pin W matches blob at R" || bad "W mismatch: ${W:0:12} vs ${PIN_SHA:0:12}"
git -C "${REPO_ROOT}" cat-file -e "${D}^{commit}" 2>/dev/null && ok "target D exists in repo" || bad "target D missing"

# --- prep(): fixture = the REAL current VPS state ---------------------------
prep() { # name → sets $D_* deploy+sim dirs; .env WITHOUT the TASK-24 keys
  local d="${ROOT}/$1"
  mkdir -p "${d}/sim" "${d}/deploy"
  cp "${REPO_ROOT}/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml" "${d}/deploy/docker-compose.yml"
  cat > "${d}/deploy/.env" <<EOF
# shared-VPS stack (real pre-TASK24 .env — like the owner's /opt/hanaso/.env)
HANASO_WEB_IMAGE=${OLD_IMAGE}
POSTGRES_USER=hanaso
POSTGRES_PASSWORD=vps-real-password
POSTGRES_DB=hanaso
EOF
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

run_oneliner() { # dir → runs the FINAL one-liner with mocked transports
  local d="$1"
  (
    cd /
    export PATH="${MOCK}:${PATH}"
    export GIT_CONFIG_GLOBAL=/dev/null
    export GIT_CONFIG_SYSTEM=/dev/null
    export HANASO_SIM_DIR="${d}/sim"
    export HANASO_SIM_ORIGIN="${MIRROR}"
    export HANASO_REPO_URL="file://${MIRROR}"
    export HANASO_SRC_DIR="${d}/src"
    export HANASO_DEPLOY_DIR="${d}/deploy"
    export HANASO_PUBLIC_BASE="https://learn.kotodama.ir"
    export HANASO_LOCAL_HEALTH="http://127.0.0.1:3100/api/health"
    export HANASO_LOCAL_READY="http://127.0.0.1:3100/api/ready"
    export HANASO_KOTODAMA_URL="https://kotodama.ir/"
    eval "${CMD}"
  ) > "${d}/out.log" 2>&1
}

# =============================================================================
section "T1 — full happy path: pre-TASK24 .env → env prep → update completes"
D1="$(prep t1)"
run_oneliner "${D1}"; RC=$?
assert_exit 0 "${RC}" "T1 one-liner exits 0"
assert_out "${D1}" "GENERATED (64 hex chars" "T1 env prep: secret GENERATED server-side"
assert_out "${D1}" "SET ONCE to now+14d" "T1 env prep: cutoff set once (now+14d)"
out_has "${D1}" "required key HANASO_SESSION_SECRET missing" && bad "T1 the v14 FATAL reproduced" || ok "T1 NO FATAL: updater's A3 gate satisfied"
SEC1="$(env_get "${D1}/deploy" HANASO_SESSION_SECRET)"
CUT1="$(env_get "${D1}/deploy" HANASO_LEGACY_TOKEN_CUTOFF)"
[[ "${SEC1}" =~ ^[0-9a-f]{64}$ ]] && ok "T1 .env now has a valid 64-hex secret" || bad "T1 secret invalid: '${SEC1:0:12}…'"
date -d "${CUT1}" >/dev/null 2>&1 && ok "T1 .env now has an ISO cutoff (${CUT1})" || bad "T1 cutoff invalid"
[ "$(env_get "${D1}/deploy" POSTGRES_USER)" = "hanaso" ] \
  && [ "$(env_get "${D1}/deploy" POSTGRES_PASSWORD)" = "vps-real-password" ] \
  && [ "$(env_get "${D1}/deploy" HANASO_WEB_IMAGE)" = "${NEW_IMAGE}" ] \
  && ok "T1 original vars preserved + image advanced to the new pin" || bad "T1 .env content wrong"
if grep -qF -- "${SEC1}" "${D1}/out.log"; then bad "T1 SECRET LEAKED in output"; else ok "T1 secret never printed"; fi
assert_called "${D1}" "docker build" "T1 image built from the pinned target"
assert_called "${D1}" "compose up: web worker" "T1 stack swapped (web recreated)"
assert_out "${D1}" "smoke: ALL GREEN" "T1 smoke green"
# updater reruns fetch nothing, bootstrap reruns keep values (T2 proves it)

section "T2 — re-run the SAME one-liner: no rotation, no cutoff extension, clean"
D2="${D1}"
SEC_BEFORE="$(env_get "${D2}/deploy" HANASO_SESSION_SECRET)"
CUT_BEFORE="$(env_get "${D2}/deploy" HANASO_LEGACY_TOKEN_CUTOFF)"
sleep 1
run_oneliner "${D2}"; RC=$?
assert_exit 0 "${RC}" "T2 re-run exits 0"
[ "$(env_get "${D2}/deploy" HANASO_SESSION_SECRET)" = "${SEC_BEFORE}" ] \
  && ok "T2 secret UNCHANGED" || bad "T2 secret rotated!"
[ "$(env_get "${D2}/deploy" HANASO_LEGACY_TOKEN_CUTOFF)" = "${CUT_BEFORE}" ] \
  && ok "T2 cutoff NOT extended" || bad "T2 cutoff extended!"
[ "$(env_get "${D2}/deploy" POSTGRES_PASSWORD)" = "vps-real-password" ] \
  && ok "T2 other vars still intact" || bad "T2 other vars lost"

section "T3 — secret present + cutoff missing (partial state)"
D3="$(prep t3)"
printf 'HANASO_SESSION_SECRET=%s\n' "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2" >> "${D3}/deploy/.env"
run_oneliner "${D3}"; RC=$?
assert_exit 0 "${RC}" "T3 exits 0"
[ "$(env_get "${D3}/deploy" HANASO_SESSION_SECRET)" = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2" ] \
  && ok "T3 pre-existing secret preserved verbatim" || bad "T3 secret replaced"
assert_out "${D3}" "SET ONCE to now+14d" "T3 cutoff created"
[ -n "$(env_get "${D3}/deploy" HANASO_LEGACY_TOKEN_CUTOFF)" ] && ok "T3 cutoff present" || bad "T3 cutoff missing"

section "T4 — both keys already present: idempotent, nothing rewritten"
D4="$(prep t4)"
printf 'HANASO_SESSION_SECRET=%s\nHANASO_LEGACY_TOKEN_CUTOFF=2026-12-01T00:00:00Z\n' \
  "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2" >> "${D4}/deploy/.env"
BEFORE_HASH="$(sha256sum "${D4}/deploy/.env" | cut -d' ' -f1)"
run_oneliner "${D4}"; RC=$?
assert_exit 0 "${RC}" "T4 exits 0"
assert_out "${D4}" "PRESERVED (never rotated)" "T4 existing secret preserved"
assert_out "${D4}" "PRESERVED (never extended)" "T4 existing cutoff preserved"
assert_out "${D4}" ".env unchanged (both TASK-24 keys already present)" "T4 no rewrite"

section "T5 — invalid secret: honest abort BEFORE the updater changes anything"
D5="$(prep t5)"
printf 'HANASO_SESSION_SECRET=not-hex!!\n' >> "${D5}/deploy/.env"
run_oneliner "${D5}"; RC=$?
[ "${RC}" != 0 ] && ok "T5 aborted (exit ${RC})" || bad "T5 invalid secret accepted"
assert_out "${D5}" "INVALID" "T5 clear invalid-secret message"
grep -qF -- "not-hex!!" "${D5}/out.log" && bad "T5 invalid value leaked" || ok "T5 value not leaked"
if calls_has "${D5}" "docker build"; then bad "T5 updater ran despite invalid secret"; else ok "T5 nothing built/touched"; fi
[ "$(env_get "${D5}/deploy" HANASO_WEB_IMAGE)" = "${OLD_IMAGE}" ] && ok "T5 image pin untouched" || bad "T5 image changed"
BK5="$(ls "${D5}"/deploy/.env.backup-* 2>/dev/null | head -1)"
[ -z "${BK5}" ] && ok "T5 no backup written (no rewrite happened)" || bad "T5 .env was rewritten"

section "T6 — security sweep across all scenarios"
for d in "${ROOT}"/t*; do
  name="$(basename "${d}")"
  if grep -qE '[0-9a-f]{64}' "${d}/out.log" 2>/dev/null; then
    bad "T6 ${name}: a 64-hex secret string appears in the output"
  else
    ok "T6 ${name}: no secret material in terminal output"
  fi
done
# KOTODAMA isolation: no docker stop/rm/restart of any shared service
if grep -rqE "docker (stop|rm|restart|kill)" "${ROOT}"/t*/sim/calls.log 2>/dev/null; then
  bad "T6 shared containers stopped/removed/restarted"
else
  ok "T6 no shared container stop/rm/restart (health URLs are read-only witnesses)"
fi

echo
echo "=== H26 FULL-INSTALL SANDBOX: ${PASS} passed, ${FAIL} failed ==="
if [ "${FAIL}" != 0 ]; then exit 1; fi
[ "${1:-}" = "--keep" ] || rm -rf "${ROOT}"
exit 0
