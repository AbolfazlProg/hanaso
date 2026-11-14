# گزارش کشف و ارزیابی Skillهای خارجی — TASK-ENG

> سند فارسی مأموریت **TASK-ENG** (Issue #75) — کشف، ارزیابی، ادغام و الزام Skillهای خارجی Agentهای توسعهٔ HANASO.
> تاریخ بررسی: **۲۰۲۶-۱۱-۰۲** · تمام آمار گیت‌هاب در همین تاریخ با API احراز-هویت‌شده ثبت شده است.

---

## ۱. خلاصه اجرایی

- **۲۱ مخزن** گیت‌هاب (منابع رسمی و اجتماعی) + **۴ رجیستری/کاتالوگ** + مستندات رسمی vendors بررسی شد.
- **۲۸ Skill کاندید** در سطح محتوا (فایل‌های واقعی در commit پین‌شده) دانلود و ممیزی شد.
- **۱۲ Skill خارجی** با مجوز رایگان/متن‌باز (Apache-2.0 و MIT)، امتیاز ≥ ۴٫۰ و ممیزی امنیتی PASS در `agent-skills/external/` نصب و نسخه‌بندی شدند.
- **۱۶ Skill داخلی** (SKL-001..016) موجودیت خود را حفظ کردند؛ منبع canonical آن‌ها همچنان مرکز دانش (KB) است — هیچ نسخهٔ موازی ساخته نشد.
- زیرساخت اجرا ساخته شد: رجیستری مرکزی، ماتریس انتخاب اجباری، سیاست استفاده با پروتکل Preflight، سیاست نگهداری، ابزار ممیزی امنیتی داخل ریپو، اسکریپت نصب دو-منبعی، به‌روزرسانی `AGENTS.md` و PR Template.
- نتیجهٔ عملی: **۲۸ Skill قابل کشف** در `.claude/skills/` برای همهٔ Agentها (کدنویسِ هر runtimeای که `AGENTS.md` را می‌خواند).

## ۲. شناخت پروژه (ورودی جست‌وجو) — ماتریس نیازها

پیش از جست‌وجو، ریپوی محصول (`AbolfazlProg/hanaso`، شاخهٔ main در `bbc872a`) به‌طور کامل بررسی شد:

| محور        | وضعیت واقعی ریپو (۲۰۲۶-۱۱-۰۲)                                                                                                                | پیامد برای جست‌وجوی Skill                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| فریم‌ورک    | Next.js **16.4.3** (پین) + React **19.3.1** + TypeScript **6.0.3** + Tailwind **4.3.3**، Turbopack، React Compiler                           | فقط Skillهای سازگار با Next 16 / RSC؛ `next-dev-loop` (کف 16.3) و `next-bundle-optimizer` (با `next analyze` — وجودش در 16.4.3 راستی‌آزمایی شد) |
| معماری      | Modular Monolith تک-استقرار؛ ۸ ماژول (audio, character, dialogue, fsrs, mastery, practice, progress, shared) با قرارداد دوفایلی index/server | Skillهای معماریِ عمومی رد شدند (SKL-001 کافی است)                                                                                               |
| UI          | زبان بصری **Aizen** (DD-084) قفل شده: tokens.css مرجع یکتا؛ فونت‌های سلف‌هاست (Vazirmatn + Zen Kaku Gothic + Noto Serif JP) با بودجه         | EXT-002 فقط «درونِ» Aizen؛ theme-factory و هر Skill تعویض پالت رد شد                                                                            |
| دوجهته      | `<html dir="rtl">` + DirectionProvider + جزایر LTR ژاپنی (FuriganaText/JaBlock) + گیت stylelint منطقی                                        | WCAG خارجی مکمل SKL-003 است، نه جایگزین (RTL/ALREQ پوشش خارجی ندارد)                                                                            |
| دیتابیس     | PG18 + Drizzle؛ دو schema (`content`/`app`)؛ ۱۴ جدول؛ uuidv7؛ migrations expand-contract                                                     | EXT-008 مکمل عمق PG؛ پیش‌فرض‌های skill تقدم پروژه را نقض نمی‌کنند                                                                               |
| احراز هویت  | هنوز پیاده نشده (M1: better-auth + argon2id طبق KB)                                                                                          | Skill امنیتی عمومیِ جایگزین نصب نشد؛ STRIDE برای طراحی مرز اعتماد M1                                                                            |
| تست         | Vitest 5 (۱۲۵ تست سبز)؛ **Playwright از M1** (پین 1.64)؛ بدون e2e script فعلاً                                                               | EXT-001 دقیقاً شکاف مکانیک E2E را پر می‌کند؛ EXT-003 انضباط red-first                                                                           |
| CI          | ۹ گیت verify (format/lint/typecheck/test/build/audit/smoke/فونت/secret-scan) + job داکر GHCR                                                 | اسناد و اسکریپت‌های جدید باید از `pnpm format:check` و secret-scan عبور کنند (عبور کردند)                                                       |
| استقرار     | Docker + Caddy + HAProxy/nginx روی VPS مشترک «kotodama»؛ rollback = redeploy                                                                 | SKL-014 کافی است؛ Skillهای Vercel-محور رد شدند                                                                                                  |
| Agents      | `AGENTS.md` ریشه برای همه (Claude Code/Codex/Cursor/Gemini/Copilot)؛ `.claude/skills/` خروجی تولیدی KB                                       | مدل دو-لایه (KB + این ریپو) با همان مسیر نصب استاندارد                                                                                          |
| مستندات ops | AGENT_PROGRESS / RUN_LOG / TASK_REGISTRY / قالب‌های تسک و گزارش                                                                              | Skillهای فرآیندی باید با این قالب‌ها هم‌راستا شوند، نه رقیب آن‌ها                                                                               |

**نتیجهٔ ماتریس:** شکاف‌های واقعی خارجی = مکانیک E2E/مرورگر، انضباط TDD و دیباگ سیستماتیک، عمق React/Next و PG، ممیزی WCAG، قواعد UI-review، حلقهٔ runtime-verification، تریدمدلینگ، SEO فاز ۱٫۵. موارد پوشش‌داده‌شده توسط Skillهای داخلی = عمداً بدون کاندید خارجی مانده‌اند (قاعدهٔ ضدپراکنده‌سازی KB).

## ۳. روش جست‌وجو و منابع

1. **GitHub (API احراز-هویت‌شده):** آمار Stars/Forks/Issues/آخرین Push/مجوز ۲۱ مخزن در ۲۰۲۶-۱۱-۰۲ ثبت و ذخیره شد (`skill-candidates/repo-stats/`). هیچ عددی از مقاله یا README کپی نشد.
2. **مخازن رسمی vendors:** anthropics/skills ( Anthropic)، vercel-labs/agent-skills و skills/ داخل خودِ vercel/next.js (Vercel)، obra/superpowers.
3. **رجیستری‌ها:** skills.sh (Vercel)، agentskills.io (استاندارد باز)، ClawHub (openclaw)، claudeskills.com (رد — تجاری/غیرقابل‌بررسی).
4. **Awesome Lists:** ComposioHQ، VoltAgent، travisvn، sickn33 — فقط برای کشف؛ هیچ نصبی صرفِ حضور در فهرست انجام نشد.
5. **دانلود در commit پین‌شده:** تمام محتوای کاندیدها از `raw.githubusercontent.com/<repo>/<SHA>/...` دریافت شد تا ارزیابی و PROVENANCE دقیقاً بازتولیدپذیر باشد.

## ۴. آمار مخازن منبع (تأییدشده ۲۰۲۶-۱۱-۰۲)

| مخزن                                 | Stars   | Forks  | آخرین Push | مجوز                                | نقش                               |
| ------------------------------------ | ------- | ------ | ---------- | ----------------------------------- | --------------------------------- |
| anthropics/skills                    | 186,491 | 22,028 | 2026-10-28 | per-skill (Apache-2.0 برای منتخبان) | منبع EXT-001/002                  |
| obra/superpowers                     | 310,809 | 27,659 | 2026-10-29 | MIT                                 | منبع EXT-003/004                  |
| vercel-labs/agent-skills             | 33,376  | 2,924  | 2026-10-28 | MIT (اعلام README + frontmatter)    | منبع EXT-005/006                  |
| vercel/next.js (canary)              | 143,462 | 33,604 | 2026-11-02 | MIT                                 | منبع EXT-009/012                  |
| wshobson/agents                      | 42,092  | 4,454  | 2026-11-02 | MIT                                 | منبع EXT-007/008/010              |
| AgriciDaniel/claude-seo              | 25,701  | 3,370  | 2026-11-01 | MIT                                 | منبع EXT-011                      |
| vercel-labs/web-interface-guidelines | 1,086   | 73     | 2026-10-05 | MIT                                 | محتوای قواعد EXT-006 (نسخهٔ محلی) |

(آمار کامل ۲۱ مخزن شامل ردشده‌ها در `SKILL_REJECTED_CATALOG.md`.)

## ۵. قیف انتخاب

```
۲۱ مخزن + ۴ رجیستری بررسی‌شده
  └─ ۲۸ Skill کاندید (دانلود در SHA پین‌شده + اسکن خودکار + بازبینی محتوا)
       ├─ ۱۲ پذیرفته‌شده  → agent-skills/external/ (EXT-001..012)
       └─ ۱۶ ردشده       → SKILL_REJECTED_CATALOG.md (با دلیل و تاریخ)
```

معیار پذیرش (سند امتیازدهی): میانگین وزنی ≥ ۴٫۰ از ۵ + عبور از دروازهٔ مجوز رایگان/متن‌باز + ممیزی امنیتی PASS + عدم تکرار Skill داخلی. **Stars معیار تأیید بود، نه مدرک کیفیت** — کاندیدهای پرستاره با مجوز نامناسب (docx/pdf/pptx/xlsx) یا نیاز پولی (vercel-optimize) رد شدند.

## ۶. پوشش حوزه‌های الزامی مأموریت

| حوزهٔ مأموریت                | پوشش نهایی                                                             |
| ---------------------------- | ---------------------------------------------------------------------- |
| A — UI/UX و Visual Design    | EXT-002 (در چارچوب Aizen) + SKL-004 (مرجع) + EXT-006 (بازبینی UI-code) |
| B — Frontend Engineering     | SKL-002 (مرجع) + EXT-005 + EXT-009                                     |
| C — Backend و Database       | SKL-005/006 + EXT-008                                                  |
| D — Web Security             | SKL-011 (مرجع OWASP-مانند پروژه) + EXT-010 (STRIDE)                    |
| E — Performance              | SKL-002 (بودجه‌ها) + EXT-005 + EXT-012 + EXT-001 (سنجش مرورگر)         |
| F — Accessibility            | EXT-007 + SKL-003 (RTL/دوجهته — مرجع) + SKL-004/010                    |
| G — SEO                      | EXT-011 + SKL-002 (SSR/metadata) — شکاف فاز ۱٫۵ پوشش داده شد           |
| H — Testing و QA             | SKL-010 (دروازه‌ها — مرجع) + EXT-003 + EXT-001 + EXT-004               |
| I — Architecture و Practices | SKL-001 + ADRهای ریپو + SKL-012 (KB)                                   |
| J — DevOps و Deployment      | SKL-014 (مرجع؛ شامل بکاپ/rollback و ممنوعیت دستکاری سرویس‌های VPS)     |

**شکاف‌های شناخته‌شده و عمدی:** (۱) Skill عمومی «Docker/DevOps» خارجی — پوشش داخلی SKL-014 + infra مخصوص پروژه بهتر است؛ (۲) دستیارِ Screen-Reader واقعی — نیازمند نرم‌افزار SR روی OS واقعی است (فاز ۲، پروتکل انسانی)؛ (۳) RTL-فارسی در Skillهای خارجی — عملاً وجود ندارد؛ SKL-003 مرجع می‌ماند.

## ۷. سازگاری با Aizen و تصمیم‌های معماری (بخش A مأموریت)

هیچ Skill خارجی حق تعویض پالت/فونت/حرکت/شعاع را ندارد؛ `tokens.css` مرجع یکتاست. EXT-002 خودش می‌گوید: «جایی که بریف جهت بصری را پین کرده، دقیقاً از آن پیروی کن — کلمات خودِ بریف همیشه برنده‌اند» — بریفِ پین‌شدهٔ HANASO یعنی Aizen. این قید در PROVENANCE و ماتریس انتخاب (قواعد تقدم) ثبت شده است. تقدم کلی: KB > ADRهای ریپو > کد > و هیچ Skillی نمی‌تواند سیاست امنیتی/دامنهٔ دسترسی را لغو کند.

## ۸. امنیت خودِ Skillها (خلاصه)

اسکن خودکار (ابزار داخل ریپو: `scripts/audit-external-skills.py`) + بازبینی خط-به-خط انسانی: ۱۲/۱۲ PASS، صفر یافته HIGH/MEDIUM. یک ریسک واقعی (دریافت قواعد از شبکه در web-design-guidelines) با vendoring محلی قواعد حذف شد. جزئیات کامل در `SKILL_SECURITY_AUDIT.md`.

## ۹. اسناد مرتبط

`SKILL_REGISTRY.md` (رجیستری) · `SKILL_EVALUATION_MATRIX.md` (امتیازها) · `SKILL_SECURITY_AUDIT.md` (ممیزی) · `SKILL_SELECTION_MATRIX.md` (ماتریس اجباری) · `AGENT_SKILL_USAGE_POLICY.md` (الزام استفاده) · `SKILL_MAINTENANCE_POLICY.md` (نگهداری) · `SKILL_REJECTED_CATALOG.md` (ردشده‌ها) · `SKILL_VERIFICATION_REPORT.md` (آزمون‌ها) · `OWNER-REPORT-FA.md` (گزارش مالک).
