# طرح استقرار Preview (PREVIEW-DEPLOYMENT-PLAN) — ایزوله و امن

> **وضعیت:** آمادهٔ اجرا؛ **اجرا نشده** — محیط Agent نه Docker دارد نه دسترسی VPS (BLOCKER-F02) و DNS تأییدنشده (BLOCKER-F04). این سند + `infra/` طوری نوشته شده‌اند که مالک/Agent با دسترسی، بدون طراحی مجدد اجرا کند. (مأموریت §۸)

## ۰. اصول (قفل‌شده)

- ایزوله‌بودن: شبکه/حجم/پورت‌های مخصوص `hanaso-*`؛ هیچ سرویس موجودی روی VPS متوقف/حذف/بازپیکربندی نمی‌شود.
- دادهٔ فرضی فقط؛ health-check؛ روش rollback؛ توقف deploy بدون آسیب.
- هیچ migration مخرب/حذف volume/تغییر firewall مشترک بدون بررسی+بکاپ+مجوز.

## ۱. پیش‌نیازهای مالک (چک‌لیست کامل: `VPS-OWNER-CHECKLIST.md`)

VPS اروپایی (نه Hetzner — TRK-010) + Docker/Compose + رکورد DNS `preview.hanaso.ir` → IP + پورت‌های 80/443 آزاد (یا تصمیم هم‌زیستی با reverse-proxy موجود).

## ۲. توپولوژی اسکلت (M0 — بدون DB)

```mermaid
flowchart LR
    U[کاربر] -->|HTTPS| C[caddy:2.11<br/>TLS + headers] --> W[web (hanaso image, SHA-tagged)<br/>:3000 internal]
    W -->|healthcheck wget /api/health| W
```

سرویس‌های بعدی (M0-10): `postgres:18-alpine` + `pgbouncer 1.26.1` + `worker` (همان image، entrypoint جدا) + بکاپ restic — **افزودنی به همین compose، بدون تغییر معماری**.

## ۳. مراحل اجرا (روی VPS)

```bash
git clone https://github.com/AbolfazlProg/hanaso.git /srv/hanaso && cd /srv/hanaso
cp infra/docker/.env.preview.example .env    # تنظیم مقادیر؛ هرگز commit نشود
docker login ghcr.io                         # PAT با read:packages
bash infra/deploy/deploy.sh <SHA>            # pull→up→health-gate→smoke؛ شکست=خروج امن
```

`deploy.sh`: پایش `/api/health` تا ۳۰×۲ثانیه؛ سپس `scripts/smoke.sh` (سه بررسی: `/api/health` + `/api/ready` + صفحهٔ ریشهٔ RTL/ژاپنی). `rollback.sh <SHA-قبلی>`: استقرار مجدد تگ immutable قبلی + همان گیت.

## ۴. امنیت و بازگشت

- Caddy: TLS خودکار ACME + هدرهای KB (HSTS/nosniff/Referrer-Policy/Permissions-Policy/X-Frame-Options DENY/حذف Server).
- فقط 80/443 عمومی؛ web در شبکهٔ داخلی؛ کانتینر non-root؛ HEALTHCHECK داخلی.
- Rollback: تصمیم تا سالم <۱۰ دقیقه؛ بدون تغییر داده (اسکلت DB ندارد).

## ۵. راهکار جایگزین تا تأیید DNS

Preview موقت روی `http://<IP>:8080` (بلوک کامنت‌شدهٔ Caddyfile) یا `hosts` محلی مالک؛ پس از رکورد DNS، بدون تغییر دیگری TLS فعال می‌شود.

## ۶. معیار موفقیت استقرار

(۱) `https://preview.hanaso.ir` پاسخ ۲۰۰ · (۲) `/api/health` سبز با SHA صحیح · (۳) `/api/ready` سبز · (۴) smoke سه‌گانه سبز · (۵) rollback در دریل واقعی کار کند · (۶) هیچ سرویس دیگری روی VPS تغییری نکرده باشد (`docker ps` قبل/بعد ثبت شود).
