# گزارش TASK-SLICE-01 / Issue #40 — اولین Learning Vertical Slice (Dialogue → Learn → Practice → Mastery)

تاریخ: ۲۰۲۶-۱۱-۰۱ · برنچ: `feature/learning-slice` (worktree `hanaso-poc`) · پیش‌نیاز: TASK-DLG-POC-01

## ۱. خلاصهٔ اجرایی

چرخهٔ کامل یادگیری **A→B→C→D** روی ماژول‌های واقعی (نه mockup) پیاده و با تست‌های یکپارچه سبز شد: ورود از `/learn`، تماشای مکالمه با صدا و زیرنویس، درسِ از دل همان مکالمه، تمرین‌های ۴گانهٔ مکالمه‌محور، و ارزیابی ۵سنجه‌ای که فقط در صورت قبولی، وضعیت واحد را «فهمیدم/understood» ثبت می‌کند. اسکیمای Drizzle دو-شیمایی (`content`/`app`) + migration تولیدشده تحویل شد؛ **اتصال زندهٔ DB در این محیط ممکن نبود** (نیازمند `DATABASE_URL` — کار M0-10/M1)، پس app روی repositoryهای in-memory (با نشانگر `// DEV-ONLY` و پشت همان اینترفیس) اجرا و تست شد.

- تست کل: **۹۶ گذرا** در ۱۳ فایل (۵۰ تست جدید این Slice).
- `pnpm verify`: **ALL GATES GREEN** (خروجی واقعی: [`assets/verify-slice.txt`](assets/verify-slice.txt)).

## ۲. معماری تحویلشده

```
apps/web/
├── db/                          # لایهٔ دادهٔ تحویلشده (بدون DB زنده در این محیط)
│   ├── schema/content.ts        # ۱۲ جدول شیمای content (خط‌به‌خط §۲-۳ + DD-081)
│   ├── schema/app.ts            # ۲ جدول شیمای app (app.dialogue_mastery_attempts + app.lesson_progress)
│   ├── migrations/0000_*.sql    # migration تولیدشده با drizzle-kit generate
│   └── tests/schema.spec.ts     # ۱۸ تست — اعتبارسنجی جداول/ستون‌ها/یکتایی‌ها روی SQL (بدون DB)
├── src/modules/
│   ├── practice/                # مرحلهٔ C — موتور تمرین (types/generator/checker)
│   └── progress/                # ماشین حالت A→D (types/progress-machine/repository[DEV-ONLY]/server)
├── src/app/
│   ├── learn/                   # ورود تجربه: کارت واحد + استپر A→D + «ادامه از همان مرحله»
│   ├── poc/practice/            # صفحهٔ تمرین + runner تعاملی (یک‌سؤال‌درآنِ‌وقت)
│   ├── api/progress/            # GET ?dialogueId&userId / POST گذار ماشین حالت
│   └── …                        # اتصال dialogue (A→B)، lesson (B→C)، assessment (D→understood)
└── src/lib/poc/client.ts        # هلپرهای fetch سمت کلاینت (بدون نشت کد node به باندل)
```

قواعد حفظ شد: مرز دو-ورودیی ماژول‌ها (`index` کلاینت-امن / `server` نود-only)، زبان فارسی RTL + جزیرهٔ LTR برای متن JP، پالت قفل‌شدهٔ DD-067، و عدم وابستگی کد Production به placeholderها جز از طریق اینترفیس ADR-018.

## ۳. جریان A→D (نمودار متنی)

```
/learn ──(شروع/ادامه)──► POST /api/progress {unit_started} ──► stage: A_selfcheck
  │
  ▼  /poc/dialogue  (A: خودآزمایی با مکالمه)
  │    پخش صدا + زیرنویس JP/FA + لیپ‌سینک placeholder
  │    «پایان مشاهده» فقط وقتی خط آخر دیده شد ──► {dialogue_watched} ──► stage: B_lesson
  ▼  /poc/lesson    (B: درس از دل مکالمه — اتصال line-level طبق DD-046)
  │    کارت‌های واژه/دستور ↔ دوطرفه با خطوط مکالمه («در مکالمه ببین» ?line=…)
  │    «تمرین‌ها» ──► {lesson_studied} ──► stage: C_practice
  ▼  /poc/practice  (C: تمرین با خودِ مکالمه)
  │    generateExercises(dialogue) ──► ۴ نوع تمرین، یکی-درآنِ‌وقت
  │    checkAnswers ──► نتیجه + نقاط ضعف (lineId+objective+severity)
  │    «برای ارزیابی نهایی آماده‌ام» ──► {practice_done} ──► stage: D_mastery (status: active)
  ▼  /poc/assessment (D: آزمون فهم — هر ۵ سنجهٔ M1..M5)
  │    POST /api/attempts ──► نمره‌گذاری سمت سرور (وزن‌ها + کف سنجه‌ای)
  │    outcome=passed   ──► {mastery_passed, attemptId} ──► status: understood ✓
  │    outcome=remediate ──► «درها بسته» (progress/mastery_not_passed)
  │                         ──► بازگشت هدفمند به درس/تمرین طبق نقاط ضعف
  ▼
/learn: نشان «فهمیدی (understood)» — نه «completed» (DD-048)
```

هر گذار به‌صورت رویداد `object_verb` (ADR-016) در sink تحلیلی ثبت می‌شود: `unit_started`, `dialogue_watched`, `lesson_studied`, `practice_started`, `practice_submitted`, `mastery_passed`, `unit_understood`.

## ۴. وضعیت ACهای Issue #40 (تک‌تک)

| #    | معیار پذیرش                                                      | وضعیت      | شاهد                                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1 | چرخهٔ A→D قابل‌اجرا روی محیط توسعه                               | ✅ برآورده | جریان کامل در `tests/integration/learning-slice.spec.ts` (۳ تست) از سطح API واقعی اجرا و سبز است؛ صفحات `/learn`, `/poc/dialogue`, `/poc/lesson`, `/poc/practice`, `/poc/assessment` به هم دوخته شدند.                                                                               |
| AC-2 | اسکیمای DB (dialogue-content-schema §۲-۳) با Migration کنترل‌شده | ✅ برآورده | `db/schema/content.ts` (۱۲ جدول) + `db/schema/app.ts` (۲ جدول) + `db/migrations/0000_*.sql` تولید `drizzle-kit generate`؛ اعتبارسنجی با ۱۸ تست `db/tests/schema.spec.ts` روی خودِ SQL migration.                                                                                     |
| AC-3 | تست‌های یکپارچهٔ مسیر (Vitest) سبز                               | ✅ برآورده | `learning-slice.spec.ts` — کل مسیر A→D + رد پرش‌ها + remediate درها-نمی-بازد + scoping کاربر؛ کل مجموعه ۹۶/۹۶ سبز.                                                                                                                                                                   |
| AC-4 | ثبت وضعیت understood فقط از نتیجهٔ مرحلهٔ D                      | ✅ برآورده | ماشین حالت فقط با رویداد `mastery_passed` + `attemptId` وضعیت را understood می‌کند و **سرور** attempt را دوباره راستی‌آزمایی می‌کند: remediate → `progress/mastery_not_passed` (۴۰۰)، attempt ناموجود → `progress/attempt_not_found` (۴۰۴). تست‌شده در هر دو سطح unit و integration. |

**حداقل مسیر ۷گامهٔ Issue** (فراتر از ACهای چک‌لیستی):

| گام                                               | وضعیت                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ۱. ورود به تجربهٔ یادگیری                         | ✅ `/learn` — کارت واحد «کافه — صبح» با استپر زندهٔ A→D                                                                                                                             |
| ۲. دریافت مکالمهٔ نمونه (DD-065)                  | ✅ `cafe-morning-01` از content loader + `/api/dialogues/[slug]`                                                                                                                    |
| ۳. گوینده‌ها + پخش صداهای آماده + زیرنویس JP/FA   | ✅ موتور پخش + رندرر ADR-018 + toggle FA                                                                                                                                            |
| ۴. آموزش محتوای مرتبط (اتصال line-level — DD-046) | ✅ کارت‌های درس با `source_dialogue_line_id` و لینک دوسویه                                                                                                                          |
| ۵. چند تمرین از همان مکالمه                       | ✅ ≥۸ تمرین، ۴ نوع، همهٔ مواد از خود مکالمه (بدون دادهٔ بیرونی)                                                                                                                     |
| ۶. بازگشت به مکالمه + ارزیابی M1..M5              | ✅ ارزیابی ۵سؤالی (هر ۵ سنجه) + لینک نقاط ضعف به خط مکالمه                                                                                                                          |
| ۷. ثبت پیشرفت و نتیجه                             | ✅/⚠️ روی repositoryهای in-memory (اینترفیس آمادهٔ Postgres)؛ جدول‌های `dialogue_mastery_attempts` و `lesson_progress` در migration تحویل شدند ولی **نوشتن روی DB زنده = M0-10/M1** |

## ۵. جداول Drizzle تحویلشده

### شیمای `content` (مالک: پایپ‌لاین محتوا — ۱۲ جدول)

| جدول                  | نقش                                          | نکات کلیدی                                                                              |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `dialogues`           | سرِ مکالمه                                   | `slug` یکتا؛ `unit_order`, `turn_gap_default_ms`, `series_id`                           |
| `dialogue_lines`      | خطوط                                         | یکتایی `(dialogue_id, order)`؛ `gap_after_ms`, `emotion_tag`, `decision_point`          |
| `dialogue_scenes`     | قاب‌بندی سینمایی                             | `frame_key`/`camera_note`                                                               |
| `characters`          | شخصیت‌ها                                     | `voice_profile`, `voice_family`, `color_token` (DD-081/DD-067)                          |
| `lessons`             | درس لنگرشده به مکالمه (G1)                   | `dialogue_id`, `unit_stage`                                                             |
| `lesson_sections`     | بخش‌ها (G2)                                  | `section_kind`, `objective_id`, `mastery_threshold`                                     |
| `learning_objectives` | اهداف یادگیری                                | `code`/`kind`/`title_fa` (DR-04h)                                                       |
| `comprehension_banks` | بانک مرحلهٔ D — **جدا از تمرین‌ها** (AC-952) | `measure`, `line_ref`, `knowledge_type`, `payload`, `status`                            |
| `lesson_items`        | آیتم‌های درس (G4)                            | `source_dialogue_line_id`, `objective_id`                                               |
| `vocab_items`         | واژگان                                       | یکتایی `(term, reading_kana)`, `pitch_mora`, `first_seen_line_id`                       |
| `grammar_points`      | نقاط دستوری                                  | `register_tags`, `similar_to`, `first_seen_line_id`                                     |
| `audio_assets`        | صداهای DD-081                                | یکتایی `(line, speaker, format, version)` و `hash`؛ `duration_ms`, `lufs`, `created_at` |

### شیمای `app` (دادهٔ کاربر — ۲ جدول)

| جدول                        | نقش                                                                | نکات کلیدی                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `dialogue_mastery_attempts` | تلاش‌های ارزیابی                                                   | `scores`/`weak_points` jsonb، `outcome`, `revision_id`، یکتایی `(user, dialogue, attempt_no)`؛ FK بین-شیمایی به `content.dialogues` |
| `lesson_progress`           | رکورد واحد (جدول `unit_progress` جدا **عمداً وجود ندارد** — KB §۳) | PK مرکب `(user_id, lesson_id)`؛ `unit_stage` پیش‌فرض `A_selfcheck`، `status` پیش‌فرض `active`، `mastery_attempt_id`                 |

قراردادهای مشترک رعایت شد: PKهای `uuidv7()` و `timestamptz` (تست‌شده در `schema.spec.ts`).

## ۶. Seed — جدایی از محیط Production

محتوای فعلی (YAML دیالوگ کافه + صداهای placeholder) **محتوای dev/test است**، نه production: از `resolveContentPath` در `modules/dialogue/content/loader` بارگیری می‌شود و صداها با `pnpm gen:audio` (placeholder محلی) ساخته می‌شوند. مسیر production (پایپ‌لاین محتوای M3b+) همین ساختار را در جداول `content.*` می‌نویسد و بانک ارزیابی از `comprehension_banks` با `status` چرخهٔ انتشار می‌آید — دادهٔ آزمایشی هرگز با محتوای بازبینی‌شدهٔ production قاطی نمی‌شود. repositoryهای in-memory هم صریحاً `// DEV-ONLY` علامت خورده‌اند و پشت اینترفیس‌اند؛ جابه‌جایی به Postgres فقط پیاده‌سازی اینترفیس را عوض می‌کند، نه مصرف‌کننده‌ها را.

## ۷. تست‌ها

| فایل                                             | تعداد  | دامنه                                                 |
| ------------------------------------------------ | ------ | ----------------------------------------------------- |
| `tests/unit/practice/practice-generator.spec.ts` | ۱۰     | تولید تمرین از دیالوگ کافه (≥۸، ۴ نوع، deterministic) |
| `tests/unit/practice/practice-checker.spec.ts`   | ۸      | درست/غلط + نگاشت نقاط ضعف + تشدید روی خطوط teaches    |
| `tests/unit/progress/progress-machine.spec.ts`   | ۱۱     | گذارهای مجاز، رد پرش‌ها، دروازهٔ understood           |
| `db/tests/schema.spec.ts`                        | ۱۸     | جداول/ستون‌ها/یکتایی‌ها در SQL migration              |
| `tests/integration/learning-slice.spec.ts`       | ۳      | کل مسیر A→D از سطح API + remediate + userId scoping   |
| **جمع این Slice**                                | **۵۰** |                                                       |
| **کل مجموعه (با PoC قبلی)**                      | **۹۶** | ۱۳ فایل، همه سبز                                      |

## ۸. محدودیت‌های صادقانه

1. **DB زنده اجرا نشد.** اسکیما + migration معتبر تحویل و روی SQL تست شد، اما این محیط `DATABASE_URL`/Postgres ندارد؛ اتصال واقعی (migrate روی VPS + پیاده‌سازی Postgres repositoryها) طبق نقشه کار **M0-10/M1** است. app فعلاً روی repositoryهای in-memory dev اجرا می‌شود.
2. **صداها placeholder محلی‌اند** (نه VOICEVOX)؛ تمرین‌های شنیداری (`speaker-identify`, `listen-no-text`, M4) بدون صدای واقعی معنادار نیستند — UI صریحاً همین را به کاربر می‌گوید.
3. **ارزیابی نمونهٔ ۵سؤالی است**، نه بانک کامل ۸–۱۲ آیتمی از `comprehension_banks`؛ آستانه‌های M1..M5 Provisional هستند و با کاربر واقعی کالیبره می‌شوند (OQ-016).
4. **پایان مرحلهٔ C هنوز وارد صف FSRS نمی‌شود** (فیلد جملهٔ منبع G4 در اسکیما هست؛ wiring صف = تسک FSRS بعدی).
5. **کاربر dev ثابت است** (بدون auth)؛ `userId` فقط در سطح API/repository scope می‌شود — اتصال better-auth کار M1 است.
6. نکتهٔ فنی کوچک برای پیگیری: در `practice-runner.tsx` تابع `appendOrder` داخل updaterِ `setOrderDraft` یک `setAnswers` فراخوانی می‌کند (idempotent است و در StrictMode هم نتیجه درست می‌دهد، اما updater خالص نیست) — در پاک‌سازی بعدی بهتر است بیرون updater محاسبه شود.
7. مکالمه و درس فعلاً فقط «کافه — صبح» است؛ مکالمهٔ دوم برای نشاندادن `series_id`/`unit_order` در تسک محتوایی بعدی می‌آید.

## ۹. اجرای دروازه‌ها

`pnpm verify` در ریشهٔ worktree → **ALL GATES GREEN**. خروجی کامل و دست‌نخورده در [`assets/verify-slice.txt`](assets/verify-slice.txt).
