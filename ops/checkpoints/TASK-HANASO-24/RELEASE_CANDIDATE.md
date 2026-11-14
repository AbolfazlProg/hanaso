# TASK-HANASO-24 — RELEASE CANDIDATE (CP-09)

> **Status: RELEASE CANDIDATE — NOT DEPLOYED.** Per the mission's explicit
> instruction, production deployment is a separate, later step. This document
> is the complete handoff for that step.

## 1. Identity

| Item | Value |
| --- | --- |
| Branch | `fix/TASK-HANASO-24-security` (from the product line `af49535`, NOT from the audit branch) |
| Base | `af49535` — tip of the H22 product line (182 commits ahead of main; includes the production release 3d8b8cc) |
| RC tip | see CHECKPOINT_LOG.md (all checkpoint SHAs pushed; the log's last row is the RC commit) |
| Production today | `1.0.0-hanaso22-r01 @ 3d8b8cc` — **still the PRE-24 code: the /poc/practice answer-key leak and the IDOR pair are LIVE until this RC is deployed** (B-01). |
| Proposed version | `1.0.0-hanaso24-r01` |

## 2. What this RC changes (summary — full details in the phase docs)

1. **Signed session architecture** (AUTH_SESSION_HARDENING.md): `hanaso_lid` =
   `<uuid>.<HMAC-SHA256(secret)>`; httpOnly + Secure + SameSite=Lax; minted by
   the middleware on GET/HEAD only; the pre-24 raw-uuid re-issue is bounded by
   `HANASO_LEGACY_TOKEN_CUTOFF` (fail-closed without it).
2. **IDOR closed** (IDOR_REMEDIATION.md): ownership on EVERY route is the
   server-resolved identity; client `userId` is ignored/stripped; attempts GET
   is caller-scoped; the D-gate compares server-derived values on both sides.
3. **Answer-key exposure closed** (ANSWER_KEY_EXPOSURE_FIX.md): all six `/poc`
   pages 404 in production builds; `/api/attempts` no longer returns
   `correctOptionId` in perQuestion (retake harvest closed); events GET is
   identity-scoped with bounded props.
4. **Data integrity** (DATABASE_TRANSACTION_FIX.md): the three multi-step
   writes are atomic transactions with idempotent replays, advisory locks
   against lost updates/races, and a production in-flight sweeper.

## 3. Verification summary (all green at RC time)

| Layer | Result |
| --- | --- |
| TypeScript / ESLint | clean |
| Unit + Integration (in-memory) | 64 files / **755 tests** passed |
| Integration (real PostgreSQL 18.4) | 9 files / **38 passed** + 8 documented backup-drill skips (VPS-only) |
| Live QA (12 mandatory scenarios, real Chromium, PG-backed standalone build) | **12/12 scenarios, 51/51 checks** — independently re-run by subagent B |
| Independent audits (3 subagents, 2 rounds) | **3/3 `DOMAIN VERDICT: PASS`** (FINAL_INDEPENDENT_VERIFICATION.md) |
| Real-browser E2E h21/h22 vs pristine baseline | **identical outcome sets** — zero regressions from H24 (regression-evidence/) |

No test was removed or weakened anywhere in this mission; several were
strengthened (learning-slice, mastery-api, middleware, learner-identity, plus
new specs), and one stale content-count test was corrected to content truth.

## 4. Deferred register (carried from FINAL_INDEPENDENT_VERIFICATION §4)

| # | Item | Owner | Note |
| --- | --- | --- | --- |
| 1 | **B-01 — production still serves the pre-24 build** (leak + IDOR LIVE until deploy) | deploy phase | The deploy itself is the fix; see §5. |
| 2 | B-03 = audit BUG-001: mastery gate ships 5 kana-listening items with NO promptAudio (honest-listener P(pass)=1/243; ch2 locked) — the H23 register's single Critical | content track | Needs rebank + audio attach (product decision). |
| 3 | B-04 = audit BUG-029: f1Fa feedback text states the correct reading at first miss (~60 strings) | content track | Content rewrite. |
| 4 | B-02 = audit BUG-031: practice write items client-judged (`accepted`), `character` crosses for the local engine | product decision | Server-side stroke grading is the follow-up; docs state the trade honestly. Evidence-only: never gates, never FSRS. |
| 5 | Rate limiting beyond the events-props bound (e.g. unbounded `generate`) | infra follow-up | Needs product budgets; in-flight sweeping bounds the damage. |
| 6 | A-10 eager boot-time secret assert (instrumentation.ts); B-13 legacy-bank 2-3-submission reconstruction; C-04 FOR UPDATE on attemptCount; in-repo automated RSC-flight tests | polish | All Low; A-10's risk is covered by the healthcheck + deploy gate. |

## 5. Deployment requirements (the deploy gate enforces #1 and #2)

1. **`HANASO_SESSION_SECRET`** — REQUIRED. Generate: `openssl rand -hex 32`.
   The app REFUSES TO BOOT without it in production (fail-closed), so a
   missing value surfaces as a failed healthcheck (`/api/health` 500), which
   the compose healthcheck + `update-hanaso.sh` gate treat as a failed deploy.
2. **`HANASO_LEGACY_TOKEN_CUTOFF`** — REQUIRED by the deploy gate. Set to
   **deploy-time + 14 days** (ISO-8601, e.g. `2026-12-01T00:00:00Z`):
   existing learners' pre-24 cookies get re-issued signed with the SAME uuid
   during the grace (progress stays linked); after the cutoff, raw values are
   never re-signed (fail-closed). Learners who don't visit within the grace
   get a fresh identity — their old rows remain in the DB untouched but
   unlinkable (honest UX note for the release announcement).
3. `X-Forwarded-Proto: https` — already set by the existing nginx config
   (infra/deploy/learn-kotodama/hananaso-learn.nginx.conf) — the Secure cookie
   flag resolves correctly through it.
4. `DATABASE_URL` via PgBouncer (unchanged infra); transactions are
   PgBouncer-transaction-pooling compatible (unnamed prepared statements —
   see db/client.ts).
5. Migration: **none required by this RC** (additive code only; zero schema
   changes on the branch — verified by subagent C).

### Rollout sequence (standard, via the existing tooling)

1. Add the two env keys to `/opt/hanaso/.env` (values never printed; the
   updater checks NAMES only).
2. Run the standard one-command update (bootstrap → update-hanaso.sh): it
   verifies the env keys, pulls `fix/TASK-HANASO-24-security`, builds, and
   brings the stack up with a healthcheck gate.
3. Post-deploy smoke (2 minutes): `GET /` 200 · `Set-Cookie: hanaso_lid=<uuid>.<sig>;
   HttpOnly; Secure; SameSite=lax` on a fresh browser · `GET /poc/practice` → 404 ·
   `GET /api/progress` without a cookie → 401 · one signed-identity write+read round-trip.
4. Rollback: the updater's existing rollback path (previous image + previous
   .env) — note that rolling BACK re-exposes the pre-24 leaks; prefer moving
   forward.

### Risks (honest)

- The legacy grace (14d) is a one-time window in which a pre-24-stolen raw
  uuid could still be re-signed once; no known exfiltration channel existed
  (HTTPS + no XSS in the learn path + no cookie logging) — accepted and
  documented (AUTH_SESSION_HARDENING.md §2).
- E2E h21/h22 remain timing-sensitive in constrained sandboxes (identical on
  the baseline — not a product regression); re-run them on the VPS after
  deploy where they historically passed 92/92.
- The events analytics ring stays in-memory (restart clears it) by design;
  the PG-backed store remains the next data mission's work.

## 6. Full document index (ops/checkpoints/TASK-HANASO-24/)

CURRENT_STATE · SECURITY_ROOT_CAUSE · IDOR_REMEDIATION ·
AUTH_SESSION_HARDENING · ANSWER_KEY_EXPOSURE_FIX · DATABASE_TRANSACTION_FIX ·
SECURITY_TEST_RESULTS · SUBAGENT_REVIEW_{A,B,C} (with round-2 verdicts) ·
FINAL_INDEPENDENT_VERIFICATION · RELEASE_CANDIDATE (this file) ·
CHECKPOINT_LOG · qa-evidence/ · regression-evidence/.
