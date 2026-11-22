# CHECKPOINT — KANJI-TWO-PHASE (مأموریت دوم)

> مسیر پایدار: همین Checkout (شاخه `feat/kanji-memory-two-phase` از main ادغام‌شدهٔ مأموریت ۱) + مخزن GitHub.
> در هر Checkpoint: فایل‌های تغییرکرده + آخرین SHA نوشته می‌شود. هیچ Credential وارد Commit/Log نمی‌شود.

## CP1 — ۲۰۲۶-۱۱-۲۲: زیرساخت کامل §۱..§۶ (پیش از تست انتشار)

- **وضعیت مبنای مأموریت ۱:** PR #164 (feat/engine-next-gen → main) با squash-merge ادغام شد → `f0abfe1` (CI سبز؛ دو کامیت style اصلاح قالب prettier که گیت فرمت CI گرفته بود). فاز اول کامل منتشرشده در مخزن.
- **§۱ مرجع کانجی N5:** ۱۰۳ کانجی از KANJIDIC2 (database_version 2026-326، برچسب jlpt=4 نظام قدیمی ≡ مجموعهٔ رایج N5) — هرگز «رسمی JLPT» معرفی نمی‌شود؛ cross-check برابری ۱۰۳/۱۰۳ با فهرست منتشرشدهٔ practicejlpt.com؛ ضربه‌ها از KanjiVG (CC BY-SA 3.0) با اعتبارسنجی تعداد ضربه == KANJIDIC2؛ فایل‌ها: `vendor/kanjivg-kanji/*.svg` + `src/modules/curriculum/kanji/{n5-reference.ts,index.ts}` + writing-data (+۱۰۳ فایل) + `docs/domain/KANJI-N5-REFERENCE.md`.
- **§۲ قرارداد آموزش کانجی:** `STATION_TYPES` += `kanji`؛ بلوک `kanji-card`؛ `Chapter.kanji`؛ نوع رجیستری `kanji` با ثبت فقط از ایستگاه اختصاصی + پیش‌نیاز واژه‌های anchor + گلیف‌های خوانش؛ **EQA-12** (K1 ایستگاه اختصاصی · K2 اعلام↔تدریس · K3 anchor حامل و پیش از ایستگاه ≥۲ · K4 دک کامل · K5 مرجع) + رهگیری سطح `kanjiTaughtSequence`؛ کامپایل درفت کانجی → فصل runtime.
- **§۳ Memory Station:** انواع کارت `kj-rec`/`kj-wri` (مستقل از مرور واژه) + ثبت‌نام فقط با تکمیل ایستگاه اختصاصی؛ **review-contract** (جدول قالب هر نوع محتوا: ۹ نوع، front/reveal/structure/requiredFields) + اعمال در resolver (نقض قالب = unknown صادقانه، غیرقابل نمره‌دهی)؛ UI مرور کانجی (تشخیص/نوشتن با جهت معکوس)؛ قاعدهٔ پذیرش صادقانه در `listChapterCards`: واژه/گرامر/عبارت بدون کارت تدریس = ثبت‌نام در هیچ‌جا (رفع پیش‌فرض ایستگاه اول؛ ممیزی: همهٔ محتوای فعلی کارت دارند — بدون تغییر رفتار زنده).
- **§۴+§۵ دومرحله‌ای:** `CurriculumPlan` (فاز ۱) + **گیت P1** (P1-STRUCT/SOURCE/MAP/ORDER/KANJI/BUDGET) + `lifecycle`/چرخهٔ حیات (۶ وضعیت هر ایستگاه) + **گیت P2** (G2-PLAN وفاداری · G2-AUTHOR تألیف · G2-COMPLETE دک کامل · G2-VALIDATE · G2-PUBLISH مجوز مالک) + CLIها (`validate-plan`, `lifecycle-gates`, `extract-plan-from-chapter`) + مستند `TWO-PHASE-PIPELINE.md` + بازنویسی AGENT-PRODUCTION-GUIDE (۸ گام با مرحلهٔ ۰ تفکیک دو فاز).
- **نمونه‌های واقعی:** طرح استخراج fm01 (۲۲ ایستگاه/۱۱ واژه/۵ گرامر/۸ عبارت/۱۳ خط) — P1 سبز؛ فصل واقعی در برابر طرح خودش — P2 سبز؛ طرح جایگاه‌گذاری کانجی 人/国 — P1 سبز؛ ایستگاه تألیف‌شدهٔ فاز ۲ (نمونه) — P2 سبز.
- **§۶ Regression Tests (دائمی، روی مسیر اصلی موتور):** `kanji-reference.test.ts` (۹) + `kanji-contract.test.ts` (۱۱) + `memory-admission.test.ts` (۹) + `two-phase-gates.test.ts` (۱۴) — همهٔ ۸ سناریوی رد مأموریت پوشش داده شد. باتری کل: **۱۱۵۰/۱۱۵۰ سبز** · tsc/eslint/prettier سبز · build سبز · EQA روی فصل‌های واقعی: بدون خطای جدید.
- **فایل‌های تغییرکرده:** ۲۲۷ فایل stage شده (۱۰۳ SVG vendor + ۱۰۳ writing-data + ۲۰ فایل کد/تست/مستند/طرح). SHA پس از commit در ادامه ثبت می‌شود.
- **باقی‌مانده:** §۸ تست Backend/DB/CI + PR + Merge + Deploy + تأیید SHA از Health Endpoint؛ §۹ گزارش نهایی.

## CP2 — ۲۰۲۶-۱۱-۲۲ (۲۰:۰۵): انتشار کامل §۸/§۹

- **PR #164 (مأموریت ۱):** push شاخه + اصلاح دو فایل قالب prettier که CI گرفته بود (ffa2fcf `style(engine)` + 7c5505c `style(ops)` — هر دو hygiene-waiver: format-only) → CI سبز → squash-merge → **main `f0abfe1`**.
- **PR #165 (مأموریت ۲):** شاخه `feat/kanji-memory-two-phase` → کامیت `84867bb` → CI روی شاخه سبز (run 45059802565: verify+compose-smoke) → PR → squash-merge → **main `d2a597a`** → CI روی main سبز سه-job (run 45060360631: verify + compose-smoke + **image→GHCR tag=d2a597a**).
- **Deploy VPS:** الگوی مرحله‌ای مالک؛ بکاپ pg_dump 767KB (20261122T195139Z/200004Z) + .env؛ pull ایمیج پین‌شده؛ sync سورس؛ تعویض خط ایمیج؛ `up -d --no-deps web worker`. **سه مانع رفع شد:** (۱) مرگ اسکریپت با قطع سشن → nohup؛ (۲) دیسک پُر ۹۷٪ (604MB آزاد) → حذف ۴ ایمیج منقضی hanaso (f90ff43/9ef7881/3a8ed39/a66a40c) → ۴.۵GB آزاد (rollback به b75afea محفوظ)؛ (۳) نام سرویس compose = web/worker (نه hanaso-web).
- **تأیید SHA از Health Endpoint (سه سطح):** tier1 محلی `ok:true @ d2a597a` · `/api/ready` database ok (PG 18.6) · **public `https://hanaso.ir/api/health` → `"commit":"d2a597a905c0584811392577c2dd6fcb50b5e0e6"`** — هر دو کانتینر روی ایمیج جدید.
- **فایل‌های تغییرکرده این checkpoint:** ops/runs/RUN-20261122-KANJI-TWO-PHASE.md (نو) · ops/AGENT_RUN_LOG.md (ردیف RUN-20261122-04) · CURRENT_PHASE.md (سرصفحهٔ ۲۰۲۶-۱۱-۲۲) · این فایل. **آخرین SHA زنده: `d2a597a905c0584811392577c2dd6fcb50b5e0e6`** — docs(ops) commit پس از این می‌آید.
