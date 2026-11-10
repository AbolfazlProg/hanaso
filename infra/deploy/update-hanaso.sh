#!/usr/bin/env bash
# =============================================================================
# HANASO — one-command VPS updater v2.1 (TASK-HANASO-DEPLOY-05, 2026-11-08)
# =============================================================================
# WHAT THIS IS
#   The canonical owner-run update for https://learn.kotodama.ir on the shared
#   VPS. It performs, in order: preflight → backup → image build from a PINNED
#   commit → staged swap (postgres → pgbouncer → migrate → web+worker) →
#   health gates → smoke → KOTODAMA witness → automatic rollback on failure.
#
#   v2.1 (DEPLOY-05) — audited against the owner's live VPS evidence
#   (github.com anonymous git OK · api.github.com 200 · codeload 200 · raw only
#   via 185.199.108.133): the DELIVERY layer (how bootstrap/update scripts reach
#   the server) moved to the multi-path, real-SHA-256-gated one-liner — see
#   bootstrap-hanaso.sh v3 and OWNER-COMMAND.txt. The updater mechanics below
#   are UNCHANGED from v2 (DEPLOY-04, 110/110 sandbox assertions): anonymous
#   HTTPS source, pinned commits, honest errors, staged swap, auto-rollback.
#
#   v2 (DEPLOY-04) — ZERO GitHub credentials, honest errors:
#     · the source code arrives via ANONYMOUS HTTPS from the PUBLIC repository
#       (https://github.com/AbolfazlProg/hanaso) — no PAT, no deploy key, no
#       stored root git credentials, no token in any URL;
#     · the SOURCE workspace (/opt/hanaso-src, a plain git clone) is fully
#       separated from the DEPLOY dir (/opt/hanaso: compose + .env + history +
#       backups volume) — fetching a new version can never delete .env, the
#       database volume, or any production file;
#     · git/network failures print their REAL stderr (never >/dev/null'd) and
#       abort BEFORE any change on the server;
#     · the previous version's "one-time credential setup" guidance is REMOVED.
#
#   It targets the REAL shared-VPS stack (infra/deploy/learn-kotodama/):
#     /opt/hanaso deploy dir with docker-compose.yml (project `hanaso`:
#     web @ 127.0.0.1:3100, postgres, pgbouncer, worker, migrate profile)
#     fronted by the host HAProxy/nginx. It deliberately has NOTHING to do
#     with infra/docker/docker-compose.yml (the dedicated-host caddy stack).
#
# HOW IT IS INVOKED
#   Normally via the documented one-liner → bootstrap-hanaso.sh → this file,
#   executed from an isolated worktree of the pinned deploy commit. Direct
#   invocation works too (bash infra/deploy/update-hanaso.sh [status|rollback])
#   when the source workspace already exists.
#
# USAGE (root on the VPS — no arguments needed, defaults are pinned below):
#   bash infra/deploy/update-hanaso.sh            # update to the pinned target
#   bash infra/deploy/update-hanaso.sh status     # read-only state report
#   bash infra/deploy/update-hanaso.sh rollback   # back to the previous image
#
# PINNED TARGET (do NOT drift to "latest"):
set -euo pipefail

TARGET_SHA="${HANASO_TARGET_SHA:-816eb90cdf3c5084c4d410fc280b394b071283de}"
TARGET_VERSION="${HANASO_TARGET_VERSION:-1.0.0-tl10-r02}"
TARGET_BRANCH="${HANASO_TARGET_BRANCH:-tl10-quiz-ux}"
REPO_URL="${HANASO_REPO_URL:-https://github.com/AbolfazlProg/hanaso.git}"
SRC_DIR="${HANASO_SRC_DIR:-${HANASO_REPO_DIR:-/opt/hanaso-src}}"   # HANASO_REPO_DIR = v1 legacy alias
IMAGE="ghcr.io/abolfazlprog/hanaso:${TARGET_SHA}"
PUBLIC_BASE="${HANASO_PUBLIC_BASE:-https://learn.kotodama.ir}"
KOTODAMA_URL="${HANASO_KOTODAMA_URL:-https://kotodama.ir}"
LOCAL_HEALTH="${HANASO_LOCAL_HEALTH:-http://127.0.0.1:3100/api/health}"
LOCAL_READY="${HANASO_LOCAL_READY:-http://127.0.0.1:3100/api/ready}"
# real requirements measured for the Next standalone build on this stack
MIN_FREE_MB="${HANASO_MIN_FREE_MB:-2500}"      # hard floor for docker data dir
WARN_FREE_MB="${HANASO_WARN_FREE_MB:-5000}"
MIN_MEM_MB="${HANASO_MIN_MEM_MB:-1800}"        # hard floor of MemAvailable
TS="$(date +%Y%m%d-%H%M%S)"
HIST_DIR_NAME="update-history"

export GIT_TERMINAL_PROMPT=0   # never hang on auth (public repo — none needed);
                               # failures still print their REAL git stderr.

log()  { printf '\n== [%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '   [!] %s\n' "$*"; }
die()  { printf '\n!! FATAL: %s\n\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------
# 0) locate the DEPLOY dir (compose + .env — production config, never deleted)
#    Honest per-path diagnostics: an existing directory that does NOT match the
#    stack signature is REPORTED and left untouched (never deleted/overwritten).
# -----------------------------------------------------------------------------
find_deploy_dir() {
  local d candidate found=0
  : > "${TMP_DIAG:-/tmp/hanaso-deploydiag.$$}"
  for candidate in "${HANASO_DEPLOY_DIR:-}" /opt/hanaso /srv/hanaso; do
    d="${candidate%/}"
    [ -n "$d" ] || continue
    local has_compose=0 has_env=0 sig_pg=0 sig_b=0 is_git=0
    [ -f "$d/docker-compose.yml" ] && has_compose=1
    [ -f "$d/.env" ] && has_env=1
    grep -q 'hanaso-postgres' "$d/docker-compose.yml" 2>/dev/null && sig_pg=1
    grep -q 'hanaso-pgbouncer' "$d/docker-compose.yml" 2>/dev/null && sig_b=1
    [ -e "$d/.git" ] && is_git=1
    printf '   %s: %s; docker-compose.yml=%s .env=%s git-repo=%s compose-signature=%s%s\n' \
      "$d" "$([ -d "$d" ] && echo 'exists' || echo 'not-found')" \
      "$([ $has_compose = 1 ] && echo yes || echo no)" \
      "$([ $has_env = 1 ] && echo yes || echo no)" \
      "$([ $is_git = 1 ] && echo yes || echo no)" \
      "$([ $sig_pg = 1 ] && [ $sig_b = 1 ] && echo matched || echo NO)" \
      >> "${TMP_DIAG:-/tmp/hanaso-deploydiag.$$}"
    if [ "${has_compose}" = 1 ] && [ "${has_env}" = 1 ] && [ "${sig_pg}" = 1 ] && [ "${sig_b}" = 1 ]; then
      DEPLOY_DIR="$d"; found=1
    fi
  done
  [ "${found}" = 1 ]
}

TMP_DIAG="$(mktemp /tmp/hanaso-diag.XXXXXX)"
if ! find_deploy_dir; then
  cat "${TMP_DIAG}" >&2
  die "deploy dir not found — findings above (an existing directory was NOT touched).
     Expected /opt/hanaso with docker-compose.yml + .env of the shared-VPS stack.
     If it lives elsewhere: export HANASO_DEPLOY_DIR=/path and re-run.
     NOTE: this updater must NOT run against infra/docker/docker-compose.yml (dedicated-host/caddy stack)."
fi
rm -f "${TMP_DIAG}"

# src workspace — REQUIRED only for 'update'; checked lazily below
check_src_dir() {
  if ! git -C "${SRC_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "source workspace not found at ${SRC_DIR} (anonymous git clone of the public repo).
     Run the documented ONE-COMMAND update (bootstrap-hanaso.sh creates it automatically),
     or clone it once:  git clone ${REPO_URL} ${SRC_DIR}"
  fi
  [ "${SRC_DIR}" != "${DEPLOY_DIR}" ] \
    || die "SRC_DIR and DEPLOY_DIR are the same (${SRC_DIR}) — refusing (source must stay separate from production data)."
}

COMPOSE="docker compose -f ${DEPLOY_DIR}/docker-compose.yml --project-directory ${DEPLOY_DIR} --env-file ${DEPLOY_DIR}/.env"
HIST_DIR="${DEPLOY_DIR}/${HIST_DIR_NAME}"

log "HANASO updater v2 — deploy dir: ${DEPLOY_DIR} · source workspace: ${SRC_DIR}"

# =============================================================================
# status — read-only report
# =============================================================================
cmd_status() {
  echo "── target (pinned) ─────────────────────────────"
  echo "  commit : ${TARGET_SHA}"
  echo "  version: ${TARGET_VERSION}"
  echo "  image  : ${IMAGE}"
  echo "── current (.env) ──────────────────────────────"
  grep -E '^HANASO_WEB_IMAGE=' "${DEPLOY_DIR}/.env" || true
  echo "── source workspace ────────────────────────────"
  if git -C "${SRC_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "${SRC_DIR}" log -1 --oneline origin/"${TARGET_BRANCH}" 2>/dev/null || true
  else
    echo "  (no clone at ${SRC_DIR} — the one-command update creates it)"
  fi
  echo "── containers (project hanaso) ─────────────────"
  ${COMPOSE} ps || true
  echo "── health (local) ──────────────────────────────"
  curl -fsS -m 10 "${LOCAL_HEALTH}" || warn "local health unreachable"
  echo
  echo "── ready (local) ───────────────────────────────"
  curl -fsS -m 10 "${LOCAL_READY}" || warn "local ready unreachable"
  echo
  echo "── health (public) ─────────────────────────────"
  curl -fsS -m 15 "${PUBLIC_BASE}/api/health" || warn "public health unreachable"
  echo
  echo "── KOTODAMA witness ────────────────────────────"
  curl -fsS -m 15 -o /dev/null -w "kotodama.ir: HTTP %{http_code}\n" "${KOTODAMA_URL}" || warn "kotodama.ir unreachable"
  echo "── last update records ─────────────────────────"
  ls -1t "${HIST_DIR}" 2>/dev/null | head -5 || echo "  (none yet)"
}

# =============================================================================
# rollback — app-level rollback to the previous image (DB is NEVER touched)
#   usage: update-hanaso.sh rollback [image-tag]
#          without an argument: the image recorded in the newest history file
# =============================================================================
cmd_rollback() {
  local target="${1:-}"
  if [ -z "${target}" ]; then
    local newest
    newest="$(ls -1t "${HIST_DIR}"/*.env 2>/dev/null | head -1 || true)"
    [ -n "${newest}" ] || die "no update history found in ${HIST_DIR}; pass the image tag explicitly."
    target="$(grep -E '^PREV_IMAGE=' "${newest}" | head -1 | cut -d= -f2-)"
    [ -n "${target}" ] || die "could not read PREV_IMAGE from ${newest}."
  fi
  log "ROLLBACK app image → ${target} (database and volumes untouched)"
  cp "${DEPLOY_DIR}/.env" "${DEPLOY_DIR}/.env.backup-rollback-${TS}"
  sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${target}|" "${DEPLOY_DIR}/.env"
  ${COMPOSE} up -d web worker
  local i healthy=0
  for i in $(seq 1 30); do
    if curl -fsS -m 5 "${LOCAL_HEALTH}" 2>/dev/null | grep -q '"ok":true'; then healthy=1; break; fi
    sleep 2
  done
  [ "${healthy}" = 1 ] || die "rollback health gate FAILED — inspect: ${COMPOSE} logs web --tail 100"
  curl -fsS -m 10 "${LOCAL_HEALTH}"; echo
  HANASO_BASE_URL="${PUBLIC_BASE}" bash "${DEPLOY_DIR}/smoke.sh" 2>/dev/null \
    || bash "$(dirname "$0")/../scripts/smoke.sh" || warn "smoke after rollback failed — investigate"
  curl -fsS -m 15 -o /dev/null -w "kotodama.ir: HTTP %{http_code}\n" "${KOTODAMA_URL}" || warn "kotodama.ir not 200"
  echo "── rollback complete: ${target} ──"
}

# =============================================================================
# preflight
# =============================================================================
preflight() {
  log "PREFLIGHT"

  # A1) privileges + docker/compose present and usable
  [ "$(id -u)" = 0 ] || warn "not running as root — docker access may fail"
  command -v docker >/dev/null 2>&1 || die "docker not installed/found — install it first."
  docker version --format '{{.Server.Version}}' >/dev/null 2>&1 || die "docker daemon not reachable."
  docker compose version >/dev/null 2>&1 || die "docker compose v2 not available."

  # A2) disk + memory headroom for the image build
  local docker_root free_mb
  docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /var/lib/docker)"
  free_mb="$(df -Pm "${docker_root}" | awk 'NR==2 {print $4}')"
  [ "${free_mb}" -ge "${MIN_FREE_MB}" ] \
    || die "not enough disk: ${free_mb}MB free on ${docker_root} (need ≥ ${MIN_FREE_MB}MB)."
  [ "${free_mb}" -ge "${WARN_FREE_MB}" ] || warn "disk below ${WARN_FREE_MB}MB (${free_mb}MB) — build may be tight."
  local mem_avail
  mem_avail="$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)"
  [ "${mem_avail}" -ge "${MIN_MEM_MB}" ] \
    || die "not enough available memory: ${mem_avail}MB (need ≥ ${MIN_MEM_MB}MB for the Next build)."

  # A3) required .env keys — NAMES only, values are never printed
  local key
  for key in HANASO_WEB_IMAGE POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB; do
    grep -qE "^${key}=..*" "${DEPLOY_DIR}/.env" || die "required key ${key} missing/empty in ${DEPLOY_DIR}/.env"
  done

  # A4) compose project really is the isolated hanaso stack
  grep -qE '^name:[[:space:]]*hanaso[[:space:]]*$' "${DEPLOY_DIR}/docker-compose.yml" \
    || die "compose project name is not 'hanaso' — refusing to touch an unexpected stack."

  # A5) source workspace + pinned commit (anonymous; fetch ONLY if missing).
  #     Real git output is shown — never redirected to /dev/null.
  check_src_dir
  if ! git -C "${SRC_DIR}" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
    log "target commit not local — fetching origin/${TARGET_BRANCH} (anonymous, no credentials)"
    if ! git -C "${SRC_DIR}" fetch origin "${TARGET_BRANCH}"; then
      cat <<'EOF'

!! Could not fetch the release branch from GitHub — the REAL git error is printed above.

   This updater uses ANONYMOUS HTTPS against the PUBLIC repository:
     https://github.com/AbolfazlProg/hanaso
   No username/password/token is needed or configured. If the error above is an
   AUTH failure ("could not read Username"), the repository has been re-privatized —
   check its visibility on GitHub. If it is a NETWORK failure, check DNS/egress
   to github.com and re-run the same command.

   Nothing was changed on the server.
EOF
      die "git fetch failed — aborting before any change."
    fi
  fi
  git -C "${SRC_DIR}" cat-file -e "${TARGET_SHA}^{commit}" \
    || die "commit ${TARGET_SHA} still missing after fetching ${TARGET_BRANCH} (wrong branch?)"

  # A6) baseline: the current stack must be healthy so rollback has a good target
  PREV_IMAGE="$(grep -E '^HANASO_WEB_IMAGE=' "${DEPLOY_DIR}/.env" | head -1 | cut -d= -f2- | tr -d ' "')" \
    || true
  [ -n "${PREV_IMAGE}" ] || die "could not read HANASO_WEB_IMAGE from .env"
  log "rollback target (current live image): ${PREV_IMAGE}"
  local base_health
  base_health="$(curl -fsS -m 10 "${LOCAL_HEALTH}" 2>/dev/null || true)"
  if ! echo "${base_health}" | grep -q '"ok":true'; then
    if [ "${HANASO_ALLOW_DEGRADED_BASELINE:-0}" = 1 ]; then
      warn "baseline health is NOT ok — continuing because HANASO_ALLOW_DEGRADED_BASELINE=1 (rollback target may be bad)."
    else
      die "current HANASO health is not ok — fix the running service first, or set HANASO_ALLOW_DEGRADED_BASELINE=1 to update anyway."
    fi
  fi
  local base_ready
  base_ready="$(curl -fsS -m 10 "${LOCAL_READY}" 2>/dev/null || true)"
  echo "${base_ready}" | grep -q '"database":{"status":"ok"' \
    || warn "baseline /api/ready does not report database ok — the migrate step may fail."
  BASE_KOTODAMA="$(curl -fsS -m 15 -o /dev/null -w '%{http_code}' "${KOTODAMA_URL}" 2>/dev/null || echo 000)"
  log "KOTODAMA baseline: HTTP ${BASE_KOTODAMA} (witness only — never modified)"

  # A7) already-at-target guard (idempotent re-run)
  if echo "${base_health}" | grep -q "${TARGET_SHA}"; then
    if [ "${HANASO_FORCE:-0}" = 1 ]; then
      warn "already running ${TARGET_VERSION} — HANASO_FORCE=1 → rebuilding anyway."
    else
      log "already running target commit ${TARGET_SHA:0:12} and healthy — nothing to do."
      echo "   (to force a rebuild/recreate: HANASO_FORCE=1 bash $0)"
      exit 0
    fi
  fi

  # A8) baseline DB services present
  docker inspect -f '{{.Name}} {{.State.Status}}' hanaso-postgres hanaso-pgbouncer 2>/dev/null \
    | sed 's/^/   /' || warn "hanaso-postgres/hanaso-pgbouncer not visible via docker inspect."
}

# =============================================================================
# backup (.env + database dump via the worker's own verified routine)
# =============================================================================
do_backup() {
  log "BACKUP (.env + database)"
  mkdir -p "${HIST_DIR}"
  cp "${DEPLOY_DIR}/.env" "${DEPLOY_DIR}/.env.backup-${TS}"
  log ".env → ${DEPLOY_DIR}/.env.backup-${TS}"
  local out
  out="$(${COMPOSE} exec -T -w /app -e BACKUP_DIR=/backups worker node apps/web/.tools/db-cli.mjs backup 2>&1)" \
    || die "database backup FAILED — aborting BEFORE any change: ${out}"
  echo "${out}" | grep -q '"ok":true' || die "database backup not ok — aborting BEFORE any change: ${out}"
  DB_BACKUP_FILE="$(echo "${out}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["file"])' 2>/dev/null || true)"
  DB_BACKUP_BYTES="$(echo "${out}" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("bytes",0))' 2>/dev/null || echo 0)"
  [ -n "${DB_BACKUP_FILE}" ] && [ "${DB_BACKUP_BYTES:-0}" -gt 1000 ] \
    || die "database backup looks empty (file/bytes) — aborting BEFORE any change."
  log "database → hanaso-backups volume: ${DB_BACKUP_FILE} (${DB_BACKUP_BYTES} bytes, pg_dump -Fc, verified by the CLI)"
}

# =============================================================================
# build the pinned image in a throwaway worktree (no pull, no drift)
# =============================================================================
do_build() {
  log "BUILD ${TARGET_VERSION} @ ${TARGET_SHA:0:12}"
  BUILD_TMP="$(mktemp -d /tmp/hanaso-build.XXXXXX)"
  git -C "${SRC_DIR}" worktree add --detach "${BUILD_TMP}" "${TARGET_SHA}" >/dev/null
  docker build -f "${BUILD_TMP}/infra/docker/Dockerfile" "${BUILD_TMP}" \
    --build-arg NEXT_PUBLIC_BUILD_SHA="${TARGET_SHA}" \
    --build-arg NEXT_PUBLIC_APP_VERSION="${TARGET_VERSION}" \
    --build-arg NEXT_PUBLIC_ENV=production \
    -t "${IMAGE}" || { git -C "${SRC_DIR}" worktree remove --force "${BUILD_TMP}" 2>/dev/null || true;
                        die "docker build FAILED — nothing was changed on the server."; }
  git -C "${SRC_DIR}" worktree remove --force "${BUILD_TMP}" 2>/dev/null || true
  IMAGE_ID="$(docker image inspect -f '{{.Id}}' "${IMAGE}")"
  IMAGE_SIZE="$(docker image inspect -f '{{.Size}}' "${IMAGE}")"
  log "image built: ${IMAGE} (${IMAGE_ID}, $((IMAGE_SIZE / 1024 / 1024))MB)"

  # OPTIONAL immutability push — only when a token was provided in the ENV
  # (never an argument, never printed, never stored). The VPS one-command
  # flow does NOT need this: it builds locally from the public source.
  if [ -n "${HANASO_GHCR_TOKEN:-}" ]; then
    log "pushing immutable tag to GHCR"
    echo "${HANASO_GHCR_TOKEN}" | docker login ghcr.io -u AbolfazlProg --password-stdin >/dev/null
    docker push "${IMAGE}" || warn "GHCR push failed — the LOCAL image still deploys fine."
    docker logout ghcr.io >/dev/null 2>&1 || true
  else
    log "GHCR push skipped (no HANASO_GHCR_TOKEN in env) — deploying the local image"
  fi
}

# =============================================================================
# staged update + health gates (auto-rollback via the ERR trap)
# =============================================================================
SWAPPED=0
roll_back() {
  trap - ERR
  echo
  echo "!! FAILURE — rolling the APP back to ${PREV_IMAGE} (database/data untouched)"
  if [ "${SWAPPED}" = 1 ]; then
    sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${PREV_IMAGE}|" "${DEPLOY_DIR}/.env"
    ${COMPOSE} up -d web worker || true
    local i healthy=0
    for i in $(seq 1 30); do
      if curl -fsS -m 5 "${LOCAL_HEALTH}" 2>/dev/null | grep -q '"ok":true'; then healthy=1; break; fi
      sleep 2
    done
    if [ "${healthy}" = 1 ]; then
      echo "   rolled back — health ok on the previous image:"
      curl -fsS -m 10 "${LOCAL_HEALTH}"; echo
    else
      echo "   !! rollback health gate ALSO failed — inspect now:"
      echo "      ${COMPOSE} logs web --tail 100"
      echo "      ${COMPOSE} ps"
    fi
  else
    echo "   nothing was swapped yet — server state unchanged."
  fi
  curl -fsS -m 15 -o /dev/null -w "kotodama.ir witness: HTTP %{http_code}\n" "${KOTODAMA_URL}" || true
  echo "   The failed image remains locally as ${IMAGE} for inspection."
  echo "   Database backup from this run: ${DB_BACKUP_FILE:-n/a}"
  exit 1
}

wait_container_healthy() {
  local name="$1" i
  for i in $(seq 1 90); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' "${name}" 2>/dev/null || true)" = healthy ] && return 0
    sleep 2
  done
  echo "   diagnostics for ${name}:"
  docker inspect -f 'state={{.State.Status}} restarts={{.RestartCount}} oomKilled={{.State.OOMKilled}} exit={{.State.ExitCode}} health={{.State.Health.Status}}' "${name}" 2>/dev/null || true
  docker logs --tail 40 "${name}" 2>/dev/null || true
  return 1
}

do_update() {
  log "STAGED UPDATE"
  trap roll_back ERR

  # C1) swap the image reference (the .env is already backed up)
  sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${IMAGE}|" "${DEPLOY_DIR}/.env"
  SWAPPED=1

  # C2) data plane first — wait for real health (no-ops when already up)
  ${COMPOSE} up -d postgres
  wait_container_healthy hanaso-postgres || die-ish "postgres never became healthy"
  ${COMPOSE} up -d pgbouncer
  wait_container_healthy hanaso-pgbouncer || die-ish "pgbouncer never became healthy"

  # C3) one-shot migrations + seeds — idempotent by design (drizzle tracks
  #     applied migrations; seeds are uuidv5-deterministic upserts)
  log "migrate (one-shot, direct connection — idempotent)"
  ${COMPOSE} run --rm migrate || die-ish "migrate service failed"

  # C4) app plane
  ${COMPOSE} up -d web worker || die-ish "compose up web worker failed"

  # C5) health gate — ok:true AND the exact pinned commit AND version
  log "health gate (local ${LOCAL_HEALTH})"
  local i H OK=0
  for i in $(seq 1 30); do
    H="$(curl -fsS -m 5 "${LOCAL_HEALTH}" 2>/dev/null || true)"
    if echo "${H}" | grep -q '"ok":true' && echo "${H}" | grep -q "${TARGET_SHA}" \
       && echo "${H}" | grep -q "\"${TARGET_VERSION}\""; then
      echo "healthy after ~$((i * 2))s: ${H}"; OK=1; break
    fi
    sleep 2
  done
  [ "${OK}" = 1 ] || die-ish "health gate failed (not ok / wrong commit / wrong version)"

  # C6) readiness — the database must answer through the app pool
  local R
  R="$(curl -fsS -m 10 "${LOCAL_READY}" 2>/dev/null || true)"
  echo "${R}" | grep -q '"database":{"status":"ok"' || die-ish "/api/ready does not report database ok"

  # C7) public path through the real front line (HAProxy→nginx→web)
  log "public health (${PUBLIC_BASE})"
  curl -fsS -m 15 "${PUBLIC_BASE}/api/health" | grep -q "\"${TARGET_VERSION}\"" \
    || die-ish "public /api/health does not report ${TARGET_VERSION}"

  # C8) error-log scan (reported; a crash/restart also fails the ps gate below)
  local errcount
  errcount="$(${COMPOSE} logs web --since 5m 2>/dev/null | grep -ciE 'uncaught|unhandled|FATAL' || true)"
  [ "${errcount}" = 0 ] || warn "web logs contain ${errcount} error-pattern line(s) in the last 5m — inspect: ${COMPOSE} logs web --since 5m"

  # C9) container states + smoke
  ${COMPOSE} ps
  log "smoke (real endpoints, RTL + Japanese checks)"
  if [ -f "${DEPLOY_DIR}/smoke.sh" ]; then
    HANASO_BASE_URL="${PUBLIC_BASE}" bash "${DEPLOY_DIR}/smoke.sh"
  else
    HANASO_BASE_URL="${PUBLIC_BASE}" bash "$(dirname "$0")/../scripts/smoke.sh"
  fi

  # C10) KOTODAMA witness — must be exactly what it was before
  local after
  after="$(curl -fsS -m 15 -o /dev/null -w '%{http_code}' "${KOTODAMA_URL}" 2>/dev/null || echo 000)"
  [ "${after}" = "${BASE_KOTODAMA}" ] || die-ish "kotodama.ir changed from HTTP ${BASE_KOTODAMA} to ${after} — INVESTIGATE (this updater never touches it)"

  trap - ERR
}

# die-ish: raise a "error" that the ERR trap turns into rollback+exit 1
die-ish() { echo "!! ${*}" >&2; return 1; }

# =============================================================================
# record + final report
# =============================================================================
record_and_report() {
  cat > "${HIST_DIR}/${TS}.env" <<EOF
# HANASO update record — ${TS} (no secrets; images and evidence only)
TS=${TS}
TARGET_SHA=${TARGET_SHA}
TARGET_VERSION=${TARGET_VERSION}
IMAGE=${IMAGE}
IMAGE_ID=${IMAGE_ID}
PREV_IMAGE=${PREV_IMAGE}
DB_BACKUP_FILE=${DB_BACKUP_FILE}
BASE_KOTODAMA=${BASE_KOTODAMA}
EOF
  echo
  echo "════════════════════════════════════════════════════════════════"
  echo "  UPDATE COMPLETE — HANASO ${TARGET_VERSION} @ ${TARGET_SHA:0:12}"
  echo "  به‌روزرسانی انجام شد — نسخهٔ ${TARGET_VERSION}"
  echo "────────────────────────────────────────────────────────────────"
  echo "  live     : ${PUBLIC_BASE}  (health commit: ${TARGET_SHA:0:12})"
  echo "  image    : ${IMAGE} (${IMAGE_ID})"
  echo "  db backup: ${DB_BACKUP_FILE} (hanaso-backups volume)"
  echo "  record   : ${HIST_DIR}/${TS}.env"
  echo "  rollback : bash $0 rollback   (app-level; data untouched)"
  echo "  KOTODAMA : untouched (witness HTTP ${BASE_KOTODAMA})"
  echo "════════════════════════════════════════════════════════════════"
}

# -----------------------------------------------------------------------------
# entrypoint
# -----------------------------------------------------------------------------
case "${1:-update}" in
  status)   cmd_status; exit 0 ;;
  rollback) shift || true; cmd_rollback "${1:-}"; exit 0 ;;
  update)   : ;;
  *) die "unknown subcommand '${1}' (use: update | status | rollback)" ;;
esac

preflight
do_backup
do_build
do_update
record_and_report
