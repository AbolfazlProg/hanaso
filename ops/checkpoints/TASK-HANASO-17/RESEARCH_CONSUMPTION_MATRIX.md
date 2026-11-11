# ماتریس مصرف تحقیقات — TASK-HANASO-17

> الزام §۱.۳ مأموریت: هر تصمیم طراحی به منبع واقعی متصل باشد. تفکیک سه‌گانه:
> **[R]** نتیجهٔ تحقیق قبلی · **[O]** خواستهٔ مالک (این مأموریت/سوابق) · **[D]** تصمیم طراحی جدید این مأموریت.
> هیچ تصمیم جدیدی به‌عنوان «نتیجهٔ تحقیق» جا زده نشده است.

## ۱) اسناد خوانده‌شده (کامل، نه عنوانی)

### پایگاه دانش `japanese-learning-kb`

1. `08-product-experience-architecture/dashboard-blueprint.md` — کامل
2. `08-product-experience-architecture/navigation-blueprint.md` (v2) — کامل
3. `product-design/navigation-blueprint.md` (لایهٔ معتبر v3 — DD-053) — کامل
4. `product-design/page-design-specifications.md` §۲ (PG-01 — لایهٔ معتبر داشبورد) — کامل
5. `08-product-experience-architecture/cognitive-load-guidelines.md` — کامل
6. `08-product-experience-architecture/behavioral-ux-guidelines.md` — کامل
7. `02-learning-experience/spaced-repetition-ux.md` — کامل
8. `02-learning-experience/learning-journey.md` — کامل
9. `modules/fsrs/integration.ts` + قرارداد FSRS در کد (وضعیت صادقانه `not-integrated`) — کامل

### ریپوی محصول `AbolfazlProg/hanaso` (شاخهٔ ffb747d)

10. `apps/web/src/app/page.tsx` (Home فعلی = لندینگ ایستا M0) — کامل
11. `apps/web/src/app/learn/**` + `components/curriculum/*` (journey-home, section-journey, station-runner, mastery-gate, complete) — کامل
12. `modules/curriculum/{journey,reveal,server,types,repository,walk-persistence}.ts` — کامل
13. `db/schema/app.ts` (station_progress شامل startedAt/completedAt/updatedAt) — کامل
14. `db/repositories/curriculum.ts` — کامل
15. `api/curriculum/station/route.ts` + `api/curriculum/journey/route.ts` — کامل
16. `lib/learner/{identity,server}.ts` — کامل
17. `messages/fa.ts` — کامل
18. `ops/checkpoints/TASK-HANASO-16/*` (RELEASE_MANIFEST، DEPLOYMENT_GATE_FIX، CURRENT_STATE) — کامل (سشن قبلی)
19. Health واقعی Production (بند §۱ CURRENT_STATE) — خوانده‌شده زنده

## ۲) جدول تصمیم ↔ منبع

| Research / Requirement                                                        | نتیجهٔ واقعی تحقیق                                                             | تصمیم طراحی                                                                                                                                                                                                  | محل پیاده‌سازی                               | تست تأیید                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------- |
| «داشبورد یک تصمیم است، نه ویترین» [R: dashboard-blueprint §۱]                 | تک‌مأموریت: پاسخ «امروز چه کار کنم؟» در <۵ ثانیه، بعد فرستادن به جلسه          | Home = سلام کوتاه + کارت «قدم بعدی» (CTA اصلی و تنها) + مرور + مسیر؛ بدون ویترین                                                                                                                             | `app/page.tsx` + `modules/home/home-view.ts` | `home-view.test.ts` (حالت‌ها + سقف عناصر) |
| اولویت CTA: قدم بعدی همیشه اول، مرور دوم [R: dashboard-blueprint §۳]          | الگوریتم اولویت واحد؛ مرور هرگز جای قدم بعدی را نمی‌گیرد                       | یک CTA اصلی (ادامه/شروع درس)؛ مرور کارت دوم؛ مسیر لینک کم‌وزن                                                                                                                                                | `home-view.ts` ordering                      | unit: ترتیب کارت‌ها                       |
| کارت مرور از Scheduler واقعی [O §3.2] + [R: SR-UX §۷]                         | FSRS موتور M2 است؛ قرارداد `not-integrated` صادقانه throw می‌کند               | هیچ عدد ساختگی نمایش نده؛ کارت مرور در حالت `not-integrated` مخفی (قانون داشبورد: «کارت بدون داده مخفی، نه خاکستری مرده») + یک خط صادقانه فقط در حالت آماده‌سازی اول (روز اول بدون مرور → «هیچ مروری نداری») | `home-view.ts` reviewCard state              | unit: never fake count                    |
| ≤۱۲ عنصر قابل‌کلیک داشبورد [R: PG-01 + cognitive-load §۲]                     | سقف‌های Hick و بودجهٔ ۶ بلوک                                                   | Home نهایی ≤۹ عنصر قابل‌کلیک در حالت عادی                                                                                                                                                                    | `page.tsx`                                   | unit: شمارش href/button در رندر           |
| بدون شمارش فصل‌های آینده / مخرج گمراه‌کننده [O §3.5] + [R: reveal HANASO-16]  | Progressive reveal؛ hiddenCount فقط عدد است و جایی نمایش داده نمی‌شود          | Home فقط «X ایستگاه این فصل انجام شد» + پیشرفت فصل جاری؛ هیچ «از Y» کل دوره                                                                                                                                  | `home-view.ts`                               | unit: no-total assertions                 |
| بازگشت پس از غیبت: پیام خنثی، بدون سرزنش [R: behavioral-ux §۴ + dashboard §۵] | «بریم سراغ ادامه»، بدون عدد منفی/قرمز                                          | CTA انقضای Resume = «شروع دوبارهٔ درس» با متن خنثی؛ بدون ذکر «۷ روز نبودی»                                                                                                                                   | `resume-policy.ts` + runner notice           | unit: boundary + browser E                |
| Resume زمان‌محدود = سیاست، نه عدد پراکنده [O §8.1]                            | — (خواستهٔ مالک تأییدشده)                                                      | `RESUME_TTL_MS` در `resume-policy.ts` واحد + env override برای تست؛ منبع زمان = `last_activity_at` سروری                                                                                                     | `resume-policy.ts`                           | unit: <7d/=7d/>7d + clock injection       |
| فعالیت معنادار ≠ صرف ورود [O §8.1]                                            | —                                                                              | bump فقط روی progress/grade/grade-block/complete/writing-practice؛ `enter` تکراری bump نمی‌کند (Refresh تمدید نمی‌کند)                                                                                       | `api/curriculum/station/route.ts`            | unit: enter-idempotent                    |
| Expiration نه فقط LocalStorage [O §10]                                        | —                                                                              | `last_activity_at` در DB (منبع حقیقت) + snapshot محلی هم freshness می‌گیرد؛ سرور برندهٔ تعارض                                                                                                                | `db/migrations` + repos                      | integration: دو دستگاه                    |
| چه چیزی با انقضا حذف نمی‌شود [O §8.4]                                         | —                                                                              | فقط anchor موقعیت (`currentBlock` + snapshot محلی) منقضی؛ completed/تاریخچه/Mastery/FSRS دست‌نخورده                                                                                                          | `resume-policy.ts` docs + code               | unit: expiry preserves rows               |
| درس تکمیل‌شده همیشه قابل مرور [O §6]                                          | —                                                                              | `?mode=review` → walk از صفر، بدون ثبت مجدد Completion (API از قبل idempotent است؛ در Replay اصلاً `complete` زده نمی‌شود)، بدون پاداش/FSRS مصنوعی                                                           | `station-runner.tsx`                         | unit + browser C                          |
| پایان درس: تک‌CTA با مقصد واقعی [O §7] + [R: TL-10 §6 الگوی موجود]            | الگوی «پیام غیرتعاملی + یک CTA» از TASK-LEARNING-10                            | CTA = «پایان درس و بازگشت به مسیر» → `/learn/[chapter]/journey?s=<section>`؛ درس بعدی فقط نمایش متن، هرگز auto-open                                                                                          | `station-runner.tsx` completionTarget        | unit + browser D                          |
| ناوبری از قصد، نه نوع محتوا؛ سقف ≤۵ [R: nav-blueprint v3 §۱-۲]                | ۵ مقصد نسخهٔ کامل شامل کتابخانه/پیشرفت/مرور — که در محصول امروز «موجود نیستند» | ناوبری فقط با مقصدهای واقعی: خانه + مسیر یادگیری (قانون «کنترل مرده نساز» — همان قاعدهٔ جست‌وجوی فاز ۱.۵). رشد آینده در سند ثبت شد                                                                           | `site-nav.tsx`                               | browser: nav در همهٔ صفحات سطح‌بالا       |
| ناوبری در جلسهٔ غوطه‌ور مخفی [R: nav-blueprint v3 §۲]                         | جلسات درس/آزمون هدر مینیمال دارند                                              | Nav فقط در صفحات سطح‌بالا (Home، /learn، صفحهٔ map فصل)؛ station/assessment بدون nav                                                                                                                         | صفحات                                        | browser: lesson بدون nav                  |
| موبایل: Bottom Nav + CTA ≥44px [R: dashboard §۴ + nav §۲]                     | تب‌بار پایین ۴تایی؛ FAB فقط وقتی مرور فعال است                                 | Bottom Nav دوتایی (خانه/مسیر) با آیکون+برچسب؛ بدون FAB (مرور فعال نیست)                                                                                                                                      | `bottom-nav` در layout صفحات سطح‌بالا        | browser 390px                             |
| مسیر جدید: Login→Home→Lesson با یک کلیک [O §5]                                | —                                                                              | CTA مستقیم به ایستگاه واقعی (بدون صفحهٔ واسطه)؛ مترها در NAVIGATION_FLOW.md قبل/بعد                                                                                                                          | home CTA                                     | browser A/B                               |
| معرفی فصل تکراری نشود [O §3.1]                                                | معرفی فصل = صفحهٔ `/learn/[chapter]` (scene) — فقط با انتخاب کاربر             | CTA هرگز به `/learn/[chapter]` نمی‌رود؛ فقط لینک کوچک «معرفی فصل» در کارت مسیر                                                                                                                               | `home-view.ts` href                          | unit: href درست                           |
| FSRS از Replay تغذیه نشود [O §6.3] + [R: FSRS contract]                       | enrollment فقط روی اولین complete؛ engine not-integrated                       | Replay هیچ رویداد enroll/complete جدید نمی‌سازد                                                                                                                                                              | runner + api                                 | unit: no-complete-in-replay               |
| مهر AIZEN فصل = «理解» [R: complete page موجود]                               | مهر فصل در `/complete` است و کار می‌کند                                        | دست‌نخورده (فقط دکمهٔ «بازگشت به مسیر» مسیرش به map با section می‌شود)                                                                                                                                       | complete page                                | regression موجود                          |

## ۳) شکاف‌های تحقیقاتی (Research Gaps) — صادقانه

| موضوع                                              | وضعیت                                                                                                             | چرا Gap                                                                                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **تعداد دقیق کارت مرور «امروز»**                   | Gap                                                                                                               | موتور FSRS (M2) ادغام نشده؛ هیچ Scheduler واقعی وجود ندارد. نمایش هر عددی = ساختگی. تصمیم [D]: کارت مرور تا فعال‌شدن موتور مخفی/حالت صادقانه است.                        |
| **نام کاربر در سلام**                              | Gap                                                                                                               | سیستم auth (M1) وجود ندارد؛ هیچ دادهٔ نام معتبری نیست. تصمیم [D]: سلام بدون نام («سلام!») — طبق PG-01 «نام در صورت وجود دادهٔ معتبر».                                    |
| **پیشنهادهای «متن هم‌سطح / دیالوگ» داشبورد**       | Gap                                                                                                               | کتابخانه/دیالوگ‌های مستقل هنوز محصول‌سازی نشده‌اند. تصمیم [D]: پیشنهاد جانبی = «درس بعدی» (موجود واقعی) و بس.                                                            |
| **هفتهٔ فعال / مترهای مهارت**                      | Gap نیمه                                                                                                          | دادهٔ رویداد در-memory است و متر مهارت per-skill نداریم. تصمیم [D]: نوار «هفتهٔ فعال» از دادهٔ واقعی رویداد قابل ساخت نیست → حذف از Home این فاز (سقف ≤۶ بلوک رعایت شد). |
| **آستانهٔ ۷ روز انقضای Resume**                    | از مالک [O] تأیید شده؛ سند KB مستقیم ندارد (نزدیک‌ترین: سطوح بازگشت ≥۷ روز → ReentryPanel در nav-blueprint v3 §۴) | عدد از مالک؛ معماری به‌صورت Policy واحد پیاده شد تا بعداً تنظیم شود.                                                                                                     |
| **ترتیب دقیق کارت‌های Home در RTL دسکتاپ دوستونه** | Blueprint دسکتاپ (۶۰/۴۰) موجود [R]؛ اما ستون‌بندی واقعی با محتوای موجود ساده‌تر شد                                | تصمیم [D]: تک‌ستون ماکزیمم `max-w-3xl` هم‌راستا با الگوی ادیتوریال AIZEN موجود در `/learn` (سازگاری با سیستم فعلی).                                                      |

## ۴) خواسته‌های مالک که الزام‌آور اجرا شدند (چک‌لیست §۱.۲)

- تک‌CTA اصلی در Home بر اساس وضعیت واقعی کاربر (جدول ۵ حالت §3.1) ✔
- مرور بدون عدد ساختگی ✔ · مسیر با لینک کم‌حجم ✔ · بدون فهرست فصل‌ها در Home ✔
- ناوبری کم‌تعداد + موبایل Bottom Nav + بدون Emoji ✔ (آیکون‌های lucide موجود)
- مسیرهای حداقلی §5 (مترها در NAVIGATION_FLOW.md) ✔
- درس تکمیل‌شده قابل مرور از ابتدا (Replay Mode) ✔
- پایان درس: تک‌CTA «پایان درس و بازگشت به مسیر» + بدون auto-open بعدی ✔
- انقضای Resume ۷روزه به‌صورت Policy + حفظ کامل تاریخچه ✔
- بدون Migration تخریبی (فقط ستون افزودنی `last_activity_at`) ✔
- AIZEN Design System (tokens موجود، band-indigo، بدون رنگ تصادفی) ✔
