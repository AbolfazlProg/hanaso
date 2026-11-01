# ADR Index — ریپوی HANASO

> ADRهای **این ریپو** فقط تصمیم‌های اجرایی مخصوص ریپوی محصول‌اند. تصمیم‌های معماری محصول (۱۷ مورد) در KB می‌زییند و از طریق **ADR-000** تبنی می‌شوند. قالب هر ADR: مسئله · گزینه‌ها · شواهد · مقایسه · تصمیم · مزایا/معایب · هزینهٔ تغییر · ریسک‌ها · وضعیت تأیید.

| ADR                                         | عنوان                                                              | وضعیت                                 |
| ------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| [000](ADR-000-baseline-adoption.md)         | تبنی خط‌پایهٔ ADR-001..017 مرکز دانش + بازارزیابی ۲۰۲۶-۱۱-۰۱       | Proposed (گیت مالک OQ-014)            |
| [001](ADR-001-repository-identity.md)       | هویت ریپو: نام `hanaso`، دامنه، رابطه با KB                        | Proposed (ثبت در KB از مسیر spec-gap) |
| [002](ADR-002-workspace-layout.md)          | ساختار Monorepo سبک (apps/packages) — تطبیق ADR-001                | Proposed (تغییر پیشنهادی KB)          |
| [003](ADR-003-preview-deployment.md)        | استقرار ایزولهٔ Preview (compose + Caddy + rollback)               | Proposed                              |
| [004](ADR-004-github-project-management.md) | مدل مدیریت پیشرفت در GitHub (Project/Milestones/Issues/Protection) | Proposed                              |
| [005](ADR-005-ci-baseline.md)               | خط‌پایهٔ CI و محدودیت بیلینگ Actions                               | Proposed                              |
