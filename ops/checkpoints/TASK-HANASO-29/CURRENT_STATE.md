# TASK-HANASO-29 — CURRENT STATE (CP-0: مبنای Release تأیید شد)

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

## باقی‌مانده (زنده)
- [ ] Subagent A/B/C + گزارش‌ها
- [ ] E2E تازه‌وارد (Ch1 کامل، Ch2 نمونه) + Progress قبلی + جداسازی دو کاربر
- [ ] Learn→Practice→Review + وضعیت FSRS صادقانه
- [ ] Content Lint کامل + Security/DB + Performance/Network
- [ ] رفع Critical/High + Regression + Build
- [ ] Installer کامل Sandbox + Idempotency + OWNER-COMMAND.txt + Push نهایی
