# TASK-HANASO-26R — IMPLEMENTATION REPORT

**Branch:** `fix/TASK-HANASO-26R-production-pedagogy`
**Target release:** `1.0.0-hanaso26r-v16`
**Date:** 2026-11-14

## ۱. خلاصهٔ مأموریت

TASK26R اصلاح پداگوژی تولیدی بود که پس از TASK26 لازم شد: با اینکه تست‌ها سبز بودند، UI تولیدی هنوز یُوئون (ゃゅょ) را **قبل از** آموزش ردیف や نشان می‌داد. TASK26R ریشه را پیدا و اصلاح کرد، سه ممیزی مستقل (A/B/C) و سه دور بازبینی انجام داد و با گیت‌های رگرسیون جدید بست.

## ۲. ریشهٔ مشکل (چرا TASK26 «اصلاح‌شده» گزارش شد اما Production هنوز ترتیب قدیم نشان می‌داد)

در TASK26 ترتیب ایستگاه‌ها (فیلد `order` و آرایهٔ `stations` در `chapter-kana01.stations.ts`) اصلاح شد و h14 (ردیف や) قبل از h6 (یُوئون) آمد. اما **لیست قابل‌مشاهدهٔ UI از فیلد `order` نمی‌آمد** — از آرایهٔ `stationSlugs` واحد Hiragana در `chapter-kana01.ts` می‌آمد که در TASK26 دست‌نخورده مانده بود و همچنان h6 را قبل از h14 لیست می‌کرد. تست‌های TASK26 فقط `stations` و زنجیرهٔ پیش‌نیاز را می‌سنجیدند؛ هیچ گیت‌هایی `stationSlugs` را با ترتیب واقعی مقایسه نمی‌کرد — بنابراین سبز بودن تست با خطای تولیدی همزمان شد. TASK26R این کورمنظمی را با CL-16 بست.

## ۳. اصلاحات نهایی (CP-01 → CP-03)

| Commit | اصلاح |
| --- | --- |
| `b83461b` (CP-00/PHASE 4) | جابه‌جایی ایستگاه‌ها: h14 قبل از h6؛ زنجیرهٔ پیش‌نیاز h6←h14؛ انتقال بلوک‌های داکوتن به سطح blocks |
| `981394d` (CP-01/01b) | MicroAsk schema؛ CL-15/CL-14 type fixes؛ eslint/tsc/build سبز؛ 776/776 |
| `5791460` (CP-02) | **بازسازی `stationSlugs` واحد Hiragana (۱۸ slug، h14→#13 قبل از h6→#14، بازگرداندن `stn-kana-opt-r-h9` که در round-2 به اشتباه حذف شده بود)** + گیت CL-16 (UI order == API order، ضد-drop) + اصلاحات فارسی round-2 (びょういん عربی ×4، ふ→فو، ロ(رو)، نشت H9/CONTENT-107، やすみ dup→やまだ)؛ 778/778 |
| `04e5313` (CP-03) | میکرو-پچ round-3 از ممیزی C: جایگزینی واقعی objectiveFa واحد k1 (رفع باگ silent no-op)، نویسهٔ عربی ボールペン، نشت‌های H5، پرانتز یتیم «(استثنای )»، pronFa やまだ + **گیت CL-17** (ممنوعیت توکن مهندسی و نویسهٔ عربی داخل متن ژاپنی)؛ **780/780** |

## ۴. نتیجهٔ تأیید چشمی Build نهایی CP-03 (2026-11-14)

سرور standalone روی Build `04e5313` در پورت 3100 (با `.next/static` و `public` به‌درستی داخل standalone). بررسی با مرورگر headless (کانتکست تازه):

- `/learn` هایدریت‌شده: ترتیب مرئی بخش هیراگانا = ۱۸ ردیف: …は → **や** → **قاعدهٔ یُوئون** → سوکوئون → わ+هان‌داکوتن → برگهٔ خواندن → **مرور فاز ۱ (اختیاری/H9)** — هیچ ردی از ترتیب قدیم نیست.
- دکِ h12 (۱۵ مرحله) کامل طی شد: مرحلهٔ ۱۲/۱۵ «داکوتن ردیف は — همان قاعدهٔ آشنا» با جدول は→ば/ひ→び/ふ→ぶ رندر شد؛ مرحلهٔ ۱۳/۱۵ MicroAsk ««ぶ» چه صدایی دارد؟» با گزینه‌های **بو / پو / فو** (گزینهٔ قدیمی «هو» حذف شده) و reveal ««فو» خودِ ふ بدون ゛ است».
- صفر خطای JavaScript/hydration در کل مسیر.
- API: ۳۴ ایستگاه، h14@index12 < h6@index13، opt-r-h9@index17.
- اسکرین‌شات‌ها: `screenshots/cp03-final-learn.png`، `cp03-final-h12-dakuten.png`، `cp03-final-h12-microask.png`، `cp03-final-h12-microask-reveal.png`

نتیجهٔ سه Subagent دور ۳: A = ۶/۶ PASS (گزارش: `TASK26R_PRODUCTION_VERIFICATION.md`)؛ B = ۵/۵ PASS (گزارش: `TASK26R_CURRICULUM_AUDIT.md`)؛ C = یافته‌های باقی‌مانده همگی در CP-03 اصلاح و با CL-17 گیت شدند (گزارش: `TASK26R_PERSIAN_PEDAGOGY_AUDIT.md`).

## ۵. ترتیب نهایی Curriculum

سند کامل: [`CURRICULUM_MAP.md`](./CURRICULUM_MAP.md) — تولیدشده با `apps/web/scripts/h26_curriculum_map.py` از Source واقعی. ۳۴ ایستگاه در ۲ واحد؛ واحد هیراگانا (۱۸ ایستگاه) با h14 (や) در جایگاه ۱۳ و h6 (یُوئون) در جایگاه ۱۴ و H9 در انتهای واحد.

## ۶. منبع بارگذاری Curriculum و امنیت Progress

- **محتوا فقط از Source خوانده می‌شود:** `loadChapterBundle()` در `src/modules/curriculum/server.ts` ← `content/index.ts` ← `chapter-kana01.ts` / `chapter-kana01.stations.ts`. هیچ جدولی در Database محتوای Curriculum را نگه نمی‌دارد؛ **Migration لازم نیست.**
- **Database فقط Progress دارد:** `app.station_progress` / `app.chapter_progress` با کلید `stationId = uuidV5('lesson:' + slug)` (`src/db/ids.ts:45`) — **مستقل از ترتیب**. جابه‌جایی ایستگاه‌ها هیچ ردیف Progress را تغییر نمی‌دهد؛ Progress کاربران قبلی با نصب v16 دست‌نخورده می‌ماند.
- متغیرهای امنیتی TASK24 (ازجمله الزام `HANASO_SESSION_SECRET`) در Installer دست‌نخورده باقی‌مانده‌اند.

## ۷. Release v16 و آزمایش Installer

نتیجهٔ کامل در [`TASK26R_PRODUCTION_VERIFICATION.md`](./TASK26R_PRODUCTION_VERIFICATION.md) بخش Installer-Sandbox ثبت شده است. خلاصه: bootstrap از GitHub (commit pin) دانلود، SHA-256 تطبیق، محصول روی target commit چک‌اوت، build standalone، static/public کپی، سرور بالا، smoke-testها (health/learn/journey order/MicroAsk) PASS، اجرای دوبارهٔ Installer = idempotent، progress آزمایشی قبلی حفظ شد. دستور نصب در [`OWNER-COMMAND.txt`](../../../OWNER-COMMAND.txt) (نسخهٔ v16).
