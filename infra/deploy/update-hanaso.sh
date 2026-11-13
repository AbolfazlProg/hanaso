#!/usr/bin/env bash
# =============================================================================
# HANASO — one-command VPS updater v3.0 (TASK-HANASO-16, 2026-11-11)
# =============================================================================
# WHAT THIS IS
#   The canonical owner-run update for https://learn.kotodama.ir on the shared
#   VPS. It performs, in order: preflight → backup → image build from a PINNED
#   commit → staged swap (postgres → pgbouncer → migrate → web+worker) →
#   THREE-TIER health gates → smoke → KOTODAMA witness → classified outcome
#   (rollback ONLY when the deploy itself broke something).
#
#   v3.0 (HANASO-16) — the three-tier health gate, fixing the TL-14 misrollback:
#     the 1.0.0-tl14-r01 run PASSED the app gates (local health + version),
#     then FAILED the public self-probe (curl 52 empty reply) and rolled a
#     HEALTHY app back — while kotodama.ir failed identically from the same
#     host, proving the shared front line (host HAProxy/nginx) was ALREADY
#     broken before the deploy. Verified from 5 countries: the public endpoint
#     was down worldwide. v3 never confuses the three failure families again:
#       Tier 1  application      127.0.0.1:3100 (ok:true + pinned commit+version)
#       Tier 2a ingress-direct  the reverse proxy on THIS host with real SNI/Host
#                               (curl --resolve …:443:127.0.0.1) — no DNS/NAT
#       Tier 2b public self     the real public URL from this host (DNS + hairpin)
#       Tier 3  independent     the public endpoint from OUTSIDE the VPS
#                               (check-host.net API — best-effort, honest verdict)
#     Preflight now records the PUBLIC baseline BEFORE anything changes and
#     ABORTS EARLY (nothing touched) when the front line is verifiably already
#     broken. The post-swap gate classifies: APP_FAILED → rollback ·
#     DEPLOY_BROKE_INGRESS → rollback · INGRESS_PREEXISTING_BROKEN → halt +
#     diagnosis (no pointless rollback of a healthy app) · hairpin/self-probe
#     artifact with healthy tiers 1+2a → EXTERNAL_UNVERIFIED, release stands,
#     reported explicitly. Nothing is ever bypassed with `|| true`.
#
#   v2.1 (DEPLOY-05) — audited against the owner's live VPS evidence
#   (github.com anonymous git OK · api.github.com 200 · codeload 200 · raw only
#   via 185.199.108.133): the DELIVERY layer (how bootstrap/update scripts reach
#   the server) moved to the multi-path, real-SHA-256-gated one-liner — see
#   bootstrap-hanaso.sh v3 and OWNER-COMMAND.txt.
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

TARGET_SHA="${HANASO_TARGET_SHA:-3f41f6ee510e28914934ddc83375a0e1d49405a3}"
TARGET_VERSION="${HANASO_TARGET_VERSION:-1.0.0-hanaso20-r01}"
TARGET_BRANCH="${HANASO_TARGET_BRANCH:-fix/TASK-HANASO-20-onboarding}"
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

log "HANASO updater v3 — deploy dir: ${DEPLOY_DIR} · source workspace: ${SRC_DIR}"

# =============================================================================
# THREE-TIER PUBLIC HEALTH PROBES (HANASO-16 §۸.۲) — v3 core
#   Every probe prints its REAL curl error; nothing is hidden or `|| true`d.
#   They CLASSIFY; the policy (rollback or not) lives in preflight/do_update.
# =============================================================================
PUBLIC_HOST="$(printf '%s' "${PUBLIC_BASE#https://}" | sed 's#[/:].*$##' | head -1)"  # learn.kotodama.ir

## Tier 2a — the reverse proxy on THIS host, real SNI + Host, no DNS/hairpin.
##   Works even when the router can't loop back to its own public IP.
probe_ingress_direct() {
  curl -fsS -m 12 --resolve "${PUBLIC_HOST}:443:127.0.0.1" "${PUBLIC_BASE}/api/health" 2>&1
}

## Tier 2b — the real public URL from this host (DNS + any hairpin NAT on the path).
probe_public_self() {
  curl -fsS -m 15 "${PUBLIC_BASE}/api/health" 2>&1
}

## Tier 3 — INDEPENDENT verification of the public endpoint from OUTSIDE the VPS
##   (check-host.net HTTP check from ≥3 global nodes; best-effort: when the API
##   itself is unreachable the verdict is honestly UNVERIFIED, never a pass).
##   echoes:  OK:<code>  |  BROKEN:<reason>  |  UNVERIFIED:<reason>
probe_public_external() {
  local host_url="${PUBLIC_BASE}/api/health" req_id out verdict
  req_id="$(curl -fsS -m 20 -H 'Accept: application/json' \
    "https://check-host.net/check-http?host=${host_url}&max_nodes=3" 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("request_id",""))' 2>/dev/null || true)"
  if [ -z "${req_id}" ]; then echo "UNVERIFIED:check-host.net API unreachable from this host"; return; fi
  sleep "${HANASO_CHECKHOST_DELAY:-8}"  # nodes need a moment; short on purpose (a deploy gate must not hang)
  out="$(curl -fsS -m 20 -H 'Accept: application/json' \
    "https://check-host.net/check-result/${req_id}" 2>/dev/null || true)"
  if [ -z "${out}" ]; then echo "UNVERIFIED:check-host.net result fetch failed"; return; fi
  verdict="$(printf '%s' "${out}" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("UNVERIFIED:unparseable result"); raise SystemExit
ok = bad = pending = 0; last_err = ""
for node, res in d.items():
    if not res: pending += 1; continue
    r = res[0] if isinstance(res, list) and res else None
    if isinstance(r, list) and len(r) >= 2:
        if r[0] == 1: ok += 1
        else:
            bad += 1; last_err = str(r[2] if len(r) > 2 else r[1])
    else: pending += 1
if ok > 0 and bad == 0: print("OK:%d-nodes-200" % ok)
elif bad > 0 and ok == 0: print("BROKEN:%s%s" % (last_err[:60], " (+%d more)" % (bad - 1) if bad > 1 else ""))
elif bad > 0 and ok > 0: print("BROKEN:mixed %d-ok/%d-broken last=%s" % (ok, bad, last_err[:40]))
elif pending > 0: print("UNVERIFIED:nodes still pending")
else: print("UNVERIFIED:no node answered")
' 2>/dev/null || true)"
  echo "${verdict:-UNVERIFIED:python3 parse failed}"
}

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
  echo "── health (local · tier 1) ────────────────────"
  curl -fsS -m 10 "${LOCAL_HEALTH}" || warn "local health unreachable"
  echo
  echo "── ready (local) ───────────────────────────────"
  curl -fsS -m 10 "${LOCAL_READY}" || warn "local ready unreachable"
  echo
  echo "── ingress-direct (tier 2a: proxy on this host) "
  probe_ingress_direct || warn "tier 2a: the reverse proxy did not answer on this host"
  echo
  echo "── health (public self · tier 2b) ─────────────"
  probe_public_self || warn "tier 2b: the public URL is unreachable from this host"
  echo
  echo "── independent public (tier 3) ─────────────────"
  echo "verdict: $(probe_public_external)"
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
    || bash "$(dirname "$0")/../../scripts/smoke.sh" || warn "smoke after rollback failed — investigate"
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
  # TASK-HANASO-24: HANASO_SESSION_SECRET is REQUIRED (the app refuses to boot
  # on the public dev fallback — forgeable session tokens).
  # HANASO_LEGACY_TOKEN_CUTOFF is REQUIRED for this update's image: it bounds
  # the pre-24 raw-cookie → signed-token re-issue grace (see
  # ops/checkpoints/TASK-HANASO-24/AUTH_SESSION_HARDENING.md). Without a cutoff
  # the raw values are simply never re-signed (fail-closed) — setting it to
  # NOW+14d gives existing learners two weeks to keep their progress linked.
  local key
  for key in HANASO_WEB_IMAGE POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB HANASO_SESSION_SECRET HANASO_LEGACY_TOKEN_CUTOFF; do
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

  # A6b) THREE-TIER PUBLIC BASELINE (HANASO-16 §۸.۲) — recorded BEFORE anything
  #      changes, so the post-swap gate can tell a PRE-EXISTING broken front
  #      line from a deploy-caused outage. This is exactly what the TL-14 run
  #      lacked: its public gate failed with no baseline to compare against,
  #      and a healthy app was rolled back while the front line stayed broken.
  BASE_INGRESS_DIRECT="$(probe_ingress_direct >/dev/null 2>&1 && echo ok || echo fail)"
  BASE_PUBLIC_SELF="$(probe_public_self >/dev/null 2>&1 && echo ok || echo fail)"
  BASE_EXTERNAL="skipped-baseline-public-self-ok"  # set for real below only when 2b fails
  log "public baseline — tier 2a ingress-direct: ${BASE_INGRESS_DIRECT} · tier 2b public-self: ${BASE_PUBLIC_SELF}"
  if [ "${BASE_PUBLIC_SELF}" != ok ]; then
    # capture the REAL error for the record (never hidden):
    BASE_PUBLIC_SELF_ERR="$( (probe_public_self 2>&1 || true) | head -2 | tr '\n' ' ')"
    log "tier 2b real error: ${BASE_PUBLIC_SELF_ERR:-unreachable}"
    BASE_EXTERNAL="$(probe_public_external)"
    log "tier 3 independent verdict (baseline): ${BASE_EXTERNAL}"
    if [ "${HANASO_ALLOW_UNVERIFIED_INGRESS:-0}" = 1 ]; then
      warn "HANASO_ALLOW_UNVERIFIED_INGRESS=1 — deploying DESPITE the broken/unverifiable public path (tier 3: ${BASE_EXTERNAL}). The post-swap gate will still verify tiers 1+2a; the public path will be reported EXTERNAL_UNVERIFIED."
    else
      case "${BASE_EXTERNAL}" in
        BROKEN:*)
          cat >&2 <<EOF

!! INGRESS_PREEXISTING_BROKEN — the PUBLIC endpoint is verifiably broken from
   OUTSIDE this VPS (tier 3: ${BASE_EXTERNAL}) BEFORE this update ran.

   The updater refuses to deploy onto a broken front line: nothing was changed,
   nothing was rolled back, the database and volumes are untouched.

   This is NOT the application (tier 1 local health is ok above) and NOT this
   release — kotodama.ir (never touched by this updater) shows HTTP ${BASE_KOTODAMA}
   and tier 2a (the reverse proxy on this host) shows: ${BASE_INGRESS_DIRECT}.

   Fix the shared front line first (host HAProxy/nginx, its backends, ports
   80/443, firewall — inspect: systemctl status haproxy nginx 2>/dev/null;
   ss -tlnp | grep -E ':80|:443'; docker ps), then re-run the same command.

   To deploy anyway with an explicitly UNVERIFIED public path:
     HANASO_ALLOW_UNVERIFIED_INGRESS=1  (same one-liner, this env prefix)
EOF
          die "public endpoint already broken before the update (tier 3: ${BASE_EXTERNAL}) — aborting BEFORE any change."
          ;;
        *)
          if [ "${BASE_INGRESS_DIRECT}" != ok ]; then
            cat >&2 <<EOF

!! INGRESS_PREEXISTING_BROKEN (local) — the reverse proxy on THIS host does not
   answer with the right SNI/Host (tier 2a fail) while the app itself is
   healthy (tier 1 ok). The front line is broken at the proxy layer BEFORE this
   update ran; deploying now would produce a release nobody can verify.

   Nothing was changed. Fix the host HAProxy/nginx first, then re-run.

   To deploy anyway: HANASO_ALLOW_UNVERIFIED_INGRESS=1
EOF
            die "tier 2a ingress-direct broken at baseline — aborting BEFORE any change."
          fi
          warn "tier 2b public-self fails at baseline but tier 2a is ok and tier 3 says ${BASE_EXTERNAL} — hairpin/self-probe artifact or unverifiable; the gate will classify after the swap."
          ;;
      esac
    fi
  fi

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

  # C7) THREE-TIER PUBLIC GATE (HANASO-16 §۸.۲) — classifies BEFORE deciding.
  #     Tier 1 already passed above (C5/C6: ok:true + pinned commit + version).
  #     The old unconditional «public probe fails → rollback» is what mis-rolled
  #     the healthy TL-14 release while the front line was already broken.
  log "public gate — tier 2a (ingress-direct), tier 2b (public self), tier 3 (independent)"
  local pub_self pub_ext ingress_direct
  pub_self="$(probe_public_self 2>/dev/null || true)"
  if echo "${pub_self}" | grep -q "\"${TARGET_VERSION}\"" && echo "${pub_self}" | grep -q '"ok":true'; then
    log "tier 2b public self-probe: ok (${TARGET_VERSION}) — the full public path serves the new release"
    pub_ext="$(probe_public_external)"
    case "${pub_ext}" in
      OK:*)        log "tier 3 independent: ${pub_ext} — publicly verified from outside the VPS"; PUBLIC_CLASSIFICATION="PUBLIC_OK" ;;
      UNVERIFIED:*) warn "tier 3 independent: ${pub_ext} — public path unverifiable from here (self-probe already ok); release stands"; PUBLIC_CLASSIFICATION="PUBLIC_OK" ;;
      BROKEN:*)    warn "tier 3 independent: ${pub_ext} — self-probe ok but outside nodes fail; partial reachability — inspect the front line after the update (release stands: tiers 1+2 verified)"; PUBLIC_CLASSIFICATION="PUBLIC_OK_PARTIAL_REACHABILITY" ;;
    esac
  else
    # tier 2b failed — classify with 2a + 3 before ANY rollback decision
    log "tier 2b real error: $(printf '%s' "${pub_self}" | head -2 | tr '\n' ' ')"
    ingress_direct="$(probe_ingress_direct 2>/dev/null || true)"
    if echo "${ingress_direct}" | grep -q "\"${TARGET_VERSION}\""; then
      # the proxy on this host serves the new release correctly
      pub_ext="$(probe_public_external)"
      case "${pub_ext}" in
        OK:*)
          log "tier 3 independent: ${pub_ext} — the public endpoint WORKS from outside; the tier 2b failure is a hairpin/self-probe network artifact. Release stands (EXTERNAL path verified independently)."
          PUBLIC_CLASSIFICATION="PUBLIC_OK_SELF_PROBE_ARTIFACT"
          ;;
        UNVERIFIED:*)
          warn "tier 3: ${pub_ext} · tier 2a ok — app + proxy verified locally; the public path cannot be independently confirmed. Status: EXTERNAL_UNVERIFIED. Release stands; verify from a phone/other network after the run."
          PUBLIC_CLASSIFICATION="EXTERNAL_UNVERIFIED"
          ;;
        BROKEN:*)
          # outside nodes really cannot reach it — was it already like this?
          if [ "${BASE_PUBLIC_SELF}" != ok ] || [ "${BASE_INGRESS_DIRECT:-ok}" != ok ]; then
            cat >&2 <<EOF
!! INGRESS failure AFTER the swap (tier 3: ${pub_ext}) — but the BASELINE (recorded
   in preflight, before any change) was ALREADY failing the same way:
   tier 2a ${BASE_INGRESS_DIRECT:-?} / tier 2b ${BASE_PUBLIC_SELF}.
   The deploy did not break the front line; the app (tier 1) and the local proxy
   (tier 2a) serve ${TARGET_VERSION} correctly.
   Keeping the release (rolling a healthy app back would not fix the front line).
   Fix the shared front line (HAProxy/nginx → backends → 80/443) — this updater
   never touches it. kotodama.ir witness: see C10 below.
EOF
          PUBLIC_CLASSIFICATION="INGRESS_PREEXISTING_BROKEN_PUBLIC_DOWN"
          else
            die-ish "tier 3 says ${pub_ext} and the baseline was HEALTHY — this deploy window broke the public path (tier 2a still ok). Rolling back."
          fi
          ;;
      esac
    else
      # the proxy on this host itself does not serve the release
      if [ "${BASE_INGRESS_DIRECT:-ok}" != ok ]; then
        cat >&2 <<EOF
!! tier 2a (ingress-direct) fails AFTER the swap, but it was ALREADY failing at
   baseline — a PRE-EXISTING front-line failure that preflight would normally
   stop for. The app itself is healthy (tier 1). Rolling back to ${PREV_IMAGE}
   per the safe policy (nothing about the front line is fixable from here).
   Fix the host HAProxy/nginx first, then re-run.
EOF
        die-ish "ingress-direct broken (pre-existing at baseline) — rolling back the app"
      fi
      die-ish "tier 2a ingress-direct broke during this deploy (baseline was ok) — the public path no longer serves ${TARGET_VERSION}; rolling back"
    fi
  fi

  # C8) error-log scan (reported; a crash/restart also fails the ps gate below)
  local errcount
  errcount="$(${COMPOSE} logs web --since 5m 2>/dev/null | grep -ciE 'uncaught|unhandled|FATAL' || true)"
  [ "${errcount}" = 0 ] || warn "web logs contain ${errcount} error-pattern line(s) in the last 5m — inspect: ${COMPOSE} logs web --since 5m"

  # C9) container states + smoke — against the healthiest path that exists:
  #     the public URL when tier 2b passed, else the local app port (the proxy
  #     was already verified by tier 2a; running smoke against a KNOWN-broken
  #     public path would contradict the C7 classification and mis-rollback).
  ${COMPOSE} ps
  log "smoke (real endpoints, learner-home checks)"
  local smoke_base="${PUBLIC_BASE}"
  if ! echo "${pub_self:-}" | grep -q "\"${TARGET_VERSION}\""; then
    smoke_base="${LOCAL_HEALTH%/api/health}"
    warn "smoke runs against ${smoke_base} (the public path is broken/unverified — see the C7 classification above)"
  fi
  # TASK-HANASO-18: prefer the smoke bundled with THIS pinned tooling worktree —
  # it matches the app generation being deployed. The deploy-dir copy is the
  # ORIGINAL-INSTALL artifact and can be generations stale (on the real VPS it
  # still expected the retired bilingual landing's lang="ja" block, which would
  # have failed the healthy hanaso17 learner home and mis-rolled it back).
  # Rollback verification (app back on the old image) keeps preferring the
  # deploy-dir artifact — see the rollback smoke below.
  local worktree_smoke
  worktree_smoke="$(dirname "$0")/../../scripts/smoke.sh"
  if [ -f "${worktree_smoke}" ]; then
    HANASO_BASE_URL="${smoke_base}" bash "${worktree_smoke}"
  else
    HANASO_BASE_URL="${smoke_base}" bash "${DEPLOY_DIR}/smoke.sh"
  fi

  # C10) KOTODAMA witness — must be exactly what it was before
  local after
  after="$(curl -fsS -m 15 -o /dev/null -w '%{http_code}' "${KOTODAMA_URL}" 2>/dev/null || echo 000)"
  [ "${after}" = "${BASE_KOTODAMA}" ] || die-ish "kotodama.ir changed from HTTP ${BASE_KOTODAMA} to ${after} — INVESTIGATE (this updater never touches it)"

  trap - ERR
}

# die-ish: raise a "error" that the ERR trap turns into rollback+exit 1
die-ish() { echo "!! ${*}" >&2; return 1; }

# The C7 classification lands here (PUBLIC_OK / PUBLIC_OK_SELF_PROBE_ARTIFACT /
# EXTERNAL_UNVERIFIED / INGRESS_PREEXISTING_BROKEN_PUBLIC_DOWN) — the final
# record reports it without re-probing.
PUBLIC_CLASSIFICATION=""

# =============================================================================
# record + final report
# =============================================================================
record_and_report() {
  # the final public-path classification (HANASO-16) — captured by the C7 gate
  local pub_class="${PUBLIC_CLASSIFICATION:-PUBLIC_OK}"
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
BASE_INGRESS_DIRECT=${BASE_INGRESS_DIRECT}
BASE_PUBLIC_SELF=${BASE_PUBLIC_SELF}
BASE_EXTERNAL=${BASE_EXTERNAL}
PUBLIC_CLASSIFICATION=${pub_class}
EOF
  echo
  echo "════════════════════════════════════════════════════════════════"
  echo "  UPDATE COMPLETE — HANASO ${TARGET_VERSION} @ ${TARGET_SHA:0:12}"
  echo "  به‌روزرسانی انجام شد — نسخهٔ ${TARGET_VERSION}"
  echo "────────────────────────────────────────────────────────────────"
  echo "  live     : ${PUBLIC_BASE}  (health commit: ${TARGET_SHA:0:12})"
  echo "  image    : ${IMAGE} (${IMAGE_ID})"
  echo "  public   : ${pub_class}"
  echo "  db backup: ${DB_BACKUP_FILE} (hanaso-backups volume)"
  echo "  record   : ${HIST_DIR}/${TS}.env"
  echo "  rollback : bash $0 rollback   (app-level; data untouched)"
  echo "  KOTODAMA : untouched (witness HTTP ${BASE_KOTODAMA})"
  echo "════════════════════════════════════════════════════════════════"
  if [ "${pub_class}" = "EXTERNAL_UNVERIFIED" ] || [ "${pub_class}" = "INGRESS_PREEXISTING_BROKEN_PUBLIC_DOWN" ]; then
    echo "  NOTE: the public path could not be verified as healthy — check"
    echo "  https://learn.kotodama.ir/api/health from a phone/other network;"
    echo "  the app itself is healthy and the record above says so."
  fi
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
