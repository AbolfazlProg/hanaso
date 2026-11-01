# AGENT_HANDOFF — تحویل به Agent بعدی

> الگو: `ops/templates/handoff-template.md`. پس از هر سشن کاری به‌روز می‌شود.

## وضعیت در یک نگاه (2026-11-01 — پایان مأموریت TASK-ENG-01: پایه‌گذاری مهندسی HANASO)

- **فاز:** M0 (بوت‌استرپ) — زیرساخت مهندسی آماده؛ **هیچ قابلیت آموزشی ساخته نشده** (گیت OQ-013).
- **تسک جاری:** TASK-ENG-01 → `In Review` (پذیرش مالک: دیدن GitHub + پاسخ گیت‌های OQ-013/014/017 + رفع بیلینگ).
- **SHA/پوش:** همهٔ کامیت‌ها روی `origin/main` ریپوی `hanaso` (private) — اعتبار هر ادعا با `git log`.

## آنچه Agent بعدی باید بداند

1. **مسیر ورود استاندارد:** `AGENTS.md` (این ریپو) → `README.md`/`PROJECT_STATUS.md` → KB: `START-HERE.md` → `IMPLEMENTATION-BLUEPRINT.md` → Skill متناظر.
2. **اولین قدم عملی:** Issue «B-0 Spikes (TASK-M0-05..08)» — مشخصات کامل با AC در GitHub Issues این ریپو. در صورت مجوز کد مالک، **TASK-DLG-POC-01** (PoC فنی دیالوگ) اولویت موازی دارد.
3. **قوانین کار:** چرخهٔ ۱۲مرحله‌ای + شدت S0..S3 + نقش‌ها → KB `task-lifecycle.md`؛ هر اجرا = رکورد در `ops/runs/` + ردیف در `AGENT_RUN_LOG.md`.
4. **گیت‌های باز (به‌روز):** تصمیم Branch Protection/پلن Pro (BLOCKER-F07) · VPS/DNS (BLOCKER-F02/F04) · OQ-013/014/017 (مالک) — فهرست کامل: `ops/BLOCKERS.md`. (Actions اجرا می‌شود — BLOCKER-F03 بسته شد.)
5. **هیچ ادعای اتمام/push/deploy بدون شواهد واقعی** — اگر مانع بود، در `ops/BLOCKERS.md` ثبت کن.

## نقاط ورود

- تابلوی تسک‌ها: GitHub Project «HANASO Development» + `ops/TASK_REGISTRY.md`
- قدم‌های صف: `ops/NEXT_ACTIONS.md` · مانع‌ها: `ops/BLOCKERS.md` · وضعیت فازها: `ops/PHASE_STATUS.md`
- رکورد کامل آخرین اجرا: `ops/runs/RUN-20261101-01.md`
