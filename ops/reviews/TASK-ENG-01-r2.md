# بازبینی مستقل — TASK-ENG-01 — دور ۲: Engineering & Architecture

| فیلد       | مقدار                                                                               |
| ---------- | ----------------------------------------------------------------------------------- |
| تسک        | TASK-ENG-01                                                                         |
| شمارهٔ دور | r2 از 3                                                                             |
| بازبین     | زیرAgent مستقل زمینهٔ تازه (فقط-خواندن؛ اجرای مستقل دروازه‌های فقط-خواندن مجاز بود) |
| تاریخ      | 2026-11-01                                                                          |

## دامنهٔ بازبینی

تمام فایل‌های پیکربندی/کد/اسکریپت/زیرساخت/ADR/مستندات مهندسی hanaso (فهرست کامل در گزارش اصلی) + KB: repository-instructions §۹ · recommended-stack · deployment-strategy · infrastructure-and-devops · engineering-standards §۲ · tokens.css. **بازبین مستقلاً `pnpm format:check`/`lint`/`test`(۵/۵)/`typecheck` را اجرا کرد — همه سبز**؛ الگوی مرز ماژولی ESLint را با کتابخانهٔ واقعی `ignore@7.14` به‌صورت تجربی آزمود و فرمان install-skills را با محیط پاک بازتولید کرد.

## رأی

**پایه‌ای وفادار به Spec و صادقانه (AGENTS.md ۹/۹ بخش، پین‌های دقیق، دروازه‌های واقعی) — اما مسیر استقرار VPS که هنوز اجرا نشده، دو شکست تضمینی داشت** (فایل نمونهٔ gitignore شده + URL گیت سلامت نامعتبر) که باید پیش از TASK-M0-10 رفع شود.

## یافته‌ها

| #    | شدت | مکان                              | خلاصه                                                                                                                | راه‌حل                              |
| ---- | --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| B-1  | S1  | .gitignore + .env.preview.example | فایل نمونهٔ deploy با الگوی `.env.*` gitignore شده و هرگز commit نشد — نقطهٔ ورود مستند deploy در clone تازه می‌شکند | نفی `!.env.*.example` + commit      |
| B-2  | S1  | deploy/rollback/smoke             | گیت سلامت روی 127.0.0.1:3000 — بدون پورت host منتشرشده غیرقابل‌دسترس                                                 | publish loopback + URL پیش‌فرض درست |
| B-3  | S2  | Dockerfile COPY . .               | بدون .dockerignore — .env محلی/NVMها وارد context بیلد می‌شوند                                                       | افزودن .dockerignore                |
| B-4  | S2  | compose + مستندات                 | مسیرهای نسبی compose نسبت به `infra/docker/` حل می‌شوند (env_file/Caddyfile می‌شکنند)                                | `--project-directory .`             |
| B-5  | S2  | AGENTS.md §۳ + DEVELOPMENT_GUIDE  | فرمان `KB_PATH=… "$KB_PATH/…"` در POSIX کار نمی‌کند (تولید مجدد تجربی: exit 127)                                     | فرمان مسیر مستقیم                   |
| B-6  | S3  | ci.yml سربرگ                      | کامنت کهنهٔ بیلینگ                                                                                                   | حذف                                 |
| B-7  | S3  | package.json engines              | `>=24` به‌جای پنجرهٔ Node 24                                                                                         | `>=24 <25`                          |
| B-8  | S3  | tokens.css                        | پورت جزئی در برابر ادعای LOCKED (توکن‌های عقب‌افتاده)                                                                | شمارش صریح در یادداشت تعویق         |
| B-9  | S3  | MODULE-OWNERSHIP                  | ۴ ماژول بدون ردیف مالکیت (grammar/progress/notes/search)                                                             | افزودن ردیف                         |
| B-10 | S3  | API-AND-EVENTS                    | requestId در سند الزامی، در کد اختیاری                                                                               | هم‌ترازی                            |
| B-11 | S3  | compose                           | پیش‌فرض `:latest` — تگی که CI هرگز push نمی‌کند                                                                      | الزامی‌کردن متغیر                   |
| B-12 | S3  | متفرقه                            | type:module برای vitest؛ install زائد در job داکر؛ --sha بدون مقدار؛ آدرس Project هاردکد                             | اصلاح فرصت‌طلبانه                   |

## موارد راستی‌آزمایی‌شده به‌عنوان درست (خلاصه)

AGENTS.md هر ۹ بخش الزامی · پین‌های نسخه بدون هیچ drift (next 16.4.3/react 19.3.1/TS 6.0.3/tailwind 4.3.3/eslint 10.14.0/vitest 5.0.5/pnpm 12.16.1/@types منطبق ران‌تایم) · صداقت health/ready (بدون جعل readiness) · Envelope + ۵ تست سبز (اجرای مستقل بازبین) · الگوی مرز ماژولی عملاً کار می‌کند (آزمون تجربی) · layout/page صحت i18n/RTL · CI کامل و درست (ترتیب/cache/audit/smoke/permissions/concurrency) · Dockerfile (مسیر standalone روی دیسک تأیید شد؛ non-root؛ HEALTHCHECK) · compose/Caddy ایزوله و هدرها بایت‌به‌بایت منطبق KB · اسکریپت‌های deploy با set -euo و بدون عمل مخرب · امنیت: اسکن Secret گسترده پاک؛ توکن فقط از env · ADRها با ساختار کامل.
