# ADR-005 — CI Baseline & the Actions Billing Constraint

**TL;DR (فارسی):** خط لولهٔ CI از روز اول کامل است (format→lint→typecheck→test→build→audit→docker→GHCR tag=SHA + smoke داخلی)؛ اما اجرای آن روی GitHub Actions فعلاً به‌دلیل بیلینگ اکانت شروع نمی‌شود — دروازه‌ها محلی سبز و شواهد ثبت شد؛ محدودیت صادقانه در BLOCKERS است.

- **مسئله:** مأموریت §۷: با هر تغییر، کیفیت کد و سلامت برنامه بررسی شود؛ اما BLOCKER-005 KB (بیلینگ) اجرای Actions را متوقف کرده است.
- **گزینه‌ها:** (۱) CI کامل حتی اگر فعلاً اجرا نشود + راستی‌آزمایی محلی با شواهد · (۲) CI حداقلی و افزودن مراحل بعداً · (۳) صرف‌نظر از CI تا رفع بیلینگ.
- **شواهد:** KB BLOCKER-005 (هر ۴ رن اخیر با «payments failed / spending limit» شکست خورده)؛ دروازه‌های محلی این مأموریت همگی سبز شدند (خروجی واقعی در RUN-20261101-01)؛ قالب CI از TASK-M0-03 KB (install→lint→typecheck→test→build→image→GHCR + audit).
- **مقایسه:** گزینهٔ ۳ کیفیت صفر بود؛ گزینهٔ ۲ بعداً نیاز به بازنویسی داشت؛ گزینهٔ ۱ از روز اول «pipeline سبز-قرمز» می‌سازد و مانع فقط بیرونی است.
- **تصمیم:** `.github/workflows/ci.yml`: job `verify` (checkout@v7 → pnpm/action-setup@v6 (12.16.1) → setup-node@v7 (24, cache) → install --frozen-lockfile → format:check → lint → typecheck → test → build → audit (high/critical = fail) → smoke درون-جاب با `next start` روی پورت 3100) + job `docker` (فقط main؛ build/push به GHCR با tag=SHA؛ permissions: packages:write) + `workflow_dispatch`. نسخه‌های Action پین‌شده. + Dependabot هفتگی.
- **مزایا:** هر PR همان دروازه‌های محلی را می‌بیند؛ image بازتولیدپذیر با SHA. **معایب:** تا رفع بیلینگ، وضعیت PRها دستی/محلی تأیید می‌شود (در AGENTS.md و DoD صریح است).
- **هزینهٔ تغییر آینده:** افزودن E2E/صفحات Playwright و k6/LHCI = jobهای بعدی روی همین قالب (فاز‌بندی‌شده طبق KB).
- **ریسک‌ها:** pull به GHCR با GITHUB_TOKEN نیازمند settings پیش‌فرض است (_allow GHCR)؛ اگر image push نشد، deploy از build روی VPS به‌عنوان fallback مستند شده.
- **وضعیت تأیید:** `PROPOSED` — اولین رن سبز واقعی پس از BLOCKER-F03 (اقدام مالک).
