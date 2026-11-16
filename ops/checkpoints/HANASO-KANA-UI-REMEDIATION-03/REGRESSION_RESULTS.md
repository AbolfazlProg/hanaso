# REGRESSION RESULTS — HANASO-KANA-UI-REMEDIATION-03 (§6)

> اجرای کامل چک‌های پروژه + گاردهای Mission 2 روی tip `3285aea` (پس از تمام اصلاحات UI).

## خلاصهٔ اجرا

| بررسی | نتیجه | جزئیات |
|---|---|---|
| `npx vitest run` (کل) | **PASS — ۷۷ فایل / ۸۵۶ تست** | شامل ۴۱ تست گارد Mission 2 |
| گاردهای یکپارچگی محتوا (Mission 2) | **PASS ۴۱/۴۱** | kana-content-integrity (۷ گارد) + kana-romaji (۵ بلوک) + curriculum-content TL-14 |
| معادل ۵۸۶-validation | **PASS** | همان ۵ چک ممیزی (تک‌پاسخگی/یکتایی خوانش/سازگاری/hint/گیت≠walk) داخل تست‌های گارد روی هر ۵۸۶ تمرین اجرا می‌شوند؛ اسکریپت مستقل remediation_reaudit.py منطق یکسان دارد (گزارش Mission 2) |
| `npm run lint` (ESLint) | **PASS — ۰ خطا** | |
| `npm run typecheck` (tsc --noEmit) | **PASS** | |
| `npm run build` (production) | **PASS (exit 0)** | اولین اجرا exit 137 = OOM sandbox (۴GB RAM)؛ رerun با `NODE_OPTIONS=--max-old-space-size=3072` موفق — خطای کد نبود، محدودیت sandbox ثبت شد |
| رگرسیون مرورگر (۱۰ سناریو) | **PASS** | BROWSER_REGRESSION_REPORT |
| QA ریسپانسیو (۶ عرض × ۴ صفحه) | **PASS — ۰ سرریز/کلیپ/لمس‌هدف ریز/متن ریز؛ ۰ کانای unisolated** | RESPONSIVE_QA_REPORT |
| کنتراست WCAG AA | **PASS — ۰ خطا** روی ۳ صفحهٔ کلیدی (۷۳ نود) | ACCESSIBILITY_AND_CONTRAST_REPORT |

## حفاظت از Mission 2 (§5 مأموریت)

- صفر تغییر در فایل‌های محتوای تمرین/ایستگاه‌ها/kana-items/kana-romaji (diff CP-0→CP-3: فقط ۷ فایل component/CSS).
- گزینه‌ها/کلیدها/hintها/خوانش‌ها/`kanaWordRomaji` دست‌نخورده — توسط تست‌ها اثبات شد (۴۱/۴۱ سبز + ۸۵۶ کل).
- FSRS/منطق نمره/پیشرفت: تغییر نکرد (هیچ فایل ماژول غیر-UI لمس نشد).
- regression guardها ضعیف نشدند — هیچ تستی حذف/تغییر داده نشد؛ فقط تست‌های جدید Mission 2 از قبل موجود بودند و سبز ماندند.

## وضعیت Git

- شاخه: `fix/HANASO-KANA-UI-REMEDIATION-03` (مبنا: `3bd81c20209f2e02a19e5ba7cdb9123f6808e800` = tip Mission 2، از origin verify شد).
- کامیت‌های push شده: `402182a` → `d05c716` → `9609a55` → `3285aea` (+ کامیت مستندات پایانی).
- شاخهٔ Mission 2 دست‌نخورده.
