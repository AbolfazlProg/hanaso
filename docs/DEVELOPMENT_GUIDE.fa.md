# راهنمای توسعه (DEVELOPMENT_GUIDE) — فارسی

## پیش‌نیازها

- **Node.js 24 LTS** و **pnpm 12.16.1** (`corepack enable`)
- دسترسی خواندن به `japanese-learning-kb` (clone هم‌سطح این ریپو؛ یا متغیر `KB_PATH`)
- هیچ فایل `.env` برای اجرای اسکلت لازم نیست (D نصب نشده — از M0-10)

## راه‌اندازی

```bash
git clone https://github.com/AbolfazlProg/hanaso.git && cd hanaso
corepack enable && pnpm install
KB_PATH=../japanese-learning-kb "$KB_PATH/scripts/install-skills.sh ."   # نصب ۱۶ Skill (خروجی: .claude/skills/)
pnpm verify    # format:check + lint + typecheck + test + build + smoke + secret-scan — همه با یک فرمان
pnpm dev       # http://localhost:3000 · سلامت: /api/health و /api/ready
```

## دروازه‌های کیفیت (قبل از هر PR — بدون استثنا)

| فرمان               | چه چیزی را تضمین می‌کند                                       |
| ------------------- | ------------------------------------------------------------- |
| `pnpm format:check` | یکپارچگی قالب‌بندی (Prettier)                                 |
| `pnpm lint`         | خطاهای ESLint صفر (قواعد مرز/امنیت از TASK-M0-02 کامل می‌شود) |
| `pnpm typecheck`    | TypeScript strict صفر خطا                                     |
| `pnpm test`         | تست‌های واحد/یکپارچه سبز                                      |
| `pnpm build`        | بیلد موفق (خروجی standalone)                                  |
| `pnpm smoke`        | اجرای واقعی سرور + پاسخ ۲۰۰ از `/api/health` و `/api/ready`   |
| `pnpm verify`       | همهٔ فوق + اسکن Secret                                        |

## گردش کار Git (خلاصه — کامل: `AGENTS.md` + KB `agent-workflow.md`)

1. Issue را بردار (یا بساز) → Branch: `feat/<module>-<slug>` از `main` به‌روزشده.
2. کامیت‌های کوچک Conventional با scope ماژولی: `feat(health): … — TASK-ENG-01`.
3. `pnpm verify` سبز → PR (قالب `.github/PULL_REQUEST_TEMPLATE.md`) با خروجی واقعی دروازه‌ها.
4. بازبینی مستقل (زمینهٔ تازه) → رفع یافته‌ها → merge با Squash.
5. به‌روزرسانی `PROJECT_STATUS.md` در صورت تغییر مهم + ردیف در `AGENT_PROGRESS.md`/رجیستری‌های `ops/`.

## قواعد مرزی (خلاصهٔ اجرایی)

- کد فقط از `index.ts` عمومی ماژول دیگر import می‌کند؛ هرگز deep-import یا دسترسی مستقیم به جدول ماژول دیگر.
- فایل‌های هماهنگی (`tokens.css`، `fa.ts`، ADR، CI) — تغییر ترتیبی با اعلام قبلی.
- Secret ممنوع؛ نام متغیرها فقط در `.env.example`.
- UI: ژاپنی فقط داخل بلوک‌های `dir="ltr" lang="ja"`؛ اعداد با `faNum()`؛ فقط ابزارهای CSS منطقی (`ms-/me-/ps-/pe-`).
