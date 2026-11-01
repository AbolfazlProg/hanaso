# اقدامات بعدی (NEXT_ACTIONS) — HANASO

> صف اقدام — جدیدترین در بالا. انجام‌شده‌ها به «اخیر انجام‌شده» منتقل می‌شوند.

## صف فعلی

| #    | اقدام                                                                                                                                                                               | مسئول                      | پیش‌نیاز                               | مرجع                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------- | ------------------------------------------------ |
| ۰۰۰۰ | **پذیرش TASK-ENG-01:** بازکردن ریپوی `hanaso` + دیدن GitHub Project/Milestones/Issues + `PROJECT_STATUS.md` + پاسخ گیت‌های OQ-013/014/017 (لیبل `owner-decision`)                   | مالک                       | —                                      | Issueهای `owner-decision`                        |
| ۰۰۰  | **رفع بیلینگ GitHub (BLOCKER-F03):** Settings → Billing & plans → روش پرداخت/سقف؛ سپس re-run اولین workflow و تأیید سبزی — پس از آن required checks روی main فعال شود (BLOCKER-F05) | مالک                       | —                                      | `ops/BLOCKERS.md`                                |
| ۰۰   | **فراهم‌کردن VPS (BLOCKER-F02):** سرور EU (نه Hetzner — TRK-010) + دسترسی SSH برای Agent + رکورد DNS دامنه (BLOCKER-F04)                                                            | مالک                       | —                                      | `docs/deployment/VPS-OWNER-CHECKLIST.md`         |
| ۰    | **اجرای اولین تسک توسعه: B-0 Spikes (M0-05..08)** — Issue کامل با AC در GitHub؛ نتیجهٔ هر اسپایک → OTD (از طریق spec-gap در KB)                                                     | Builder                    | —                                      | Issue «B-0 Spikes»                               |
| ۰۰   | در صورت مجوز کد مالک: **TASK-DLG-POC-01** (PoC فنی ۱۰آزمونی دیالوگ) موازی با اسپایک‌ها                                                                                              | Builder                    | مجوز صریح مالک (DD-051/BLOCKER-004 KB) | KB `dialogue-technical-poc-plan.md`              |
| ۰۱   | ثبت نتیجهٔ Spike TS7 (سبز — `docs/research/STACK-REVALIDATION-2026-11-01.md`) در OTD-004 ریپوی KB                                                                                   | Builder (از مسیر spec-gap) | —                                      | Issue KB: «Register TS7 spike result in OTD-004» |
| ۰۲   | پس از M0-05..08: TASK-M0-09 (زیرساخت UI) — تک‌تک ACها در Issue                                                                                                                      | Builder                    | M0-06..08                              | `ops/TASK_REGISTRY.md`                           |

## اخیر انجام‌شده

| اقدام                                                                                      | تاریخ      | نتیجه                                                                                |
| ------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| مأموریت TASK-ENG-01: ریپو + اسکلت + CI + infra + GitHub PM + حاکمیت + ۳ بازبینی مستقل      | 2026-11-01 | `ops/runs/RUN-20261101-01.md` + commitهای `origin/main`                              |
| ممیزی/تجمیع کل دانش KB (وضعیت‌گذاری تصمیم‌ها + شناسایی تناقض‌ها) + بازارزیابی Stack از npm | 2026-11-01 | `docs/CONSOLIDATION-REPORT.fa.md` + `docs/research/STACK-REVALIDATION-2026-11-01.md` |
