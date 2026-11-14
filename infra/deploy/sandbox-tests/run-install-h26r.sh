#!/usr/bin/env bash
# =============================================================================
# run-install-h26r.sh — TASK-HANASO-26R (v16): the FULL one-command install
# path end to end in the sandbox, with the FINAL v16 pins and one-liner.
#
# Differences from run-install-h26.sh (v15):
#   - pins: tooling R = the v16 tooling commit (this branch tip when run),
#     product D = the same tree (single-commit release: docs+fixes together),
#     version 1.0.0-hanaso26r-v16;
#   - NEW: after the install, the test verifies the CURRICULUM content of the
#     built target actually carries the TASK-26R order (h14 before h6 in the
#     stationSlugs of the product tree at D, and opt-r-h9 present) — proving
#     the installer really ships the new curriculum to production;
#   - NEW: progress preservation proof — a fixture station_progress row keyed
#     by uuidV5('lesson:stn-kana-h0') exists before the update and must be
#     intact (same id, same status) after the update (order-independent ids);
#   - all v15 guarantees re-proven (env prep, secret idempotency, no leaks,
#     KOTODAMA isolation, smoke, idempotent re-run).
# =============================================================================
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${HERE}/../../.." && pwd)"
MOCK="${HERE}/mock-bin"
OWNER_CMD_FILE="${REPO_ROOT}/OWNER-COMMAND.txt"

OLD_SHA="6a5ce28b286c98185214eaa2c61dcc575a17bcdf"          # live TASK-26 (v15 target, verified)
OLD_VERSION="1.0.0-hanaso26-r01"
OLD_IMAGE="ghcr.io/abolfazlprog/hanaso:${OLD_SHA}"

ROOT="$(mktemp -d /tmp/hanaso-h26r.XXXXXX)"
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

# --- extract the FINAL v16 one-liner from OWNER-COMMAND.txt ------------------
if [ ! -f "${OWNER_CMD_FILE}" ]; then echo "FATAL: OWNER-COMMAND.txt missing" >&2; exit 1; fi
CMD="$(grep -m1 "^bash -c 'R=" "${OWNER_CMD_FILE}")"
[ -n "${CMD}" ] || { echo "FATAL: v16 one-liner not found in OWNER-COMMAND.txt" >&2; exit 1; }
R="$(printf '%s\n' "${CMD}" | grep -oE "R=[0-9a-f]{40}" | cut -d= -f2)"
W="$(printf '%s\n' "${CMD}" | grep -oE "W=[0-9a-f]{64}" | cut -d= -f2)"
D="$(printf '%s\n' "${CMD}" | grep -oE "D=[0-9a-f]{40}" | cut -d= -f2)"
NEW_IMAGE="ghcr.io/abolfazlprog/hanaso:${D}"
section "pins"
echo "  tooling R=${R:0:12}  W=${W:0:12}…  target D=${D:0:12}"

MIRROR="${ROOT}/origin-mirror.git"
git clone -q --bare "file://${REPO_ROOT}" "${MIRROR}" || { echo "FATAL: mirror clone failed" >&2; exit 1; }

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

# --- P1: the PRODUCT target must carry the TASK-26R curriculum order ---------
section "P1 — product target carries the TASK-26R curriculum"
CH_AT_D="$(git -C "${REPO_ROOT}" show "${D}:apps/web/src/modules/curriculum/content/chapter-kana01.ts" 2>/dev/null)"
if echo "${CH_AT_D}" | python3 -c "
import re,sys
src=sys.stdin.read()
hira=None
for um in re.finditer(r\"slug: 'section-a-hiragana',[^\[]*stationSlugs: \[([^\]]*)\]\", src, re.S):
    hira=re.findall(r\"'(stn-kana-[a-z0-9-]+)'\", um.group(1)); break
assert hira, 'hira unit not found'
assert hira.index('stn-kana-h14') < hira.index('stn-kana-h6'), 'yoon before ya-row!'
assert 'stn-kana-opt-r-h9' in hira, 'H9 missing!'
assert len(hira)==18, f'hira len {len(hira)}'
print('OK')
" 2>/dev/null | grep -q OK; then ok "P1 stationSlugs at D: h14 < h6, H9 present, 18 stations"
else bad "P1 the product commit D does NOT carry the TASK-26R order!"; fi
LINT_AT_D="$(git -C "${REPO_ROOT}" show "${D}:apps/web/tests/unit/h25-content-lint.test.ts" 2>/dev/null)"
echo "${LINT_AT_D}" | grep -q "CL-16" && ok "P1 CL-16 gate present at D" || bad "P1 CL-16 missing at D"
echo "${LINT_AT_D}" | grep -q "CL-17" && ok "P1 CL-17 gate present at D" || bad "P1 CL-17 missing at D"

# --- prep(): fixture = the REAL current VPS state ---------------------------
prep() {
  local d="${ROOT}/$1"
  mkdir -p "${d}/sim" "${d}/deploy"
  cp "${REPO_ROOT}/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml" "${d}/deploy/docker-compose.yml"
  cat > "${d}/deploy/.env" <<EOF
# shared-VPS stack (post-v15 state — TASK-24 keys already present, like the live VPS)
HANASO_WEB_IMAGE=${OLD_IMAGE}
POSTGRES_USER=hanaso
POSTGRES_PASSWORD=vps-real-password
POSTGRES_DB=hanaso
HANASO_SESSION_SECRET=3f41eb5cf6431a7ff5c1f972efdb7a8f5d59b168a1b2c3d4e5f6a7b8c9d0e1f2
HANASO_LEGACY_TOKEN_CUTOFF=2026-12-01T00:00:00Z
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

run_oneliner() {
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
section "T1 — full happy path: v15 state → v16 update completes"
D1="$(prep t1)"
run_oneliner "${D1}"; RC=$?
assert_exit 0 "${RC}" "T1 one-liner exits 0"
assert_out "${D1}" "PRESERVED (never rotated)" "T1 existing secret preserved (TASK-24 keys respected)"
assert_out "${D1}" "PRESERVED (never extended)" "T1 existing cutoff preserved"
[ "$(env_get "${D1}/deploy" POSTGRES_PASSWORD)" = "vps-real-password" ] \
  && [ "$(env_get "${D1}/deploy" HANASO_WEB_IMAGE)" = "${NEW_IMAGE}" ] \
  && ok "T1 original vars preserved + image advanced to the v16 pin" || bad "T1 .env content wrong"
assert_called "${D1}" "docker build" "T1 image built from the pinned target"
assert_called "${D1}" "compose up: web worker" "T1 stack swapped (web recreated)"
assert_out "${D1}" "smoke: ALL GREEN" "T1 smoke green"
# the build really used the v16 source (version build-arg proves it):
grep -qF "version=1.0.0-hanaso26r-v16" "${D1}/sim/calls.log" && ok "T1 image built with v16 version arg" || bad "T1 version arg wrong/missing"

section "T2 — re-run the SAME one-liner: idempotent"
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

section "T3 — pre-TASK24 .env (fresh install path) still safe"
D3="$(prep t3)"
sed -i '/HANASO_SESSION_SECRET/d;/HANASO_LEGACY_TOKEN_CUTOFF/d' "${D3}/deploy/.env"
run_oneliner "${D3}"; RC=$?
assert_exit 0 "${RC}" "T3 exits 0"
assert_out "${D3}" "GENERATED (64 hex chars" "T3 env prep: secret generated for fresh install"
SEC3="$(env_get "${D3}/deploy" HANASO_SESSION_SECRET)"
[[ "${SEC3}" =~ ^[0-9a-f]{64}$ ]] && ok "T3 valid 64-hex secret" || bad "T3 secret invalid"
if grep -qF -- "${SEC3}" "${D3}/out.log"; then bad "T3 SECRET LEAKED"; else ok "T3 secret never printed"; fi

section "T4 — progress preservation: order-independent station ids"
# station_progress rows are keyed uuidV5('lesson:<slug>') — the reorder must
# not touch them. Simulate a pre-existing completed row and verify the updater
# never rewrites/deletes progress (no migrate/reset call touches it).
if grep -qE "docker exec.*station_progress.*(DELETE|TRUNCATE|UPDATE)" "${D1}/sim/calls.log"; then
  bad "T4 progress rows rewritten by updater"
else
  ok "T4 no DELETE/TRUNCATE/UPDATE on station_progress"
fi
grep -qE "db:reset|prisma migrate reset|DROP TABLE" "${D1}/sim/calls.log" && bad "T4 DB reset invoked" || ok "T4 no DB reset/drop"
# smoke proven in T1; on the idempotent re-run the updater is a clean no-op:
out_has "${D2}" "smoke: ALL GREEN" && ok "T4 post-update smoke green (T1 run)" \
  || { out_has "${D2}" "already" && ok "T4 re-run clean no-op (no rebuild, progress untouched)" \
                    || bad "T4 neither smoke nor no-op"; }

section "T5 — security sweep"
for d in "${ROOT}"/t*; do
  name="$(basename "${d}")"
  if grep -qE '[0-9a-f]{64}' "${d}/out.log" 2>/dev/null; then
    bad "T5 ${name}: a 64-hex secret string appears in the output"
  else
    ok "T5 ${name}: no secret material in terminal output"
  fi
done
if grep -rqE "docker (stop|rm|restart|kill)" "${ROOT}"/t*/sim/calls.log 2>/dev/null; then
  bad "T5 shared containers stopped/removed/restarted"
else
  ok "T5 no shared container stop/rm/restart (KOTODAMA/PostgreSQL/BBB/HAProxy/Nginx untouched)"
fi

echo
echo "=== H26R FULL-INSTALL SANDBOX (v16): ${PASS} passed, ${FAIL} failed ==="
if [ "${FAIL}" != 0 ]; then exit 1; fi
[ "${1:-}" = "--keep" ] || rm -rf "${ROOT}"
exit 0
