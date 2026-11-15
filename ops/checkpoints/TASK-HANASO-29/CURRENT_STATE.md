# TASK-HANASO-29 — CURRENT STATE (CP-1: ممیزی Subagentها ثبت شد)

**Branch:** `release/TASK-HANASO-29-final-integration` (از `e81a6cd`) · **Date:** 2026-11-15 · **Status:** در جریان

## ۱. وضعیت مبنای Repository (تأیید واقعی، نه گزارشی)
- `main` = `16db1dc` (پایهٔ مشترک) — انcestor تمام Branchهای Task است.
- `fix/TASK-HANASO-26R-production-pedagogy` tip = `31c33b0` ✓ (مطابق گزارش) — **ancestor کامل e81a6cd** ✓
- `feat/TASK-HANASO-27-integrated-practice` tip = `daa7c43` ✓ (مطابق گزارش) — **ancestor کامل e81a6cd** ✓
- `feat/TASK-HANASO-28-aizen-journey-ux` tip remote = `e81a6cd` ✓ (push نشست قبل تأیید شد؛ ref محلی stale بود که با fetch --force اصلاح شد)
- نتیجه: زنجیرهٔ خطی سالم main→26R→27→28؛ **هیچ merge/cherry-pick تکراری لازم نیست**؛ Branch نهایی از e81a6cd ساخته شد.
- تأیید سطح کد (نه فقط commit): `teachesConcepts` (26R/27)، `returnToStationHref` (27 fix)، `nextStationSlug` current-row (28 CP-3)، `HANASO_SESSION_SECRET`/`HANASO_LEGACY_TOKEN_CUTOFF` (24) همگی در درخت e81a6cd حاضرند.

## ۲. برنامه (۱۱ مرحله)
CP-1: Subagentهای A/B/C مستقل read-only → CP-2: E2E مرورگری کاربر تازه‌وارد (Ch1 کامل+Ch2 نمونه) + کاربر دارای Progress → CP-3: Learn/Practice/Review + Content Lint + Security/DB → CP-4: رفع Critical/High + Regression کامل (824+ baseline) + Build → CP-5: Release (Pin/SHA/Installer Sandbox کامل/Idempotency) → CP-6: OWNER-COMMAND.txt + اسناد + Push.

## ۳. وضعیت Baseline تست (از TASK28 CP-3)
- Unit/Integration: **824/824** · tsc ✓ · eslint ✓ · production build standalone ✓ (همه در e81a6cd).
- سرور standalone الگو: `node .next/standalone/apps/web/server.js` پورت 3100 + **کپی `.next/static` قبل از استارت** (وگرنه 404/hydration-dead).
- ابزار seed: `scripts/task28/seed-progress.sh`.

## ۴. CP-1 — گزارش‌های سه Subagent (ممیزی اولیه، همه read-only)
- **A (Integration): PASS-WITH-NOTES** — 8 جریان PASS، 0 Critical/High، 1 Medium (F1 لینک مردهٔ `/review` در شاخهٔ due خانه)، 5 Low (از جمله F2: grade بدون چک inStation؛ F4: completePracticeSession بدون فراخوان تولیدی).
- **B (Security): PASS-WITH-NOTES** — 0 Critical/High، 4 Medium (M1: score تکمیل client-attested؛ M2: fallback خاموش in-memory بدون DATABASE_URL در production؛ M4: pinهای پیش‌فرض bootstrap/update قدیمی) + 8 Low. سالم‌ها: کوکی امضاشده، بدون userId از client، ownership، عدم افشای answer-key، idempotency، migrationهای غیرمخرب.
- **C (Browser واقعی): PASS-WITH-NOTES** — آیتم‌های اولویت‌دار (1,2,4,5,6,8) PASS؛ 3 و 7 جزیی (صراحتاً ثبت شد). مهر AIZEN یکتای 224px + یک درخواست صدا؛ جداسازی learnerها؛ reduced-motion؛ بدون overflow در 390/768/1440. ۲۰ اسکرین‌شات.
- گزارش‌ها: `TASK29_SUBAGENT_A_INTEGRATION.md` / `TASK29_SUBAGENT_B_SECURITY.md` / `TASK29_SUBAGENT_C_BROWSER.md` + `evidence/` (۲۰ PNG).

## باقی‌مانده (زنده)
- [x] Subagent A/B/C + گزارش‌ها (CP-1)
- [ ] رفع F1 (لینک مردهٔ /review) + F2 (inStation guard در grade) + تست‌ها
- [ ] M1 (client-attested score) بررسی عمیق → اصلاح یا Deferred مستند؛ M2 (fail-safe بدون DATABASE_URL در production) + تست مثبت/منفی؛ تعیین تکلیف Low/Minorها
- [ ] E2E تازه‌وارد (Ch1 کامل، Ch2 نمونه) + Progress قبلی + جداسازی دو کاربر
- [ ] Learn→Practice→Review + وضعیت FSRS صادقانه (در گزارش A تأیید شد: NOT INTEGRATED)
- [ ] Content Lint کامل + Security/DB + Performance/Network
- [ ] رفع Critical/High + Regression + Build
- [ ] Installer کامل Sandbox + Idempotency + OWNER-COMMAND.txt + Push نهایی
