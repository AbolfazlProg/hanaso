# RUN-20261122 §KANJI-TWO-PHASE — مأموریت دوم: مرجع کانجی N5، قرارداد آموزش کانجی، ارتقای Memory Station و معماری دومرحله‌ای

> Orchestrator: Z.ai · تاریخ: ۲۰۲۶-۱۱-۲۲ (Asia/Tehran) · شاخه: `feat/kanji-memory-two-phase` (از mainِ پس از #164) · PR: **#165** (squash) · **LIVE: `d2a597a905c0584811392577c2dd6fcb50b5e0e6`**
> ادامهٔ مستقیم RUN-20261122-03 (ENGINE-NEXTGEN): ابتدا وضعیت Checkpoint/SHA/PR فاز قبل خوانده شد — شاخهٔ محلی push شد، دو خطای قالب prettier که گیت فرمت CI گرفته بود اصلاح شد (ffa2fcf + 7c5505c) و PR #164 با CI سبز merge شد (`f0abfe1`).

## ۰) مهارت‌های مطالعه‌شده و بازبینی معماری

- **Skills (رجیستری EXT، طبق ماتریس انتخاب):** test-driven-development (کل سویت‌های رگرسیون §۶ با قواعد red-green روی مسیر اصلی موتور) · postgresql-table-design (بررسی schemaی موجود `fsrs_cards` برای انواع kj — ستون `kind` از نوع text بدون enum → بدون migration) · webapp-testing (الگوی verification مرورگر/سرور واقعی — قرارداد smoke بدون-DB روی سرور standalone production اجرا شد) · systematic-debugging (عیب‌یابی‌های گیت CI و استقرار).
- **معماری بازبینی‌شده:** Knowledge Registry (knowledge/registry·types·prereq-gate·surfaces) · Lesson Engine (types/validate/compile/engine-config + اسکریپت‌ها) · FSRS (integration/item-registry/review-store + مسیر enrollment ایستگاه→register) · EQA (policy/gates/model/run + waivers) · writing-data/KanjiVG pipeline · روال انتشار (OWNER-ONE-COMMAND-UPDATE + الگوی deploy-<sha>).

## ۱) §۱ — مرجع کانجی N5 (۸ کامیت‌معادل درون #165)

- **منبع فهرست — صادقانه:** JLPT فهرست رسمی کانجی منتشر نمی‌کند؛ مرجع = **KANJIDIC2 (EDRDG)** database_version `2026-326` (fetched 2026-11-22) با برچسب `jlpt=4` (نظام قدیمی ۴-سطحی ≡ مجموعهٔ ۱۰۳تاییِ رایجِ «N5»). **cross-check: برابری کامل ۱۰۳/۱۰۳ با فهرست منتشرشدهٔ مستقل practicejlpt.com** (در زمان تولید، ثبت‌شده در provenance). هرگز «رسمی» خوانده نمی‌شود.
- **Stroke Data معتبر:** KanjiVG (CC BY-SA 3.0) — ۱۰۳ فایل SVG verbatim در `vendor/kanjivg-kanji/` (پکیج کامل: README + مجوز)؛ تبدیل به همان قالب centerline-v2 کانا در `public/writing-data` (۱۰۳ فایل JSON + ایندکس) با **اعتبارسنجی: تعداد ضربهٔ هر فایل == stroke_count کانجی‌دیک + ترتیب ضربه‌ها ۱..N + bounded**. پارسر عمومی مسیر (M/c/s/S/C) اضافه شد؛ کانا روی پارسر سخت‌گیر قبلی ماند — **بایت‌پایداری کانا اثبات شد** (git diff خالی پس از rebuild).
- **دادهٔ ساخت‌یافته:** `curriculum/kanji/n5-reference.ts` (GENERATED: id/نویسه/ucs/on/kun/meaningsEn/meaningFa/strokeCount/grade/freq + `KANJI_N5_SOURCE`) + `curriculum/kanji/index.ts` (lookup + واژه‌های حامل کانجی + fsrsCardIds). meaningFa = تألیف HANASO (ترجمهٔ موجز — طبقهٔ همان واژه‌های مضرب کانا).
- **اتصال به Knowledge Registry بدون منبع موازی:** نوع `kanji` + ثبت فقط از `kanji-card` در ایستگاه اختصاصی؛ حقایق در مرجع می‌مانند، رجیستری فقط موضعیت تدریس + پیش‌نیازها را نگه می‌دارد.

## ۲) §۲ — قرارداد اختصاصی آموزش کانجی (enforce در موتور)

- `STATION_TYPES` += `kanji` · بلوک `kanji-card` (kanjiId + anchorWordIds + noteFa) · `Chapter.kanji` (KanjiItem: id/fsrs/anchorها) · کامپایل درفت کانجی → runtime (C-KANJI-REFERENCE/C-KANJI-ANCHOR hard).
- **EQA-12** (registred در policy + EQA_GATE_REGISTRY؛ EQA-11 رزرو تعامل است): **K1** کانجی‌کارت فقط در ایستگاه نوع kanji — معرفی در کارت واژه = تدریس نیست · **K2** اعلام↔تدریس هم‌ارز (هر دو جهت) · **K3** واژه‌های anchor: موجود + حامل خود کانجی (D-0006 vessel) + ثبت‌شده + **تدریس‌شده پیش از ایستگاه کانجی** (جهانی یا داخل همان ایستگاه) + ≥۲ عدد · **K4** ایستگاه kanji باید کانجی‌کارت داشته باشد (بیش از ۴ = هشدار) · **K5** شناسه در مرجع N5.
- EQA-2 (پکت) کانجی‌کارت را هم پوشش داد؛ model.ts کانجی را در universe مفاهیم ثبت می‌کند → **سنجش کانجی پیش از تدریس اختصاصی از مسیر عمومی EQA-1 layer1 + R5 رد می‌شود**. رهگیری سطح: `kanjiTaughtSequence(registry, chapters)`.
- تعداد ایستگاه کانجی هر فصل = داده (یک یا چند) — عدد ثابت و تصنعی تعیین نشد.

## ۳) §۳ — ارتقای بنیادی Memory Station

- **پشتیبانی تمام انواع محتوا با قالب اختصاصی هر نوع** (`fsrs/review-contract.ts` — ۹ قالب با front/reveal/structure/requiredFields): واژه (معنا/از صدا/تولید) · جملهٔ مکالمه · گرامر · عبارت کاربردی · کانا · **کانجی-تشخیص (kj-rec)** · **کانجی-نوشتن (kj-wri)**.
- **کانجی ≠ واژه:** کارت‌های kj-rec/kj-wri (front معکوس در kj-wri)؛ ثبت‌نام فقط با تکمیل **ایستگاه اختصاصی** (`enrollStationSlug` از خود دک مشتق می‌شود — کانجی بدون ایستگاه = هیچ‌جا ثبت‌نام نمی‌شود). resolver مرور: معنا/خوانش‌های on-kun/ضربه/واژه‌های anchor + UI جدید در review-runner.
- **فقط محتوای تدریس‌شده وارد مرور می‌شود:** admission در `listChapterCards` اصلاح شد — واژه/گرامر/عبارت **بدون کارت تدریس** دیگر به ایستگاه اولِ فصل پیش‌فرض نمی‌شود؛ `__unassigned__` = هیچ‌جا (ممیزی محتوای فعلی: ۱۱/۱۱ واژه + گرامر + عبارت کارت دارند → بدون تغییر رفتار زنده؛ رگرسیون M-4).
- **مواجهه ≠ تدریس:** exposureAt در رجیستری از firstTaught جدا ماند (رگرسیون M-5). **FSRS بازنویسی نشد** — فقط انواع کارت + resolver/قالب اضافه شد؛ scheduler/store/مهاجرت دست‌نخورده. Progress و دادهٔ کاربران تغییر نکرد.

## ۴) §۴+§۵ — معماری دومرحله‌ای تولید محتوا + Validation Gate

- **فاز ۱ — Curriculum Planning/Content Extraction:** `plan-types.ts` (CurriculumPlan: استخراج + نقشهٔ ایستگاه‌ها با هدف/نوع/ترتیب/پیش‌نیاز + واگذاری آیتم‌ها + جایگاه کانجی + ارجاع منبع هر آیتم) + **گیت P1** (`plan-validate.ts`: P1-STRUCT/SOURCE/MAP/ORDER(DAG)/KANJI/BUDGET).
- **فاز ۲ — Lesson Authoring:** همان مسیر موجود validate-draft/compile-check + **چرخهٔ حیات** (`lifecycle.ts`: extracted→planned→authored→validated→publishable + ۶ وضعیت هر ایستگاه: extractionDone/prereqsValidated/authoringDone/blocksComplete/finalValidationPassed/publishPermission) + **گیت P2** (G2-PLAN وفاداری به نقشه — تغییر ترتیب/پیش‌نیاز/ایستگاه/واگذاری بدون P1 مجدد رد · G2-AUTHOR تألیف + نردبان کامل · G2-COMPLETE دکِ فقط-عنوان/چارچوب رد · G2-VALIDATE گزارش گیت‌های اصلی · G2-PUBLISH مجوز صریح مالک — هرگز محاسبه‌ای).
- **CLI:** `validate-plan.ts` · `lifecycle-gates.ts` · `extract-plan-from-chapter.ts` (مبدّل فصل‌های موجود به طرح).
- **نمونه‌های واقعی — هر دو گیت سبز:** طرح استخراج first-meeting-01 (۲۲ ایستگاه/۱۱ واژه/۵ گرامر/۸ عبارت/۱۳ خط مکالمه + انگاشتار anchor ۱۰ کانجی) — P1 سبز · فصل واقعی در برابر طرح خودش — P2 سبز · **طرح جایگاه‌گذاری کانجی** (first-meeting-01-kanji-pilot: ایستگاه اختصاصی 人/国 با ۴/۲ واژهٔ anchor واقعی) — P1 سبز · **ایستگاه تألیف‌شدهٔ فاز ۲** (`specimens/station-kanji-hito.specimen.ts`: دو kanji-card + بازیابی فوری + نردبان خودبسنده + جمع‌بندی) — P2 سبز روی فصل واقعی. موتور مراحل را تفکیک می‌کند: فصلِ فقط-استخراج‌شده → `planned` غیرقابل انتشار.
- مستندات: `docs/lesson-engine/TWO-PHASE-PIPELINE.md` + بازنویسی `AGENT-PRODUCTION-GUIDE.md` (۸ گام با مرحلهٔ ۰ تفکیک دو فاز) + `docs/domain/KANJI-N5-REFERENCE.md` + رجیستری EQA-12.

## ۵) §۶ — Regression Tests دائمی (روی مسیر اصلی موتور)

| سویت                                  | تست | پوشش                                                                                                                                                 |
| ------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/kanji-reference.test.ts`  | ۹   | ۱۰۳ یکتا · کامل‌بودن داده · provenance صادقانه (notOfficial) · پوشش کامل writing-data + برابری ضربه‌ها · vendor + مجوز                               |
| `tests/unit/kanji-contract.test.ts`   | ۱۱  | R-1 سنجش کانجی پیش از تدریس اختصاصی (EQA-1+R5) · R-2 anchor تدریس‌نشده · K1/K2/K5/vessel/count — همه با mutation روی فصل واقعی + specimen            |
| `tests/unit/memory-admission.test.ts` | ۹   | M-3 کانجی بدون ایستگاه به صف نمی‌رود · M-4 واژه/گرامر بدون کارت = هیچ‌جا · M-5 مواجهه ≠ تدریس · M-8 قالب نامناسب رد (unknown صادقانه) + کانجی ≠ واژه |
| `tests/unit/two-phase-gates.test.ts`  | ۱۴  | T-6 فقط-استخراج‌شده غیرقابل انتشار · T-7 تغییر ترتیب/پیش‌نیاز/ایستگاه/واگذاری توسط فاز ۲ رد + P1/P2 مثبت‌ها روی دادهٔ واقعی                          |

باتری کامل: **۱۱۵۰/۱۱۵۰ سبز** (۱۰۳ فایل تست) · tsc/eslint/prettier سبز · `pnpm eqa` ۵۶/۵۶ سبز (EQA-12 روی فصل‌های واقعی: بدون یافتهٔ جدید) · build سبز · font-budget سبز · smoke قرارداد DB-less طبق CI (health ok / ready 503-fail صادقانه / home 500) سبز.

## ۶) §۸ — تست، انتشار، تأیید SHA

1. PR **#164** (مأموریت ۱ — شاخهٔ مانده) → دو اصلاح قالب prettier (CI گیت فرمت) → CI سبز → squash-merge → `f0abfe1`.
2. شاخهٔ `feat/kanji-memory-two-phase` → کار مأموریت ۲ → **CI سبز روی شاخه** (run 45059802565: verify شامل PG18-integration ✓ compose-smoke شامل backup-drill ✓) → PR **#165** → squash-merge → main `d2a597a`.
3. **CI روی main (run 45060360631): هر سه job سبز** — از جمله `image → GHCR (tag = SHA)` → ایمیج پین‌شده `d2a597a…` ساخته شد.
4. **استقرار VPS (الگوی به‌روزرسانی مرحله‌ای مالک):** پری‌فلایت → گیت SHA زنده → **بکاپ امن** (pg_dump ۷۶۷KB + .env، 20261122T195139Z/200004Z) → pull ایمیج دقیق → sync سورس به SHA → تعویض خط ایمیج .env → **تعویض مرحله‌ای web+worker با --no-deps** (postgres/pgbouncer دست‌نخورده) → گیت سلامت سه‌سطحی.
   - **رفع دو مانع عملی:** (۱) نخستین اجرا با بسته‌شدن سشن ترمینال کشته شد → nohup؛ (۲) **دیسک VPS پُر** (604MB آزاد، ۹۷٪) → ۴ ایمیج منقضی hanaso حذف شد (f90ff43/9ef7881/3a8ed39/a66a40c — rollback زنجیره‌ای به b75afea محفوظ) → ۴.۵GB آزاد؛ (۳) نام سرویس‌های compose (`web/worker` نه hanaso-web) اصلاح شد.
   - **گیت‌های پس از تعویض:** tier1 = `ok:true @ commit d2a597a…` · `/api/ready` = database ok (SELECT 1 via app pool, PostgreSQL 18.6) · **public: `https://hanaso.ir/api/health` → `"commit":"d2a597a905c0584811392577c2dd6fcb50b5e0e6"`** ✓ هر دو کانتینر روی ایمیج جدید.
   - قیدها: voicevox-gen همچنان متوقف؛ postgres/pgbouncer دست‌نخورده؛ هیچ credential در لاگ/کامیت.

## ۷) §۷ — محدودیت‌های دامنه (رعایت‌شده)

فصل‌های موجود بازسازی نشد · کانجی N5 به محتوای منتشرشده تزریق نشد (نمونهٔ فاز ۲ specimen است، در هیچ فصلی ثبت/منتشر نشد) · FSRS بازنویسی نشد (نقص مستند نبود؛ فقط افزودنی) · Progress/دادهٔ کاربران تغییر نکرد · نمره/امتیاز/رتبه اضافه نشد · منبع حقیقت موازی ساخته نشد (مرجع == خانهٔ حقایق، رجیستری == خانهٔ موضعیت تدریس).

## ۸) وضعیت نهایی

- **LIVE:** `d2a597a905c0584811392577c2dd6fcb50b5e0e6` روی hanaso.ir (تأیید از Health Endpoint در هر سه سطح) — شامل هر دو مأموریت ۱ و ۲.
- **مسیر آیندهٔ آماده:** مأموریت‌های تولید فصل بعدی: ایجنت فاز ۱ طرح می‌سازد (P1) → ایجنت‌های فاز ۲ تألیف می‌کنند (P2) → انتشار با مالک؛ کانجی‌ها از مرجع N5 با قرارداد EQA-12 و مرور kj-rec/kj-wri.
