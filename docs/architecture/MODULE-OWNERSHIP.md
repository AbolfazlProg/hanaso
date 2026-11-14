# Module & File Ownership — HANASO (ماتریس مالکیت Agentها)

> **خلاصه:** هر Agent روی دامنهٔ مالکیت خودش کار می‌کند؛ تغییر خارج از مالکیت = PR از مالک آن ماژول یا هماهنگی ثبت‌شده. فایل‌های هم‌نقطه فقط ترتیبی تغییر می‌کنند. (مأموریت §۵.۳ — ADR-001/017 KB)

## مالکیت مسیرها

| دامنه (Agent)                  | مالک        | مجاز به تغییر                                                                  | ممنوع                                   | وابسته به قرارداد                   |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------- |
| Platform & Infra               | `devops`    | `infra/**`, `.github/workflows/*`, `scripts/*`, Dockerfile, Caddy              | کد ماژول‌ها، tokens                     | ADR-003/005، KB deployment-strategy |
| Core Skeleton / shared         | `platform`  | `apps/web/src/{app,lib,styles}/*`, `packages/*`, tsconfig/eslint/vitest config | ماژول‌های دامنه‌ای                      | ADR-002، frontend-architecture      |
| Identity & Security            | `auth`      | `src/modules/auth/*`, env validation                                           | سایر ماژول‌ها                           | ADR-006، security-architecture      |
| Learning Core                  | `learning`  | `src/modules/learning/*`                                                       | review/exercises internals              | DD-045/046، lesson blueprints       |
| Dialogue & Audio               | `dialogue`  | `src/modules/dialogue/*`, audio pipeline                                       | content schema بدون PR هماهنگ           | ADR-009، DD-046..051                |
| Content Mgmt                   | `content`   | `src/modules/content/*`, `content/**` YAML, content CLI                        | شِمای app                               | ADR-008                             |
| Exercises & Assessment         | `exercises` | `src/modules/exercises/*`                                                      | schema comprehension_banks بدون هماهنگی | DD-047                              |
| FSRS & Review                  | `review`    | `src/modules/review/*`                                                         | تغییر الگوریتم بدون ADR                 | ADR-007                             |
| Library & Reader               | `library`   | `src/modules/library/*`                                                        | review internals (فقط سرویس عمومی)      | DD-020                              |
| Grammar (تا تفکیک)             | `learning`  | `src/modules/grammar/*` (در صورت تفکیک)                                        | تغییر بدون PR هماهنگ                    | DD-030                              |
| Progress/Motivation (تا تفکیک) | `learning`  | `src/modules/progress/*`                                                       | —                                       | FEAT-100/105                        |
| Notes/Notebook (تا تفکیک)      | `library`   | `src/modules/notes/*`                                                          | review internals                        | DD-020                              |
| Search (تا فاز 1.5)            | `content`   | `src/modules/search/*` (فاز 1.5)                                               | افزودن سرویس خارجی بدون ADR             | ADR-011                             |
| Analytics                      | `analytics` | `src/modules/analytics/*`, events.yaml                                         | PII/تغییر نام رویداد                    | ADR-016                             |
| Admin Console                  | `admin`     | `src/modules/{admin,support,billing}/*`, `/admin/*` routes                     | دسترسی مستقیم DB                        | ADR-017، DD-073..079                |
| UI/Design System               | `design`    | `tokens.css`, `components.css`, `components/patterns/*`                        | تغییر موازی نسخهٔ دوم ناسازگار          | DD-067..072                         |
| QA & Security Review           | `qa`        | فقط `ops/reviews/*` + تست‌ها                                                   | کد محصول بدون PR جدا                    | ADR-012/015                         |

## فایل‌های هم‌نقطهٔ هماهنگی (تغییر ترتیبی + اعلام قبلی در `AGENT_PROGRESS.md`)

`apps/web/src/styles/tokens.css` · `src/messages/fa.ts` · `AGENTS.md` · `docs/adr/*` · `.github/workflows/ci.yml` · `index.ts` عمومی هر ماژول · `pnpm-lock.yaml` (فقط via PR).

## قواعد تداخل

1. هیچ Agentی روی Branch/Worktree Agent دیگر کار نمی‌کند؛ هر تسک = Branch مستقل (`feat|fix|spike/<module>-<slug>`).
2. تعارض را «اولین تمام‌شده» برنده نمی‌شود — **Spec/KB داوری می‌کند**؛ ابهام = ایشو `spec-gap` در KB.
3. تغییر Schema/API contract/Design Token/Core Domain بدون هماهنگی چند Agent مستقل ممنوع است (مأموریت §۵.۳).
4. ادعای مالکیت: ردیف «start» در `AGENT_PROGRESS.md` با نام Branch؛ تسکِ بازِ دیگران برداشته نمی‌شود.
