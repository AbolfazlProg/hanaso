# دستور واحد به‌روزرسانی HANASO روی VPS — نسخهٔ ۳ (چند‌مسیری + SHA-256 واقعی)

**تاریخ:** ۲۰۲۶-۱۱-۰۸ · **مأموریت:** TASK-HANASO-DEPLOY-05
**Repository:** `https://github.com/AbolfazlProg/hanaso` — **عمومی (Public)**؛ دریافت کد با HTTPS ناشناس و **بدون هیچ GitHub Token / Password / Deploy Key**
**نسخهٔ هدف (Pin شده):** `1.0.0-tl08-cta01` @ کامیت `575b8dd8efeaa3e0cbc53bf134a6b71d80b130d4` (شاخهٔ `tl08-cta01`) — بدون تأیید مالک عوض نمی‌شود
**کامیت ابزار استقرار (Pin شده):** `7c4f02fe9fe26d8f8ee5518dfe2defd7441c63d7` (شاخهٔ `tl08-deploy05`)
**SHA-256 فایل bootstrap (Pin شده):** `bee61184d0d7ea605a10254ff8b6a8c9218d7efd9846345a354abb03dc265941`

نسخهٔ ۳ راهنما است. مشکل نسخهٔ ۲ روی VPS شما ثابت شد: **وابستگی اجباری به `raw.githubusercontent.com`** — در حالی که طبق آزمایش واقعی شما (۲۰۲۶-۱۱-۰۸):

| مسیر                                               | وضعیت واقعی روی VPS شما                              |
| -------------------------------------------------- | ---------------------------------------------------- |
| `github.com` (Git ناشناس)                          | ✅ کار می‌کند (`git ls-remote` بدون Credential موفق) |
| `api.github.com`                                   | ✅ HTTP 200                                          |
| `codeload.github.com`                              | ✅ HTTP 200                                          |
| `raw.githubusercontent.com` — IP `185.199.108.133` | ✅ HTTP 200                                          |
| `raw.githubusercontent.com` — سه IP دیگر           | ❌ SSL Connection Timeout (و IPv6 هم نیست)           |

در نسخهٔ ۳: **`raw.githubusercontent.com` دیگر مسیر اجباری نیست**، بلکه فقط «مسیر جایگزین» است (و تنها روی IP ثابتِ آزمایش‌شدهٔ شما، بدون خاموش‌کردن TLS). مسیرهای اصلی = GitHub API و Codeload روی کامیت دقیق Pin‌شده، و **SHA-256 واقعی فایل** قبل از هر اجرایی بررسی می‌شود (جایگزین marker نسخهٔ ۲).

## ۱) دستور واحد

این **یک خط** را در ترمینال **سرور** (به‌عنوان root) کپی و اجرا کنید — همین:

```bash
bash -c 'set -euo pipefail; H=AbolfazlProg/hanaso; R=7c4f02fe9fe26d8f8ee5518dfe2defd7441c63d7; W=bee61184d0d7ea605a10254ff8b6a8c9218d7efd9846345a354abb03dc265941; P=infra/deploy/bootstrap-hanaso.sh; command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found — install once: apt-get install -y curl" >&2; exit 1; }; command -v sha256sum >/dev/null 2>&1 || { echo "ERROR: sha256sum not found (coreutils)" >&2; exit 1; }; T="$(mktemp /tmp/hanaso-bootstrap.XXXXXX.sh)"; X="$(mktemp -d /tmp/hanaso-dl.XXXXXX)"; trap "rm -f \"$T\"; rm -rf \"$X\"" EXIT; GOT=""; echo "[hanaso] pinned bootstrap commit ${R:0:12} — download paths: api.github.com -> codeload.github.com -> raw(pinned IP 185.199.108.133) -> raw(dns)"; if curl -fsSL --connect-timeout 10 --max-time 60 -H "Accept: application/vnd.github.raw" "https://api.github.com/repos/${H}/contents/${P}?ref=${R}" -o "$T"; then GOT="api.github.com"; else echo "[hanaso] 1/4 api.github.com FAILED (real curl error above) — trying codeload" >&2; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 300 "https://codeload.github.com/${H}/tar.gz/${R}" -o "$X/src.tgz"; then if tar -xzf "$X/src.tgz" -C "$X" --strip-components=1 "hanaso-${R}/${P}" 2>/dev/null; then mv "$X/${P}" "$T"; GOT="codeload.github.com"; elif tar -xzf "$X/src.tgz" -C "$X"; then mv "$X/hanaso-${R}/${P}" "$T"; GOT="codeload.github.com"; else echo "[hanaso] codeload tarball fetched but extraction FAILED (tar error above)" >&2; fi; else echo "[hanaso] 2/4 codeload.github.com FAILED (real curl error above) — trying raw with the pinned IP" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --resolve raw.githubusercontent.com:443:185.199.108.133 --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via pinned IP 185.199.108.133"; else echo "[hanaso] 3/4 raw(pinned IP) FAILED (real curl error above) — trying raw via DNS" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via DNS"; else echo "[hanaso] 4/4 raw(dns) FAILED (real curl error above)" >&2; fi; fi; [ -n "$GOT" ] || { echo "ERROR: ALL bootstrap download paths failed — the real errors are printed above; NOTHING was executed or changed" >&2; exit 1; }; A="$(sha256sum "$T" | cut -d" " -f1)"; if [ "$A" != "$W" ]; then echo "ERROR: bootstrap SHA-256 MISMATCH — got ${A}, want ${W} (via ${GOT}). NOTHING was executed; nothing was changed" >&2; exit 1; fi; echo "[hanaso] bootstrap verified — sha256 ${A:0:16} OK (via ${GOT}) — starting pinned installer"; HANASO_DEPLOY_SHA="$R" bash "$T" "$@"' hanaso-updater
```

- همین دستور در `OWNER-COMMAND.txt` (ریشهٔ Repository) هم هست — کپی از هر دو یکسان است.
- اگر با کاربر غیر root هستید، به‌جای `bash -c` از `sudo bash -c` استفاده کنید (بقیه عیناً یکسان).
- این دستور **هیچ Username/Password/Token نمی‌پرسد، هیچ فایلی را دستی ویرایش نمی‌کند و هیچ Placeholderی ندارد.**

### زیرفرمان‌های اختیاری

به انتهای دستور (بعد از `hanaso-updater`) اضافه کنید:

```bash
…(دستور بخش ۱)… hanaso-updater status     # گزارش فقط-خواندنی
…(دستور بخش ۱)… hanaso-updater rollback   # بازگشت به image قبلی (دیتابیس دست‌نخورده)
```

## ۲) زنجیرهٔ دریافت — چهار مسیر مستقل + گیت SHA-256

1. **`api.github.com`** — فایل bootstrap از Contents API روی **کامیت دقیق** `7c4f02f` (Accept: raw). حجم چند کیلوبایت. اگر ۴۰۳ Rate-limit ناشناس گرفت، **خودکار** به مسیر بعدی می‌رود (خطای واقعی curl چاپ می‌شود).
2. **`codeload.github.com`** — تاربال کامل ریپو روی همان کامیت؛ فقط همان یک فایل استخراج می‌شود (آزمایش واقعی: ساختار و بایت‌ها عین Git است).
3. **`raw.githubusercontent.com` با IP ثابت `185.199.108.133`** — از طریق `curl --resolve`؛ **بازبینی Certificate کاملاً روشن می‌ماند** (SNI و نام میزبان همان raw.githubusercontent.com است). این مسیر فقط «جایگزین» است، هرگز مسیر تنها نیست.
4. **`raw.githubusercontent.com` با DNS** — آخرین تلاش (روی VPS شما معمولاً timeout می‌خورد؛ بی‌ضرر و محدود به ۱۰ ثانیه).

سپس **SHA-256 واقعی فایل دانلودشده** با مقدار Pin‌شدهٔ بالا مقایسه می‌شود — **قبل از هر اجرایی**. فایل خراب، صفحهٔ خطای پروکسی یا هر محتوای دستکاری‌شده هرگز اجرا نمی‌شود. اگر هر چهار مسیر شکست بخورد، هر چهار خطای واقعی چاپ و دستور **بدون هیچ تغییری** متوقف می‌شود.

## ۳) بعد از دانلود چه اتفاقی می‌افتد؟

| فاز              | کار                                                                                                                                                                                                                | تضمین                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Workspace منبع   | کلون ناشناس (یا fetch) در `/opt/hanaso-src` — **کاملاً جدا از `/opt/hanaso`** (محل داده‌ها و تنظیمات Production: compose + `.env` + `update-history` + volume بکاپ)؛ مسیر موجودِ غیر-git هرگز حذف/بازنویسی نمی‌شود | `.env`، دیتابیس و فایل‌های عملیاتی هرگز پاک نمی‌شوند |
| راستی‌آزمایی Pin | وجود کامیت هدف `575b8dd` و کامیت ابزار `7c4f02f`؛ اجرای updater از worktree ایزوله روی **دقیقاً همان کامیت** + مقایسهٔ SHA-256 خود bootstrap با همان کامیت                                                         | ضد drift؛ اسکریپت اجرایی = اسکریپت بازبینی‌شده       |
| Preflight        | root · Docker/Compose · دیسک (حداقل ۲.۵GB) · حافظه (~۱.۸GB) · کلیدهای `.env` فقط با نام · پروژهٔ compose = `hanaso` · سلامت خط پایه + شاهد kotodama.ir · گارد no-op اجرای مجدد                                     | قبل از هر تغییری می‌ایستد                            |
| Backup           | `.env` زمان‌دار + بکاپ واقعی دیتابیس (`pg_dump -Fc` با تأیید ok/bytes)                                                                                                                                             | اگر بکاپ نشود، **قبل از هر تغییر** متوقف می‌شود      |
| Build            | ساخت image روی خود VPS از worktree روی کامیت Pin‌شده (`NEXT_PUBLIC_APP_VERSION=1.0.0-tl08-cta01`)                                                                                                                  | بدون نیاز به Registry/Token                          |
| Update مرحله‌ای  | تعویض `HANASO_WEB_IMAGE` → postgres (سالم) → pgbouncer (سالم) → migrate یک‌بارمصرف idempotent → `up -d web worker`                                                                                                 | ترتیب استاندارد استقرار مرحله‌ای                     |
| Health gate      | `ok:true` + تطبیق کامیت + نسخه روی `127.0.0.1:3100` → `/api/ready` (database: ok) → مسیر عمومی `learn.kotodama.ir` → smoke → اسکن لاگ خطا                                                                          | هر ناهم‌خوانی = شکست                                 |
| KOTODAMA         | فقط شاهد HTTP قبل/بعد — باید **دقیقاً همان** باشد                                                                                                                                                                  | هرگز لمس نمی‌شود (فقط پروژهٔ `hanaso`)               |
| رول‌بک خودکار    | هر شکستِ بعد از تعویض: برگرداندن image قبلی + گیت سلامت + گزارش علت                                                                                                                                                | دیتابیس/داده هرگز حذف/ریست نمی‌شود                   |
| گزارش نهایی      | نسخه + کامیت + image + مسیر بکاپ + رکورد در `/opt/hanaso/update-history/` (بدون Secret)                                                                                                                            | شواهد قابل بازرسی                                    |

اجرای مجدد همان دستور روی همان نسخهٔ هدف = **no-op کامل**؛ فرایند idempotent است.

## ۴) پیش‌نیازهای یک‌باره (معمولاً از قبل موجودند)

```bash
git --version    || apt-get install -y git
curl --version   || apt-get install -y curl      # این نسخه فقط curl می‌خواهد (wget حذف شد)
docker version && docker compose version
```

**هیچ تنظیم Credential یا Token لازم نیست.** تست مستقل: `git ls-remote https://github.com/AbolfazlProg/hanaso.git HEAD` باید بدون پرسیدن Username جواب بدهد (روی VPS شما جواب داده است).

## ۵) راستی‌آزمایی بعد از اجرا

```bash
curl -sS https://learn.kotodama.ir/api/health
# انتظار: {"ok":true, "version":"1.0.0-tl08-cta01", "commit":"575b8dd8efeaa3e0…"}
```

## ۶) اگر مشکلی پیش آمد

- **۴۰۳ از api.github.com (Rate-limit ناشناس ۶۰req/h):** طبیعی و بی‌ضرر — دستور خودکار به Codeload می‌رود و پیام `[hanaso] 1/4 api.github.com FAILED …` را همراه خطای واقعی چاپ می‌کند. (همین رفتار در سندباکس به‌صورت واقعی اجرا و ثبت شد.)
- **شکست همهٔ مسیرها:** هر چهار خطای واقعی چاپ می‌شوند؛ هیچ چیزی اجرا/تغییر نمی‌کند. مسیر شمارهٔ ۳ فقط با همان IP ثابتِ شما کار می‌کند؛ اگر GitHub آن IP را عوض کند، فقط همان مسیر جایگزین از کار می‌افتد (مسیرهای اصلی API/Codeload مستقل‌اند).
- **SHA-256 MISMATCH:** یعنی فایل رسیده با کامیت Pin‌شده یکی نیست (فایل خراب/پروکسی/ریپو دستکاری‌شده). دستور متوقف می‌شود؛ **هیچ چیز اجرا نمی‌شود**.
- **شکست midway (build/migrate/health):** رول‌بک خودکار + چاپ علت؛ دیتابیس دست‌نخورده.
- **بازگشت دستی:** زیرفرمان `rollback`. **گزارش وضعیت:** زیرفرمان `status` (فقط-خواندنی).
- **TLS هرگز خاموش نمی‌شود:** هیچ‌جا `-k`/`--insecure` نیست؛ مسیر IP ثابت با `--resolve` است که Certificate را کامل بررسی می‌کند.

## ۷) یکپارچگی و امنیت

- **زنجیرهٔ Pin:** کامیت ابزار `7c4f02f` (تغییرناپذیر) در URL هر چهار مسیر + SHA-256 واقعی bootstrap (`bee61184…`) در خود دستور + کامیت هدف `575b8dd` درون هر دو اسکریپت. `latest` و شاخهٔ متحرک وجود ندارد.
- **بدون Secret در هیچ‌جا:** نه در URL، نه در فرمان، نه در لاگ، نه در رکوردهای `update-history`.
- **اسکن کامل تاریخچهٔ Repository قبل از عمومی‌شدن:** صفر Secret واقعی (CP-14) — ریپو عمومی می‌ماند؛ Knowledge Base جدا و private می‌ماند.

## ۸) آزمون‌های انجام‌شده و محدودیت‌های صادقانه

- **هارنس تحویل (`infra/deploy/sandbox-tests/run-deploy05.sh`): همان دستورِ عینِ این راهنما** (استخراج‌شده از `OWNER-COMMAND.txt`) در شبیه‌سازی ایزوله با mirror محلی از خود Repository — چون Pinها واقعی‌اند، کامیت هدف واقعی `575b8dd` نصب و فیکسچر = وضعیت واقعی Production فعلی (`fdddad34`/`1.0.0-tl08-a5r`): **۱۳ گروه سناریو / ۹۰ ادعا همه PASS** — موفقیت از API، fallback واقعی ۴۰۳→Codeload، مسیر IP ثابت با `--resolve`، مسیر DNS، شکست هر چهار مسیر (هیچ‌چیز اجرا نشد)، فایل دستکاری‌شده و صفحهٔ HTML (رد شدن در SHA-256)، اجرای مجدد no-op، status فقط-خواندنی، رفت‌وبرگشت rollback، شکست migrate با رول‌بک خودکار + invariant سراسری KOTODAMA/TLS.
- **هارنس رگرسیون updater (`run-deploy04.sh`): ۲۰ سناریو / ۱۱۰ ادعا همه PASS** (S17/S18 به گیت SHA-256 واقعی به‌روز شد).
- **اجرای واقعی همین دستور در سندباکس (شبکهٔ واقعی GitHub):** بار اول `api 403 → codeload → SHA-256 OK → کلون ناشناس → راستی‌آزمایی دو کامیت → توقف صادقانه در نبود deploy dir`؛ بار دوم `api 200 مستقیم + مسیر fetch`. هر دو مسیر اصلی واقعاً دیده شدند.
- **محدودیت‌های صادقانه:** Docker واقعی در سندباکس نیست — آزمون‌های sandbox جریان کنترل/ترتیب/رول‌بک/SHA-256/حفاظت KOTODAMA را می‌سنجند، نه Docker build واقعی را. IP خروجی سندباکس Budget ناشناسِ API را دائماً مصرف می‌کند (۴۰۳) — همین، fallback را به‌صورت واقعی اثبات کرد؛ روی VPS شما API خودتان ۲۰۰ داده است. استقرار نهایی طبق طراحی، **با اجرای همین یک دستور توسط شما** انجام می‌شود؛ هیچ ادعای «منتشرشده» قبل از اجرای شما مطرح نیست.
