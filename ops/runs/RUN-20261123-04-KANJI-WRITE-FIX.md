# RUN-20261123-04 — KANJI-WRITE-FIX: هر کانجی یک اسلاید مخصوص + حذف دکمهٔ رد شدن + نمایش خودکار — همه از موتور

**تاریخ:** 2026-11-23 · **Agent:** GLM (سشن وب) · **شاخه‌ها:** `fix/kanji-writing-per-kanji-slides` + `fix/kanji-writing-fresh-mount-key`
**PR:** #174 (squash `d4566b8a`) + #175 (فیکس key، squash `4cce5c7`) · **CI:** سبز روی هر دو شاخه و روی main (تست/اِکی‌اِی/integration-pg واقعی PG18/بیلد/اودی/smoke + ایمیج GHCR — هر بار)
**LIVE:** `https://hanaso.ir/api/health` → `"commit":"4cce5c7544d61dda27255357a33b3da735dd1fe0"` · uptime ok · DB ok (SELECT 1 از پول اپ؛ PostgreSQL 18.6)

## مبنا (دستور مالک، بازرسی پس از SMART-RUBY)

بخش نوشتار «تا حد زیادی خوب» شده بود؛ سه مشکل باقی‌مانده:

1. **«هر دو کانجی داخل یک اسلاید از یک ایستگاه بودند»** — هر کانجی باید اسلاید مخصوص خودش را داشته باشد و مرحله‌ای طی شود؛ **از موتور** فیکس شود تا ایجنتِ کانجی‌های آینده هم دچار تکرار نشود.
2. **«بدون نوشتن می‌شد با دکمهٔ ادامه رفت اسلاید بعد»** — غلط؛ مثل بخش کانا: دکمهٔ «شروع نوشتن» → یک بار با راهنما → دفعهٔ بعد از حفظ → **خودکار** بخش بعد.
3. **«با ورود به بخش نوشتن، کانجی باید خودش نوشته می‌شد و روی حالت نوشته‌شدهٔ نهایی سالم می‌ماند»** — عین بخش کاناها.
4. دامنه: فقط همین سه فیکسِ نوشتاری (furigana/محدودسازی سؤال‌ها کارSMART-RUBY بود و دست‌نخورده ماند؛ keyboard-nav و گیت پایانی Issueهای #169/#170 باقی‌اند).

## §۱ — موتور: هر کانجی یک اسلاید (`expandKanjiWritingBlocks`)

`modules/curriculum/client-transport.ts` — **نقطهٔ ورود واحد** همهٔ سطوح ایستگاه به کلاینت:

- دکِ `writing-practice` چند-کانجی (فرم طبیعی تألیف ایجنت) هنگام انتقال به **N بلوک، یکی به‌ازای هر کانجی** گسترش می‌یابد — شناسه‌های قطعی `${deckId}@${literal}`: ایستگاه واقعی → `wp-kanji-jin-kuni@人` سپس `wp-kanji-jin-kuni@国`، هر کدام با تایم‌لاین مرحله‌ایِ خودشان (intro خودکار → تأیید → ردیابی → از حافظه → پیشروی خودکار walk).
- **دکِ کانا دست‌نخورده رد می‌شود** (رفتار مرجع مالک؛ تمرین ردیف-کانا با picker خودش).
- همین قانون در `stripStationAnswerMaterial` (صفحاتی که Station کامل می‌گیرند) اعمال شد.
- **لنگر resume سرور** (route: `anchorValid` روی نگاه split اعتبارسنجی می‌شود) و **لینک عمیق `?block=`** (صفحهٔ ایستگاه) هم با همان نگاه walk — resume بین‌دستگاهی و deep-link به اسلایدهای per-kanji صادقانه آدرس‌پذیرند.

چرا «از موتور» کافی است برای آینده: هر مسیر تألیف (فایل محتوا مستقیم یا compile موتور) از **همان client-transport** به walk می‌رسد؛ split دائمی است و نویسندهٔ آینده نمی‌تواند به اشتباه دو کانجی را در یک اسلاید بگذارد.

## §۲ — گیت walk: نوشتن الزامی، بدون دکمهٔ «ادامه»

`station-runner.tsx`:

- قانون #117 §8 (کارت کانا) اکنون قانون کانجی هم هست: روی اسلاید writingِ کانجی، **دکمهٔ «ادامه» هرگز رندر نمی‌شود** (`isKanjiWritingDeck` — فقط دکِ کانجی؛ دکِ تمرینی کانا دست‌نخورده با «ادامه» می‌ماند، DD-106).
- `KanjiWritingCard` با اتمام تمرین از-حافظه `onWritingDone` صدا می‌زند → walk **خودکار** جلو می‌رود (callback مشترک rename شد: `onKanaWritingDone` → `onWritingDone` — همان معنی برای هر دو خانواده).
- اسلاید تک‌کانجی **picker ندارد** (اسلاید مال خودِ کانجی است)؛ مسیر چند-کانجی به‌عنوان fallbackِ un-split باقی است.
- ثبت writing-practice (پرش به سمت سرور) با کاراکتر اعتبارسنجی می‌شود — نه شناسهٔ بلوک؛ پس با split سازگار است.

## §۳ — نمایش خودکار + شکل نهایی سالم + گارد K7

- intro mode در WritingCanvas (از TASK-LEARNING-09) هنگام mount خودش اجرا می‌شود — حالا per-slide تضمین شده: ورود به هر اسلاید نوشتن = پخش خودکار ترتیب شماره‌دار ضربه‌ها (نوشتهٔ فارسی هر ضربه + نقطهٔ شروع + فلش جهت) و **استراحت گلیف تمام‌شده روی بوم** (ready).
- **EQA-12 K7 (KANJI-WRITE-SCOPE):** (الف) دکِ نوشتن ایستگاه کانجی فقط کانجی‌های هدف همان ایستگاه را می‌تواند داشته باشد — قاچاق کانجی خارج-هدف → error با پیام فارسی؛ (ب) نوشتن کانجی فقط در ایستگاه نوع kanji مجاز است (نوشتن = تدریس؛ قانون K1 برای دک‌ها). هر دو نیمه mutation-tested.
- متن instruction دکِ واقعی بازنویسی generic-per-kanji شد (روی هر اسلاید درست خوانده می‌شود).

## §۴ — باگ زندهٔ پیدا‌شده و فیکس (PR #175)

در راستی‌آزمایی مرورگرِ واقعی روی `d4566b8a`: پس از اتمام اسلاید 人، walk به اسلاید 国 می‌رفت اما **React نمونهٔ KanjiWritingCard را بازاستفاده می‌کرد** (رندر بدون key در همان موقعیت درخت — کارت‌های کانا همیشه keyed بودند): حالت داخلی اسلاید تمام‌شده (allDone + پنل «نوشتن 人 یاد گرفته شد» + از دست رفتن بوم) **به اسلاید 国 نشت می‌کرد**. split باعث شد دو اسلاید نوشتن خواهرِ پشت‌سرهم شوند — دقیقاً چیزی که نبودِ key را آشکار کرد.

فیکس: `key={block.id}` روی رندر KanjiWritingCard (هر اسلاید mount تازه — intro و بوم خودش؛ همان قرارداد KanaCard/ExerciseSession) + همین key روی WritingPracticeBlock (میزبان drill کانا). رگرسیون pin شد: assertions اسلاید 国 (پنل تکمیل نباید باشد، بوم باید باشد) — **mutation-verified**: بدون key، تست fail می‌شود.

## §۵ — رگرسیون دائمی

- `tests/unit/ui/kanji-writing-walk.test.tsx` (جدید): فصل واقعی first-meeting-01 + StationRunner واقعی + toClientStation (split واقعی): شناسه‌های split؛ **عدم وجود «ادامه»** روی هر دو اسلاید؛ auto-play شدن intro (narration خودش جلو می‌رود)؛ تایم‌لاین کامل staged با KanjiVG واقعی 人/国 (pointer events هندل‌شده)؛ **پیشروی خودکار walk** 人 → 国 (اسلاید تازه: بدون نشت، با بوم خودش) → تمرین بعد.
- `tests/unit/kanji-station-fm01.test.ts` (+۶): پین split در toClientStation + stripStationAnswerMaterial؛ رد شدن دکِ کانا (یک بلوک باقی)؛ K7 سه‌گانه (ایستگاه واقعی clean + mutation خارج-هدف + mutation خارج-ایستگاه).
- `tests/unit/ui/kanji-writing-card.test.tsx` (+۱): اسلاید تک‌کانجی — بدون picker، `onWritingDone` دقیقاً یک‌بار؛ مسیر fallback چند-کانجی دست‌نخورده.
- کل باتری: **۱۲۱۷ تست / ۱۰۹ فایل سبز**؛ typecheck/eslint/prettier سبز؛ integration-pg (PG18 واقعی) در CI هر دو PR سبز — **بدون تغییر schema/seed** (split در سطح transport؛ همهٔ شمارش‌های content-truth: 98′/23/19/82 دست‌نخورده).

## §۶ — انتشار (روال استاندارد مالک، دوبار)

PR #174 → CI سبز → squash `d4566b8a` → main CI سبز → ایمیج GHCR → دپلوی V3 مرحله‌ای (پری‌فلایت → SHA → بکاپ امن `db-pre-kanji-write-fix-*.sql` → pull پین‌شده [اولین اجرا: خطای گذرای containerd در layer — **صفر تغییر**، abort امن؛ retry → موفق] → sync سورس → تعویض خط ایمیج → migrate one-shot idempotent → compose up web+worker → گیت سه‌لایه → ready → content truth: `stn-fm01-23-kanji` row سالم) → **LIVE d4566b8a**؛ سپس فیکس key: PR #175 (rebase روی main) → CI سبز → squash `4cce5c7` → main CI سبز → دپلوی V3 دوباره (`db-pre-kanji-key-fix-*.sql`) → **LIVE 4cce5c7**.
لاگ‌ها: `/root/deploy-d4566b8a.log` + `/root/deploy-4cce5c7.log`؛ بکاپ‌ها: `/root/hanaso-backups/db-pre-kanji-{write,key}-fix-*.sql`؛ شواهد: `/root/kanji-write-fix-evidence/`.

## §۷ — راستی‌آزمایی مرورگر واقعی production (دسکتاپ + موبایل + لمس)

روی `https://hanaso.ir` (مرورگر واقعی، درایو کامل):

- **ورود تازه به اسلاید 人** (deep-link `?block=wp-kanji-jin-kuni@人` — اعتبارسنجی split): intro **خودش** اجرا شد (narration: «ضربهٔ ۱ از ۲» → «ضربهٔ ۲ از ۲» بدون هیچ کلیک) → ready → گلیف نهایی روی بوم سالم ماند؛ **«ادامه» غایب**؛ **picker غایب** (اسلاید مال 人).
- «شروع تمرین نوشتن» → guided: دو ضربهٔ 人 با pointer واقعی (KanjiVG medians به مختصات کلاینت نگاشت) **accept شد** → free خودکار → نوشتن از حافظه → **walk خودکار به اسلاید 国 رفت**.
- **اسلاید 国 تازه و سالم** (پس از فیکس key): intro خودش (ضربهٔ ۲ از ۸)، بوم خودش، **پنل تکمیلِ 人 نشت نکرده**؛ ۸ ضربه guided + ۸ ضربه free با pointer واقعی accept شد → **walk خودکار به تمرین خوانش بعدی** («بررسی پاسخ» رندر شد).
- **موبایل (emulation iPhone 16, 393px):** بدون overflow افقی، بوم تمام‌عرض؛ **لمس** (pointerType touch): ۸ ضربه free با لمس accept → پیشروی خودکار.
- **resume بین‌دستگاهی با شناسه‌های split:** مرورگر تازه (localStorage پاک) از لنگر سروری روی اسلاید 国 بازیابی شد؛ بازگشت با «مرحلهٔ قبل» به اسلاید 人 = کارت تازه با intro تازه.
- شواهد: `download/kanji-write-fix-evidence/` (۸ اسکرین‌شات: ready 人 / نشتِ قبل-فیکس برای مقایسه / guided 人 / اسلاید تازهٔ 国 / guided کامل 国 / اسلاید تمرین بعد / موبایل / لمس-موفق) — **نسخهٔ ماندگار روی VPS:** `/root/kanji-write-fix-evidence/` (رکورد + ۷ اسکرین‌شات کلیدی، sha256-verified در انتقال).

## §۸ — قیدها

- فقط سه فیکس نوشتاری — Furigana/محدودسازی سؤال‌ها/Issues دست‌نخورده.
- kana01 (drill hosts + «ادامه») دست‌نخورده — key اضافه شد اما رفتار همان است.
- schema/seed/FSRS/Progress دست‌نخورده (split فقط transport؛ شمارش‌ها unchanged).
- postgres/pgbouncer هرگز restart نشدند؛ فقط web+worker.
