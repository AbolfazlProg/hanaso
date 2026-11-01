# راهنمای عملیات (OPERATIONS_GUIDE) — فارسی

> مخاطب: مالک + Agent نقش Integration/Release. مرجع مفصل: KB `deployment-strategy.md` + `infrastructure-and-devops.md`.

## محیط‌ها

| محیط            | آدرس                                                       | داده                        | وضعیت                            |
| --------------- | ---------------------------------------------------------- | --------------------------- | -------------------------------- |
| Local           | `localhost:3000`                                           | فرضی                        | فعال                             |
| Preview/Staging | `preview.hanaso.ir` (پیشنهادی؛ تا تأیید DNS: IP:port موقت) | **فرضی — هرگز دادهٔ واقعی** | آمادهٔ استقرار (BLOCKER-F02/F04) |
| Production      | `hanaso.ir`                                                | واقعی                       | از M7 — فعلاً محفوظ              |

## استقرار Preview (خلاصه — جزئیات: `deployment/PREVIEW-DEPLOYMENT-PLAN.md`)

```bash
# روی VPS (یک‌بار):
curl -fsSL https://get.docker.com | sh          # Docker + Compose
git clone https://github.com/AbolfazlProg/hanaso.git /srv/hanaso && cd /srv/hanaso
cp infra/docker/.env.preview.example .env        # مقادیر را تنظیم کنید (هرگز commit نشود)
docker login ghcr.io                             # PAT با دسترسی read:packages

# هر استقرار:
bash infra/deploy/deploy.sh <IMAGE_TAG=SHA>      # pull → up → گیت سلامت → smoke
bash infra/deploy/rollback.sh <SHA-قبلی>          # بازگشت (< ۱۰ دقیقه تا سالم)
```

## پایش و سلامت

- `GET /api/health` — زنده‌بودن + نسخه/SHA (Caddy/Compose healthcheck همین را می‌خواند؛ فاصلهٔ ۳۰ثانیه).
- `GET /api/ready` — آمادگی وابستگی‌ها (پس از افزودن DB در M0-10، چک اتصال هم فعال می‌شود).
- Gatus (از M0-10): پایش بیرونی + هشدار تلگرام؛ healthchecks.io برای dead-man-switch بکاپ شبانه.

## بکاپ (از M0-10 — سیاست قفل‌شده ADR-010)

`pg_dump` شبانه ۰۳:۳۰ + restic رمزنگاری‌شده (کلید **جدا از VPS**) → نگهداشت ۷روزانه/۴هفتگی/۶ماهانه · **دریل بازگردانی ماهانه اجباری** · RPO≤24h / RTO≤4h. تا وقتی DB نصب نشده، تنها دارایی مهم = خود ریپوی git.

## حادثه و بازگشت

- تصمیم بازگشت: 5xx پایدار >۱٪ · شکست مسیر بحرانی · مشکل داده.
- بازگشت = استقرار مجدد SHA سبز قبلی (تگ‌های immutable در GHCR) — بدون هیچ تغییر داده.
- هر حادثه: ثبت در `ops/runs/` (append-only) + در صورت نقض امنیتی، گزارش فوری به مالک.

## چک‌لیست‌های دوره‌ای (از KB `technical-acceptance-checklist`)

- **ماهانه:** دریل restore · مرور هشدارها/لاگ خطا · بازبینی TRKها · چرخش کلید در صورت نیاز · سلامت صف‌ها.
- **هر انتشار:** بکاپ تازه → مهاجرت روی staging تمرین شد → image با تگ SHA → smoke چهار مسیر → Gatus سبز → برنامهٔ بازگشت آماده.
