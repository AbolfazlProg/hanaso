# PART 1 — شش گروه اصلاحات فصل ۰۱ (شاخهٔ موازی، بدون ادغام خودکار)

> **برای ایجنت اول (ادغام‌کننده):** این PR مستقل است — لطفاً سازگاری را بررسی کن، خودت ادغام کن و Deploy نزن مگر در جریان انتشار یکپارچهٔ خودت.

## شناسه‌ها

| مورد                  | مقدار                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| شاخه                  | `fix/chapter01-part1` (worktree مستقل)                                                           |
| SHA مبنا              | `0cc223690a7101c133b5d38fc59f4bc13406b7df` (main هنگام شروع)                                     |
| merge از main حین کار | `57ae98b` — فقط workflow جدید `ttyd-probe.yml` (additive، بدون تداخل) — merge-commit `d56a9bc`   |
| Commitها              | `c3befe5` content (FIX-2/3/4/6) · `52fb515` api+ui (FIX-1/5) · `cfe15e9` tests · `d56a9bc` merge |

## شش گروه اصلاح (علت ریشه‌ای → فایل → تست)

### ۱. خطاهای ۵۰۰ در `/api/curriculum/station` (h11/h12/p3/m1) — FIX-1

- **علت ریشه‌ای ۱:** `incrementAttempts` خواندن-سپس-نوشتن بود؛ دو POST هم‌زمانِ grade مقدار را گم می‌کردند (attemptCount→۰، گارد `no_graded_answers` ایستگاهِ واقعاً-پاسخ‌داده را می‌رفت).
  **رفع:** افزایش اتمیک SQL (`attempt_count + 1`)؛ شاخهٔ conflict هرگز status/completedAt را لمس نمی‌کند (پیشرفت اشتباه/تکراری ناممکن).
- **علت ریشه‌ای ۲:** `completeStationWalk` تنها سرویس از سه‌گانهٔ completion بدون bounded retry بود؛ خطای گذرای DB → raw 500.
  **رفع:** حلقهٔ retry محدود با قرارداد `isRetryableTxError` (هم‌قرارداد با practice/mastery)؛ تراکنش all-or-nothing + گارد `already:true` = retry امن بدون ثبت دوباره.
- **علت ریشه‌ای ۳:** بدنهٔ POST بدون گارد — هر استثنا → 500 خام بی‌قرارداد.
  **رفع:** wrapper ساخت‌یافته: 503 `station/transient_failure` + `details.retryable:true` + پیام فارسی؛ ثبت صفر در شکست.
- **سمت کلاینت (عبور بدون ثبت ممنوع):** تلاشِ ارسال‌نشده نردبان F را نمی‌سوزاند؛ دکمهٔ «تلاش دوبارهٔ ارسال» همان پاسخ را با همان attemptNo می‌فرستد؛ auto-retry محدود (۱٫۵ث/۳ث)؛ «ادامه»ی attempt-3 هرگز برای سؤال ثبت‌نشده ظاهر نمی‌شود؛ در block-interactionها (micro-ask/guided/userReply) شکست ثبت = بدون قفل کاذب، بدون علامت «پاسخ داده شد»؛ POST complete با auto-retry محدود (فقط 5xx/شبکه؛ 409ها ساخت‌یافته و فوری).

### ۲. آوانگاری くに — FIX-2

«کونی» (برخورد مبتذل فارسی) → «کوونی» در هر ۴ سایت (کارت h8 + decode مرور: prompt/گزینه/f3) با قرارداد «و» تکراری خود فصل؛ گgate transcript-consistency سبز.

### ۳. ضربه‌های さ و せ در h7 — FIX-3

«هر کانا، یک ضربه» غلط/مبهم بود؛ با مرجع معتبرِ داخل خود ریپو (KanjiVG vendored — `public/writing-data/さ.json`/`せ.json`: هرکدام ۳ ضربه؛ ん=۱) بازنویسی شد + تفکیک واژگانی «مورا» (خواندن) از «ضربهٔ قلم» (نوشتن).

### ۴. آموزش ん قبل از اولین تمرین h7 — FIX-4

کارت آموزش ん اکنون بلوک اول است (قبلاً گام ۵+ پس از «از حافظه بنویس» + ۲ دور پرسش) — ترتیب جدید: کارت → نوشتن → warmup → اسلایدها.

### ۵. نشت پاسخ در تمرین‌های خواندن — FIX-5

`promptJaReading` عبارت decode هرگز از مرز RSC عبور نمی‌کند (strip در صفحهٔ ایستگاه + صفحهٔ assessment، همان قانون SKL-013 rule-listening)؛ کارت خوانش (correctReading) فقط در لحظهٔ reveal از سرور می‌آید؛ رندر هم post-answer-only (دفاع لایه‌دوم). راستی‌آزمایی زنده: payload صفحات h4/k8 = `"promptJaReading":"$undefined"`.

### ۶. شمارش واژگان یکتا و مجموع تجمعی — FIX-6

قانون: union یکتای hostWord + مثال‌های example-set در ترتیب walk، فقط اولین بارِ هر واژه. هر ۱۹ رشتهٔ شمارش بازمحاسبه شد؛ مجموع نهایی ۱۱۸. اعتبارسنجی با حقیقتِ خود گزارش: k11=۵ دقیقاً همان لیست ارزیابی (デザイナー، エンジニア، インドネシア، ノート، カタカナ)، k10=۱. چهار ایستگاه نام‌برده: h8 ۳۸/۱۶۳→۸/۳۲ · h12 ۱۰۲/۵۳۸→۸/۶۰ · k11 ۹/۷۱۶→۵/۱۱۷ · k12 ۵/۷۲۱→۱/۱۱۸. نکته برای مالک: k12 زیر «۴ یکتا»ی تخمینِ گزارش است چون プレゼント (k6) و ラジオ (k1) قبلاً معرفی شده‌اند — قانون یکتا از کل فصل، سخت‌گیرانه‌تر و سازگار.

## فایل‌های تغییرکرده (۱۲)

`api/curriculum/station/route.ts` · `learn/[chapter]/journey/[station]/page.tsx` · `learn/[chapter]/assessment/page.tsx` · `components/curriculum/exercise-session.tsx` · `components/curriculum/station-runner.tsx` · `db/repositories/curriculum.ts` · `lib/poc/completions.ts` · `messages/fa.ts` (+۱ کلید) · `content/chapter-kana01.stations.ts` · `content/chapter-kana01.practice.exercises.ts` · `tests/unit/part1-fixes.test.tsx` (جدید، ۱۴ تست) · `tests/unit/ui/progress-integrity.test.tsx` (+ `AGENT_PROGRESS.md` ردیف هماهنگی)

## تست‌ها (واقعی، نه فقط سبز بودن lint)

- typecheck ✓ · eslint ✓ · prettier ✓
- vitest کامل: **۸۲ فایل / ۸۹۵ تست ALL PASS** (شامل ۱۴ تست هدفمند تازهٔ `part1-fixes.test.tsx`: قرارداد 503، گارد no_graded_answers، مصرف‌نشدن نردبان در قطعی، ظاهر شدن «ادامه» فقط با ۳ miss ثبت‌شدهٔ سرور، بازمحاسبهٔ کامل زنجیرهٔ شمارش، تطبیق دادهٔ KanjiVG با متن h7)
- مرورگر واقعی (Chromium، dev server بدون DATABASE_URL): h7 گام ۱/۱۵ = کارت آموزش ん ✓ · payload زندهٔ h4/k8 بدون promptJaReading ✓ · h8 با «کوونی» و «مجموع 32» ✓ · walk کامل h0 تا پنل پایان با همهٔ POSTها ۲۰۰ ✓
- **Integration واقعی PG18:** در sandbox اجرا نمی‌شود (postgres در دسترس نیست) — CI این PR آن را اجرا می‌کند؛ افزایش اتمیک و retry تراکنش آن‌جا هم پوشش داده می‌شود.

## تداخل احتمالی با کار ایجنت اول

- `api/curriculum/station/route.ts`: گیت Preview Draft او (خطوط ~200-208) **دست‌نخورده**؛ من فقط wrapper 503 + کارت decode اضافه کردم. اگر او همین فایل را در فاینالیز Preview تغییر دهد → تداخل جزئی و قابل‌حل (تغییرات من در نواحی مجزا است).
- `station-runner.tsx` / `exercise-session.tsx` / `fa.ts`: تغییرات او (preview/badge) نواحی مجزا دارند؛ احتمال تداخل کم.
- هیچ تغییری در فصل ۲، Lesson Engine، صوت‌ها، Preview Mode، workflowها یا استقرار نداده‌ام.
- سیستم بدون نمره/امتیاز باقی است: فقط صحت پاسخ، بازخورد آموزشی و وضعیت پیشرفت — bestScore صرفاً رکورد است و هرگز گیت نیست.
