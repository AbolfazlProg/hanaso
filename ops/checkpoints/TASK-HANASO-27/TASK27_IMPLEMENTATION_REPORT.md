# TASK-HANASO-27 — Implementation Report

**Branch:** `feat/TASK-HANASO-27-integrated-practice` · **Base:** TASK26R `31c33b0`
**Date:** 2026-11-14 · **Status:** COMPLETE (معیارهای ۱۵گانه مأموریت — بند «محدودیت‌ها» را ببینید)

---

## 1. معماری قبل و بعد

### قبل (TASK-HANASO-22)
- `/practice` یک محصول مستقل بود: `PracticeHub` + `PracticeSessionRunner` داخل صفحه، موتور Session خودش را از `/api/practice` (اکنشن‌های `generate`/`answer`/`complete`) می‌گرفت.
- **موتور درجه‌بندی دوم:** ladder دوم ۲-مرحله‌ای (statement → reveal) بدون دکمهٔ Hint — موازی با F-ladder سه‌مرحله‌ای Lesson.
- **مدل Attempt دوم** (`PracticeItemResult` با `firstTryCorrect`) و **مدل Completion دوم** (`completePracticeSession` + fold جدا).
- جدول‌های `app.practice_sessions` و `app.learning_object_states` فقط از همین مسیر پر می‌شدند.

### بعد (TASK-HANASO-27)
- **Practice = ایستگاه واقعی داخل Learning Journey**: `stn-kana-p1..p4` در `section-a-hiragana` با `type:'practice'`, `core:true`, `completion:{kind:'task_completed'}` — دقیقاً همان قرارداد m1-reading.
- **یک موتور**: هر ۹۹ تمرین بلوک `exercise` معمولی‌اند که StationRunner رندر می‌کند و `/api/curriculum/station` با اکشن `grade`/`hint`/`complete` اداره می‌کند. هیچ مسیر کد خاصی برای practice در runner/route وجود ندارد (تأیید Subagent C §1).
- **الگوی مسیر:** h0–h5 → **P1** → h7–h9 → **P2** → h10–h12 → **P3** → h14/h6/h13/h15 → **P4** → m1-reading → opt. Prereqها: `h7←p1`, `h10←p2`, `h14←p3`, `m1←p4`.
- `/practice` = هاب RSC سبک: deep-link به ایستگاه‌های p1..p4 با قفل/باز واقعی (`stationAvailability`) + تاریخچهٔ sessionها + weak objects + یادداشت صادقانهٔ Review.
- `/api/practice` = فقط `GET` status (۴۰۱ برای guest؛ POST حذف شد).

### چه چیز مستقلی حذف/ادغام شد
| جزء | تصمیم |
|---|---|
| `PracticeSessionRunner` + `practice-hub.tsx` | **حذف کامل** (۵۸۷+ خط موتور موازی) |
| `/api/practice` generate/answer/complete | **حذف** — فقط GET ماند |
| موتور generator (`generateKanaSession`) | بدون caller محصول (فقط یک تست integration-pg) |
| `/poc/practice` | دست‌نخورده — POC فقط-dev (در prod 404)؛ مطابق ممیزی A از قبل در محصول لینک نیست |
| `practice_sessions` / `learning_object_states` | **حفظ کامل** — append-only evidence و درز FSRS؛ خواننده‌ها ماندند (هاب + GET status)؛ دادهٔ کاربران دست‌نخورده |
| `completePracticeSession` (نویسندهٔ evidence) | نگه داشته شد به‌عنوان کد dev/درز آینده — **بدون caller محصول** (یافتهٔ minor ساب C؛ بند ۵) |

## 2. F4 بازگشت به آموزش — بین‌ایستگاهی
تمرین‌های spiral به بلوک‌های آموزشی ایستگاه‌های **قبلی** ارجاع می‌دهند. چون jump داخلی ممکن نیست، `StationRunner` prop جدید `returnToStationHref: Record<blockId, href>` گرفت (سریال‌پذیر — رفع باگ RSC، بند ۴) و صفحهٔ station این نقشه را از bundle کامل می‌سازد؛ دکمهٔ F4 یا jump محلی است یا ناوبری به ایستگاه مبدأ. گیت تست به‌روز شد: هر referenceBlockId باید local باشد یا به ایستگاه **قبل‌تر** (جهت رو‌به‌عقب — افشای محتوای آینده ممنوع).

## 3. محتوا
- **۹۹ تمرین** (P1=19, P2=18, P3=20, P4=42): recognition 38, listening 20, recall 12, decode 24, rule-listening 3, meaning-select 2 — همه با F1/F2/F3 + `distractorRationaleFa` هر گزینه + `referenceBlockId`.
- **Coverage:** هر ۴۶ گلیف پایه ≥۲ تمرین (46/46 PASS — استخراج ماشینی در `TASK27_COVERAGE_MATRIX.md`).
- **Guardrails:** PR-3 ممنوعیت‌های per-station را تست می‌کند (كاتاکانا، chōonpu، ぐ/ず/げ/づ/ぷ/べ/پی هرگز؛ ゜/ゃゅょ/っ/ば فقط بعد از ایستگاه قانونشان).
- ثبت مفاهیم: `teachesConcepts` روی h5/h6/h9/h12/h13/h15 (EQA-1).
- پالیسی: L1 `stationsCore` hardMax 32→36 (registered exception با ارجاع به Design Doc)؛ `estMinutes` 406→441.

## 4. باگ واقعی که E2E گرفت (و رفع شد)
`returnToStationHref` ابتدا به‌صورت **تابع** از Server Component به Client Component پاس می‌شد → خطای RSC «Functions cannot be passed directly to Client Components» و 500 روی **همهٔ** صفحات ایستگاه. unit/integration تست‌ها این را نمی‌گیرند (فقط production build). **رفع:** تبدیل به `Record<blockId, href>`. این دقیقاً همان دلیلی است که مأموریت Browser E2E واقعی را الزامی کرده بود.

## 5. پاسخ به یافته‌های Subagent C (PASS-WITH-NOTES)
1. **minor — نویسندهٔ evidence مرده در محصول (`completePracticeSession`):** پذیرفته و **عمدی**: این تابع درز ثبت evidence برای اتصال آیندهٔ FSRS است و مصرف‌کنندهٔ تست integration دارد. در CURRENT_STATE به‌عنوان debt ثبت شد (نه باگ محصول؛ هیچ مسیر محصولی آن را صدا نمی‌زند — تأیید C).
2. **note — `p2-rec-n`/`p4-rec-n` و `p3-rec-he`/`he2`:** spiral review عمدی؛ در Coverage Matrix §«یادداشت کیفیت» ثبت شد. گیت ضد-duplicate (type+prompt+پاسخ درست) پاس است.
3. **note — formatter `kanaReadingLatin` بدون مصرف‌کننده + rule-listening فارسی-only:** الگوی «فارسی | latin» در reveal واقعاً رندر می‌شود (E2E A06)؛ برای rule-listening (واژه) فقط خوانش فارسی نمایش داده می‌شود چون واژه romaji رسمی در registry ندارد. ثبت شد.
4. **note — کار کامیت‌نشده:** رفع شد — این commit.

## 6. Review و FSRS — وضعیت صادقانه
- موتور FSRS واقعی نیست: `FsrsReviewPort` همچنان `throw` می‌کند (`modules/fsrs/integration.ts`) و هیچ Due Date یا Scheduling ساختگی اضافه نشد.
- ایستگاه‌های تمرین `fsrsItems: []` دارند و ادعای Mastery ندارند؛ Completion تمرین = `task_completed` فقط.
- هاب و API پیام صادقانه می‌دهند: «صف مرور با موتور زمان‌بندی فعال می‌شود (هنوز فعال نیست)».
- **محدودیت ثبت‌شده:** evidence آماده (`eligible_for_review` در `learning_object_states`) جمع می‌شود ولی هنوز consumer فعال ندارد؛ اتصال واقعی FSRS کار TASK آینده است. Practice هیچ‌چیز را به‌عنوان «مرور ثبت‌شده» جعل نمی‌کند.

## 7. امنیت (بدون Regression)
- userId فقط از کوکی امضاشدهٔ `hanaso_lid` سمت سرور (TASK24 دست‌نخورده).
- guest → 401 روی `/api/practice` GET و تمام اکشن‌های station.
- `complete` ایستگاه‌های تمرین: اعتبارسنجی prereq سمت سرور (409 ساختاریافته)، idempotent (`already:true`)، تک‌تراکنشی با advisory-lock.
- کلید پاسخ هرگز به client نمی‌رسد (`toClientExercise`/`stripBlock` — تأیید C §9)؛ rule-listening حتی `promptJa` را pre-answer حذف می‌کند.
- Isolation: تست integration + E2E واقعی (A=7 ایستگاه، B=11 — داده‌ها جدا).

## 8. نتایج تست (اجرای واقعی)
| گیت | نتیجه |
|---|---|
| Vitest | **812/812 سبز (۷۰ فایل)** — شامل CL-01..CL-17، EQA-1..7، PR-1..6، TL-14، glyph-budget، idempotency، isolation |
| Typecheck | ✓ |
| ESLint | ✓ (0 error) |
| Production Build | ✓ |
| Browser E2E | مسیر A ✓ مسیر B ✓ Responsive (390/768/1440، بدون overflow) ✓ — جزئیات: `TASK27_BROWSER_E2E.md` |

## 9. فایل‌های مأموریت
- `TASK27_ARCHITECTURE_AUDIT.md` — گزارش Subagent A (CP-1)
- `TASK27_PRACTICE_DESIGN.md` — گزارش Subagent B (CP-1)
- `TASK27_COVERAGE_MATRIX.md` — استخراج ماشینی از کد (۹۹ ردیف + گیت ۴۶ گلیف)
- `TASK27_BROWSER_E2E.md` — سناریوها/شواهد E2E
- `TASK27_SUBAGENT_C_QA.md` — گزارش QA مستقل (PASS-WITH-NOTES)
- `CURRENT_STATE.md` — وضعیت نهایی
- `e2e/` — ۱۸ اسکرین‌شات واقعی
