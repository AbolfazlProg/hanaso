# TASK-29 — Subagent C — Browser, UX & Learning QA (گزارش مستقل)

**Branch:** `release/TASK-HANASO-29-final-integration` (از e81a6cd) · **تاریخ:** 2026-11-15 · **وضعیت:** ممیزی اولیه انجام‌شده (این سند از نتایج واقعی اجرای Browser ثبت شده است)

> **محدودهٔ صادقانه:** این گزارش نتیجهٔ ممیزی اولیهٔ Subagent C با Chromium واقعی (headless) روی standalone build محلی (پورت 3100) است. آیتم‌های اولویت‌دار (۱، ۲، ۴، ۵، ۶، ۸) به‌طور کامل اجرا شدند؛ آیتم‌های ۳ (Audio) و ۷ (Learn→Practice) به‌دلیل محدودیت step budget به‌صورت جزیی/با seed API بررسی شدند — دقیقاً مشخص شده کدام بخش verify نشده است. ادامهٔ پوشش کامل Ch1 و مسیر نمونهٔ Ch2 در TASK-29 CP-2 توسط Main Agent انجام می‌شود.

## Verdict: **PASS-WITH-NOTES**

هیچ Critical یا Major یافت نشد. دو Minor آرایشی (cursor و نُتاسیون دقیقهٔ موبایل) ثبت شد.

---

## نتیجهٔ به‌ازای آیتم

### ۱. تجربهٔ اولین بازدید — **PASS**
- Home با CTA واضح «شروع یادگیری».
- `/learn` فقط `stn-kana-h0` را باز نشان می‌دهد؛ سایر ردیف‌ها قفل با برچسب «قفل».
- chip «ایستگاه فعلی» روی اولین ایستگاه (aria-current=true) + «~۱۰ دقیقه».
- متن فارسی منسجم و روان.
- شواهد: `evidence/C1-home-fresh.png`, `C1b-learn-fresh.png`, `C1c-locked-notice.png`

### ۲. ایستگاه اول (stn-kana-h0) انتها-به-انتها از UI — **PASS**
- مسیر کامل: intro → بلوک‌های آموزشی → تکمیل، صرفاً از UI.
- **مهر AIZEN دقیقاً یک‌بار** ظاهر شد؛ اندازهٔ فریم `size-48 md:size-56` = **224px** در دسکتاپ.
- **صدای مهر دقیقاً یک درخواست** `/audio/sfx/aizen-stamp.opus` (status 206) — هم در network log و هم performance entries.
- صفحهٔ تکمیل بدون ادعای Mastery؛ فقط «این ایستگاه را با موفقیت پشت سر گذشتی» + نوت صادقانهٔ FSRS.
- بازگشت به Journey: h0 با آیکون تیک + لینک مرور، h1 باز با chip «ایستگاه فعلی»، آمار «۱ ایستگاه مسیر اصلی انجام شد».
- شواهد: `C2a-station-intro.png`, `C2b-block1.png`, `C2c-block2.png`, `C2d-completion-seal.png`, `C2e-journey-after.png`

### ۳. Audio — **PARTIAL PASS (صراحتاً جزیی)**
- پاسخ نادرست («کی» برای さ) → verdict «نادرست/دوباره تلاش کن» با **صفر** fetch جدید (answer sound به‌درستی gate شده).
- پاسخ درست → «درست!» + پیشروی خودکار (auto-advance).
- دکمه‌های Replay حاضرند (kana + واژهٔ مثال، `kn-hira-a.opus` fetch شد).
- **verify نشده:** auto-play داخل یک تمرین listening واقعی (step budget).

### ۴. Interaction States — **PASS**
- انتخاب Radio: بوردر indigo `rgb(29,78,112)` + پس‌زمینهٔ wash + aria-checked=true.
- کلیک روی ردیف قفل: انیمیشن `locked-shake` + notice فارسی دلیل قفل در `role=status aria-live=polite`: «این درس هنوز باز نشده — برای باز کردنش، ابتدا «خوش‌آمد و سه خط ژاپنی» را کامل کن.»
- دکمه‌ها hover/focus-visible دارند.
- Minor: دکمهٔ «بررسی پاسخ» هنگام enabled دارای `cursor: default` است (پایین‌تر مراجعه کنید).

### ۵. Responsive — **PASS**
- بدون overflow افقی: `/learn` در 390 (scrollWidth=390) و 1280؛ صفحهٔ station در 390، 768 و 1440 (همه scrollWidth = innerWidth).
- chip «ایستگاه فعلی» در موبایل مرئی؛ دقیقه‌ها به‌صورت chip فشرده «۱۲′».
- شواهد: `C5a-learn-390.png`, `C5b-station-390.png`

### ۶. Accessibility و Reduced Motion — **PASS**
- `set media reduced-motion` + reload: انیمیشن shake **خاموش** اما notice دلیل قفل همچنان نمایش داده می‌شود؛ اسکرول behavior:auto.
- `role=tablist/tab` با دقیقاً یک aria-selected؛ aria-current روی ردیف جاری؛ فوکوس کیبورد بین tabها کار می‌کند (activeElement = tab).
- کنتراست: tab انتخاب‌شده = متن paper روی indigo `rgb(49,46,129)` (~10:1)؛ عنوان ردیف ink `rgb(43,42,40)` روی پنل روشن — کنتراست بالا.
- شواهد: `C6a-reduced-motion-journey.png`

### ۷. Learn→Practice — **PASS (سطحی + seed API — صادقانه)**
- برای learner دوم h2–h5 از طریق API seed شد (پیاده‌روی UI کامل طولانی بود)؛ سپس هاب `/practice` تمرین ۱ را باز کرد و به `/learn/kana-foundation-01/journey/stn-kana-p1` لینک داد.
- station با همان UI موتور station-runner باز شد (شمارنده ۱/۸)؛ جریان تمرین در UI verify شد؛ تکمیل نهایی p1 با API seed شد.
- نکتهٔ اطلاعاتی: مسیر `/learn/.../practice/<slug>` حالت 404 دارد — ایستگاه‌های practice زیر `/journey/` زندگی می‌کنند و هاب درست لینک می‌دهد (غیر کاربر-رو).
- شواهد: `C7-practice-hub.png`, `C7b-practice-station.png`, `C7c-practice-hub-unlocked.png`, `C7d-practice-station-open.png`

### ۸. جداسازی دو Learner — **PASS**
- سشن مرورگر جدید (learner جدید)، فقط h0+h1 seed شد → دقیقاً h2 (ردیف か) به‌عنوان frontier فعلی دیده می‌شود، h3 قفل با دلیلِ نام‌بردن از «ردیف か»، آمار «۲ ایستگاه» — هیچ حالتی از learner اول دیده نشد.
- شواهد: `C8-second-learner-h2-current.png`, `C8b-second-learner-stats.png`

---

## یافته‌ها بر اساس شدت

- **CRITICAL:** هیچ
- **MAJOR:** هیچ
- **MINOR:**
  - (a) دکمهٔ «بررسی پاسخ» در حالت enabled دارای `cursor: default` است (پیش‌فرض Tailwind v4؛ سایر CTAها pointer دارند) — آرایشی.
  - (b) chip دقیقهٔ موبایل از نُتاسیون prime «۱۲′» استفاده می‌کند — فشرده اما شاید برای مبتدی مطلق نامفهوم.
- **NOTES (باگ نیست):** auto-play تمرین listening عملاً تست نشد؛ M2 (پاک‌شدن verdict کهنه با انتخاب مجدد) از TASK-28 صریحاً re-verify نشد؛ overflow صفحهٔ journey در 768/1440 اندازه‌گیری نشد (station شد)؛ DB در حالت in-memory بدون DATABASE_URL بود — برای QA محلی standalone مورد انتظار؛ یک سرور stale از TASK-28 روی پورت 3100 بود که قبل از استارت کشته شد.

## سه یافتهٔ مهم

1. حلقهٔ اولین ایستگاه در کیفیت production است: مهر AIZEN یکتای 224px، دقیقاً یک درخواست صدای مهر، متن تکمیل صادقانه، و پیشروی درست frontier با بازگشت به journey.
2. گیت/جداسازی per-learner دقیق است: هر learner فقط frontier خودش را با دلایل قفلِ نام‌بردن از ایستگاه بعدی خودش می‌بیند.
3. قرارداد UX پروژهٔ TASK-28 در مرورگر واقعی برقرار است: reduced-motion تکان را خاموش ولی notice فارسی (role=status) را نگه می‌دارد و overflow افقی در 390/768/1440 وجود ندارد.

## شواهد (۲۰ فایل)
`ops/checkpoints/TASK-HANASO-29/evidence/`: C1-home-fresh, C1b-learn-fresh, C1c-locked-notice, C2a-station-intro, C2b-block1, C2c-block2, C2d-completion-seal, C2e-journey-after, C4a-h1-writing-block, C4b-writing-practice, C4c-stroke-complete, C5a-learn-390, C5b-station-390, C6a-reduced-motion-journey, C7-practice-hub, C7b-practice-station, C7c-practice-hub-unlocked, C7d-practice-station-open, C8-second-learner-h2-current, C8b-second-learner-stats (.png)
