# Changelog — HANASO

> قالب نسخه‌ها: **CalVer `YYYY.0M.N`** · محور استقرار: تگ=SHA · پیام‌ها فارسی و قابل‌فهم.
> هیچ ادعایی بدون شناسهٔ commit قابل‌استناد ثبت نمی‌شود.

## 2026.11.6 — تجربهٔ آموزش ریسپانسیو حرفه‌ای + ادغام واژگان + بازگشت داستان‌های یادسپار (2026-11-09)

**نوع:** TASK-LEARNING-09 — چیدمان دسکتاپ/تبلت/موبایل + §۱۵ بازگرداندن داستان‌های Kana (شاخهٔ `tl09-responsive` · کامیت `e9c7712`).

### افزوده شد

- **کانتینر درس واکنش‌پذیر:** نردبان `max-w-2xl→50rem→64rem→72rem` (سقف ۱۱۵۲px دسکتاپ) — جایگزین ستونِ ۶۷۲px مرکزی؛ KanaCard یک `@container` واقعی شد: زیر ۴۲rem محتوایی تک‌ستونِ مرتب، بالاتر گرید دو‌ستونهٔ متعادل `minmax(19rem,26rem)+minmax(19rem,34rem)` با justify-center
- **گروه‌بندی معنایی موبایل (§۵ مالک):** گروه ۱ «رسم و ترتیب نوشتن» = canvas + dots + اکشن‌اسلات + پنل مرحله (پنلِ روایت برگشت کنار canvas) · گروه ۲ «شناخت و تلفظ» · گروه ۳ «واژگان» — فاصلهٔ بین‌گروه ۲۴px / درون‌گروه ۱۲px؛ حذف فیلر min-height
- **ادغام واژگان (§۶):** «واژهٔ قابل‌خواندن» + «نمونه‌های کاربردی» → یک بخش «**نمونه‌های قابل‌خواندن**»؛ واژهٔ میزبان = کارت لنگر (واژه‌سازی پله‌ای + صوت مستقل + روماجی)؛ دی‌داپ روی ja (あう فقط یک‌بار)؛ غنی‌سازی خوانش فارسیِ کارت لنگر از مثالِ همسان
- **بازگشت داستان‌های یادسپار (§۱۵):** هر ۹۲ داستانِ موجود در داده با برچسب صادق «داستانِ یادسپار» به جریان معرفی برگشتند (علت خاموشی: گیت `status==='approved'` در Addendum-3 §11 بدون آنکه بازبینی انسانی OQ-051 هرگز انجام شود) — badge پیش‌نویس حذف می‌ماند؛ وضعیت داده دست‌نخورده
- **شبکهٔ کارت‌های واژگان:** `auto-fit minmax(19.5rem,1fr)` — جریان ۱→۲→۳ ستون براساس عرض واقعی؛ بلوک example-set مستقل با ۵ کارت → ۳×۳۶۵px در دسکتاپ؛ گزینه‌های تمرین ۲ ستونه از ۶۴۰px
- **فولد تمرین یکپارچه:** «اطلاعات معرفی — تلفظ، یادسپار و جفت مشابه» (خوانش+یادسپار+جفت) + فولد مثال‌ها؛ نکات نوشتن باز می‌مانند
- **Live Preview سندباکس:** `allowedDevOrigins` برای میزبان‌های preview (رفع بستن cross-origin توسعهٔ Next 16)

### رفع شده

- دسکتاپ ۱۴۴۰: محتوا ۶۷۲px → ۱۱۵۲px؛ canvas له‌شدهٔ ۲۸۹px → ۴۱۶px پایدار؛ ستون اطلاعات ۵۴۴px (−۱۵٪ ارتفاع)
- تبلت ۷۶۸: تک‌ستونهٔ ۲۶۸۱px → دو ستونِ ۳۳۵px با ارتفاع ۱۶۳۲px (−۳۹٪)
- موبایل: پنل روایت که هنگام تمرین دور از canvas می‌افتاد، کنار canvas برگشت؛ あう دیگر دوبار نمایش داده نمی‌شود

### تست

- ۵۸۰ تست واحد سبز (۳ فایل تست به اسپک §۶/§۱۵ به‌روز شد) · tsc · eslint 0 · prettier · stylelint
- Visual QA در Chromium واقعی: ۹ اندازهٔ مالک (۳۶۰/۳۹۰/۴۳۰/۷۶۸/۹۶۱/۱۰۲۴/۱۲۸۰/۱۳۶۶/۱۴۴۰/۱۹۲۰) × ۴ پروفایل محتوا (کم/زیاد/جفت‌دار/چندضربه‌ای) — **overflow افقی صفر در همه**؛ شواهد قبل/بعد در `agent-ctx/tl09-shots/` + `ops/checkpoints/TASK-LEARNING-09/RESPONSIVE_QA_REPORT.md`

## 2026.11.5 — Database Layer: PostgreSQL + PgBouncer + Worker + بکاپ اثبات‌شده (2026-11-02)

**نوع:** TASK-M0-10 لایهٔ DB (PR #74 · merge `2d73080` · RUN-20261102-02/03).

### افزوده شد

- **لایهٔ DB کامل:** ‏PostgreSQL 18 repositories (attempts/progress) + سوییچ `DATABASE_URL` + `/api/ready` واقعی (چک `SELECT 1` از pool خود اپ؛ fail → 503 بدون لو رفتن جزئیات)
- **Migration + Seed:** migrator ران‌تایم drizzle (هم‌فرمت drizzle-kit) + seed idempotent با uuidv5 قطعی
- **Worker:** ‏pg-boss 12 در حالت polling (سازگار با PgBouncer transaction-pooling) + صف‌های `ops.backup` (۰۳:۳۰) و `ops.db-verify` (۰۴:۰۰) به وقت تهران
- **زیرساخت میزبان مشترک:** postgres (بدون پورت منتشرشده؛ چیدمان volume ‏PG18 روی والد) + PgBouncer (6432، scram-sha-256، max_prepared_statements=200) + سقف منابع هر سرویس + Volumeهای اختصاصی `hanaso-pgdata`/`hanaso-backups`
- **Dockerfile:** ابزارهای pg_dump/pg_restore/psql/pg_isready هم‌major از همان image پین‌شدهٔ postgres + گیت اجرای build
- **CI:** جاب `compose-smoke` — تمرین کامل استقرار مرحله‌ای + دریل واقعی بکاپ/ریستور با image واقعی؛ داشبورد تشخیصی هنگام شکست (لاگ کانتینر/پراب‌ها/OOMKilled)
- **بکاپ:** ‏`pg_dump -Fc` اتمیک (.part → rename) + تأیید `pg_restore --list` + نگهداشت ۷/۴/۶ (KB) + گارد رد restore روی DB زنده

### رفع شده

- سه باگ واقعی استقرار که فقط اجرای واقعی آشکار کرد: پراب سوکتی زودهنگام-healthy · مسیر legacy حجم در PG18 (crash-loop) · پیکربندی نامعتبر edoburu/pgbouncer (`scram` → `scram-sha-256`؛ نبودن `LISTEN_PORT=6432`)
- باگ واقعی ۲۳۵۰۵: دیتکتور retry حالا زنجیرهٔ `cause` را می‌بیند (خطای pg داخل drizzle پیچیده می‌شود)

### تست

- ۱۵۱ تست واحد (۲۰ فایل؛ +۱۸ جدید) · ۳۲ تست integration روی PostgreSQL 18 واقعی (۵ فایل؛ +۷ جدید شامل دریل بکاپ/ریستور) · دروازه‌ها ALL GREEN
- استقرار زنده + راستی‌آزمایی: هر ۴ سرویس healthy · POST واقعی → ردیف در PG · دریل restore روی VPS: شمارش ۶ جدول دقیقاً برابر

## 2026.11.3 — UI Infrastructure: پورت کامل توکن‌ها + فونت سلف‌هاست + FuriganaText + ۹ کامپوننت (2026-11-01)

**نوع:** زیرساخت مشترک UI — TASK-M0-09 (RUN-20261101-04).

### افزوده شد

- **پورت کامل tokens.css** از KB DD-067 LOCKED (رفع بدهی review B-8): info/scrim/overlay-audio · radius-full · dur-shimmer/spin (+صفرشدن زیر reduced-motion — AC-907) · leading-fa/ja · tracking-ja-heading · hairline/shadow/z/touch/frame · نام‌های فونت KB (--font-ja-ui/serif/ud)
- **فونت‌های سلف‌هاست** (طرح اسپایک M0-07): ۷ فایل woff2 ساب‌ست‌شده + OFL — Vazirmatn FD 400/500/700 (۹۵KB) + Zen Kaku starter 400/500/700 (۴۸۸KB) + Noto Serif JP VF 200–900 (۱٫۱۵MB) — جمع ۱٫۷۳MB زیر هاردکپ ۲٫۳MB · فقط Vazirmatn preload · `fonts.ts` با next/font/local
- **FuriganaText** طبق قرارداد spike M0-08 §۶: جزیرهٔ LTR اجباری + group-ruby فقط + rt غیر‌انتخاب‌پذیر + DSL `base[reading]` + سازگاری ساختاری با DialogueToken
- **DirectionProvider dir="rtl"** در ریشه (الزام spike M0-06 برای رفتار Radix)
- **۹ کامپوننت shadcn** (Button/Dialog/Sheet/Tabs/Accordion/Tooltip/DropdownMenu/Command/Toast) با استایل توکنی HANASO + سربرگ RTL-audit هر فایل
- **الگوهای دامنه:** JapaneseSentence (کارت جمله + ترجمهٔ بازیابی فعال) · AudioSentenceButton · JaBlock
- **دیکشنری تایپ‌دار فارسی** `src/messages/fa.ts` (ADR-013)
- **صفحهٔ مرجع رندر** `/poc/ui` — نمونهٔ ترکیبی FA+JA+روبی + هر ۹ کامپوننت در RTL
- **۲ دروازهٔ جدید در verify:** `lint:css` (stylelint use-logical — AC-1: صفر left/right فیزیکی) و `check:fonts` (بودجهٔ حجم + الزام OFL) — دروازه‌ها ۷→۹

### تغییر داد

- `next.config.ts`: **React Compiler روشن** (`reactCompiler: true` — توصیهٔ عددی spike M0-05: ~۲۴× رندر مجدد سریع‌تر)
- `vitest.config.ts`: پشتیبانی از تست‌های tsx
- ledgers هم‌گاه شدند (TASK_REGISTRY/AGENT_RUN_LOG/AGENT_PROGRESS/NEXT_ACTIONS/CURRENT_PHASE/PROJECT_STATUS)

### شناخته‌شده/محدودیت‌ها

- WebKit در محیط Agent قابل‌اجرا نیست (گرافیک‌استک WPE بدون sudo) — آزمون مرورگر سوم به FT-002 موکل شد؛ Chromium+Firefox با اندازه‌گیری کامل سبز
- `--font-ja-ud` (BIZ UDPGothic) تعریف شد ولی بارگذاری نشد — مؤخر طبق بودجهٔ spike §۶-۲ (+≤700KB) و انتخاب مالک دربارهٔ فونت مبتدی

## 2026.11.2 — First Live Deployment: Preview روی learn.kotodama.ir (2026-11-01)

**نوع:** نخستین استقرار واقعی محصول — TASK-M0-10 لایهٔ Web (RUN-20261101-03).

### افزوده شد

- **Preview زنده روی https://learn.kotodama.ir** — دستور مالک (تغییر مقصد از `preview.hanaso.ir` به ساب‌دامینهٔ موجود kotodama): image `ea701342` از GHCR (خروجی CI) در Docker ایزوله (project `hanaso` · شبکهٔ `hanaso-net` · فقط `127.0.0.1:3100`) پشت reverse-proxy موجود میزبان (HAProxy:443 → nginx:81/82 → upstream) — معماری و رویهٔ کامل: **`infra/deploy/learn-kotodama/`** (README + کپی دقیق compose و vhost nginx)
- رکورد اجرا `ops/runs/RUN-20261101-03.md` + گزارش بازبینی مستقل `ops/reviews/DEPLOY-LEARN-R1.md`

### تغییر داد

- پروژهٔ قبلی همان آدرس (`genesis-learn.service` روی `127.0.0.1:3100`) به دستور صریح مالک **بازنشسته شد** (stop+disable؛ بکاپ vhost در `/root/backups/pre-hanaso-20261101/`؛ فایل‌های ۱۱۴MB حذف نشدند — حذف نهایی نیازمند تأیید مالک)
- **BLOCKER-F02 بسته شد** (مالک VPS ارائه کرد) و **BLOCKER-F04 بسته شد** (تغییر مقصد Preview به دامنهٔ آمادهٔ `learn.kotodama.ir`)
- ledgers هم‌گاه شدند: PROJECT_STATUS / CURRENT_PHASE / TASK_REGISTRY (M0-10 → In Progress با Web-tier Deployed) / NEXT_ACTIONS / PHASE_STATUS (گیت ۸ M0 ✓) / AGENT_RUN_LOG

### شناخته‌شده/محدودیت‌ها

- Preview فعلی DB ندارد (فاز اسکلت): `/api/ready` → `database: skipped` — لایهٔ DB (Postgres/PgBouncer/Worker + بکاپ) باقیِ M0-10 است
- میزبان مشترک است (BigBlueButton + kotodama.ir + voicevox هم‌زمان زنده‌اند) — تغییر firewall/HAProxy/nginx بدون بکاپ+تست+مجوز ممنوع
- Node میزبان v22 است؛ اجرا فقط از مسیر Docker (image بر base node:24-alpine)

## 2026.11.1 — Real Development Start: B-0 Spikes + Dialogue PoC + First Vertical Slice (2026-11-01)

**نوع:** نخستین قابلیت‌های واقعی محصول — مجوز صریح مالک (DD-080) + ثبت تصمیم‌های صوت/شخصیت/انیمیشن (DD-081..083).

### افزوده شد

- **B-0 Spikes** (PR #62، `9ed1ec8`): چهار اسپایک مهندسی با اعداد قابل‌بازتولید — React Compiler 1.0 (رندر مجدد ۷۲٫۸→۳٫۰ms ≈ ۲۴×) · RTL-audit Radix (DirectionProvider اجباری؛ flyout موبایل ممنوع — ۱۳۷px سرریز) · فونت‌ها از ایران (توصیهٔ self-host؛ اولیه ~۵۸۰KB در برابر 11.4MB CDN) · رفتار `<ruby>` در RTL (جزیرهٔ LTR اجباری؛ lh≥2؛ الگوی FuriganaText)
- **TASK-DLG-POC-01** (در PR #64): موتور پخش pure-TS با `AudioBackend` تزریق‌پذیر (gap دقیق؛ dispatch ۰ms؛ probe واقعی max 1.3ms) · قرارداد سه‌لایهٔ ADR-018 (CharacterAssetManifest/Renderer/AnimationController) + رندرر SVG Placeholder متحرک · ماژول صوت (dual-source، prefetch دوخطی، خطاهای typed) · FSRS درون‌بافت (`context_line_id`) · دیالوگ کافهٔ ۱۰خطی/۳گوینده · صفحات `/poc/{dialogue,lesson,assessment,t2-eval}` · اسکریپت بنچمارک VOICEVOX
- **اولین Learning Vertical Slice** (PR #64، `3b652ae`): چرخهٔ کامل `Dialogue→Learn→Practice→Mastery` با گیت سروری `understood` (فقط از passed مرحلهٔ D — DD-048) · ماژول Practice (۴ نوع تمرین تولیدشده از خود مکالمه) · ماشین حالت A→D · `/learn` · **اسکیمای Drizzle دو-شیمایی** (۱۲ جدول content + ۲ app + `audio_assets` با ردیابی کامل DD-081) + migration + ۱۸ تست SQL
- **نمره‌گذاری سروری مرحلهٔ D**: کلاینت فقط پاسخ خام می‌فرستد؛ کلید پاسخ هرگز به باندل کلاینت نمی‌رسد (رفع S1 بازبینی مستقل)
- ۹۱ تست جدید (۵ → ۹۶): موتور پخش/زیرنویس/خطاهای صوت/انیمیشن شخصیت/اسکیما/FSRS/تمرین/پیشرفت/مسیر کامل

### تغییر داد

- گیت‌های مالک OQ-006/013/014/017/018 بسته شدند (تصمیم‌های DD-080..083 در KB `7450a49`)؛ BLOCKER-002/003/004 بسته شد
- ترجمهٔ فارسی در صحنهٔ دیالوگ پیش‌فرض **خاموش** شد (comprehension-first — KB)
- DD-012 با ابطال جزئی مستند به DD-083 به‌روز شد (انیمیشن سبک سر و صورت از v1 الزامی)

### شناخته‌شده/محدودیت‌ها

- DB زنده در Sandbox اجرا نشد (repositoryهای in-memory `DEV-ONLY`؛ اتصال واقعی = M0-10/M1 با `DATABASE_URL`)
- T2 (دوسوکور — فرم `/poc/t2-eval` آماده) · T9 (ماتریس دستگاه) · T10 (بنچمارک VOICEVOX) نیازمند Preview/VPS/ارزیاب
- صدوهای فعلی placeholder سینوسی (F0 متمایز ۲۱۰/۱۱۰/۱۶۰Hz) — `pnpm gen:audio`
- بدهی‌های S3 بازبینی (FSRS wiring مرحلهٔ C، بازآزمون هدفمند، ۰٫۹×، …) در GitHub Issues ثبت شده‌اند

## 2026.11.0 — Engineering Foundation (2026-11-01)

**نوع:** زیرساخت — هیچ قابلیت آموزشی در این نسخه نیست (عمدی).

### افزوده شد

- ریپوی محصول `hanaso` (private) با ساختار Monorepo سبک (`apps/web` + `packages/`) — ADR-002
- اسکلت اجرایی Next.js **16.4.3** (App Router · RSC · standalone) + React **19.3.1** + TypeScript strict + Tailwind **4.3.3** با توکن‌های DD-067
- اندپوینت‌های سلامت: `GET /api/health` (liveness + build-info) و `GET /api/ready` (readiness) + پوشش تست واحد + smoke واقعی
- قرارداد خطای مشترک `Envelope<T>` در `modules/shared` + تست واحد
- CI کامل (format→lint→typecheck→test→build→audit→docker→GHCR tag=SHA) + Dependabot — ADR-005
- زیرساخت استقرار: Dockerfile چندمرحله‌ای non-root + compose ایزوله + Caddy 2.11 + اسکریپت‌های deploy/rollback — ADR-003
- حاکمیت چند-Agentی: `AGENTS.md` ۹بخشی + `ops/` کامل (رجیستری/اجرا/بازبینی/قالب‌ها) + مالکیت ماژول‌ها + DoD
- سیستم مدیریت پیشرفت GitHub: Project «HANASO Development» + ۹ Milestone + ۳۶ Issue با AC وابستگی‌دار + تنظیمات squash-only/delete-branch — ADR-004 (محافظت سروری main در پلن Free قفل شد: BLOCKER-F07؛ کنترل جبرانی = قاعدهٔ Agent + بازبینی مستقل)
- مستندات: گزارش تجمیعی دانش (وضعیت‌های CONFIRMED/PROVISIONAL/…) · ADR-000..005 · بازارزیابی Stack ۲۰۲۶-۱۱-۰۱ · راهنمای توسعه/عملیات · طرح Preview

### تغییر داد

- نام کاری محصول: `japanese-learning-app` → **`HANASO`** (دستور مالک ۲۰۲۶-۱۱-۰۱؛ ثبت OQ-002 در KB در جریان — spec-gap)

### شناخته‌شده/محدودیت‌ها

- VPS در دسترس نیست (BLOCKER-F02) · DNS `hanaso.ir` از محیط Agent قابل‌راستی‌آزمایی نبود (BLOCKER-F04) · محافظت شاخهٔ main نیازمند GitHub Pro است (BLOCKER-F07). نکتهٔ مثبت: Actions اجرا و job «verify» کاملاً سبز شد (رن 41286578531) — نگرانی بیلینگ برای این ریپو برقرار نبود و پس از اصلاح، هر دو job (verify + image→GHCR) در رن‌های 41287442815 و 41289890549 سبز شدند.
