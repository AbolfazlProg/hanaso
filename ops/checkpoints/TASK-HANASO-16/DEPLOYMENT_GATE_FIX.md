# DEPLOYMENT_GATE_FIX — TASK-HANASO-16

> ۲۰۲۶-۱۱-۱۱ · اصلاح Installer (`infra/deploy/update-hanaso.sh` v2.1 → **v3.0**) · مبنای طراحی: `DEPLOYMENT_FAILURE_ANALYSIS.md`

## ۱) چه چیزی تغییر کرد و چرا

**مشکل TL-14:** گیت C7 (سلامت عمومی) هر شکستی را «شکست انتشار» تفسیر می‌کرد و رول‌بک می‌زد — بدون آنکه بداند مسیر عمومی **از قبل** خراب بوده یا نه. نتیجه: App سالم tl14-r01 بی‌دلیل به tl13-r01 برگشت و مشکل واقعی (خط مقدم مشترک) پنهان ماند.

**راه‌حل v3.0 — گیت سلامت سه‌سطحی با تفکیک پیش‌وجود بودن:**

| سطح | نام | پیاده‌سازی |
| --- | --- |
| Tier 1 | Application | `http://127.0.0.1:3100/api/health` + `/api/ready` — با commit و version دقیق Pinشده (C5/C6 موجود، بدون تغییر) |
| Tier 2a | Ingress-Direct | `curl --resolve learn.kotodama.ir:443:127.0.0.1` — پروب خود Reverse Proxy روی Host با SNI/Host صحیح، **بدون** DNS/NAT |
| Tier 2b | Public-Self | `curl https://learn.kotodama.ir/api/health` از خود VPS — مسیر کامل شامل Hairpin |
| Tier 3 | Independent | check-host.net API (≥۳ نود جهانی) از خود VPS — راستی‌آزمایی مسیر عمومی از **بیرون**؛ best-effort با صداقت کامل (`UNVERIFIED` هرگز `OK` جا نمی‌زند) |

## ۲) جریان تصمیم

**Preflight (A6b — قبل از هر تغییری):** ثبت Baseline عمومی (کد + خطای واقعی + حکم Tier 3 + شاهد kotodama). اگر:
- Tier 2b خراب **و** Tier 3 = `BROKEN` → **INGRESS_PREEXISTING_BROKEN** → توقف کامل قبل از هر تغییری با تشخیص صریح و دستور تعمیر (HAProxy/nginx میزبان). *دقیقاً سناریوی TL-14 — این بار بدون رول‌بکِ بی‌فایده.*
- Tier 2a خراب (و Tier 3 قابل‌راستی‌آزمایی نیست) → همان توقفِ قبل از تغییر.
- Tier 2b خراب ولی Tier 2a سالم → آرتیفکت Hairpin/غیرقابل‌تأیید → ادامه با هشدار (گیت پس از Swap طبقه‌بندی می‌کند).
- درِ فرار صریح: `HANASO_ALLOW_UNVERIFIED_INGRESS=1`.

**گیت پس از Swap (C7 — طبقه‌بندی‌شده):**

| وضعیت | تشخیص | اقدام |
| --- | --- | ---|
| Tier 2b سالم + version درست | PUBLIC_OK (Tier 3 تأیید تکمیلی) | موفق |
| Tier 2b ✗، Tier 2a ✓، Tier 3 = OK | آرتیفکت Hairpin — دنیا می‌رسد | انتشار می‌ماند؛ `PUBLIC_OK_SELF_PROBE_ARTIFACT` |
| Tier 2b ✗، Tier 2a ✓، Tier 3 = UNVERIFIED | `EXTERNAL_UNVERIFIED` | انتشار می‌ماند؛ راهنمای راستی‌آزمایی دستی |
| Tier 2b ✗، Tier 2a ✓، Tier 3 = BROKEN، Baseline هم خراب بود | خرابی ازپیش‌موجود خط مقدم | انتشار می‌ماند («Keeping the release»)؛ تشخیص صریح تعمیر خط مقدم |
| Tier 2b ✗، Tier 2a ✓، Tier 3 = BROKEN، Baseline سالم بود | انتشار مسیر را شکسته | **رول‌بک** (سیاست ایمن) |
| Tier 2a ✗ (پروکسی خود Host) — Baseline سالم بود | خرابی در پنجرهٔ انتشار | **رول‌بک** |
| Tier 1 ✗ | APP_FAILED | **رول‌بک** (موجود — بدون تغییر) |

**Smoke (C9):** علیه سالم‌ترین مسیر موجود — URL عمومی وقتی Tier 2b سالم است؛ در غیر این صورت پورت محلی App (پروکسی از قبل در Tier 2a راستی‌آزمایی شده). اجرای Smoke علیه مسیرِ به‌طورقطع‌خراب، با طبقه‌بندی C7 تناقض داشت و رول‌بک کاذب می‌داد.

**گزارش نهایی:** `PUBLIC_CLASSIFICATION` در رکورد تاریخچهٔ انتشار ثبت می‌شود (`PUBLIC_OK` / `PUBLIC_OK_SELF_PROBE_ARTIFACT` / `PUBLIC_OK_PARTIAL_REACHABILITY` / `EXTERNAL_UNVERIFIED` / `INGRESS_PREEXISTING_BROKEN_PUBLIC_DOWN`) + راهنمای پیگیری مالک در حالت‌های تأییدنشده.

## ۳) چیزهایی که عمداً دست نخوردند

Bootstrap چهار-مسیره + گیت SHA-256 واقعی · Backup دیتابیس قبل از Migration · Migration/Seed یک‌باراجرا Idempotent · رول‌بک فقط-App (دیتابیس/Volumes هرگز) · شاهد KOTODAMA قبل/بعد · چاپ verbatim همهٔ خطاها · بدون `-k`/`--insecure`/`latest`/توکن · تفکیک `/opt/hanaso-src` از `/opt/hanaso`.

## ۴) پوشش آزمون (سندباکس — `infra/deploy/sandbox-tests/`)

- **G1** — بازتولید حادثهٔ TL-14: Baseline عمومی خراب + Tier 3=BROKEN → توقف قبل از هر تغییری (بدون build/migrate/backup) با تشخیص صریح.
- **G2** — درِ فرار `HANASO_ALLOW_UNVERIFIED_INGRESS=1` → انتشار کامل، «Keeping the release»، Smoke محلی، طبقه‌بندی ثبت‌شده.
- **G3** — آرتیفکت Hairpin (Tier 2b ✗، Tier 3=OK) → انتشار می‌ماند.
- **G4** — Tier 3 در دسترس نیست → `EXTERNAL_UNVERIFIED` صادقانه + راهنمای مالک.
- **G5** — Baseline سالم، مسیر عمومی در پنجرهٔ انتشار می‌شکند → رول‌بک واقعی.
- **G6** — Tier 2a روی Host خراب در Baseline → توقف قبل از تغییر.
- رگرسیون کامل DEPLOY-04/05: **۱۴۰/۱۴۰ ادعا سبز** (۱۱۰ موجود + ۳۰ جدید) — mockهای `curl`/`docker` با سوئیچ‌های `SIM_PUBLIC_SELF` / `SIM_INGRESS_DIRECT` / `SIM_EXTERNAL` / `SIM_CHECKHOST_API` و شبیه‌سازی واقعی API وب‌سایت check-host.net (فرمت JSON واقعی نودها) گسترش یافتند.

## ۵) رفتار مورد انتظار در وضعیت فعلی Production (پیش از تعمیر خط مقدم)

اجرای یک‌خطی جدید همین حالا: Preflight → Tier 2b = Empty reply → Tier 3 = BROKEN (تأیید ۵ کشوری همین سشن) → **INGRESS_PREEXISTING_BROKEN، توقف قبل از هر تغییری**، با پیوند به دستورات تشخیصی HAProxy/nginx. یعنی: دیگر نه رول‌بکِ اشتباه، نه پنهان‌کردن خرابی واقعی. پس از تعمیر خط مقدم توسط مالک، همان دستور انتشار را کامل انجام می‌دهد.
