# HANASO-KANA-AUDIT-01 — CURRENT STATE

> وضعیت زندهٔ ممیزی. این فایل بعد از هر دسته اقدام به‌روزرسانی و Commit/Push می‌شود.

## پارامترهای ممیزی (ثابت)

| پارامتر | مقدار |
|---|---|
| شاخه ممیزی | `audit/HANASO-KANA-AUDIT-01` |
| مبنا (Production Baseline) | `5b503598422611dacb2f9d3e77d2be3226d3347a` (= tip شاخه `release/TASK-HANASO-29-final-integration` هنگام شروع) |
| نسخهٔ Production زنده | `1.1.0-hanaso29-r01` (تأیید از `/api/health` — 2026-11-15) |
| سایت زنده | `https://learn.kotodama.ir` |
| مخزن | `AbolfazlProg/hanaso` |
| ماهیت ممیزی | **فقط کشف و مستندسازی — هیچ تغییری در محتوا/سؤال/پاسخ/Feedback/UI/DB انجام نمی‌شود** |

## سوابق جلسات

### Session 1 — 2026-11-15 (شروع)

- [x] Recon اولیه: Production زنده با health endpoint شناسایی شد (`1.1.0-hanaso29-r01`, commit `5b503598`, uptime واقعی). دیتابیس PostgreSQL 18.6 از طریق `/api/ready` OK.
- [x] شاخهٔ `audit/HANASO-KANA-AUDIT-01` از کامیت Production ساخته شد (worktree: `/home/z/my-project/audit-wt`).
- [x] مأموریت قبلی روی مخزن (TASK-29) نگاهی اجمالی: شاخه release از 29 فایل CP-1..CP-5 تشکیل شده است؛ **محتوای ممیزی‌شدهٔ ما همان چیزی است که Production اجرا می‌کند** (baseline یکسان).
- [ ] PRODUCTION_BASELINE.md — در حال تدوین
- [ ] KANA_CONTENT_INVENTORY.md — در حال تدوین
- [ ] سه گزارش Subagent (A زبان‌شناسی ژاپنی / B اعتبار ارزیابی / C مرورگر) — در حال تدوین
- [ ] FINDINGS_REGISTER / ROOT_CAUSE_PATTERNS / دو Backlog / FINAL_AUDIT_REPORT — در حال تدوین

## نکته دربارهٔ چهار تصویر مالک

چهار اسکرین‌شات ارسالی مالک به‌صورت فایل پیوست در Workspace موجود نیستند (بررسی `upload/`، `download/`، `hanaso-shots/`، `owner_notes/`). Seed Caseها (がっこう / ちょっと / گزینه‌های خوانش / Vocabulary در Station قواعد) از متن مأموریت استخراج و در Production زنده **بازتولید** می‌شوند تا با شواهد واقعی قابل استناد باشند. این محدودیت صادقانه ثبت می‌شود.

## قدم بعدی

1. PRODUCTION_BASELINE.md (نسخهٔ واقعی + مقایسه Source/Production).
2. اسکریپت استخراج Inventory از ماژول‌های TS واقعی (بدون تغییر فایل‌ها) — پوشش تمام Station/Exercise چک ۱ Kana.
3. سه Subagent مستقل (A/B/C) به‌صورت موازی.
