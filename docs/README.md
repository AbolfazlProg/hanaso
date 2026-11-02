# نقشهٔ مستندات (docs/) — HANASO

> **این فایل نقطهٔ مرکزی نقشهٔ کل پروژه است؛ همهٔ مستندات از اینجا پیدا می‌شوند.**
> قانون ضد-تکرار: جزئیات Spec در KB زندگی می‌کند؛ اینجا فقط تصمیم‌های اجرایی، خلاصه‌ها و قراردادهای این ریپو.

| حوزه                 | سند                                                                                      | توضیح                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **تجمیع و تصمیم‌ها** | [`CONSOLIDATION-REPORT.fa.md`](CONSOLIDATION-REPORT.fa.md)                               | ممیزی کل دانش: وضعیت تصمیم‌ها/تناقض‌ها/گیت‌های مالک (بخش ۱ مأموریت)                           |
|                      | [`research/STACK-REVALIDATION-2026-11-01.md`](research/STACK-REVALIDATION-2026-11-01.md) | بازارزیابی Stack با npm registry + نتیجهٔ Spike TS7                                           |
| **معماری**           | [`adr/`](adr/)                                                                           | ADRهای این ریپو: 000 (تبنی خط‌پایهٔ KB) .. 006                                                |
|                      | [`architecture/SYSTEM-ARCHITECTURE.md`](architecture/SYSTEM-ARCHITECTURE.md)             | خلاصهٔ معماری + دیاگرام Context/Container                                                     |
|                      | [`architecture/DATA-ARCHITECTURE.md`](architecture/DATA-ARCHITECTURE.md)                 | ERD خلاصه، شِماها، سیاست Migration                                                            |
|                      | [`architecture/API-AND-EVENTS.md`](architecture/API-AND-EVENTS.md)                       | قرارداد Envelope، سطح REST، تاکسونومی رویدادها                                                |
|                      | [`architecture/MODULE-OWNERSHIP.md`](architecture/MODULE-OWNERSHIP.md)                   | **ماتریس مالکیت ماژول/مسیر برای Agentها (بخش ۵.۳ مأموریت)**                                   |
|                      | [`architecture/ADMIN-ROLES.md`](architecture/ADMIN-ROLES.md)                             | نقش‌های پنل مالک + ماتریس حداقل دسترسی                                                        |
|                      | [`domain/DOMAIN-MODEL.md`](domain/DOMAIN-MODEL.md)                                       | هستهٔ دامنه + تمایز `completed`/`understood`                                                  |
| **کار Agentها**      | [`agent-workflow/DEFINITION-OF-DONE.md`](agent-workflow/DEFINITION-OF-DONE.md)           | DoD پنج‌بندی + گردش کار استاندارد + قالب گزارش                                                |
|                      | [`engineering/skills/`](engineering/skills/)                                             | **زیرساخت Skillها (ADR-006): رجیستری ۲۸تایی + ماتریس انتخاب + سیاست استفاده/نگهداری + ممیزی** |
| **استقرار/عملیات**   | [`deployment/PREVIEW-DEPLOYMENT-PLAN.md`](deployment/PREVIEW-DEPLOYMENT-PLAN.md)         | طرح کامل استقرار ایزولهٔ Preview                                                              |
|                      | [`deployment/VPS-OWNER-CHECKLIST.md`](deployment/VPS-OWNER-CHECKLIST.md)                 | چک‌لیست اقدامات مالک (VPS/DNS/بیلینگ)                                                         |
|                      | [`OPERATIONS_GUIDE.fa.md`](OPERATIONS_GUIDE.fa.md)                                       | راهنمای عملیات روزمره + بکاپ/rollback                                                         |
| **توسعه/تست**        | [`DEVELOPMENT_GUIDE.fa.md`](DEVELOPMENT_GUIDE.fa.md)                                     | راهنمای راه‌اندازی محلی و دروازه‌ها                                                           |
|                      | [`testing/TESTING.md`](testing/TESTING.md)                                               | سطح‌های تست و پوشش انتظاری                                                                    |
| **امنیت**            | [`security/SECURITY-BASELINE.md`](security/SECURITY-BASELINE.md)                         | خط‌پای امنیت + سیاست Secret                                                                   |
| **طراحی**            | [`ux-design/DESIGN-SYSTEM-CONTRACT.md`](ux-design/DESIGN-SYSTEM-CONTRACT.md)             | قرارداد Design Token و مسیر ادغام v2                                                          |
| **گزارش‌ها**         | [`reports/`](reports/)                                                                   | گزارش مأموریت‌ها (فارسی)                                                                      |
| **مرور کلی**         | [`PROJECT_OVERVIEW.fa.md`](PROJECT_OVERVIEW.fa.md)                                       | معرفی محصول برای ذی‌نفعان                                                                     |

## اسناد سطح ریشهٔ ریپو

`README.md` (نمای کلی + راهنمای مالک) · `PROJECT_STATUS.md` (وضعیت زنده) · `ROADMAP.md` · `CURRENT_PHASE.md` · `CHANGELOG.md` · `AGENTS.md` (دستورالعمل ریشهٔ Agentها) · `AGENT_PROGRESS.md`/`AGENT_HANDOFF.md` · `ops/` (رجیستری‌ها).

## منابع خارجی (KB — مرجع Spec)

`japanese-learning-kb` → `START-HERE.md` (نقشهٔ KB) · `PROJECT-CONSTITUTION.md` (خطوط قرمز) · `11-implementation-foundation/IMPLEMENTATION-BLUEPRINT.md` (سند مرکزی پیاده‌سازی) · `09-technical-architecture/*` (معماری مفصل) · `product-design/DESIGN-MASTER-BLUEPRINT.md` (طراحی) · `architecture-decisions/ADR-001..017` · `ops/TASK_REGISTRY.md` (رجیستری تسک‌های KB).
