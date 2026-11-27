# RUN-20261127-02 — LESSON-UX PART2 DEPLOY: انتشار main `4ca1d0db` روی production

**تاریخ:** 2026-11-27 · **Agent:** GLM (سشن وب) · **نوع:** deploy (بدون تغییر کد)

## زمینه

PR #207 (LESSON-UX PART2 — بازسازی برگهٔ خواندن، صدای جدید سورا، آوانگاری فارسی میزبان‌ها، برچسب مهارت، رفع نشت پاسخ) در سشن قبل مرج شد؛ CI سبز شد و ایمیج GHCR با tag `4ca1d0db…` ساخته شد (2026-11-26T22:12Z) — اما سشن پیش از استقرار قطع شد و production روی `1d417fd` (PART1) ماند. این اجرا فقط همان گام جاافتاده را انجام می‌دهد: **رساندن همان ایمیجِ از پیش ساخته‌شده به VPS** — بدون هیچ تولید صدای مجدد (دارایی‌های صوتی PR داخل ایمیج commit شده‌اند و عیناً منتقل شدند).

## مسیر استقرار (سه تلاش)

1. **docker pull مستقیم از GHCR** (الگوی اسکریپت‌های deploy قبلی): هر ۳ تلاش با `TLS handshake timeout` به `pkg-containers.githubusercontent.com` شکست خورد — همان الگوی مسدودشدن CDN از ایران. fail-closed؛ هیچ چیزی تغییر نکرد.
2. **مسیر transport-repo** (مثل PART1): ایمیج linux/amd64 با Registry API در سندباکس بازسازی شد (۳۶۱,۵۳۳,۴۴۰ بایت؛ ۲۰ blob — config + ۱۹ layer — همه sha256 راستی‌آزمایی شد) → آرشیو docker-archive با sha256 `cb7d65e8655f4b2409e2c2c475dab9e648fcdb9385f2c26b7e9cce68a05d3c52` → ۶ قطعهٔ ۶۰MB → push به ریپوی `deploy-transport` (کامیت `b73abe2`).
   - کلون کامل ریپو روی VPS شکست خورد (`fetch-pack: invalid index-pack output` — تاریخچهٔ ریپو شامل قطعات PART1 است و دانلود را سنگین می‌کند).
   - curl ساده با resume روی اتصالِ blackhole تا ۱۵ دقیقه معلق می‌ماند (بدون `--connect-timeout`).
3. **دانلودگر مقاوم (نهایی، `/root/deploy-p2d.sh` — sha256 `01032202…`):** هر قطعه در پاره‌های ۴MB با Range request + resume درون‌قطعه + `--connect-timeout 12` + stall-detect (`--speed-time 45 --speed-limit 2048`)؛ هر پاره تا کامل شدن تلاش می‌کند و پیشرفت هرگز از دست نمی‌رود. اجرا با `setsid` (مقاوم به قطع ترمینال/سشن). کل انتقال ~۵۷ دقیقه با نرخ مؤثر ~۱۱۰KB/s.

## گام‌های VPS و راستی‌آزمایی

| گام | نتیجه |
| --- | --- |
| بکاپ فقط-خواندنی DB | `db-pre-p2-20261127T063006Z.sql` + `.env.pre-p2` (قبل از هر تعویض) |
| راستی‌آزمایی قطعات | ۶/۶ قطعه `sha256sum -c` OK + sha256 کل آرشیو OK |
| docker load | `Loaded image: ghcr.io/abolfazlprog/hanaso:4ca1d0db…` |
| سینک سورس | `/opt/hanaso-src` detach به `4ca1d0db` (override فایل 1core دست‌نخورده) |
| migrate/seed (idempotent) | `applied:true` · seed: 4 characters, 1 dialogue, 10 lines · seed:curriculum: 7 levels, 3 units, **93 stations** |
| تعویض staged | فقط خط `HANASO_WEB_IMAGE` در `.env` → `up -d --no-deps web worker` (postgres/pgbouncer دست‌نخورده) |
| دروازهٔ سلامت tier1 | `ok:true` + `commit":"4ca1d0db…"` روی 127.0.0.1:3100 ✓ (rollback خودکار به `1d417fd` تعریف شده بود — لازم نشد) |
| ready | process ok · database ok (SELECT 1، latency 43ms، PG 18.6) |
| سلامت از بیرون | `https://hanaso.ir/api/health` → `commit":"4ca1d0db…` ✓ |
| دارایی صوتی جدید | `w-00859a61c08f1c32.m4a` → HTTP 200، 7677 بایت — دقیقاً مطابق manifest (`entries: 1503`) |
| صدای بازتولیدشدهٔ سورا | `s-first-meeting-01-l4.m4a` → HTTP 200 (44526 بایت) |
| پاک‌سازی | فایل‌های transport روی VPS حذف شدند؛ دیسک 78٪ |

## نتیجه

**LIVE `4ca1d0db…` از 2026-11-27T07:43:48Z** — LESSON-UX PART2 روی production. ایمیج کهنهٔ `1d8ad38` برای فضای دیسک قابل prune است؛ `1d417fd` به‌عنوان هدف rollback نگه داشته شد.

## بدهی / گام بعدی

- **#202 (تغییر اسم کاراکترها) همچنان باز** — منتظر انتخاب نام توسط مالک؛ فهرست پیشنهادی در کامنت Issue ثبت شده و اجرایش پس از تأیید در یک PR واحد (رجیستری + دیالوگ‌ها + بازتولید صوت با نام‌های جدید) انجام می‌شود.
- قطعات transport پس از این ثبت، از ریپوی deploy-transport با reset-commit پاک می‌شوند (الگوی PART1).
