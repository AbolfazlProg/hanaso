# TASK-HANASO-28 — Subagent B: Learning Journey UX Audit

**Auditor:** Subagent B (read-only) · **Branch:** `feat/TASK-HANASO-28-aizen-journey-ux` @ `daa7c43` · **Date:** 2026-11-15
**وضعیت:** گزارش ممیزی؛ پیاده‌سازی با Main Agent است.

## Part 1: CURRENT STATE (واقعیت‌ها با شمارش واقعی)

### ساختار Journey

- `/learn` و `/learn/[chapter]/journey` هر دو `JourneyHome` را رندر می‌کنند: header → chapter card + progressbar → یک CTA → `SectionJourney` → teaser → آرشیو `<details>`.
- **Sectionها یک‌به‌یک رندر می‌شوند** (نه stacked نه tabs): state `activeIndex` + دکمه‌های «بخش قبلی/بعدی» پایین پنل (section-journey.tsx:422–470). قانون مالک: بدون شمارندهٔ «بخش ۲ از ۴» (۱۸–۱۹).
- **شمارش واقعی فصل ۱:** Section A (هیراگانا) = **۲۲ اسلاگ** (h0–h15, p1–p4, m1-reading, opt-r-h9؛ chapter-kana01.ts:33–56) · Section B (کاتاکانا) = **۱۶ اسلاگ** (k1–k13, k12-foreign, m2-realworld, opt-drill؛ ۶۸–۸۵). جمعاً ۳۸ ایستگاه (۳۶ core). estMinutes=441 درست است.
- ردیف: marker چپ (Lock/Play/Compass/CircleCheck) + عنوان + objectiveFa + دقیقه (موبایل مخفی ۳۷۸) + تایل آیکون نوع راست. `p-4 sm:p-5` → ~76–88px/ردیف؛ Section A ≈ 1700–1900px ≈ ۳–۴ viewport موبایل.
- پارامتر `?s=` با history.replaceState؛ section فعال سمت سرور انتخاب می‌شود (journey.ts:287–293)؛ کاربر در بالای صفحه فرود می‌آید.

### Icons & Lock (قرارداد موجود — TASK22)

- راست = هویت محتوا (۱۳ نوع → lucide + label فارسی ۱۱۸–۱۴۸)؛ قفل‌شده آیکون نوع را dashed نگه می‌دارد (۱۶۰–۱۶۳). چپ = marker دسترسی؛ Lock فقط چپ.
- کلیک روی قفل: `<button>` واقعی + `locked-shake` روی `<li>` (۳۸۷) + `locked-flash` روی marker + notice `role="status"` که **نام اولین prereq ناقص را می‌گوید**: «این درس هنوز باز نشده — برای باز کردنش، ابتدا «{first}» را کامل کن.» (۲۳۶–۲۴۴؛ resolve از journey-home.tsx:97–112). پاک‌شدن خودکار ۳۶۰۰ms.

### Auto-scroll

- **وجود ندارد.** تنها scroll: `scrollIntoView` هنگام تعویض صریح section، با گارد firstRender که ورود هرگز اسکرول نکند (۲۹۶–۲۹۹). `scroll-mt` فقط در poc. بازگشت از ایستگاه = ناوبری کامل RSC به `?s=` → فرود در بالای صفحه؛ ردیف frontier تا ~1900px پایین‌تر است.
- **isFocus سمت سرور محاسبه و shipped می‌شود** (journey.ts:265 → journey-home.tsx:107) ولی **هیچ‌جا رندر نمی‌شود** — نه aria-current، نه highlight.

### Chapter Intro (متن واقعی)

- `canDoFa` (chapter-kana01.ts:93): «در پایان این فصل هر دو خط کانای ژاپنی را می‌خوانی و واژه‌های سادهٔ واقعی را رمزگشایی می‌کنی.» — صادقانه و خوب.
- `summaryFa` (۹۴–۹۵): می‌گوید «۳۴ ایستگاه» ولی شمارندهٔ مشتق همان صفحه ۳۶ می‌گوید (page.tsx:52–53) — **تناقض روی یک صفحه**.
- note انتهایی (page.tsx:101): «مسیر جزیره‌ای» — **ارجاع به سطح حذف‌شده**.
- h0 افتتاحیه صادقانه و خوب است.

### Lesson Completion (وضعیت فعلی)

- `lessonAchievementsOf` (station-runner.tsx:254–273) فقط KIND بلوک‌ها را می‌شمارد: «با N شکل جدید آشنا شدی» / «N دور تمرین…» / «نوشتن دستی را تمرین کردی» / milestone → «واژه‌های واقعی را با دانش خودت خواندی». هرگز ادعای mastery ندارد (کامنت ۲۵۰–۲۵۳).
- **p1 فقط یک چیپ عمومی می‌گیرد** در حالی که wrap-up مؤلف ۳ قابلیت مشخص می‌گوید (practice.ts:108–112). از teachesConcepts/نوع تمرین‌ها/example-set استفاده نمی‌شود. هیچ «حالا می‌توانی X» دنیای واقعی وجود ندارد.
- Milestoneها: m1-reading (پس از p4؛ ۶ واژهٔ واقعی هیراگانا؛ «هیچ چیز تازه‌ای آموزش داده نمی‌شود») و m2-realworld (پس از k13؛ ۶ وام‌واژهٔ کاتاکانا). نوع milestone → آیکون Award.

### Interaction States / A11y

- قفل‌شده: shake+flash+notice. باز: Link با hover/focus-visible (۳۹۵، ۴۰۲). تکمیل‌شده → `?mode=review`. دوبار-submit: `completingRef` + `disabled` + `navLatchRef` (۷۰۴–۷۱۳، ۹۴۶–۹۵۰، ۱۱۴۲) — خوب.
- **هیچ loading.tsx زیر /learn وجود ندارد.**
- `aria-current` فقط در site-nav. `.locked-shake/flash` بدون reduced-motion override (نقض کامنت خودش ۱۴۶–۱۸۲). smooth scroll بدون matchMedia guard.
- دقیقه در موبایل مخفی است.

## Part 2: مشکلات واقعی (رتبه‌بندی)

1. **بدون auto-scroll به درس جاری** در ورود (بزرگ‌ترین درد: بازگشت از ایستگاه).
2. **موقعیت فعلی ساکت است** — isFocus رندر نمی‌شود؛ «کجا هستم؟» بی‌پاسخ.
3. Section A طولانی: ۲۲ ردیف ≈ ۳–۴ viewport موبایل؛ plaque چسبان نیست.
4. **Achievements عمومی‌اند و پیشرفت واقعی را کم‌فروش می‌کنند** (p1).
5. متن intro کهنه/ناسازگار: «جزیره‌ای»، «۳۴».
6. گپ‌های reduced-motion (shake/flash/smooth-scroll).
7. بدون loading skeleton در ناوبری.
8. دقیقهٔ موبایل مخفی.

## Part 3: توصیه‌های امن (فقط لایهٔ نمایش — بدون لمس engine/practice/progress/prereq)

- **R1:** auto-scroll یک‌بار در mount به ردیف focus (`action==='start'|'continue'`) با `block:'center'` + گارد matchMedia reduced-motion + latch ref (الگوی kana-card.tsx:283–303) + `scroll-mt`؛ `data-testid="journey-current-row"`.
- **R2:** رندر focus: `aria-current="true"` + نوار indigo لبهٔ شروع + چیپ «ایستگاه فعلی» (messages/fa.ts) — از DTO موجود.
- **R3:** سگمنت‌کنترل دو-تایی بالای پنل (عناوین بدون شمارنده — رعایت قانون مالک)؛ حفظ prev/next و `?s=`؛ ردیف‌های آینده دیده می‌شوند (DD-114) — collapse نکن.
- **R4:** hygiene: reduced-motion برای shake/flash؛ گارد matchMedia برای smooth scroll.
- **R5:** متن‌ها: حذف «جزیره‌ای»؛ اصلاح/حذف «۳۴ ایستگاه»؛ یک خط دستاورد ملموس مبتنی بر m2 واقعی («منوی کافهٔ توکیویی با کاتاکانا») — صادقانه چون m2 همین را می‌سنجد.
- **R6:** Achievements غنی‌تر صادقانه از دادهٔ client: شمارش واژه‌های example-set خواندنی؛ انواع تمرین (recognition/recall/listening/decode) برای چیپ‌های مشخص p1؛ یا سطح کردن wrap-up مؤلف. حفظ نظم «آشنا شدی/تمرین کردی» — هرگز «مسلط شدی».
- **R7:** دیده‌شدن milestone روی نقشه (چیپ «ایستگاه واقعی»/حاشیهٔ shu). هر متن جدید باید گارد محتوای آموزش‌نداده را رعایت کند: در m1 فقط هیراگانا+قواعد (هرگز کاتاکانا/کانجی)؛ در m2 وام‌واژه‌های کاتاکانا مجاز.
- **R8:** loading.tsx برای journey + نمایش دقیقه به‌صورت چیپ فشرده در موبایل.

_(گزارش کامل با file:line در hand-back ثبت شد؛ مبنای CP-1.)_
