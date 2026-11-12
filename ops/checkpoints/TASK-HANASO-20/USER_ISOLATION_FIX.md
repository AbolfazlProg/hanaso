# TASK-HANASO-20 — USER ISOLATION FIX (جداسازی دادهٔ کاربران)

> Fixes audit BUG-001 (Critical) + the isolation half of BUG-002. Verified by `tests/unit/middleware-learner-cookie.test.ts`, `tests/integration/learner-isolation.spec.ts` (6 tests) and E2E S2 (5 browser checks).

## طراحی

سه لایه، هرکدام مستقل قابل‌اثبات:

### ۱) میدل‌ور — ساخت شناسه در همان اولین پاسخ (`src/middleware.ts`)

- درخواست بدون کوکیٔ معتبر `hanaso_lid` → UUID تازه ساخته می‌شود؛ **روی request** تنظیم می‌شود (همان رندر RSC آن را resolve می‌کند — سرور و کلاینت از اولین بایت هم‌شناسه‌اند) و **روی response** (`Set-Cookie`، ۳۶۵ روز، samesite=lax).
- مقدار معتبر → پاس‌Through بدون تغییر (پایداری شناسه — هر رندر id تازه نسازد).
- مقدار خراب/غیرUUID → دوباره ساخته می‌شود (هرگز به‌عنوان کلید پیشرفت اعتماد نمی‌شود).
- مرورگرهای بدون JS هم شناسهٔ واقعی می‌گیرند (زنجیرهٔ قدیمی آن‌ها را برای هم روی حساب مشترک نگه می‌داشت).
- `config.matcher` همهٔ مسیرها به‌جز static/asset (تأیید در بیلد: `ƒ Proxy (Middleware)`).

### ۲) بازنشانی fallback — GUEST فقط-خواندنی (`lib/learner/server.ts`)

- `resolveLearnerId()` / `resolveLearnerIdFromRequest()` بدون کوکی → `GUEST_LEARNER_ID = 'guest'` (نه UUID؛ `isLearnerId` ردش می‌کند؛ از طریق کوکی قابل‌تنظیم نیست؛ با `poc-user` یکی نیست).
- خواندن در scope گِست = حالت خالی صادقانه («شروع یادگیری»، ۰ ایستگاه) — هیچ‌گاه دادهٔ کاربر دیگر.
- **نوشتن در scope گِست ممنوع:** همهٔ اکشن‌های تغییردهندهٔ `POST /api/curriculum/station` با `401 learner/no_identity` + پیام فارسی رد می‌شوند — هرگز نوشتهٔ خاموش در حساب مشترک.
- با میدل‌ور، GUEST فقط برای مسیرهای دورزده از میدل‌ور و تست‌های مستقیم باقی می‌ماند (دفاع لایه‌ای).

### ۳) تست‌های جداسازی (در CI)

- مینی‌مم سناریوهای A–E در سطح API: بدون‌کوکی GET (حتی با ردیف‌های legacy در `poc-user`) → دادهٔ هیچ‌کس را نمی‌بیند؛ بدون‌کوکی POST → 401؛ دو QA مستقل؛ 409 ساختاریافته؛ مسیر بازیابی (پیمایش پیش‌نیازها به‌ترتیب → ثبت موفق)؛ سوییچ هویت.
- E2E مرورگری: دو context واقعی + جابه‌جایی کوکی هویت در یک مرورگر (Scenarios B/C/D).

## سناریوهای PHASE 1 — نتیجه

| سناریو | انتظار | نتیجهٔ E2E |
| --- | --- | --- |
| A — Anonymous | حالت خالی؛ بدون دادهٔ دیگری؛ CTA → اولین درس | ✓ S1.1/S1.1b/S1.2 |
| B — QA A | فقط پیشرفت خودش | ✓ S2.1 |
| C — QA B | کاملاً مستقل از A | ✓ S2.2/S2.3 |
| D — Logout/Login (سوییچ هویت) | دادهٔ قبلی باقی نماند | ✓ S2.4/S2.5 (تقریب no-auth؛ مستند در CHECKPOINT_LOG) |
| E — Refresh / Tab / Context تازه | همان state همان هویت | ✓ S1.5 + contextهای مستقل E2E |

## آنچه تغییر نکرد (عمداً)

- ردیف‌های legacy `poc-user` در دیتابیس دست‌نخورده ماندند (هیچ Reset/Delete دادهٔ واقعی انجام نشد).
- مسیر M1 (better-auth): ادغام مهمان→حساب، همان‌طور که در `identity.ts` مستند است.
