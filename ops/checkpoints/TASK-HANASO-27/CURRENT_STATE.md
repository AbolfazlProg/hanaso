# TASK-HANASO-27 — CURRENT STATE

**Branch:** `feat/TASK-HANASO-27-integrated-practice` (از TASK26R tip `31c33b0` — push شده)
**Date:** 2026-11-14 · **Mission:** Integrated Practice Architecture

## وضعیت Production (مهم — اشتباه نگیر)
Production واقعی هنوز لزوماً v16 را دریافت نکرده است؛ نسخهٔ آمادهٔ TASK26R = `1.0.0-hanaso26r-v16` (pinهای OWNER-COMMAND.txt مربوط به TASK26R هستند). TASK27 صرفاً روی Branch مستقل توسعه می‌یابد و Production/VPS دست نمی‌خورد.

## چک‌پوینت‌ها
| CP | Commit | وضعیت |
| --- | --- | --- |
| CP-1 | (این commit) | Subagent A (معماری) + Subagent B (پداگوژی) تکمیل؛ گزارش‌ها در همین پوشه؛ بدون تغییر کد محصول |

## جمع‌بندی ممیزی معماری (Subagent A — کامل در `TASK27_ARCHITECTURE_AUDIT.md`)
- موتور Lesson/Station از قبل `type: 'practice'` را پشتیبانی می‌کند (STATION_TYPES) و StationRunner هر ۱۷ نوع بلوک ازجمله ۴ نوع تمرین Kana (kana-recognition/recall/decode/listening) را رندر و از طریق `/api/curriculum/station` grade می‌کند؛ کلید پاسخ هرگز به Client نمی‌رسد.
- سیستم موازی واقعی: `/practice` + `/api/practice` (generate/answer/complete) + `PracticeSessionRunner` داخل practice-hub — موتور دوم درجه‌بندی (2-attempt بدون دکمهٔ Hint)، مدل دوم Attempt و مدل دوم Completion.
- جدول‌های `practice_sessions` و `learning_object_states` append-only evidence و درز FSRS هستند — باید حفظ شوند، حذف نشوند.
- `/poc/practice` فقط POC است (در Production 404 می‌شود) — کابل‌کشی نمی‌شود.
- FSRS: پورت `FSRS_NOT_INTEGRATED` عمداً throw می‌کند — قرارداد صادقانه؛ جعل ممنوع.
- امنیت: userId از کوکی امضاشده سمت سرور؛ guest → 401؛ ownership-checked؛ idempotent.

## طراحی تأییدشده (Subagent B — کامل در `TASK27_PRACTICE_DESIGN.md`)
- ۴ ایستگاه تمرین: `stn-kana-p1` (بعد h5)، `p2` (بعد h9)، `p3` (بعد h12)، `p4` (بعد h15، قبل m1-reading) — الگو: Learn → Practice → … → m1.
- ~۷۹ آیتم تمرین با متن نهایی فارسی + پله‌های Hint سه‌مرحله‌ای + قرارداد Audio/Auto-next per-type + ماتریس Coverage کامل.
- Guardrails محتوایی per-station (ممنوعیت ぐ/ず/げ/づ/ぷ/べ/ぺ، ゜ قبل h15، ゃゅょ قبل h6، っ قبل h13، کاتاکانا، chōonpu).

## تصمیم‌های Main Agent (بر اساس A + B)
1. تمرین‌ها به‌صورت **Station محتوایی** با `type: 'practice'` داخل `chapter-kana01` ساخته می‌شوند — همان موتور، همان `/api/curriculum/station`، همان F-ladder.
2. هاب `/practice` از موتور Session موازی خلاص می‌شود: به‌جای تولید Session جدید، focus targets به ایستگاه‌های تمرین Journey لینک می‌شوند (`/learn/...journey/<station>`)؛ `PracticeSessionRunner` و مسیرهای generate/answer در `/api/practice` حذف/کوآرنتاین می‌شوند؛ GET status حفظ می‌شود.
3. `practice_sessions`/`learning_object_states` و foldها دست‌نخورده می‌مانند (data preservation)؛ Completion تمرین جدید فقط از مسیر station `complete` می‌گذرد.
4. FSRS دست نمی‌خورد؛ پورت throwing باقی می‌ماند؛ ایستگاه‌های تمرین `fsrsItems` ندارند (مطابق m1-reading).
5. هیچ جدول/موتور/بلوک جدیدی ساخته نمی‌شود.

## مراحل بعدی
- [ ] PHASE 2 (پیاده‌سازی): ۴ ایستگاه تمرین + بازسازی order/stationSlugs/prereq + بازطراحی hub
- [ ] PHASE 3 (تست): Unit/Integration + CL gates تمدیدشده + Coverage/Idempotency/Isolation
- [ ] PHASE 4: Browser E2E دو مسیر + Responsive
- [ ] PHASE 5: Subagent C (QA مستقل) → اسناد نهایی → Push
