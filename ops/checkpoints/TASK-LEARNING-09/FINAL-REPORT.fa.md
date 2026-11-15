# گزارش نهایی — TASK-LEARNING-09

> بازطراحی دقیق چیدمان دسکتاپ/تبلت/موبایل HANASO + بازگرداندن داستان‌های یادسپار Kana
> تاریخ: ۲۰۲۶-۱۱-۰۹ · شاخه: `tl09-responsive` · کامیت‌ها: `e9c7712` → `2cc4a21` → `bb85a93` → `2b1af87` → `1e293f4` → `988bcc6` (ریلیز) → `41161f0` (پین استقرار) → `eece530` (اسناد مالک) — همگی push شد.

---

## ۱) دقیقاً چه مشکلاتی در هر سه اندازه پیدا شد؟

**دسکتاپ (اندازه‌گیری DOM در Chromium واقعی):**

- کل محتوای درس در `max-w-2xl` = ۶۷۲px در مرکز صفحه → در ۱۴۴۰px یعنی ۷۶۸px فضای خالی دو طرف؛ در ۱۹۲۰ بدتر.
- داخل کارت، گرید flex از `lg:` فعال می‌شد ولی عرض موجود فقط ~۶۰۰px بود → ستون canvas به ۲۸۹px و ستون آموزش به ۲۸۹px «له» می‌شدند (canvas موبایلیِ بزرگ‌شده — دقیقاً تشخیص مالک).
- بلوک واژگان (مثال‌ها) کارت‌های تمام‌عرضِ پشته‌ای: ۵ کارت ≈ ۲۰۰۰px ارتفاع.

**تبلت:**

- تا ۱۰۲۳px همه‌چیز تک‌ستونه بود؛ در ۷۶۸ کل ارتفاع پیاده‌روی ۲۶۸۱px با canvas ۴۱۶px وسط و فضای خالی کنارش — فضای افقی عملاً استفاده نمی‌شد.

**موبایل:**

- پنلِ روایت ضربه‌ها (stroke-info) در «ستون آموزش» بود که هنگام تمرین بعد از فولدهای خوانش/واژه می‌آمد → بخش‌های مرتبط از هم جدا افتاده بودند.
- فاصله‌ها یکنواخت (gap-4/gap-5) بدون تمایز گروه‌های معنایی؛ اسلات اکشن min-h ثابت ۱۰۴px.
- «واژهٔ قابل‌خواندن» (あう) جدا از «نمونه‌های کاربردی» بود و あ**و** دوبار رندر می‌شد.
- هیچ داستان یادسپاری نمایش داده نمی‌شد (علت §۱۵ در بند ۵).

## ۲) تغییرات دسکتاپ

- کانتینر درس: `max-w-2xl md:max-w-[50rem] lg:max-w-[64rem] xl:max-w-[72rem]` → سقف ۱۱۵۲px (بازهٔ ۱۱۰۰–۱۲۵۰ مأموریت؛ تنظیم‌شده با هدر sticky و بدون عدد کورکورانه).
- KanaCard یک **Container Query** واقعی شد (`@container`): از ۴۲rem محتوایی، گرید دو‌ستونهٔ `minmax(19rem,26rem)` (canvas — هرگز بیشتر از ۲۶rem) + `minmax(19rem,34rem)` (اطلاعات — طول خط خوانا) با `justify-center`؛ نتیجهٔ اندازه‌گیری در ۱۴۴۰: **canvas 416px + اطلاعات 544px**؛ ارتفاع صفحه ۲۰۱۷→۱۷۰۱ (−۱۵٪).
- ستون اصلی = canvas + نقاط پیشرفت + اسلات اکشن + پنل مرحله (روایت زنده); ستون مکمل = خوانش/صوت + نکات نوشتن + داستان یادسپار + جفت اشتباه‌پذیر.
- بخش واژگان ادغام‌شده با گرید `auto-fit minmax(19.5rem,1fr)` → کارت‌ها ۲/۳ ستونه؛ بلوک example-set مستقل: ۵ کارت → ۳×۳۶۵px (ارتفاع ۲۰۰۰→۸۴۲px).
- گزینه‌های تمرین از نوار ۱۰۷۸px → گرید ۲ ستونه (۵۳۵px) از ۶۴۰px.
- در ۱۹۲۰: همان گرید 416+544 با حاشیهٔ آرام — «استفادهٔ هوشمندانه، نه پر کردن اجباری».

## ۳) تغییرات تبلت

- همان Container Query از ۴۲rem فعال می‌شود → **۷۶۸: دو ستون ۳۳۵px+۳۳۵px** (ارتفاع ۲۶۸۱→۱۶۳۲، **−۳۹٪**)؛ **۹۶۱: ۳۵۱px+۳۵۱px**؛ کارت‌ها هرگز از حداقل ۱۹rem تنگ‌تر نمی‌شوند (کیفیت مقدم بر تعداد ستون — اگر عرض real نبود، تک‌ستونِ منظم می‌ماند).
- ۱۰۲۴: دو ستون با canvas 416px؛ ۱۲۸۰/۱۳۶۶/۱۴۴۰/۱۹۲۰: رفتار دسکتاپ.

## ۴) تغییرات موبایل

سه گروه معنایی طبق §۵ مالک با ریتم جدید (بین‌گروه ۲۴px / درون‌گروه ۱۲px):

1. **رسم و ترتیب نوشتن:** canvas + نقاط + اسلات اکشن + پنل مرحله — پنل روایت الان همیشه کنار canvas است (حتی هنگام تمرین).
2. **شناخت و تلفظ:** خوانش+صوت، نکات نوشتن، داستان یادسپار، جفت اشتباه‌پذیر.
3. **واژگان:** بخش ادغام‌شده «نمونه‌های قابل‌خواندن».

- min-h پرکننده حذف شد (اسلات اکشن) — چون هیچ‌چیز بالای canvas تغییر نمی‌کند، canvas بدون فیلر بی‌حرکت می‌ماند.
- نوار کنترل‌ها در ۳۶۰: بدون هم‌پوشانی (اندازه‌گیری مستقیم)، Header دوخطی تمیز.

## ۵) ادغام/بازآرایی محتوا

- «واژهٔ قابل‌خواندن» + «نمونه‌های کاربردی» → **«نمونه‌های قابل‌خواندن»**: واژهٔ میزبان = کارت لنگر (کپشن + ظهور پله‌ای حروف + صدای مستقل + روماجی)؛ بقیهٔ مثال‌ها؛ **دی‌داپ روی واژه** (あう فقط یک‌بار — با تست پین‌شده).
- غنی‌سازی: خوانش فارسی کارت لنگر از مثالِ همسانِ همان واژه برداشته می‌شود (あう → «آو»).
- **بازگشت داستان‌های یادسپار (§۱۵):** علت حذف = کامیت `cf3eb36` (Addendum-3 §11) که رندر را فقط به `status==='approved'` گره زد، در حالی که بازبینی انسانی OQ-051 هرگز انجام نشد و هر ۹۲ داستان draft بودند → کل قابلیت خاموش. راه‌حل: گیت برداشته شد؛ هر ۹۲ داستانِ موجود (از TASK-LEARNING-08 WP-2، بازنویسی‌شده به استاندارد مالک) با برچسب صادق «داستانِ یادسپار» برمی‌گردند — badge پیش‌نویس حذف می‌ماند، وضعیت داده دست‌نخورده، بدون داستان تازهٔ تولیدشده.
- فولد تمرین یکپارچه: «اطلاعات معرفی — تلفظ، یادسپار و جفت مشابه» (خوانش+یادسپار+جفت) + فولد مثال‌ها؛ نکات نوشتن باز می‌مانند.

## ۶) نتایج همهٔ Breakpointها

| عرض       | ساختار  | canvas | اطلاعات | overflow افقی |
| --------- | ------- | ------ | ------- | ------------- |
| 360       | تک‌ستون | 294px  | —       | **۰**         |
| 390       | تک‌ستون | 324px  | —       | **۰**         |
| 430       | تک‌ستون | 364px  | —       | **۰**         |
| 768       | دو ستون | 335px  | 335px   | **۰**         |
| 961       | دو ستون | 351px  | 351px   | **۰**         |
| 1024      | دو ستون | 416px  | 512px   | **۰**         |
| 1280/1366 | دو ستون | 416px  | 544px   | **۰**         |
| 1440      | دو ستون | 416px  | 544px   | **۰**         |
| 1920      | دو ستون | 416px  | 544px   | **۰**         |

Breakpointها براساس نیاز واقعی محتوا انتخاب شدند (Container Query + minmax + auto-fit — بدون مدیاکوئری پراکنده).

## ۷) Screenshotهای قبل/بعد

`agent-ctx/tl09-shots/before/` (۹ فایل: ۳۶۰/۳۹۰/۷۶۸/۹۶۱/۱۲۸۰/۱۴۴۰×۲/۱۹۲۰) و `agent-ctx/tl09-shots/after/` (۲۱ فایل: همهٔ اندازه‌ها × ۴ پروفایل محتوا あ/え/き/か + نمای ready + نمای تمرین + بلوک‌های example-set/تمرین) — همه با agent-browser (Chromium واقعی)، commit `2cc4a21`، داخل ریپو.

## ۸) استفادهٔ واقعی از Skillها

- **fullstack-dev:** init کامل؛ محیط pnpm؛ dev سرور HANASO روی پورت ۳۰۰۰ از طریق مکانیزم dev.sh پلتفرم (سرور خراب scaffold جایگزین شد)؛ قواعد UI/Responsive/Live-Preview رعایت شد.
- **agent-browser (Browser Testing):** ممیزی هندسهٔ DOM در ۹ اندازه + اسکرین‌شات واقعی + تست تعامل (CTA/اسکرول/قضاوت ضربه/Replay/فولدها/بازیابی walk) + تماشای CI روی github.com.
- **VLM (z-ai vision):** بازبینی مکمل سه اسکرین‌شاتب کلیدی (دسکتاپ ready/تبلت/موبایل) — تأیید تعادل ستون‌ها و خوانایی؛ یک false-positive (کاغذ سفید canvas) با اندازه‌گیری DOM رد شد.
- قواعد Prettier/stylelint/eslint/typecheck مطابق دروازه‌های ریپو اجرا شد.

## ۹) Live Preview

`https://preview-chat-7136d8b9-b732-4cbc-9520-cec5d6a587f1.space-z.ai/` — HANASO واقعی (dev) از طریق Caddy پلتفرم روی پورت ۳۰۰۰؛ میزبان preview در `allowedDevOrigins` (رفع بلاک cross-origin توسعهٔ Next 16 — صفحهٔ درس قبل از آن اصلاً هیدراته نمی‌شد). مالک در طول کار از پنل Preview می‌دید.

## ۱۰) Commit و Branch نسخهٔ جدید

- شاخه: **`tl09-responsive`** (از `tl08-deploy05`).
- کامیت ریلیز (نصب‌شده توسط دستور): **`988bcc64c57d3ee555e3b2462b45b382b329a89c`** — نسخهٔ **`1.0.0-tl09-r01`**.
- کامیت ابزار استقرار: `41161f098c34b86fbe0f511245948a7acaab3e0d` · نوک شاخه: `eece530`.

## ۱۱) CI و EQA

**CI run #126 @ `eece530` — Success** (format/lint/typecheck/**۵۸۰ تست واحد**/EQA-1..7/integration روی PostgreSQL 18 واقعی/build/audit/smoke + job جداگانهٔ compose-smoke با دریل بکاپ + image→GHCR). #124 (فرمت docs) رد و همان لحظه رفع شد؛ #125 با قاعدهٔ concurrency لغو شد (بی‌ضرر). به‌علاوه ۲ اجرای زندهٔ عین دستور یک‌خطی روی شبکهٔ واقعی GitHub.

## ۱۲) دستور دقیق نصب یک‌دستوری VPS

عین فایل `OWNER-COMMAND.txt` (و راهنمای فارسی v4 — بایت‌به‌بایت یکسان). این **یک خط** را روی VPS به‌عنوان root اجرا کنید:

```bash
bash -c 'set -euo pipefail; H=AbolfazlProg/hanaso; R=41161f098c34b86fbe0f511245948a7acaab3e0d; W=fb33b06dc57f5face7b7e8da9f000872ad991860fbca097ee57a8088a7078ef4; P=infra/deploy/bootstrap-hanaso.sh; command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found — install once: apt-get install -y curl" >&2; exit 1; }; command -v sha256sum >/dev/null 2>&1 || { echo "ERROR: sha256sum not found (coreutils)" >&2; exit 1; }; T="$(mktemp /tmp/hanaso-bootstrap.XXXXXX.sh)"; X="$(mktemp -d /tmp/hanaso-dl.XXXXXX)"; trap "rm -f \"$T\"; rm -rf \"$X\"" EXIT; GOT=""; echo "anaso] pinned bootstrap commit ${R:0:12} — download paths: api.github.com -> codeload.github.com -> raw(pinned IP 185.199.108.133) -> raw(dns)"; if curl -fsSL --connect-timeout 10 --max-time 60 -H "Accept: application/vnd.github.raw" "https://api.github.com/repos/${H}/contents/${P}?ref=${R}" -o "$T"; then GOT="api.github.com"; else echo "anaso] 1/4 api.github.com FAILED (real curl error above) — trying codeload" >&2; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 300 "https://codeload.github.com/${H}/tar.gz/${R}" -o "$X/src.tgz"; then if tar -xzf "$X/src.tgz" -C "$X" --strip-components=1 "hanaso-${R}/${P}" 2>/dev/null; then mv "$X/${P}" "$T"; GOT="codeload.github.com"; elif tar -xzf "$X/src.tgz" -C "$X"; then mv "$X/hanaso-${R}/${P}" "$T"; GOT="codeload.github.com"; else echo "anaso] codeload tarball fetched but extraction FAILED (tar error above)" >&2; fi; else echo "anaso] 2/4 codeload.github.com FAILED (real curl error above) — trying raw with the pinned IP" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --resolve raw.githubusercontent.com:443:185.199.108.133 --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via pinned IP 185.199.108.133"; else echo "anaso] 3/4 raw(pinned IP) FAILED (real curl error above) — trying raw via DNS" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via DNS"; else echo "anaso] 4/4 raw(dns) FAILED (real curl error above)" >&2; fi; fi; [ -n "$GOT" ] || { echo "ERROR: ALL bootstrap download paths failed — the real errors are printed above; NOTHING was executed or changed" >&2; exit 1; }; A="$(sha256sum "$T" | cut -d" " -f1)"; if [ "$A" != "$W" ]; then echo "ERROR: bootstrap SHA-256 MISMATCH — got ${A}, want ${W} (via ${GOT}). NOTHING was executed; nothing was changed" >&2; exit 1; fi; echo "anaso] bootstrap verified — sha256 ${A:0:16} OK (via ${GOT}) — starting pinned installer"; HANASO_DEPLOY_SHA="$R" bash "$T" "$@"' hanaso-updater
```

- بدون Token/PAT/Deploy Key (ریپو عمومی) · مسیرهای اصلی API/Codeload (بدون وابستگی به raw) + SHA-256 واقعی قبل از اجرا · Backup → Build → Migrate → Health/Smoke → Rollback خودکار در صورت شکست · فقط HANASO (KOTODAMA فقط شاهد HTTP) · گزارش نسخه/کامیت در پایان.
- راستی‌آزمایی بعد از اجرا: `curl -sS https://learn.kotodama.ir/api/health` → انتظار `"version":"1.0.0-tl09-r01","commit":"988bcc64c57d3e…"`.

## ۱۳) باقی‌مانده‌ها (صادقانه)

- استقرار واقعی روی VPS هنوز انجام نشده — طبق سیاست، **با اجرای دستور بالا توسط مالک** انجام می‌شود؛ تست سندباکس Deploy واقعی نیست (Docker نیست).
- ستون اطلاعات برای کاناهای کم‌محتوا در دسکتاپ کوتاه‌تر از ستون canvas است (items-start؛ عمداً بدون کارت کشیده).
- صفحات journey-map و chapter-intro همچنان max-w-3xl (خارج از دامنهٔ «صفحهٔ درس»).
- ۸ گلیف بدون واژهٔ میزبان (T-76 قدیمی) همچنان بخش واژگان ندارند — بدون placeholder صادقانه.
- بازبینی انسانی محتوای ۹۲ داستان (OQ-051) همچنان با مالک است — داده‌ها draft مانده‌اند و برچسب UI صادق است.
- ادغام PR TL-08 (#115 اگر باز باشد) و سیاست merge با مالک است.

## ۱۴) آخرین Checkpoint

`ops/checkpoints/TASK-LEARNING-09/` — `CURRENT_STATE.md` (CP-03) · `CHECKPOINT_LOG.md` (CP-01→03) · `RESPONSIVE_QA_REPORT.md` (اعداد قبل/بعد + ماتریس محتوا) · همین `FINAL-REPORT.fa.md`.
