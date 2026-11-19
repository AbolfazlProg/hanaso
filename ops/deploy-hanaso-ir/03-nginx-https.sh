#!/usr/bin/env bash
# HANASO-IR deploy — step 3: nginx vhost for hanaso.ir (app reverse proxy) + Let's Encrypt.
# CONTRACT: the existing ops.hanaso.ir vhost (web-terminal panel) is NEVER modified —
# we only ADD a new vhost file and reload. No change may break the terminal access.
set -uo pipefail

MDIR="/var/www/html/m-2cbd294f"
LOG="$MDIR/https.log"
exec > >(tee -a "$LOG") 2>&1

step() { echo; echo "===== [$(date -u '+%T')] $1 ====="; }

step "0. backup existing nginx config"
BK="/root/nginx-backup-$(date +%Y%m%dT%H%M%S)"
cp -a /etc/nginx "$BK"
echo "backup: $BK"

step "1. vhost hanaso.ir (HTTP first — ACME + proxy)"
cat > /etc/nginx/sites-available/hanaso.ir.conf <<'NGINX'
# HANASO production — hanaso.ir → loopback compose upstream (127.0.0.1:3100).
# HTTPS is added by certbot (--nginx). The ops.hanaso.ir vhost is intentionally
# untouched (mission contract: web terminal must stay reachable).
server {
    listen 80;
    listen [::]:80;
    server_name hanaso.ir;

    # Let's Encrypt HTTP-01
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    client_max_body_size 25m;
}
NGINX
ln -sf /etc/nginx/sites-available/hanaso.ir.conf /etc/nginx/sites-enabled/hanaso.ir.conf
nginx -t || { echo "nginx -t FAILED — reverting"; rm -f /etc/nginx/sites-enabled/hanaso.ir.conf; nginx -t && systemctl reload nginx; exit 1; }
systemctl reload nginx
echo "vhost enabled + reloaded"

step "2. Let's Encrypt certificate (HTTP-01 on hanaso.ir)"
if [ -d "/etc/letsencrypt/live/hanaso.ir" ]; then
  echo "cert already exists — certbot renew check only"
  certbot renew --dry-run >/dev/null 2>&1 && echo "renew config OK" || echo "WARN renew dry-run failed"
else
  certbot --nginx -d hanaso.ir --non-interactive --agree-tos --redirect \
    --register-unsafely-without-email || \
  certbot --nginx -d hanaso.ir --non-interactive --agree-tos --redirect -m ops@hanaso.ir
fi

step "3. verify public HTTPS (self-view)"
sleep 2
curl -fsSI https://hanaso.ir/api/health | head -6
echo "body:"
curl -fsS https://hanaso.ir/api/health
echo
curl -fsSI https://hanaso.ir/ | head -4
echo "redirect check (http→https):"
curl -sI http://hanaso.ir/ | head -3

step "4. ops panel still intact (contract check)"
curl -sI https://ops.hanaso.ir/ | head -3
nginx -T 2>/dev/null | grep -c "server_name ops.hanaso.ir" || true

echo "STEP-DONE-HTTPS"
echo DONE > "$MDIR/https.done"
