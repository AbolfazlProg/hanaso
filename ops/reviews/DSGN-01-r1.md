# TASK-DSGN-01 Review r1 — Architecture & Technical Quality

- **Reviewer:** r1 (مستقل — معماری و کیفیت فنی؛ سازنده ≠ بازبین)
- **Date:** 2026-11-02 · **Branch:** `feat/dsgn-01-aizen-system` · **Task:** TASK-DSGN-01 (#13) · **مبنای تصمیم:** DD-084 (KB PR #5، merge شده در KB main)
- **Method:** diff کامل برنچ در برابر main؛ تطبیق مقدارها با KB `design-lab/visual-direction/02-art-directions.md` §مسیر ب + استایل‌برد `direction-b-aizen.html`؛ اجرای واقعی build تولیدی + راستی‌آزمایی محاسباتی استایل‌ها با Playwright (computed styles + pixel sampling) در 1440 و ۳۹۰px.

## یافته‌ها

| ID    | Severity | فایل                                                     | مسئله                                                                                                                | وضعیت                                                                                                                                            |
| ----- | -------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| r1-F1 | S2       | `src/app/page.tsx`                                       | `style={{fontSize:'0.52em'}}` اینلاین — برخلاف الگوی کلاس‌محور ریپو                                                  | ✅ رفع شد → `text-[0.52em]`                                                                                                                      |
| r1-F2 | S3       | `src/app/poc/ui/page.tsx`                                | `style={{width:'50%'}}` اینلاین برای پرشدن hatching                                                                  | ✅ رفع شد → `w-1/2`                                                                                                                              |
| r1-F3 | S3       | `src/components/ui/button.tsx`                           | فراخوانی `buttonVariants()` از Server Component خطای build می‌داد (`use client` روی فایل)                            | ✅ رفع ساختاری → استخراج `button-variants.ts` سروری + هدر RTL-audit (تست دروازهٔ کامپوننت‌ها مجدداً سبز)                                         |
| r1-F4 | S3       | `tests/unit/ui/tokens-gate.test.ts` + `buttons.test.tsx` | تست‌های قفل مقدار، DD-067 قدیمی را قفل کرده بودند؛ باید به پالت Aizen بازقفل شوند (بدون این، تغییر قانونی مسدود است) | ✅ رفع شد — قفل جدید DD-084 + توکن‌های الزامی جدید (indigo/speaker-l/shadow-offset/hero/tracking-poster)                                         |
| r1-F5 | P3       | `dialogue-scene`                                         | صحنهٔ کاراکترها روی کاغذ ماند نه نوار نیلی — رندرر Placeholder گوینده‌ها رنگ تیره دارد و روی نیلی ناخوانا می‌شود     | 📋 ثبت شد به‌عنوان spec-gap پیگیری (Track D: پشتیبانی مجموعهٔ روشن در CharacterRenderer) — کار خودکار بدون تغییر قرارداد ADR-018 انجام‌پذیر نیست |

## راستی‌آزمایی تجربی (شواهد)

- `pnpm verify` (۹ دروازه): **ALL GATES GREEN** — ۱۲۵/۱۲۵ تست، typecheck، lint، stylelint منطقی، build، بودجهٔ فونت (کل ۱٫۹۱MB < ۲٫۳MB)، smoke، secret scan.
- راستی‌آزمایی محاسباتی رندر (Playwright): paper=rgb(250,247,239) ✓ · CTA=shu + سایهٔ `rgb(23,48,73) 4px 4px 0` ✓ · هیرو weight=900 + Vazirmatn ✓ · tracking زیرنویس JA=0.22em ✓ · مُهر (shu/round/rotate 6°) ✓ · نوار A→D قطعهٔ فعال shu ✓ · hatching=repeating-linear-gradient ✓ · کارت نیلی (SVG+گرادیان) + گویندهٔ روشن rgb(229,180,131) ✓ · کارت جمله سفید + قاب ۲px ink ✓ · RTL ✓.
- پیکسل: نوار هیرو (21,44,67)≈indigo ✓ · کاغذ پایین صفحه ✓ · حضور پیکسل‌های indigo/shu/paper در /poc/ui موبایل ✓.
- ۸ صفحه در ۱۴۴۰ و ۳۹۰: صفر سرریز افقی، صفر خطای کنسول.

## حکم

**PASS با اصلاحات اعمال‌شده** — تغییرات پالت/توکن با DD-084 هم‌خوان؛ معماری token-swap (بدون تغییر نام توکن‌ها) برقرار؛ هیچ بازنویسی ساختاری ناسازگار؛ بدهی ثبت‌شده فقط r1-F5 (خارج از مالکیت این تسک).
