# RUN-20261124-01 — KANJI-TYPO: دکمهٔ «شروع تمرین نوشتن» بولد و سرِ جای «ادامه» + یک مقیاس گلیف برای گزینه‌های کانا و کانجی + فوریگانای خوانا

**تاریخ:** 2026-11-24 · **Agent:** GLM (سشن وب) · **شاخه:** `fix/kanji-typo-cta-glyph-furigana`
**PR:** #178 (squash `4ebcd20`) · **CI:** سبز روی شاخه و روی main (format/lint/typecheck/۱۱۴۸ تست واحد/integration-pg با PG18 واقعی/build/audit/smoke + compose-smoke + ایمیج GHCR — tag=SHA)
**LIVE:** `https://hanaso.ir/api/health` → `"commit":"4ebcd206ec0e9428a10db99905e2e4a5e3f66b56"` · uptime ok · DB ok (SELECT 1 از پول اپ؛ PostgreSQL 18.6)

## مبنا (دستور مالک، بازرسی زندهٔ پروداکشن 4cce5c7)

سه مورد تایپوگرافی، همه با اندازه‌گیری DOM زنده ثبت شدند و همه **در لایهٔ موتور** (کامپوننت/توکن مشترک) فیکس شدند — ایستگاه‌های کانجیِ آیندهٔ ایجنت این رفتار را خودکار می‌گیرند:

1. **«دکمهٔ شروع تمرین نوشتن باید بولدتر و واضح‌تر باشد و به جای دکمهٔ ادامه که در بقیهٔ بخش‌ها بود قرار بگیرد — فقط به جایش نوشته می‌شود شروع تمرین نوشتن»**
2. آزمون پایانی «گوش بده — این واژه با کدام کانجی تمام می‌شود؟»: **«نوشته hito به شدت بولد و بزرگ است در صورتی که آن دو تا کانجی خیلی ریز و کوچیکند»** (گزینه‌های 人/国 در برابر ひと).
3. **«در بقیهٔ بخش‌ها هم فونت مشکل بزرگیه — یا فاصله‌ها رعایت نشده یا بعضی نوشته‌ها خیلی ریزن، مثل همان هیراگانا‌هایی که بالای کانجی نوشته می‌شوند»** (فوریگانا).

## اندازه‌گیری‌های BEFORE (پروداکشن 4cce5c7، DOM زنده)

- دکمهٔ «شروع تمرین نوشتن»: **font 12px** (text-caption) · ۴۰px ارتفاع · ۱۲۰px عرض · دفن‌شده وسط ردیف کنترل بوم (زیر بوم، کنار «پخش آموزش») — در حالی که «ادامه» بقیهٔ بخش‌ها 16px/44px است و فوتر CTA کانا 18px/700/48px.
- گزینه‌های آزمون پایانی: 国 → **16px وزن ۴۰۰** (گلیف ۱۶px پهن) · 人 → **16px/400** · ひと → **28px وزن ۷۰۰** — دو مقیاس روی یک ردیف.
- فوریگانا روی کارت کانجی: **12px وزن ۴۰۰** روی کانجی 16px (rt: にほんじん/ちゅうごくじん/イランじん/かんこくじん).

## §۱ — موتور: دکمهٔ شروع = همان فوتر CTA کانا، سرِ جای «ادامه»

`components/curriculum/kanji-writing-card.tsx`:

- دکمهٔ کوچک 12px داخل کنترل‌های بوم **حذف شد** (قاعدهٔ «یک CTA در هر اسلاید» — Addendum-2 §۴).
- CTA تایید حالا همان **فوترِ CTA کارت کانا** است (الگوی TASK-HANASO-CTA-01 §۴): جداکننده + خط lead (`kanaIntroFooterLead`) + دکمهٔ primary بزرگ — `bg-ai` + `text-lead` (18px) + `font-bold` + `min-h-12` (48px) + `sm:min-w-[18rem]` (288px) + سایه/هاور همان کلاس‌های کانا — به‌عنوان **آخرین عنصر اسلاید** (`[data-kj-cta-footer]`، `data-ready-cta` برای تست‌ها حفظ شد).
- چرا این اسلات همان جای «ادامه» است: walk دکمهٔ forward خود را روی اسلاید writing کانجی گیت می‌کند (KANJI-WRITE-FIX §۲) — پس آخرین عنصر محتوای اسلاید دقیقاً همان جایگاهی است که در بقیهٔ بلوک‌ها «ادامه» می‌نشیند؛ کارت کانا هم دقیقاً همین الگو را دارد (پاریتی مالک-تاییدشده).
- فقط در بیت ready رندر می‌شود (intro خودش می‌نشیند؛ guided/free خودشان جلو می‌روند؛ پنل allDone جای خودش).

## §۲ — موتور: یک مقیاس گلیف برای گزینه‌های کانا و کانجی

`components/curriculum/exercise-session.tsx` (OptionRow):

- قانون گلیفِ Addendum-4 §۴ از «فقط کانا» به **ران‌های خالص CJK کوتاه (کانا و/یا کانجی، ≤۶ نویسه)** گسترده شد (`GLYPH_OPTION_RE`): کل ردیف کاشی‌های گلیف یکسان می‌شود — `ja-block` + `text-h2` (28px) + `font-bold`.
- گلیف‌ها **ساده** رندر می‌شوند (بدون روبی): خوانشِ کانجیِ تنها می‌توانست جواب آزمون را لو بدهد (قانون «standalone kanji runs» در SmartJaText)؛ در آزمون پایانی روبی روی 人 = لو دادن گزینهٔ ひと.
- برچسب‌های بلندترِ کانجی‌دار (واژه/جمله، مثل わたしは学生です) همان قانون روبی SmartJaText را نگه می‌دارند — رفتار قبلی دست‌نخورده.

## §۳ — موتور: فوریگانای خوانا + فاصله‌گذاری نثر ترکیبی

- `styles/tokens.css`: کف فوریگانا `max(0.5em, 12px)` → **`max(0.55em, 14px)`**.
- `styles/globals.css` (`.fg rt`): وزن ۴۰۰ → **۵۰۰** (تراکم خطوط کانا در اندازهٔ حاشیه‌نویسی) + line-height 1 → **1.15** (داکوتن/هانداکوتن نباید بریده شود).
- فاصله‌گذاری («فاصله‌ها رعایت نشده»): جزیره‌های ژاپنی داخل **نثر ترکیبی** فارسی یک نفس فاصله می‌گیرند — `padding-inline: 0.08em` فقط داخل ریشه‌های `.mixed-ja` (`MixedFaJaText` + `SmartMixedFaJaText`)؛ سطوح خالص‌ژاپنی (بوردهای دیالوگ، کارت واژه) **درز نمی‌گیرند**.
- هر دو **دروازهٔ توکن** (tokens-gate + ja-typography) به مقادیر جدید قفل شدند دوباره — drift آینده fail می‌شود.

## §۴ — رگرسیون دائمی

- `tests/unit/ui/kanji-writing-card.test.tsx` (+۱): قرارداد فوتر CTA — فقط **یک** `data-ready-cta`، داخل `data-kj-cta-footer`، **آخرین فرزند کارت**، کلاس‌های بولد (bg-ai/text-lead/font-bold/min-h-12/sm:min-w-[18rem])، فقط در ready (در guided/free غایب).
- `tests/unit/ui/exercise-session.test.tsx` (+۲): 人/国/ひと هر سه **هم‌مقیاس** (۳ کاشی ja-block با text-h2/font-bold) و **بدون rt** (نه لو دادن جواب)؛ برچسب‌های بلند کانجی‌دار همان مسیر روبی SmartJaText.
- `tests/unit/ui/tokens-gate.test.ts` + `tests/unit/ja-typography.test.ts`: کف جدید فوریگانا قفل شد.
- کل باتری: **۱۱۴۸ تست / ۹۹ فایل سبز**؛ typecheck/eslint/prettier سبز؛ integration-pg (PG18 واقعی) در CI سبز — بدون تغییر schema/seed.

## §۵ — انتشار (روال استاندارد مالک V3)

PR #178 → CI سبز (پس از یک prettier-formatting ری‌ران) → squash `4ebcd20` → main CI سبز (format/lint/typecheck/test/integration-pg/build/audit/smoke + compose-smoke + ایمیج GHCR) → دپلوی V3 مرحله‌ای: پری‌فلایت → SHA زنده = 4cce5c7 → بکاپ امن `db-pre-kanji-typo-20261123T181648Z.sql` → pull پین‌شده (اولین اجرا: خطای گذرای containerd روی یک layer — **صفر تغییر**، abort امن؛ retry موفق) → sync سورس 4ebcd20 → تعویض خط ایمیج → migrate one-shot idempotent → compose up web+worker → گیت سه‌لایه (`tier1 ok: commit=4ebcd206ec0e`) → ready (DB ok) → content truth (`stn-fm01-23-kanji` row سالم) → **LIVE 4ebcd20**.
لاگ: `/root/deploy-4ebcd20.log`؛ بکاپ: `/root/hanaso-backups/db-pre-kanji-typo-*.sql`.

## §۶ — راستی‌آزمایی مرورگر واقعی production

روی `https://hanaso.ir` (یادگیرندهٔ ناشناس تازه، deep-link های split؛ اندازه‌گیری DOM زنده):

- **اسلاید نوشتن 人:** intro **خودش** اجرا شد (timeline: intro+ → intro+ → intro+ → ready+ با narration زنده) → گلیف نهایی روی بوم؛ سپس فوتر CTA: **font 18px / وزن ۷۰۰ / ۴۸px ارتفاع / ۲۸۸px عرض / bg #1d4e70 / inFooter=true / footerIsLastChild=true / دکمهٔ «ادامه»ی walk غایب** — یعنی همان اسلات، بولد، primary.
- **کل تایم‌لاین موتور دست‌نخورده:** CTA → guided (۲ ضربهٔ 人 با pointer واقعی، KanjiVG medians) → free خودکار → ۲ ضربه از حافظه → **walk خودکار به اسلاید 国** → intro خودش → ۸+۸ ضربه → پیشروی خودکار به تمرین بعدی.
- **آزمون پایانی:** گزینه‌ها **国 28px/700 · 人 28px/700 · ひと 28px/700** — همه هم‌مقیاس (h=40)، بدون روبی. (BEFORE: 16px/400 در برابر 28px/700.)
- **فوریگانای کارت کانجی:** rt ها **14px / وزن ۵۰۰ / line-height 16.1px** روی ۸ گروه روبی (BEFORE: 12px/400).
- شواهد: `download/typo-fix-evidence/` — BEFORE: `before-r01-writing-ready.png` (دکمهٔ 12px) + `before-quiz-exit.png` (عدم تقارن گزینه‌ها)؛ AFTER: `after-writing-ready-人.png` + `after-quiz-exit.png` + `after-kcard-furigana.png` + `after-writing-intro-国.png`؛ همراه اندازه‌گیری‌های DOM بالا. **نسخهٔ ماندگار روی VPS:** `/root/kanji-typo-evidence/`.

## §۷ — قیدها

- فقط سه فیکس تایپوگرافی — Furigana (SMART-RUBY)، گیت walk، split اسلایدها، K7، Issues #169/#170 دست‌نخورده.
- فوتر CTA کانا (TASK-HANASO-CTA-01 §۴) دست‌نخورده ماند — کانجی به همان الگو پیوست.
- schema/seed/FSRS/Progress دست‌نخورده؛ postgres/pgbouncer هرگز restart نشدند (فقط web+worker).
- توکن فوریگانا عمداً تغییر کرد — هر دو دروازهٔ قفل توکن هم‌زمان آپدیت شدند (sequential change، اعلان در همین رکورد).
