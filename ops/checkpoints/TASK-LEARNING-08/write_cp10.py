#!/usr/bin/env python3
"""A6 (Approved Kana Introduction Layout) — CP-10 entries for CURRENT_STATE.md
and CHECKPOINT_LOG.md. Prepared 2026-11-08; the <SHAS> placeholders are filled
after the real commit/push/deploy (requires SSHPASS + PAT)."""

CP10_STATE = """# CURRENT_STATE — TASK-LEARNING-08

> آخرین به‌روزرسانی: **CP-10 (پیوست ۶ — چیدمان تأییدشدهٔ معرفی کانا) · 2026-11-08**
> زنده: https://learn.kotodama.ir @ `<DEPLOY_SHA>` · شاخهٔ کاری: `tl08-addendum6` (مبتنی بر سر `tl08-addendum5` = 2b74daa).

## پیوست ۶ — چیدمان تأییدشدهٔ معرفی کانا (استقرار <DEPLOY_SHA>)

| بند wireframe | وضعیت |
| --- | --- |
| §۱ ترتیب پنج بخش (عنوان → کادر بزرگ بوم → دو باکس → مثال‌ها → Footer+CTA) | ✅ data-intro-section=[title,canvas,teaching,examples,footer] در هر سه کانا (راستی‌آزمایی محلی + زنده) |
| §۲ کادر بزرگ آموزش نوشتن | ✅ بوم ۳۴rem (۵۴۴px؛ قبلاً ۲۸۹px) در کادر برجسته؛ انیمیشن شماره‌دار + ماندگاری فرم استاندارد + رسم/Morph واقعی |
| §۳ دو باکس روش نوشتن \| تلفظ و یادسپار | ✅ کنار هم (md:grid-cols-2، RTL) با ابعاد برابر؛ همان پنل‌های مرحله‌ای قبلی |
| §۴ نمونه‌های کاربردی | ✅ مثال‌های مرتبطِ ایستگاه (شامل گلیف) در یک باکس تمام‌عرض با ترتیب تألیف؛ هایلایت گلیف؛ صوت مستقل هر واژه؛ pronFa؛ hostWord بدون تکرار |
| §۵ Footer و CTA | ✅ Divider + «پایان معرفی کاراکتر» + «شروع تمرین نوشتن ←» (تمام‌عرض موبایل) + «اول مشاهده و یادگیری، سپس تمرین» — بعد از همهٔ محتوا |
| §۶ رفتار CTA | ✅ همان صفحه/بدون Route؛ نمای متمرکز: عنوان فشرده + foldهای pron/examples؛ بهبود واقعی: دکمه‌های تمرین بالای هدر گیر نمی‌کنند (در production قدیم replayTop=51 < headerBottom=80) |
| §۷ عدم خرابی | ✅ ریپلی/صدا/مورف/پیشرفت/هویت Aizen — شواهد محلی؛ گیت‌های کامل ریپو سبز |
| §۸ ریسپانسیو | ✅ موبایل ۳90px تک‌ستونه بدون overflow؛ CTA تمام‌عرض در دسترس |

- پیاده‌سازی: kana-card.tsx (پنج‌بخشی) + writing-canvas.tsx (maxWidthRem) + fa.ts (۹ رشته + متن CTA) + station-runner.tsx (relatedExamplesByKanaId) + تست جدید kana-intro-layout (۱۲ تست) + به‌روزرسانی ۲ تست موجود.
- شواهد: اسکرین‌شات‌های ۶گانه + VLM سه‌حالته PASS + اندازه‌گیری‌های DOM (قبل/بعد).

---

"""

CP10_LOG = """

## CP-10 — 2026-11-08 — پیوست ۶ (چیدمان تأییدشدهٔ معرفی کانا) پیاده‌سازی و استقرار <DEPLOY_SHA>

- **ورودی مأموریت:** تأیید مالک بر wireframe چیدمان صفحهٔ معرفی کاراکتر — پیاده‌سازی در رابط واقعی، هویت Aizen، کمترین تغییر بدون ساختار موازی، CTA بعد از همهٔ محتوا و مثال‌ها.
- **بازیابی سشن:** sandbox بازیافت شد (SSHPASS/PAT و ریپوی /opt/hanaso از بین رفت) — وضعیت از production (health @ 2b74daa · 1.0.0-tl08-a5)، اسناد checkpoint و snapshot کامپوننت‌ها (a5-work) بازیابی شد؛ کلیدها پس از تأمین، فرایند زیر کامل اجرا شد.
- **پیاده‌سازی (کامیت <COMMIT_SHA>):** پنج‌بخشی‌سازی KanaCard (title/canvas/teaching/examples/footer) — بوم قهرمان ۳۴rem — دو باکس آموزشی — مثال‌های مرتبط داده‌محور از example-set ایستگاه — Footer با نشانگر/CTA/کپشن — عنوان فشردهٔ تمرین + اسکرول کل کارت زیر هدر (رفع گیرکردن دکمه‌های تمرین زیر هدر که در production قدیم هم بود) — maxWidthRem بوم — ۹ رشتهٔ fa — تست‌ها (۱۲ جدید + ۲ به‌روز).
- **راستی‌آزمایی محلی (پیش از استقرار):** هارنس با کامپوننت‌های واقعی + CSS واقعی production + دادهٔ واقعی زندهٔ あ/い/う: ترتیب بخش‌ها، بوم ۵۴۴px، دو باکس هم‌ردیف، مثال‌های per-kana صحیح (あ→[あう،あおい]، い→[いえ،あおい]، う→[うえ،あう])، CTA فقط در footer/ready، کلیک→guided همان صفحه + foldها + کنترل‌ها قابل‌دسترس، رسم ضربه→Morph→settle دقیق، ریپلی بدون ریست، موبایل بدون overflow؛ VLM سه حالت PASS.
- **گیت‌های ریپو:** vitest <N>/<N> ✓ · tsc ✓ · eslint 0 ✓ · prettier ✓ · build ✓ · eqa ✓.
- **استقرار:** image ghcr.io/abolfazlprog/hanaso:<SHA>… → compose up → health ok → smoke ALL GREEN.
- **راستی‌آزمایی زندهٔ ۱۳ سنجهٔ پیوست ۵ (رگرسیون کامل) + سنجه‌های پیوست ۶:** <RESULTS>
- **Push:** شاخهٔ tl08-addendum6 → GitHub؛ CI سبز.
- **قدم بعدی:** بازبینی مستقیم مالک؛ PR #115 همچنان باز.
"""


def write(base: str) -> None:
    cs = f"{base}/ops/checkpoints/TASK-LEARNING-08/CURRENT_STATE.md"
    cl = f"{base}/ops/checkpoints/TASK-LEARNING-08/CHECKPOINT_LOG.md"
    src = open(cs, encoding="utf-8").read()
    open(cs, "w", encoding="utf-8").write(CP10_STATE + src)
    src = open(cl, encoding="utf-8").read()
    open(cl, "w", encoding="utf-8").write(src.rstrip() + CP10_LOG + "\n")
    print("CP-10 written to", base)


if __name__ == "__main__":
    import sys

    write(sys.argv[1] if len(sys.argv) > 1 else "/opt/hanaso/build-tl08/repo")
