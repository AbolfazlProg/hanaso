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
- [x] CP-0: اولین Push (CURRENT_STATE) — کامیت `be76207`.
- [x] PRODUCTION_BASELINE.md کامل شد (نسخهٔ زنده = tip شاخهٔ release؛ journey API زنده با Source ۳۸ گره منطبق) — کامیت `59d37a6`.
- [x] KANA_CONTENT_INVENTORY.md + inventory.json کامل شد — استخراج ماشینی از ماژول‌های TS واقعی: **۳۸ Station (۳۶ core + ۲ optional)، ۵۸۶ Exercise (۵۶۱ practice + ۲۵ gate M1..M5)، ۹۲ گلیف (۴۶+۴۶)**؛ توزیع نوع: ۱۶۹ recognition، ۱۰۴ recall، ۷۶ decode، ۱۹۸ listening، ۱۷ rule-listening، ۶ cloze، ۲ produce-template، ۱۴ meaning-select. ارجاع معلق: ۰.
- [x] تحلیل مقدماتی Main Agent: (۱) ادعاهای مورا همه با شمارش درست تطبیق داده شد (がっこう=۴، きょう=۲، ちょっと=۳ …)؛ (۲) ۵۹ «هم‌خوانی رجیستری» در ایستگاه‌های K شناسایی شد که با پرامپت صریحِ «کاتاکانا» عمدی‌اند (script discrimination) — NOT_A_BUG در سطح داده اما ثبت در گزارش؛ (۳) جفت‌های خوانش فارسیِ بسیار شبیه فهرست شد (برای ممیزی تفکیک‌پذیری گزینه‌ها).
- [ ] سه گزارش Subagent (A زبان‌شناسی ژاپنی / B اعتبار ارزیابی / C مرورگر زنده) — **در حال اجرا (موازی)**
- [ ] FINDINGS_REGISTER / ROOT_CAUSE_PATTERNS / دو Backlog / FINAL_AUDIT_REPORT — در انتظار گزارش‌ها

## قدم بعدی

۱. دریافت گزارش‌های A/B/C؛ رفع تناقض و تأیید نهایی یافته‌ها (Main Agent).
۲. راستی‌آزمایی Seed Caseهای مالک (がっこう h13، ちょっと h13، گزینه‌های خوانش شبیه، meaning-select در station قواعد).
۳. ساخت FINDINGS_REGISTER (ID پایدار KANA-AUD-xxx) + ROOT_CAUSE_PATTERNS + دو Backlog + FINAL_AUDIT_REPORT + AUDIT_EVIDENCE_INDEX.
۴. Commit/Push نهایی و پاسخ نهایی.
