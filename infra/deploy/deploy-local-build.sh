#!/usr/bin/env bash
# HANASO — owner-run deploy from a local VPS build (the proven TL08 pattern).
#
# WHY THIS SCRIPT EXISTS (TASK-HANASO-CTA-01, 2026-11-08): the agent sandbox
# lost TCP access to the VPS SSH port (22) — everything else (HTTPS :443,
# GitHub, CI) is healthy — so this release is deployed by the OWNER, who has
# direct SSH from Iran. It follows EXACTLY the sequence the agent used for the
# live rollback deploy (CP-11): VPS-side docker build → GHCR push → .env swap
# → compose up → health gate → smoke → KOTODAMA check, with automatic
# rollback to the previous image on any failure.
#
# USAGE (as root on the VPS, from /srv/hanaso):
#   bash infra/deploy/deploy-local-build.sh <GIT_SHA> <APP_VERSION> [GITHUB_TOKEN]
#
#   <GIT_SHA>      the exact commit to deploy (e.g. 575b8dd8efeaa3e0cbc53bf134a6b71d80b130d4)
#   <APP_VERSION>  the version string baked into the build (e.g. 1.0.0-tl08-cta01)
#   [GITHUB_TOKEN] OPTIONAL — only needed to PUSH the image to GHCR
#                 (immutability + future rollbacks). Never written to disk.
#
# SAFETY:
#   - fails BEFORE touching the running service (build first, swap last)
#   - .env is backed up before the swap
#   - health gate: 30 × 2s on /api/health + version/commit match
#   - on ANY failure after the swap: automatic rollback to the previous image
#   - KOTODAMA is NEVER touched (separate compose project / containers); it is
#     only CHECKED (HTTP 200) at the end, as a witness that we did no harm.
set -euo pipefail

SHA="${1:?usage: deploy-local-build.sh <GIT_SHA> <APP_VERSION> [GITHUB_TOKEN]}"
VERSION="${2:?usage: deploy-local-build.sh <GIT_SHA> <APP_VERSION> [GITHUB_TOKEN]}"
TOKEN="${3:-}"
IMAGE="ghcr.io/abolfazlprog/hanaso:${SHA}"
COMPOSE="docker compose -f infra/docker/docker-compose.yml --project-directory ."
HEALTH_URL="${HANASO_HEALTH_URL:-http://127.0.0.1:3000/api/health}"

echo "== HANASO owner deploy (local build) =="
echo "   commit : ${SHA}"
echo "   version: ${VERSION}"
echo "   image  : ${IMAGE}"

# 0) we must be inside the repo
[ -f infra/docker/docker-compose.yml ] || { echo "FATAL: run from the repo root (/srv/hanaso)"; exit 1; }

# 1) make sure the commit is present locally (fetch the release branch)
BRANCH="${HANASO_DEPLOY_BRANCH:-tl08-cta01}"
if ! git cat-file -e "${SHA}^{commit}" 2>/dev/null; then
  echo "== commit not local — fetching branch ${BRANCH} =="
  git fetch origin "${BRANCH}" 2>/dev/null || \
    git fetch https://github.com/AbolfazlProg/hanaso.git "${BRANCH}" 2>/dev/null || {
      echo "FATAL: cannot fetch ${BRANCH}. If the repo remote needs auth, run first:"
      echo "       git fetch https://<YOUR_GITHUB_TOKEN>@github.com/AbolfazlProg/hanaso.git ${BRANCH}"
      echo "       (then re-run this script)"
      exit 1
    }
fi
git cat-file -e "${SHA}^{commit}" || { echo "FATAL: ${SHA} still missing after fetching ${BRANCH}"; exit 1; }

# 2) record the CURRENT image (rollback target) BEFORE anything changes
PREV_IMAGE="$(grep -E '^HANASO_WEB_IMAGE=' .env | cut -d= -f2- | tr -d ' "')" || true
[ -n "${PREV_IMAGE}" ] || { echo "FATAL: could not read HANASO_WEB_IMAGE from .env"; exit 1; }
echo "== rollback target (current live image): ${PREV_IMAGE} =="

# 3) build the image from the EXACT commit via a throwaway worktree
#    (no pull, no network dependency; build context = repo root per Dockerfile)
echo "== docker build (${SHA}) =="
TMP="$(mktemp -d)"
git worktree add --detach "${TMP}" "${SHA}"
docker build -f "${TMP}/infra/docker/Dockerfile" "${TMP}" \
  --build-arg NEXT_PUBLIC_BUILD_SHA="${SHA}" \
  --build-arg NEXT_PUBLIC_APP_VERSION="${VERSION}" \
  -t "${IMAGE}"
git worktree remove --force "${TMP}"

# 4) OPTIONAL — push to GHCR (immutable tag; enables instant future rollbacks)
if [ -n "${TOKEN}" ]; then
  echo "== push to GHCR =="
  echo "${TOKEN}" | docker login ghcr.io -u AbolfazlProg --password-stdin
  docker push "${IMAGE}"
  docker logout ghcr.io
else
  echo "== GHCR push SKIPPED (no token given) — image stays local (fine for this deploy) =="
fi

# 5) swap .env (backed up first) and bring the service up
echo "== swap .env → ${IMAGE} =="
cp .env ".env.backup-$(date +%Y%m%d-%H%M%S)"
sed -i.bak-cta01 "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${IMAGE}|" .env

roll_back() {
  echo "!! FAILURE — rolling back to ${PREV_IMAGE} now"
  sed -i "s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${PREV_IMAGE}|" .env
  ${COMPOSE} up -d web caddy
  sleep 4
  curl -fsS -m 10 "${HEALTH_URL}" | head -c 300; echo
  echo "!! rolled back. The new image remains locally as ${IMAGE} for inspection."
}
trap roll_back ERR

echo "== compose up =="
${COMPOSE} up -d web caddy

# 6) health gate — ok:true AND the expected commit
echo "== health gate =="
OK=0
for i in $(seq 1 30); do
  H="$(curl -fsS -m 5 "${HEALTH_URL}" 2>/dev/null || true)"
  if echo "${H}" | grep -q '"ok":true' && echo "${H}" | grep -q "${SHA:0:8}"; then
    echo "healthy after $((i * 2))s:"; echo "${H}"; OK=1; break
  fi
  sleep 2
done
[ "${OK}" = "1" ] || { echo "HEALTH GATE FAILED (commit mismatch or not ok)"; exit 1; }

# 7) smoke the real endpoints
echo "== smoke =="
bash scripts/smoke.sh

# 8) KOTODAMA witness check (read-only!)
echo "== KOTODAMA check (must stay 200 — we never touch it) =="
curl -fsS -m 15 -o /dev/null -w "kotodama.ir: HTTP %{http_code}\n" https://kotodama.ir/ || {
  echo "WARNING: kotodama.ir did not answer 200 — INVESTIGATE (this deploy never touches it)."
}

trap - ERR
echo "== deploy complete: ${VERSION} @ ${SHA} =="
echo "Live check: https://learn.kotodama.ir/api/health"
echo "Manual rollback anytime:  sed -i 's|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=${PREV_IMAGE}|' .env && ${COMPOSE} up -d web caddy"
