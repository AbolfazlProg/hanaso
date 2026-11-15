# TASK-HANASO-28 — CURRENT STATE (FINAL — COMPLETE)

**Branch:** `feat/TASK-HANASO-28-aizen-journey-ux` · **وضعیت: ✅ COMPLETE** (همهٔ معیارهای پایان مأموریت برآورده شدند)

## زنجیرهٔ کامیت‌ها
CP-0 `9c1c666` (ممیزی A/B) · CP-1 `fb9b195` (پیاده‌سازی) · CP-2 `26d67f8` (E2E اولیه + شواهد) · CP-2b `f67f805` (CURRENT_STATE قبلی) · **CP-3 نهایی (این کامیت): Subagent C QA + ۲ fix + Reduced-Motion/Writing E2E + اسناد نهایی**

## آنچه در CP-3 (این نشست) انجام شد
1. **Subagent C — QA مستقل:** PASS-WITH-NOTES؛ 0 Blocker؛ **۲ Major واقعی** با شواهد کد، هر دو اصلاح شدند:
   - **M1:** ردیف جاری با heuristics `isFocus&&action` بود → ایستگاه اختیاری available هم «ایستگاه فعلی» می‌گرفت و auto-scroll mis-target می‌شد. Fix: تطبیق دقیق `nextStationSlug` سرور (prop + sync از refresh تب‌focus). فایل‌ها: `section-journey.tsx`، `journey-home.tsx`.
   - **M2:** بعد از نمرهٔ غلط، re-select گزینه → verdict قرمز کهنه روی انتخاب جدید + بن‌بست (دکمهٔ check مخفی). Fix: پاک feedback + bump attemptNo (هم‌ارز retry، سقف 3) + پاک hint. فایل: `exercise-session.tsx`.
2. **Regression:** **824/824 PASS** (۸۱۹ قبلی + ۵ تست جدید C1a–c/C2a–b در `h28-journey-ux.test.tsx`) · `tsc` ✓ · `eslint` ✓ · `next build` standalone ✓.
3. **Reduced Motion با مرورگر واقعی** (`set media reduced-motion`، matchMedia=true): auto-scroll با `behavior:'auto'` دقیقاً ۱ بار (spy)؛ shake=`animation:none` ولی notice دلیل قفل visible؛ feedback ورود `duration:0s` با محتوای کامل؛ همهٔ انیمیشن‌های seal/halo/ink-ring صفر؛ تب‌سوییچ بدون smooth؛ هیچ تعاملی خراب نشد. — `TASK28_FINAL_REPORT.md` §A + RM01/RM02.
4. **Writing h8 با تعامل واقعی:** ورود از مسیر محصول؛ رسم な با PointerEvent روی راهنمای نقطه‌چین — ۴/۴ ضربه پذیرفته («ضربهٔ درست») → ladder خودکار به free-mode («نوشتن از حافظه»)؛ موبایل 390 بدون overflow. هیچ رگرسیون از TASK28. — §B + W01/W02/W03.
5. **تأیید زندهٔ هر دو fix در build تولیدی** در همان نشست مرورگر (feedbackGone + استایل خنثی + بازگشت دکمهٔ check؛ تک‌ردیف بودن current).

## شواهد
`ops/checkpoints/TASK-HANASO-28/`: `TASK28_SUBAGENT_C_QA.md` (گزارش کامل QA + Minor notes) · `TASK28_FINAL_REPORT.md` (RM + Writing) · `e2e/`: RM01, RM02, W01, W02, W03 (+ ۷ شاهد CP-2 قبلی).

## وضعیت معیارهای پایان مأموریت
- [x] Subagent C گزارش مستقل **PASS-WITH-NOTES** بدون Blocker/Major باز
- [x] Reduced Motion در مرورگر واقعی بررسی شد
- [x] Writing UI ایستگاه h8 با تعامل واقعی آزمایش شد (رسم な کامل)
- [x] اسناد نهایی تکمیل و Push شدند
- [x] Regression پس از تغییر کد موفق (824/824)

## نکات برای ادامه (TASK29)
- سرور standalone الگوی راه‌اندازی: `node .next/standalone/apps/web/server.js` با `PORT=3100`، `HANASO_SESSION_SECRET` محلی؛ **فراموش نشود:** `.next/static` را داخل standalone کپی و سرور را **بعد از کپی** استارت کن (وگرنه assetها 404 می‌شوند و hydration می‌میرد — در این نشست حل شد).
- Seed progress الگو: `scripts/task28/seed-progress.sh` (POST complete با `taskCompleted:true`).
- Production/VPS دست‌نخورده (خارج از scope طبق مأموریت). KOTODAMA/PG/BBB/HAProxy/Nginx بدون تغییر.
