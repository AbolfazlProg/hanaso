# LEARNING_JOURNEY_AUDIT — TASK-HANASO-16 CP-01

> ۲۰۲۶-۱۱-۱۱ · ممیزی معماری یادگیری موجود (پیش از بازطراحی) · مبنای کد: `tl14-foundations-redesign` @ `9a466644`

## ۱) ساختار موجود — چارچوب داده

| مفهوم | Entity موجود | توضیح |
| --- | --- | --- |
| فصل | `Chapter` (`modules/curriculum/types.ts`) | slug، titleFa، canDoFa، sceneFa، `stations[]`، `units?`، `prerequisiteChapterSlug?` |
| بخش/جزیره | `ChapterUnit` (`units?` — DD-123/T-79) | **از قبل موجود**: slug + titleFa + summaryFa + stationSlugs — «گروه‌بندی صرف، هرگز گیت راه رفتن نیست» |
| ردیف/درس | `Station` (≡ Lesson) | واحد راه‌رفتن واقعی: order + prerequisites + blocks + completion criteria |
| محتوا | `TeachingBlock[]` داخل Station | دک‌های اسلایدی TL-14 (rule-prereq/contrast/step/…) + تمرین‌ها |

فصل‌های فعلی: `kana-foundation-01` (L1، ۳۱ ایستگاه، ۴ جزیره: H0..H6 / H7..H15 / K1..K12 / K13+گیت) و `first-meeting-01` (L2، ۲۲ ایستگاه، ۲ واحد داستانی؛ قفل با prerequisiteChapterSlug تا «understood» شدن فصل کانا).

## ۲) منطق Progress موجود (دست‌نخورده باقی می‌ماند)

- `resolveJourney` (`journey.ts` — PURE): مرتب‌سازی توپولوژیک ایستگاه‌ها از data، استخراج availability (`locked/available/in_progress/completed/needs_retry/skipped`) از StationState ذخیره‌شده. **ترتیب هرگز Hardcode نیست** (DATA-CONTRACT §۲).
- `unitGroups`: همان nodes گروه‌بندی‌شده پشت `units[]` + شمارش coreCompleted/coreTotal — فقط برای نمایش.
- `nextStation`: اولین ایستگاه coreِ available سپس in_progress — نقطهٔ «ادامه».
- قفل فصل: `chapterAccessStatus` (server) — در صفحات journey و station و API اعمال می‌شود (#94).
- Completion ≠ Mastery (DD-048): «completed» ایستگاه = واقعیت راه‌رفتن؛ «understood» فصل = قبولی گیت. ایستگاه‌های optional (core=false) هرگز مسیر اصلی را نمی‌بندند (island §۷-۱).
- FSRS، walk-persistence (شمات v1)، Station Completion + مهر AIZEN — قراردادهای حفظ‌اجباری (TL-14 §۱۵).

## ۳) مشکلات UX فعلی (شناسایی‌شده و قابل‌اندازه‌گیری)

1. **`/learn` فهرست کامل فصل‌ها را نشان می‌دهد** (هر دو فصل، با شمارهٔ ترتیبی ۱و۲) → کل دامنهٔ دوره از ابتدا آشکار است؛ نقض Progressive Reveal و «پنهان‌ماندن تعداد کل فصل‌ها».
2. **`/learn/[chapter]/journey` یک Trail عمودی بلند از همهٔ ایستگاه‌هاست**: هر ۴ جزیرهٔ فصل کانا با هر ۳۱ ایستگاه هم‌زمان در یک اسکرول رندر می‌شوند → «فهرست طولانی کارت‌های تکراری»؛ اسکرولِ دیدن محتوا با پیمایش بین بخش‌ها یکی شده است.
3. **کلیک‌های غیرضروری برای کاربر جدید** (مسیر فعلی): `/learn` (انتخاب فصل — وقتی فقط یک فصل باز است، انتخاب صوری است) → `/learn/[chapter]` (معرفی فصل) → CTA «شروع فصل» → `/dialogue` → بعد از آن ورود به مسیر → اولین ایستگاه. **۴ ناوبری تا رسیدن به محتوای واقعی درس اول.**
4. **بازیابی نقطهٔ ادامه**: کاربر بازگشتی باید فصلش را در فهرست پیدا کند، وارد مسیر کند و در Trail بلند اسکرول/دکمهٔ «بازگشت به نقطهٔ ادامه» را پیدا کند. nextStation در داده وجود دارد ولی CTA اصلی «ادامهٔ یادگیری» در ورودی وجود ندارد.
5. شماره‌گذاری فصل‌ها با اعداد نمایشی (`۱`، `۲`) و شمارنده‌های «ایستگاه» در کارت فصل → حس «دورهٔ X فصلی» می‌سازد.

## ۴) Mapping معماری جدید روی Entityهای موجود (بدون سطح جدید Data Model)

| مفهوم مأموریت | Entity موجود | تغییر لازم |
| --- | --- | --- |
| Chapter | `Chapter` | هیچ (فعالیت از Progress استخراج می‌شود) |
| Section | `ChapterUnit` (units[]) | هیچ تغییری در شکل داده — summaryFa نقش «هدف بخش» را دارد؛ وضعیت بخش **Derived** است (نه Stored) |
| Rows | ایستگاه‌های همان Section به ترتیب walk | ردیف = ایستگاه؛ وضعیت ردیف همان availability موجود |
| Lessons | `Station` + blocks | هیچ |

**نتیجهٔ کلیدی ممیزی: ساختار داده از Section پشتیبانی می‌کند؛ بازطراحی principally در لایهٔ Presentation + یک Resolver خالص جدید + سیاست Reveal است.** هیچ Migration دیتابیسی لازم نیست (units از content-as-code می‌آید؛ stores فقط StationState/ChapterState دارند که دست نمی‌خورند).

## ۵) تصمیم‌های طراحی (مبتنی بر §۳.۱ مأموریت — انتخاب مدل)

**مدل انتخابی: B اصلاح‌شده (Progressive Reveal + Teaser محدود)**

- فصل فعال: کامل در دسترس (پنل بخش + همهٔ Sectionهایش با دکمه قبلی/بعدی قابل پیمایش).
- فصل‌های «understood»: آرشیو کم‌حجم و بازشو در پایین صفحهٔ اصلی.
- فصل بعدی (فقط بلافاصله بعدی): **پنهان** تا وقتی پیشرفت core فصل فعال ≥ ۷۵٪ یا گیت باز شود → آن‌گاه فقط یک **کارت Teaser** (عنوان + یک خط موضوع) بدون شمارش فصل/بخش/ایستگاه.
- فصل‌های دورتر: هرگز فهرست نمی‌شوند؛ تعداد کل فصل‌ها هیچ‌جا نمایش داده نمی‌شود.
- قفل سطح Chapter با prerequisiteChapterSlug (موجود) + **گیت اعتبارسنجی محتوای جدید**: به‌جز فصل اول، هر فصل باید prerequisiteChapterSlug تعریف کند (مکانیکی در validateChapter) → صدقیت Reveal برای فصل‌های آینده تضمین می‌شود.

معیارها: وضوح مسیر (فصل فعال تک‌ستانه) ✓ · کنجکاوی (Teaser فقط نزدیک پایان) ✓ · پنهان‌ماندن مجموع (بدون شمارنده) ✓ · حس پیشرفت (وضعیت بخش‌ها + پیشرفت core) ✓ · ناوبری ساده (دو دکمهٔ قبلی/بعدی) ✓ · سردرگمی مبتدی (فقط یک پنل) ✓ · سازگاری با معماری (units موجود، resolver خالص) ✓

## ۶) مسیرهای هدف پس از بازطراحی

| مسیر | نقش | تغییر |
| --- | --- | --- |
| `/learn` | **خانهٔ Learning Journey**: فصل فعال به‌صورت خودکار + پنل Section فعال + CTA اصلی «شروع/ادامهٔ یادگیری» + آرشیو + Teaser (در صورت احراز) | بازنویسی صفحه |
| `/learn/[chapter]/journey` | همان پنل Section برای فصل مشخص (آرشیو/مرور) + `?s=<sectionSlug>` برای دیپ‌لینک بخش | جایگزینی Trail بلند با پنل Section |
| `/learn/[chapter]/journey/[station]` | موتور درس (StationRunner) | بدون تغییر رفتاری |
| `/learn/[chapter]` | معرفی فصل (can-do + صحنه) | می‌ماند؛ از هدر پنل لینک می‌شود؛ دیگر گام اجباری نیست |
| `/learn/[chapter]/dialogue` · `/assessment` · `/complete` | مراحل A و D و صفحهٔ اتمام | بدون تغییر |

قواعد وضعیت Section (Derived از availability ردیف‌ها):
`completed` = همهٔ coreهای بخش انجام‌شده · `in_progress` = برخی انجام‌شده یا شامل nextStation/in_progress/needs_retry · `locked` = همهٔ ردیف‌ها locked · `upcoming` = بخش بعدیِ فعلیِ کاربر که هنوز ردیفِ در دسترسی ندارد (نمایش با دکمهٔ «بخش بعدی» و ردیف‌های قفل).

## ۷) ریسک‌ها و قراردادهای حفظ‌اجباری

- Review نباید Progress دوباره ثبت کند → walk-persistence idempotent (تست بازبینی می‌شود).
- Refresh نباید State را عوض کند → وضعیت بخش/فصل فقط از سرور (RSC/force-dynamic) می‌آید.
- مهر AIZEN و Station Completion جدا از Completion بخش/فصل باقی می‌مانند (نشانگرهای مستقل هر سطح).
- همهٔ رشته‌های فارسی جدید در `messages/fa.ts` (نه literal در کامپوننت).
- EQA/گیت‌های محتوایی TL-14 باید بعد از تغییر content (فقط اگر لازم شد) سبز بمانند — برنامه: **محتوای آموزشی دست نمی‌خورد**؛ فقط لایهٔ ناوبری.
