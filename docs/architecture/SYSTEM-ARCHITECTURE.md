# System Architecture — HANASO

> **خلاصهٔ فارسی:** هاناسو یک «مونولیت ماژولار» تک-استقرار است: یک اپ Next.js + یک Worker با همان Image + PostgreSQL + صف pg-boss + Caddy. مرزها = ماژول‌های کد با `index.ts` عمومی؛ نقض مرز = خطای CI. این سند خلاصهٔ اجرایی است؛ مرجع کامل: KB `09-technical-architecture/system-architecture.md` و ADR-001/017.

## System Context (C4-L1)

```
[Persian-speaking Learner] ──HTTPS──> [HANASO Web App (Preview زنده: learn.kotodama.ir؛ انتشار آتی: hanaso.ir)]
[Owner/Admin]            ──HTTPS──>        │ (role-gated /admin/*, MFA)
                                            ├──> [PostgreSQL 18] (content/app/analytics schemas)
                                            ├──> [pg-boss queues] (FSRS optimizer · daily stats · content publish · audio regen)
                                            ├──> [Object storage R2/CDN] (audio assets, immutable)
                                            ├──> [VOICEVOX engine] (internal, build-time TTS)
                                            └──> [GitHub Actions CI] → [GHCR images] → [VPS deploy via SSH]
```

## Container / Module map (C4-L2 — inside the single deployable)

| Container                            | Tech                                               | Notes                                                           |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------- |
| `web`                                | Next.js 16.4.3 (App Router, RSC-first, standalone) | One image; ports internal 3000                                  |
| `worker`                             | Same image, `node worker.js` entrypoint            | Queue consumer; separate compose service from day one (TRK-011) |
| `postgres`                           | PG 18-alpine                                       | Never exposed publicly                                          |
| `pgbouncer`                          | 1.26.1, transaction mode                           | Between app/worker and PG (2 consumers)                         |
| `caddy`                              | 2.11                                               | TLS/HTTP3, security headers, the only public ports 80/443       |
| _(later)_ voicevox, gatus, glitchtip | internal only                                      | M0-10+                                                          |

## Code modules (`apps/web/src/modules/*` — from ADR-001 + ADR-017)

`learning · review(FSRS) · library · grammar · exercises · dialogue · progress · notes · auth · content · search · shared` + boundary modules from ADR-017: `admin · support · billing` + `analytics` (ADR-016).

**Dependency rules (CI-enforced):**

1. A module imports only `shared` + external packages.
2. Cross-module access only via the target module's public `index.ts`. Deep imports / touching other modules' tables = boundary violation.
3. `src/app/*` composes pages from module services; modules never import from `app`.
4. DB-touching code is `server-only`.
5. Accepted exception: `notes`/`library` → `review` public service (single FSRS system, DD-020).

**Runtime patterns (pinned by KB):** RSC-first with client islands (exercise/review session, audio player, IME, live charts) · Server Actions for forms + tiny fixed REST surface (`/api/auth/[...all]`, `/api/review/*`, `/api/search`, `/api/export/:jobId`, `/api/events`, internal revalidate/rum) · Cache Components with `cacheLife`/`cacheTag` — **per-user data is never shared-cached (TR-004)** · Envelope error contract.

**Scale path (no premature infra):** S0 single VPS (≤500 DAU) → S1 (1k) → S2 split app/PG (10k) → S3 N×app + revlog partitioning (~500M rows). Triggers are measurable signals only.
