# CHECKPOINT_LOG — TASK-LEARNING-09

## CP-01 — 2026-11-09 (اوایل کار): بازیابی وضعیت + ممیزی BEFORE

- شاخهٔ `tl09-responsive` از `tl08-deploy05` @ `36e390d` (working tree پاک؛ نویز filemode با `core.fileMode false` رفع شد).
- محیط: pnpm 12.16.1 (user prefix) · `pnpm install --frozen-lockfile` · dev سرور HANASO روی پورت ۳۰۰۰ از طریق `dev.sh` پلتفرم (پیش از آن سرور scaffold ریشه ۵۰۰ می‌داد).
- **رفع Live Preview**: Next 16 درخواست‌های cross-origin توسعه را می‌بست (HMR/فونت از `127.0.0.1` و `preview-chat-…space-z.ai`) → `allowedDevOrigins` در `apps/web/next.config.ts`؛ هیدراسیون صفحهٔ درس که گیر «در حال بارگذاری» بود، سالم شد. مالک همین حالا از پنل Preview نسخهٔ در حال توسعه را می‌بیند.
- ممیزی BEFORE: اسکرین‌شات واقعی (Chromium) + هندسهٔ DOM در ۳۶۰/۳۹۰/۷۶۸/۹۶۱/۱۲۸۰/۱۴۴۰/۱۹۲۰ → ریشه‌ها: main=672px، ستون‌های ۲۸۹px، پنلِ روایت دور از canvas، あう دوبار، یادسپارها کاملاً مخفی (گیت approved-only + همهٔ ۹۲ داستان draft).
- خط پایهٔ تست قبل از تغییر: **580/580 سبز**.

## CP-02 — 2026-11-09: پیاده‌سازی چیدمان + ادغام + بازگشت داستان‌ها

- کامیت `e9c7712`: KanaCard v6 (@container دو‌ستونه با Container Query)، نردبان کانتینر درس، سه گروه معنایی موبایل، ادغام §۶ با دی‌داپ، بازگشت §۱۵ یادسپارها، گرید واژگان auto-fit، گزینه‌های تمرین ۲ ستونه، allowedDevOrigins.
- کامیت `2cc4a21`: شواهد before/after (۳۰ فایل PNG در `agent-ctx/tl09-shots/`).
- گیت‌ها: vitest **580/580** · tsc · eslint 0 · prettier · overflow افقی صفر ×۹ اندازه · regression رفتار آموزشی در مرورگر واقعی (CTA/اسکرول/قضاوت/فولدها/بازیابی) · VLM مکمل.
- فایل‌های این Checkpoint: `CURRENT_STATE.md` + همین لاگ + `RESPONSIVE_QA_REPORT.md`.

## CP-03 — برنامه‌ریزی‌شده: Push + CI + نسخهٔ یک‌خطی

- Push شاخه به origin (PAT فقط از طریق API) → CI سبز → Pin `1.0.0-tl09-r01` → OWNER-COMMAND/راهنمای v4 با SHA-256 بوت‌استرپ جدید → تست ایزولهٔ نصب → گزارش نهایی ۱۴ بندی.
