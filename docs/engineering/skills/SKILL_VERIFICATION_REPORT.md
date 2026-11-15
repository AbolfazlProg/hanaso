# Skill Verification Report — TASK-ENG practical tests

> **TL;DR (فا):** چهار آزمون کنترل‌شدهٔ مأموریت (UI، امنیت، Frontend/Testing، بازبینی استقرار) روی کد واقعی ریپو اجرا شد — فقط تحلیل و بدون هیچ تغییری در کد. همهٔ آزمون‌ها یافته‌های واقعی و قابل-اقدام تولید کردند و هم‌راستا با بدهی‌های ثبت‌شدهٔ خود ریپو (DEBT-S3 #69) درآمدند. کشف/نصب ۲۸ Skill و ابزارها نیز راستی‌آزمایی شد.

**Date:** 2026-11-02 · **Mode:** read-only analysis of real repo files · **Production impact: none** (no app code, DB, or VPS was touched by this mission).

---

## 0. Infrastructure verification (prerequisite checks)

| Check                                              | Command / evidence                                                       | Result                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| External install                                   | `bash scripts/install-external-skills.sh`                                | 12/12 installed into `.claude/skills/`, frontmatter + PROVENANCE validated                                                          |
| Two-source sync                                    | `KB_PATH=… bash scripts/sync-skills.sh`                                  | **28 skills discoverable** (16 internal + 12 external), zero name collisions, `.claude/skills/` remains gitignored generated output |
| Idempotency                                        | re-run of both install scripts                                           | rm-then-copy per skill; re-run produces identical tree                                                                              |
| Security audit tool                                | `python3 scripts/audit-external-skills.py agent-skills/external`         | `AUDIT_EXIT: PASS — 0 HIGH/MEDIUM` (3 benign LOW word-matches)                                                                      |
| `next analyze` availability (EXT-012 precondition) | `corepack pnpm exec next analyze --help` in `apps/web`                   | **Present in pinned Next.js 16.4.3** → EXT-012 stays Active                                                                         |
| Registry↔disk consistency                          | every Active EXT row has SKILL.md + PROVENANCE.md + LICENSE on disk      | 12/12 consistent                                                                                                                    |
| Agent discovery (non-Claude runtimes)              | `AGENTS.md` §۳ + this docs tree are plain markdown read as project files | Covered by the same mechanism the KB already documents for Codex/Cursor/Gemini/Copilot                                              |

## Test A — UI task (lens: SKL-004 Aizen + EXT-002 frontend-design + EXT-006 UI rules)

**Target:** `apps/web/src/app/learn/learn-card.tsx` (read-only review).

**Aizen compliance (SKL-004):** PASS — all colors/radii/shadows/motion via tokens (`bg-shu`, `bg-indigo`, `shadow-offset-cta`(+hover/active), `rounded-md/lg/sm`); transition lists explicit properties (avoids EXT-006's `transition:all` anti-pattern); stepper implements the documented Aizen signature (segmented bar, `frame-ink`); focus-visible uses the token focus style; disabled state styled; empty/error states rendered (not broken UI).

**EXT-006 rule pass (file:line findings):**

- `learn-card.tsx:85` — `border-[1.5px]` is an arbitrary value; border weight should come from tokens (`--hairline`/frame conventions) — token-discipline finding.
- `learn-card.tsx:135` — loading label is bare `…`; loading states may end with `…` ✓ but should stay screen-reader-meaningful (add `aria-label`/visible short text) — a11y-of-loading finding.
- Navigation semantics ✓ (`<a>` for stage navigation, `<button type="button">` for the action — no `<div onClick>`), `aria-current="step"` ✓, `aria-label` on the stepper list ✓, `role="alert"` on error ✓.

**EXT-002 quality floor:** responsive down to mobile (`flex-wrap`, `max-w-xl`, touch-sized paddings) ✓; keyboard focus visible ✓; reduced-motion zeroed globally by tokens ✓. Anti-generic check: composition is subject-specific (A→D cycle stepper, editorial Persian copy) — not a SaaS-card cliché.

**Verdict:** high Aizen fidelity; 2 real, actionable findings recorded above (no code changed — test is isolated by design).

## Test B — Security task (lens: SKL-011 + EXT-010 STRIDE)

**Target:** `apps/web/src/app/api/progress/route.ts` (read-only).

**Controls present (positive findings):** zod `safeParse` on POST body ✓; JSON parse guard with proper 400 envelope ✓; required-param validation on GET ✓; machine-validated state transitions (`ProgressTransitionError` → 400) ✓; **D→understood gate verifies the mastery attempt server-side and never trusts client-supplied outcome** — an exemplary IDOR-adjacent mitigation ✓; `cache-control: no-store` on per-user data ✓.

**STRIDE pass (EXT-010 categories):**

| Category               | Finding                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | **No authentication** — `userId` is client-supplied or defaults to `poc-user` (explicitly documented `DEV-ONLY`). Acceptable for the current single-user PoC; must not survive into M1 (better-auth task). |
| Tampering              | Low — transitions machine-validated; event payloads zod-checked.                                                                                                                                           |
| Repudiation            | Medium — no per-actor audit trail yet (analytics events exist, but they are not an audit log).                                                                                                             |
| Information disclosure | Currently benign (in-memory store, one pseudo-user) — the GET-any-userId pattern would become IDOR the moment real identities exist.                                                                       |
| DoS                    | No rate limiting on POST (SKL-011 monthly-checklist item; lands with the API-hardening task).                                                                                                              |
| Elevation              | Mitigated by the server-side attempt gate above.                                                                                                                                                           |

**Convergence check:** the two highest-priority findings (auth + userId filtering + rate limiting) exactly match the repo's own open debt issue **DEBT-S3 #69** ("سخت‌سازی API برای M1: auth · دامنهٔ attemptNo · فیلتر userId در GET attempts") — the skill-driven review reproduces the project's known hardening list and adds the STRIDE categorization. **No code was changed.**

## Test C — Frontend/testing task (lens: EXT-005 React rules + EXT-007 + EXT-003)

**Target:** `learn-card.tsx` + its data path (`lib/poc/client.ts`).

- Race safety: `useEffect` cleanup via `cancelled` flag ✓ (stale-response safe).
- Derived state computed in render (`nextRouteForStage(progress)`) instead of effects ✓ — matches EXT-005 `rerender-derived-state` rule.
- Conditional rendering uses ternaries/boolean `&&` on booleans only ✓ (no `&& number` trap).
- Keys stable (`key={stage}`) ✓; no inline component definitions ✓.
- a11y contrast: badge/error/success pairs are the pre-computed contrast pairs documented in `tokens.css` header (AA-passing set) ✓.
- **Gap found (EXT-003 lens): no unit/component test covers `LearnCard`** — `tests/unit/ui/` covers buttons/furigana/tokens-gate only; the card's `continueUnit` flow (first-entry event → navigation; label state machine across loading/understood/none) is untested. Recommendation logged for the owning agent (matches TESTING.md's component-test level; react-dom/server rendering pattern already established in the suite).

**Verdict:** React/TS quality high; one concrete coverage gap identified with a testable scope.

## Test D — Deployment review (lens: SKL-014, hypothetical scenario: "deploy new SHA X")

**Target:** `infra/deploy/deploy.sh` + `infra/docker/docker-compose.yml` + `scripts/smoke.sh` (read-only scenario walkthrough).

| SKL-014 checklist item           | Result                                                                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immutable artifact pinning       | ✓ pulls exact `ghcr.io/…:${TAG}` SHA tag — no `latest`                                                                                                                                                          |
| Fail-before-touch ordering       | ✓ pull/migrate failures occur before `up -d`; failing early steps are no-ops on the running service                                                                                                             |
| Health gate                      | ✓ 30 × 2s on loopback `/api/health` with `ok:true` assertion                                                                                                                                                    |
| Automatic rollback               | ✓ gate failure triggers `rollback.sh` with `HANASO_PREVIOUS_TAG` (rollback = redeploy per ADR-010)                                                                                                              |
| Post-deploy smoke                | ✓ `scripts/smoke.sh` (health/ready + RTL/ja shell assertions)                                                                                                                                                   |
| Unrelated VPS services untouched | ✓ compose scoped to project `hanaso` (own network/volumes, loopback publish); host nginx/HAProxy and the shared kotodama services are not modified by this script                                               |
| Backup before migrate            | ⚠ migrations (and therefore the backup-before-migrate step) are deferred to M0-10 by design — deploy.sh already reserves the slot; when DB lands, backup must precede the one-shot `migrate` service            |
| Rollback input hygiene           | ⚠ `HANASO_PREVIOUS_TAG` is only required _at failure time_; recommend persisting the last-good SHA on every successful deploy (e.g., a state file next to compose) so rollback never depends on operator memory |

**Verdict:** PASS with two documented hardening notes; no destructive behavior found — the script cannot restart/stop host-level services (matches mission §12.11: no deployment was performed by this mission).

## Combined outcome

| Test                 | Skills actually applied   | Real findings produced                        | Production changes |
| -------------------- | ------------------------- | --------------------------------------------- | ------------------ |
| A — UI               | SKL-004, EXT-002, EXT-006 | 2 actionable (token discipline, loading a11y) | none               |
| B — Security         | SKL-011, EXT-010          | 4 findings, converged with DEBT-S3 #69        | none               |
| C — Frontend/Testing | EXT-005, EXT-007, EXT-003 | 1 coverage gap + quality confirms             | none               |
| D — Deployment       | SKL-014                   | 2 hardening notes                             | none               |

The tests demonstrate the intended behavior: skills are loadable by task type, they change what the agent _checks_ (deeper, structured, evidence-cited), and they surface findings that match the project's own tracked debt rather than generic filler.
