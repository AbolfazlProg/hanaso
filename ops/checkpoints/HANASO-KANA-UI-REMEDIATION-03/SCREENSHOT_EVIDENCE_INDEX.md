# SCREENSHOT EVIDENCE INDEX — HANASO-KANA-UI-REMEDIATION-03

> تمام شواهد در `ops/checkpoints/HANASO-KANA-UI-REMEDIATION-03/evidence/` — commit شده در CP-3.
> همه با agent-browser (headless Chromium واقعی) از dev server محلی؛ اعتبار non-blank با PIL تأیید شده.

| فایل | viewport | صفحه/سناریو | چه چیزی را اثبات می‌کند |
|---|---|---|---|
| `e1-mobile-lock-reason-visible-390.png` (0.336) | 390×844 | journey، کلیک ردیف قفلِ نزدیک fold | **UI-02 بعد**: پیام قفل با رنگ shu-deep در دید (مرکز صفحه) — همان سناریویی که قبل از اصلاح ۹۹px زیر fold بود |
| `e2-desktop-journey-icons-1440.png` (0.769) | 1440×900 | journey، حالت دسکتاپ | **UI-01**: نشانگر قفل چپ + تایل نوع درس راست؛ سلسله‌مراتب سکشن/ردیف |
| `e3-h1-instructional-kana-17px-390.png` (0.817) | 390×844 | stn-kana-h1، کارت آموزشی あ | **UI-03 بعد**: گلیف hero بزرگ + جملهٔ تمایز あ/お با کانای 17px/500 |
| `e4-feedback-rationale-17px-390.png` (0.622) | 390×844 | stn-kana-h13، پاسخ غلط + سرنخ | **UI-03 بعد (feedback)**: F1 + rationale با کانای isolated 17px |
| `e5-360px-h13.png` (0.624) | 360×844 | stn-kana-h13، باریک‌ترین عرض | بدون سرریز افقی/کلیپ در 360 |
| `e6-tablet-768-journey.png` (0.566) | 768×1024 | journey، تبلت | تب‌های سکشن دوستونی + چیدمان ردیف‌ها |
| `e7-h0-completion-seal-390.png` | 390×844 | stn-kana-h0، تکمیل ایستگاه | **سناریوی ۵/۱۰**: مهر AIZEN + دکمه‌های پایان/مرور دوباره |
| `e8-katakana-section-lock-reason-390.png` | 390×844 | سکشن کاتاکانا (آینده)، ردیف قفل | پیام قفل در سکشن آینده هم درست (پیش‌نیاز واقعی «ردیف わ + قاعدهٔ...») |

عدد داخل پرانتز = نسبت non-white (اعتبار محتوا).

## شواهد عددی (بدون تصویر — از evalهای ثبت‌شده در کامیت‌ها)

- **UI-02 قبل/بعد:** bottom fold overflow: 99px → 0 (fully visible, top 381–452 در vh 844)؛ persistence: 3.6s → ماندگار (>4s تست شد).
- **UI-03 قبل/بعد:** pairHint あ/お: 14px/400 → 17px/500؛ rationale ふ: 14px unisolated → 17px/500 داخل bdi.
- **UI-04 کنتراست:** shu 4.37:1 → shu-deep 5.8:1؛ دقایق ink-faint 3.68:1 → ink-soft 6.7:1؛ sweep نهایی ۰ خطا ×۳ صفحه.
- **Auto-scroll:** load→scrollY 807 (ردیف در مرکز)؛ user-scroll به 0 محترم ماند.
- **Bidi:** unisolated runs: journey 34→0، h1 2→0، p3 2→0، practice 3→0.
- **Responsive matrix:** ۲۴ ترکیب عرض×صفحه: ۰ سرریز، ۰ کلیپ، ۰ لمس‌هدف ریز، ۰ متن ریز.
