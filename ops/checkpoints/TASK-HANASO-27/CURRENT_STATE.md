# TASK-HANASO-27 — CURRENT STATE (FINAL — مأموریت COMPLETE)

**Branch:** `feat/TASK-HANASO-27-integrated-practice` (از TASK26R tip `31c33b0`)
**وضعیت:** ✅ **COMPLETE** — هر ۱۵ معیار پایانی مأموریت تأیید شد (جدول پایین)
**Production/VPS:** دست‌نخورده (هیچ deploy/restart انجام نشد؛ KOTODAMA/PG/BBB/HAProxy/Nginx خارج از scope ماندند)

## معماری نهایی (یک پاراگراف)
Practice دیگر محصول/موتور مستقل نیست: چهار ایستگاه واقعی `stn-kana-p1..p4` داخل `section-a-hiragana` با همان StationRunner و همان `/api/curriculum/station` اجرا می‌شوند (grade/hint/complete با F-ladder مشترک)؛ Progress/Completion فقط از `app.station_progress` می‌گذرد؛ موتور موازی (PracticeSessionRunner + generate/answer/complete در /api/practice) حذف شد؛ `/practice` = هاب deep-link؛ evidenceهای `practice_sessions`/`learning_object_states` فقط-خواندنی حفظ شدند (درز آیندهٔ FSRS).

## معیارهای پایان TASK27
| # | معیار | وضعیت | شاهد |
|---|---|---|---|
| 1 | Practice مستقل با Learning Journey ادغام شد | ✅ | ۴ ایستگاه type:'practice' در stationSlugs؛ Subagent C §1 PASS |
| 2 | همان موتور Lesson/Station همهٔ Practice را اجرا می‌کند | ✅ | بدون special-case در runner/route (C §1) |
| 3 | سیستم Progress/Completion موازی وجود ندارد | ✅ | فقط GET status ماند؛ writer بی‌caller (C §2 + minor#1 ثبت‌شده) |
| 4 | همهٔ Kanaهای آموزش‌داده‌شده Coverage مناسب | ✅ | 46/46 گلیف ≥۲ تمرین — استخراج ماشینی در TASK27_COVERAGE_MATRIX.md |
| 5 | محتوای آموزش‌نداده‌شده وارد تمرین نشد | ✅ | PR-3 + spot-check مستقل C §4 |
| 6 | تمرین‌ها متنوع و آموزشی‌ارزشمند | ✅ | ۹۹ تمرین/۶ نوع؛ C §10 با ۳ نوت spiral ثبت‌شده |
| 7 | Hint و Feedback واقعاً راهنمایی می‌کنند | ✅ | F-ladder واحد + متن‌های فارسی ممیزی‌شده (C §5) + E2E A05-A07 |
| 8 | رفتار Audio/Reading/Listening/Auto-next درست | ✅ | قرارداد در کد (C §6) + درخواست‌های واقعی audio در network log E2E |
| 9 | راهنمای فارسی و انگلیسی ارائه شد | ✅ | «سا \| sa» در reveal (E2E A06)؛ نوت: rule-listening واژه‌ای فارسی-only |
| 10 | Review و FSRS جعل/دستکاری نشدند | ✅ | پورت همچنان throw؛ fsrsItems:[]؛ بدون due-write (C §8) |
| 11 | Regression امنیتی/داده‌ای رخ نداد | ✅ | guest 401، ownership، idempotency، isolation A=7/B=11 (C §9 + E2E) |
| 12 | Browser E2E و تست‌های کامل موفق | ✅ | مسیر A/B + Responsive در build production — TASK27_BROWSER_E2E.md + ۱۸ اسکرین‌شات؛ **۸۱۲/۸۱۲** vitest، tsc/eslint/build سبز |
| 13 | Subagent C تأیید مستقل | ✅ | **PASS-WITH-NOTES** (۰ blocker/major) — TASK27_SUBAGENT_C_QA.md؛ پاسخ Main به نوت‌ها در IMPLEMENTATION_REPORT §5 |
| 14 | همهٔ Checkpointها Push شدند | ✅ | CP-1 `62a5c06` · CP-2 `118c1d2` · FINAL (این commit) — همه روی GitHub |
| 15 | CURRENT_STATE وضعیت واقعی را نشان می‌دهد | ✅ | همین فایل |

## باگ واقعی که در این فاز پیدا و رفع شد
- **RSC function-prop:** `returnToStationHref` اول به‌صورت تابع به Client Component پاس می‌شد → 500 روی همهٔ صفحات ایستگاه در production build. رفع: `Record<blockId, href>` + resolver سمت client. (فقط با Browser E2E واقعی آشکار شد.)

## Regression نهایی (بعد از آخرین تغییر کد)
- Vitest: **812/812 سبز (۷۰ فایل)** — CL-01..CL-17، EQA-1..7، PR-1..6، TL-14، glyph-budget، idempotency، isolation، F4 gate
- `tsc --noEmit` ✓ · `eslint .` ✓ (۰ error) · `next build` ✓

## Debt ثبت‌شده (شفاف، برای مأموریت‌های آینده — نه بخشی از TASK27)
1. `completePracticeSession` (نویسندهٔ evidence) dev-only مانده؛ در اتصال آیندهٔ FSRS مصرف یا extract شود (minor C#1).
2. نوت‌های کیفیت spiral: `p2-rec-n`/`p4-rec-n`، `p3-rec-he/he2` (C#2).
3. `kanaReadingLatin` بی‌مصرف؛ rule-listening واژه‌ای لاتین ندارد (C#3).
4. **FSRS یکپارچه نشده** — عمداً: evidence آماده است ولی صف مرور واقعی کار TASK آینده است؛ هیچ جعل/تاریخ ساختگی وجود ندارد.

## اسناد مأموریت (همه در `ops/checkpoints/TASK-HANASO-27/`)
`TASK27_ARCHITECTURE_AUDIT.md` (Subagent A) · `TASK27_PRACTICE_DESIGN.md` (Subagent B) · `TASK27_IMPLEMENTATION_REPORT.md` · `TASK27_COVERAGE_MATRIX.md` (۹۹ ردیف، ماشینی) · `TASK27_BROWSER_E2E.md` · `TASK27_SUBAGENT_C_QA.md` · `e2e/*.png` (۱۸ شاهد) · `CURRENT_STATE.md` (همین فایل)
ابزارها: `scripts/t27-walk.sh` (walk معتبر E2E) · `scripts/t27-coverage.js` (مولد Coverage Matrix)
