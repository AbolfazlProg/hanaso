# RUN-20261124-03 — AUTH-ACCOUNTS: سیستم حساب شخصی + چهار روش ورود (M1) — زنده روی hanaso.ir

**تاریخ:** 2026-11-24 · **Agent:** GLM (سشن وب) · **شاخه:** `feat/auth-accounts` + `fix/auth-wordlist-standalone-bundle`
**PR:** #183 (squash `277056c`) + hotfix #185 (squash `8f5da6a`) · **CI:** سبز روی شاخه و main (format/lint/typecheck/۱۲۸۴ تست واحد/integration-pg با PG18 واقعی/build/audit/smoke + compose-smoke + ایمیج GHCR tag=SHA)
**LIVE:** `https://hanaso.ir/api/health` → `"commit":"8f5da6a28b4dbebdf39f60c3bbb6c12313649210"` · DB ok · جدول‌های auth موجود · worker با cron جدید `ops.auth-sweep`

## مبنا (دستور مالک)

> «تکمیل سیستم حساب‌های شخصی و چهار روش ورود HANASO و آماده‌سازی صفحه ثبت‌نام و Login برای کاربران واقعی. ابتدا زیرساخت Auth فعلی، دیتابیس، Session و کدهایی که قبلاً ساخته شده‌اند را بررسی کن. از همان معماری استفاده کن و سیستم موازی نساز.»

معماری موجود (کوکی امضاشدهٔ `hanaso_lid` + schema اپ در Drizzle + قرارداد Envelope + کانال ترمینال VPS) پایهٔ کار شد — هیچ سیستم موازی ساخته نشد؛ همان seam هویت (`resolveLearnerId*`) گسترش یافت: اولویت جدید = session حساب > کوکی مهمان (preview مالک همچنان بالاتر).

## روش‌های ورود (وضعیت نهایی)

| روش                   | وضعیت                            | credential لازم برای فعال‌سازی نهایی                                                                 |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| عبارت بازیابی (BIP39) | **کاملاً عملیاتی** (زنده تست شد) | —                                                                                                    |
| ورود گوگل (OIDC/PKCE) | زیرساخت کامل؛ آمادهٔ اتصال       | GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (redirect URI: `https://hanaso.ir/api/auth/google/callback`) |
| ورود ایمیلی (OTP)     | زیرساخت کامل؛ آمادهٔ اتصال       | EMAIL_TRANSPORT=resend + RESEND_API_KEY + EMAIL_FROM — یا SMTP_*                                     |
| پیامک                 | فقط زیرساخت؛ UI «به‌زودی»        | پرووایدر پیامک (فعال‌سازی آینده)                                                                     |

## معماری — یک حساب، چند روش

- **Migration 0006** (جداول اپ): `users` · `auth_identities` (UNIQUE(provider, provider_account_id) — قانون ضد حساب تکراری) · `sessions` (فقط sha256 توکن؛ قابل ابطال) · `oauth_states` · `otp_codes` · `auth_rate_events` · `mnemonic_pending_registrations` · `learner_merges`.
- **عبارت بازیابی:** تولید BIP39 استاندارد (۲۰۴۸ واژهٔ vendored، checksum) → نمایش یک‌بار + آزمون ۳ موقعیت تصادفی → فعال‌سازی حساب فقط با قبولی آزمون → ذخیره فقط scrypt-verifier + lookup-key مشتق از HKDF کلید سرور (هیچ متن خامی در DB؛ sealed phrase فقط پنجرهٔ ۱۵ دقیقه‌ای wizard با AES-256-GCM) → ورود مجدد O(1) با lookup-key + اثبات scrypt.
- **گوگل:** Authorization Code + PKCE(S256) + state یک‌بارمصرف (۵ دقیقه) + nonce؛ id_token با JWKS زندهٔ گوگل (امضا/iss/aud/exp/iat/nonce)؛ کوکی oauth امضاشده حامل verifier خام و sha256 آن در ردیف DB (اثبات جفت کوکی↔ردیف قبل از هر تماس شبکه).
- **ایمیل:** OTP ۶ رقمی scrypt-hashed، TTL ۱۰ دقیقه، حداکثر ۵ تلاش، یک کد زندهٔ مقصد؛ ارسال real از resend (HTTPS) یا smtp (nodemailer) — بدون credential: **۵۰۳ صادقانه، بدون ردیف، بدون لاگین جعلی**.
- **پیامک:** مدل/سرویس/rate-bucket/نرمال‌سازی E.164 موجود؛ endpoint همیشه ۵۰۳ «به‌زودی».
- **اتصال به یک حساب:** ورود گوگل با ایمیلِ تأییدشدهٔ همسان با identity ایمیلیِ موجود → attach به همان حساب (dedupe)؛ لینک روش جدید نیازمند session (مالکیت اثبات‌شده)؛ حذف آخرین روش ممنوع.
- **مهاجرت مهمان:** ردیف‌های ۸ جدول progress هنگام ثبت‌نام/ورود اول یک‌بار (ledger `learner_merges`) به حساب منتقل می‌شوند — پیشرفت از دست نمی‌رود و به حساب غلط نمی‌رود.
- **امنیت:** rate limit دیتابی (قفل ۵ خطا/۱۵ دقیقه عبارت؛ ۴۰/ساعت IP؛ ۱/دقیقه+۵/ساعت OTP مقصد)، گیت same-origin روی POSTهای auth، خروج از همه دستگاه‌ها، پیام خطای یکدست فارسی بدون افشای این‌که کدام بررسی شکست.

## تست‌ها

- **۱۲۸۴ تست واحد سبز** (۶۲ تازه): بردارهای رسمی BIP39، ماتریس tamper/scrypt/seal، زنجیرهٔ تأیید id_token با RSA خودساخته، honest-transportها، کوکی oauth.
- **integration-pg/auth-accounts.spec.ts (PG18 واقعی در CI) سبز** — چهار نوبت CI که هر کدام یک ریشه‌یابی واقعی داد: (۱) گیت same-origin روی Request بدون Host (الگوی تست direct-call این ریپو)؛ (۲) lookup عبارت باید از lookup-key باشد نه providerAccountId (باگ login O(1) که تست زنده گرفت)؛ (۳) callback باید sha256(verifier) کوکی را با ردیف تطبیق دهد (تست tampered-cookie گرفت)؛ (۴) انتظارات کاربر۲ پس از dedupe گوگل.

## انتشار (روال استاندارد مالک V3)

۱. PR #183 → CI شاخه سبز → squash `277056c` → main CI سبز (ایمیج GHCR + compose-smoke) → دپلوی مرحله‌ای: پری‌فلایت (live=3030206) → بکاپ امن `db-pre-auth-accounts-20261123T212559Z.sql` → pull پین‌شده → sync سورس → migrate one-shot (**0006 واقعی اعمال شد — ۸ جدول auth**) → compose up web+worker → ready ok → جدول‌ها/کاربر=۰/محتوا سالم → LIVE `277056c`.
۲. **حادثهٔ زنده:** `/auth/signup` با ENOENT واکنش نشان داد — readFileSync(__dirname) در خروجی standalone نسسخه‌بندی نمی‌شود؛ hotfix #185: wordlist به ماژول JSON bundled (با تست JSON==TXT؛ فایل .txt مرجع ممیزی ماند) → CI سبز → squash `8f5da6a` → دپلوی (پاک‌سازی ایمج‌های منقضی برای فضای دیسک؛ بکاپ `db-pre-auth-hotfix`) → **LIVE `8f5da6a`**.

## راستی‌آزمایی production (مرورگر واقعی موبایل 390×844 + DB)

- **ثبت‌نام کامل زنده:** مرورگر تازه → ورود به درس اول (پیشرفت مهمان) → `/auth/signup` → wizard: intro → نمایش ۱۲ کلمه → تأیید ذخیره → آزمون (۳ موقعیت، ورودی متنی از datalist) → **حساب ساخته شد** (`01a20a71…`) + session.
- **مهاجرت DB-level:** `app.station_progress` ردیفِ مهمان `ba2e887e…` → **user_id حساب**؛ `app.learner_merges` = ۱ ردیف؛ `auth_identities` = mnemonic (scrypt$ + lookup-key + verified).
- **ورود مجدد با همان عبارت → همان حساب** (`01a20a71…` هر دو بار؛ users=۲ در مجموع از دو اجرای شاهد).
- **تنظیمات امنیتی:** روش‌ها (mnemonic فعال)، دستگاه‌ها («همین دستگاه»)، کارت‌های گوگل/ایمیل «فعال نشده»، خروج از همه دستگاه‌ها.
- **هاب ورود:** چیپ پیامک «به‌زودی» (disabled)؛ تب ایمیل → «فعال نشده»؛ تب گوگل → «هنوز فعال نشده».
- **Endpoint ها:** sms → ۵۰۳ `auth/sms_not_available` (متن به‌زودی)؛ google start → redirect صادقانه؛ **rate limiter زنده:** ششمین عبارت غلط → ۴۲۹ `auth/locked`.
- شواهد: `download/auth-accounts-evidence/` (۱۰ اسکرین‌شات + لاگ JSON واگذارشده) — نسخهٔ ماندگار VPS: `/root/auth-accounts-evidence/`.

## قیدها

- postgres/pgbouncer هرگز restart نشدند؛ بکاپ قبل از هر تعویض؛ rollback زنجیره‌ای آماده (ایمیج 3030206 نگه داشته شد).
- هیچ credential/عبارتی در git/لاگ ثبت نشد؛ عبارت حساب‌های شاهد از شواهد پاک شد (redact).
- یادگیری مهمان دست‌نخورده باقی می‌ماند (جریان فعلی)؛ حساب داوطلبانه است — پیشرفت مهمان با ثبت‌نام به حساب می‌چسبد.
