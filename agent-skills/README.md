# agent-skills/ — وضعیت در HANASO

**دو لایهٔ Skill با یک رجیستری واحد** (ADR-006 — `docs/engineering/skills/SKILL_REGISTRY.md`):

## ۱) داخلی — `SKL-001..016` (منبع canonical: مرکز دانش)

`japanese-learning-kb/agent-skills/` (طبق ADR-014 KB + OTD-013). این ریپو نسخهٔ موازی نمی‌سازد تا drift رخ ندهد (مأموریت §۱۲ — جلوگیری از توسعهٔ موازی نسخه‌های ناسازگار).

```bash
# نصب/همگام‌سازی در این ریپو (خروجی: .claude/skills/ — تولیدی و gitignore شده):
../japanese-learning-kb/scripts/install-skills.sh .
../japanese-learning-kb/scripts/install-skills.sh --list    # فهرست ۱۶ Skill
```

## ۲) خارجی — `EXT-001..012` (منبع canonical: همین ریپو)

`external/` — Skillهای معتبرِ جامعه/رسمی (Anthropic، Vercel، obra/superpowers، wshobson) که
بررسی امتیازی + ممیزی امنیتی شده‌اند و در commit بالادستیِ پین‌شده vendored شده‌اند. هر پوشه شامل:

- `SKILL.md` (محتوای بالادستی؛ تطبیق‌های محلی مستند شده در PROVENANCE)
- `PROVENANCE.md` (منبع، SHA، مجوز، Stars در تاریخ بررسی، محدودیت‌ها، تاریخ نصب/راستی‌آزمایی)
- `LICENSE` / `LICENSE.txt` (Apache-2.0 یا MIT)

```bash
bash scripts/install-external-skills.sh          # نصب Skillهای خارجی → .claude/skills/
bash scripts/install-external-skills.sh --list   # فهرست
```

## نصب کامل (هر دو لایه)

```bash
bash scripts/sync-skills.sh      # KB (اگر KB_PATH موجود باشد) + external → ۲۸ Skill قابل کشف
```

## قواعد

- `.claude/skills/` همیشه خروجی تولیدی است — هرگز دستی ویرایش نمی‌شود؛ تغییر Skill داخلی فقط در KB (با ثبت کاتالوگ)، تغییر Skill خارجی فقط از مسیر `docs/engineering/skills/SKILL_MAINTENANCE_POLICY.md` (دریافت → diff → ممیزی `scripts/audit-external-skills.py` → بازبینی → PR).
- هر تسک Skillهای استفاده‌شده را با نام و کاربرد واقعی اعلام می‌کند (`docs/engineering/skills/AGENT_SKILL_USAGE_POLICY.md`).
- نامزد جدید (داخلی یا خارجی) ابتدا توسعهٔ Skill موجود را بررسی می‌کند (قاعدهٔ ضد-پراکنده‌سازی KB) و باید دروازه‌های مجوز رایگان + ممیزی امنیتی را بگذراند.
- نصب Skill از شبکه (`npx skills add …`) ممنوع است.
