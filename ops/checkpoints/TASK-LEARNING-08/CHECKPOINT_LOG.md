# CHECKPOINT_LOG — TASK-LEARNING-08

قالب: مهر زمانی Asia/Tehran · SHA واقعی پس از هر commit.

---

## CP-01 — 2026-11-06 ~09:10 — WP-1 تکمیل (بازیابی + بازتولید)

- **وضعیت:** PR #115 بازیابی شد (b21512a، working tree تمیز، ۳۰۴ تست سبز، dev server پورت 3111).
- **بازتولید A–F:** همهٔ ۶ بازخورد مالک با شواهد واقعی تأیید شد (جدول CURRENT_STATE) — از جمله تحلیل VLM نقشهٔ production (نقطه‌ها بدون حاشیهٔ امن به مارکرها می‌چسبند).
- **Issue #116** ثبت شد (labels: learning, content).
- **یافتهٔ تکمیلی:** action «enter» ایستگاه هرگز از کلاینت fire نمی‌شود → ایستگاه تا complete عملاً in_progress ثبت نمی‌شود؛ همهٔ مسیر learn زیر poc-user مشترک است (#109).
- **یافتهٔ صوت:** فقط ۱۹ فایل صوتی (۲ دیالوگ) موجود است؛ ۹۲ کانا و ۳ خط kana-welcome بدون دارایی‌اند؛ word-audio registry قراردادش آماده است ولی manifest وجود ندارد.
- **یافتهٔ writing-data:** هر ۹۲ گلیف کانا دادهٔ ضربه دارند (پوشش کامل).
- **Commit:** (در ثبت پس از این checkpoint)

---

## CP-02 — 2026-11-06 ~11:35 — WP-2..WP-6 کد کامل + push (تا a42fc08)

- **WP-5 (bed7cdd):** هویت per-browser (localStorage + کوکی hanaso_lid؛ ۹ فایل learn به resolveLearnerId/FromRequest مهاجرت؛ poc-user فقط fallback). Walk snapshot محلی per (learner, chapter, station) با restore gate؛ actionهای enter/progress با currentBlockId معتبر؛ complete پاک می‌کند. Auto-next با EXPERIENCE config + single-fire latch. **یافته و رفع:** singletons استورها در Next dev بین RSC و route handler جدا بودند → الگوی globalThis؛ 'enter' هرگز از کلاینت fire نمی‌شد → حالا در mount. تست: +20 (learner 6 + walk 7 + API 7).
- **WP-2/3a (212a39c):** kana-teaching.ts (۹۲ entrada: audioRef + تلفظ + نکته + strokeHint + یادسپار بازنویسی‌شده با style story/pattern و pairHint)؛ KanaCard v2 (صدا-اول ۰٫۸× + LineAudioButton + جفت side-by-side + WritingPractice درون‌کارت variant=card)؛ codemod: بلوک writing در ۲۳ ایستگاه به قبل از آخرین exercise.
- **WP-3b (cf74437):** تولید روی VPS (VOICEVOX 四国めたん s2؛ kana speed 0.9؛ دیالوگ speed 0.95؛ ffmpeg opus32k+m4a96k)؛ ۹۲ فایل kana + ۳ خط خوش‌آمد با hash=hashAudioLine(text,voiceId) — گیت fidelity سبز. dur کانا ۴۳۳–۶۶۸ms (تک‌مورا).
- **WP-6 (a42fc08):** ماسک SVG (defs>mask، سوراخ دایره‌ای radius+14px per waypoint؛ g mask). VLM: دسکتاپ/موبایل/سبز تمیز؛ مسیر پیوسته. E2E شش سناریو: همه PASS (بسته/بازکردن، Back، Refresh، خروج، آفلاین+بازگشت، مرور درس قبلی).
- **گیت‌ها:** vitest 33/324 ✓ · eqa 37 ✓ · tsc ✓ · eslint 0 ✓ · build ✓ (۱۴ warning از الگوی fs-access موجود audio-manifest — همان کلاس word-audio). integration-pg در sandbox ممکن نیست (بدون PG) — مستند.
- **Push:** b21512a..a42fc08 (۵ کامیت) — CI #77 در حال اجرا.

---

## CP-03 — 2026-11-06 ~12:00 — استقرار تأییدشده + راستی‌آزمایی زندهٔ کامل (پایان مأموریت)

- **بازیابی سشن:** سشن قبلی بلافاصله پس از push نهایی قطع شد (پیش از ثبت CP-03). سشن جدید وضعیت را از checkpoints + Git + production بازیابی کرد و **هیچ کدی را دوباره ننوشت/دوباره deploy نکرد** — فقط راستی‌آزمایی و ثبت.
- **CI:** رن CI #79 روی کامیت نهایی `a865475` — **تمام جاب‌ها سبز**: verify (۲۱ گام، شامل integration روی PostgreSQL 18 واقعی — محدودیت sandbox محلی CP-02 در CI برطرف شد) + compose-smoke (image واقعی · مسیر PgBouncer · دریل بکاپ). جاب image→GHCR: skipped (استقرار از git-bundle روی VPS طبق الگوی TL-07).
- **استقرار:** زنده روی https://learn.kotodama.ir @ `a8654750f3e14ab014ad347b018dd89ecdfdb102` — health `ok/ok` · `env: production` (deploy در همان سشن قطع‌شده انجام شده بود؛ این CP فقط تأیید کرد).
- **راستی‌آزمایی زندهٔ A–F با مرورگر واقعی روی production:**
  - **A+B (آموزش/صوت):** پخش ۳ خط خوش‌آمد و صدای کانا (kn-hira-a) از production استریم شد (۲۰۰/۲۰۶)؛ KanaCard v2 کامل: صدا-اول ۰٫۸× + تلفظ فارسی + واژهٔ قابل‌خواندن + شکل‌یادسپار + جفت あ/お side-by-side.
  - **C (نوشتن):** تمرین نوشتن درون‌کارت با ۳ حالت (نمایش ترتیب / نوشتن روی الگو / نوشتن از حافظه) زنده.
  - **D (Auto-next):** پاسخ صحیح → پیشروی خودکار ~۲٫۲s بدون کلیک اضافه؛ پاسخ غلط → «دوباره تلاش کن» + «سرنخ» بدون پیشروی.
  - **E (پایداری):** Refresh وسط ایستگاه → بنر «از همان‌جا ادامه دادی» + بازگشت به همان پرسش (۴/۱۱، う)؛ Back → نقشه «در جریان» → ورود مجدد → همان موقعیت. هویت per-browser: ‏`hanaso.learnerId.v1` + کوکی `hanaso_lid`.
  - **F (نقشه):** `svg mask#hanaso-trail-mask` با ۳۲ سوراخ روی گروه مسیر در DOM زنده؛ صفر خطای کنسول؛ موبایل ۳۹۰px بدون overflow افقی.
  - **KOTODAMA دست‌نخورده:** kotodama.ir 200 قبل/بعد.
- **شواهد:** `agent-ctx/tl08-shots-prod/` — ۳ اسکرین‌شات production (نقشهٔ دسکتاپ full · KanaCard v2 · نقشهٔ موبایل).
- **PR #115:** mergeable_state=clean (۱۸ commit · ۴۳۲ فایل) — ادغام در انتظار بازبینی مالک (طبق CP-3 مأموریت TL-07).
- **وضعیت مأموریت: تکمیل** — گزارش کامل: [FINAL-REPORT.fa.md](FINAL-REPORT.fa.md).
