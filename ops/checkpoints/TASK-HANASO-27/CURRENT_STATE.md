# TASK-HANASO-27 — CURRENT STATE (CP-2: پیاده‌سازی کامل — 812/812 سبز)

**Branch:** `feat/TASK-HANASO-27-integrated-practice` (از TASK26R tip `31c33b0`)
**وضعیت:** پیاده‌سازی + تست کامل ✓ · Browser E2E و Subagent C هنوز اجرا نشده‌اند

## آنچه انجام شد (PHASE 2 + 3)
1. **۴ ایستگاه تمرین واقعی** (`stn-kana-p1..p4`) داخل Learning Journey با `type: 'practice'`:
   - p1 بعد h5 (あ/か/さ + کشش/داکوتن) · p2 بعد h9 (ん + な/た) · p3 بعد h12 (ま/ら/は + ば) · p4 بعد h15 قبل m1 (کل هیراگانا + همهٔ قواعد)
   - orderها بازشماری شدند (A: 1..21+35 · B: +4)؛ prereqها: h7←p1, h10←p2, h14←p3, m1←p4
   - ~۱۰۰ تمرین (kana-recognition/listening/recall/decode/rule-listening/meaning-select) با F1/F2/F3 + rationale + referenceBlockId
2. **F4 cross-station**: StationRunner حالا referenceBlockIdهای ایستگاه‌های قبلی را با prop جدید `returnToStationHref` (resolve در صفحهٔ station از bundle کامل) به لینک ایستگاهٔ مبدأ تبدیل می‌کند (گیت تست به‌روز شد: local یا earlier-station).
3. **حذف موتور موازی**: `/api/practice` فقط GET status (POST حذف شد) · `PracticeSessionRunner`/practice-hub حذف شد · `/practice` = هاب RSC با لینک deep به ایستگاه‌های p1..p4 (قفل/باز با stationAvailability واقعی) + تاریخچهٔ sessions و weak objects حفظ شد.
4. **ثبت مفاهیم**: teachesConcepts روی h5/h6/h9/h12/h13/h15 (kana-dakuten/yoon/sokuon/handakuten + hira-ba/bu/pa/da…) — گیت EQA-1.
5. **پالیسی**: L1 stationsCore hardMax 32→36 (registered exception با ارجاع به design doc) + estMinutes 441.
6. **تست‌های جدید**: `h27-practice-content.test.ts` (PR-1..PR-6: جایگاه‌ها، ضد-drop، ممنوعیت محتوای آموزش‌نداده + legality شامل derived forms، Coverage ≥۲ برای همهٔ ۴۶ گلیف، ضد-duplicate، کیفیت ladder) + بازنویسی `practice-completion-idempotency.spec.ts` (GET status، حذف POST، idempotency ترتیبی/همزمان p1، prereq gating، isolation).

## نتایج تأیید (اجرای واقعی 2026-11-14)
- **Vitest: 812/812 سبز (۷۰ فایل)** — شامل همهٔ CL-01..CL-17 و EQA-1..7 و F4 و TL-14 و glyph-budget
- Typecheck ✓ · ESLint ✓ · Production Build ✓
- هیچ Regression امنیتی: guest→401، userId فقط از کوکی امضاشده، ownership، idempotent complete (تست‌ها سبز)

## باقی‌مانده (PHASE 4/5 — برای پیام بعدی)
- [ ] Browser E2E: مسیر کاربر تازه تا p1 + کاربر با Progress قبلی + Responsive
- [ ] Subagent C — Independent QA (پس از پیاده‌سازی — طبق مأموریت الزامی)
- [ ] اسناد نهایی (گزارش پیاده‌سازی TASK27 + Coverage Matrix در repo)

## نکات مهم برای ادامه
- سرور dev/standalone محلی: `cd apps/web && corepack pnpm run build` سپس standalone + static/public (الگوی TASK26R /home/z/start26r.sh)
- Browser: `agent-browser` (همان الگوی TASK26R)
- هیچ Deploy/Restart روی VPS انجام نشده؛ FSRS دست‌نخورده (پورت throwing)؛ practice_sessions/learning_object_states حفظ شده‌اند.
