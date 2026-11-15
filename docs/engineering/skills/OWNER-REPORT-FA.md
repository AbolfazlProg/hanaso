# گزارش مالک — TASK-ENG: زیرساخت Skillهای توسعهٔ HANASO

> **برای:** مالک HANASO · **از:** Agent مهندسی (TASK-ENG) · **تاریخ:** ۲۰۲۶-۱۱-۰۲ · **Issue:** [#75](https://github.com/AbolfazlProg/hanaso/issues/75) · **شاخه:** `feat/eng-external-agent-skills`

---

## ۱. خلاصه در سه خط

مأموریت انجام شد: **۱۲ Skill خارجیِ معتبر و رایگان** (از Anthropic، Vercel، obra/superpowers، wshobson) پس از ارزیابی امتیازی و ممیزی امنیتی، در ریپوی اصلی نسخه‌بندی و نصب شدند؛ **۱۶ Skill داخلی** پروژه دست‌نخورده ماندند (منبع canonical: KB)؛ و یک **سیستم اجباری** (رجیستری + ماتریس انتخاب + پروتکل Preflight + چک‌لیست PR) باعث شد از این پس هر Agent، پیش از کار، Skillهای مرتبط را شناسایی، مطالعه و استفادهٔ واقعی‌اش را در PR اعلام کند. معیار موفقیت، کیفیت کار آینده است — نه تعداد Skillها.

## ۲. چه Skillهایی انتخاب شدند و چرا؟

| Skill (ID)                            | منبع (Stars در ۲۰۲۶-۱۱-۰۲)         | مجوز       | چرا                                                                           |
| ------------------------------------- | ---------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| webapp-testing (EXT-001)              | anthropics/skills (186,491★)       | Apache-2.0 | بهترین Skill Playwright برای E2E — دقیقاً برای M1                             |
| frontend-design (EXT-002)             | anthropics/skills (186,491★)       | Apache-2.0 | کیفیت هنری UI و ضد-خروجی‌های کلیشه‌ای — **در چارچوب قفل Aizen**               |
| test-driven-development (EXT-003)     | obra/superpowers (310,809★)        | MIT        | انضباط Red-Green — هم‌راستا با قاعدهٔ red-first خود ریپو                      |
| systematic-debugging (EXT-004)        | obra/superpowers (310,809★)        | MIT        | یافتن ریشهٔ خطا پیش از اصلاح — شکاف واقعی                                     |
| vercel-react-best-practices (EXT-005) | vercel-labs/agent-skills (33,376★) | MIT        | ۷۰ قاعدهٔ عملکرد React/Next از خود Vercel                                     |
| web-design-guidelines (EXT-006)       | vercel-labs/agent-skills (33,376★) | MIT        | ۱۰۰+ قاعدهٔ بازبینی UI (a11y/فرم/فوکوس/…) — با قواعد محلی (بدون وابستگی شبکه) |
| wcag-audit-patterns (EXT-007)         | wshobson/agents (42,092★)          | MIT        | روش ممیزی WCAG 2.2                                                            |
| postgresql-table-design (EXT-008)     | wshobson/agents (42,092★)          | MIT        | عمق PG (نوع/ایندکس/قید/پارتیشن) مکمل SKL-006                                  |
| next-dev-loop (EXT-009)               | vercel/next.js (143,462★)          | MIT        | راستی‌آزمایی runtime در `next dev` (رسمی Vercel)                              |
| stride-analysis-patterns (EXT-010)    | wshobson/agents (42,092★)          | MIT        | تریدمدلینگ STRIDE برای طراحی امنیتی M1                                        |
| seo-technical (EXT-011)               | AgriciDaniel/claude-seo (25,701★)  | MIT        | پوشش شکاف مستند SEO فاز ۱٫۵                                                   |
| next-bundle-optimizer (EXT-012)       | vercel/next.js (143,462★)          | MIT        | بهینه‌سازی باندل با `next analyze` (موجود در 16.4.3 — تأیید شد)               |

**وضعیت نگهداری منابع:** همه فعال‌اند (آخرین push بین ۲۰۲۶-۱۰-۲۸ تا ۲۰۲۶-۱۱-۰۲)؛ هر Skill در **commit دقیق پین شده** و فایل `PROVENANCE.md` دارد (منبع، SHA، مجوز، تاریخ نصب/راستی‌آزمایی، محدودیت‌ها، تفاوت‌های محلی).

## ۳. کدام Agentها باید از آن‌ها استفاده کنند و چگونه اجباری می‌شود؟

- **همهٔ Agentهای توسعه** (Frontend، Backend، UI/UX، Security، QA و آینده) — چون `AGENTS.md` ریشه (که همه می‌خوانند) حالا به رجیستری و ماتریس ارجاع می‌دهد.
- **الزام عملی:** پیش از هر تسک، طبقه‌بندی نوع کار → بارگذاری فقط Skillهای همان ردیف ماتریس (۲–۴ Skill، نه هر ۲۸ تا) → و در **PR، جدول «Skillهای استفاده‌شده» با نام و اثر واقعی** (چک‌لیست جدید PR Template). پرش از Skill الزامی فقط با دلیل ثبت‌شده. بازبین PR بدون این جدول را برمی‌گرداند.
- **تقدم‌ها:** تصمیم KB/ADR/مالک همیشه بر Skillها مقدم است؛ هیچ Skillی نمی‌تواند سیاست امنیتی، دامنهٔ دسترسی یا قواعد VPS را لغو کند.

## ۴. کدام‌ها رد شدند و چرا؟ (گزیده — فهرست کامل: `SKILL_REJECTED_CATALOG.md`)

| کاندید                                                  | دلیل رد                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| docx/pdf/pptx/xlsx (Anthropic)                          | مجوز source-available تحت ToS — **نه متن‌باز**؛ دروازهٔ مجوز                     |
| vercel-optimize                                         | نیازمند پلتفرم Vercel + بخش پولی Observability Plus — پروژه self-host است        |
| skill-creator (Anthropic)                               | تضاد با استاندارد نگارش Skill خود KB (قالب ۷-بخشی + اعتبارسنجی)                  |
| requesting-code-review / verification-before-completion | تکرار سیستم بازبینی و دروازه‌های موجود (SKL-010 + DoD)                           |
| theme-factory / color-expert                            | تعارض با پالت قفل‌شدهٔ Aizen                                                     |
| screen-reader-testing                                   | نیازمند نرم‌افزار SR واقعی (NVDA/JAWS) که Agentها ندارند — فاز ۲ برای تیم انسانی |
| فهرست‌های awesome بدون مجوز، claudeskills.com و …       | بدون مجوز/غیرقابل‌بررسی/تجاری                                                    |

## ۵. امنیت چه بود و چه شد؟

- هر کاندید با **ابزار اسکن داخل ریپو** (`scripts/audit-external-skills.py` — از این پس ابزار دائمی نگهداری) + **بازبینی خط-به-خط** ممیزی شد: ۱۲/۱۲ PASS، صفر یافته HIGH/MEDIUM.
- یک ریسک واقعی حذف شد: web-design-guidelines قواعد را موقع اجرا از اینترنت می‌گرفت (سطح تزریق پرامپت) → **قواعد به‌صورت محلی vendored شد** و SKILL.md اصلاح شد (diff در PROVENANCE).
- هیچ Skillی دادهٔ پروژه را جایی نمی‌فرستد؛ بخش‌های پولی seo-technical رسماً خارج از دامنه اعلام شدند؛ ارجاع‌های `npx skills add` در next-bundle-optimizer صریحاً ممنوع اعلام شد.
- `curl | bash` هرگز استفاده نشد؛ همهٔ دریافت‌ها در commit پین‌شده انجام شد.

## ۶. آزمون‌های عملی (جزئیات: `SKILL_VERIFICATION_REPORT.md`)

| آزمون                             | نتیجه                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| A — UI (بازبینی learn-card)       | وفاداری بالا به Aizen + ۲ یافتهٔ واقعی (توکنِ border، a11y حالت loading)                    |
| B — امنیت (بازبینی /api/progress) | ۴ یافتهٔ STRIDE که دقیقاً با بدهی ثبت‌شدهٔ خود ریپو (DEBT-S3 #69) هم‌راستا است              |
| C — Frontend/تست                  | کیفیت React بالا + یک شکاف تست مؤثر (عدم پوشش LearnCard)                                    |
| D — بازبینی استقرار               | PASS + ۲ یادداشت سخت‌سازی (بکاپ پیش از migrate در M0-10؛ ذخیرهٔ SHA قبلی موفق)              |
| کشف/نصب                           | **۲۸ Skill قابل کشف**؛ نصب idempotent؛ سازگار Claude Code + خواندن مستقیم برای سایر Agentها |

هیچ تغییری در کد محصول، دیتابیس یا VPS انجام نشد (مطابق محدودیت‌های مأموریت §۱۲).

## ۷. خروجی‌ها و مسیرها (همه در شاخهٔ `feat/eng-external-agent-skills`)

```
agent-skills/external/<12 skill>/     ← فایل‌های Skill + PROVENANCE.md + LICENSE (canonical خارجی)
scripts/install-external-skills.sh    ← نصب به .claude/skills (با اعتبارسنجی)
scripts/sync-skills.sh                ← نصب کامل دو-منبعی (KB + خارجی)
scripts/audit-external-skills.py      ← ابزار ممیزی امنیتی دائمی
docs/engineering/skills/              ← ۱۰ سند الزامی مأموریت + README
AGENTS.md §۳                          ← مدل دو-لایه + الزام Preflight (اصلاح ممیزی‌شده)
.github/PULL_REQUEST_TEMPLATE.md      ← چک‌لیست اعلام Skillها
docs/adr/ADR-006-…                    ← تصمیم معماری (两层ی + ممنوعیت نصب شبکه‌ای)
ops/… + PROJECT_STATUS.md             ← هم‌روزآمدی وضعیت طبق قواعد ریپو
```

## ۸. نگهداری از این به بعد

- **بازبینی ماهانه** (یا هنگام ارتقای Next/React/PG/Playwright): طبق `SKILL_MAINTENANCE_POLICY.md`.
- **به‌روزرسانی هرگز خودکار نیست**: دریافت → diff → ممیزی مجدد → بازبینی انسانی → PR.
- حذف/Deprecated شدن با معیارهای ثبت‌شده (تعارض با ADR، جا ماندن از استک، پوشش بهتر داخلی، دو بازبینی ماهانهٔ بدون استفاده + Deprecated).

## ۹. نکات صریح و محدودیت‌ها

1. **بدهی باز:** EXT-009/012 از شاخهٔ canary خود Next.js اند — با هر ارتقای Next باید مجدد راستی‌آزمایی شوند (در PROVENANCE ثبت است).
2. seo-technical به اسکریپت‌های پلاگین بالادستی ارجاع می‌دهد که vendoring نشده‌اند — محتوای راهنما معتبر است، اجرای اسکریپت‌هاexpected نیست.
3. شکاف‌های عمدی (با دلیل): SR-تستینگ واقعی، Skill عمومی Docker/DevOps (SKL-014 بهتر است)، RTL فارسی (SKL-003 مرجع).
4. **توصیهٔ امنیتی خارج از ریپو:** توکن گیت‌هابی که برای این مأموریت ارسال شد، پس از بررسی PR در گیت‌هاب **revoke/چرخش** شود (Settings → Developer settings → Tokens). این توکن در هیچ فایل، کامیت یا گزارشی ثبت نشده است.

## ۱۰. گام‌های پیشنهادی بعدی برای مالک

1. PR را بازبینی و merge کنید (بازبین مستقل مطابق DoD ریپو).
2. یک تسک واقعی M1 را با پروتکل Preflight جدید اجرا کنید تا چرخهٔ «اعلام Skill در PR» در عمل دیده شود.
3. در M0-10 (DB-tier) بکاپ پیش-migrate را به deploy.sh اضافه کنید (یافتهٔ آزمون D).
4. بازبینی ماهانهٔ اول: اولین روز کاری دسامبر ۲۰۲۶.
