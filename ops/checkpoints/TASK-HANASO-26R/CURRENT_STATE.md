# TASK-HANASO-26R — CURRENT STATE (نهایی — 2026-11-14)

**وضعیت مأموریت: COMPLETE (آمادهٔ اجرای دستور مالک؛ VPS دست‌نخورده)**

- **Branch:** `fix/TASK-HANASO-26R-production-pedagogy`
- **Tip نهایی:** این commit (زنجیرهٔ `981394d` → `5791460` → `04e5313` → `00eb2bc` → `8c25c4cd` → … → tip)
- **Product target pin (v16):** `8c25c4cd1f33e1773873fd9c2536ef942e987c09` — باگ‌فیکس محصول در `04e5313` ختم شد؛ commits بعد از آن فقط اسناد/تست/رهایند‌اند و درخت محصول را تغییر ندادند (تست P1 در sandbox این را با بررسی stationSlugs/CL-16/CL-17 در خود D اثبات می‌کند).
- **Production (زنده، تا پیش از اجرای مالک):** `1.0.0-hanaso26-r01` / `6a5ce28` (v15) — هنوز ترتیب قدیم や/یُوئون را نشان می‌دهد چون `stationSlugs` واحد هیراگانا در TASK26 اصلاح نشده بود.

## ریشهٔ مشکل (خلاصهٔ نهایی)
لیست مرئی UI از آرایهٔ `stationSlugs` واحد Hiragana در `chapter-kana01.ts` ساخته می‌شود، نه از فیلد `order` ایستگاه‌ها. TASK26 فقط order/پیش‌نیازها را اصلاح کرد و آن آرایه کهنه ماند؛ هیچ تستی آن را با ترتیب واقعی مقایسه نمی‌کرد. TASK26R آرایه را بازسازی کرد (۱۸ slug؛ h14 や@13 → h6 یُوئون@14؛ `stn-kana-opt-r-h9` بازگردانده شد@18) و با CL-16 (UI order == API order + ضد-drop) و CL-17 (بدون توکن مهندسی/نویسهٔ عربی در متن ژاپنی) برای همیشه گیت کرد.

## وضعیت کیفیت (همه با اجرای واقعی)
- تست: **780/780 سبز** (68 فایل unit+integration؛ شامل CL-13/14/15/16/17، curriculum-reveal، learner-isolation)
- Typecheck ✓ · ESLint ✓ · Production Build ✓
- تأیید چشمی Build CP-03 با مرورگر واقعی ✓ (ترتیب، H9، داکوتن は، MicroAsk بو/پو/فو، صفر خطای JS؛ ۴ اسکرین‌شات در `screenshots/cp03-final-*`)
- سه Subagent دور ۳: A = ۶/۶ PASS، B = ۵/۵ PASS، C = یافته‌ها همگی در CP-03 اصلاح + گیت CL-17
- Installer Sandbox v16: **28/28 PASS ×۲ اجرا** (شامل idempotency و حفظ Progress)

## امنیت Progress و داده
- محتوای Curriculum فقط از Source خوانده می‌شود (`loadChapterBundle` ← `content/index.ts`)؛ **Migration لازم نیست.**
- Progress با کلید `uuidV5('lesson:' + slug)` ذخیره می‌شود (مستقل از ترتیب) — جابه‌جایی ایستگاه‌ها هیچ Progress کاربر را خراب نمی‌کند (تست T4 در sandbox).
- متغیرهای امنیتی TASK24 دست‌نخورده و idempotent (تست‌های T1/T2/T3).

## Release v16 (آماده)
- نسخه: `1.0.0-hanaso26r-v16`
- Tooling R = Product D = `8c25c4cd1f33e1773873fd9c2536ef942e987c09`
- Bootstrap SHA-256: `54a737e279b32aa14b30867e98ca910378139adf8bf4bd2afb5241d165a81e0c`
- دستور مالک: `OWNER-COMMAND.txt` (v16)
- VPS واقعی deploy/restart **نشده** — دستور آماده به مالک تحویل شده؛ سرویس‌های مشترک (KOTODAMA، PostgreSQL، BBB، HAProxy، Nginx) دست‌نخورده می‌مانند.

## اسناد
- `TASK26R_IMPLEMENTATION_REPORT.md` — گزارش کامل پیاده‌سازی
- `TASK26R_PRODUCTION_VERIFICATION.md` — گزارش A (دور ۳) + بررسی چشمی CP-03 + Sandbox 28/28
- `TASK26R_CURRICULUM_AUDIT.md` / `TASK26R_PERSIAN_PEDAGOGY_AUDIT.md` / `TASK26R_PRODUCTION_AUDIT.md` / `TASK26R_SUBAGENT_REVIEW.md` — ممیزی‌ها
- `CURRICULUM_MAP.md` — تولیدشده از Source واقعی با `apps/web/scripts/h26_curriculum_map.py` (۳۴ ایستگاه)

## مرحلهٔ بعد
اجرای دستور یک‌خطی v16 توسط مالک روی VPS → بررسی `/learn` (や قبل از یُوئون، H9 در انتها) → در صورت مشکل: `rollback`.
