# agent-skills/ — وضعیت در HANASO

**منبع canonical اسکیل‌ها فقط مرکز دانش است** (`japanese-learning-kb/agent-skills/` — ۱۶ Skill: SKL-001..016 طبق ADR-014 KB + OTD-013).
این ریپو نسخهٔ موازی نمی‌سازد تا drift رخ ندهد (مأموریت §۱۲ — جلوگیری از توسعهٔ موازی نسخه‌های ناسازگار).

```bash
# نصب/همگام‌سازی در این ریپو (خروجی: .claude/skills/ — تولیدی و gitignore شده):
KB_PATH=../japanese-learning-kb "$KB_PATH/scripts/install-skills.sh" .
"$KB_PATH/scripts/install-skills.sh" --list    # فهرست ۱۶ Skill
```

قواعد: تغییر Skill فقط در KB (با ثبت کاتالوگ)؛ `.claude/skills/` هرگز دستی ویرایش نمی‌شود؛ هر تسک Skillهای استفاده‌شده را اعلام می‌کند. نامزدهای Skill جدید ابتدا توسعهٔ Skill موجود را بررسی می‌کنند (قاعدهٔ ضد-پراکنده‌سازی KB).
