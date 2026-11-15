# TASK-HANASO-20 — CURRENT STATE (وضعیت فعلی)

> Branch `fix/TASK-HANASO-20-onboarding` (pushed to origin). Base: `origin/hanaso17-home-dashboard @ da3c007` (= live 3f41f6ee + the HANASO-18 delivery-layer fixes). 2026-11-13.

## خلاصهٔ یک‌پاراگرافی

هر یافتهٔ بحرانی/بالای ممیزی TASK-HANASO-19 به کد واقعی، تست خودکار و تأیید مرورگر تبدیل شد: زنجیرهٔ onboarding از ریشه رفع شد (شناسه از اولین پاسخ + GUEST فقط-خواندنی + 409 ساختاریافته)، محتوای آموزشی ۲۱ مورد اصلاح شد (۱۶ ممیزی + ۵ کشف‌شده توسط گیت جدید) با دو گیت CI جدید، بازخورد تفکیکی و صدای واقعی کارت مرجع پیاده شد، 404 فارسی شد. ۸ تا ۹ مورد کوچک/تصمیمی با توضیح شفاف معوق ماندند (BUG_REMEDIATION_LOG). نسخهٔ پیشنهادی انتشار: `1.0.0-hanaso20-r01` — آمادهٔ دستور مالک.

## وضعیت فنی

| محور | وضعیت |
| --- | --- |
| تست unit+integration | ✅ 718/718 (مبنا ۶۹۲؛ +۲۶؛ هیچ حذف/تضعیف) |
| EQA | ✅ 37/37 · صفر waiver فعال |
| typecheck / lint | ✅ / ✅ |
| E2E مرورگری | ✅ 22/22 (QA instance، in-memory) |
| Responsive | ✅ 31/31 + صفر خطای JS |
| بیلد production | ✅ (شامل `ƒ Proxy (Middleware)`) |
| PG واقعی (integration-pg) | ⚠️ اجرا نشد — نیازمند `TEST_DATABASE_URL` به سرور PG؛ در Sandbox نبود |
| Deploy به VPS | ⚠️ **انجام نشد** — نیازمند اجرای دستور مالک روی VPS (OWNER-COMMAND v11 آماده است) |

## شاخه/انتشار

- `fix/TASK-HANASO-20-onboarding` → origin ✅ (۸ کامییت کد + کامیتهای انتشار)
- `audit/TASK-HANASO-19` دست‌نخورده (مبنا؛ هرگز مستقیم به production تبدیل نشد — طبق قاعدهٔ مأموریت).
- `origin/main` همچنان ۲۰+ کامییت عقب (merge خط مقدم = P3-8 ممیزی — با مالک).

## آنچه بعد از این مأموریت می‌ماند (Backlog با توضیح)

1. BUG-009 (گزینهٔ سوم rule-listening) — پاسِ اعتبارسنجی مستقل با تأیید مالک.
2. گیت hygiene کامیتی (BUG-011) + OBS-001..010 (تصمیم‌های مالک) — BUG_REMEDIATION_LOG §۲.
3. نقش apply (انحراف ب) — تصمیم مالک؛ OBS-006.
4. صوت واژه‌های جدید (gen روی VPS): FOREIGN_COMBO_WORDS + YOON_SEPARATE_FORMS + PENDING_CARD_WORDS.
5. مهر AIZEN واقعی/هنر شخصیت (P2-3 ممیزی) — Roadmap جدا، طبق PHASE 5 مأموریت.
6. FSRS — بدون بررسی معماری دست نخورد (PHASE 5).
