#!/usr/bin/env bash
# HANASO-IR deploy — step 1: READ-ONLY recon of the new production server.
# Writes findings to the temporary mission log dir served by the existing nginx.
# Changes NOTHING (no installs, no config edits) — mission §3 requires recon first.
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
mkdir -p "$MDIR"
chmod 755 "$MDIR"

{
  echo "== host/time =="
  hostname
  date -u '+%FT%TZ'
  echo
  echo "== os/kernel =="
  . /etc/os-release && echo "$PRETTY_NAME"
  uname -srm
  echo
  echo "== cpu =="
  echo "cores: $(nproc)"
  grep -m1 'model name' /proc/cpuinfo || true
  echo
  echo "== memory (MB) =="
  free -m
  echo
  echo "== swap =="
  swapon --show || echo "(none)"
  echo
  echo "== disk =="
  df -h / /var /tmp 2>/dev/null
  echo
  echo "== listening ports (host) =="
  ss -tlnp 2>/dev/null | awk 'NR>1 {print $4"  "$6}' | sort -u
  echo
  echo "== running services =="
  systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}' | head -25
  echo
  echo "== nginx version + vhosts (structural lines only — full dump NOT logged) =="
  nginx -v 2>&1
  nginx -T 2>/dev/null | grep -nE "^\s*(server_name|listen|root|proxy_pass|auth_basic|ssl_certificate|include)" | head -60
  echo
  echo "== nginx sites =="
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
  ls -la /etc/nginx/conf.d/ 2>/dev/null || true
  echo
  echo "== web roots =="
  ls -la /var/www/html/ 2>/dev/null | head -10
  echo
  echo "== docker present? =="
  command -v docker && docker --version || echo "docker: NOT installed"
  command -v certbot && certbot --version || echo "certbot: NOT installed"
  echo
  echo "== existing containers =="
  docker ps -a 2>/dev/null || echo "(docker not available)"
  echo
  echo "== dns/self view =="
  getent hosts hanaso.ir ops.hanaso.ir || true
  echo
  echo "== time sync =="
  timedatectl 2>/dev/null | head -6
} > "$MDIR/recon.log" 2>&1

chmod 644 "$MDIR/recon.log"
echo DONE > "$MDIR/recon.done"
chmod 644 "$MDIR/recon.done"
