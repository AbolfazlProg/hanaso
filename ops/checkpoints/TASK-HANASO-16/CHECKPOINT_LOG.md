# CHECKPOINT_LOG — TASK-HANASO-16

## CP-01 — بازیابی وضعیت و ممیزی (۲۰۲۶-۱۱-۱۱)

- شاخه: `hanaso16-learning-journey` از `origin/tl14-foundations-redesign` @ `9a466644` (تازه‌ترین Remote — راستی‌آزمایی شد؛ `935010f8` هنوز نسخهٔ معتبر تغییرات معوق است).
- Git: fetch از origin؛ سه شاخهٔ جدید دیده شد (tl10/tl13/tl14)؛ اسنپ‌شات محلی قدیمی بود؛ Working tree قدیمی فقط mode-change (بدون محتوا) — هیچ تغییر ناشناخته‌ای حذف نشد. `git reset --hard`/`clean`/force-push استفاده نشد.
- Production راستی‌آزمایی زنده: هر دو دامنه Empty-reply از ۵ کشور + سندباکس؛ TLS معتبر؛ پورت ۸۰ refused؛ شواهد در `DEPLOYMENT_FAILURE_ANALYSIS.md` §۲.
- Push: بدون توکن — برنامهٔ تحویل Bundle.
- اسناد: `CURRENT_STATE.md` · `LEARNING_JOURNEY_AUDIT.md` (ممیزی معماری + تصمیم مدل B اصلاح‌شده) · `DEPLOYMENT_FAILURE_ANALYSIS.md` (علت واقعی Empty Reply).
- تست: — (فاز ممیزی؛ بدون تغییر کد محصول).
- قدم بعدی: CP-02 طراحی IA + Progress Mapping.

<!-- CP-02 -->

## CP-02 — طراحی IA + نگاشت Progress (۲۰۲۶-۱۱-۱۱)

- `CHAPTER_SECTION_INFORMATION_ARCHITECTURE.md` (انتخاب مدل B اصلاح‌شده + ساختار پنل + قواعد Reveal/Teaser/آرشیو + Responsive) و `PROGRESS_MAPPING.md` (نگاشت Attempted/Completed/Mastered + قواعد §۵ + بدون Migration). Commit `679b7fd`.

## CP-03 — پیاده‌سازی کامل مسیر یادگیری (۲۰۲۶-۱۱-۱۱)

- Resolverهای خالص: `reveal.ts` (فصل فعال از Progress + آرشیو + Teaser ≥۷۵٪) و `resolveSections` در journey.ts (بخش = units[] موجود، وضعیت Derived) + `resolveLearnerJourney` سروری + گیت اعتبارسنجی CHAPTER-CHAIN.
- UI: `SectionJourney` (پنل تک‌بخشی + دکمه‌های قبلی/بعدی با مقصد + دیپ‌لینک ?s=) و `JourneyHome` (هدر فصل + CTA اصلی + Teaser + آرشیو)؛ بازنویسی `/learn` و `/learn/[chapter]/journey`؛ حذف JourneyMap قدیمی؛ API journey + نمای sections.
- ۲۲ تست جدید resolverها؛ ۶۴۸/۶۴۸ سبز. Commit `1edd43f`.

## CP-04 — QA مرورگر + رفع باگ واقعی (۲۰۲۶-۱۱-۱۱)

- **باگ RSC learner-id کشف و رفع شد** (کوکی→poc-user در همهٔ صفحات SSR) + ۳ تست رگرسیون؛ پوشش قفل فصل در intro/assessment/complete؛ ۶۵۱/۶۵۱ + EQA ۳۷ + build تولیدی سبز؛ ۹/۹ سناریوی مرورگر + قبل/بعد (۵۳۴۸px→۱۷۳۰px). Commit `fe5908d`. جزئیات: `TEST_REPORT.md`.

## CP-05 — Installer v3.0 سه‌سطحی (۲۰۲۶-۱۱-۱۱)

- `update-hanaso.sh` v3.0: Baseline عمومی در Preflight (توقف قبل از تغییر روی INGRESS_PREEXISTING_BROKEN) + گیت C7 طبقه‌بندی‌شده (Hairpin/EXTERNAL_UNVERIFIED/رول‌بک فقط برای شکست واقعی) + Smoke مسیر-سالم + PUBLIC_CLASSIFICATION در رکورد.
- سندباکس: mock curl با Tierهای شبیه‌سازی‌شده + ۶ سناریوی جدید G1-G6 (از جمله بازتولید حادثهٔ TL-14) — **۱۴۰/۱۴۰ ادعا سبز**. `DEPLOYMENT_GATE_FIX.md` + CHANGELOG 2026.11.11.

## قدم بعدی

CP-06: کامیت پین انتشار (TARGET_SHA → کامیت محتوای نهایی) + OWNER-COMMAND v9 + راهنمای فارسی v9 + RELEASE_MANIFEST + Git Bundle تحویل (Push از سندباکس ممکن نیست — توکن با بازیافت سندباکس حذف شد؛ تحویل با الگوی Bundle جاافتادهٔ پروژه).
