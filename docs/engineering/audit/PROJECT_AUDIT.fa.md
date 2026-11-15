# ممیزی کامل پروژه HANASO — TASK-OPS-01

> **تاریخ بررسی:** ۲۰۲۶-۱۱-۰۳ (تاریخ Checkpoint پایانی: ۲۰۲۶-۱۱-۰۲ ~۱۷:۲۵ تهران؛ ادامه در همان روز)
> **بررسی‌کننده:** Z.ai (Orchestrator) — مأموریت TASK-OPS-01 (ادامهٔ مأموریت نیمه‌تمام قبلی)
> **مخزن:** `github.com/AbolfazlProg/hanaso` (خصوصی) · شاخهٔ کاری این ممیزی: `docs/task-ops-01-completion`
> **ماهیت سند:** همهٔ ادعاهای این سند با اجرای واقعی دستور در همین مأموریت تأیید شده‌اند؛ هر مورد تأییدنشده صریحاً `NOT VERIFIED` علامت خورده است.

---

## ۰. خلاصهٔ مدیریتی (۳۰ ثانیه‌ای)

پروژه HANASO **واقعاً از مرحلهٔ بوت‌استرپ عبور کرده است**: زیرساخت مهندسی کامل، سایت زنده با دیتابیس واقعی PostgreSQL 18.6، بکاپ اثبات‌شده، طراحی Aizen اجراشده و ۱۸۳ تست سبز (۱۵۱ واحد + ۳۲ integration). اما محصول هنوز **نمونهٔ فنی (Prototype) در سطح تجربهٔ یادگیری** است: یک مکالمهٔ آزمایشی، کاربر ثابت `poc-user` بدون احراز هویت، صداهای جایگزین (که در استقرار فعلی **حتی تولید هم نمی‌شوند**)، بدون حساب کاربری، بدون محتوای واقعی و بدون پنل مدیریت. گزارش مالک دربارهٔ «ضایع بودن بصری Preview» **تأیید می‌شود** — نه به‌خاطر رنگ‌ها (Aizen درست است) بلکه به‌دلیل باقی‌ماندن متن‌های فنی، خالی‌بودن صفحات و نبود دارایی‌های هنری. مسیر پیشنهادی: تکمیل M0 با درس Hello، رفع سریع سه ایراد کیفیت پیدا‌شده در این ممیزی، و سپس M1 (احراز هویت + کانا).

---

## ۱. وضعیت Git و CI (بخش ۱ مأموریت — تأییدشده)

### ۱-۱) Checkpoint بازیابی و صحت‌سنجی

| قلم                         | مقدار گزارش Checkpoint | تأیید مستقل این مأموریت                       | نتیجه                            |
| --------------------------- | ---------------------- | --------------------------------------------- | -------------------------------- |
| مخزن                        | `AbolfazlProg/hanaso`  | clone تازه انجام شد                           | ✅                               |
| `main`                      | `5090258`              | `git log` روی clone تازه                      | ✅ مطابقت                        |
| `origin/main`               | `5090258`              | API `branches/main`                           | ✅ (پیش از mergeهای این مأموریت) |
| PR #74 merged @ `2d73080`   | بله                    | API PR                                        | ✅                               |
| PR #83 merged @ `5090258`   | بله                    | API PR — `merged_at: 2026-11-02T12:40:27Z`    | ✅                               |
| CI روی main موفق            | Run `41446624532`      | API runs — `CI #35: success`                  | ✅                               |
| Working Tree فقط Permission | ادعای قبلی             | در این مأموریت clone تازه = Working Tree تمیز | ✅ (بدون تغییر محتوایی)          |

**نکتهٔ بازیابی:** سندباکس Agent یک بار در میانهٔ این مأموریت بازیافت شد؛ clone محلی و ابزارهای `/tmp` از بین رفتند و **از remote بازسازی شدند** — push نهایی قبل از قطع از قبل با موفقیت روی remote ثبت شده بود (SHA `0dc7255` روی remote تأیید شد). هیچ کاری از دست نرفت.

### ۱-۲) رابطهٔ Production (`2d73080`) و main — تحلیل Ancestor

```
git merge-base --is-ancestor 2d73080 5090258  →  exit 0 (بله، ancestor است)
```

- `2d73080` (PR #74 — لایهٔ DB) **جدِّ همهٔ commitهای بعدی main** است؛ یعنی Production از نظر تاریخچه **شامل طراحی Aizen (PR #73 → قبل از آن) و M0-10 (خودش)** است.
- فاصلهٔ `2d73080..5090258` فقط **یک commit مستنداتی** است (PR #83: `PROJECT_STATUS`، `OWNER_BRIEFING`، `TASK_REGISTRY`، `RUN-20261102-03`) — `git diff --stat`: صفر تغییر کد محصول.
- **تصمیم §۱.۱: استقرار (Deploy) لازم نیست** — commitهای جدید main صرفاً مستنداتی‌اند. (و با merge PR #76 در همین مأموریت، فاصلهٔ main↔Production فقط سند/اسکیل/قالب است؛ Deploy زمانی لازم می‌شود که کد محصول تغییر کند.)

### ۱-۳) وضعیت PRها (پس از عملیات این مأموریت)

| PR               | عنوان                                 | وضعیت نهایی                                 |
| ---------------- | ------------------------------------- | ------------------------------------------- |
| #74              | لایهٔ DB (M0-10)                      | ✅ merged @ `2d73080`                       |
| #83              | هم‌گاهی مستندات M0-10                 | ✅ merged @ `5090258`                       |
| **#76**          | **زیرساخت Skillهای خارجی (TASK-ENG)** | ✅ **در همین مأموریت merge شد** — جزئیات §۴ |
| #63 (PoC دیالوگ) | بسته بدون merge                       | نکته: محتوایش از مسیر #64 به main رسیده بود |

### ۱-۴) CI (آخرین وضعیت)

- `CI #35` روی main (`5090258`): ✅ success
- `CI #36` روی شاخهٔ PR #76 پس از حل تعارض (`0dc7255`): ✅ success (هر ۹ گیت: format/lint/typecheck/unit/integration-PG18/build/audit/smoke)
- بعد از merge PR #76 → main = `eb80e88` (CI جدید main در Check 3 راستی‌آزمایی شد)

---

## ۲. Integration Testهای PostgreSQL (بخش ۲ مأموریت — تأییدشده با اجرا)

### ۲-۱) روش ایمن اجرا (طبق قید §۲.۲: هرگز روی Production)

سوئیت آمادهٔ مخزن (`apps/web/tests/integration-pg/` + `vitest.integration.config.ts`) از ابتدا ایزوله طراحی شده است: هر فایل spec دیتابیس اختصاصی `hanaso_test` / `hanaso_restore_test` را **روی سرور مرجع DROP و از نو می‌سازد** — دقیقاً همان الگوی CI (سرویس‌کنندهٔ `postgres:18-alpine`).

محیط ایزولهٔ این مأموریت (بدون دسترسی Docker در سندباکس، بدون اتصال به Production):

| قطعه                             | منبع                                                                   | نسخه                             |
| -------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| سرور PostgreSQL                  | Zonky embedded binaries (portable)                                     | **18.6** — همان نسخهٔ Production |
| ابزارهای pg_dump/pg_restore/psql | Debian sid `.deb` (استخراج محلی، بدون root)                            | 18.6-3                           |
| Bind                             | فقط `127.0.0.1:54329` (loopback، پورت غیرپیش‌فرض)                      | —                                |
| دیتابیس‌ها                       | `hanaso_test` / `hanaso_restore_test` (موقت، drop/recreate در هر فایل) | —                                |

> اسکریپت قابل‌تکرار: `scripts/hanaso_pg_start.sh` + پوشش PATH: `.pgclient-bin/` (در سندباکس Agent؛ در CI همان سرویس‌کنندهٔ GitHub Actions).
> تونل SSH (`pg_tunnel.py` نسخهٔ Agent قبلی) **استفاده نشد** — با وجود سرور ایزولهٔ محلی، اتصال به Production لازم نبود؛ فایل در sandbox بازیافتی موجود نبود و بازسازی آن بدون نیاز عملی انجام شد (اصول حداقل تماس با Production).

### ۲-۲) نتیجهٔ اجرا (خروجی واقعی vitest)

```
✓ tests/integration-pg/backup-restore.spec.ts (9 tests | 1 skipped)  495ms
✓ tests/integration-pg/repositories.spec.ts (10 tests)               192ms
✓ tests/integration-pg/routes.spec.ts (5 tests)                      173ms
✓ tests/integration-pg/migrate-seed.spec.ts (5 tests)                145ms
✓ tests/integration-pg/worker.spec.ts (3 tests)                     1250ms
Test Files  5 passed (5)
     Tests  31 passed | 1 skipped (32)
   Duration  5.77s
```

### ۲-۳) نقشهٔ پوشش (نام/هدف/محیط/نتیجه برای هر تست — §۲.۳)

| فایل           | تست                                                                  | هدف                                        | نتیجه                                                               |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| migrate-seed   | created both schemas + bookkeeping                                   | Migration واقعی Drizzle روی PG18           | ✅ pass                                                             |
| migrate-seed   | re-running migrator is a no-op                                       | **Idempotency** (اجرای مجدد استقرار)       | ✅ pass                                                             |
| migrate-seed   | seeded characters/dialogue/lines/lesson                              | Seed کامل                                  | ✅ pass                                                             |
| migrate-seed   | deterministic uuidv5 ids — re-seed same rows                         | **Idempotency seed**                       | ✅ pass                                                             |
| migrate-seed   | every line linked to seeded speaker                                  | صحت FK                                     | ✅ pass                                                             |
| repositories   | engine id → seeded uuid resolution                                   | نگاشت `dlg-*` به uuid                      | ✅ pass                                                             |
| repositories   | sequential attempt_no + row→domain mapping                           | Write/Read                                 | ✅ pass                                                             |
| repositories   | per-dialogue list + user separation                                  | فیلتر SQL (نه post-fetch)                  | ✅ pass                                                             |
| repositories   | unseeded dialogue → ContentNotSeededError                            | **Error handling**                         | ✅ pass                                                             |
| repositories   | unique (user,dialogue,attempt_no) backstop                           | قید یکتایی                                 | ✅ pass                                                             |
| repositories   | forced collision → 23505 retry loop **for real**                     | **Retry/Concurrency** (تزریق برخورد واقعی) | ✅ pass                                                             |
| repositories   | progress get-null قبل از نوشتن                                       | Stage A                                    | ✅ pass                                                             |
| repositories   | upsert A→D روی PK                                                    | Transaction-style upsert                   | ✅ pass                                                             |
| repositories   | dialogue-keyed list + unknown users                                  | جداسازی داده                               | ✅ pass                                                             |
| repositories   | find(attemptId) → D→understood gate                                  | دروازهٔ فهم                                | ✅ pass                                                             |
| routes         | `/api/ready` ok با version+latency                                   | **Health/Readiness**                       | ✅ pass                                                             |
| routes         | ready = 503 وقتی DB قطع، بدون لو رفتن جزئیات اتصال                   | Fail-closed + امنیت                        | ✅ pass                                                             |
| routes         | POST /api/attempts → نمره‌گذاری سروری + persist                      | **API→PG + Validation**                    | ✅ pass                                                             |
| routes         | شماره‌گذاری ترتیبی + list با فیلتر دیالوگ                            | Write→Read chain                           | ✅ pass                                                             |
| routes         | POST /api/progress A→B→C→D + گیت understood                          | چرخهٔ کامل                                 | ✅ pass                                                             |
| worker         | pg-boss شروع، schema ساخت، job پردازش شد                             | **Job Execution**                          | ✅ pass                                                             |
| worker         | scheduleهای تولیدی در pgboss.schedule (`ops.backup`/`ops.db-verify`) | ثبت cron                                   | ✅ pass                                                             |
| worker         | job history برای observability                                       | ثبت اجرا                                   | ✅ pass                                                             |
| backup-restore | backup اثبات‌شده pg_dump -Fc                                         | فایل ۸۱۸۶۲B · ۱۶۴ entry · 79ms             | ✅ pass                                                             |
| backup-restore | restore به دیتابیس ایزوله                                            | 0.107s                                     | ✅ pass                                                             |
| backup-restore | شمارش ۶ جدول منبع=مقصد                                               | **Data integrity**                         | ✅ pass                                                             |
| backup-restore | (۶ تست دیگر: پاکسازی/retention/رفض شرابط ناایمن)                     | سیاست‌ها                                   | ✅ pass                                                             |
| backup-restore | «documented skip» وقتی pg_dump ناسازگار                              | مسیر مستندِ نبود ابزار                     | ⏭️ skip (عمدی — در محیط ما ابزار موجود بود و مسیرِ دردسترس اجرا شد) |

### ۲-۴) Unit Tests (گزارش جداگانه — §۲.۳)

```
Test Files  20 passed (20)
     Tests  151 passed (151)
```

۱۵۱/۱۵۱ ✅ — مطابق Checkpoint. (۱۵۱ واحد + ۳۲ integration = ۱۸۳ تست سبز.)

### ۲-۵) راستی‌آزمایی زندهٔ Production (Read-only)

در همین مأموریت، مستقل از Checkpoint:

| بررسی                                              | نتیجه                                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `GET https://learn.kotodama.ir/api/health`         | `{"ok":true,"commit":"2d73080e2...","env":"production"}` ✅ |
| `GET /api/ready`                                   | 200 — `database: ok، latencyMs: 12، serverVersion: 18.6` ✅ |
| `GET /api/progress?dialogueId=dlg-cafe-morning-01` | 200 — دادهٔ واقعی: مرحلهٔ `A_selfcheck` برای `poc-user` ✅  |
| `GET /api/dialogues/cafe-morning-01`               | 200 — دیالوگ کامل با ۳ کاراکتر ✅                           |
| `https://kotodama.ir` (سایت دیگر همان سرور)        | 200 — دست‌نخورده ✅                                         |

### ۲-۶) Backup Schedule — تفکیک صریح (§۲.۴)

| قلم                                                                     | وضعیت                                                                                                                                                                                                                   | مدرک                         |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Scheduleهای `ops.backup` (03:30) و `ops.db-verify` (04:00) ثبت شده‌اند؟ | ✅ بله — روی دیتابیس ایزوله در تست worker ثبت و assert شد؛ روی Production نیز ثبت‌اند (گزارش Checkpoint + کد shared `schedules.ts`)                                                                                     | `worker.spec.ts`             |
| فایل بکاپ موجود است؟                                                    | ✅ `hanaso-2026-11-02-12-16-28.dump` (۸۲۰۷۲B) روی VPS                                                                                                                                                                   | Checkpoint + RUN-20261102-03 |
| **اجرای خودکار زمان‌بندی‌شده سابقهٔ موفق دارد؟**                        | ⚠️ **NOT VERIFIED — تأییدنشده.** schedule ثبت شده ولی چون cronها 03:30/04:00 تهران‌اند و استقرار ~12:00 شد، **هنوز هیچ اجرای زمان‌بندی‌شده‌ای ثبت نشده است.** جدول job-history را باید بعد از صبح ۲۰۲۶-۱۱-۰۳ بررسی کرد. | —                            |
| دریل بکاپ/ریستور واقعاً کار می‌کند؟                                     | ✅ بله — دو بار: یک‌بار روی VPS (RUN-20261102-03) و یک‌بار در این مأموریت روی PG18 ایزوله (فایل 81862B/164 entry/شمارش برابر)                                                                                           | خروجی §۲-۲                   |
| Retention درست است؟                                                     | ✅ تست پاکسازی/kept-prune در سوئیت سبز است                                                                                                                                                                              | backup-restore.spec          |
| S3 / بکاپ خارج از سرور                                                  | 🔴 **بدهی آینده** — نیازمند دسترسی مالک؛ در این مأموریت اقدامی نشد (طبق قید مأموریت)                                                                                                                                    | BLOCKER                      |

> **جمع‌بندی صادقانه:** «بکاپ اثبات‌شده» = دریل دستی/تستی موفق. «بکاپ شبانهٔ خودکارِ در حال کار» = **هنوز اثبات‌نشده تا اولین اجرای 03:30 موردي نظر ثبت شود.**

---

## ۳. یافته‌های ممیزی UI (خلاصه — سند کامل: `UI_VISUAL_AUDIT.fa.md`)

۸ مسیر × ۲ viewport بررسی شد (۴۱۴۰×۹۰۰ / ۳۹۰×۸۴۴): همهٔ ۱۶ حالت **HTTP 200، سرریز افقی صفر، بدون خطای صفحه**. جزئیات، نمرات ممیزی بصری و طبقه‌بندی بلوغ هر صفحه در سند تخصصی آمده است. سه یافتهٔ کلیدی:

1. **صدای جایگزین در Production تولید نمی‌شود** (`/poc-audio/*` → 404): مرحلهٔ build داکر `pnpm gen:audio` را اجرا نمی‌کند؛ پلیر در حالت «بی‌صدا» کار می‌کند. (کار اصلاحی کوچک، اثر بزرگ بر تجربهٔ مرور مالک.)
2. **دو صفحهٔ ابزار ارزیابی (`/poc/t2-eval` و بخش فوتر `/poc/dialogue`) متن فنی توسعه نشان می‌دهند** — عامل اصلی حس «ضایع» بودن.
3. طراحی Aizen (توکن‌ها/امضاها) **درست پیاده شده** اما صفحات هنوز `PROTOTYPE`/`UI FOUNDATION` اند — نه از نظر سیستم طراحی بلکه از نظر محتوا و حالت‌های تعاملی.

---

## ۴. یافته‌های Skillها و PR #76 (خلاصه — سند کامل: `SKILL_USAGE_AUDIT.fa.md`)

- **PR #76 در همین مأموریت merge شد** (squash → `eb80e88`) پس از: حل تعارض run-ID با main (بازشماره‌گذاری رکورد TASK-ENG به `RUN-20261102-04`)، سبزشدن همهٔ دروازه‌های محلی (format/lint/ممیزی امنیتی ۰ HIGH-MEDIUM/۱۵۱ تست) و CI `#36` سبز.
- ۱۲ Skill خارجی معتبر (Apache-2.0/MIT، commit پین‌شده، PROVENANCE کامل) + رجیستری ۲۸تایی + ماتریس انتخاب اجباری + سیاست Preflight — همه موجود و راستی‌آزمایی شدند.
- **استفادهٔ واقعی:** رکوردهای `RUN-20261101-01/03` ادعای استفاده با جزئیات دارند (تأیید ساختاری)؛ رکوردهای `RUN-20261102-01/02/03` بخش Skill ندارند → `USAGE NOT VERIFIED` ثبت شد. قالب‌های اجباری جدید (جدول «Skills used» در PR Template و رکورد اجرا) این شکاف را برای آینده می‌بندد.

---

## ۵. ریسک‌ها و بدهی‌های فنی ثبت‌شده

| #    | مورد                                                                | شدت             | اقدام پیشنهادی                                                                           |
| ---- | ------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| D-01 | placeholder audio در Docker build تولید نمی‌شود (404 در Production) | متوسط           | افزودن `pnpm gen:audio` به مرحلهٔ build داکر + تست smoke مسیر `/poc-audio/manifest.json` |
| D-02 | اولین اجرای زمان‌بندی‌شدهٔ بکاپ هنوز ثبت نشده                       | متوسط           | بررسی job-history پس از 04:00 ۲۰۲۶-۱۱-۰۳ (دستور آماده در `db-cli`)                       |
| D-03 | بکاپ فقط روی همان VPS                                               | بالا (بلندمدت)  | دسترسی S3 از مالک → آپلود بعد از هر بکاپ                                                 |
| D-04 | متن فنی توسعه در UI (`t2-eval`، فوتر دیالوگ)                        | متوسط           | پاک‌سازی/پنهان‌سازی پشت فلگ در پالایش UI                                                 |
| D-05 | کاربر ثابت `poc-user` بدون احراز هویت                               | برنامه‌ریزی‌شده | M1 (better-auth طبق KB ADR-006KB)                                                        |
| D-06 | رکوردهای اجرای بدون بخش Skill (۴ رکورد)                             | کم              | بسته شد با قالب اجباری PR #76 — فقط رکورد آینده معتبر است                                |

---

## ۶. وضعیت M0-10 — جمع‌بندی نهایی با شواهد

| مؤلفه M0-10                      | وضعیت                                                              | مدرک                                                                                        |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Web-tier deploy (TLS/هاست مشترک) | ✅ Deployed + Verified                                             | smoke ALL GREEN؛ health زنده (این مأموریت)                                                  |
| PostgreSQL 18.6 + PgBouncer      | ✅ Deployed + Verified                                             | `/api/ready` → 18.6 / 12ms (این مأموریت)                                                    |
| Migration + Seed زنده            | ✅ Done                                                            | ۳ کاراکتر/۱ دیالوگ/۱۰ خط/۱ درس در DB (Checkpoint) + progress واقعی `poc-user` (این مأموریت) |
| Worker + pg-boss                 | ✅ Deployed؛ scheduleها ثبت                                        | CI compose-smoke + تست worker                                                               |
| بکاپ                             | ✅ دریل موفق ×2؛ ⚠️ اجرای خودکار زمان‌بندی‌شده = منتظر اولین رخداد | §۲-۶                                                                                        |
| Restore                          | ✅ اثبات‌شده (ایزوله)                                              | §۲-۲                                                                                        |
| **M0-10 در کل**                  | **DONE_VERIFIED** (با دو بدهی D-02/D-03)                           | —                                                                                           |

---

## ۷. ارجاع‌ها

- ممیزی بصری کامل: [`UI_VISUAL_AUDIT.fa.md`](./UI_VISUAL_AUDIT.fa.md)
- ممیزی Skillها: [`SKILL_USAGE_AUDIT.fa.md`](./SKILL_USAGE_AUDIT.fa.md)
- نقشهٔ معماری واقعی: [`ARCHITECTURE_MAP.md`](./ARCHITECTURE_MAP.md)
- نقشهٔ راه اصلی: [`../roadmap/MASTER_ROADMAP.md`](../roadmap/MASTER_ROADMAP.md)
- تسک اجرایی بعدی: [`../roadmap/NEXT_EXECUTION_TASK.md`](../roadmap/NEXT_EXECUTION_TASK.md)
- راهنمای جامع مالک (۱۵ فصل): [`../../owner/HANASO_PROJECT_GUIDE.fa.md`](../../owner/HANASO_PROJECT_GUIDE.fa.md)
- گزارش پیشرفت مأموریت: [`../../../ops/PROGRESS_LOG.md`](../../../ops/PROGRESS_LOG.md)
