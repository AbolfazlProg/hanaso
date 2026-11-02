# ممیزی Skillها و استفادهٔ واقعی Agentها — TASK-OPS-01 §۴

> **تاریخ:** ۲۰۲۶-۱۱-۰۲/۰۳ · **دامنه:** PR #76 (TASK-ENG)، ۲۸ Skill (۱۶ داخلی + ۱۲ خارجی)، سوابق استفادهٔ واقعی در `ops/runs/`
> **نتیجهٔ عملیاتی:** PR #76 پس از بازبینی نهایی و CI سبز، **در همین مأموریت merge شد** (`eb80e88`).

---

## ۱. PR #76 — وضعیت نهایی و بازبینی انجام‌شده

| قلم                      | مقدار                                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| شاخهٔ head               | `feat/eng-external-agent-skills`                                                                                                                         |
| حجم تغییرات              | ۱۵۸ فایل · +14,663 / −72                                                                                                                                 |
| مسیر                     | `agent-skills/external/` (۱۲ Skill) · `docs/engineering/skills/` (۱۱ سند) · `scripts/` (۳ اسکریپت) · `AGENTS.md` §۳ · PR Template · قالب‌های ops         |
| CI قبل از merge          | `CI #36` روی `0dc7255` ✅ success (هر ۹ گیت شامل integration-PG18 و compose-smoke)                                                                       |
| تعارض با main            | بله — add/add روی `RUN-20261102-02.md` + ۳ فایل دیگر (شرح §۱-۲)                                                                                          |
| راه‌حل تعارض             | بازشماره‌گذاری رکورد TASK-ENG به **RUN-20261102-04** (جداشدن از رکورد M0-10 با همان شماره) + merge دو ورودی AGENT_PROGRESS + union قوانین prettierignore |
| بازبینی محلی این مأموریت | `pnpm format:check` ✅ · `pnpm lint` ✅ · `audit-external-skills.py` ✅ **PASS (۰ HIGH/MEDIUM)** · ۱۵۱/۱۵۱ unit ✅                                       |
| عملیات نهایی             | Squash merge → `eb80e88` روی main                                                                                                                        |

## ۲. صحت‌سنجی محتوای Skillهای خارجی

هر ۱۲ Skill نمونه‌برداری/راستی‌آزمایی شد:

- **ساختار الزامی:** `SKILL.md` (محتوای verbatim بالادستی در commit پین‌شده) + `PROVENANCE.md` (منبع/SHA/مجوز/ستارها-تاریخ/محدودیت‌ها/تطبیق‌ها) + `LICENSE` — ✅ در همه موجود.
- **مجوزها:** همه Apache-2.0 یا MIT (رایگان/متن‌باز) — با الزام مأموریت #75 سازگار.
- **ممیزی امنیتی:** ابزار دائمی `scripts/audit-external-skills.py` اجرا شد → **PASS با صفر یافتهٔ HIGH/MEDIUM** (اسکن: frontmatter، فایل‌های اجرایی، URLهای خارجی — فقط URLهای مجوز/github در PROVENANCE).
- **تطبیق امنیتی محتوا:** تنها تغییر محتوایی بالادستی `web-design-guidelines` (حذف fetch شبکه‌ای → قواعد محلی) در PROVENANCE مستند شده — ✅ شفاف.

فهرست ۱۲ Skill خارجی (EXT-001..012): frontend-design · next-bundle-optimizer · next-dev-loop · postgresql-table-design · seo-technical · stride-analysis-patterns · systematic-debugging · test-driven-development · vercel-react-best-practices · wcag-audit-patterns · web-design-guidelines · webapp-testing

## ۳. استفادهٔ واقعی توسط Agentها (§۴.۱ — ادعا در برابر مدرک)

روش: بررسی هر رکورد اجرا (`ops/runs/`) برای بخش «Skillهای استفاده‌شده» با ذکر نام و کاربرد.

| رکورد                             | تسک               | بخش Skill با جزئیات؟                                                                    | حکم                                             |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| RUN-20261101-01                   | پایه‌گذاری مهندسی | ✅ ۶ Skill با نقش هرکدام + شواهد نصب (`install-skills.sh → 16 skill(s)`)                | **تأیید ساختاری** (اعلام + انطباق با ماهیت کار) |
| RUN-20261101-02                   | Slice/PoC merge   | ❌ بخش Skill ندارد                                                                      | **USAGE NOT VERIFIED**                          |
| RUN-20261101-03                   | استقرار Web-tier  | ✅ ۳ Skill با کاربرد مشخص (devops-deployment/security-privacy/kb-documentation)         | **تأیید ساختاری**                               |
| RUN-20261101-04                   | زیرساخت UI        | ❌ بخش Skill ندارد                                                                      | **USAGE NOT VERIFIED**                          |
| RUN-20261102-01                   | اجرای Aizen       | ❌ بخش Skill ندارد                                                                      | **USAGE NOT VERIFIED**                          |
| RUN-20261102-02                   | لایهٔ DB (کد)     | ❌ (در نسخهٔ PR #76 اصلاح و به RUN-20261102-04 منتقل شد؛ نسخهٔ اصلی بدون بخش Skill بود) | **USAGE NOT VERIFIED**                          |
| RUN-20261102-03                   | استقرار DB + دریل | ❌ بخش Skill ندارد                                                                      | **USAGE NOT VERIFIED**                          |
| RUN-20261102-04 (پس از merge #76) | Skillهای خارجی    | ✅ (رکورد همین تسک است — شامل فهرست اسناد خوانده‌شده)                                   | **تأیید ساختاری**                               |

> **جمع‌بندی صادقانه:** ادعای «استفادهٔ مؤثر Skill در همهٔ تسک‌ها» تا پیش از PR #76 **قابل‌تأیید نبود** (۲ از ۷ رکورد قدیمی دارای اعلان معتبر). PR #76 این را برای آینده ساختاریاً الزامی کرد (بند §۴) اما **گذشته را عطف به ماسبق اصلاح نمی‌کند** — رکوردهای قدیمی به‌عنوان‌هست باقی می‌مانند.

## ۴. پوشش حداقلی Skillها (§۴.۲)

| حوزهٔ الزامی               | پوشش | از کجا                                                                             |
| -------------------------- | ---- | ---------------------------------------------------------------------------------- |
| UI/UX و Visual Design      | ✅   | EXT frontend-design · EXT web-design-guidelines · SKL design-system-implementation |
| Aizen Design System        | ✅   | SKL design-system-implementation + KB DD-084                                       |
| React و Next.js            | ✅   | EXT vercel-react-best-practices · EXT next-dev-loop · SKL frontend-engineering     |
| TypeScript                 | ✅   | SKL frontend-engineering/backend-engineering + قواعد داخل react-best-practices     |
| Web Security               | ✅   | SKL security-privacy · EXT stride-analysis-patterns                                |
| PostgreSQL                 | ✅   | SKL database-engineering · EXT postgresql-table-design                             |
| Migration Safety           | ✅   | SKL database-engineering + قواعد §۶ AGENTS.md (پروژه مقدم است)                     |
| Performance                | ✅   | EXT next-bundle-optimizer                                                          |
| Accessibility              | ✅   | EXT wcag-audit-patterns · SKL bilingual-rtl-ltr                                    |
| SEO                        | ✅   | EXT seo-technical                                                                  |
| Testing (عمومی)            | ✅   | EXT test-driven-development · SKL quality-gates                                    |
| Playwright/E2E             | ✅   | EXT webapp-testing                                                                 |
| Docker و Deployment Safety | ✅   | SKL devops-deployment                                                              |
| Code Review                | ✅   | SKL quality-gates · KB code-review-standard                                        |

۱۴/۱۴ حوزه ✅ — شکاف پوشش‌ای باقی نمانده.

## ۵. فرایند اصلاح‌شدهٔ Agentها (§۴.۳ — الزام Preflight)

`AGENTS.md` §۳ (پس از merge PR #76) حالا الزام می‌کند که Agent پیش از هر تسک:

1. نوع کار را طبقه‌بندی کند (۱۸ نوع در `SKILL_SELECTION_MATRIX.md`)؛
2. فقط ردیفِ همان نوع تسک را بخواند و **۲–۴ Skill مرتبط** را مطالعه کند (نه همه را — صرفه‌جویی Context)؛
3. معماری/ADR/تصمیم‌های مالک را بررسی کند (تقدم تصمیم پروژه بر Skill + ثبت انحراف)؛
4. در پایان، جدول «Skills used» را **با نام و کاربرد واقعی** در PR/گزارش ثبت کند؛ پرش از Skill الزامی فقط با دلیل مکتوب.

نصب از شبکه (`npx skills add`، `curl | bash`) ممنوع است — فقط مسیر مستند `SKILL_MAINTENANCE_POLICY.md` (بازبینی ماهانه، بدون به‌روزرسانی خودکار).

## ۶. توصیه‌های تکمیلی (برای مالک)

1. **معیار پذیرش PRهای آینده:** PR بدون جدول «Skills used» کامل، merge نشود (قالب اجباری است؛ در بازبینی چک شود).
2. **اولین راستی‌آزمایی واقعی:** تسک بعدی (درس Hello) نخستین جا است که Preflight جدید به‌طور کامل اجرا می‌شود — رکورد RUN آن باید جدول پر داشته باشد.
3. رکوردهای قدیمی USAGE NOT VERIFIED را بازنویسی نکنید — شفافیت تاریخی ارزش دارد.

---

**ارجاع:** [`../roadmap/MASTER_ROADMAP.md`](../roadmap/MASTER_ROADMAP.md) · [`../../owner/HANASO_PROJECT_GUIDE.fa.md`](../../owner/HANASO_PROJECT_GUIDE.fa.md) (فصل ۱۳: همکاری با Agentها)
