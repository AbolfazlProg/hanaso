# AGENTS.md — HANASO (ریپوی محصول)

> این فایل دستورالعمل ریشهٔ همهٔ Agentهای کدنویس است (Claude Code ≥ v2.1.277، Codex، Cursor، Gemini CLI،
> Copilot، …). فایل موازی `CLAUDE.md` نسازید — وجودش باعث می‌شود Claude Code این فایل را نادیده بگیرد.
> الگو و منطق: `repository-instructions.md` §۹ در مرکز دانش (KB). تاریخ اعتبار: 2026-11-01.

## ۱. این ریپو چیست

ریپوی کد محصول **HANASO** — وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان (نام کاری، مالک: مأموریت ۲۰۲۶-۱۱-۰۱).
معماری: Modular Monolith تک-استقرار (Next.js 16 App Router). این ریپو **فقط کد محصول، تست، زیرساخت و مستندات مهندسی** است؛
پژوهش/طراحی/تصمیم‌ها در مرکز دانش مستقل نگهداری می‌شوند: `japanese-learning-kb` (متغیر محیطی یا clone هم‌سطح `KB_PATH`، پیش‌فرض `../japanese-learning-kb`).

## ۲. ترتیب مطالعهٔ اجباری

۱) همین فایل → ۲) `README.md` + `PROJECT_STATUS.md` این ریپو → ۳) در KB به‌ترتیب: `START-HERE.md` →
`docs/knowledge-base/11-implementation-foundation/IMPLEMENTATION-BLUEPRINT.md` → Skill متناظر با کار.
هیچ تسکی بدون خواندن این زنجیره شروع نمی‌شود.

## ۳. Skillها

۱۶ Skill استاندارد (`SKL-001..016`) از KB نصب می‌شود — منبع canonical فقط KB است؛ این ریپو کپی نمی‌سازد:

```bash
KB_PATH=../japanese-learning-kb "$KB_PATH/scripts/install-skills.sh ."   # → .claude/skills/ (خروجی بازتولیدشدنی)
```

فهرست و کاربرد هر Skill: `docs/knowledge-base/10-agent-engineering/agent-skills-catalog.md` در KB.
تحویل هر تسک باید Skillهای استفاده‌شده را صریح اعلام کند.

## ۴. تقدم منابع حقیقت

```text
KB (PROJECT-CONSTITUTION > DESIGN-MASTER-BLUEPRINT > بخش‌های ۰۸/۰۹/۱۰/۱۱) > ADRهای این ریپو (docs/adr/) > کد
```

کدی که با KB/ADR مغایرت داشته باشد باگِ کد است. تغییر Spec فقط از مسیر KB (ایssue با لیبل `spec-gap` در
`japanese-learning-kb`) — هرگز با تفسیر شخصی در کد.

## ۵. اسکریپت‌های pnpm (دروازه‌های همیشگی)

`pnpm lint` · `pnpm typecheck` · `pnpm test` (unit+integration) · `pnpm build` · `pnpm verify` (همه + smoke).
`pnpm e2e` از M1 اضافه می‌شود (Playwright). هر ادعای «انجام شد» فقط با خروجی واقعی این فرمان‌ها معتبر است.

## ۶. قوانین سخت (تخلف = خطا)

- خواندن/کامیت `.env*` ممنوع (فقط نام متغیرها در `.env.example`).
- هیچ DD/ADR در PR کدی تغییر نمی‌کند (فقط مسیر KB).
- Commit: Conventional با scope ماژولی — `type(scope): What — Why`.
- بدون ثبت Issue، تسک قابل‌ردیابی شروع نمی‌شود؛ بدون Branch مستقل (`feat|fix|spike/<module>-<slug>`) روی main کار ممنوع؛ merge فقط از طریق PR.
- فایل‌های هم‌نقطهٔ هماهنگی (`apps/web/src/styles/tokens.css`، `src/messages/fa.ts`، ADRها، CI، `index.ts` عمومی ماژول‌ها) فقط ترتیبی و با اعلام قبلی در `AGENT_PROGRESS.md` تغییر می‌کنند — هرگز دو Agent هم‌زمان.
- ماتریس مالکیت مسیرها: `docs/architecture/MODULE-OWNERSHIP.md` — خارج از مالکیتتان تغییر ندهید.
- هیچ Secret/توکن/مسیر شخصی در هیچ فایل، پیام commit، لاگ یا گزارش.

## ۷. هوک‌ها (قواعد قطعی → ابزار، نه نثر)

- Stop-hook: `pnpm typecheck` قبل از اعلام پایان (خطا = ادامهٔ کار).
- PreToolUse: ویرایش فایل‌های تولیدی (`pnpm-lock.yaml`، `.claude/skills/`، اسکرین‌شات‌های baseline، migrationهای drizzle) ممنوع.
- deny-rule: خواندن `.env*`؛ ایجاد پوشهٔ `docs/knowledge-base/` در این ریپو (KB جدا است).

## ۸. راستی‌آزمایی

قبل از هر PR: `pnpm verify` سبز (خروجی واقعی ضمیمهٔ PR). در CI: lint → typecheck → test → build → audit (+ smoke).
چک‌لیست کامل دروازه‌ها: `docs/agent-workflow/DEFINITION-OF-DONE.md` و در KB: `technical-acceptance-checklist.md` §۱.
«تقریباً سبز» وجود ندارد؛ اگر اجرای گیت ممکن نیست، دقیقاً ثبتش کنید (`ops/BLOCKERS.md`).

## ۹. فرایند spec-gap

اگر Spec مبهم/ناقص/متناقض است: در ریپوی KB ایشو با لیبل `spec-gap` باز کنید (عنوان: قلم Spec + مسئله)،
لینکش را در PR ثبت کنید و تا رفع، پیاده‌سازی آن بخش را متوقف کنید. حدس زدن در کد ممنوع است.
