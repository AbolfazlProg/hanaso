# دستور واحد به‌روزرسانی HANASO روی VPS — نسخهٔ ۱۰ (انتشار HANASO-17)

**تاریخ:** ۲۰۲۶-۱۱-۱۲ · **مأموریت:** TASK-HANASO-17 (داشبورد خانه، ناوبری یکپارچه، مرور درس، انقضای Resume)
**Repository:** `https://github.com/AbolfazlProg/hanaso` — **عمومی (Public)**؛ دریافت کد با HTTPS ناشناس و **بدون هیچ GitHub Token / Password / Deploy Key**
**نسخهٔ هدف (Pin شده):** `1.0.0-hanaso17-r01` @ کامیت `3f41f6ee510e28914934ddc83375a0e1d49405a3` (شاخهٔ `hanaso17-home-dashboard`) — بدون تأیید مالک عوض نمی‌شود
**کامیت ابزار استقرار (Pin شده):** `1a34414f4ff8f9cdbfb00b17bf70119deb6142f6` (شاخهٔ `hanaso17-home-dashboard`)
**SHA-256 فایل bootstrap (Pin شده):** `03ee6e740db0860dd1149ca689ea2d84b9634becfc8f6a8e30632bb660770035`

> **✅ وضعیت خط مقدم (به‌روزرسانی ۲۰۲۶-۱۱-۱۲):** خرابی ازپیش‌موجود خط مقدم که در ۲۰۲۶-۱۱-۱۱ مستند شده بود، **توسط مالک تعمیر شد** و انتشار HANASO-16 با همان یک‌خطی روی Production فعال است (`/api/health` → `ok:true` @ `1.0.0-hanaso16-r01` — راستی‌آزمایی ۲۰۲۶-۱۱-۱۲). گیت سه‌سطحی همچنان سر جایش است: اگر خط مقدم دوباره خراب باشد، updater **قبل از هر تغییری** با پیام `INGRESS_PREEXISTING_BROKEN` متوقف می‌شود و دستورات تعمیر را چاپ می‌کند.

نسخهٔ ۱۰ راهنما است. مکانیزم دریافت (api.github.com → codeload + گیت SHA-256 واقعی) و گیت سلامت سه‌سطحی v3.0 بدون تغییر از نسخهٔ ۹؛ Pinها به انتشار TASK-HANASO-17 منتقل شدند و **دستور از خطِ تک‌خطیِ ۲.۷KB به بلوک heredock کوتاه تبدیل شد** (خطای syntax ناشی از شکستن خط هنگام Paste در SSH را ریشه‌کن می‌کند — تجربهٔ مالک با v9). **اصلاح v10.1 (TASK-HANASO-18):** خط اول بلوک `bash -s --` شد و خط آخر `bash "$T" "$@"` — زیرفرمان‌های `status`/`rollback` حالا واقعاً به installer می‌رسند (در v10 اولیه مکانیزمی برای عبور آرگومان وجود نداشت و متن مستندات از الگوی v9 باقی مانده بود) + گزارش صریح «bootstrap delivered via …» و پیام صادقانه هنگام شکست هر دو مسیر. این انتشار شامل:

- **داشبورد خانه (`/`)**: سلام کوتاه + کارت «قدم بعدی» با تنها CTA اصلی (۶ حالت از Progress واقعی: شروع/ادامه/شروع دوباره پس از غیبت/درس بعدی/دروازهٔ فهم/مرور مسیر) + کارت «درس بعدی» فقط وقتی متفاوت است + خط صادقانهٔ مرور (بدون عدد ساختگی تا فعال‌شدن موتور FSRS) + لینک کم‌حجم مسیر. کاربر جدید و بازگشتی با **۱ کلیک** داخل محتوای واقعی درس می‌روند.
- **ناوبری اصلی**: نوار بالای دسکتاپ + تب‌بار پایین موبایل (خانه · مسیر یادگیری) فقط در صفحات سطح‌بالا — جلسات درس/آزمون غوطه‌ور می‌مانند. فقط مقصدهای واقعی؛ بدون لینک مرده.
- **مرور درس‌های تکمیل‌شده (`?mode=review`)**: کلیک روی ردیف «مرور» در نقشه، درس را از ابتدا باز می‌کند — دیگه پیام Completed مانع نمی‌شود. هیچ ثبت/پاداش تکراری انجام نمی‌شود.
- **پایان درس**: یک CTA «پایان درس و بازگشت به مسیر» → همان Section نقشه (`?s=`)؛ درس بعدی فقط متن است و هرگز خودکار باز نمی‌شود.
- **انقضای ۷روزهٔ Resume**: فقط با «فعالیت معنادار» تمدید می‌شود (Refresh تمدید نمی‌کند)؛ منبع حقیقت سروری است (`last_activity_at` — تنها Migration این انتشار، افزودنی)؛ هیچ‌چیز جز موقعیت walk حذف نمی‌شود.
- **میراث کامل**: همهٔ HANASO-16 (مسیر تدریجی Chapter→Section→Rows→Lessons + گیت سه‌سطحی installer) و TL-14/TL-13 (دک‌های اسلایدی ۸ ایستگاه قواعد، ۶ گیت محتوایی، رفع ۱۰۲ تخلف، رفع باگ learner-id).

## ۱) دستور واحد

این **بلوک** را در ترمینال **سرور** (به‌عنوان root) کپی و اجرا کنید — کامل و شامل خط پایانی `HANASO-V10`:

````bash
```bash
bash -s -- <<'HANASO-V10'
set -euo pipefail
H=AbolfazlProg/hanaso
P=infra/deploy/bootstrap-hanaso.sh
R=1a34414f4ff8f9cdbfb00b17bf70119deb6142f6
W=03ee6e740db0860dd1149ca689ea2d84b9634becfc8f6a8e30632bb660770035
D=3f41f6ee510e28914934ddc83375a0e1d49405a3
T=/tmp/hanaso-bootstrap-v10.sh

echo "[hanaso] 1/3  download bootstrap (ref $R) via api.github.com"
GOT=""
if curl -fsSL --connect-timeout 10 --max-time 60 \
        -H "Accept: application/vnd.github.raw" \
        "https://api.github.com/repos/$H/contents/$P?ref=$R" -o "$T"; then
  GOT="api.github.com"
else
  echo "[hanaso]    api.github.com failed (real curl error above) — trying codeload.github.com"
  X="$(mktemp -d /tmp/hanaso-dl.XXXXXX)"
  if curl -fsSL --connect-timeout 10 --max-time 300 \
       "https://codeload.github.com/$H/tar.gz/$R" -o "$X/src.tgz"; then
    if ! tar -xzf "$X/src.tgz" -C "$X" "hanaso-$R/$P"; then
      echo "ERROR: codeload tarball fetched but extraction FAILED (tar error above) — NOTHING was executed or changed" >&2
      exit 1
    fi
    mv "$X/hanaso-$R/$P" "$T"
    rm -rf "$X"
    GOT="codeload.github.com"
  else
    echo "ERROR: ALL bootstrap download paths failed (api.github.com and codeload.github.com) — the real curl errors are printed above; NOTHING was executed or changed" >&2
    exit 1
  fi
fi
echo "[hanaso]    bootstrap delivered via ${GOT}"

echo "[hanaso] 2/3  verify SHA-256 — nothing runs unless it matches"
echo "$W  $T" | sha256sum -c -

echo "[hanaso] 3/3  start installer — deploy target: $D (1.0.0-hanaso17-r01)"
HANASO_DEPLOY_SHA="$R" HANASO_TARGET_SHA="$D" bash "$T" "$@"
HANASO-V10
````

````

- همین دستور در `OWNER-COMMAND.txt` (ریشهٔ Repository) هم هست — کپی از هر دو یکسان است.
- اگر با کاربر غیر root هستید، کل خط اول را با `sudo` شروع کنید: `sudo bash -s -- <<'HANASO-V10'`.
- این دستور **هیچ Username/Password/Token نمی‌پرسد و هیچ Placeholderی ندارد.**

### زیرفرمان‌های اختیاری (v10.1)

کلمهٔ زیرفرمان را در **خط اول همان بلوک**، بعد از `bash -s --` اضافه کنید:

```bash
bash -s -- status <<'HANASO-V10'     # گزارش فقط-خواندنی (هر سه سطح سلامت)
bash -s -- rollback <<'HANASO-V10'   # بازگشت به image قبلی (دیتابیس دست‌نخورده)
````

## ۲) زنجیرهٔ دریافت — دو مسیر مستقل + گیت SHA-256

1. **`api.github.com`** — فایل bootstrap از Contents API روی **کامیت دقیق** `1a34414f` (Accept: raw؛ ۴۰۳ محدودیت نرخ ناشناس = عبور خودکار به مسیر بعدی).
2. **`codeload.github.com`** — تاربال کامل ریپو روی همان کامیت؛ فقط همان یک فایل استخراج می‌شود.

(مسیرهای raw.githubusercontent.com از v10 حذف شدند — شواهد زندهٔ VPS ۲۰۲۶-۱۱-۰۸: فقط یک IP از چهار IP سرو raw پاسخ می‌داد؛ api و codeload پایدار بودند.)

سپس **SHA-256 واقعی فایل** با مقدار Pin‌شده (`03ee6e74…`) مقایسه می‌شود — **قبل از هر اجرایی**؛ و مسیر موفق در خروجی گزارش می‌شود (`bootstrap delivered via …`). نکتهٔ عملی: برای کامیت‌های تازه‌push‌شده، codeload چند ده ثانیه تأخیر propagation دارد — اگر ۴۰۴ گرفتید، ~۴۵ ثانیه بعد دوباره اجرا کنید.

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

| فاز              | کار                                                                                                                | تضمین                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Workspace منبع   | کلون ناشناس در `/opt/hanaso-src` — کاملاً جدا از `/opt/hanaso` (داده‌ها و تنظیمات Production)                      | `.env`، دیتابیس و فایل‌های عملیاتی هرگز پاک نمی‌شوند |
| راستی‌آزمایی Pin | کامیت هدف `3f41f6ee` و کامیت ابزار `1a34414f`؛ اجرای updater از worktree ایزوله روی همان کامیت + SHA-256 bootstrap | ضد drift                                             |
| Preflight        | همهٔ بررسی‌های قبلی + **Baseline عمومی سه‌سطحی جدید** (قبل از هر تغییری) + شاهد kotodama.ir                        | خرابی ازپیش‌موجود = توقف بدون هیچ تغییری             |
| Backup           | `.env` زمان‌دار + بکاپ واقعی دیتابیس (`pg_dump -Fc` با تأیید)                                                      | بدون بکاپ، هیچ تغییری انجام نمی‌شود                  |
| Build            | ساخت image روی خود VPS از کامیت Pin‌شده (`1.0.0-hanaso17-r01`)                                                     | بدون Registry/Token                                  |
| Update مرحله‌ای  | تعویض image → postgres → pgbouncer → migrate یک‌بارمصرف idempotent → `up -d web worker`                            | ترتیب استاندارد                                      |
| Health gate      | Tier 1 محلی (کامیت+نسخه) → Tier 2a/2b/3 عمومی طبقه‌بندی‌شده → smoke روی سالم‌ترین مسیر → اسکن لاگ                  | رول‌بک فقط برای شکست واقعی                           |
| KOTODAMA         | فقط شاهد HTTP قبل/بعد — باید دقیقاً همان باشد                                                                      | هرگز لمس نمی‌شود                                     |
| رول‌بک خودکار    | فقط خرابی App یا شکستن مسیر در پنجرهٔ انتشار                                                                       | دیتابیس/داده هرگز حذف نمی‌شود                        |
| گزارش نهایی      | نسخه + کامیت + image + `PUBLIC_CLASSIFICATION` + مسیر بکاپ + رکورد در `update-history/`                            | شواهد قابل بازرسی                                    |

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
# انتظار: {"ok":true, "version":"1.0.0-hanaso17-r01", "commit":"3f41f6ee…"}
```

## ۷) اگر مشکلی پیش آمد

- **پیام `INGRESS_PREEXISTING_BROKEN`:** مسیر عمومی قبل از شروع خراب بوده (در ۲۰۲۶-۱۱-۱۱ رخ داد؛ خط مقدم بعداً تعمیر شد). **هیچ چیزی تغییر نکرده.** خط مقدم میزبان را تعمیر کنید: `systemctl status haproxy nginx` · `ss -tlnp | grep -E ':80|:443'` · `docker ps` · بررسی ACL/SNI و upstreamهای HAProxy/nginx. بعد همان دستور را اجرا کنید.
- **وضعیت `EXTERNAL_UNVERIFIED`:** App و پروکسی محلی سالم‌اند ولی مسیر عمومی از بیرون قابل تأیید نبود — از یک گوشی/شبکهٔ دیگر `https://learn.kotodama.ir/api/health` را باز کنید.
- **۴۰۳ از api.github.com:** طبیعی — خودکار به Codeload می‌رود.
- **SHA-256 MISMATCH:** فایل رسیده با کامیت Pin‌شده یکی نیست؛ هیچ‌چیز اجرا نمی‌شود.
- **شکست midway (build/migrate/health محلی):** رول‌بک خودکار + چاپ علت؛ دیتابیس دست‌نخورده.
- **بازگشت دستی:** زیرفرمان `rollback` · **گزارش وضعیت:** زیرفرمان `status`.

## ۸) یکپارچگی و امنیت

- **زنجیرهٔ Pin:** کامیت ابزار `1a34414f` در URL هر دو مسیر + SHA-256 واقعی bootstrap (`03ee6e74…`) + کامیت هدف `3f41f6ee` درون هر دو اسکریپت. `latest` و شاخهٔ متحرک وجود ندارد.
- **بدون Secret در هیچ‌جا** · TLS هرگز خاموش نمی‌شود (`-k`/`--insecure` ممنوع) · KOTODAMA/PostgreSQLهای مشترک/Redis/Reverse Proxy عمومی و Volumeهای آن‌ها برای انتشار HANASO دست نمی‌خورند.

## ۹) آزمون‌های انجام‌شده و محدودیت‌های صادقانه

- **آزمون لایهٔ تحویل (`run-deploy05.sh` — نسخهٔ v2 مأموریت TASK-HANASO-18، همین بلوک عیناً): ۱۰۰/۱۰۰ ادعا PASS** — شامل P0 ایمنی ایستای متن (فراخوانی `bash -s --` + جداکنندهٔ نقل‌قولی، Pinهای R/W/D همخوان با ریپو، عبور زیرفرمان `"$@"`، هر دو مسیر موجود، raw غایب) · P1 مسیر خوش‌انجام api · P2 افت ۴۰۳ → codeload با تأیید ترتیب · P3 افت TLS → codeload · P4 شکست هر دو مسیر → توقف صادقانه بدون هیچ تغییری · P5 تاربال خراب codeload → توقف صریح · P6/P7 بدنهٔ دستکاری‌شده/صفحهٔ HTML → رد توسط گیت SHA-256 · P1 با smoke کهنهٔ HANASO-16 در deploy-dir (عین VPS شما) که گیت را نمی‌شکند · P8 اجرای idempotent · P9 زیرفرمان `status` فقط-خواندنی (از طریق خط اول `bash -s -- status`) · P10 چرخهٔ update → rollback → update · P11 شکست migrate → رول‌بک خودکار · P12 جاروی سراسری (KOTODAMA/ایزولاسیون/TLS/بدون raw و بدون `--resolve`).
- **رگرسیون updater (`run-deploy04.sh`): ۱۴۰/۱۴۰ ادعا PASS** (بازاجرای همین مأموریت روی شاخهٔ `hanaso17-home-dashboard` با mockهای نسل‌آگاه App؛ شامل گیت سه‌سطحی G1-G6 — بازتولید دقیق حادثهٔ tl14-r01: توقف قبل از هر تغییر، بدون رول‌بک بی‌فایده).
- **رفع ریسک رول‌بکِ اشتباه (کشف CI واقعی):** گیت Smoke در updater حالا smokeِ همراه با کامیت ابزار پین‌شده را مقدم می‌کند (smoke کهنهٔ نصب اولیه در deploy-dir دیگر نمی‌تواند انتشار سالم را رول‌بک کند) و قرارداد اسموک خانه به داشبورد واقعی (`قدم بعدی` + CTA `/learn`) به‌روز شد — اجرای واقعی CI این باگ را قبل از انتشار پیدا کرد (run 43265513660).
- **راستی‌آزمایی مسیرهای واقعی (بدون Mock — ۲۰۲۶-۱۱-۱۲):** codeload.github.com از این سندباکس → تاربال کامل، SHA-256 bootstrap استخراج‌شده **بایت‌به‌بایت** با Pin `03ee6e74…` یکسان؛ api.github.com از IP سندباکس ۴۰۳ (سهمیهٔ ناشناس تمام‌شده — دقیقاً سناریوی P2 که خودکار به codeload می‌رود).
- **محصول (از CP-07 مأموریت HANASO-17):** ۶۹۲/۶۹۲ تست واحد+integration · EQA ✓ · tsc/eslint/prettier ✓ · Build تولیدی ✓ · ۱۰/۱۰ سناریوی مرورگر واقعی (۳۹۰/۷۶۸/۱۴۴۰).
- **تحویل به GitHub:** شاخهٔ `hanaso17-home-dashboard` مستقیماً Push شده است. Pinهای بالا همین الان روی GitHub معتبرند؛ هیچ Bundleای لازم نیست.
- **محدودیت صادقانه:** Docker واقعی و VPS در سندباکس نیست؛ استقرار واقعی طبق طراحی با اجرای همین یک بلوک توسط شما انجام می‌شود. گیت سه‌سطحی اگر خط مقدم خراب باشد، قبل از هر تغییری متوقف می‌شود.
