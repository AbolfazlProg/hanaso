# راهنمای عملیات (OPERATIONS_GUIDE) — فارسی

> مخاطب: مالک + Agent نقش Integration/Release. مرجع مفصل: KB `deployment-strategy.md` + `infrastructure-and-devops.md`.
> استقرار زندهٔ فعلی: `learn.kotodama.ir` (میزبان مشترک — دستورالعمل کامل: `infra/deploy/learn-kotodama/README.md`).

## محیط‌ها

| محیط            | آدرس                                   | داده                        | وضعیت                    |
| --------------- | -------------------------------------- | --------------------------- | ------------------------ |
| Local           | `localhost:3000`                       | فرضی                        | فعال                     |
| Preview/Staging | `learn.kotodama.ir` (میزبان موقت مالک) | **فرضی — هرگز دادهٔ واقعی** | زنده (Web + DB از M0-10) |
| Production      | `hanaso.ir`                            | واقعی                       | از M7 — فعلاً محفوظ      |

## استقرار Preview (خلاصه — جزئیات: `deployment/PREVIEW-DEPLOYMENT-PLAN.md`)

```bash
# روی VPS (یک‌بار):
curl -fsSL https://get.docker.com | sh          # Docker + Compose
git clone https://github.com/AbolfazlProg/hanaso.git /srv/hanaso && cd /srv/hanaso
cp infra/docker/.env.preview.example .env        # مقادیر را تنظیم کنید (هرگز commit نشود)
docker login ghcr.io                             # PAT با دسترسی read:packages

# هر استقرار (مسیر استاندارد مالک — TASK-HANASO-DEPLOY-02):
# یک دستور از docs/deployment/OWNER-ONE-COMMAND-UPDATE.fa.md
#   → preflight + بکاپ + build از کامیت Pinشده + استقرار مرحله‌ای + گیت سلامت + رول‌بک خودکار
# (اسکریپت: infra/deploy/update-hanaso.sh — زیرفرمان‌های status / rollback)
bash infra/deploy/deploy.sh <IMAGE_TAG=SHA>      # pull → up → گیت سلامت → smoke (مسیر قدیمی میزبان اختصاصی)
bash infra/deploy/rollback.sh <SHA-قبلی>          # بازگشت (< ۱۰ دقیقه تا سالم)
```

> میزبان واقعی فعلی (kotodama مشترک) از استقرار **مرحله‌ای** §۵-۱ `infra/deploy/learn-kotodama/README.md` استفاده می‌کند (DB → migrate → اپ).

## پایش و سلامت

- `GET /api/health` — زنده‌بودن + نسخه/SHA (Compose healthcheck همین را می‌خواند؛ فاصلهٔ ۳۰ثانیه).
- `GET /api/ready` — آمادگی وابستگی‌ها؛ **از M0-10 با `DATABASE_URL` فعال**: `SELECT 1` از همان pool اپ + نسخهٔ سرور + تأخیر؛ DB تنظیم ولی در دسترس نباشد → 503 صادقانه.
- Gatus (از M0-10): پایش بیرونی + هشدار تلگرام؛ healthchecks.io برای dead-man-switch بکاپ شبانه.

## لایهٔ دیتابیس (M0-10 — ۲۰۲۶-۱۱-۰۲)

- **سرویس‌ها (compose پروژهٔ `hanaso`):** `postgres:18-alpine` (Volume `hanaso-pgdata`؛ uuidv7 نیازمند PG18) · `pgbouncer` v1.26.1 (`transaction` + `scram` + `max_prepared_statements=200`) · `worker` (همان image؛ pg-boss 12 polling؛ cronها فقط اینجا) · `migrate` (یک‌بارمصرف، پروفایل `migrate`).
- **انضباط اتصال (KB database-architecture §۱):** اپ + worker از PgBouncer؛ migration/seed/`pg_dump`/`pg_restore` **مستقیم** (`DIRECT_DATABASE_URL`).
- **PgBouncer + node-postgres:** درایور به‌صورت پیش‌فرض از prepared statementهای بی‌نام استفاده می‌کند و از PgBouncer 1.21+ با `max_prepared_statements` ردیابی پروتکل‌سطحی می‌شود؛ پارامتر `?pgbouncer=true` مخصوص درایور postgres.js است نه node-postgres (تصحیح یادداشت KB §۸-۴ — تطبیق داده شد).
- **pg-boss پشت transaction-pooling:** `useListenNotify:false` — شنوندهٔ LISTEN/NOTIFY نیازمند اتصال session-pinned است؛ polling جایگزین رسمی و برای دو cron روزانه کافی است.
- **Seed محتوا:** idempotent با uuidهای قطعی (uuidv5 با namespace ثابت) — فقط ردیف‌های دارای FK سخت (`characters`/`dialogues`/`dialogue_lines`/`lessons`); خط لولهٔ کامل محتوا (ADR-008) جداست. اسکیمای `app` (دادهٔ کاربر) هرگز seed نمی‌شود.

## بکاپ و Restore (TR-030 — «بکاپ تست‌شده = تنها بکاپ معتبر»)

- **شبانه:** job `ops.backup` ساعت ۰۳:۳۰ تهران (pg-boss) → `pg_dump -Fc` → **تأیید فوری با `pg_restore --list`** → نگهداشت ۷روزانه/۴هفتگی/۶ماهانه روی Volume `hanaso-backups`. job `ops.db-verify` ۰۴:۰۰ شمارش رکوردها را لاگ می‌کند.
- **دریل restore الزامی** (ماهانه/پس از تغییر مهم): بکاپ → restore به دیتابیس آزمایشی مستقل (`hanaso_restore_test`) → تطبیق شمارش جدول‌ها — دستورها در §۵-۳ README استقرار. CLI **هرگز** اجازهٔ restore روی دیتابیس زنده را نمی‌دهد.
- **بدهی ثبت‌شده:** کپی خارج از سرور (restic → object storage رمزنگاری‌شده) هنوز فعال نیست — تا دسترسی S3 مالک؛ RPO واقعی فعلی = یک شب روی همان VPS.
- در CI، دریل backup/restore به‌صورت تست واقعی اجرا می‌شود (`tests/integration-pg/backup-restore.spec.ts`).

## حادثه و بازگشت

- تصمیم بازگشت: 5xx پایدار >۱٪ · شکست مسیر بحرانی · مشکل داده.
- **بازگشت اپ:** استقرار مجدد SHA سبز قبلی (تگ‌های immutable در GHCR) — بدون هیچ تغییر داده (`up -d web worker`).
- **بازگشت دیتابیس:** migrations فقط forward-only؛ داده را از dump با دریلِ صحت‌سنجی برگردانید. حذف `hanaso-pgdata` فقط با تأیید مالک.
- هر حادثه: ثبت در `ops/runs/` (append-only) + در صورت نقض امنیتی، گزارش فوری به مالک.

## چک‌لیست‌های دوره‌ای (از KB `technical-acceptance-checklist`)

- **ماهانه:** دریل restore · مرور هشدارها/لاگ خطا · بازبینی TRKها · چرخش کلید در صورت نیاز · سلامت صف‌ها (`db-cli jobs`).
- **هر انتشار:** بکاپ تازه → migration روی staging تمرین شد → image با تگ SHA → smoke سه بررسی (health/ready/ریشه) → Gatus سبز → برنامهٔ بازگشت آماده.
