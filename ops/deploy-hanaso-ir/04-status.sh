#!/usr/bin/env bash
# HANASO-IR deploy — step 4: post-deploy status snapshot (read-only) for the report.
set -uo pipefail
MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/status.log"
{
  echo "== containers =="
  docker compose -f /opt/hanaso-src/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml \
    --env-file /opt/hanaso-src/infra/deploy/learn-kotodama/.env ps 2>/dev/null || \
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
  echo
  echo "== health (loopback) =="
  curl -fsS http://127.0.0.1:3100/api/health || true
  echo
  echo "== ready (loopback) =="
  curl -fsS http://127.0.0.1:3100/api/ready || true
  echo
  echo "== public https health =="
  curl -fsS https://hanaso.ir/api/health || true
  echo
  echo "== cert =="
  ls /etc/letsencrypt/live/ 2>/dev/null || true
  openssl s_client -connect 127.0.0.1:443 -servername hanaso.ir </dev/null 2>/dev/null | openssl x509 -noout -subject -dates -issuer 2>/dev/null || true
  echo
  echo "== recent web log (tail 25) =="
  docker compose -f /opt/hanaso-src/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml \
    --env-file /opt/hanaso-src/infra/deploy/learn-kotodama/.env logs --tail 25 web 2>/dev/null | tail -30
  echo
  echo "== worker log (tail 15) =="
  docker compose -f /opt/hanaso-src/infra/deploy/learn-kotodama/docker-compose.shared-vps.yml \
    --env-file /opt/hanaso-src/infra/deploy/learn-kotodama/.env logs --tail 15 worker 2>/dev/null | tail -20
  echo
  echo "== disk/mem after deploy =="
  df -h / | tail -1
  free -m | head -2
} > "$LOG" 2>&1
echo DONE > "$MDIR/status.done"
