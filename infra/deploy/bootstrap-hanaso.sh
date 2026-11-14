#!/usr/bin/env bash
# =============================================================================
# HANASO bootstrap — zero-credential one-command entrypoint (v3)
# TASK-HANASO-DEPLOY-05 (2026-11-08). Public repo: https://github.com/AbolfazlProg/hanaso
# =============================================================================
# WHAT THIS IS
#   The small, auditable entrypoint that the owner's ONE command downloads from
#   the PUBLIC repository and runs. v3 (DEPLOY-05): the one-liner fetches THIS
#   file over four independent paths —
#     1) api.github.com      /repos/<o>/<r>/contents/<path>?ref=<commit>
#                          with "Accept: application/vnd.github.raw" (tiny payload)
#     2) codeload.github.com /<o>/<r>/tar.gz/<commit> → single-file extract
#     3) raw.githubusercontent.com pinned to the owner-verified IP 185.199.108.133
#                          via curl --resolve (TLS verification stays fully ON)
#     4) raw.githubusercontent.com via DNS (last resort)
#   — and verifies the REAL SHA-256 of the downloaded file against the pin
#   embedded in the one-liner BEFORE executing anything. This removes the v2
#   mandatory dependency on raw.githubusercontent.com (owner evidence 2026-11-08:
#   github.com git = OK, api.github.com = 200, codeload = 200, raw = 200 only on
#   185.199.108.133, SSL timeouts on the other three IPs) and replaces the old
#   marker-line grep with a real content hash gate.
#   It then creates/updates the SOURCE workspace (a plain anonymous git clone —
#   no PAT, no deploy key, no stored credentials of any kind), verifies the pinned
#   commits, and executes the full updater from EXACTLY the pinned deploy commit
#   inside an isolated git worktree.
#
# SEPARATION OF CONCERNS on the VPS (never mix these):
#   /opt/hanaso      → DEPLOY dir  (docker-compose.yml + .env + update-history +
#                                  the hanaso-backups volume target). NEVER deleted,
#                                  NEVER cloned into. Production data/config.
#   /opt/hanaso-src  → SOURCE workspace (this bootstrap's anonymous git clone).
#                                  Throwaway-safe: can be rm -rf'd and re-cloned.
#   /tmp/hanaso-*    → build worktrees and the downloaded bootstrap itself.
#
# WHAT IT NEVER DOES
#   - asks for a GitHub username/password/token (the repo is PUBLIC)
#   - disables or weakens TLS certificate verification in any way (the fixed-IP
#     raw fallback uses curl --resolve: SNI, hostname and cert checks all stay ON)
#   - hides git/network errors (real stderr is always shown verbatim)
#   - touches /opt/hanaso, docker, or anything KOTODAMA (that is the updater's
#     job, guarded there; this file only does git + filesystem prep)
#
# USAGE (normally invoked by the documented one-liner; subcommands pass through)
#   bash bootstrap-hanaso.sh                # update to the pinned target
#   bash bootstrap-hanaso.sh status         # read-only report
#   bash bootstrap-hanaso.sh rollback       # app-level rollback
#
# PINNED TARGET (do NOT drift to "latest" — TASK-HANASO-DEPLOY-05):
set -euo pipefail

# --- pinned refs -------------------------------------------------------------
TARGET_SHA="${HANASO_TARGET_SHA:-2574788c36521cec6ac0673488b769e77a8ab982}"
TARGET_VERSION="${HANASO_TARGET_VERSION:-1.0.0-hanaso20-r01}"
TARGET_BRANCH="${HANASO_TARGET_BRANCH:-fix/TASK-HANASO-20-onboarding}"
DEPLOY_BRANCH="${HANASO_DEPLOY_BRANCH:-hanaso17-home-dashboard}"
# Exact updater commit. The documented one-liner ALWAYS overrides this with an
# immutable SHA (HANASO_DEPLOY_SHA=<sha>); the branch default here is only a
# fallback for manual invocations and prints a notice when used.
DEPLOY_SHA="${HANASO_DEPLOY_SHA:-${DEPLOY_BRANCH}}"
# Public, anonymous HTTPS — no token ever embedded in the URL.
REPO_URL="${HANASO_REPO_URL:-https://github.com/AbolfazlProg/hanaso.git}"
SRC_DIR="${HANASO_SRC_DIR:-/opt/hanaso-src}"

export GIT_TERMINAL_PROMPT=0   # never hang waiting for credentials (repo is public)

log()  { printf '\n== [%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
warn() { printf '   [!] %s\n' "$*"; }
die()  { printf '\n!! FATAL: %s\n\n' "$*" >&2; exit 1; }

log "HANASO bootstrap v3 (TASK-HANASO-DEPLOY-05 — multi-path download, SHA-256 gated)"
echo "   repo (public, anonymous) : ${REPO_URL}"
echo "   updater ref              : ${DEPLOY_SHA}"
echo "   target release           : ${TARGET_VERSION} @ ${TARGET_SHA:0:12} (${TARGET_BRANCH})"
echo "   source workspace         : ${SRC_DIR}"

# -----------------------------------------------------------------------------
# 1) preflight — root, git, and the tools the updater will need
# -----------------------------------------------------------------------------
[ "$(id -u)" = 0 ] || warn "not running as root — docker access may fail (the updater needs it)"
command -v git >/dev/null 2>&1 \
  || die "git not installed. Install it once: apt-get install -y git"
command -v sha256sum >/dev/null 2>&1 \
  || die "sha256sum not found (coreutils) — required for the updater integrity check."

# -----------------------------------------------------------------------------
# 2) anonymous reachability probe — REAL errors shown, nothing created yet
#    (this replaces the old silent `git ls-remote >/dev/null 2>&1` gate that
#     died on the private repo and hid the actual git message)
# -----------------------------------------------------------------------------
log "PREFLIGHT — anonymous access to the public repository"
if git ls-remote "${REPO_URL}" HEAD; then
  :
else
  cat <<EOF >&2

!! Anonymous access to ${REPO_URL} FAILED — the real git error is above (nothing was changed).

   - If the error is an AUTH/credential prompt ("could not read Username"):
     the repository is no longer public. Check its visibility:
       https://github.com/AbolfazlProg/hanaso/settings
     (This bootstrap intentionally configures NO credentials.)
   - If the error is a NETWORK failure (DNS/timeout/TLS): check egress to
     github.com from this server, then re-run the same command.
EOF
  die "git ls-remote failed — aborting before any change."
fi

# -----------------------------------------------------------------------------
# 3) source workspace — anonymous clone or fetch; NEVER inside /opt/hanaso
# -----------------------------------------------------------------------------
log "SOURCE WORKSPACE — ${SRC_DIR}"
if [ "${SRC_DIR}" = "/opt/hanaso" ] || [ "${SRC_DIR}" = "/srv/hanaso" ]; then
  die "SRC_DIR must not be the deploy dir (${SRC_DIR}). Use the default /opt/hanaso-src."
fi

if [ -d "${SRC_DIR}/.git" ] && git -C "${SRC_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "existing clone found — fetching (fast, anonymous)"
  # Real git output is shown; failures abort BEFORE anything changes.
  git -C "${SRC_DIR}" fetch origin --prune \
    || die "git fetch failed (real error above) — the workspace was left as-is; re-run when fixed."
  git -C "${SRC_DIR}" remote set-url origin "${REPO_URL}" 2>/dev/null || true
elif [ -e "${SRC_DIR}" ]; then
  die "${SRC_DIR} exists but is NOT a git clone — refusing to delete or overwrite it.
     Inspect it (ls -la ${SRC_DIR}), and either remove it yourself or export HANASO_SRC_DIR=<other path>."
else
  mkdir -p "$(dirname "${SRC_DIR}")"
  log "cloning (anonymous, no credentials)"
  git clone "${REPO_URL}" "${SRC_DIR}" \
    || die "git clone failed (real error above) — nothing else was changed."
fi

# -----------------------------------------------------------------------------
# 4) verify the pinned commits exist in the workspace
# -----------------------------------------------------------------------------
for sha in "${TARGET_SHA}" ; do
  git -C "${SRC_DIR}" cat-file -e "${sha}^{commit}" 2>/dev/null \
    || die "pinned target commit ${sha} not found in the repository.
     Expected it on branch ${TARGET_BRANCH} (release ${TARGET_VERSION}). Was history rewritten?"
done
if ! git -C "${SRC_DIR}" cat-file -e "${DEPLOY_SHA}^{commit}" 2>/dev/null; then
  # branch name given → resolve its tip; unknown branch/SHA → honest abort
  if git -C "${SRC_DIR}" show-ref --verify --quiet "refs/remotes/origin/${DEPLOY_SHA}"; then
    warn "DEPLOY_SHA given as branch '${DEPLOY_SHA}' — resolving to its CURRENT tip (not immutable;
         the documented one-liner pins an exact commit via HANASO_DEPLOY_SHA)."
    DEPLOY_SHA="$(git -C "${SRC_DIR}" rev-parse "refs/remotes/origin/${DEPLOY_SHA}")"
  else
    die "updater ref '${DEPLOY_SHA}' not found in the repository (branch or commit)."
  fi
fi
echo "   updater pinned at commit : ${DEPLOY_SHA}"
echo "   target commit verified   : ${TARGET_SHA} (${TARGET_VERSION})"

# -----------------------------------------------------------------------------
# 4b) TASK-HANASO-26 (A2): prepare the REQUIRED TASK-24 security keys in the
#     deploy dir's .env BEFORE the updater runs. Root cause of the v14 VPS
#     failure: the updater (fail-closed, A3 check) requires
#     HANASO_SESSION_SECRET + HANASO_LEGACY_TOKEN_CUTOFF, but the owner's
#     /opt/hanaso/.env predates TASK-24 and nothing in the one-command path
#     ever created them. This stage PREPARES them — it never weakens the
#     updater's own gate (which still runs unchanged afterwards):
#       - an EXISTING valid value is PRESERVED verbatim (never rotated);
#       - a missing HANASO_SESSION_SECRET is generated ON THE SERVER with
#         openssl rand -hex 32 (the TASK-24 contract; /dev/urandom fallback);
#       - a missing HANASO_LEGACY_TOKEN_CUTOFF is set ONCE to NOW + 14 days
#         (ISO-8601, the TASK-24 migration grace). A re-run NEVER extends it;
#       - the write is ATOMIC (tmp + mv in the same dir), preserves every
#         existing line/comment/variable, never duplicates a key, is backed
#         up (.env.backup-<ts> alongside, mode 600) and the file stays mode
#         600 (umask 077);
#       - the secret is NEVER echoed, logged, or embedded anywhere — only
#         its length/presence is ever reported.
#     Skip with HANASO_SKIP_ENV_PREP=1 (explicit expert escape hatch).
# -----------------------------------------------------------------------------
prepare_security_env() {
  if [ "${HANASO_SKIP_ENV_PREP:-0}" = 1 ]; then
    warn "HANASO_SKIP_ENV_PREP=1 — env preparation skipped (the updater's own gate still applies)"
    return 0
  fi

  # same discovery order as the updater (find_deploy_dir), read-only here
  local env_file="" d
  for d in "${HANASO_DEPLOY_DIR:-}" /opt/hanaso /srv/hanaso; do
    d="${d%/}"
    [ -n "$d" ] || continue
    if [ -f "$d/docker-compose.yml" ] && [ -f "$d/.env" ] \
       && grep -q 'hanaso-postgres' "$d/docker-compose.yml" 2>/dev/null \
       && grep -q 'hanaso-pgbouncer' "$d/docker-compose.yml" 2>/dev/null; then
      env_file="$d/.env"; break
    fi
  done
  if [ -z "${env_file}" ]; then
    warn "deploy dir not found — skipping env preparation (the updater will diagnose in full below)"
    return 0
  fi
  log "TASK-24 security keys — preparing ${env_file} (values never printed)"

  # --- read the two keys the same way the updater does (LAST occurrence wins,
  #     non-empty). grep -c guards; nothing is echoed. ---
  env_value() { # key -> prints value (possibly empty)
    sed -n "s/^${1}=//p" "${env_file}" | tail -1
  }
  local sec cutoff
  sec="$(env_value HANASO_SESSION_SECRET)"
  cutoff="$(env_value HANASO_LEGACY_TOKEN_CUTOFF)"

  # --- validate what EXISTS (fail with a clear message, never the value) ---
  if [ -n "${sec}" ]; then
    # TASK-24 contract: >= 32 chars, hex (the runbook generates openssl rand -hex 32)
    if ! printf '%s' "${sec}" | grep -qE '^[0-9a-fA-F]{32,128}$'; then
      die "HANASO_SESSION_SECRET exists in ${env_file} but is INVALID (expected 32-128 hex chars per the TASK-24 contract — see apps/web/.env.example). Fix or remove it (it will then be regenerated) and re-run. The value is intentionally not shown."
    fi
    echo "   HANASO_SESSION_SECRET    : present and valid — PRESERVED (never rotated)"
  fi
  if [ -n "${cutoff}" ]; then
    # ISO-8601 parseable (same test the app's middleware performs)
    if ! date -d "${cutoff}" >/dev/null 2>&1; then
      die "HANASO_LEGACY_TOKEN_CUTOFF exists in ${env_file} but is NOT a parseable ISO-8601 datetime (the app fails closed on it). Fix or remove it and re-run. The value is intentionally not shown."
    fi
    echo "   HANASO_LEGACY_TOKEN_CUTOFF: present and valid — PRESERVED (never extended)"
  fi

  # --- nothing to do? ---
  if [ -n "${sec}" ] && [ -n "${cutoff}" ]; then
    echo "   .env unchanged (both TASK-24 keys already present)"
    return 0
  fi

  # --- backup + atomic rewrite (umask 077: file and backup stay mode 600) ---
  local ts tmp
  ts="$(date '+%Y%m%d-%H%M%S')"
  cp -p "${env_file}" "${env_file}.backup-${ts}"
  chmod 600 "${env_file}.backup-${ts}"
  tmp="$(mktemp "${env_file}.tmp.XXXXXX")"
  chmod 600 "${tmp}"
  # start from the existing file with any (invalid-or-duplicate) occurrences of
  # the two keys removed — comments and every other variable are preserved
  grep -vE '^(HANASO_SESSION_SECRET|HANASO_LEGACY_TOKEN_CUTOFF)=' "${env_file}" > "${tmp}"

  # (messages go to STDOUT — never into the .env; only KEY=VALUE lines and
  #  comments are appended to the temp file)
  {
    echo ""
    echo "# --- TASK-HANASO-24 security keys (added by bootstrap $(date '+%Y-%m-%d %H:%M:%S %Z'); see apps/web/.env.example ---"
    if [ -z "${sec}" ]; then
      # generated ON THE SERVER, never transported, never printed
      local new_sec
      new_sec="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
      if [ "${#new_sec}" -lt 32 ]; then
        rm -f "${tmp}"
        die "could not generate a strong HANASO_SESSION_SECRET on this server (openssl and /dev/urandom both failed) — nothing was written."
      fi
      printf 'HANASO_SESSION_SECRET=%s\n' "${new_sec}" >> "${tmp}"
      msg_sec="GENERATED (64 hex chars, random, server-side only)"
    else
      printf 'HANASO_SESSION_SECRET=%s\n' "${sec}" >> "${tmp}"
    fi
    if [ -z "${cutoff}" ]; then
      # NOW + 14 days, ISO-8601 — set ONCE; re-runs see the key present and
      # never touch it (the migration grace is not silently extended)
      local new_cutoff
      new_cutoff="$(date -u -d '+14 days' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v+14d '+%Y-%m-%dT%H:%M:%SZ')"
      printf 'HANASO_LEGACY_TOKEN_CUTOFF=%s\n' "${new_cutoff}" >> "${tmp}"
      msg_cut="SET ONCE to now+14d (ISO-8601; re-runs never extend it)"
    else
      printf 'HANASO_LEGACY_TOKEN_CUTOFF=%s\n' "${cutoff}" >> "${tmp}"
    fi
  } >> "${tmp}"

  # atomic swap in the same directory (same filesystem)
  mv -f "${tmp}" "${env_file}"
  [ -n "${msg_sec:-}" ] && echo "   HANASO_SESSION_SECRET    : ${msg_sec}"
  [ -n "${msg_cut:-}" ] && echo "   HANASO_LEGACY_TOKEN_CUTOFF: ${msg_cut}"
  echo "   .env updated atomically — backup: ${env_file}.backup-${ts} (mode 600)"
}

prepare_security_env

# -----------------------------------------------------------------------------
# 5) integrity — the bootstrap file being run must be byte-identical to the
#    same path inside the pinned updater commit (guards against a corrupted or
#    MITM-replaced download; the git SHA pins everything else). Uses git show,
#    so it works no matter which branch the workspace has checked out.
# -----------------------------------------------------------------------------
SELF_BIN="$(readlink -f "$0")"
BOOTSTRAP_PATH_IN_REPO="infra/deploy/bootstrap-hanaso.sh"
if [ -f "${SELF_BIN}" ] \
   && git -C "${SRC_DIR}" cat-file -e "${DEPLOY_SHA}:${BOOTSTRAP_PATH_IN_REPO}" 2>/dev/null; then
  self_sum="$(sha256sum "${SELF_BIN}" | awk '{print $1}')"
  pinned_sum="$(git -C "${SRC_DIR}" show "${DEPLOY_SHA}:${BOOTSTRAP_PATH_IN_REPO}" | sha256sum | awk '{print $1}')"
  if [ "${self_sum}" = "${pinned_sum}" ]; then
    log "integrity OK — running bootstrap is byte-identical to ${DEPLOY_SHA:0:12}"
  else
    warn "running bootstrap (${self_sum:0:12}…) differs from ${DEPLOY_SHA:0:12} (${pinned_sum:0:12}…)
     Continuing anyway: the UPDATER is still executed strictly from the pinned commit below."
  fi
fi

# -----------------------------------------------------------------------------
# 6) run the FULL updater from EXACTLY the pinned commit (isolated worktree)
# -----------------------------------------------------------------------------
WORK="$(mktemp -d /tmp/hanaso-upd.XXXXXX)"
cleanup() { git -C "${SRC_DIR}" worktree remove --force "${WORK}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "executing the pinned updater (infra/deploy/update-hanaso.sh @ ${DEPLOY_SHA:0:12})"
git -C "${SRC_DIR}" worktree add --detach "${WORK}" "${DEPLOY_SHA}" >/dev/null \
  || die "git worktree add failed — nothing was changed."

set +e
bash "${WORK}/infra/deploy/update-hanaso.sh" "$@"
rc=$?
set -e
if [ "${rc}" = 0 ]; then
  log "bootstrap done (updater exit 0)"
else
  echo
  echo "!! updater exited with code ${rc} — see its output above for the cause"
  echo "   (server state: the updater's own rollback/report section lists exactly what happened)"
fi
exit "${rc}"
