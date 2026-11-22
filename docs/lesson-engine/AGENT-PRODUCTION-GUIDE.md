# راهنمای تولید درس برای ایجنت — HANASO Lesson Engine

> مأموریت فاز ۶ — «چگونه ایجنت برای درس بعدی دقیقاً چه می‌کند». پیش‌نیاز مطالعه:
> `docs/lesson-engine/REQUIREMENTS.md` (قواعد فریم‌ورک)، `docs/lesson-engine/TWO-PHASE-PIPELINE.md` (معماری دومرحله‌ای — KANJI-TWO-PHASE §۴) و دو سند اصلی
> `HANASO_TEACHING_FRAMEWORK.md` + `HANASO_STAGED_TEACHING_IMPLEMENTATION.md` در مخزن teaching-framework.

## مرحلهٔ ۰ — تفکیک دو فاز (الزامی از ۲۰۲۶-۱۱-۲۲)

**ایجنت استخراج (فاز ۱) و ایجنت تألیف (فاز ۲) کارهای متفاوتی انجام می‌دهند و اشتباه گرفتنشان ممنوع است:**

- **فاز ۱ — Curriculum Planning / Content Extraction**: مطالعهٔ منبع؛ استخراج واژگان/گرامر/کانجی/عبارت‌ها با ارجاع منبع؛ تعیین پیش‌نیاز همهٔ مطالب؛ تعیین ترتیب آموزشی؛ بخش‌بندی منطقی بین ایستگاه‌ها + هدف و نوع هر ایستگاه؛ تعیین جایگاه ایستگاه‌های کانجی (ایستگاه اختصاصی `kanji`، هر کانجی ≥۲ واژهٔ anchor حامل خود کانجی که قبلاً تدریس می‌شوند). خروجی: `CurriculumPlan` (YAML) — بدون هیچ نثر آموزشی/مثال/تمرین. گیت ورود به فاز ۲: **Gate P1**.
- **فاز ۲ — Lesson Authoring / Instruction Design**: تبدیل طرح پذیرفته‌شده به درس واقعی — توضیح، مثال، آموزش کوتاه مرحله‌ای، فعالیت بلافاصله، تمرین هدایت‌شده و مستقل، Hint/Feedback (نردبان خودبسنده)، سنجش نهایی. گیت ورود به انتشار: **Gate P2** (وفاداری به نقشه — تغییر ترتیب/پیش‌نیاز/واگذاری بدون گیت P1 مجدد رد می‌شود).

## قرارداد طلایی (غیرقابل‌نقض)

1. **هیچ اختراعی** — هر محتوایی که در جزوه نیست، ساخته نمی‌شود؛ نامشخص = پرچم `needs_review`/`missing_source` برای مالک.
2. **ردیابی منبع** — هر آیتم (خط مکالمه، واژه، الگوی گرامر) باید `sourceRef` (فایل/درس/صفحه/بخش) داشته باشد؛ validator بدون آن رد می‌کند.
3. **بدون موتور موازی (D-0011)** — خروجی موتور همان فرمت runtime موجود است؛ StationRunner دست‌نخورده.
4. **قواعد فریم‌ورک جایگزین نمی‌شوند** — همهٔ اعداد از `ENGINE_CONFIG` (کالیبره‌پذیر با Q-xxx).

## جریان تولید درس جدید (۸ گام)

### گام ۱ — parse جزوه

```bash
corepack pnpm --filter web exec tsx scripts/lesson-engine/parse-booklet.ts \
  "<path-to-booklet.md>" /tmp/booklet.json
```

خروجی: `booklet-draft.json` — همهٔ درس‌ها با مکالمه/واژگان/عبارت‌ها/گرامر + شماره صفحهٔ هر آیتم.
(جزوهٔ فعلی: «Online Japanese N5 Course» — ۱۵ درس؛ لیست‌های سراسری واژگان/عبارت‌ها هم استخراج می‌شود.)

### گام ۲ — طرح فاز ۱ (Curriculum Plan / استخراج + بخش‌بندی)

از `booklet-draft.json` یک `CurriculumPlan` بساز (قالب: `plan-types.ts`؛ نمونهٔ واقعی: `content/lesson-engine/plans/first-meeting-01.plan.yaml`). برای فصل‌های موجود، مبدّل `extract-plan-from-chapter.ts` طرح را از دادهٔ واقعی فصل استخراج می‌کند. کانجی‌ها فقط از مرجع N5 (`curriculum/kanji`) با ≥۲ واژهٔ anchor حامل خود کانجی، در ایستگاه اختصاصی `kanji` بعد از ایستگاه‌های واژگانِ anchor.

```bash
corepack pnpm --filter web exec tsx scripts/lesson-engine/validate-plan.ts \
  apps/web/content/lesson-engine/plans/<chapter>.plan.yaml   # گیت P1
```

PASS = صفر خطای HARD (فاز ۲ شروع می‌شود) — بدون P1 سبز، گام ۳ ممنوع است.

### گام ۳ — draft اسکلت فصل

```bash
corepack pnpm --filter web exec tsx scripts/lesson-engine/draft-chapter.ts \
  /tmp/booklet.json <lessonNo> <chapterSlug> <level> \
  apps/web/content/lesson-engine/<chapterSlug>.yaml
```

خروجی: YAML اسکلت — نقشهٔ ایستگاه‌ها بر اساس مدل ۱۳-مرحله (anchor→vocab→grammar→practice→transfer) با گام‌های flow آماده و همهٔ محتواها TODO + پرچم.

### گام ۴ — تکمیل ایجنت (اینجا «محتوا» ساخته می‌شود)

ایجنت YAML را ویرایش می‌کند و دقیقاً این‌ها را از جزوه پر می‌کند:

| فیلد                       | از کجای جزوه                | قاعدهٔ فریم‌ورک حاکم                                                                 |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `canDoFa`                  | Ⅰ اهداف                     | JF can-do قالب                                                                       |
| `dialogue[].origin`        | Ⅱ + فصل‌های قبلی            | **سه‌منشأ**: prior/target/guessable + توضیح                                          |
| `dialogue[].fa`            | ترجمهٔ ایجنت (ژاپنی مبنا)   | سهم فارسی طبق سطح                                                                    |
| `vocabulary[].tier`        | فراوانی/نقش در مکالمه       | T1≤۱–۲ در ایستگاه؛ عمق V-flow تابع tier                                              |
| `vocabulary[].meaningFa`   | معنی طبیعی (کتاب = EN hint) | معادل بافتی، قفل ۱:۱ ممنوع                                                           |
| `grammar` (≤۲)             | Ⅴ الگوها                    | G0→G7؛ خطاهای رایج → distractors                                                     |
| `stations[].steps[]`       | پر کردن تعامل‌ها            | ۱۰ نوع تعامل؛ گزینه ۲–۴؛ distractor با reason؛ hints H1–H3 محتوا‌دار؛ feedback ۴لایه |
| `stations[].guidedStepIds` | آخرین گام‌ها                | Guided = ۲–۳ گام آخر (D-0011)                                                        |

قواعد حین تکمیل (validator همه را می‌سنجد): سقف گام‌ها، ≤۲ تعامل متوالی هم‌قالب، typing ممنوع در teach، Exit Check per station، تناوب ۶۰/۴۰ در practice، transcript فقط بعد از ≥۲ شنیدن، خوانش کانجی فقط درون ≥۲ anchor word.

### گام ۵ — اعتبارسنجی آموزشی

```bash
corepack pnpm --filter web exec tsx scripts/lesson-engine/validate-draft.ts \
  apps/web/content/lesson-engine/<chapterSlug>.yaml
```

PASS = صفر خطای HARD. هشدارهای SOFT باید با دلیل ثبت شوند (QC «حذف با دلیل»).

### گام ۶ — کامپایل (اثبات سازگاری)

```bash
corepack pnpm --filter web exec tsx scripts/lesson-engine/compile-check.ts \
  apps/web/content/lesson-engine/<chapterSlug>.yaml
```

خروجی: `Chapter` runtime — اثبات اینکه محتوا بدون کدنویسی اختصاصی به StationRunner موجود می‌رسد.

### گام ۷ — گیت CI

`tests/unit/lesson-engine-gates.test.ts` (در `pnpm test`): schema + validator + compile + ant-invention. فصل draft باید در CI سبز بماند.

### گام ۸ — انتشار (فقط با تأیید مالک)

مسیر انتشار: ساخت dialogue YAML (ماژول dialogue) + صوت + تبدیل دستی/کامپایل به ماژول TS محتوا + seed + EQA کامل + مرور مالک. `published: true` فقط پس از این زنجیره.

## چک‌لیست نهایی ایجنت (قبل از تحویل draft)

- [ ] همهٔ آیتم‌ها sourceRef صفحه‌دار
- [ ] صفر HARD در validator
- [ ] پرچم‌های needs_review فقط برای مواردی که واقعاً مبهم‌اند
- [ ] سه‌منشأ هر خط مکالمه ثبت و توضیح‌دار
- [ ] بودجهٔ گرامر ≤۲، T1 ≤۲/ایستگاه، سقف گام‌ها، تنوع تعامل
- [ ] compile بدون خطا
- [ ] CI سبز
