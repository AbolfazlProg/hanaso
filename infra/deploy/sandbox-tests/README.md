# sandbox-tests — آزمون‌های ایزولهٔ استقرار بدون-Credential یک‌دستوری

این پوشه **هارنس آزمون** مسیر کامل «دستور واحد مالک» است: از دانلود bootstrap تا
به‌روزرسانی واقعی — بدون Docker واقعی، بدون GitHub واقعی، بدون VPS و بدون هیچ لمسی به KOTODAMA.

دو هارنس هست:

| هارنس | لایه | وضعیت |
| --- | --- | --- |
| `run-deploy04.sh` | مکانیک updater (bootstrap → updater از worktree کامیت Pin‌شده) | ۲۰ سناریو / ۱۱۰ ادعا — رگرسیون؛ S17/S18 در DEPLOY-05 به گیت SHA-256 واقعی به‌روز شد |
| `run-deploy05.sh` | **لایهٔ تحویل دستور یک‌خطی** (TASK-HANASO-DEPLOY-05) | ۱۳ گروه / ۹۰ ادعا — همان دستورِ عین `OWNER-COMMAND.txt` |

`run-deploy05.sh` تفاوت کلیدی دارد: **دستور یک‌خطی تولیدی را عیناً از `OWNER-COMMAND.txt`
(ریشهٔ ریپو) استخراج و بدون هیچ تغییری اجرا می‌کند**؛ origin شبیه‌سازی‌شده = یک mirror محلی
bare از خود ریپو (پروتکل file:// ناشناس)، پس Pinهای واقعی (کامیت ابزار `7c4f02f`،
SHA-256 واقعی bootstrap، کامیت هدف واقعی `575b8dd`) بدون بازنویسی کار می‌کنند و فیکسچر =
وضعیت واقعی Production فعلی (`fdddad34` / `1.0.0-tl08-a5r`). mock جدید `curl` چهار مسیر
دانلود GitHub (API با Accept:raw · Codeload تاربال · raw با/بدون `--resolve` روی IP ثابت
مالک) را از blobهای واقعی Git سرو می‌کند تا SHA-256 بایت‌به‌بایت یکی باشد؛ شکست هر مسیر با
`SIM_DL_API` / `SIM_DL_CODELOAD` / `SIM_DL_RAWIP` / `SIM_DL_RAWDNS` (و `SIM_DL_TAMPER=1`
/ `SIM_DL_HTML=1`) تزریق می‌شود. سناریوها: P0 امنیت ایستای متن دستور (Pinها سازگار با ریپو،
عدم وجود `-k`/`--insecure`/`latest`/token) · P1 موفقیت از API · P2 Rate-limit واقعی ۴۰۳ →
fallback به Codeload (با assert ترتیب) · P3 مسیر IP ثابت با `--resolve` · P4 مسیر DNS ·
P5 شکست هر چهار مسیر = هیچ‌چیز اجرا نشد · P6/P7 فایل دستکاری‌شده/صفحهٔ HTML رد شدند در گیت
SHA-256 · P8 اجرای مجدد no-op · P9 فقط-خواندنی بودن status · P10 رفت‌وبرگشت rollback ·
P11 شکست migrate با رول‌بک خودکار · P12 جاروی سراسری KOTODAMA/TLS.

هارنس نسخهٔ قبل (`run.sh` مربوط به TASK-HANASO-DEPLOY-02 که فقط `update-hanaso.sh` v1 را
مستقیم اجرا می‌کرد) با `run-deploy04.sh` جایگزین شد (DEPLOY-04). تاریخچهٔ هر دو در Git حفظ می‌شود.

## روش آزمون (صادقانه — این شبیه‌سازی است، نه Deploy واقعی)

- **bootstrap و updater واقعی و بدون تغییر** اجرا می‌شوند (`PATH` به `mock-bin/` اشاره می‌کند).
- **origin شبیه‌سازی‌شدهٔ Repository عمومی**: یک ریپوی bare محلی با سه شاخه (`main` ·
  `tl08-cta01` = کامیت هدف Pinشده · `tl08-deploy04` = کامیت ابزار استقرار) از طریق URL
  با پروتکل `file://` — **بدون هیچ Git Credential** (`GIT_CONFIG_GLOBAL=/dev/null` و
  `GIT_CONFIG_SYSTEM=/dev/null`؛ یعنی حتی credential helper هم وجود ندارد) و با
  `GIT_TERMINAL_PROMPT=0`. مکانیک واقعی `ls-remote` / `clone` / `fetch` / `worktree` اجرا می‌شود.
- `docker` / `curl` / `df` **stub** هستند: هر فراخوانی در `calls.log` ثبت می‌شود؛ رفتار
  compose (up/run/exec/ps)، ساخت image و پاسخ‌های health/ready/kotodama از روی فایل وضعیت
  شبیه‌سازی می‌شود؛ نقاط شکست (build/migrate/backup/health/kotodama) با `config.env` تزریق می‌شوند.
- دایرکتوری deploy ساختگی، **فایل compose واقعی** `infra/deploy/learn-kotodama/docker-compose.shared-vps.yml`
  و `scripts/smoke.sh` واقعی را کنار یک `.env` ساختگی قرار می‌دهد — و کاملاً از
  workspace منبع (`src/`) جدا است، دقیقاً مثل VPS (`/opt/hanaso` در برابر `/opt/hanaso-src`).

## اجرا

```bash
bash infra/deploy/sandbox-tests/run-deploy04.sh          # رگرسیون updater — خروجی PASS/FAIL؛ exit 0 = همه سبز
bash infra/deploy/sandbox-tests/run-deploy05.sh          # لایهٔ تحویل دستور یک‌خطی — OWNER-COMMAND.txt لازم دارد
# هر دو با --keep برای نگه‌داشتن پوشهٔ کار
```

آخرین نتیجه: **۱۱۰/۱۱۰ PASS** (run-deploy04) · **۹۰/۹۰ PASS** (run-deploy05).

## سناریوها

| #   | سناریو                                                           | انتظار                                                                                                 |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| S1  | نصب اولیه: workspace وجود ندارد → کلون ناشناس + به‌روزرسانی کامل | exit 0 · کلون ناشناس · تعویض image · migrate · گیت سلامت · smoke · شاهد                                |
| S2  | به‌روزرسانی از نسخهٔ قبلی + رفت‌وبرگشت rollback                  | ثبت image قبلی · rollback · به‌روزرسانی مجدد موفق                                                      |
| S3  | workspace موجود → fetch (بدون کلون مجدد) + اجرای مجدد no-op      | پیام fetch · «already running target» · صفر build/migrate/up جدید                                      |
| S4  | نبود/خرابی Docker                                                | شکست در preflight · صفر تغییر                                                                          |
| S5  | قطع دسترسی GitHub (origin ناموجود)                               | **خطای واقعی git عیناً چاپ می‌شود** · راهنمای عمومی‌بودن (نه credential) · هیچ workspace ساخته نمی‌شود |
| S6  | مسیر src موجود ولی بدون .git                                     | امتناع صریح از حذف/بازنویسی · فایل‌های موجود دست‌نخورده                                                |
| S7  | deploy dir پیدا نشد                                              | تشخیص صادقانه مسیر‌به‌مسیر (چه چیزی کجا بود) · هیچ دایرکتوری لمس نمی‌شود                               |
| S8  | deploy dir با امضای استک اشتباه                                  | رد امضا · محتویات حفظ · توقف                                                                           |
| S9  | کمبود فضای دیسک                                                  | شکست در preflight با پیام روشن · صفر تغییر                                                             |
| S10 | شکست Build                                                       | توقف **قبل از** تعویض .env · صفر تغییر                                                                 |
| S11 | شکست Migration بعد از تعویض                                      | رول‌بک خودکار · بازگردانی image قبلی · گیت سلامت قبلی                                                  |
| S12 | شکست گیت سلامت (نسخهٔ جدید بالا نمی‌آید)                         | رول‌بک خودکار                                                                                          |
| S13 | شکست بکاپ دیتابیس                                                | توقف قبل از هر تغییری                                                                                  |
| S14 | خرابی شاهد kotodama بعد از تعویض                                 | رول‌بک خودکار + گزارش INVESTIGATE                                                                      |
| S15 | زیرفرمان status                                                  | فقط-خواندنی، صفر جهت                                                                                   |
| S16 | کامیت هدف Pinشدهٔ غیرواقعی (ghost)                               | توقف صادقانهٔ bootstrap در راستی‌آزمایی کامیت · صفر تغییر                                              |
| S17 | bootstrap دستکاری‌شده (مغایر با کامیت Pinشده)                    | هشدار integrity · به‌روزرسانی همچنان از کامیت Pinشده اجرا می‌شود                                       |
| S18 | دانلود خراب (صفحهٔ HTML به‌جای اسکریپت) — گیت SHA-256 دستور یک‌خطی | رد شدن در گیت SHA-256 واقعی · هیچ چیزی اجرا نمی‌شود                                                    |
| S19 | اجرای مستقیم updater با remote خراب                              | راهنمای صادقانهٔ «عمومی/بدون credential» · صفر تغییر                                                   |
| S20 | SRC_DIR روی deploy dir                                           | امتناع تفکیک · deploy dir دست‌نخورده                                                                   |

جاروی سراسری روی **تمام** سناریوها بررسی می‌کند که هرگز `compose down` اجرا نشده،
هیچ کانتینر غیر-hanaso لمس نشده، هیچ فرمان سراسری docker (prune/restart/stop/rm)
صادر نشده و هیچ `rm -rf`ی در خروجی نباشد.

## محدودیت‌های صادقانه

- **Docker واقعی وجود ندارد** در سندباکس Agent؛ این هارنس **جریان کنترل، ترتیب مراحل،
  مکانیک git ناشناس (clone/fetch/worktree)، رفتار رول‌بک و حفاظت KOTODAMA** را می‌سنجد —
  نه خود Docker build، نه اتصال واقعی PostgreSQL، نه TLS/nginx واقعی.
- شبیه‌سازی «Repository عمومی» با URL محلی `file://` انجام می‌شود؛ **آزمون واقعی دسترسی
  ناشناس به GitHub** پس از عمومی‌شدن ریپو جداگانه انجام و در
  `ops/checkpoints/TASK-LEARNING-08/CHECKPOINT_LOG.md` (CP-14) ثبت شده است.
- مسیر شبکهٔ sandbox به پورت ۲۲ VPS فیلتر است؛ استقرار واقعی توسط مالک با همان یک
  دستور نهایی انجام می‌شود.
