# AGENT_HANDOFF — تحویل به Agent بعدی

> الگو: `ops/templates/handoff-template.md`. پس از هر سشن کاری به‌روز می‌شود.

## وضعیت در یک نگاه (2026-11-01 — سشن دوم: «آغاز توسعهٔ واقعی» — DD-080..083)

- **فاز:** M0 (~۸۵٪) + پیش‌قدم M3a/M3b — **گیت OQ-013 باز شد**؛ نخستین قابلیت‌های واقعی در main ادغام شدند: B-0 Spikes (PR #62) + PoC دیالوگ + **اولین Slice چرخهٔ A→D** (PR #64 · ۹۶/۹۶ تست · verify ALL GREEN).
- **تصمیم‌های تازهٔ مالک (KB `7450a49`):** صوت = VOICEVOX پیش‌تولید/بدون TTS زنده (DD-081) · ۳ شخصیت با Agent هنری مستقل (DD-082) · انیمیشن سر و صورت از v1 (DD-083، ابطال جزئی DD-012) · قرارداد ADR-018.
- **SHAهای کلیدی:** `9ed1ec8` (اسپایک‌ها) · `3b652ae` (PoC+Slice) · رکورد: `ops/runs/RUN-20261101-02.md`.

## آنچه Agent بعدی باید بداند

1. **مسیر ورود استاندارد:** `AGENTS.md` (این ریپو) → `README.md`/`PROJECT_STATUS.md` → KB: `START-HERE.md` → `IMPLEMENTATION-BLUEPRINT.md` → Skill متناظر.
2. **اولین قدم عملی:** **TASK-M0-09 (زیرساخت UI)** — همهٔ ورودی‌هایش از اسپایک‌ها آماده است (`docs/research/B-0-SPIKES-SUMMARY.md`). هم‌زمان: بدهی‌های S3 (Issues `type:enhancement`) و اتصال DB پس از VPS.
3. **قوانین کار:** چرخهٔ ۱۲مرحله‌ای + شدت S0..S3 + نقش‌ها → KB `task-lifecycle.md`؛ هر اجرا = رکورد در `ops/runs/` + ردیف در `AGENT_RUN_LOG.md`. الگوی موفق این سشن: Branch مستقل → Builder → ۳ بازبین مستقل → رفع S1/S2 → squash-merge.
4. **گیت‌های باز:** VPS/DNS (BLOCKER-F02/F04 — مالک) · Branch Protection (F07) · #50 تأیید شخصیت‌ها · #46 انتخاب ابزار انیمیشن · #61 مجوز Speakerها. گیت‌های OQ-013/014/017 **باز شدند** (DD-080).
5. **هیچ ادعای اتمام/push/deploy بدون شواهد واقعی** — اگر مانع بود، در `ops/BLOCKERS.md` ثبت کن.

## نقاط ورود

- تابلوی تسک‌ها: GitHub Project «HANASO Development» + `ops/TASK_REGISTRY.md`
- قدم‌های صف: `ops/NEXT_ACTIONS.md` · مانع‌ها: `ops/BLOCKERS.md` · وضعیت فازها: `ops/PHASE_STATUS.md`
- رکورد کامل آخرین اجرا: `ops/runs/RUN-20261101-01.md`
