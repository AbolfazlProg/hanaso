# TASK-HANASO-27 — Subagent C Independent QA Report

**Auditor:** Subagent C (Explore — read-only) · **Date:** 2026-11-14
**Mandate:** فراخوانی **پس از پیاده‌سازی**؛ ممیزی کد واقعی فعلی، نه تأیید گزارش‌های A/B.
**Input context:** گزارش‌های A (معماری) و B (طراحی) فقط برای زمینه داده شد؛ تمام verdictها از خواندن مستقیم کد با file:line آمده‌اند. Main گزارش داد: 812/812 تست، tsc/eslint/build سبز، E2E مرورگری هر دو مسیر پاس — C این‌ها را بازتولید نکرد مگر در مواردی که ذکر شده (اجرای مستقیم `h27-practice-content.test.ts`: 11/11 سبز).

## VERDICT: **PASS-WITH-NOTES**

مأموریت TASK-27 (practice داخل journey، یک موتور، یک progress store، یک attempt model) در کد واقعی برقرار است. هیچ blocker یا major یافت نشد. ۴ یافتهٔ سطح minor/note (بند Defect List).

## خلاصهٔ ۱۰ بررسی (همه PASS)

1. **INTEGRATION TRUTH — PASS.** p1..p4 در `chapter-kana01.ts:33-56` دقیقاً در جایگاه‌های طراحی (h5+1/h9+1/h12+1/h15+1، قبل از m1)؛ merge در خط 106-107؛ صفحهٔ station یک رندرر generic است (بدون special-case برای practice — تنها branch، نشان optional برای !core است و pها core هستند). PR-1 + CL-16 گیت‌های جایگاه/drop هستند. _(اجرای مستقل: 11/11 سبز.)_
2. **NO PARALLEL ENGINE — PASS (۱ note).** `/api/practice` فقط GET دارد (route.ts:43)؛ `generateKanaSession` صفر caller محصول؛ `PracticeSessionRunner`/`practice-hub` صفر رفرنس در src؛ جدول‌های evidence فقط reader محصول دارند؛ نویسندهٔ `completePracticeSession` بدون caller محصول مانده (note #1). `/poc/practice` در production 404 می‌شود و هیچ لینکی از UI محصول ندارد.
3. **COVERAGE — PASS.** شمارش مستقل: ۹۹ تمرین (p1=19, p2=18, p3=20, p4=42؛ recognition 38 / listening 20 / recall 12 / decode 24 / rule-listening 3 / meaning-select 2). **همهٔ ۴۶ گلیف پایه ≥۲ تمرین — صفر missing.** تست PR-4 (`h27…test.ts:184-198`) دقیقاً همین را assert می‌کند.
4. **UNTAUGHT CONTENT — PASS.** PR-3 با لیست ممنوع per-station روی promptJa/reading/rationale/f1-f2-f3 + legality با `glyphsIntroducedByStation` و نقشهٔ derived (ば→h12، ぱ→h15، だ→h9، が→h5، ゃゅょ→h6، っ→h13). Spot-check مستقل ۶ آیتم (ex-kana-p3-lis-ba، p3-dec-kaban، p3-dec-shinbun، p4-rec-po، p4-rec-yo-small، p4-rl-gakkou، p1-msg-gogo): همه legal ✔.
5. **HINT/FEEDBACK — PASS.** یک ladder واحد (`grading.ts:70-99`): F1 statement → F2 hint + eliminateOptionIds (هرگز کلید، هرگز انتخاب خود زبان‌آموز اگر ممکن) → F3 reveal + referenceBlockId. PR-6 برای هر ۹۹ آیتم f1/f2/f3 + rationale هر گزینه + referenceBlockId + role:'practice' را assert می‌کند. کیفیت فارسی ۳ نمونه خوانده شد: Hintها راهنمایی می‌کنند و جواب را نمی‌ریزند؛ feedback اشتباه تمایز واقعی را آموزش می‌دهد.
6. **AUDIO/AUTO-NEXT — PASS.** autoplay سؤال فقط برای kana-listening/rule-listening (`exercise-session.tsx:615-644`)؛ recognition/decode هرگز پیش از پاسخ صدا ندارند (صدا = جواب). پخش تلفظ درست فقط روی پاسخ درست یا F3 (route.ts:302-334 — «no key material leaves the server» در F1/F2). Auto-next از `EXPERIENCE` config (1500/2200/4000ms + beat 650/fallback 3200).
7. **FA+EN READING GUIDE — PASS (۱ note).** کارت پاسخ: گلیف + خوانش فارسی + `|` + لاتین `dir=ltr` (`exercise-session.tsx:910-935`)؛ تأیید متقاطع با اسکرین‌شات E2E A06. Note: formatter `kanaReadingLatin` بی‌مصرف است و revealهای rule-listening فارسی-onlyاند (واژه romaji رسمی ندارد).
8. **REVIEW/FSRS — PASS.** `getReviewQueue`/`recordRetrieval` همچنان throw (`integration.ts:86,89`)؛ هر ۴ ایستگاه `fsrsItems: []`؛ هیچ dueAt/nextReview write در کد practice (grep: صفر)؛ یادداشت صادقانهٔ «هنوز فعال نیست» در هاب و API.
9. **SECURITY — PASS.** guest → 401 (route.ts:44-50 و station/route.ts:179-187 برای همهٔ اکشن‌ها)؛ hint فقط برای exercise همین ایستگاه (265-276)؛ grade فقط role:'practice' (283-290)؛ complete با اعتبارسنجی prereq سمت سرور + 409 ساختاریافته + idempotent (456-458)؛ ownership با userId per-browser؛ کلیدها با `toClientExercise` (361-376) strip می‌شوند و rule-listening حتی promptJa را pre-answer حذف می‌کند.
10. **DUPLICATES — PASS-WITH-NOTES.** بازپیاده‌سازی مستقل کلید PR-5 (type+prompt+پاسخ درست): **صفر برخورد؛ صفر جفتِ متفاوت‌فقط-در-ترتیب-گزینه.** سه near-duplicate عمدی (spiral) در Defect List ثبت شد.

## Defect List

| #   | شدت   | یافته                                                                                                                                                                                                                    |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | minor | `lib/poc/completions.ts:59-114` — نویسندهٔ evidence (`completePracticeSession`) با صفر caller محصول باقی مانده؛ dev-only اما یک import فاصله با نوشتن دوباره دارد. پیشنهاد: extraction یا نشان `@internal` در follow-up. |
| 2   | note  | `ex-kana-p2-rec-n`/`p4-rec-n` (گزینه‌ها/پاسخ یکسان، فقط حاشیهٔ prompt متفاوت) و `p3-rec-he`/`he2` (دوبار آزمودن へ در یک ایستگاه) — پاسِ عمدیِ spiral review؛ ضعیف‌ترین موارد «تمرین جدید» بانک.                         |
| 3   | note  | `kanaReadingLatin` (fa.ts:321) بی‌مصرف؛ الگوی «فو \| fu» دستی در exercise-session ساخته می‌شود؛ revealهای rule-listening فارسی-only (`latin: ''`).                                                                       |
| 4   | note  | در زمان ممیزی، fix باگ RSC (page.tsx) و lint-fix تست کامیت‌نشده بود — باید قبل از اعلام COMPLETE کامیت شود. (Main: انجام شد — commit نهایی همین report.)                                                                 |

**Bottom line (نقل از C):** «the code, not the docs, confirms TASK-27's mission — practice is four real stations in the one journey, executed by the one StationRunner/`/api/curriculum/station` engine, one progress store (`station_progress`), one attempt model; the parallel engine is retired with evidence preserved read-only. PASS-WITH-NOTES.»

##处置 Main Agent نسبت به یافته‌ها

- **#1 (minor):** پذیرفته — تصمیم معماری ثبت‌شده (درز FSRS + مصرف‌کنندهٔ تست integration-pg). در `TASK27_IMPLEMENTATION_REPORT.md §5` و CURRENT_STATE به‌عنوان debt صریح ثبت شد. هیچ مسیر محصولی آن را صدا نمی‌زند.
- **#2، #3 (note):** در `TASK27_COVERAGE_MATRIX.md` §«یادداشت کیفیت» ثبت شدند؛ بدون تغییر کد (spiral عمدی + محدودیت دادهٔ registry).
- **#4 (note):** رفع شد — همهٔ تغییرات در commit نهایی این مأموریت push شدند.
- هیچ blocker/major وجود نداشت؛ بنابراین نتیجهٔ نهایی مأموریت بر اساس QA مستقل C: **PASS (با یادداشت‌های ثبت‌شده)**.
