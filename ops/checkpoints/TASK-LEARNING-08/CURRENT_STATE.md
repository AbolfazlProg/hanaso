# CURRENT_STATE — TASK-LEARNING-08

> آخرین به‌روزرسانی: 2026-11-06 (WP-1 تکمیل — شروع WP-5)
> شاخه: `feat/learning-06-lesson-system` · PR #115 · Issue ردیابی: #116

## وضعیت بازیابی (WP-1)

| مورد | وضعیت | شاهد |
|---|---|---|
| PR #115 (feat/learning-06-lesson-system) | open، mergeable clean، ۱۱ کامیت (@ b21512a) | GitHub API |
| TASK-LEARNING-07 W1–W7 | همه کامیت‌شده و مستقر (learn.kotodama.ir @ 667ebf1) | AGENT_PROGRESS.md + ce9ce2a |
| Working tree | تمیز در b21512a | git status |
| تست پایه | ۳۰ فایل / ۳۰۴ تست سبز | vitest run |
| dev server | پورت 3111، in-memory stores (بدون DATABASE_URL) | curl 200 |

## بازتولید بازخوردهای مالک (evidence)

| # | بازخورد | تأیید | شاهد |
|---|---|---|---|
| A | آموزش کاراکتر ضعیف | ✅ | `03-kana-card-a.png` — کارت あ: ۰ دکمه، بدون صدا/تلفظ/ترتیب ضربه؛ بلافاصله exercise |
| B | یادسپار بی‌کیفیت | ✅ | kana-items.ts — ۹۲ رکورد status:'draft'، کیفیت ناهمگون |
| C | موتور رسم حاشیه‌ای | ✅ | writing-practice فقط بلوک آخر ایستگاه (بعد از recall)، قابل رد با «ادامه» |
| D | کلیک اضافی بعد از پاسخ صحیح | ✅ | `04-correct-answer-extra-click.png` — دکمه «ادامه» پس از feedback صحیح |
| E | از دست رفتن پیشرفت | ✅ | Refresh وسط ایستگاه → بازگشت به بلوک ۱ (step در useState، بدون ذخیره)؛ 'enter' هرگز از کلاینت fire نمی‌شود؛ همهٔ صفحات با POC_DEFAULT_USER_ID مشترک (#109) |
| F | خط نقطه‌چین پشت آیکون‌ها | ✅ | تحلیل VLM دسکتاپ تولیدی: نقطه‌ها لبهٔ مارکرها را لمس/clip می‌کنند، هاله داخل حلقه‌ها می‌پاشد، بدون حاشیهٔ امن |

## تصمیم‌های پیاده‌سازی

- **هویت (WP-5):** learner id پایدار per-browser (localStorage + کوکی `hanaso_lid`) — سرور در نبودِ auth از آن به‌جای poc-user مشترک استفاده می‌کند (#109)؛ مسیر مهاجرت به better-auth (M1) حفظ می‌شود.
- **Resume (WP-5):** ذخیرهٔ محلی granular (per station: stepIndex/blockResults/exerciseIndex) در هر رویداد معنادار + لنگر سروری currentBlock از طریق action موجود enter.
- **Auto-next (WP-5):** تأخیر متمرکز در config، حفاظت double-submit، احترام به prefers-reduced-motion، دکمهٔ manual حفظ می‌شود.
- **آموزش (WP-2):** TB-KanaCard v2 طبق DD-121 — صدا-اول + تلفظ فارسی + پیش‌نمایش ترتیب ضربه + Tracing درون‌کارت؛ بلوک writing به قبل از recall exercise منتقل می‌شود (چرخه: معرفی→نوشتن→بازیابی→کاربرد).
- **یادسپار (WP-3):** بازنویسی ۹۲ یادسپار با استاندارد کیفیت مأموریت + برچسب صادق حفظ؛ الگوی مقایسه‌ای جای داستان ضعیف.
- **صوت (WP-3):** VOICEVOX از پیش تولیدشده روی VPS (خط تولید TASK-LEARNING-02) — ۹۲ کانا + ۳ خط دیالوگ خوش‌آمد؛ ممنوعیت TTS زنده حفظ.
- **نقشه (WP-6):** ماسک SVG با سوراخ‌های دایره‌ای (آیکون + حاشیهٔ امن) روی هر دو لایهٔ مسیر.

## فایل‌های هم‌نقطهٔ هماهنگی (تغییر ترتیبی، تک-Agent)

`src/messages/fa.ts` · `src/modules/curriculum/content/kana-items.ts` · `chapter-kana01.stations.ts` · `station-runner.tsx` · `exercise-session.tsx` · `journey-map.tsx` — این اجرا تنها Agent فعال روی شاخه است.

## قدم بعدی

WP-5 — هویت زبان‌آموز + پایداری پیشرفت + Auto-next.
