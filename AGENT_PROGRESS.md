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

## 2026-11-02 — TASK-ENG (#75): زیرساخت Skillهای خارجی + الزام استفاده — RUN-20261102-04

- **شروع (~11:00):** کشف/تحلیل ریپو + KB؛ Issue #75 ثبت شد؛ Worktree مستقل با شاخهٔ `feat/eng-external-agent-skills`.
- **اعلام هماهنگی (فایل‌های هم‌نقطه):** `AGENTS.md` (§۳)، `.github/PULL_REQUEST_TEMPLATE.md`، `agent-skills/README.md`، `docs/adr/*` (ADR-006 جدید)، قالب‌های ops — تغییر ترتیبی و تک‌Agent (این اجرا تنها Agent فعال روی این فایل‌ها بود).
- **انجام:** ممیزی ۲۱ مخزن/۴ رجیستری (آمار API در ۲۰۲۶-۱۱-۰۲) → ۲۸ کاندید → ۱۲ Skill خارجی رایگان/متن‌باز (Apache-2.0/MIT، commit پین‌شده، ممیزی امنیتی ۱۲/۱۲ PASS) در `agent-skills/external/` + رجیستری ۲۸تایی + ماتریس انتخاب + سیاست Preflight/نگهداری + اسکریپت‌های نصب/ممیزی + ADR-006 + آزمون‌های A-D مأموریت — رکورد: `ops/runs/RUN-20261102-04.md`
- **پایان (~14:00):** دروازه‌های اعتبارسنجی محلی سبز؛ Push + PR — **TASK-ENG → In Review** (منتظر بازبینی مستقل + گیت مالک) — قفل هماهنگی آزاد شد.

## 2026-11-02 (بعدازظهر) — تکمیل TASK-M0-10: CI سبز ← merge ← استقرار ← دریل — RUN-20261102-03

- **بازیابی وضعیت:** سندباکس قبلی بازیافت شده بود؛ کار فقط روی remote بود (شاخه + ۳ کامیت + PR #74 باز). از همان‌جا ادامه شد.
- **سه ریشه‌یابی واقعی در compose-smoke** (هر کدام پس از داشبورد تشخیصی جدید CI): پراب TCP + start_period ۶۰ث (`67c2655`) · چیدمان volume ‏PG18 (`dc073fd` — crash-loop واقعی) · پیکربندی edoburu/pgbouncer: ‏6432 + scram-sha-256 (`be47a55`).
- **بازبینی مستقل REV-INC-1:** ‏APPROVE_WITH_S3 (دو S3 اعمال، یک S3 عمداً رد شد — حفظ پنجرهٔ بازیابی unhealthy→healthy).
- **Merge:** ‏CI سبز روی شاخه (رن 41441179189) ← merge اسکواش PR #74 ← `main` = `2d73080` ← هر سه جاب CI روی main سبز + image GHCR.
- **استقرار مرحله‌ای VPS** (طبق README §۵-۱، هرگز `down`): postgres → pgbouncer → migrate/seed → web+worker — هر چهار سرویس healthy.
- **راستی‌آزمایی زنده:** `/api/ready` چک واقعی DB (18.6/2ms از مسیر PgBouncer) · Aizen زنده (پالت/فونت/وزن راستی‌آزمایی شد) · POST واقعی attempts → ردیف در PostgreSQL · smoke ALL GREEN · kotodama.ir ‏200 قبل/بعد.
- **دریل بکاپ/ریستور روی VPS (TR-030):** بکاپ ۸۲۰۷۲B/۱۶۴ مدخل · restore به `hanaso_restore_test` در 0.8s · شمارش ۶ جدول دقیقاً برابر · رد restore روی DB زنده · اپ حین دریل متصل ماند.
- رکورد کامل: `ops/runs/RUN-20261102-03.md` — **TASK-M0-10: هر دو لایه Deployed و Verified**.

## 2026-11-02/03 — TASK-OPS-01: ممیزی/نقشهٔ راه/راهنمای مالک — RUN-20261102-05

- **شروع:** ادامهٔ مأموریت نیمه‌تمام (Checkpoint ۲۰۲۶-۱۱-۰۲ ۱۷:۲۵)؛ sandbox یک‌بار بازیافت شد و از remote بازسازی شد (push از قبل رسیده بود).
- **انجام:** Integration واقعی روی PG18.6 ایزوله (۳۱+۱ سبز؛ دریل بکاپ/ریستور با شمارش برابر) · راستی‌آزمایی زندهٔ Production (health/ready/progress/dialogues + kotodama.ir) · ممیزی UI ۸ مسیر × ۲ viewport (۱۶/۱۶ سالم؛ ۱۶ اسکرین‌شات مرجع) · ممیزی بصری VLM و طبقه‌بندی بلوغ صفحات · ممیزی Skillها + **حل تعارض PR #76 و merge آن** (`eb80e88`؛ بازشماره‌گذاری RUN-20261102-02→04 تسک TASK-ENG) · ARCHITECTURE_MAP/MASTER_ROADMAP/NEXT_EXECUTION_TASK · راهنمای ۱۵ فصلی مالک + به‌روزرسانی BRIEFING/STATUS/REGISTRY.
- **یافته‌ها:** D-01 (تولید صدا در Docker build نیست → 404 در prod) · D-02 (اولین بکاپ زمان‌بندی‌شده هنوز ثبت نشده) · D-04 (متن فنی در UI) · ۴ رکورد اجرای قدیمی بدون بخش Skill (USAGE NOT VERIFIED).
- **تسک بعدی:** TASK-M0-11 درس Hello (+Q1/Q2 موازی) — سند: `docs/engineering/roadmap/NEXT_EXECUTION_TASK.md`.

## ۲۰۲۶-۱۱-۰۴ — TASK-LEARNING-01 (Builder/Z.ai)

- **شاخه:** `feat/learning-01-island-chapter` → PR #86 — نخستین فصل کامل جزیره‌ای (بازتعریف M0-11).
- **فایل‌های مشترک تغییرکرده (ترتیبی، طبق قاعده):** `docs/engineering/roadmap/NEXT_EXECUTION_TASK.md` (بازنویسی — هدف M0-11 بازتعریف شد) · `MASTER_ROADMAP.md` (ردیف M0 + حوزه‌های D..H) · `docs/owner/OWNER_BRIEFING.fa.md` · `docs/owner/HANASO_PROJECT_GUIDE.fa.md` (فصل ۷/۱۲).
- **هم‌نقطه با دیگر Agentها:** هیچ (Agent هنری/تحقیق در این بازه فعال نبودند).

## ۲۰۲۶-۱۱-۰۴ — TASK-LEARNING-07 Wave 2 — اعلام هماهنگی (Z.ai — dialogue player overhaul)

- **شاخه:** `feat/learning-06-lesson-system` (کار روی working tree موجود؛ بدون commit).
- **اعلام قبلی فایل‌های هم‌نقطه (تغییر ترتیبی، تک-Agent):** `apps/web/src/modules/audio/index.ts` (افزودن خروجی عمومی `composite-handle` — TASK-LEARNING-07)، `apps/web/src/modules/audio/server.ts` (بازصادرات word-audio برای RSC)، `apps/web/src/modules/character/contracts.ts` (فیلد اختیاری `coSpeakerId` روی `ControllerLineStartInput` — افزودنی/نابشکننده). این اجرا تنها Agent فعال روی این شاخه است.

## ۲۰۲۶-۱۱-۰۴ — TASK-LEARNING-07 Wave 3 — اعلام هماهنگی (Z.ai — feedback ladder + walk nav + emoji sweep)

- **شاخه:** `feat/learning-06-lesson-system` (کار روی working tree موجود؛ بدون commit — ادامهٔ Wave 2).
- **اعلام قبلی فایل‌های هم‌نقطه (تغییر ترتیبی، تک-Agent):** `apps/web/src/messages/fa.ts`
  (Issue #94: بازنویسی `prerequisitesNote` + کلید‌های تازهٔ `prevBlock` / `exerciseAlreadyDoneTitle` /
  `exerciseAlreadyDoneBody` + اصلاح متن `eliminatedOption` + حذف فلش‌های → در دو رشتهٔ uiKit) —
  این اجرا تنها Agent فعال روی این شاخه است. `apps/web/tests/unit/curriculum-content.test.ts` هم
  (افزودن دو تست قرارداد F4 — ترتیبی، بدون تعارض).
- **انجام (Issues #106/#102/#105/#108/#94):** سیم‌کشی F2 (حذف گزینه) + F4 (بازگشت به آموزش) در
  exercise-session؛ ناوبری «مرحلهٔ قبل» با حفظ نتایج (station-walk.ts خالص + پنل رد شدن از تمرین
  انجام‌شده)؛ سلسله‌مراتب کارت واژه به «معنی-محور»؛ جاروی ایموجی باقیمانده (poc ها + صفحهٔ خانه +
  محتوای kana + حذف learn-card.tsx مرده) + گارد تست no-emoji؛ گیت فصل روی دیپ‌لینک ایستگاه/مکالمه.
  دروازه‌ها: typecheck + lint + vitest (28 فایل/273 تست) + eqa (37) سبز — رکورد: `agent-ctx/TASK-LEARNING-07-W3-zai.md`.

## ۲۰۲۶-۱۱-۰۵ — TASK-LEARNING-07 W4-W7 (Z.ai — writing engine + trail map + VPS deploy)

- **W4 (commit a8dc594):** موتور نوشتار مشترک (modules/writing + Hanzi Writer) با لایهٔ تحلیل هندسی اختصاصی هاناسو + ۲۳ بلوک writing-practice در Ch01 + رفع باگ واقعی mount (quiz هرگز شروع نمی‌شد) — ۳۱ تست جدید.
- **W5 (commits 57f9872+667ebf1):** نقشهٔ مسیر عمودی (بافت کاغذ، مسیر نقطه‌چین SVG، نشانگر شکل‌محور) + auto-scroll هوشمند + ۲ دور بازبینی VLM (verdict: PASS) — شواهد: agent-ctx/tl07-shots/.
- **W7 (استقرار):** بیلد image روی VPS از git-bundle (11MB) → migrate/seed → تعویض staged → health/ready/smoke ALL GREEN → رسم واقعی کانا روی learn.kotodama.ir تأیید شد → KOTODAMA دست‌نخورده (کاتینرها Up 8-50 روز، kotodama.ir 200 قبل/بعد) → rollback آماده (.env.pre-tl07-backup + imageهای قدیمی).
- نسخهٔ زنده: `https://learn.kotodama.ir` — commit `667ebf1` (شاخهٔ feat/learning-06-lesson-system، PR #115).
