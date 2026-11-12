# TASK-HANASO-20 — CHECKPOINT LOG

> دائمی: ایجنت بعدی باید بتواند بدون تکرار و حدس از همین‌جا ادامه دهد. ۲۰۲۶-۱۱-۱۲/۱۳ · شاخهٔ `fix/TASK-HANASO-20-onboarding` (push شده).

## PHASE 0 — بازیابی و اعتبارسنجی شواهد ✅

- ممیزی TASK-HANASO-19 (۱۸ سند + ۱۴ اسکرین‌شات + prereq-violations) از شاخهٔ `audit/TASK-HANASO-19` خوانده و با کد فعلی تطبیق داده شد — نه بازتولید از صفر.
- **SHA نسخهٔ زنده:** کاربر `3f41f6ee10e28914934ddc83375a0e1d49405a3` را نوشت — یک رقم افتاده است؛ SHA واقعی: `3f41f6ee**5**10e28914934ddc83375a0e1d49405a3` (با `git rev-parse` تأیید). از این پس هر مقایسه با مقدار صحیح انجام شد.
- **توپولوژی Git:** `origin/main` (16db1dc) نیایِ خط انتشار است (با `merge-base` اثبات شد) — یعنی «۲۰+ کامییت عقب ماندن main» یعنی **main کهنه است**، نه اینکه کار QA در انتشار جا مانده باشد؛ هیچ کامیتی گم نشده. خط انتشار ۱۳۸ کامییت جلوتر است. هیچ merge/reset/rebase کورکورانه انجام نشد.
- فیکس «deferred restart» (BUG-011) از قبل روی خط مبنا (da3c007) بود — وارث شد.

## PHASE 1 — P0 جداسازی ✅ (کامییت d9a3ede)

Root cause: `resolveLearnerId` → fallback `poc-user` + بدون ساخت id سمت سرور + CTA آلوده. رفع: middleware + GUEST فقط-خواندنی + 401 برای نوشتهٔ بدون‌کوکی. تست: ۹+۶+۴. E2E S1/S2.

## PHASE 2 — P0 409 ✅ (همان کامییت)

Payload فارسی + `details.prerequisites` مرتب + پنل ساختاریافته با لینک اولین پیش‌نیاز. Retry بی‌هدف فقط برای این kind حذف.

## PHASE 3 — P1 آموزشی ✅ (کامییت‌های 4513c6f + f0d6d4d + 233258c)

- きょう→کیوو + تعمیم گیت TRANSCRIPT به برچسب گزینهٔ درست (گیت ۴ واژهٔ دیگر را هم گرفت: おおさか/えき/がくせい/がっこう).
- ۱۶+۵ مورد untaught: شبکهٔ معرفی k2..k12 + h5/h9/h10/h12/h15 + **ایستگاه جدید k12-foreign** (order 29؛ k13→30، optها→31/32؛ فصل ۳۲ ایستگاه/۳۴۸ دقیقه؛ island-3 + عضویت).
- گیت `DERIVED-GLYPH-SHOWN` (معرفی قبل از استفاده — به‌ترتیب deck) + ۶ fixture.
- خطاهای مسیر: PASSIVE-RUN با جابه‌جایی بلوک‌ها رفع؛ PREREQ-DATA با `introducesGlyphs: []`؛ example-set ایستگاه جدید حذف شد (بدون asset صوتی — صادقانه) و واژه‌ها در rule-stepها ماندند + لیست gen VOICEVOX گسترده شد.
- **رویداد ثبت شد:** ویرایشگر اسکریپت پایتونی اول محتوا را خراب کرد (split/capture) — با `git checkout HEAD --` بازگردانی و جراحی slice-based مجدد انجام شد. درس: replace مبتنیبر span با اثبات نوع‌چک بعد از هر پاس.

## PHASE 4 — سایر باگ‌ها ✅/مستند (BUG_REMEDIATION_LOG)

- BUG-007 ✅ (47dd482): ۲۳ تمرین + رندر rationale + تست‌ها.
- BUG-008 ✅ (23669b2): listenWords + chip؛ تست محتوا یک dead-binding واقعی (タクシー) گرفت → null صادقانه.
- BUG-009 🔄 معوق با تصمیم مستند (تغییر طرح ثبت‌شدهٔ ۲گزینه‌ای = پاسِ مستقل).
- BUG-010 ✅ (d64c810). BUG-011 نصفه (فیکس وارث؛ گیت hygiene معوق).
- ۴ انحراف Research: الف✅ ج✅ د✅؛ ب معوق با تأیید مالک.
- گمانه‌ها: هیچ‌کدام بدون بازتولید به باگ قطعی تبدیل نشد ✓.

## PHASE 5 — حفاظت قابلیت‌های سالم ✅

- responsive 31/31 + writing-surface@360 (328px) + صفر خطای JS — بدون بازطراحی.
- AIZEN/مهر placeholder در Roadmap جدا ماند؛ FSRS/Replay/Audio موجود دست نخورد.

## PHASE 6 — E2E ✅ (کامییت 2574788)

22/22 روی instance محلی QA (in-memory، پورت 3111) + شواهد PNG/JSON. نکات فنی برای ایجنت بعدی: seed کردن walk-snapshot با کلید `hanaso.walk.v1.<lid>.<chapter>.<station>`؛ ایندکس بلوک‌های h6 (rule-card=10)؛ سطح نوشتار SVG است نه `<canvas>`؛ بعد از پاسخ غلط دکمهٔ submit با «دوباره تلاش کن» بازمی‌گردد.

## PHASE 7 — انتشار (این کامییت)

- پین updater → 1.0.0-hanaso20-r01 @ 2574788c (branch fix/TASK-HANASO-20-onboarding).
- deploy05 fixture به هدف واقعی همگام شد؛ drill اجرا شد (نتیجه در RELEASE_VALIDATION).
- OWNER-COMMAND v11: R=SHA کامییت ابزار (الگوی self-pin با کامییت بعدی، طبق HANASO-18)، W=03ee6e74… (bootstrap دست‌نخورده)، D=2574788c.
- **Deploy واقعی: انجام نشد** — دستور مالک روی VPS (دسترسی/حقوق این Sandbox کافی نیست و قواعد حفاظت زیرساخت ممنوعش می‌کند). Bundle لازم نیست (repo public؛ شاخه پوش شد).

## PHASE 8 — همین فایل + ۱۳ سند دیگر + شواهد ✅

## توصیهٔ امنیتی

توکن GitHub در گفتگو متن‌آشکار بود — لطفاً بعد از تأیید این تحویل، آن Token را از GitHub باطل (revoke) و توکن تازه بسازید.
