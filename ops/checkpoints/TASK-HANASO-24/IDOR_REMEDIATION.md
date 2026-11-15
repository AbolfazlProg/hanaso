# TASK-HANASO-24 — IDOR REMEDIATION (CP-02)

> Closes audit BUG-011 (HIGH), BUG-030, BUG-033, the takeover-chain half of
> BUG-028/039, and mission finding 1. All changes verified at source level on
> this branch; behavioral proof is in SECURITY_TEST_RESULTS.md (CP-05) — this
> doc records the code change and the reasoning.

## 1. Root cause (recap — full analysis in SECURITY_ROOT_CAUSE.md §RC-1)

The legacy pair `/api/progress` + `/api/attempts` resolved record ownership from
CLIENT-SUPPLIED `userId` (query/body), defaulting NULL to the shared `poc-user`,
and `/api/attempts` GET listed EVERY learner's rows. The D→understood gate
compared two client-supplied values against each other, so the audit's 5-request
takeover chain (attacker writes victim's status to `understood`, any third
cookie reads it) worked end-to-end.

## 2. The fix — ownership is the server-signed session identity, period

**Identity source (all Read AND Write paths):** `resolveLearnerIdFromRequest(req)`
→ the signed `hanaso_lid` token (see AUTH_SESSION_HARDENING.md). A request
without a valid token resolves to the reserved GUEST scope and is rejected 401
(`learner/no_identity`) on every state-changing surface — never a default, never
a shared store.

### File-by-file change

| File | Change |
| --- | --- |
| `src/app/api/progress/route.ts` | GET: identity from cookie (guest 401); `?userId=` query param is IGNORED — never an ownership basis. POST: identity from cookie (guest 401); body schema drops `userId` (zod strips stale client fields). D-gate ownership check `attempt.userId === caller` now compares two SERVER-derived values — a cross-learner attempt id is 404, killing the chain. |
| `src/modules/progress/types.ts` | `progressInputSchema`: `userId` field REMOVED (unknown body keys are stripped by zod — stale clients are ignored, not trusted). |
| `src/app/api/attempts/route.ts` | GET: caller-scoped `listForUser(userId, dialogueId)` — the only listing shape served. POST: identity from cookie (guest 401); record created under the caller; body schema drops `userId`. |
| `src/modules/mastery/types.ts` | `attemptSubmissionSchema` (public): `userId` removed. `attemptInputSchema` (internal): `userId` now REQUIRED — `AttemptInput` can no longer express "no owner". |
| `src/modules/mastery/repository.ts` | `AttemptRepository.listForUser(userId, dialogueId?)` added to the interface; in-memory twin filters by owner. |
| `src/db/repositories/attempts.ts` | `PgAttemptRepository.listForUser` (SQL-level `user_id =` predicate — never post-fetch); `create()`: the `input.userId ?? POC_DEFAULT_USER_ID` fallback is REMOVED — a missing owner now fails loudly at the DB NOT NULL constraint instead of silently poisoning the shared store. |
| `src/app/api/events/route.ts` | POST requires identity (guest 401 — closes anonymous unbounded writes, T1-B-07); GET strips `user_id` from the observability payload (per-learner identity no longer disclosed). |
| `src/app/api/curriculum/mastery/route.ts` | Explicit guest 401 at the top of POST (the gate's 409 used to block guests only incidentally). |

### Similar-path census (mission: "don't patch only the two reported")

All 10 API routes re-audited (SECURITY_ROOT_CAUSE.md §4 table). The learn
surfaces (`station`, `practice`, `journey`) were already cookie-bound with guest
401 — unchanged. `/api/ready`, `/api/health`, `/api/dialogues/[slug]` carry no
user data (no identity needed). The events hardening above closes the remaining
exposure surface.

## 3. Behavior contract after the fix

1. A request without a valid signed token → GUEST → **401 `learner/no_identity`**
   on every mutating route AND on progress/attempts reads. Guest RSC page reads
   still show the honest empty state (product behavior preserved — HANASO-20).
2. A client-supplied `userId` (query, body, URL) is **ignored** — it can select
   nobody's data. Stale pre-24 clients keep working for their OWN store.
3. `/api/attempts` GET returns the caller's rows only; cross-learner rows are
   unreachable by construction (no client input reaches the query's user
   predicate).
4. The D→understood gate verifies the referenced attempt belongs to the CALLER
   (server-derived both sides). Cross-learner attempt ids → 404
   `progress/attempt_not_found`.
5. `poc-user` rows (legacy production data) are never written and never served —
   the constant survives only in `lib/poc/principal.ts` (seed history) and the
   events module's internal default.

## 4. Test updates (no test removed; none weakened — each kept assertion intact
and several strengthened)

- `tests/integration/learning-slice.spec.ts` — full A→D cycle now runs under a
  signed cookie; the remediate test uses a second QA learner (B) walking A→D
  under their own cookie, plus a NEW cross-learner D-gate probe (B presenting
  A's attempt id → 404). The final GET test now asserts a client `?userId=` is
  IGNORED and that the caller's attempts list excludes B's rows and seeded rows.
- `tests/integration/mastery-api.spec.ts`, `tests/integration/learner-isolation.spec.ts`,
  `tests/integration/station-resume-expiry.spec.ts`, `tests/integration/station-walk-position.spec.ts`,
  `tests/integration-pg/routes.spec.ts`, `tests/integration-pg/mastery-chapter.spec.ts`
  — identity transport switched to signed tokens; every prior assertion kept.
- `tests/unit/learner-identity.test.ts` — extended: legacy RAW uuid → GUEST
  (new, stronger), wrong signature → GUEST, node/web crypto twins agree.
- `tests/integration-pg/migrate-seed.spec.ts` — stale content count corrected
  (55→57 lessons: 1 anchor + 34 kana + 22 fm01 stations; 55 predated the H22
  milestone stations — verified against the audit's station census and the
  seeded DB).

## 5. Verification status

- TypeScript clean, ESLint clean.
- In-memory suites: **63 files / 745 tests — all green** (unit + integration).
- PG suite (PostgreSQL 18.4): **7 files / 29 passed, 8 pre-existing documented
  backup-drill skips** — all green.
- Live two-account A/B + forged-cookie + anonymous-context proof: CP-05
  (SECURITY_TEST_RESULTS.md) against the standalone QA build.
