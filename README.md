# HANASO — هاناسو

> ریپوی اصلی محصول: وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان — مکالمه‌محور، مبتنی بر FSRS، با محتوای انسانی.
> نام کاری: **HANASO** · دامنهٔ هدف: `hanaso.ir` · ریپو: Private · تاریخ بوت‌استرپ: **2026-11-01**

## این ریپو چیست؟

کد، تست، زیرساخت استقرار و مستندات مهندسی محصول. **پژوهش، طراحی و تصمیم‌ها** در مرکز دانش جدا نگهداری می‌شوند:
[`japanese-learning-kb`](https://github.com/AbolfazlProg/japanese-learning-kb) (مرجع Spec — سلسله‌مراتب در `AGENTS.md` §۴).
مدل یادگیری: **دیالوگ → درس از خودِ دیالوگ → تمرین → فهم اثبات‌شدهٔ دیالوگ** (`understood` ≠ `completed`).

## وضعیت پروژه را چطور ببینم؟ (بدون دانش برنامه‌نویسی)

| چه می‌خواهید بدانید؟                    | کجا؟                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| وضعیت لحظه‌ای و صداقت‌محور پروژه        | [`PROJECT_STATUS.md`](PROJECT_STATUS.md)                             |
| نقشهٔ راه و فازها (M0..M7) و وابستگی‌ها | [`ROADMAP.md`](ROADMAP.md) · [`CURRENT_PHASE.md`](CURRENT_PHASE.md)  |
| تابلوی مدیریت (Backlog/In Progress/…)   | GitHub Project: **HANASO Development** (لینک در `PROJECT_STATUS.md`) |
| کارهای باز/بسته و تصمیم‌های منتظر مالک  | Issues + Milestones همین ریپو                                        |
| تغییرات هر نسخه                         | [`CHANGELOG.md`](CHANGELOG.md)                                       |
| گزارش مأموریت‌های Agentها               | `ops/runs/` + `ops/reviews/`                                         |
| ممیزی کل دانش و تصمیم‌ها                | [`docs/CONSOLIDATION-REPORT.fa.md`](docs/CONSOLIDATION-REPORT.fa.md) |

## شروع سریع (توسعه‌دهنده/Agent)

```bash
corepack enable && pnpm install        # pnpm 12.16.1 · Node 24
pnpm verify                            # lint + typecheck + test + build + smoke + secret-scan
pnpm --filter web dev                  # http://localhost:3000  ·  health: /api/health
```

ساختار کلیدی: `apps/web` (اپ Next.js) · `packages/` (پکیج‌های مشترک آینده) · `docs/` (نقشهٔ مرکزی: `docs/README.md`) ·
`ops/` (رجیستری تسک/اجرا/بازبینی) · `infra/` (Docker/Caddy/deploy) · `scripts/` (بازتولیدپذیر عملیات).

## نسخهٔ فعلی

`2026.11.0` — Engineering Foundation (اسکلت اجرایی + CI + سیستم مدیریت پیشرفت). هیچ قابلیت آموزشی هنوز ساخته نشده — عمدی (گیت مالک OQ-013).

## قوانین طلایی

محتوای اصلی آموزشی رایگان می‌ماند؛ هیچ مکانیزم محدودکنندهٔ یادگیری (قلب/انرژی) ساخته نمی‌شود؛ WCAG 2.2 AA از روز اول؛
هیچ Secret در ریپو نیست و نیست. تغییر تصمیم‌های تأییدشده فقط با فرایند مستند (KB → ADR).
