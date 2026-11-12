# CHECKPOINT_LOG — TASK-HANASO-18 (اصلاح و آزمون کامل لایهٔ تحویل v10.1)

> مأموریت: ادامهٔ تحویل HANASO-17 — «یک‌خطی تست‌شده تحویل بده». شاخهٔ کاری: `hanaso17-home-dashboard` (همان شاخهٔ انتشار؛ Pinها دست‌نخورده). تاریخ: ۲۰۲۶-۱۱-۱۲/۱۳.

## CP-01 — بازیابی وضعیت و کشف شکاف

- Production زنده: `1.0.0-hanaso16-r01` @ `777fb2b` (`/api/health` → `ok:true`، ۲۰۲۶-۱۱-۱۲) — مالک هنوز v10 را اجرا نکرده است؛ kotodama.ir هم 200.
- شاخهٔ `hanaso17-home-dashboard` روی GitHub @ `9127c1a` (پایان HANASO-17)؛ ادعای CHECKPOINT_LOG هفده: «یک‌خطی v10 با bash -n + اجرای واقعی در سندباکس راستی‌آزمایی شد».
- **اجرای واقعی `run-deploy05.sh` روی همان tip: FATAL — one-liner not found.** استخراج‌کننده فقط الگوی تک‌خطی v9 (`bash -c '…`) را می‌شناخت؛ مجموعهٔ کامل هرگز روی بلوک heredoc v10 اجرا نشده بود. TEST_REPORT هفده نیز هیچ شواهدی از deploy04/deploy05 ثبت نکرده بود.
- **باگ واقعی در خود بلوک v10:** فراخوانی `bash <<'HANASO-V10'` راهی برای عبور آرگومان ندارد؛ بخش «OPTIONAL SUBCOMMANDS» مستندات هنوز الگوی v9 («… hanaso-updater status») را توصیه می‌کرد که در heredoc معنایی ندارد — زیرفرمان‌های `status`/`rollback` عملاً غیرفعال بودند. مستندات فارسی نیز Pinهای کهنهٔ HANASO-16 (`ee29578e`/`840b993`/`7e45d4f9`) و توصیف «چهار مسیر» را داشت.

## CP-02 — اصلاح بلوک v10.1 (Pinها بدون تغییر)

- `OWNER-COMMAND.txt`: خط اول → `bash -s -- <<'HANASO-V10'` (قابل عبور زیرفرمان)؛ خط آخر → `HANASO_DEPLOY_SHA="$R" HANASO_TARGET_SHA="$D" bash "$T" "$@"`؛ گزارش مسیر تحویل (`bootstrap delivered via …`)؛ پیام صریح شکست هر دو مسیر و شکست استخراج تاربال (خطای واقعی tar پنهان نمی‌شود)؛ دستور زیرفرمان = افزودن کلمه به خط اول (`bash -s -- status <<'HANASO-V10'`)؛ sudo برای ساختار heredoc.
- `docs/deployment/OWNER-ONE-COMMAND-UPDATE.fa.md`: همان اصلاحات + به‌روزرسانی وضعیت خط مقدم (تعمیرشده) + §۲ دو مسیر + Pinهای صحیح + §۹ شواهد واقعی.
- **رشتهٔ یکپارچگی دست‌نخورده:** R=`aaa5fea4` · W=`03ee6e74…` · D=`3f41f6ee` — چون `bootstrap-hanaso.sh` و `update-hanaso.sh` تغییری نکردند، SHA-256 و خودآزمایی بایت‌به‌بایت bootstrap معتبر می‌ماند (P0 همین را assert می‌کند).

## CP-03 — هارنس v2 و آزمون کامل

- `run-deploy05.sh` برای بلوک heredoc بازنویسی شد: استخراج عین بلوک از `OWNER-COMMAND.txt`؛ تزریق زیرفرمان به خط اول دقیقاً مثل راهنمای مالک؛ فیکسچر هم‌آینهٔ production واقعی (`777fb2b`/`1.0.0-hanaso16-r01` → `3f41f6ee`/`1.0.0-hanaso17-r01`)؛ سناریوی جدید P5 (تاربال خراب codeload با `SIM_DL_CODELOAD=corrupt` در mock-curl)؛ P12 با قرارداد v10 (هیچ raw، هیچ `--resolve`).
- **نتیجه: deploy05 = ۹۵/۹۵ PASS** (P0 ایمنی ایستا ۲۷ ادعا · P1..P11 · P12 جاروی سراسری).
- **deploy04 = ۱۴۰/۱۴۰ PASS** (بازاجرا؛ مکانیک updater و گیت سه‌سطحی G1-G6 دست‌نخورده).
- **مسیرهای واقعی بدون Mock (۲۰۲۶-۱۱-۱۲):** api.github.com از IP سندباکس ۴۰۳ (سهمیهٔ ناشناس — همان سناریوی P2)؛ codeload.github.com → تاربال کامل و SHA-256 فایل استخراج‌شده بایت‌به‌بایت `03ee6e74…`.
- گزارش کامل: `DELIVERY_LAYER_TEST_REPORT.md` (همان پوشه).

## CP-04 — تحویل

- کامیت این اصلاحات روی همان شاخهٔ `hanaso17-home-dashboard`؛ ادعا فقط با خروجی واقعی فرمان‌ها (بالا).
- بستهٔ تحویل برای مالک: `download/TASK-HANASO-18-DELIVERY/` (بلوک نهایی تست‌شده + راهنمای اجرا + شواهد).
- قدم بعدی مالک: اجرای همان بلوک v10.1 روی VPS → راستی‌آزمایی `/api/health` → `1.0.0-hanaso17-r01 @ 3f41f6ee`.
