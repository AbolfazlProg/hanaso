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

## ۵. لایهٔ دیتابیس M0-10 (استقرار ۲۰۲۶-۱۱-۰۲)

سرویس‌های جدید در همان compose (پروژهٔ `hanaso`، شبکهٔ `hanaso-net`): `postgres` (postgres:18-alpine، pin دیجست، Volume اختصاصی `hanaso-pgdata`) · `pgbouncer` (edoburu v1.26.1-p0 با pin دیجست؛ `pool_mode=transaction`، `auth_type=scram`، `max_prepared_statements=200` — KB §۸-۴) · `worker` (همان image اپ؛ pg-boss 12 در حالت polling چون LISTEN/NOTIFY پشت transaction-pooling کار نمی‌کند؛ healthcheck از مسیر واقعی خودش یعنی `pgbouncer:6432`) · `migrate` (یک‌بارمصرف، پروفایل `migrate`).

**ایزولاسیون روی میزبان مشترک:** postgres و pgbouncer **هیچ پورتی منتشر نمی‌کنند** (فقط شبکهٔ داخلی Docker)؛ Volumeهای `hanaso-pgdata`/`hanaso-backups` مختص پروژه‌اند؛ سقف منابع در دو لایه: **سطح کانتینر** (`mem_limit`/`cpus` برای هر سرویس — دورهٔ بازبینی PR #74) و **سطح postgres** (`max_connections=40`، `shared_buffers=64MB`)؛ ورودی عمومی همچنان فقط nginx موجود → `127.0.0.1:3100`.

**نکتهٔ پیکربندی .env (پس از بازبینی):** `DATABASE_URL` و `DIRECT_DATABASE_URL` دیگر در `.env` نوشته نمی‌شوند — compose آنها را از سه مقدار `POSTGRES_USER/PASSWORD/DB` interpolate می‌کند (منبع یگانهٔ رمز). همچنین ابزارهای pg داخل image از همان image پین‌شدهٔ postgres کپی می‌شوند و جاب CI جدید `compose-smoke` کل استقرار مرحله‌ای + دریل بکاپ/ریستور را با image واقعی قبل از merge تکرار می‌کند.

### ۵-۱. استقرار مرحله‌ای (ترتیب الزامی)

```bash
cd /opt/hanaso
# ۰) image جدید (شامل Aizen + لایهٔ DB) — مثل قبل:
echo "<PAT با read:packages>" | docker login ghcr.io -u AbolfazlProg --password-stdin
sed -i 's|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=ghcr.io/abolfazlprog/hanaso:<SHA-جدید>|' .env
docker compose --env-file .env pull && docker logout ghcr.io

# ۱) فقط دیتابیس را بالا بیاور و منتظر سلامت بمان (web هنوز نسخهٔ قبلی سرو می‌کند):
docker compose --env-file .env up -d postgres
docker compose --env-file .env ps postgres   # تا (healthy) — نخستین اجرا به‌خاطر initdb (data-checksums) ممکن است تا ~۱ دقیقه طول بکشد؛ healthcheck از مسیر TCP است (سرور موقتِ فاز init فقط سوکت است)

# ۲) PgBouncer + گیت اتصال از مسیر اپ:
docker compose --env-file .env up -d pgbouncer
docker compose --env-file .env exec pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U hanaso

# ۳) Migration + Seed روی اتصال مستقیم (هرگز از PgBouncer — KB §۱):
docker compose --env-file .env run --rm migrate

# ۴) اپ جدید + worker:
docker compose --env-file .env up -d
curl -fsS https://learn.kotodama.ir/api/ready   # باید database: ok با serverVersion 18.x بدهد
HANASO_BASE_URL=https://learn.kotodama.ir bash /opt/hanaso/smoke.sh
```

### ۵-۲. عملیات دیتابیس (db-cli داخل image)

```bash
W="docker compose --env-file /opt/hanaso/.env exec -w /app worker node apps/web/.tools/db-cli.mjs"
$W jobs                       # زمان‌بندی‌ها + وضعیت jobها
$W verify                     # شمارش رکوردها + عمق صف pgboss
BACKUP_DIR=/backups $W backup # بکاپ دستی (همان روتین شبانه)
```

### ۵-۳. بکاپ شبانه و دریل Restore (TR-030 — «بکاپ تست‌شده = تنها بکاپ معتبر»)

- **زمان‌بندی:** jobهای pg-boss در worker — `ops.backup` هر شب ۰۳:۳۰ و `ops.db-verify` ۰۴:۰۰ به وقت تهران؛ هر بکاپ `pg_dump -Fc` است و **بلافاصله با `pg_restore --list` تأیید** می‌شود؛ نگهداشت: ۷ روزانه + ۴ هفتگی + ۶ ماهانه (سیاست KB)؛ خروجی در Volume `hanaso-backups`.
- **دریل Restore (الزامی، ماهانه یا پس از هر تغییر مهم):**

```bash
cd /opt/hanaso
# ۱) بکاپ واقعی بگیر:
docker compose --env-file .env exec -w /app -e BACKUP_DIR=/backups worker \
  node apps/web/.tools/db-cli.mjs backup   # خروجی JSON شامل file
# ۲) به دیتابیس آزمایشی مستقل برگردان (هرگز روی دیتابیس اصلی — CLI خودش هم رد می‌کند):
docker compose --env-file .env exec -w /app worker \
  node apps/web/.tools/db-cli.mjs restore --file /backups/<file>.dump --database hanaso_restore_test
# ۳) صحت: شمارش جدول‌ها در دیتابیس آزمایشی باید با اصلی یکی باشد:
docker compose --env-file .env exec -w /app worker node apps/web/.tools/db-cli.mjs verify
docker compose --env-file .env exec -w /app worker node apps/web/.tools/db-cli.mjs verify --database hanaso_restore_test
# ۴) اتصال اپ به دیتابیس اصلی در تمام مدت دریل دست‌نخورده می‌ماند (ready را چک کن).
```

### ۵-۴. Rollback (جدا برای اپ و دیتابیس)

- **اپ (بی‌خطر):** مثل §۴ — تعویض `HANASO_WEB_IMAGE` به SHA قبلی + `up -d web worker`. دیتابیس و داده‌ها دست‌نخورده می‌مانند.
- **دیتابیس (با احتیاط):** migrations اضافه‌شده را نگردانید (drizzle فقط forward-only است). برای بازگردانی داده: از جدیدترین dump با دریل §۵-۳ روی یک دیتابیس موقت restore و صحت‌سنجی کن، سپس با تصمیم آگاهانه جابه‌جا کن. **حذف Volume `hanaso-pgdata` فقط با تأیید صریح مالک** (آخرین راه).
- **کل استک HANASO:** `docker compose --env-file .env down` فقط برای پروژهٔ `hanaso` خطری برای سایر سرویس‌های میزبان ندارد، ولی طبق قاعدهٔ مالک روی این سرور اجرا نشود؛ کافی است سرویس‌ها را stop کرد.

## ۶. محدودیت‌ها/ریسک‌های شناخته‌شده

- **Node میزبان = v22** ولی اپ `>=24` می‌خواهد → به همین دلیل مسیر اجرا Docker است (image بر base `node:24-alpine`). اجرای bare-metal روی این سرور ممنوع.
- میزبان Mobinhost (IR) است نه EU طبق TRK-010 — انتخاب مالک. تا امروز pull از `ghcr.io` بدون مشکل بود؛ در صورت اختلال تحریمی آتی، مسیر جایگزین: build لوکال image از git-bundle روی خود VPS.
- **بکاپ خارج از سرور (restic → object storage) هنوز فعال نیست** — بکاپ‌ها فعلاً فقط روی Volume `hanaso-backups` همان VPS هستند (ریسک از دست رفتن هم‌زمان سرور+بکاپ). فعال‌سازی نیازمند دسترسی S3-compatible از مالک است (KB §۸؛ پیگیری).
- تست restore ماهانهٔ الزامی KB فعلاً به‌صورت دریل §۵-۳ روی همان سرور انجام می‌شود؛ پس از راه‌اندازی staging مستقل، دریل به آن منتقل می‌شود.
- این سرور هم‌زمان BigBlueButton زنده دارد؛ هر تغییر firewall/HAProxy/nginx **ممنوع** بدون بکاپ + تست + مجوز مالک.
