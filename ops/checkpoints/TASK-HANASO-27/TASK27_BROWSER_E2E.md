# TASK-HANASO-27 — Browser E2E Report (واقعی)

**Date:** 2026-11-14 · **Server:** production standalone build (`next build` → `node .next/standalone/apps/web/server.js`, port 3100) · **Browser:** agent-browser (headless Chromium واقعی)
**Build guarantee:** سرور قدیمی TASK26R که روی 3100 بود (PID 1913) شناسایی و کشته شد؛ build تازه dump شد و `stn-kana-p1..p4` در چانک‌های server تأیید شد — مرورگر نسخهٔ جدید را دید (اثبات: اولین بار 404/500 گرفتیم که با build قدیمی اصلاً ممکن نبود).

## باگ واقعی که E2E گرفت
`returnToStationHref` به‌صورت تابع از RSC به Client Component پاس می‌شد → **500 روی همهٔ صفحات ایستگاه** در production build («Functions cannot be passed directly to Client Components»). رفع: تبدیل به `Record<blockId, href>`. بازاجرای همان سناریو: 200. (این کلاس خطا در unit/integration دیده نمی‌شود.)

## مسیر A — کاربر کاملاً تازه‌وارد ✅
نشست مستقل با کوکی تازه (learner `76553f75…`).

| # | سناریو | نتیجه | شاهد |
|---|---|---|---|
| A1 | Journey map برای تازه‌وارد: فقط h0 باز | ✅ | A01 — p1 با آیکون قفل (border-dashed + lock svg)، کلیک ناوبری نمی‌کند |
| A2 | h0 کامل با UI (۳ بلوک → CTA) | ✅ | A02 — «پایان درس و بازگشت به مسیر» + «درس بعدی: ردیف あ» |
| A3 | Walk واقعی h1..h5 (همان POSTهایی که runner می‌فرستد، با کوکی همین مرورگر) | ✅ | ۵×200، سرور prereq-chain را اعتبارسنجی کرد |
| A4 | p1 روی map باز شد (لینک واقعی، بدون قفل) | ✅ | DOM: `A href=…/stn-kana-p1` |
| A5 | ورود p1: scene + ۸ بلوک | ✅ | A03 |
| A6 | تمرین ۱ (さ): پاسخ غلط → «نادرست» + F1 + rationale گزینه | ✅ | A05 |
| A7 | دکمهٔ «سرنخ» → F2 با حذف گزینه | ✅ | «یک گزینهٔ نادرست حذف شد» در DOM |
| A8 | تلاش سوم غلط → F3 کامل: reveal + **راهنمای فارسی و لاتین** (سا \| sa) + دکمه‌های «شنیدن تلفظ درست» و «بازگشت به آموزش» | ✅ | A06 |
| A9 | پاسخ درست → تأیید + پخش صدا + **Auto-next** خودکار به بعدی | ✅ | رفتن خودکار ۲/۴ → ۳/۴ |
| A10 | بلوک شنیداری: autoplay سؤال + Replay؛ گزینه‌ها گلیف (بدون لو رفتن)؛ درخواست واقعی `GET /audio/kana/kn-hira-ko.opus 206` | ✅ | A07 + network log |
| A11 | قرارداد recognition: صدای جواب **قبل از** پاسخ پخش نشد (فقط بعد از درست) | ✅ | network log: kn-hira-sa فقط بعد از پاسخ درست |
| A12 | همهٔ ۱۹ تمرین p1 (rec/lis/rcl/dec/word/mixed) در UI پاس شد | ✅ | A08 + walk کامل |
| A13 | تکمیل p1: «این ایستگاه را با موفقیت پشت سر گذشتی!» + «درس بعدی: ん» | ✅ | A09 |
| A14 | بازگشت به map: h7 باز، **p2 همچنان قفل** (BUTTON)، p1 done | ✅ | DOM check |
| A15 | خطای JS / 4xx-5xx در کل نشست | ✅ هیچ | network filter خالی |

## مسیر B — کاربر دارای Progress قبلی ✅
نشست دوم مستقل (learner `160c2928…`) — Progress قبلی تا h9 (شامل p1) از قبل ثبت شد؛ **هیچ Progress واقعی دست نخورد**.

| # | سناریو | نتیجه | شاهد |
|---|---|---|---|
| B1 | map: p1 انجام‌شده (لینک replay `?mode=review`)، p2 باز، p3/p4 قفل | ✅ | B01 — Progress قبلی سالم |
| B2 | ورود p2 و پاسخ یک آیتم، خروج میان‌راه | ✅ | B02 |
| B3 | `/practice` hub: p1 «انجام شد»، p2 لینک، p3/p4 پیام قفل صادقانه | ✅ | B03 |
| B4 | **Resume**: بازگشت به p2 → «موقعیت قبلی‌ات ذخیره شده بود و بازگردانده شد» — سر جای ۲/۸ و ۲/۴ | ✅ | متن صریح UI |
| B5 | ادامه و تکمیل p2 از UI → «درس بعدی: ردیف ま» | ✅ | B04 |
| B6 | map بعدی: h10 باز، p3 باز، p4 قفل — دقیقاً منطبق بر Progress واقعی | ✅ | DOM + API |
| B7 | ثبت Completion جدید: `GET /api/practice` → p1,p2=true, p3,p4=false، completedStations=11 | ✅ | API response |
| B8 | **Isolation**: کاربر A هنوز ۷ ایستگاه — داده‌ها قاطی نشد | ✅ | A=7 / B=11 |

## Responsive ✅ (۳ اندازه، بدون overflow افقی)
| viewport | صفحه | scrollWidth | overflow |
|---|---|---|---|
| 390×844 (mobile) | p2 scene | 390 | ✅ false |
| 390×844 | تمرین (گزینه‌ها/دکمه‌ها) | 390 | ✅ false |
| 390×844 | journey map | 390 | ✅ false |
| 768×1024 (tablet) | /practice hub | 768 | ✅ false |
| 1440×900 (desktop) | journey map | 1440 | ✅ false |

چیدمان گزینه‌ها، دکمهٔ سرنخ، کنترل صدا، راهنمای «فارسی \| latin» و نوار پیشرفت (x/۸، x/۴) در هر سه اندازه در اسکرین‌شات‌ها قابل‌ مشاهده‌اند.

## شواهد (۱۸ اسکرین‌شات واقعی — همه non-blank تأیید شد)
`ops/checkpoints/TASK-HANASO-27/e2e/`: A01…A09 (مسیر تازه‌وارد) · B01…B04 (کاربر بازگشتی) · R01…R05 (responsive). نام هر فایل = سناریوی همان جدول بالا.

## نتیجه
هر دو مسیر الزامی مأموریت + responsive در build نهایی production **PASS** — صرفاً پاسخ API یا unit سبز ملاک نبوده؛ رفتار UI واقعی (قفل/باز، Hint سه‌مرحله‌ای، Feedback غلط/درست، زمان‌بندی Audio/Auto-next، Resume، Isolation) با چشم مرورگر تأیید شد.
