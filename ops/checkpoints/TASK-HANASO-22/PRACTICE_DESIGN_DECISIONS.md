# TASK-HANASO-22 — PRACTICE DESIGN DECISIONS (Phase 2/3)

> CP-02 · Feed: docs/research/{PRACTICE_PEDAGOGY,LANGUAGE_SKILL_DIMENSIONS,PRACTICE_SCHEDULING,LISTENING_PEDAGOGY}_RESEARCH.md

## 1 — معمار‌ی کلی (extensible by design)

```
src/modules/practice/
  types.ts              # (موجود) تمرین‌های دیالوگی — دست‌نخورده
  generator.ts/checker.ts  # (موجود) دیالوگ — دست‌نخورده
  session.ts            # قرارداد عمومی نشست تمرین (skill-agnostic)
  kana/
    dimensions.ts       # K1..K8 + نگاشت داده
    generator.ts        # مولد آیتم از KANA_ITEMS + POLICY (پاک — سمت سرور کلید)
    policy.ts           # PRACTICE_POLICY (دادهٔ قابل‌تنظیم مالک)
    items.ts            # بانک آیتم از رجیستری (hostwords/audio refs)
  evidence.ts           # حالات Learning Object + استخراج نقاط ضعف
src/db/schema/app.ts    # app.practice_sessions + app.learning_object_states (additive)
src/db/repositories/practice.ts   # PG repos
src/modules/practice/repository.ts # in-memory twins + اینترفیس
src/app/api/practice/route.ts      # actions: generate | answer | complete | status
src/app/practice/page.tsx          # Practice Hub (RSC)
src/components/practice/practice-session.tsx  # client island
```

- **Answer key هرگز به کلاینت نمی‌رود** (همان اصل SKL-013 درس‌ها): `generate` آیتم‌های
  بدون کلید برمی‌گرداند؛ `answer` در سرور نمره می‌گذارد؛ `complete` نشست را ثبت می‌کند.
- مهارت‌های آینده (Vocab/Kanji/…) فقط `dimensions.ts` + `generator.ts` خود را اضافه
  می‌کنند؛ قرارداد نشست، persistence و UI مشترک است.

## 2 — انواع نشست

| نوع | باز شدن | ماده | اندازه (POLICY) |
| --- | --- | --- | --- |
| `focused` | پس از تکمیل هر ایستگاه کانا (به‌ازای ایستگاه) | گلیف/قاعدهٔ همان ایستگاه + جفت‌های مستند | 12–16 آیتم (~5–8′) |
| `mixed` | پس از ≥۳ ایستگاه تکمیل‌شده از فصل | همهٔ آموخته‌ها، وزن‌دهی به نقاط ضعف | 16–24 آیتم (~8–12′) |

- Practice **داوطلبانه** است: هیچ گیت/قبولی/مردودی ندارد؛ مسیر Learn→گیت بدون آن کامل می‌شود.
- Mixed هرگز مادهٔ آموزش‌نداده‌شده وارد نمی‌کند (generator فقط از گلیف‌های `introducedInUnit ≤ unlocked` می‌سازد — تست پایدار CI).

## 3 — ابعاد Kana (K1..K8) و آیتم‌ها

| بُعد | نوع آیتم | منبع داده |
| --- | --- | --- |
| K1 تمایز جفت | MCQ گلیف با گزینه‌های `confusableWith` | KANA_ITEMS |
| K2 شکل→صدا | MCQ خوانش (فارسی+لاتین) | KANA_ITEMS.romaji |
| K3 صدا→گلیف | پخش `public/audio/kana/kn-*` → انتخاب گلیف | ۱۸۵ فایل موجود |
| K4 رمزگشایی واژه | واژهٔ hostword → romaji | hostWord + ۳۰۷ فایل |
| K5 مورا | شمارش مورا / جفت حداقلی | قواعد H4/H7/H13 (data) |
| K6 نوشتن از حافظه | بوم writing engine | writing module |
| K7 ترتیب حرکت | ردیابی KanjiVG | writing module |
| K8 وام‌واژهٔ کاتاکانا | رمزگشایی وام‌واژهٔ آموزش‌داده | k12-foreign scope |

- سهم ابعاد در mixed: K2/K3/K4 هسته؛ K1/K5 بر اساس ضعف؛ K6/K7 فقط داوطلبانه (setting).
- بازخورد در Practice کوتاه‌تر از درس: تلاش ۱ غلط → گزارهٔ کوتاه (F1) + تلاش دوباره؛
  تلاش ۲ غلط → پاسخ + توضیح (F3). بدون حذف گزینه (EV-045: داربست برای آموخته‌ها حذف می‌شود).

## 4 — Persistence و حالات Learning Object

### جداول جدید (additive migration — هیچ جدول موجودی تغییر نمی‌کند)

`app.practice_sessions` (append-only):
```
id uuid7 PK · user_id text · skill text ('kana') · kind text ('focused'|'mixed')
scope_key text (station slug | 'chapter:kana-foundation-01')
item_results jsonb  [{objectId, dimension, correct, attempts, ms}]
started_at/completed_at timestamptz
```

`app.learning_object_states` (upsert per user×object):
```
user_id+object_id PK · object_id text ('kn-rec-hira-a' — همان شناسهٔ FSRS آینده)
skill text · state text ('introduced'|'practiced'|'eligible_for_review')
dimension_stats jsonb  { K1: {seen, correct_first_try}, … }
updated_at timestamptz
```

### قواعد حالات

- `introduced`: با تکمیل ایستگاهی که گلیف را معرفی کرد (از `introducedInUnit` + station map) —
  **idempotent**؛ از دادهٔ موجود station_progress مشتق می‌شود، ردیف فقط با تمرین ساخته می‌شود.
- `practiced`: ≥۱ آیتم موفقِ همان object در Practice (اولین تلاش درست یا درست پس از تلاش).
- `eligible_for_review`: introduced + practiced. **هیچ تاریخ مروری ساخته/نمایش داده نمی‌شود**
  (موتور M2 آینده این حالت را مصرف می‌کند — قرارداد FSRS_INTEGRATION دست‌نخورده).
- Practice هرگز FSRS mutation نمی‌کند؛ Replay درس هم نمی‌کند (فقط رویداد درس).

### مشتق‌سازی نقاط ضعف

`weakObjects(userId, limit)` — از dimension_stats: اشیایی که نرخ اولین‌تلاشِ درست < 0.6
و ≥۳ مواجهه؛ در mixed وزن انتخاب بالاتر و در Hub به‌عنوان «پیشنهاد تمرین» نمایش.

## 5 — API (`/api/practice`)

```
POST { action:'generate', skill:'kana', kind:'focused'|'mixed', scopeKey?, dimension? }
  → { sessionId, items: [{id, dimension, prompt…(بدون کلید)}], policy }
POST { action:'answer', sessionId, itemId, attemptNo, answer }
  → { correct, feedbackFa?, reveal? }        # کلید فقط در سرور
POST { action:'complete', sessionId, itemResults }
  → { recorded, evidence: {objectsPracticed, newlyEligible} }
GET  ?skill=kana → status { counts, weakObjects, eligibilityCounts }
```

- Zod validation؛ خطا با همان envelope اشتراکی ok/fail؛
- session در سرور (Map in-memory + PG) نگه داشته می‌شود تا complete؛ TTL ۲۴h.
- **بدون نشت کلید**: آیتم‌های generate هرگز correctId ندارند.

## 6 — UI

- `/practice` (Hub): دو کارت اصلی (Focused بر اساس ایستگاه تکمیل‌شدهٔ آخر + Mixed)،
  شمارندهٔ صادق (k کارت واجد مرور — خط صادق «موتور مرور هنوز فعال نیست»)، پیشنهاد نقاط ضعف.
  ساده و سبک — بدون نمودار (مأموریت §Home).
- `/practice/session` (یا همان صفحه با state): جزیرهٔ کلاینت با همان زبان طراحی درس
  (option row موجود، feedback panel درجا)، پیشرفت گام، خروج امن (ثبت جزئی)، پایان با
  خلاصهٔ صادق (اولین‌تلاش درست/کل) — **بدون نمرهٔ قبولی/مردودی**.
- ورودی Nav: «تمرین» (Practice) به SiteNav اضافه می‌شود (data-driven). Review فعلاً nav
  نمی‌شود (dead control — موتور فعال نیست؛ خط صادق Home می‌ماند).

## 7 — تغییرات Learn (تفکیک نمره از آموزش)

1. **حذف نمرهٔ تنبیهی:** همهٔ ایستگاه‌های walk فصل ۱ و ۲: `exercise_threshold 0.7`
   → `task_completed` (پاسخ‌دادن = انجام؛ نمره فقط ثبت می‌شود). 409 criterion از مسیر
   Learn حذف می‌شود؛ گیت فصل (assessment) و prerequisite‌ها دست‌نخورده.
   - route: اعتبارسنجی completion فقط برای ایستگاه‌های دارای threshold باقی می‌ماند
     (کد حذف نمی‌شود — برای گیت‌های آینده) اما دادهٔ walk stations دیگر threshold ندارد.
2. **رفع Spoiler بازخورد:** correctReading/correctAudio فقط در `outcome.correct` یا
   `level ≥ 3` (reveal) ضمیمه می‌شود — اولین اشتباه پاسخ را لو نمی‌دهد.
3. **بازخورد درجا و آرام:** پنل بازخورد با انیمیشن fade+slide ظریف در همان ناحیه ظاهر
   می‌شود (CSS token موجود)، بدون جهش Layout (min-height رزرو در قالب سؤال).

## 8 — تقسیم فصل ۱ به دو Section

| Section | ردیف‌ها | دقیق Core | نقطهٔ پایان |
| --- | --- | --- | --- |
| A «هیراگانا — خطِ بومی ژاپنی» | H0..H15 + M1 + opt-r-h9 | ۲۰۱ + ۱۰ (milestone) | «همهٔ واژه‌های هیراگانای جزوهٔ N5 را می‌خوانی» + Milestone خواندن |
| B «کاتاکانا — خطِ جهانی‌ها» | K1..K13 + k12-foreign + M2 + opt-drill | ۱۶۵ + ۱۰ | «منو/برند/نامت را می‌خوانی و می‌نویسی» + Milestone منو |

- `units[]` از ۴ جزیره به ۲ Section بازساخته می‌شود (ایسلند‌ها در عنوان/هدف ردیف‌ها زنده‌اند).
- جزیره‌ها slug جدید می‌گیرند (`section-a-hiragana`، `section-b-katakana`) — هیچ وابستگی
  کد/DB به slugهای قدیمی نیست (بررسی شد: فقط chapter-kana01.ts).
- estMinutes فصل: مجموع صادقانه ۳۸۶ + ۲۰ (milestoneها) = ۴۰۶؛ زمان Practice اختیاری
  است و در estMinutes ایستگاه‌ها دوباره‌شماری نمی‌شود (سیاست: estMinutes = زمان Learn).
- Milestoneها: نوع `practice` + `task_completed`؛ پیش‌نیاز: h15 / k13؛ محتوا فقط از
  hostwords آموزش‌داده‌شده (قانون Prerequisite مأموریت) — CI Gate همان قانون را روی
  تمرین‌های جدید اعمال می‌کند.

## 9 — Chapter Intro / Lesson Achievements / Seal

- هر Section هدف صادقانه + وعدهٔ مبتنی بر محتوای واقعی (جدول Outcome Mapping در
  `CURRICULUM_RESTRUCTURE.md`).
- پایان Lesson: ۲–۳ دستاورد صادق از دادهٔ ایستگاه (گلیف‌های معرفی/تمرین‌شده، تمرین انجام‌شده)
  با برچسب درست (آشنا شدی / تمرین کردی) — نه Mastery.
- Seal: مقیاس بزرگ‌تر (frame 40/44)، حلقهٔ چرخان جوهر، shimmer، صدای مجاز، فقط پس از
  تأیید سرور؛ idempotency موجود حفظ.

## 10 — ریسک‌ها و محافظت‌ها

- رگرسیون 409/کامل‌سازی TASK-21: تست‌های موجود completion باید سبز بمانند (تغییر داده
  completion معیار را عوض می‌کند — تست‌های criterion مخصوص حذف/بازنویسی صادقانه می‌شوند).
- EQA/CI gates: محتوای جدید milestone با همان قواعد glyph-budget/prereq می‌گذرد.
- User isolation: practice tables با همان الگوی userId + middleware learner cookie.
