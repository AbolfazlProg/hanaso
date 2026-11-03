# پیاده‌سازی موتور یادگیری — TASK-LEARNING-01

> **تاریخ:** ۲۰۲۶-۱۱-۰۴ · **شاخه:** `feat/learning-01-island-chapter` · **وضعیت:** پیاده‌سازی کامل + تست
> **مرجع طراحی:** [CHAPTER_CONTENT_BLUEPRINT.md](./CHAPTER_CONTENT_BLUEPRINT.md) · [ISLAND_JOURNEY_UX_SPEC.md](./ISLAND_JOURNEY_UX_SPEC.md)

---

## ۱. تصمیم معماری کلیدی (چرا expand و نه rewrite)

زنجیرهٔ دادهٔ DATA-CONTRACT §۲ روی **اسکیمای موجود** سوار شد (SKL-006 expand-contract؛ صفر DROP):

```
Level (content.levels — جدید) → Chapter (content.units — جدید ≡ واحد) → Dialogue (موجود)
  → Lesson≡Station (content.lessons + ۶ ستون ایستگاهی) → Teaching Block (دادهٔ ماژول محتوا)
  → Question (ماژول محتوا + استخر ناهم‌پوشان) → Assessment (comprehension موجود + دروازهٔ جدید)
```

| تغییر | نوع | شاهد KB |
|---|---|---|
| `content.levels` (سیاست L1..L7 به‌صورت jsonb) | جدول جدید | LEVEL_MATRIX §۲ (DD-091) — «سقف/آستانه = داده نه کد» |
| `content.units` (فصل؛ 1:1 با دیالوگ) | جدول جدید | COMPOSITION §۲ (DD-090) — دابل-لنگر ممنوع |
| `content.lessons` + `core/lineRefs/objectiveCode/estLoad/completionCriteria/masteryCriteria` | expand | معماری ایستگاه §۳ (۱۵ مشخصه) + CONTENT-080 |
| `app.station_progress` | جدول جدید | معماری §۹ — وضعیت‌های گام |
| `app.chapter_progress` | جدول جدید | DD-048 — understood فقط از گیت |
| `app.lesson_progress` (PoC) | دست‌نخورده | جریان PoC پایدار ماند |

**قاعدهٔ طلایی اجرا شد:** «ترتیب ایستگاه‌ها هرگز Hardcode نمی‌شود» — `orderedStations()` (ماژول journey) فقط از `order` + `prerequisites` داده می‌خواند؛ UI هیچ ترتیبی ندارد. انواع هم‌نوع تکراری (VOCAB-1→VOCAB-2) بدون تغییر موتور ممکن است.

## ۲. ماژول‌ها

```
src/modules/curriculum/
  types.ts              مدل داده (فصل/ایستگاه/بلوک/تمرین/سیاست سطح) — client-safe
  content/
    levels.ts           سیاست ۷ سطح (داده) — seed به content.levels
    chapter-fm01.items.ts      ۸ واژه + ۲ خوشه + ۴ عبارت (اصیل HANASO)
    chapter-fm01.exercises.ts  ۳۳ تمرین (۲۳ practice + ۱۰ mastery ناهم‌پوشان)
    chapter-fm01.stations.ts    ۱۲ ایستگاه با بلوک‌های TB (داده)
    index.ts            رجیستری فصل‌ها
  journey.ts            حل‌کنندهٔ ترتیب توپولوژیک + دسترس‌پذیری (locked/available/…)
  validation.ts         گیت محتوا: قواعد S/O + سقف‌های L2 + کیفیت سؤال (تست‌پذیر)
  grading.ts            نمره‌گذاری سروری (نردبان F1..F3 + آستانه‌ها) + gradeMasterySubmission
  progress-machine.ts   ماشین‌های حالت ایستگاه/فصل (خالص)
  repository.ts         قراردادها + نسخه‌های درون‌حافظهٔ DEV
  server.ts             بارگذاری فصل+دیالوگ + اعتبارسنجی بار اول (fail-fast)
```

**امنیت نمره‌گذاری (SKL-013 §۳):** کلید پاسخ/بازخورد فقط سمت سرور؛ `toClientExercise()` قبل از ارسال حذفشان می‌کند (تست «never leaks the answer key»). نمره‌گذاری هر پاسخ در `/api/curriculum/station` (اکشن grade) انجام می‌شود؛ دروازه در `/api/curriculum/mastery`.

## ۳. رندرر بلوک‌ها (Lesson Engine)

هر بلوک داده‌محور از کاتالوگ TB یک رندرر اختصاصی دارد (`station-runner.tsx`):

| بلوک | رندرر | نکتهٔ آموزشی |
|---|---|---|
| TB-Scene | کارت زمینه | — |
| TB-DialoguePlayer | پلیر اثبات‌شدهٔ PoC (پارامتری) + پرسش پیش‌بینی | DR-01 (ترجمهٔ پیش‌فرض خاموش) |
| TB-VocabCard | کارت صدا-اول + خط منبع با هایلایت | صدا = خط منبع (پایپ‌خط per-line — ADR-009) |
| TB-ExpressionCard | رکورد چهارستونی + نکتهٔ تعارف | EV-278/279 |
| TB-GuidedDiscovery | خط هایلایت + کشف دوسطحی با کلید بازبینی‌شده | 13-06 §۲ |
| TB-RuleCard | الگو + جدول ساختار + پل فارسی + برچسب صداقت | — |
| TB-ExampleSet | پلکان fading با نقش‌ها | استاندارد مثال |
| TB-StructuredInput | انتخاب با بازخورد توضیحی | EV-241/242 |
| TB-Exercise | جلسهٔ تعاملی (۳ شکل: انتخاب/چینش/ساخت-از-چیپ) | نیمه‌آزاد L2 (بدون IME — M1) |
| TB-CharacterScene | مینی‌دیالوگ میکی با پاسخ کاربر (قالب+نام) | C5 |
| TB-ListeningTask | راهنمای سه‌شنونده + اقلام audio-only | station-design §۵ |
| TB-WrapUp | جمع‌بندی «امروز…» + اعلام کارت‌ها | C4 |

## ۴. جریان پیشرفت (سروری — ضدتقلب)

```
POST /api/curriculum/station {action: enter|grade|complete}
  enter   → in_progress
  grade   → نمره‌گذاری سروری + شمارندهٔ تلاش (F1→F2→F3؛ reveal فقط در F3)
  complete→ سرور معیار را بازبینی می‌کند (viewed/task/threshold)؛ زیر آستانه = 409
           همهٔ اصلی‌ها terminal → chapter: stations_complete
POST /api/curriculum/mastery {answers}
  گیت: مسیر اصلی ناقص = 409 (mastery/gate_locked)
  نمره‌گذاری کامل → computeMastery (وزن‌های M1..M5 = 0.3/0.2/0.2/0.2/0.1)
  → attempt در app.dialogue_mastery_attempts + فولد chapter_progress
  → passed ⇒ understood · remediate ⇒ نقشهٔ بازگشت نقطه‌ای (weakPointMap)
```

**تفکیک completed/understood:** ایستگاه‌ها `completed` می‌شوند (واقعِ پیمایش)؛ فصل فقط با گیتِ قبول‌شده `understood` (تست integration: «understood فقط از گیت»).

## ۵. اتصال‌های آینده (بدون بازنویسی)

| قابلیت | نقطهٔ اتصال آماده |
|---|---|
| موتور FSRS (M2) | `station.fsrsItems` (۲۳ کارت موج ۱) در داده؛ فقط صف مصرفش می‌کند |
| فصل بعد | فایل content جدید + seed — صفر تغییر موتور (قاعدهٔ «فصل جدید ≠ تغییر هسته») |
| Test-Out (v3.1) | ماشین حالت `skipped` از روز اول |
| احراز هویت (M1) | `POC_DEFAULT_USER_ID` یک نقطهٔ تعویض است |
| VOICEVOX واقعی (M3a) | همان manifest/URL قرارداد؛ فقط مولد عوض می‌شود |

## ۶. بدهی‌های شناخته‌شده (صادقانه)

1. **امتیاز جلسهٔ ایستگاه از کلاینت اعلام می‌شود** (سرور هر پاسخ را نمره می‌دهد اما جمع اول-تلاش را کلاینت می‌شمارد و در complete می‌فرستد؛ سرور clamp + آستانه بازبینی می‌کند). با auth M1، شمارش جلسه به سرور منتقل می‌شود.
2. **TB-FsrsEnroll نمایشی است** (موتور مرور = M2) — کارت‌ها در داده ثبت‌اند و در wrap-up اعلام می‌شوند.
3. **پلیر مکالمه در بلوک TB-DialoguePlayer درون ایستگاه‌ها** فقط یادآور است (پخش کامل در صفحهٔ مکالمه) — در v1 ایستگاه mastery کاربر را به `/dialogue` می‌فرستد.
4. **کانجی/گفتار (TASK-KB-07)** عمداً خارج از Scope (مرحلهٔ D/E نقشهٔ راه؛ «قابلیت ناقص وارد تولید نمی‌شود»).

## ۷. شواهد گیت‌ها (خروجی واقعی — SKL-010)

| گیت | نتیجه |
|---|---|
| `tsc --noEmit` | 0 خطا |
| `eslint . --max-warnings 0` | 0 خطا |
| `vitest run tests/unit` | **۱۴۰ passed / 0 failed** (۱۷ جدید curriculum) |
| `next build` | ✓ Compiled — همهٔ مسیرها ساخته شدند |
| smoke مسیرها (next start) | ۱۸/۱۸ = HTTP 200 (۷ صفحه + ایستگاه‌ها + APIها) |
| E2E دستی API | گیت قفل ✓ · نردبان F1→F3 ✓ · رد ۴۱� زیر آستانه ✓ · remediation ✓ · understood ✓ |
| VLM ممیزی بصری | نقشهٔ جزیره ۷٫۵→۸ · ایستگاه ۵٫۵→۷٫۵ (اصلاحات bidi/تعادل/فونت اعمال شد) |

---

*بعدی: [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md) — بازبینی سه‌مرحله‌ای*
