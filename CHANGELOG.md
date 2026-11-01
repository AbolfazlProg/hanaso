# Changelog — HANASO

> قالب نسخه‌ها: **CalVer `YYYY.0M.N`** · محور استقرار: تگ=SHA · پیام‌ها فارسی و قابل‌فهم.
> هیچ ادعایی بدون شناسهٔ commit قابل‌استناد ثبت نمی‌شود.

## 2026.11.0 — Engineering Foundation (2026-11-01)

**نوع:** زیرساخت — هیچ قابلیت آموزشی در این نسخه نیست (عمدی).

### افزوده شد

- ریپوی محصول `hanaso` (private) با ساختار Monorepo سبک (`apps/web` + `packages/`) — ADR-002
- اسکلت اجرایی Next.js **16.4.3** (App Router · RSC · standalone) + React **19.3.1** + TypeScript strict + Tailwind **4.3.3** با توکن‌های DD-067
- اندپوینت‌های سلامت: `GET /api/health` (liveness + build-info) و `GET /api/ready` (readiness) + پوشش تست واحد + smoke واقعی
- قرارداد خطای مشترک `Envelope<T>` در `modules/shared` + تست واحد
- CI کامل (format→lint→typecheck→test→build→audit→docker→GHCR tag=SHA) + Dependabot — ADR-005
- زیرساخت استقرار: Dockerfile چندمرحله‌ای non-root + compose ایزوله + Caddy 2.11 + اسکریپت‌های deploy/rollback — ADR-003
- حاکمیت چند-Agentی: `AGENTS.md` ۹بخشی + `ops/` کامل (رجیستری/اجرا/بازبینی/قالب‌ها) + مالکیت ماژول‌ها + DoD
- سیستم مدیریت پیشرفت GitHub: Project «HANASO Development» + ۹ Milestone + ۳۶ Issue با AC وابستگی‌دار + تنظیمات squash-only/delete-branch — ADR-004 (محافظت سروری main در پلن Free قفل شد: BLOCKER-F07؛ کنترل جبرانی = قاعدهٔ Agent + بازبینی مستقل)
- مستندات: گزارش تجمیعی دانش (وضعیت‌های CONFIRMED/PROVISIONAL/…) · ADR-000..005 · بازارزیابی Stack ۲۰۲۶-۱۱-۰۱ · راهنمای توسعه/عملیات · طرح Preview

### تغییر داد

- نام کاری محصول: `japanese-learning-app` → **`HANASO`** (دستور مالک ۲۰۲۶-۱۱-۰۱؛ ثبت OQ-002 در KB در جریان — spec-gap)

### شناخته‌شده/محدودیت‌ها

- VPS در دسترس نیست (BLOCKER-F02) · DNS `hanaso.ir` از محیط Agent قابل‌راستی‌آزمایی نبود (BLOCKER-F04) · محافظت شاخهٔ main نیازمند GitHub Pro است (BLOCKER-F07). نکتهٔ مثبت: Actions اجرا و job «verify» کاملاً سبز شد (رن 41286578531) — نگرانی بیلینگ برای این ریپو برقرار نبود و پس از اصلاح، هر دو job (verify + image→GHCR) در رن‌های 41287442815 و 41289890549 سبز شدند.
