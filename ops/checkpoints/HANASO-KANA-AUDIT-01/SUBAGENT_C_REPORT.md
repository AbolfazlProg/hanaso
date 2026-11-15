# SUBAGENT C REPORT — Production & Browser Experience Audit

> ممیزی مستقل نسخهٔ زندهٔ Production — `https://learn.kotodama.ir` · نسخهٔ `1.1.0-hanaso29-r01` · کامیت `5b503598`.
> مرورگر headless واقعی (agent-browser/Chromium)، کاربر QA مستقل (cookie تازهٔ `hanaso_lid` — بدون دستکاری Progress هیچ کاربر واقعی).
> تاریخ اجرا: 2026-11-15 (سشن ۱ ممیزی). شواهد: ۱۲ اسکرین‌شات در `evidence/browser/`.

## ۱. مأموریت و روش

- Context مرورگر تازه (QA learner مستقل)؛ باز کردن مسیر Lesson/Station از داخل Learning Journey (`/learn/kana-foundation-01/journey`).
- بازدید دسکتاپ (1440) و موبایل (390) از صفحهٔ Journey؛ ورود به Stationهای h0 (anchor)، h1، و h13 (Seed Case Sokuon/がっこう) + walk ایستگاه‌های h1→p4 از طریق API با همان هویت QA (grade با پاسخ صحیح برای باز کردن قفل مرحلهٔ بعد — فقط روی Progress کاربر QA خودمان).
- ثبت URL، viewport، رفتار واقعی و اسکرین‌شات برای هر مرحله.

## ۲. پوشش واقعی (صادقانه)

| بخش | وضعیت |
|---|---|
| Journey map — دسکتاپ 1440 | ✓ بازدید و اسکرین‌شات (`journey-desktop-fresh.png`, `journey-desktop-h0-done.png`) |
| Journey map — موبایل 390 | ✓ بازدید و اسکرین‌شات (`journey-mobile-fresh.png`, `journey-mobile-locked-click.png`, `journey-mobile-locked-feedback.png`) |
| Station h0 (anchor) + Completion/مهر | ✓ (`h0-anchor-desktop.png`, `h0-complete-stamp-desktop.png`) |
| Station h1 — کارت Kana + تمرین نوشتن | ✓ (`h1-kana-card-writing-desktop.png`, `h1-writing-practice-desktop.png`, `h1-writing-free-mode-desktop.png`) |
| Station h13 — Sokuon / がっこう | ✓ (`h13-warmup-wrong-F3-reveal.png`, `h13-gakkou-decode-options.png`) |
| ایستگاه‌های h2..h12, h14, h15, p1..p4, K1..K13, گیت فصل | ✗ در این سشن فقط از طریق API (walk برنامه‌ای h1→p4 برای unlocking) پیموده شد؛ UI تک‌تک آن‌ها رندر و اسکرین‌شات نشد — پوشش UI رندرشده: **4 ایستگاه از 38** (+ journey در دو viewport). این محدودیت صادقانه ثبت می‌شود.

## ۳. Findings

### KANA-C-01 — قفل روی کارت‌های قفل‌شده در سمت راست (تأیید گزارش مالک)

- **Severity:** Medium | **Confidence:** CONFIRMED
- **URL:** `/learn/kana-foundation-01/journey` | **Viewport:** 1440 و 390 هر دو
- **Evidence:** `evidence/browser/journey-desktop-fresh.png`, `journey-mobile-fresh.png`, `journey-mobile-locked-click.png`
- **مشاهدهٔ دقیق:** کارت هر Station قفل‌شده یک آیکون قفل (🔒-شکل) در **سمت راست کارت** نشان می‌دهد؛ کارت‌های بازشده این آیکون را ندارند. در موبایل هم همین الگو حفظ شده است.
- **رفتار مورد انتظار (از گزارش مالک):** قفل نباید در سمت راست کارت نمایش داده شود (در RTL سمت راست = ابتدای مسیر دید؛ آیکون در نقطهٔ تمرکز اولیهٔ چشم قرار می‌گیرد و کارت «قفل» را برجسته‌تر از وضعیت واقعی نشان می‌دهد).
- **رفتار واقعی:** قفل در سمت راست کارت‌های قفل رندر می‌شود و در هر دو viewport قابل‌مشاهده است.
- **اثر بر یادگیری:** Low-to-Medium — مانع یادگیری نیست اما سیگنال بصری گمراه‌کننده/ناخوشایند است؛ مالک آن را ایراد می‌داند.
- **Root Pattern:** RP-UI-01 (آیکون/چیدمان کارت Journey).

### KANA-C-02 — پیام «این درس هنوز باز نشده» در موبایل زیر Fold و محوشونده

- **Severity:** High | **Confidence:** CONFIRMED
- **URL:** `/learn/kana-foundation-01/journey` (کلیک روی کارت قفل) | **Viewport:** 390×844
- **Evidence:** `journey-mobile-locked-click.png`, `journey-mobile-locked-feedback.png`
- **رفتار واقعی:** با کلیک روی کارت قفل، پیام «این درس هنوز باز نشده» ظاهر می‌شود اما (۱) در موبایل زیر ناحیهٔ دید اولیه (fold) قرار می‌گیرد و (۲) پس از حدود یک ثانیه محو می‌شود. کاربر موبایل ممکن است اصلاً متوجه دلیل غیرقابل‌کلیک بودن نشود.
- **رفتار مورد انتظار:** پیام در محدودهٔ دید کاربر (کنار/بالای کارت کلیک‌شده) و به‌مدت کافی برای خواندن باقی بماند (یا حالت inline روی خود کارت).
- **اثر بر یادگیری:** کاربر تازه ممکن است بپندارد برنامه خطا کرده یا کارت خراب است.
- **Root Pattern:** RP-UI-02 (Feedback گذرا/جای‌نادرست).

### KANA-C-03 — متن آموزشی ژاپنی Inline اندازهٔ 16px

- **Severity:** Medium | **Confidence:** CONFIRMED
- **URL:** صفحهٔ Station h1/h13 (متن آموزشی داخل بلوک‌های rule/teaching)
- **Viewport:** 1440
- **Evidence:** `h1-kana-card-writing-desktop.png`, `h13-warmup-wrong-F3-reveal.png`
- **مشاهده:** متن‌های آموزشی ژاپنی داخل جریان متنی با اندازهٔ 16px رندر می‌شوند — برای گلیف‌های گرافیکی کانا (به‌ویژه جفت‌های مشابه مثل ぬ/め، あ/お) کوچک‌تر از حد مطلوب تمایز بصری است؛ گلیف بزرگ Showcase بزرگ است اما مثال‌های داخل جمله/متن inline این اندازه را ندارند.
- **اثر:** تشخیص تفاوت‌های ریز گلیف (که هدف صریح درس تمایز است) در متن inline سخت‌تر می‌شود.
- **Root Pattern:** RP-UI-03 (خوانایی اندازهٔ متن آموزشی).

### KANA-C-04 — نردبان Feedback F1→F3 در مسیر بررسی‌شده درست کار کرد (یافتهٔ مثبت)

- **Severity:** — (NOT_A_BUG) | **Confidence:** CONFIRMED
- **URL:** Station h13 | **Evidence:** `h13-warmup-wrong-F3-reveal.png`
- **مشاهده:** پاسخ غلط → پیام F1 (سرنخ بدون افشای پاسخ) → با درخواست سرنخ بیشتر F2 → سپس F3 با توضیح کامل قاعده رندر شد؛ متن فارسی خوانا و در جهت RTL درست بود.
- **یادداشت:** این مورد صرفاً یک داده-point مثبت است؛ ادعای تعمیم به «همهٔ تمرین‌ها» نمی‌شود (فقط h13/h1 در UI دیده شد).

### مشاهده‌های تکمیلی (بدون Finding مستقل — داده برای Mission 3)

- پس از تکمیل h0، مهر/استانپ پایان Station رندر شد (`h0-complete-stamp-desktop.png`) — رفتار مورد انتظار.
- تمرین نوشتن h1 (trace/writing) در حالت practice و free هر دو موجود و قابل‌استفاده بود (`h1-writing-*.png`).
- گزینه‌های تمرین decode در h13 (がっこう) رندر فارسی خوانا داشت (`h13-gakkou-decode-options.png`) — این اسکرین‌شات به‌عنوان بازتولید Seed Case «گزینه‌های خوانش» مالک ثبت می‌شود.
- کنتراست رنگ متن روی پنل‌های رنگی: در صفحات بازدیدشده مورد قطعیِ ناخوانا ثبت نشد؛ این مورد در Mission 3 باید با پیمایش کامل‌تر (ایستگاه‌های بازدیدنشده) تکمیل شود — وضعیت: NEEDS_CONTEXT.
- Auto-scroll به مرحلهٔ جاری: در ایستگاه‌های بازدیدشده رفتار آشکارا خرابی ثبت نشد؛ اما چون فقط ۴ ایستگاه UI-level دیده شد، ادعای کامل بودن auto-scroll قابل‌تأیید نیست — وضعیت: NEEDS_CONTEXT (پیمایش Mission 3).

## ۴. دربارهٔ چهار تصویر مالک

چهار اسکرین‌شات اصلی مالک به‌صورت فایل در Workspace موجود نبود (بررسی کامل `upload/`, `download/`, `hanaso-shots/`, `owner_notes/` در سشن ۱ انجام شد — تنها فایل‌های paste متن مأموریت TASK-22 بودند). بنابراین این گزارش Seed Caseها را **بازتولید زنده** کرده است؛ اسکرین‌شات‌های جدید جایگزین فایل‌های اصلی مالک تلقی نمی‌شوند و صرفاً شواهد مستقل از همان وضعیت‌اند.

## ۵. جمع‌بندی

| Finding | Severity | Confidence | Evidence |
|---|---|---|---|
| KANA-C-01 قفل سمت راست کارت (دسکتاپ+موبایل) | Medium | CONFIRMED | journey-desktop-fresh.png, journey-mobile-fresh.png |
| KANA-C-02 پیام قفل زیر fold + محو ~1s در موبایل | High | CONFIRMED | journey-mobile-locked-click.png, journey-mobile-locked-feedback.png |
| KANA-C-03 متن آموزشی ژاپنی inline 16px | Medium | CONFIRMED | h1-kana-card-writing-desktop.png |
| KANA-C-04 نردبان F1→F3 صحیح (مثبت) | — | CONFIRMED | h13-warmup-wrong-F3-reveal.png |
| (کنتراست/auto-scroll کامل) | — | NEEDS_CONTEXT | — (پوشش UI فقط ۴ ایستگاه) |

پوشش UI رندرشده: ۴ ایستگاه از ۳۸ + Journey در ۲ viewport + walk برنامه‌ای h1→p4 (بدون رندر UI تک‌تک). محدودیت در FINAL_AUDIT_REPORT نیز ثبت شده است.
