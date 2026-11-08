# دستور واحد به‌روزرسانی HANASO روی VPS — نسخهٔ ۲ (بدون Credential)

**تاریخ:** ۲۰۲۶-۱۱-۰۸ · **مأموریت:** TASK-HANASO-DEPLOY-04
**Repository:** `https://github.com/AbolfazlProg/hanaso` — **عمومی (Public)**؛ دریافت کد با HTTPS ناشناس و **بدون هیچ GitHub Token / Password / Deploy Key**
**نسخهٔ هدف (Pin شده):** `1.0.0-tl08-cta01` @ کامیت `575b8dd8efeaa3e0cbc53bf134a6b71d80b130d4` (شاخهٔ `tl08-cta01`) — بدون تأیید مالک عوض نمی‌شود
**کامیت ابزار استقرار (Pin شده):** `3a8a946223527189fdfe2cc42077ee491b71e204` (شاخهٔ `tl08-deploy04`)

این نسخهٔ ۲ راهنما است. تفاوت کلیدی با نسخهٔ ۱: **بخش «راه‌اندازی اولیهٔ Credential» کاملاً حذف شد** —
Repository عمومی شده و کل مسیر (دانلود bootstrap، کلون کد، fetch نسخه‌های بعدی) با HTTPS ناشناس
انجام می‌شود. دیگر هیچ PAT، Deploy Key یا رمز ذخیره‌شده‌ای روی سرور لازم نیست.

## ۱) دستور واحد

این یک خط را در ترمینال **سرور** (به‌عنوان root) کپی و اجرا کنید — همین:

```bash
bash -c 'set -euo pipefail; U="https://raw.githubusercontent.com/AbolfazlProg/hanaso/3a8a946223527189fdfe2cc42077ee491b71e204/infra/deploy/bootstrap-hanaso.sh"; T="$(mktemp /tmp/hanaso-bootstrap.XXXXXX.sh)"; if command -v curl >/dev/null 2>&1; then curl -fsSL "$U" -o "$T"; elif command -v wget >/dev/null 2>&1; then wget -q -O "$T" "$U"; else echo "ERROR: curl or wget not found — apt-get install -y curl"; exit 1; fi; grep -q "^# HANASO-BOOTSTRAP-INTEGRITY: d4b04e2a1c9f3b7d$" "$T" || { echo "ERROR: bootstrap integrity check FAILED — aborting (nothing was changed)"; exit 1; }; HANASO_DEPLOY_SHA=3a8a946223527189fdfe2cc42077ee491b71e204 bash "$T" "$@"' hanaso-updater
```

اگر با کاربر غیر root هستید، همان دستور را با `sudo bash -c '…'` اجرا کنید (بقیه عیناً یکسان).

این دستور **هیچ Username یا Passwordی نمی‌پرسد، هیچ فایلی را دستی ویرایش نمی‌کند و هیچ Placeholderی ندارد.**
اگر workspace منبع (`/opt/hanaso-src`) وجود نداشته باشد، همان دستور آن را می‌سازد؛ اگر باشد، فقط fetch می‌کند.

### زیرفرمان‌های اختیاری

به انتهای دستور (بعد از کلمهٔ `hanaso-updater`) یک کلمه اضافه کنید:

```bash
# گزارش فقط-خواندنی وضعیت فعلی (بدون هیچ تغییری):
…(دستور بخش ۱)… hanaso-updater status

# بازگشت به image قبلی ثبت‌شده (دیتابیس دست‌نخورده):
…(دستور بخش ۱)… hanaso-updater rollback
```

## ۲) دستور به‌ترتیب چه می‌کند؟

| فاز              | کار                                                                                                                                                                                                      | تضمین                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| دانلود bootstrap | دریافت اسکریپت از raw.githubusercontent.com روی **کامیت دقیق و Pin شده** (`3a8a946`) + بررسی marker یکپارچگی                                                                                             | نسخهٔ اجرا‌شده دقیقاً همان نسخهٔ بازبینی‌شده است؛ نه latest و نه شاخهٔ متحرک |
| دسترسی ناشناس    | `git ls-remote` عمومی؛ اگر شکست بخورد **خطای واقعی git عیناً چاپ می‌شود** (نه پنهان‌سازی با /dev/null) و قبل از هر تغییری متوقف می‌شود                                                                   | خطای واقعی شبکه/احراز هویت همیشه دیده می‌شود                                 |
| Workspace منبع   | کلون ناشناس (یا fetch) در `/opt/hanaso-src` — **کاملاً جدا از `/opt/hanaso`** (محل داده‌ها و تنظیمات Production)؛ اگر مسیری موجود ولی غیر-git باشد، امتناع از حذف/بازنویسی                               | `.env`، دیتابیس و فایل‌های عملیاتی هرگز پاک نمی‌شوند                         |
| راستی‌آزمایی Pin | وجود کامیت هدف `575b8dd` و کامیت ابزار `3a8a946` در ریپو بررسی و updater از worktree ایزوله روی همان کامیت اجرا می‌شود + مقایسهٔ sha256 خودِ bootstrap با همان کامیت                                     | ضد drift؛ اسکریپت اجرایی = اسکریپت بازبینی‌شده                               |
| Preflight        | root · Docker/Compose · دیسک (حداقل ۲.۵GB) · حافظه (حداقل ~۱.۸GB) · کلیدهای `.env` (بدون چاپ مقادیر) · پروژهٔ compose واقعاً `hanaso` · سلامت نسخهٔ فعلی + شاهد kotodama.ir · گارد no-op برای اجرای مجدد | قبل از هر تغییری می‌ایستد؛ استک اشتباه را قبول نمی‌کند                       |
| Backup           | `.env` → نسخهٔ زمان‌دار + بکاپ واقعی دیتابیس با همان روتین شبانه (`pg_dump -Fc` + تأیید ok/bytes)                                                                                                        | اگر بکاپ نشود، **قبل از هر تغییری** متوقف می‌شود                             |
| Build            | ساخت image در worktree موقت روی **همان کامیت Pin شده** (`NEXT_PUBLIC_APP_VERSION=1.0.0-tl08-cta01`) — روی خود VPS، بدون نیاز به GHCR/Registry                                                            | بدون وابستگی به Token یا Registry                                            |
| Update مرحله‌ای  | تعویض `HANASO_WEB_IMAGE` → postgres (سالم) → pgbouncer (سالم) → migrate یک‌بارمصرف (idempotent: drizzle ردیابی می‌کند؛ seedها uuidv5+upsert) → `up -d web worker`                                        | ترتیب استاندارد استقرار مرحله‌ای                                             |
| Health gate      | `ok:true` **و** تطبیق کامل کامیت **و** نسخه روی `127.0.0.1:3100`؛ سپس `/api/ready` (database: ok)؛ سپس مسیر عمومی `learn.kotodama.ir`؛ سپس smoke سه‌گانه؛ سپس اسکن لاگ خطا                               | هر ناهم‌خوانی = شکست                                                         |
| KOTODAMA         | فقط چک شاهد HTTP قبل/بعد — باید **دقیقاً همان** باشد                                                                                                                                                     | هرگز لمس نمی‌شود (فقط پروژهٔ `hanaso`، فقط سرویس‌های خودش)                   |
| رول‌بک خودکار    | اگر **هر قدمی بعد از تعویض** شکست بخورد: برگرداندن image قبلی + `up -d web worker` + گیت سلامت قبلی + گزارش علت                                                                                          | دیتابیس/داده هرگز حذف/ریست نمی‌شود                                           |
| گزارش نهایی      | نسخه + کامیت نصب‌شده + image + مسیر بکاپ + رکورد اجرا در `/opt/hanaso/update-history/<زمان>.env` (بدون هیچ Secret)                                                                                       | شواهد قابل بازرسی پس از هر اجرا                                              |

اجرای مجدد همان دستور روی همان نسخهٔ هدف = **no-op کامل** (بدون build/migrate/تعویض)؛ فرایند idempotent است.

## ۳) پیش‌نیازهای یک‌باره (معمولاً از قبل موجودند)

```bash
git --version || apt-get install -y git
curl --version || apt-get install -y curl   # یا wget
docker version && docker compose version    # باید موجود باشند (روی VPS شما هستند)
```

**هیچ تنظیم Credential یا Token لازم نیست.** اگر `git ls-remote https://github.com/AbolfazlProg/hanaso.git HEAD`
را دستی اجرا کنید، باید بدون پرسیدن Username جواب بدهد (ریپو عمومی است).

## ۴) راستی‌آزمایی بعد از اجرا

```bash
curl -sS https://learn.kotodama.ir/api/health
# انتظار: {"ok":true, "version":"1.0.0-tl08-cta01", "commit":"575b8dd8efeaa3e0…"}
```

سپس در مرورگر: `https://learn.kotodama.ir/learn` → فصل ۰۱ → ایستگاه «ردیف あ» → پس از تمام‌شدن
معرفی، در **انتهای همهٔ محتوا** باید ببینید: «معرفی این کاراکتر تمام شد! حالا نوبت توست.» و دکمهٔ
«شروع تمرین نوشتن ←». کلیک → اسکرول به بالای بوم و شروع تمرین با راهنما همان‌جا.

## ۵) اگر مشکلی پیش آمد

- **شکست midway (build/migrate/health):** خود اسکریپت به نسخهٔ قبلی رول‌بک می‌کند و علت را چاپ می‌کند؛ دیتابیس و داده‌ها دست‌نخورده می‌مانند.
- **بازگشت دستی:** زیرفرمان `rollback` (بخش ۱) — app-level، دیتابیس هرگز لمس نمی‌شود.
- **گزارش وضعیت:** زیرفرمان `status` — فقط-خواندنی.
- **خطای دسترسی GitHub:** متن واقعی خطای git چاپ می‌شود؛ اگر «could not read Username» باشد یعنی ریپو عمومی نیست (باید Public بماند)؛ اگر خطای شبکه باشد، DNS/خروجی اینترنت سرور را بررسی کنید.

## ۶) یکپارچگی و امنیت

- **دو لایهٔ Pin:** کامیت bootstrap در URL دانلود (تغییرناپذیر) + کامیت updater که bootstrap خودش بررسی و اجرا می‌کند (`HANASO_DEPLOY_SHA`)؛ کامیت هدف اپ نیز درون هر دو اسکریپت Pin شده (`575b8dd`).
- **Marker یکپارچگی:** خط اول bootstrap با هش `d4b04e2a1c9f3b7d` توسط دستور بررسی می‌شود تا فایل خراب/صفحهٔ خطای پروکسی هرگز اجرا نشود.
- **بدون Secret در هیچ‌جا:** نه در URL، نه در فرمان، نه در لاگ، نه در رکوردهای `update-history`.
- **تاریخچهٔ Repository پیش از عمومی‌شدن اسکن شد:** هیچ Token/کلید خصوصی/.env واقعی/دیتابیس_Dump در هیچ کامیتی وجود ندارد (فقط مقادیر تستی CI و placeholder ها) — گزارش کامل در CP-14.

## ۷) تضمین‌های KOTODAMA

اسکریپت فقط پروژهٔ compose با نام `hanaso` را هدف می‌گیرد و فقط سرویس‌های خودش را `up` می‌کند:
`compose down` هرگز اجرا نمی‌شود؛ کانتینر/دیتابیس/volume/ریورس‌پروکسی kotodama هرگز لمس نمی‌شود
(تنها چک HTTP ۲۰۰ به‌عنوان شاهدِ «صدمه نزدن»، قبل و بعد). این قید به‌صورت invariant سراسری در
۲۰ سناریوی آزمون sandbox (۱۱۰ ادعا) بررسی شد — همه PASS.

## ۸) آزمون‌های انجام‌شده و محدودیت‌های صادقانه

- **۲۰ سناریو / ۱۱۰ ادعا در sandbox ایزوله** (`infra/deploy/sandbox-tests/run-deploy04.sh`): کلون و fetch ناشناس (بدون هیچ git config)، نصب اولیه، به‌روزرسانی از نسخهٔ قبلی، رفت‌وبرگشت rollback، اجرای مجدد no-op، قطع GitHub با چاپ خطای واقعی، امتناع از حذف دایرکتوری موجود غیر-git، نبود/امضای اشتباه deploy dir، شکست Docker/دیسک/Build/Migration/Health/Backup/شاهد kotodama، کامیت ghost، bootstrap دستکاری‌شده، دانلود خراب، و جداسازی src/deploy — همه PASS + invariant سراسری KOTODAMA.
- **آزمون واقعی دسترسی ناشناس به GitHub** (پس از عمومی‌شدن): `git ls-remote` بدون Token، clone کم‌عمق، دریافت همان URL خام bootstrap و اجرای همان دستور بخش ۱ — نتایج در `ops/checkpoints/TASK-LEARNING-08/CHECKPOINT_LOG.md` (CP-14) ثبت شده است.
- **محدودیت صادقانه:** Docker واقعی در سندباکس Agent وجود ندارد؛ آزمون‌های sandbox جریان کنترل/ترتیب/رول‌بک/مکانیک git ناشناس/حفاظت KOTODAMA را می‌سنجند، نه خود Docker build را. مسیر شبکهٔ sandbox به پورت ۲۲ سرور فیلتر است؛ بنابراین استقرار نهایی طبق طراحی مأموریت، **با اجرای همین یک دستور توسط شما** انجام می‌شود و هیچ ادعای «منتشرشده» قبل از اجرای شما مطرح نیست.
