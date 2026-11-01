# ADR-005 — CI Baseline & the Actions Billing Constraint

**TL;DR (فارسی):** خط لولهٔ CI از روز اول کامل است (format→lint→typecheck→test→build→audit→smoke + docker→GHCR tag=SHA) و **روی GitHub Actions هم اجرا و سبز شد** (رن 41286578531 — تمام گام‌های verify موفق). تنها اصلاح لازم: lowercase کردن نام Image برای GHCR. نگرانی بیلینگ KB برای این ریپو برقرار نبود (BLOCKER-F03 بسته شد).

- **مسئله:** مأموریت §۷: با هر تغییر، کیفیت کد و سلامت برنامه بررسی شود؛ اما BLOCKER-005 KB (بیلینگ) اجرای Actions را متوقف کرده است.
- **گزینه‌ها:** (۱) CI کامل + راستی‌آزمایی محلی با شواهد · (۲) CI حداقلی و افزودن مراحل بعداً · (۳) صرف‌نظر از CI تا رفع بیلینگ.
- **شواهد:** KB BLOCKER-005 (برای ریپوی KB)؛ اما شاهد واقعی این ریپو: **رن 41286578531** — job verify کاملاً سبز؛ دروازه‌های محلی همگی سبز (RUN-20261101-01)؛ قالب CI از TASK-M0-03 KB. خطای رن اول در job داکر: نام Image باید lowercase باشد → با `${GITHUB_REPOSITORY,,}` اصلاح شد؛ PR دیپندابات typescript→7.0.2 دقیقاً در Lint شکست خورد (تأیید زندهٔ OTD-004) → قواعد ignore به dependabot.yml افزودیم.
- **مقایسه:** گزینهٔ ۳ کیفیت صفر بود؛ گزینهٔ ۲ بعداً نیاز به بازنویسی داشت؛ گزینهٔ ۱ از روز اول «pipeline سبز-قرمز» می‌سازد و مانع فقط بیرونی است.
- **تصمیم:** `.github/workflows/ci.yml`: job `verify` (checkout@v7 → pnpm/action-setup@v6 (12.16.1) → setup-node@v7 (24, cache) → install --frozen-lockfile → format:check → lint → typecheck → test → build → audit (high/critical = fail) → smoke درون-جاب با `next start` روی پورت 3100) + job `docker` (فقط main؛ build/push به GHCR با tag=SHA؛ permissions: packages:write) + `workflow_dispatch`. نسخه‌های Action پین‌شده. + Dependabot هفتگی.
- **مزایا:** هر PR همان دروازه‌های محلی را می‌بیند؛ image بازتولیدپذیر با SHA. **معایب:** required checks به Branch Protection وابسته است که در پلن Free قفل است (BLOCKER-F07).
- **هزینهٔ تغییر آینده:** افزودن E2E/صفحات Playwright و k6/LHCI = jobهای بعدی روی همین قالب (فاز‌بندی‌شده طبق KB).
- **ریسک‌ها:** pull به GHCR با GITHUB_TOKEN نیازمند settings پیش‌فرض است (_allow GHCR)؛ اگر image push نشد، deploy از build روی VPS به‌عنوان fallback مستند شده.
- **وضعیت تأیید:** `VERIFIED` برای job verify (رن 41286578531)؛ docker/GHCR پس از commit اصلاحی در رن بعدی تأیید می‌شود.
