# رجیستری تسک‌ها (TASK_REGISTRY) — ریپوی محصول HANASO

> **تنها منبع وضعیت تسک‌ها در این ریپو.** هم‌روز با GitHub Issues/Project نگه می‌شود (Issue = مرجع بحث/AC؛ اینجا = وضعیت canonical).
> چرخهٔ عمر/وضعیت‌ها/شدت‌ها: KB `task-lifecycle.md`. نگاشت GitHub↔رجیستری: Issue بسته = «اجرا شد با شواهد»؛ وضعیت اینجا = پذیرش (مثلاً In Review = منتظر مالک). وضعیت‌ها: `Backlog → Ready → In Progress → In Review → (Needs Fix ↔) → Verified → Staging → Deployed → Closed` + `Blocked`.
> **آخرین به‌روزرسانی:** 2026-11-01 — TASK-ENG-01 (پایه‌گذاری مهندسی).

## فاز M0 — بوت‌استرپ

| ID           | عنوان                                                            | وضعیت                                                                                | Issue              | وابستگی                    | خلاصهٔ معیار پذیرش                                                               |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| TASK-ENG-01  | مأموریت پایه‌گذاری مهندسی (ریپو+CI+اسکلت+GitHub PM+حاکمیت Agent) | **In Review**                                                                        | #1 (بسته با شواهد) | —                          | ریپو private + دروازه‌های محلی سبز + Project/Milestones/Issues + ۳ بازبینی مستقل |
| TASK-M0-02   | تکمیل بوت‌استرپ frontend (ساختار کامل frontend-architecture §۱)  | In Progress                                                                          | GitHub             | ENG-01                     | ساختار کامل پوشه‌ها + scripts کامل + build سبز (اسکلت هسته توسط ENG-01 انجام شد) |
| TASK-M0-03   | CI سبز روی GitHub Actions                                        | **Verified** — هر دو job سبز (رن‌های 41287442815/41289890549)؛ required checks → F07 | GitHub #4          | ENG-01 ✓                   | رن سبز کامل + image با tag=SHA در GHCR (اصلاح lowercase push شد)                 |
| TASK-M0-04   | Spike: TypeScript — نتیجه: **پین 6.0.3**                         | Verified (ثبت OTD-004 در KB از مسیر spec-gap باز است)                                | GitHub             | ENG-01                     | نتیجه در OTD-004 ثبت شود (از طریق spec-gap در KB)                                |
| TASK-M0-05   | Spike: React Compiler 1.0                                        | Ready                                                                                | GitHub             | —                          | روشن/خاموش + benchmark کوچک → تصمیم OTD                                          |
| TASK-M0-06   | Spike: RTL-audit شادکن/Radix                                     | Ready                                                                                | GitHub             | —                          | فهرست سازگار/نا + جایگزین → OTD                                                  |
| TASK-M0-07   | Spike: فونت‌ها از ایران                                          | Ready                                                                                | GitHub             | —                          | دسترس‌پذیری ۳ فونت + fallback → OTD                                              |
| TASK-M0-08   | Spike: ruby در RTL (FT-003)                                      | Ready                                                                                | GitHub             | —                          | رفتار ۳ مرورگر + الگوی رندر → OTD                                                |
| TASK-M0-09   | زیرساخت مشترک UI (=B-0)                                          | Blocked                                                                              | GitHub             | M0-06..08                  | tokens + فونت + JaBlock/Bdi/FuriganaText + ۹ کامپوننت shadcn                     |
| TASK-M0-10   | استقرار Preview روی VPS + بکاپ اولیه                             | Blocked                                                                              | GitHub             | M0-02 + دسترسی VPS         | compose زنده با TLS + health سبز + بکاپ اثبات‌شده                                |
| TASK-M0-11   | درس نمونهٔ «Hello» با ruby                                       | Backlog                                                                              | GitHub             | M0-09 + M0-10              | AC-901..903 + FT-002/003 + روی Preview قابل مشاهده                               |
| TASK-DSGN-01 | ادغام Design System v2 (خروجی TASK-DESIGN-04 پس از پذیرش مالک)   | Blocked                                                                              | GitHub             | پذیرش TASK-DESIGN-04 در KB | ارزیابی tokens/components v2 + ادغام بدون انشعاب ناسازگار                        |

## فازهای M1..M7

تسک‌سازی در «جلسهٔ ورود فاز» (Orchestrator) — رجیستری canonical فعلی: KB `ops/TASK_REGISTRY.md` (۳۵ تسک، شامل TASK-M1-01..07، M2-01، M6-01..11، M7-01..02 و ...). Epics در GitHub Issues این ریپو.

## آمار

| تاریخ      | Backlog | Ready | In Progress | In Review | Blocked | Verified+ | جمع |
| ---------- | ------- | ----- | ----------- | --------- | ------- | --------- | --- |
| 2026-11-01 | 1       | 4     | 2           | 1         | 3       | 1         | 12  |
