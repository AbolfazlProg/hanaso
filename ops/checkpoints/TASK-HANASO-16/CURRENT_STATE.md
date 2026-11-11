# CURRENT_STATE — TASK-HANASO-16 (Learning Journey + Deployment Recovery)

> آخرین به‌روزرسانی: **CP-06 (نهایی) · ۲۰۲۶-۱۱-۱۱ — انتشار 1.0.0-hanaso16-r01 آماده (Pin نهایی + Bundle)**
> شاخه محصول: `hanaso16-learning-journey` (ایجادشده از `origin/tl14-foundations-redesign` @ `9a466644` — جدیدترین Remote؛ شامل کل TL-14 و تغییرات معوق `1.0.0-tl14-r01` @ `935010f8`)
> مبنای انتشار معوق: `1.0.0-tl14-r01` (TL-14 کامل: دک‌های اسلایدی ۸ ایستگاه قواعد + ۶ گیت محتوایی + رفع ۱۰۲ تخلف؛ ۶۲۶/۶۲۶ تست سبز)

## مأموریت در یک نگاه

| هدف | وضعیت |
| --- | --- |
| بخش ۱ — بازیابی وضعیت واقعی (Git/Checkpoint/Production) | ✅ CP-01 — `LEARNING_JOURNEY_AUDIT.md` + `DEPLOYMENT_FAILURE_ANALYSIS.md` |
| بخش ۲-۷ — معماری Chapter→Section→Rows→Lessons + پیاده‌سازی | ✅ CP-02..04 — IA + Resolverها + UI + رفع باگ learner-id |
| بخش ۹ — تست‌های اجباری Learning Journey | ✅ — `TEST_REPORT.md` (۶۵۱ واحد + ۹/۹ سناریوی مرورگر) |
| بخش ۸ — اصلاح Installer سه‌سطحی + انتشار معوق | ✅ CP-05 — updater v3.0 + ۱۴۰/۱۴۰ سندباکس — `DEPLOYMENT_GATE_FIX.md` |
| بخش ۱۰-۱۲ — Release، Bundle، گزارش نهایی | ✅ CP-06 — `RELEASE_MANIFEST.md` + OWNER-COMMAND v9 + راهنمای فارسی v9 + Bundle |

## پین‌های نهایی

هدف: `1.0.0-hanaso16-r01` @ `840b993` · ابزار: `ee29578` · bootstrap sha256: `7e45d4f9…` · **شرط انتشار: تعمیر خط مقدم VPS توسط مالک** (هر دو دامنه فعلاً برای دنیا قطعند — شواهد در DEPLOYMENT_FAILURE_ANALYSIS §۲).

## وضعیت بازیابی‌شده (خلاصهٔ واقعی)

- **Remote تازه‌ترین است**: `tl14-foundations-redesign` tip = `9a466644` (OWNER-COMMAND v8 pin به tl14-r01). کامیت `935010f8` معتبر و کامل است — هیچ جایگزین جدیدتری وجود ندارد. TL-13 = `4d0827a` روی `tl13-learning-integrity`. سندباکس به اسنپ‌شات قدیمی (عصر TL-09/10 در `hanaso10` روی tl10-quiz-ux) بازگشته بود؛ همه چیز از GitHub بازیابی شد (فقط تغییر mode فایل‌ها در اسنپ‌شات قدیمی بود — بدون محتوا).
- **TASK-HANASO-15**: هیچ اثری در Git/سندباکس نیست (نه Branch، نه Checkpoint) — نتیجه‌گیری: جلسهٔ اجرای Deploy توسط مالک بوده (شکست C7 + رول‌بک)؛ اسنادش در همین مأموریت (§۱ تحلیل) بازسازی شد.
- **Production عمومی**: هر دو دامنه برای کل دنیا Empty-reply (شواهد ۵ کشور + سندباکس؛ TLS معتبر ولی بدون پاسخ HTTP؛ پورت ۸۰ refused). App داخلی به گفتهٔ مالک روی tl13-r01 سالم. ریشه در خط مقدم مشترک (HAProxy/nginx میزبان) — **باید ابتدا توسط مالک تعمیر شود**.
- **Push به GitHub از این سندباکس ممکن نیست** (توکن با بازیافت سندباکس حذف شده؛ `fatal: could not read Username`). راه‌حل تحویل: **Git Bundle** + دستور دقیق Push مالک (الگوی جاافتادهٔ پروژه). Pinها (SHA-256/Commit) از کامیت‌های محلیِ قطعی محاسبه و بعد از Push بدون تغییر معتبرند.

## قراردادهای حفظ‌اجباری (TL-14 §۱۵ — پابرجا)

Progress Persistence · FSRS Contract · Kana Writing Engine · Learning Map/Station Completion/AIZEN Seal · Design System (بدون ایموجی، توکن‌ها، fa.ts، shu فقط خطا) · SKL-013 · صدا فقط دارایی committed · DD-081 · DD-048 Completion ≠ Mastery · بدون Hardcode ترتیب/تعداد فصل‌ها در Frontend.

## قدم بعدی

CP-02: `CHAPTER_SECTION_INFORMATION_ARCHITECTURE.md` + `PROGRESS_MAPPING.md` → سپس پیاده‌سازی Resolver خالص Sections/Reveal → پنل UI → تست‌ها → Installer → Release.
