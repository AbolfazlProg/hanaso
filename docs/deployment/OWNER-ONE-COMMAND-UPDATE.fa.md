# دستور واحد به‌روزرسانی HANASO روی VPS — نسخهٔ ۹ (انتشار HANASO-16)

**تاریخ:** ۲۰۲۶-۱۱-۱۱ · **مأموریت:** TASK-HANASO-16 (مسیر یادگیری تدریجی + بازیابی انتشار)
**Repository:** `https://github.com/AbolfazlProg/hanaso` — **عمومی (Public)**؛ دریافت کد با HTTPS ناشناس و **بدون هیچ GitHub Token / Password / Deploy Key**
**نسخهٔ هدف (Pin شده):** `1.0.0-hanaso16-r01` @ کامیت `840b99335b0c23888d92e0e780b5988f12d06709` (شاخهٔ `hanaso16-learning-journey`) — بدون تأیید مالک عوض نمی‌شود
**کامیت ابزار استقرار (Pin شده):** `ee29578e43fe04647800dd769f186c31ff71ac2b` (شاخهٔ `hanaso16-learning-journey`)
**SHA-256 فایل bootstrap (Pin شده):** `7e45d4f931c13354f0c6400591eb3765bebca23feb60213943530cf4202838ae`

> **⚠️ حتماً قبل از اولین اجرا بخوانید — وضعیت فعلی خط مقدم:** در تاریخ ۲۰۲۶-۱۱-۱۱ مسیر عمومی **هر دو** دامنهٔ `learn.kotodama.ir` و `kotodama.ir` برای کل دنیا قطع است (راستی‌آزمایی از ۵ کشور: TLS با گواهی معتبر کامل می‌شود ولی سرور بدون پاسخ HTTP اتصال را می‌بندد؛ پورت ۸۰ هم refused). این خرابی **از قبل موجود** و مربوط به خط مقدم مشترک (HAProxy/nginx میزبان) است، **نه HANASO و نه این انتشار**. updater نسخهٔ ۹ این را در Preflight تشخیص می‌دهد، **قبل از هر تغییری** با پیام `INGRESS_PREEXISTING_BROKEN` متوقف می‌شود و دستورات تعمیر را چاپ می‌کند. **اول خط مقدم را تعمیر کنید، بعد همان دستور را اجرا کنید.** (اگر می‌خواهید به‌هرحال منتشر کنید: `HANASO_ALLOW_UNVERIFIED_INGRESS=1` را به‌صورت پیشوند env اضافه کنید — گیت‌های محلی App همچنان کامل برقرارند.)

نسخهٔ ۹ راهنما است. مکانیزم دریافت همان نسخهٔ ۳ است (چهار مسیر + گیت SHA-256 واقعی)؛ **مکانیزم سلامت به گیت سه‌سطحی v3.0 ارتقا یافت** و Pinها به انتشار TASK-HANASO-16 منتقل شدند. این انتشار شامل:

- **تمام تغییرات معوق TL-14** (که در انتشار ناموفق قبلی رول‌بک شد و هرگز live نشد): دک‌های اسلایدی ۱۲-۱۹ مرحله‌ای ۸ ایستگاه قواعد + ۶ گیت محتوایی + رفع ۱۰۲ تخلف واقعی.
- **مسیر یادگیری تدریجی جدید (Chapter → Section → Rows → Lessons):** `/learn` فصل فعال را از Progress واقعی انتخاب می‌کند (نه از Frontend)؛ در هر لحظه فقط یک بخش در پنل خودش دیده می‌شود؛ جابه‌جایی بین بخش‌ها فقط با دکمه‌های «بخش قبلی/بخش بعدی»؛ فصل‌های آینده هرگز فهرست نمی‌شوند (فقط از ۷۵٪ پیشرفت، یک کارت پیش‌نمایش کوچک از فصل بعدی)؛ تعداد کل فصل‌ها/بخش‌ها هیچ‌جا نمایش داده نمی‌شود؛ فصل‌های فهمیده‌شده در آرشیو قابل مرورند؛ کاربر جدید و بازگشتی با **۱ کلیک** داخل محتوای واقعی درس می‌روند.
- **رفع باگ واقعی learner-id در صفحات سرور** (همهٔ صفحات SSR بی‌صدا روی کاربر پیش‌فرض رندر می‌شدند) + مسدود شدن کامل دیپ‌لینک فصل قفل (معرفی/گیت/اتمام هم اکنون گیت دارند).

## ۱) دستور واحد

این **یک خط** را در ترمینال **سرور** (به‌عنوان root) کپی و اجرا کنید — همین:

```bash
bash -c 'set -euo pipefail; H=AbolfazlProg/hanaso; R=ee29578e43fe04647800dd769f186c31ff71ac2b; W=7e45d4f931c13354f0c6400591eb3765bebca23feb60213943530cf4202838ae; P=infra/deploy/bootstrap-hanaso.sh; command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found — install once: apt-get install -y curl" >&2; exit 1; }; command -v sha256sum >/dev/null 2>&1 || { echo "ERROR: sha256sum not found (coreutils)" >&2; exit 1; }; T="$(mktemp /tmp/hanaso-bootstrap.XXXXXX.sh)"; X="$(mktemp -d /tmp/hanaso-dl.XXXXXX)"; trap "rm -f \"$T\"; rm -rf \"$X\"" EXIT; GOT=""; echo "[hanaso] pinned bootstrap commit ${R:0:12} — download paths: api.github.com -> codeload.github.com -> raw(pinned IP 185.199.108.133) -> raw(dns)"; if curl -fsSL --connect-timeout 10 --max-time 60 -H "Accept: application/vnd.github.raw" "https://api.github.com/repos/${H}/contents/${P}?ref=${R}" -o "$T"; then GOT="api.github.com"; else echo "[hanaso] 1/4 api.github.com FAILED (real curl error above) — trying codeload" >&2; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 300 "https://codeload.github.com/${H}/tar.gz/${R}" -o "$X/src.tgz"; then if tar -xzf "$X/src.tgz" -C "$X" --strip-components=1 "hanaso-${R}/${P}" 2>/dev/null; then mv "$X/${P}" "$T"; GOT="codeload.github.com"; elif tar -xzf "$X/src.tgz" -C "$X"; then mv "$X/hanaso-${R}/${P}" "$T"; GOT="codeload.github.com"; else echo "[hanaso] codeload tarball fetched but extraction FAILED (tar error above)" >&2; fi; else echo "[hanaso] 2/4 codeload.github.com FAILED (real curl error above) — trying raw with the pinned IP" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --resolve raw.githubusercontent.com:443:185.199.108.133 --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via pinned IP 185.199.108.133"; else echo "[hanaso] 3/4 raw(pinned IP) FAILED (real curl error above) — trying raw via DNS" >&2; fi; fi; if [ -z "$GOT" ]; then if curl -fsSL --connect-timeout 10 --max-time 60 "https://raw.githubusercontent.com/${H}/${R}/${P}" -o "$T"; then GOT="raw.githubusercontent.com via DNS"; else echo "[hanaso] 4/4 raw(dns) FAILED (real curl error above)" >&2; fi; fi; [ -n "$GOT" ] || { echo "ERROR: ALL bootstrap download paths failed — the real errors are printed above; NOTHING was executed or changed" >&2; exit 1; }; A="$(sha256sum "$T" | cut -d" " -f1)"; if [ "$A" != "$W" ]; then echo "ERROR: bootstrap SHA-256 MISMATCH — got ${A}, want ${W} (via ${GOT}). NOTHING was executed; nothing was changed" >&2; exit 1; fi; echo "[hanaso] bootstrap verified — sha256 ${A:0:16} OK (via ${GOT}) — starting pinned installer"; HANASO_DEPLOY_SHA="$R" bash "$T" "$@"' hanaso-updater
```

- همین دستور در `OWNER-COMMAND.txt` (ریشهٔ Repository) هم هست — کپی از هر دو یکسان است.
- اگر با کاربر غیر root هستید، به‌جای `bash -c` از `sudo bash -c` استفاده کنید.
- این دستور **هیچ Username/Password/Token نمی‌پرسد و هیچ Placeholderی ندارد.**

### زیرفرمان‌های اختیاری

```bash
…(دستور بخش ۱)… hanaso-updater status     # گزارش فقط-خواندنی (حالا با هر سه سطح سلامت)
…(دستور بخش ۱)… hanaso-updater rollback   # بازگشت به image قبلی (دیتابیس دست‌نخورده)
```

## ۲) زنجیرهٔ دریافت — چهار مسیر مستقل + گیت SHA-256 (بدون تغییر از نسخهٔ ۳)

1. **`api.github.com`** — فایل bootstrap از Contents API روی **کامیت دقیق** `ee29578e` (Accept: raw).
2. **`codeload.github.com`** — تاربال کامل ریپو روی همان کامیت؛ فقط همان یک فایل استخراج می‌شود.
3. **`raw.githubusercontent.com` با IP ثابت `185.199.108.133`** — با `curl --resolve`؛ بازبینی Certificate کاملاً روشن می‌ماند.
4. **`raw.githubusercontent.com` با DNS** — آخرین تلاش (محدود به ۱۰ ثانیه).

سپس **SHA-256 واقعی فایل** با مقدار Pin‌شده مقایسه می‌شود — **قبل از هر اجرایی**. نکتهٔ عملی: برای کامیت‌های تازه‌push‌شده، codeload چند ده ثانیه تأخیر propagation دارد — اگر ۴۰۴ گرفتید، ~۴۵ ثانیه بعد دوباره اجرا کنید.

## ۳) گیت سلامت سه‌سطحی (جدید در v3.0 — درسِ آموخته از شکست انتشار tl14-r01)

در انتشار قبلی، همهٔ گیت‌های داخلی سبز بودند ولی پروب عمومی با `Empty reply` شکست خورد و updater **App سالم را بی‌دلیل رول‌بک کرد** — چون نمی‌توانست تشخیص دهد مسیر عمومی از قبل خراب بوده یا تازه خراب شده. نسخهٔ ۹ سه سطح را از هم تفکیک می‌کند:

| سطح                          | چه چیزی را می‌سنجد                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1 — Application**     | `127.0.0.1:3100/api/health` + `/api/ready` با کامیت و نسخهٔ دقیق Pin‌شده                                                                |
| **Tier 2a — Ingress-Direct** | خود Reverse Proxy روی همین Host با SNI/Host صحیح (`--resolve …:443:127.0.0.1`) — بدون DNS/NAT                                           |
| **Tier 2b — Public-Self**    | URL عمومی واقعی از خود VPS (مسیر کامل شامل Hairpin)                                                                                     |
| **Tier 3 — Independent**     | راستی‌آزمایی Endpoint عمومی از **بیرون VPS** (check-host.net — چند نود جهانی؛ اگر سرویس در دسترس نباشد صادقانه `UNVERIFIED` ثبت می‌شود) |

**تصمیم‌ها:** خرابی App یا شکستن مسیر در پنجرهٔ انتشار → **رول‌بک واقعی**. خرابی ازپیش‌موجود خط مقدم (در Preflight، قبل از هر تغییری) → **توقف کامل** با تشخیص صریح و دستور تعمیر — نه رول‌بکِ بی‌فایدهٔ App سالم. آرتیفکت Hairpin یا عدم‌تأیید بیرونی → انتشار می‌ماند با وضعیت صریح `EXTERNAL_UNVERIFIED` + راهنمای راستی‌آزمایی دستی. نتیجهٔ نهایی با برچسب `PUBLIC_CLASSIFICATION` در رکورد `update-history` ثبت می‌شود. هیچ Health Checkی با `|| true` دور زده نمی‌شود؛ Smoke روی سالم‌ترین مسیر موجود اجرا می‌شود.

## ۴) بعد از دانلود چه اتفاقی می‌افتد؟

| فاز              | کار                                                                                                               | تضمین                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Workspace منبع   | کلون ناشناس در `/opt/hanaso-src` — کاملاً جدا از `/opt/hanaso` (داده‌ها و تنظیمات Production)                     | `.env`، دیتابیس و فایل‌های عملیاتی هرگز پاک نمی‌شوند |
| راستی‌آزمایی Pin | کامیت هدف `840b993` و کامیت ابزار `ee29578e`؛ اجرای updater از worktree ایزوله روی همان کامیت + SHA-256 bootstrap | ضد drift                                             |
| Preflight        | همهٔ بررسی‌های قبلی + **Baseline عمومی سه‌سطحی جدید** (قبل از هر تغییری) + شاهد kotodama.ir                       | خرابی ازپیش‌موجود = توقف بدون هیچ تغییری             |
| Backup           | `.env` زمان‌دار + بکاپ واقعی دیتابیس (`pg_dump -Fc` با تأیید)                                                     | بدون بکاپ، هیچ تغییری انجام نمی‌شود                  |
| Build            | ساخت image روی خود VPS از کامیت Pin‌شده (`1.0.0-hanaso16-r01`)                                                    | بدون Registry/Token                                  |
| Update مرحله‌ای  | تعویض image → postgres → pgbouncer → migrate یک‌بارمصرف idempotent → `up -d web worker`                           | ترتیب استاندارد                                      |
| Health gate      | Tier 1 محلی (کامیت+نسخه) → Tier 2a/2b/3 عمومی طبقه‌بندی‌شده → smoke روی سالم‌ترین مسیر → اسکن لاگ                 | رول‌بک فقط برای شکست واقعی                           |
| KOTODAMA         | فقط شاهد HTTP قبل/بعد — باید دقیقاً همان باشد                                                                     | هرگز لمس نمی‌شود                                     |
| رول‌بک خودکار    | فقط خرابی App یا شکستن مسیر در پنجرهٔ انتشار                                                                      | دیتابیس/داده هرگز حذف نمی‌شود                        |
| گزارش نهایی      | نسخه + کامیت + image + `PUBLIC_CLASSIFICATION` + مسیر بکاپ + رکورد در `update-history/`                           | شواهد قابل بازرسی                                    |

## ۵) پیش‌نیازهای یک‌باره

```bash
git --version    || apt-get install -y git
curl --version   || apt-get install -y curl
docker version && docker compose version
python3 --version || apt-get install -y python3   # برای راستی‌آزمایی مستقل Tier 3
```

**هیچ تنظیم Credential یا Token لازم نیست.**

## ۶) راستی‌آزمایی بعد از اجرا

```bash
curl -sS https://learn.kotodama.ir/api/health
# انتظار: {"ok":true, "version":"1.0.0-hanaso16-r01", "commit":"840b993…"}
```

## ۷) اگر مشکلی پیش آمد

- **پیام `INGRESS_PREEXISTING_BROKEN`:** مسیر عمومی قبل از شروع خراب بوده (وضعیت فعلی!). **هیچ چیزی تغییر نکرده.** خط مقدم میزبان را تعمیر کنید: `systemctl status haproxy nginx` · `ss -tlnp | grep -E ':80|:443'` · `docker ps` · بررسی ACL/SNI و upstreamهای HAProxy/nginx. بعد همان دستور را اجرا کنید.
- **وضعیت `EXTERNAL_UNVERIFIED`:** App و پروکسی محلی سالم‌اند ولی مسیر عمومی از بیرون قابل تأیید نبود — از یک گوشی/شبکهٔ دیگر `https://learn.kotodama.ir/api/health` را باز کنید.
- **۴۰۳ از api.github.com:** طبیعی — خودکار به Codeload می‌رود.
- **SHA-256 MISMATCH:** فایل رسیده با کامیت Pin‌شده یکی نیست؛ هیچ‌چیز اجرا نمی‌شود.
- **شکست midway (build/migrate/health محلی):** رول‌بک خودکار + چاپ علت؛ دیتابیس دست‌نخورده.
- **بازگشت دستی:** زیرفرمان `rollback` · **گزارش وضعیت:** زیرفرمان `status`.

## ۸) یکپارچگی و امنیت

- **زنجیرهٔ Pin:** کامیت ابزار `ee29578e` در URL هر چهار مسیر + SHA-256 واقعی bootstrap (`7e45d4f9…`) + کامیت هدف `840b993` درون هر دو اسکریپت. `latest` و شاخهٔ متحرک وجود ندارد.
- **بدون Secret در هیچ‌جا** · TLS هرگز خاموش نمی‌شود (`-k`/`--insecure` ممنوع) · KOTODAMA/PostgreSQLهای مشترک/Redis/Reverse Proxy عمومی و Volumeهای آن‌ها برای انتشار HANASO دست نمی‌خورند.

## ۹) آزمون‌های انجام‌شده و محدودیت‌های صادقانه

- **رگرسیون updater (`run-deploy04.sh`): ۱۴۰/۱۴۰ ادعا PASS** (۱۱۰ موجود + ۳۰ جدید گیت سه‌سطحی G1-G6 — از جمله بازتولید دقیق حادثهٔ tl14-r01: توقف قبل از هر تغییر، بدون رول‌بک بی‌فایده).
- **محصول:** ۶۵۱/۶۵۱ تست واحد · EQA ۳۷/۳۷ · tsc/eslint ✓ · Build تولیدی ✓ · ۹/۹ سناریوی مرورگر واقعی (۳۹۰/۷۶۸/۱۴۴۰، قبل/بعد).
- **تحویل این نسخه به GitHub:** سشن توسعه به توکن Push دسترسی نداشت (توکن با بازیافت سندباکس حذف شد) — شاخهٔ کامل `hanaso16-learning-journey` در **Git Bundle** کنار همین راهنما تحویل شده است (`hanaso-hanaso16.bundle` + دستور دقیق Push). Pinهای بالا بعد از Push بدون هیچ تغییری معتبرند (کامیت‌ها تغییرناپذیرند).
- **محدودیت صادقانه:** Docker واقعی و VPS در سندباکس نیست؛ استقرار واقعی طبق طراحی با اجرای همین یک دستور توسط شما انجام می‌شود و تا پیش از تعمیر خط مقدم، به‌درستی متوقف خواهد شد.
