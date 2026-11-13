# TASK-HANASO-22 — TEST RESULTS (executed, not copied)

> Run date: 2026-11-13 · Branch: `feat/TASK-HANASO-22-learning-experience`
> Environment: production standalone build (same layout as the Docker image:
> `.next/standalone` + static + public), in-memory stores (no DATABASE_URL),
> real Chromium via playwright-core 1.57.

## خلاصهٔ اجراها (همه واقعی)

| Suite | نتیجه | یادداشت |
| --- | --- | --- |
| TypeScript (`tsc --noEmit`) | ✅ clean | — |
| ESLint (`pnpm lint`) | ✅ 0 errors / 0 warnings | — |
| Stylelint (`pnpm lint:css`) | ✅ clean | — |
| Unit (`pnpm test`) | ✅ **737/737** · 63 files | شامل همهٔ گیت‌های TASK-20/21 |
| Integration in-memory (`tests/integration/`) | ✅ **32/32** | learner-isolation, walk-position, resume-expiry, mastery, learning-slice |
| EQA (`pnpm test:eqa`) | ✅ **37/37** | گیت‌های کیفیت آموزشی روی محتوای جدید (milestones + تقسیم بخش) پاس شدند |
| Browser E2E — H21 regression (`scripts/h21-e2e/run.mjs`) | ✅ **44/44** | قابلیت اطمینان Completion (مأموریت قبلی) — با قرارداد جدید de-scored |
| Browser E2E — H22 جدید (`scripts/h22-e2e/run.mjs`) | ✅ **25/25** | سناریوهای همین مأموریت (H1..H8) |
| Production build (`pnpm build`) | ✅ موفق | Turbopack؛ ۱۶ هشدار ترسِ پروندهٔ filesystem از ماژول audio-manifest — از TASK-21 موجود و بی‌اثر (همان ۱۶ هشدار) |

## E2E مأموریت (H22) — جزئیات

| سناریو | نتیجه |
| --- | --- |
| H1 Practice Hub برای کاربر جدید: حالت خالی صادق + خط موتور مرور صادق + ناوبری | PASS ×3 |
| H2 جلسهٔ تمرین متمرکز واقعی در مرورگر: آیتم ×21 پاسخ، بازخورد سرور، Recap بدون قبولی/مردودی، ثبت شواهد (10 کارت واجد مرور)، بدون تاریخ جعلی | PASS ×5 |
| H3 گیت تمرین ترکیبی: قفل صادق 409 پیش از ۳ درس، باز شدن پس از آن، ۲۰ آیتم، عدم نشت کلید پاسخ | PASS ×3 |
| H4 حذف نمرهٔ تنبیهی: تکمیل با نمرهٔ صفر موفق (task contract) | PASS |
| H5 دو Section (هیراگانا/کاتاکانا)؛ کلیک قفل → اعلان دلیل + نام پیش‌نیاز ×17 ردیف؛ کاشی هویت محتوا روی ردیف قفل («درس کانا») | PASS ×4 |
| H6 Milestone M1 پس از h15 در بخش الف ظاهر می‌شود؛ با مهر تکمیل می‌شود؛ چیپ دستاورد صادق | PASS ×3 |
| H7 مراسم مهر ارتقایافته: data-animate تازه، قاب ۱۷۶px + حلقهٔ چرخان جوهر، کلید قطع صدا، asset صدای محلی (HEAD 200)، بازدید مجدد = مهر ساکن بدون تکرار | PASS ×5 |
| H8 Practice Hub در 360px بدون اسکرول افقی + نوار تب موبایل | PASS |

شواهد: `ops/checkpoints/TASK-HANASO-22/screenshots/e2e/` (26 PNG + H22_E2E_RESULTS.json)
و `screenshots/e2e-h21/` (17 PNG از رگرسیون H21).

## E2E رگرسیون H21 — نکات تطبیق

- S5.1 بازنویسی شد به قرارداد جدید: پاسخ‌های غلطِ بلوک پایانی دیگر درس را نمی‌اندازد (گیت فصل داور است) — PASS.
- S5.7 فراخوانی idempotency با `taskCompleted: true` به‌روز شد — PASS (already:true).
- تمام سناریوهای مالک از TASK-21 (دابل‌کلیک، Refresh پیش/پس از تکمیل، قطع شبکه، retry، عزل کاربر) همچنان سبز.

## چیزهایی که عمداً تست نشد / محدودیت صادق

- ایستگاه‌های kana-card (نوشتن راهنما/آزاد روی بوم) در مرورگر به‌صورت کامل walk نشدند — همان‌طور که در TASK-21 هم نشده بود (نیازمند ورودی pointer واقعی روی بوم نوشتاری است؛ موتور نوشتن در unit تست‌های خودش پوشش داده شده و تجربهٔ نوشتن دست‌نخورده مانده).
- Integration-PG (PostgreSQL واقعی) در این Sandbox اجرا نشد — همان‌طور که در TASK-21 با PG 18.7 قابل‌اجراست؛ جداول جدید Practice additive هستند (migration 0004: دو CREATE TABLE + دو index، بدون تغییر جدول موجود). اجرای PG پیش از Release توصیه می‌شود (همان الگوی TASK-21).
- صدا در مرورگر headless پخش نمی‌شود (autoplay policy) — وجود asset و دکمهٔ قطع صدا و منطق mute پایدار (localStorage) تست شد؛ خود پخش در E2E headless قابل‌شنود نیست.
