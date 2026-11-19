# HANASO-IR — production deployment onto the NEW server (hanaso.ir)

> مسیر اجباری مأموریت: همهٔ دستورات سرور فقط از طریق Web Terminal پنل `ops.hanaso.ir` (ttyd) اجرا می‌شوند؛ SSH و GitHub Actions برای اتصال سرور استفاده نمی‌شوند.

## الگوی اجرا (چرا فایل‌محور؟)

تایپ اسکریپت‌های بلند در ترمینال وب (xterm.js) خطاپذیر است. به‌جای آن:

1. این اسکریپت‌ها در مخزن push می‌شوند (بدون هیچ secret).
2. در ترمینال فقط یک دستور کوتاه اجرا می‌شود: دانلود اسکریپت از GitHub با ref پین‌شده و اجرا.
3. خروجی هر مرحله به `/var/www/html/m-2cbd294f/` نوشته می‌شود و از بیرون با HTTP خوانده می‌شود (مسیر تصادفی/ناگماندنی، موقت — در پایان مأموریت حذف می‌شود).
4. مراحل طولانی (build image) با `nohup` در پس‌زمینه اجرا می‌شوند تا قطع‌شدن نشست مرورگر آسیب نزند.

## اسکریپت‌ها

| فایل | کار | تغییرات |
| --- | --- | --- |
| `01-recon.sh` | شناسنامهٔ سرور: OS/CPU/RAM/disk/ports/سرویس‌ها/ساختار nginx (فقط خطوط ساختاری، نه dump کامل) | فقط-خواندنی |
| `02-install-deploy.sh` | docker+compose-v2 → clone در `/opt/hanaso-src` و checkout پین `e2ae9d9…` (1.1.0-hanaso32-r01) → تولید `.env` با openssl روی خود سرور (فقط git-ignored path) → build/pull image → postgres → pgbouncer → migrate → web+worker → health gate → بررسی worker schedules → boot persistence | نصب/استقرار کامل |
| `03-nginx-https.sh` | بکاپ `/etc/nginx` → vhost جدید `hanaso.ir` (proxy به 127.0.0.1:3100) → `nginx -t` + reload → certbot Let's Encrypt → verify https → بررسی سلامت پنل ops (قرارداد: دست‌نخوردن) | فقط افزودن vhost جدید |
| `04-status.sh` | اسنپ‌شات وضعیت پس از استقرار (کونتینرها/health/cert/logها) | فقط-خواندنی |

## سیاست Secretها

- `POSTGRES_PASSWORD` و `HANASO_SESSION_SECRET` با `openssl rand` **روی خود سرور** تولید و فقط در `infra/deploy/learn-kotodama/.env` (git-ignored، mode 600) نوشته می‌شوند.
- هیچ رمز/token/.env به GitHub، لاگ‌ها یا گزارش نمی‌رود. ایمیل Let's Encrypt: `--register-unsafely-without-email` (در صورت شکست ثبت، fallback به ops@hanaso.ir) — فرض ثبت‌شده در گزارش نهایی.

## نقطهٔ بازگشت

- Release پین‌شده: `e2ae9d96e7bab9e38bb15124df6bfd3c788e984e` = `1.1.0-hanaso32-r01` (اولین CI کاملاً سبز: run 43868581700 — verify 858/858 + compose-smoke با تمرین واقعی backup/restore + build image؛ شامل رفع‌های مستند مأموریت قبل).
- بکاپ nginx در `/root/nginx-backup-*` قبل از هر تغییر.
- سرور تازه است: هیچ دادهٔ از پیش موجودی در خطر نیست؛ volumeهای دیتابیس named و پایدارند.
