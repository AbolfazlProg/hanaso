# پیشرفت Agentها (AGENT_PROGRESS) — HANASO

> دفتر ثبت شفاف کار Agentها در این ریپو — هر Agent هنگام شروع/پایان کار ردیف می‌نویسد. قالب: KB `ops/templates/handoff-template.md`.
> وضعیت تسک‌ها فقط در `ops/TASK_REGISTRY.md` · رکوردهای اجرا: `ops/runs/` · مانع‌ها: `ops/BLOCKERS.md`.

| زمان (Asia/Tehran) | Agent/نقش                   | رخداد                                                                                                                                                                                                                                                                                           | Branch/مستند                   | تسک                    |
| ------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------- |
| 2026-11-01 ~10:00  | Z.ai (Orchestrator+Builder) | **شروع** مأموریت Engineering Foundation — کشف محیط/مطالعهٔ KB انجام شد؛ Branch کاری: مستقیم روی `main` ریپوی تازه (اولین commit بوت‌استرپ)                                                                                                                                                      | —                              | TASK-ENG-01            |
| 2026-11-01 (ادامه) | Z.ai (Builder)              | ساخت کامل ساختار ریپو + اسناد + اسکلت + CI + infra؛ دروازه‌های محلی سبز؛ نصب ۱۶ Skill از KB؛ سه بازبینی مستقل + رفع S0/S1 — رکورد کامل: `ops/runs/RUN-20261101-01.md`                                                                                                                           | `main`                         | TASK-ENG-01            |
| 2026-11-01 (پایان) | Z.ai (Integration)          | Push به GitHub + ایجاد Project/Milestones/Issues + تلاش Branch Protection (قفل پلن Free → BLOCKER-F07؛ کنترل جبرانی قاعدهٔ Agent) + ثبت سه spec-gap در KB — **TASK-ENG-01 → In Review** (گیت مالک)                                                                                              | `origin/main`                  | TASK-ENG-01            |
| 2026-11-01 ~14:00  | Z.ai (Builder — DLG PoC)    | **شروع** TASK-DLG-POC-01 (اجرای PoC فنی مکالمه T1..T10) در worktree مستقل — برنچ `poc/dialogue-player`؛ ماژول‌های جدید dialogue/character/audio/fsrs/mastery (index.ts عمومی تازه‌سازی، بدون تداخل با ماژول موجود)                                                                              | `poc/dialogue-player`          | TASK-DLG-POC-01        |
| 2026-11-01 ~19:00  | Z.ai (Builder — UI)         | **شروع** TASK-M0-09 (زیرساخت مشترک UI) — **اعلام هماهنگی: `apps/web/src/styles/tokens.css` + `src/messages/fa.ts` قفل این Agent** (مالکیت matrix: UI/Design → صف Builder طبق NEXT_ACTIONS ۰۰۰۰۰؛ Agent هنری مستقل در حال حاضر فقط در ریپوی KB فعالیت می‌کند)                                    | `feat/ui-m0-09-infrastructure` | TASK-M0-09             |
| 2026-11-01 ~21:30  | Z.ai (Builder — UI)         | **پایان** TASK-M0-09: پورت کامل توکن‌ها + فونت سلف‌هاست + FuriganaText + DirectionProvider + RC on + ۹ کامپوننت + دروازه‌های stylelint/بودجه — ۹ گیت ALL GREEN، ۱۲۴/۱۲۴ تست، Chromium+Firefox واقعی ✓ (WebKit بلاک محیطی → FT-002) — رکورد: `ops/runs/RUN-20261101-04.md` — قفل هماهنگی آزاد شد | `feat/ui-m0-09-infrastructure` | TASK-M0-09 → In Review |

## 2026-11-02 — TASK-DSGN-01 (Aizen · DD-084) + تکمیل Deploy — RUN-20261102-01

- **تکمیل مأموریت قبل:** استقرار `3d247ed` روی learn.kotodama.ir انجام شد (بدهای Runtime متوقف‌شده) — health gate ~۴s، smoke ALL GREEN، `/poc/ui` زنده، kotodama.ir دست‌نخورده (۲۰۰ قبل/بعد).
- **Aizen:** تصمیم مالک در KB ثبت شد (**DD-084**، PR #5 ریپوی KB)؛ سپس در این ریپو اجرا شد: token-swap پالت + توکن‌های ساختاری جدید + فونت‌های ۸۰۰/۹۰۰/Black + امضاها (باند نیلی青海波/قاب ۲px/آفست سخت/segmented A→D/مُهر/hatching/کارت نیلی) روی خانه، learn، poc/dialogue و poc/ui.
- **فایل‌های هم‌نقطه:** `tokens.css`، `fa.ts`، `button.tsx` — تغییر ترتیبی و تک‌Agent (این اجرا تنها Agent فعال بود).
- شواهد: ۹/۹ دروازه ALL GREEN · ۱۲۵/۱۲۵ تست · ۱۹/۱۹ سنجهٔ رندر · ۳ بازبینی مستقل (S1/S2 صفر باقی‌مانده).

## 2026-11-02 — TASK-ENG (#75): زیرساخت Skillهای خارجی + الزام استفاده — RUN-20261102-02

- **شروع (~11:00):** کشف/تحلیل ریپو + KB؛ Issue #75 ثبت شد؛ Worktree مستقل با شاخهٔ `feat/eng-external-agent-skills`.
- **اعلام هماهنگی (فایل‌های هم‌نقطه):** `AGENTS.md` (§۳)، `.github/PULL_REQUEST_TEMPLATE.md`، `agent-skills/README.md`، `docs/adr/*` (ADR-006 جدید)، قالب‌های ops — تغییر ترتیبی و تک‌Agent (این اجرا تنها Agent فعال روی این فایل‌ها بود).
- **انجام:** ممیزی ۲۱ مخزن/۴ رجیستری (آمار API در ۲۰۲۶-۱۱-۰۲) → ۲۸ کاندید → ۱۲ Skill خارجی رایگان/متن‌باز (Apache-2.0/MIT، commit پین‌شده، ممیزی امنیتی ۱۲/۱۲ PASS) در `agent-skills/external/` + رجیستری ۲۸تایی + ماتریس انتخاب + سیاست Preflight/نگهداری + اسکریپت‌های نصب/ممیزی + ADR-006 + آزمون‌های A-D مأموریت — رکورد: `ops/runs/RUN-20261102-02.md`
- **پایان (~14:00):** دروازه‌های اعتبارسنجی محلی سبز؛ Push + PR — **TASK-ENG → In Review** (منتظر بازبینی مستقل + گیت مالک) — قفل هماهنگی آزاد شد.
