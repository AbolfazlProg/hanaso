# ADR-004 — GitHub Project Management Model

**TL;DR (فارسی):** GitHub فقط محل کد نیست؛ ابزار مدیریت پروژه است: Project v2 با وضعیت‌های شش‌گانه، ۱۰ Milestone فازمحور، Issues با قالب ۱۲فیلدی تسک، main محافظت‌شده (PR-only) و ستون‌های قابل‌فهم برای مالک غیربرنامه‌نویس.

- **مسئله:** مأموریت §۶: مالک باید بدون دانش برنامه‌نویسی وضعیت پروژه را از GitHub بفهمد؛ تغییرات قابل‌ردیابی باشند؛ گزارش Agentها در GitHub ثبت شوند.
- **گزینه‌ها:** (۱) GitHub-native کامل (Project v2 + Milestones + Issues + Protection) · (۲) فقط Issues/Projects بدون Milestones · (۳) ابزار خارجی (Linear/Trello).
- **شواهد:** مأموریت §۶.۱..۶.۵ (وضعیت‌ها، فیلدهای تسک، Milestones، فایل‌های مرکزی، DoD)؛ ADR-015 KB (رجیستری ops + ردیابی)؛ تک‌اکانت بودن مالک (AbolfazlProg) — عدم امکان PR-approval از حساب دوم.
- **مقایسه:** گزینهٔ ۳ خارج از اکوسیستم و نیازمند ابزار اضافه؛ گزینهٔ ۲ بدون نمای فازمحور. گزینهٔ ۱ کامل و رایگان-درون-پلتفرم است.
- **تصمیم:** (الف) Project v2 «HANASO Development» با فیلد Status (Backlog/Ready/In Progress/Review/Blocked/Done) + Priority (P0..P3)؛ (ب) ۱۰ Milestone = M0..M7 (+M3a/M3b) هم‌نام نقشه؛ (ج) Issues از قالب تسک ۱۲فیلدی (AC/وابستگی/Skill/مرجع) + لیبل‌های phase/type/priority/owner-decision؛ (د) main محافظت‌شده: **enforce_admins=true** (هیچ push مستقیم، حتی مالک — همه‌چیز از PR)، squash-only، linear history، حذف branch بعد از merge؛ (هـ) required status checks **فعلاً خاموش** (تا اولین CI سبز — BLOCKER-F05) سپس فعال.
- **مزایا:** ردیابی کامل Issue↔PR↔commit؛ نمای مالک-پسند؛ سازگار با تک‌اکانت (بدون deadlock تأیید). **معایب:** بدون CI-سبزِ واقعی، محافظت فقط ساختاری است (صادقانه در BLOCKERS ثبت شد).
- **هزینهٔ تغییر آینده:** افزودن فیلد/وضعیت جدید = mutation ساده GraphQL؛ مهاجرت به ابزار خارجی = خروجی Issues قابل-دستیابی.
- **ریسک‌ها:** Actions قفل بیلینگ → وضعیت‌ها را Agents به‌روز نگه می‌دارند (فرض خوش‌بینانه فعال نیست — ستون‌ها با commit/PR هم‌روز می‌شوند).
- **وضعیت تأیید:** `PROPOSED` — پذیرش با دیدن مالک (بخش «وضعیت پروژه را چطور ببینم» در README).
