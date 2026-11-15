# سیاست انقضای Resume — TASK-HANASO-17

> الزام §۸ مالک + DESIGN_DECISIONS R2–R7. واحد حقیقت: `apps/web/src/modules/curriculum/resume-policy.ts`.

## ۱) ثابت سیاست

| قلم          | مقدار                                                                 |
| ------------ | --------------------------------------------------------------------- |
| TTL پیش‌فرض  | `7 × 24h` دقیق (`RESUME_TTL_MS`)                                      |
| Override تست | env `HANASO_RESUME_TTL_MS` (فقط آزمایشگاهی؛ Production از پیش‌فرض)    |
| مرز انقضا    | `now − lastActivityAt ≥ TTL` → منقضی (مساوی = منقضی — تست مرزی)       |
| واحد زمان    | epoch ms (UTC) — Timezone فقط در «نمایش» فارسی است، مقایسهٔ ریاضی است |

## ۲) فعالیت معنادار (bump می‌کند)

| رویداد                                  | bump | دلیل                                    |
| --------------------------------------- | ---- | --------------------------------------- |
| `progress` (عبور از block)              | ✔    | §8.1 مالک: «عبور از اسلاید آموزشی»      |
| `grade` (پاسخ به تمرین)                 | ✔    | «پاسخ به سؤال»                          |
| `grade-block` (پاسخ تعاملی بلوک)        | ✔    | «انجام تمرین»                           |
| `complete`                              | ✔    | «تکمیل بخش واقعی»                       |
| `writing-practice`                      | ✔    | تمرین نوشتن واقعی                       |
| `enter` **اولین بار** (ردیف جدید)       | ✔    | شروع واقعی walk                         |
| `enter` تکراری (ردیف in_progress موجود) | ✘    | صرف ورود/Refresh نباید تمدید کند (§8.1) |

پیاده‌سازی: ستون جدید `app.station_progress.last_activity_at timestamptz NOT NULL DEFAULT now()` (Migration افزودنی). ردیوی Pg در هر upsert این ستون را می‌نویسد؛ API فقط برای bump-رویدادها مقدارش را تازه می‌کند.

## ۳) اعمال انقضا (سه لایه، همه idempotent)

1. **سرور — GET station**: `state.updatedAt` همراه `resumeExpired: boolean` (محاسبهٔ سروری با TTL) برگردانده می‌شود.
2. **سرور — enter با anchor منقضی**: anchor نادیده و `currentBlock` پاک می‌شود (`null`) — دستگاه دوم هم همان رفتار را می‌بیند.
3. **کلاینت — runner**: snapshot محلی (`updatedAt` خودش) با همان TTL چک می‌شود؛ منقضی → discard (walk از صفر). تعارض سرور/محلی → سرور برنده (منبع حقیقت).

`?restart=1` (لینک «شروع دوبارهٔ درس» از Home): snapshot محلی پاک + walk از صفر — بدون تغییر ردیف سرور (idempotent).

## ۴) چه چیزی Reset می‌شود و چه چیزی نه

| قلم                                                         | پس از انقضا                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `currentBlock` (anchor سروری)                               | پاک می‌شود                                                                           |
| snapshot محلی (walk position/blockResults)                  | نادیده/پاک می‌شود                                                                    |
| ردیف‌های `completed` / `needs_retry` / `skipped` ایستگاه‌ها | **دست‌نخورده**                                                                       |
| `chapter_progress` (وضعیت فصل/understood)                   | **دست‌نخورده**                                                                       |
| `bestScore` / `attemptCount` (تاریخچهٔ تلاش)                | **دست‌نخورده**                                                                       |
| وضعیت Mastery و مهر «理解»                                  | **دست‌نخورده**                                                                       |
| رویدادهای یادگیری (analytics)                               | **دست‌نخورده** (append-only)                                                         |
| وضعیت FSRS                                                  | موتور غایب (not-integrated) → هیچ چیزی برای Reset نیست؛ **ممنوع**: ساخت state ساختگی |

## ۵) سازگاری با FSRS و حافظه

- انقضای Resume **هیچ** دستوری به Scheduler نمی‌زند (قرارداد: `FsrsNotIntegratedError`).
- بعد از وقفه، «مرور کوتاه پیش‌نیازها» = همان جریان طبیعی از ابتدای درس (بلوک‌های آموزشی از صفر) — بدون Diagnostic جدید (Gap ثبت‌شده در RESEARCH_CONSUMPTION_MATRIX §۳).
- Reset کردن Scheduler یا پاک کردن Review History ممنوع و عملاً ناممکن (داده‌ای برای پاک‌کردن نیست).

## ۶) چند-دستگاه / چند-تب

- `last_activity_at` در DB مشترک است؛ هر دستگاه همان انقضا را می‌بیند.
- تب دوم همزمان: هر دو به همان anchor می‌رسند؛ bumpها commutative هستند (max نه — آخرین فعالیت کافی است چون همه ≥ TTL-chekcs از یک ستون می‌خوانند).
- Refresh ساده → `enter` تکراری → بدون bump → وضعیت منقضی پس از Refresh تغییر نمی‌کند (تست E).

## ۷) سناریوهای تست (§13-E مالک — با ساعت آزمایشی)

1. فعالیت <7d → `fresh`، CTA «ادامهٔ درس»، restore همان نقطه.
2. دقیقاً =7d → `expired` (مرز بسته).
3. > 7d → `expired`، CTA «شروع دوبارهٔ درس».
4. فعالیت معنادار تازه → TTL از نو (snapshot جدید updatedAt).
5. Refresh خالص (enter تکراری) → بدون تمدید.
6. restart پس از انقضا → walk از صفر + اطلاع خنثی.
7. پس از restart: completedها/فصل/مهر سرجایشان.
8. دستگاه دوم (بدون localStorage) → همان انقضای سروری.
9. Timezone: مقایسه epoch — مستقل از TZ دستگاه (تست با TZهای متفاوت).
10. در تست واقعی زمان سیستم Production تغییر نمی‌کند (فقط clock injection در unit).
