# استقرار HANASO روی میزبان مشترک kotodama — `learn.kotodama.ir`

> وضعیت: **زنده از 2026-11-01** (RUN-20261101-03) · این پوشه = وضعیت دقیق و قابل‌تکرار VPS.
> مالک دستور داد Preview روی ساب‌دامنهٔ `learn.kotodama.ir` بالا بیاید و پروژهٔ قبلی همان آدرس
> (`genesis-learn`) غیرفعال شود. عمومی‌سازی دامنهٔ `hanaso.ir` در آینده (پیش از انتشار) جداگانه انجام می‌شود.

## ۱. معماری میزبان مشترک (بطور تجربی ممیزی شد)

```
کاربر ──HTTPS:443──▶ HAProxy (مالک *:443؛ TLS + ALPN)
                        │  ALPN فعلی میزبان فقط http/1.1 است → send-proxy → nginx :81
                        │  (شنوندهٔ nginx :82 برای h2 رزرو است؛ HAProxy فعلاً h2 تبلیغ نمی‌کند — الگوی خود میزبان، بدون تغییر)
                        ▼
                    nginx (vhost `hanaso-learn` = server_name learn.kotodama.ir)
                        │  proxy_pass → 127.0.0.1:3100
                        ▼
                    docker: hanaso-web (image SHA-tagged از GHCR، فقط loopback)
```

- **چرا caddyِ compose اصلی استفاده نشد؟** HAProxy/nginx همین حالا مالک 80/443 این سرورند و برای
  سرویس‌های دیگر (kotodama.ir، BigBlueButton) کار می‌کنند. طبق اصل «تنها ورودی عمومی = reverse-proxy
  موجود» (KB ADR-010)، HANASO پشت همان nginx نشست؛ `infra/docker/docker-compose.yml` (با caddy) برای
  **میزبان اختصاصی** است.
- **ایزولاسیون (KB ADR-003/010):** project name `hanaso` · شبکهٔ `hanaso-net` · انتشار فقط `127.0.0.1:3100` ·
  هیچ حجم/پورت/کانتینر مشترکی با استک‌های kotodama/BBB/voicevox ندارد.
- **TLS/گواهی:** روی HAProxy با certbundle موجود (SAN شامل `learn.kotodama.ir`؛ انقضا ۲۰۲۷-۰۱-۲۴).
  تمدید ACME-HTTP01 از مسیر :80 همان vhost پاس می‌دهد (آزموده شد: توکن جعلی → 404).
- سرویس بازنشسته: `genesis-learn.service` (stop+disable؛ بکاپ vhost: `/root/backups/pre-hanaso-20261101/`؛
  فایل‌های ۱۱۴MB در `/opt/genesis-learn` حذف نشده‌اند — حذف نهایی نیازمند تأیید مالک).

## ۲. فایل‌های روی VPS

| مسیر روی VPS                                                           | معادل در ریپو                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/opt/hanaso/docker-compose.yml`                                       | `infra/deploy/learn-kotodama/docker-compose.shared-vps.yml`                       |
| `/opt/hanaso/.env`                                                     | الگو: `infra/docker/.env.preview.example` (فقط `HANASO_WEB_IMAGE` + مقادیر عمومی) |
| `/opt/hanaso/smoke.sh`                                                 | `scripts/smoke.sh`                                                                |
| `/etc/nginx/sites-available/hanaso-learn` (+ symlink در sites-enabled) | `infra/deploy/learn-kotodama/hanaso-learn.nginx.conf`                             |

## ۳. deploy نسخهٔ جدید (SHA جدید main)

```bash
# ۱) image جدید را بکش (توکن GHCR فقط با stdin؛ هرگز در command-line/فایل نگذار):
cd /opt/hanaso
echo "<PAT با read:packages>" | docker login ghcr.io -u AbolfazlProg --password-stdin
sed -i 's|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=ghcr.io/abolfazlprog/hanaso:<SHA-جدید>|' .env
docker compose --env-file .env pull web && docker logout ghcr.io

# ۲) تعویض ترافیک + گیت سلامت (پیش از تعویض، image قدیمی محفوظ است):
docker compose --env-file .env up -d
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:3100/api/health | grep -q '"ok":true' && break; sleep 2; done
HANASO_BASE_URL=https://learn.kotodama.ir bash /opt/hanaso/smoke.sh

# ۳) هم‌گاهی KB ADR-015: commit گزارش‌شده در /api/health باید با tag image یکی باشد:
curl -fsS https://learn.kotodama.ir/api/health | grep -o '"commit":"[^"]*"'
```

## ۴. rollback

```bash
cd /opt/hanaso
sed -i 's|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=ghcr.io/abolfazlprog/hanaso:<SHA-قبلی>|' .env
docker compose --env-file .env up -d   # image قبلی هنوز لوکال است؛ pull لازم نیست
curl -fsS https://learn.kotodama.ir/api/health
```

بازگردانی پروژهٔ قبلی (در صورت نیاز واقعی): `systemctl enable --now genesis-learn` + بازگردانی
symlink قدیمی nginx از `/root/backups/pre-hanaso-20261101/` (پیش از آن، پورت 3100 باید از hanaso آزاد شود).

## ۵. محدودیت‌ها/ریسک‌های شناخته‌شده

- **Node میزبان = v22** ولی اپ `>=24` می‌خواهد → به همین دلیل مسیر اجرا Docker است (image بر base `node:24-alpine`). اجرای bare-metal روی این سرور ممنوع.
- میزبان Mobinhost (IR) است نه EU طبق TRK-010 — انتخاب مالک. تا امروز pull از `ghcr.io` بدون مشکل بود؛ در صورت اختلال تحریمی آتی، مسیر جایگزین: build لوکال image از git-bundle روی خود VPS.
- Preview فعلی **DB ندارد** (فاز اسکلت): `/api/ready` → `database: skipped`. با رسیدن لایهٔ دوم M0-10، سرویس postgres/pgbouncer/worker به همین compose (شبکهٔ `hanaso-net`) اضافه می‌شود — بدون تغییر معماری ورودی.
- این سرور هم‌زمان BigBlueButton زنده دارد؛ هر تغییر firewall/HAProxy/nginx **ممنوع** بدون بکاپ + تست + مجوز مالک.
