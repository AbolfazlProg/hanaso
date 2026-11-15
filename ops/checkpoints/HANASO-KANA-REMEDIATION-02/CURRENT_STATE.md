# HANASO-KANA-REMEDIATION-02 — CURRENT STATE

> وضعیت زندهٔ اصلاح محتوا/سنجش (Mission 2). پس از هر دسته اقدام به‌روزرسانی و Commit/Push می‌شود.

## پارامترهای مأموریت (ثابت)

| پارامتر | مقدار |
|---|---|
| شاخهٔ اصلاح | `fix/HANASO-KANA-CONTENT-REMEDIATION-02` |
| مبنا | `4dedcd9` (tip ممیزی HANASO-KANA-AUDIT-01؛ حمل‌کنندهٔ Source عین Production `5b503598` / v1.1.0-hanaso29-r01) |
| Specification | گزارش‌های ممیزی در `ops/checkpoints/HANASO-KANA-AUDIT-01/` (بدون تغییر، به‌عنوان مرجع Findings) |
| دامنه | فقط Content/Assessment/Answer Key/Distractor/Feedback/Hint/منطق تولید — **بدون UI/CSS (Mission 3)** |
| مصون‌ها | ۵۹ گزینهٔ هم‌صدای عمدی Katakana (RP-10)، Findingsهای UI (AUD-007/008/009/015)، سرویس‌های مشترک، Progress/Sessions واقعی، Secrets |

## وضعیت: IN_PROGRESS

### Program

1. **CP-0 (این کامیت):** شاخه + CURRENT_STATE.
2. خواندن Source و تطبیق Findings با فایل‌های واقعی.
3. اصلاح Root Patternها به ترتیب: RP-04 (Helper romaji) → RP-02 (قرارداد خوانش + تصادم‌ها) → RP-01 (چندپاسخگی) → RP-03 (Hint افشاگر) → RP-05 (نشت شکل) → RP-08 (تکرار گیت) → RP-09 (شکاف‌های رجیستری).
4. Guardrailهای رگرسیون (تست‌های ماشینی).
5. اعتبارسنجی کامل ۵۸۶ + Lint/Typecheck/Build.
6. Subagent A (زبانی) + B (سنجش) + C (رجرسیون نهایی) — مستقل.
7. گزارش‌ها + Resolution Matrix + FINAL_VERIFICATION.

## Findings ممیزی (مرجع — ۱۵ شناسه)

HIGH: AUD-001 (چندپاسخگی ×۳ تمرین)، AUD-002 (تصادم کیوو) — MEDIUM: AUD-003 (hint لودهنده ×۳)، AUD-004 (نگارش ناهماهنگ ×۴)، AUD-005 (Helper romaji)، AUD-006 (نشت شکل)، AUD-007/008/009 (UI → خارج از دامنه)، AUD-015 (NEEDS_CONTEXT → خارج از دامنه) — LOW: AUD-010 (تکرار گیت ×۳)، AUD-011 (ん/labial → تحقیق + DEFERRED/قرارداد)، AUD-012 (۸ hostWord)، AUD-013 (ヲ) — NOT_A_BUG: AUD-014 (۵۹ مورد — دست نخورد).

## تاریخچهٔ Checkpointها

- CP-0: شاخه ساخته شد؛ خواندن Source آغاز می‌شود.
