# رجیستری تسک‌ها (TASK_REGISTRY) — ریپوی محصول HANASO

> **تنها منبع وضعیت تسک‌ها در این ریپو.** هم‌روز با GitHub Issues/Project نگه می‌شود (Issue = مرجع بحث/AC؛ اینجا = وضعیت canonical).
> چرخهٔ عمر/وضعیت‌ها/شدت‌ها: KB `task-lifecycle.md`. نگاشت GitHub↔رجیستری: Issue بسته = «اجرا شد با شواهد»؛ وضعیت اینجا = پذیرش (مثلاً In Review = منتظر مالک). وضعیت‌ها: `Backlog → Ready → In Progress → In Review → (Needs Fix ↔) → Verified → Staging → Deployed → Closed` + `Blocked`.
> **آخرین به‌روزرسانی:** 2026-11-01 (سشن چهارم) — TASK-M0-09 زیرساخت UI اجرا شد (RUN-20261101-04؛ ۱۲۴ تست + دروازه‌های stylelint/بودجهٔ فونت) · سشن سوم: نخستین استقرار زنده روی **https://learn.kotodama.ir** (Web-tier M0-10) · سشن دوم: B-0 Spikes + PoC + Slice (PR #62/#64).

## فاز M0 — بوت‌استرپ

| ID           | عنوان                                                                           | وضعیت                                                                                                                      | Issue              | وابستگی                    | خلاصهٔ معیار پذیرش                                                                                                       |
| ------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| TASK-ENG-01  | مأموریت پایه‌گذاری مهندسی (ریپو+CI+اسکلت+GitHub PM+حاکمیت Agent)                | **In Review**                                                                                                              | #1 (بسته با شواهد) | —                          | ریپو private + دروازه‌های محلی سبز + Project/Milestones/Issues + ۳ بازبینی مستقل                                         |
| TASK-M0-02   | تکمیل بوت‌استرپ frontend (ساختار کامل frontend-architecture §۱)                 | In Progress                                                                                                                | GitHub             | ENG-01                     | ساختار کامل پوشه‌ها + scripts کامل + build سبز (اسکلت هسته توسط ENG-01 انجام شد)                                         |
| TASK-M0-03   | CI سبز روی GitHub Actions                                                       | **Verified** — هر دو job سبز (رن‌های 41287442815/41289890549)؛ required checks → F07                                       | GitHub #4          | ENG-01 ✓                   | رن سبز کامل + image با tag=SHA در GHCR (اصلاح lowercase push شد)                                                         |
| TASK-M0-04   | Spike: TypeScript — نتیجه: **پین 6.0.3**                                        | Verified (ثبت OTD-004 در KB از مسیر spec-gap باز است)                                                                      | GitHub             | ENG-01                     | نتیجه در OTD-004 ثبت شود (از طریق spec-gap در KB)                                                                        |
| TASK-M0-05   | Spike: React Compiler 1.0 — **نتیجه: ~۲۴× رندر؛ فعال‌سازی در M0-09**            | **Verified** (PR #62)                                                                                                      | GitHub #14 (بسته)  | —                          | روشن/خاموش + benchmark ✓ + گزارش `SPIKE-M0-05`                                                                           |
| TASK-M0-06   | Spike: RTL-audit شادکن/Radix — **DirectionProvider اجباری؛ بدون flyout موبایل** | **Verified** (PR #62)                                                                                                      | GitHub #14 (بسته)  | —                          | فهرست سازگار/نا ✓ + گزارش `SPIKE-M0-06`                                                                                  |
| TASK-M0-07   | Spike: فونت‌ها از ایران                                                         | **Verified** (PR #62)                                                                                                      | GitHub #14 (بسته)  | —                          | سلف‌هاست کامل + ساب‌ست واقعی + بودجه (TR-031) ✓                                                                          |
| TASK-M0-08   | Spike: ruby در RTL (FT-003) — **جزیرهٔ LTR اجباری + lh≥2 + الگوی FuriganaText** | **Verified** (PR #62)                                                                                                      | GitHub #14 (بسته)  | —                          | رفتار مرورگر (Chromium) ✓ + الگوی رندر ✓ + گزارش `SPIKE-M0-08`                                                           |
| TASK-M0-09   | زیرساخت مشترک UI (=B-0)                                                         | **In Review** — اجرا کامل RUN-20261101-04 (۹ گیت ALL GREEN + ۳ مرورگر واقعی: Chromium/Firefox ✓، WebKit بلاک محیطی→FT-002) | GitHub #10         | M0-05..08 ✓                | tokens کامل + فونت self-host + FuriganaText + DirectionProvider + RC on + ۹ کامپوننت shadcn + دروازه‌های stylelint/بودجه |
| TASK-M0-10   | استقرار Preview روی VPS + Postgres/PgBouncer/Worker + بکاپ اولیه                | **In Progress** — Web-tier: **Deployed** (learn.kotodama.ir، RUN-20261101-03)؛ DB-tier/بکاپ باقی                           | GitHub #11         | M0-02 ✓ + VPS ✓ (F02 بسته) | Web: compose زنده با TLS + health سبز ✓؛ باقی: Postgres/PgBouncer/Worker + بکاپ اثبات‌شده                                |
| TASK-M0-11   | درس نمونهٔ «Hello» با ruby                                                      | Backlog                                                                                                                    | GitHub             | M0-09 + M0-10              | AC-901..903 + FT-002/003 + روی Preview قابل مشاهده                                                                       |
| TASK-DSGN-01 | ادغام Design System v2 (خروجی TASK-DESIGN-04 پس از پذیرش مالک)                  | Blocked                                                                                                                    | GitHub             | پذیرش TASK-DESIGN-04 در KB | ارزیابی tokens/components v2 + ادغام بدون انشعاب ناسازگار                                                                |

## تسک‌های مکالمه‌محور و Slice (اجرا ۲۰۲۶-۱۱-۰۱)

| ID              | عنوان                                 | وضعیت                             | Issue      | خلاصهٔ شواهد                                                                                                        |
| --------------- | ------------------------------------- | --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| TASK-DLG-POC-01 | PoC فنی مکالمهٔ ۱۰آزمونی (T1..T10)    | **Verified** (در PR #64 ادغام شد) | #38 (بسته) | T1/T3/T4/T6/T7 سبز موتوری با اعداد واقعی؛ T2/T9/T10 صادقانه معلق (فرم/اسکریپت تحویل‌شده)؛ گزارش `DLG-POC-01-REPORT` |
| TASK-SLICE-01   | اولین Learning Vertical Slice (A→D)   | **Verified** (PR #64 `3b652ae`)   | #40 (بسته) | چرخهٔ کامل + گیت سروری understood + Drizzle (۱۲+۲ جدول) + نمره‌گذاری سروری D + ۹۶/۹۶ تست + verify ALL GREEN         |
| TASK-CHR-08/12  | قرارداد شخصیت + رجیستری (هستهٔ اولیه) | In Progress → هسته تحویل شد       | #48/#52    | قرارداد ADR-018 + Placeholder متحرک + رجیستری ۳ شخصیت (در PR #64)؛ تعویض با دارایی نهایی = #51                      |

## فازهای M1..M7

تسک‌سازی در «جلسهٔ ورود فاز» (Orchestrator) — رجیستری canonical فعلی: KB `ops/TASK_REGISTRY.md` (۳۵ تسک، شامل TASK-M1-01..07، M2-01، M6-01..11، M7-01..02 و ...). Epics در GitHub Issues این ریپو.

## آمار

| تاریخ           | Backlog | Ready | In Progress | In Review | Blocked | Verified+ | جمع |
| --------------- | ------- | ----- | ----------- | --------- | ------- | --------- | --- |
| 2026-11-01      | 1       | 4     | 2           | 1         | 3       | 1         | 12  |
| 2026-11-01 (س۲) | 0       | 5     | 2           | 1         | 2       | 9         | 19  |
| 2026-11-01 (س۳) | 1       | 2     | 2           | 1         | 1       | 7         | 14  |
