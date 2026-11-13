# SUBAGENT C — Database & Transaction Audit (TASK-HANASO-24)

Independent verification of CP-04 (BUG-036 fix). Every claim re-derived from source;
experiments run on the local PG 18.4 cluster (own DB `hanaso_qa_c`, now dropped) and a
`/tmp` throwaway tree copy (`/tmp/hanaso24C`, now removed). Worktree untouched.

**Verification runs (all by me):** PG suite `vitest.integration.config.ts` → **34 passed / 8
documented skips** (matches claim). In-memory `pnpm test` → **751 passed / 64 files** (doc
says 748 — stale, see C-08). Lock-removal experiment → 10/10 runs fail without the advisory
locks. Live HTTP probe on port 3133 against a private DB copy (generate → answer×14 →
complete → replay → post-complete answer).

---

## FINDINGS

### C-01 — In-flight practice sessions leak permanently in PG (production) mode: unbounded heap growth + DEV/PROD behavior divergence [SEVERITY: High] [STATUS: CONFIRMED]
- **Location:** `src/db/repositories/practice.ts:53,71` (per-instance `inFlight` map, no-op
  delete), `src/lib/poc/completions.ts:75` (fresh tx-bound instance), `src/lib/poc/stores.ts:104-109`
  (singleton holds the live map), `src/modules/practice/repository.ts:41-42` (`sweepExpired` =
  "Test/maintenance hook" — zero production call sites; grep over `src/` confirms only definitions).
- **Evidence:** (1) Source: `completePracticeSession` in PG mode constructs
  `new PgPracticeSessionRepository(tx)` whose `inFlight` map is empty, so
  `recordCompleted`'s `this.inFlight.delete(session.id)` deletes from the wrong instance.
  The singleton that received `create()` (route `practice/route.ts:219`) is never cleaned.
  (2) Grep: no caller of `sweepExpired` anywhere in `src/` — the "24h TTL" is never enforced.
  (3) Live HTTP probe (PG mode): replayed `complete` returned **HTTP 200
  `recorded:true, already:true`** (not the 404 the in-memory test asserts), and a subsequent
  `answer` on the completed session still returned **200** — the session object lives on.
  (4) No rate limiting on POST /api/practice `generate` (grep: none in middleware or route).
- **Impact:** Every generated session (items incl. answer keys, ~10–50 KB each) stays in the
  singleton's heap map until process restart, both for completed AND abandoned sessions. A
  single authenticated learner scripting `generate` in a loop grows memory without bound →
  OOM/DoS vector. Also a semantics divergence: DEV (in-memory) consumes the session
  (replay→404, post-complete answers→404); PROD (PG) keeps it (replay→200 `already`,
  post-complete answers keep mutating a dead session whose mutations are never folded).
- **Suggested fix:** Have the route (or service, in-memory branch AND PG branch) call
  `getPracticeSessionStore().get()`/`.delete-in-flight` on the SINGLETON after the unit
  commits — e.g. add `consumeInFlight(sessionId)` to the interface and call it on the
  singleton store from `completePracticeSession` after `runInTx` resolves. Wire a periodic
  `sweepExpired` (setInterval on server start, or piggyback on each generate). Long term:
  PG-backed in-flight store (already flagged as next mission).

### C-02 — `/api/attempts` POST is an unlocked writer to `dialogue_mastery_attempts`; racing it against the mastery gate fires a mid-tx 23505 → `PgAttemptRepository.create`'s `continue` retries on an ABORTED transaction → 25P02 → unhandled 500 [SEVERITY: Medium] [STATUS: CONFIRMED (mechanism, by experiment) / trigger requires crafted concurrency]
- **Location:** `src/db/repositories/attempts.ts:79-111` (retry loop), `src/lib/poc/completions.ts:214-224`
  (tx + lock `ma:<user>:<dialogue>`), `src/app/api/attempts/route.ts:99` (unlocked, non-tx
  `getAttemptStore().create`), `src/app/api/curriculum/mastery/route.ts:124` (locked path).
- **Evidence:** Experiment A (throwaway copy, own DB): inside `runInTx`, after a mid-tx
  statement-level 23505 (exactly what `create` catches at attempts.ts:107), the retried
  SELECT fails with **cause.code 25P02** "current transaction is aborted, commands ignored
  until end of transaction block" (DrizzleQueryError wrapper). `isUniqueViolation(25P02)` →
  **false**, so neither `create`'s inner loop nor `submitMasteryWithFold`'s bounded outer
  retry recognizes it → error propagates → route 500. Rollback was clean (tx's row absent,
  unlocked writer's row intact — no corruption). Overlap surface confirmed: the gate
  dialogues (`dlg-kana-welcome-01`, `dlg-first-meeting-01`) are accepted by
  `/api/attempts` too (`buildAssessmentQuestions` is hardcoded, works on any bundle;
  content-map resolves CHAPTER dialogues). The `/poc` UI that called it is 404 in
  production, but the API route itself is live and identity-gated only.
- **Impact:** A learner concurrently POSTing `/api/attempts` and `/api/curriculum/mastery`
  for the same dialogue (same user) within the MAX-read→INSERT window gets a 500 from the
  gate; the attempt is rolled back (consistent, retryable). Availability-only, low
  likelihood via UI, but trivially triggerable by a crafted client.
- **Suggested fix:** Make the retry loop tx-aware: if `runInTxContext()` (or a flag passed
  by the tx-bound repo) is active, do NOT `continue` on 23505 — rethrow so the service-level
  retry re-runs the whole unit. Alternatively take the same `ma:` advisory lock in
  `/api/attempts` POST (or fold that route through `submitMasteryWithFold`-style service).

### C-03 — Sequential-replay idempotency is only tested in DEV semantics; PROD (PG) returns a contradictory `recorded:true, already:true` 200 [SEVERITY: Medium] [STATUS: CONFIRMED]
- **Location:** `tests/integration/practice-completion-idempotency.spec.ts:100-101` (asserts
  404 on replay — true only in-memory), `src/app/api/practice/route.ts:328-337`
  (`recorded: true` hard-coded + `already` spread).
- **Evidence:** Live PG probe: replay → `200 {"recorded":true,"already":true,...,
  "newlyEligible":0}`. Fold correctly skipped (idempotency holds — positive), but (a) no PG
  -mode route-level test covers the sequential replay path (the PG suite tests the
  concurrent duplicate at service level only), and (b) `recorded:true` on a replay is a
  misleading API contract.
- **Impact:** Untested production code path (route-level replay in PG mode); clients can't
  distinguish "I recorded" from "someone already did" cleanly.
- **Suggested fix:** Add a PG integration test for the route-level sequential replay (expect
  200 + `already:true`); return `recorded: outcome.status === 'recorded'` instead of the
  hard-coded `true`.

### C-04 — `attemptCount` lost updates: unlocked read-modify-write in `incrementAttempts`, and `completeStationWalk` overwrites it with a pre-tx read [SEVERITY: Low] [STATUS: CONFIRMED (source; pre-existing, not introduced by this branch)]
- **Location:** `src/db/repositories/curriculum.ts:125-149` (get → +1 → upsert, no lock),
  `src/app/api/curriculum/station/route.ts:417` (`current` read) → `:495`
  (`attemptCount: current?.attemptCount ?? 0` written inside the tx).
- **Evidence:** Source read: two concurrent graded answers both read n → both write n+1;
  a completion writes back the attemptCount read before the tx while a concurrent
  `incrementAttempts` commits. `attemptCount` has no gating consumers (display/telemetry
  only; `progress-machine.ts:31` preserves it on re-enter).
- **Impact:** Counter undercount/drift only; no state-machine corruption.
- **Suggested fix:** Make the increment atomic in SQL (`set attempt_count =
  station_progress.attempt_count + 1` on conflict) and have the complete branch preserve
  (`sql`self-reference`` like `currentBlock`) or re-read attemptCount inside the unit.

### C-05 — `runInTx` has no nesting guard; a nested call would open an independent transaction on a second pooled connection, not a savepoint [SEVERITY: Low] [STATUS: CONFIRMED (mechanism) / HYPOTHESIS (no current trigger)]
- **Location:** `src/db/transactions.ts:34-37`, drizzle `node-postgres/session.js:180-195`
  (`transaction()` on the pool does `pool.connect()` per tx; savepoints exist only when
  called on a tx handle, which `asTxClient`'s cast to `NodePgDatabase` discards).
- **Evidence:** Source read of both files; grep: the ONLY `runInTx` callers are the three
  services in `completions.ts` (72, 159, 214); none of their callees opens another `runInTx`
  → no nesting today. With `DB_POOL_MAX=8`, nested usage would (a) risk pool
  self-starvation and (b) self-deadlock if both levels take the same advisory key (the
  inner waits on a lock the outer holds; bounded only by `query_timeout: 5000`).
- **Impact:** Latent. One refactor (e.g. a service composing another service) away from a
  hang/500 under load.
- **Suggested fix:** Thread the active tx via AsyncLocalStorage (nested `runInTx` reuses it
  or throws loudly), or assert `!isTxClient(outer)` in dev.

### C-06 — Advisory-lock keys use 32-bit `hashtext` — collision surface exists but is benign; lock ordering is single-lock-per-tx (no deadlock); per-user `lo:` granularity acceptable [SEVERITY: Low] [STATUS: CONFIRMED (probe + analysis)]
- **Location:** `src/lib/poc/completions.ts:37-39`.
- **Evidence:** psql on own DB: `pg_typeof(hashtext(...))` = `integer`; 200k synthetic
  `lo:user<n>` keys → 3 colliding pairs (matches the ~2^16 birthday bound). Each tx takes
  exactly ONE advisory lock (`lo:` OR `ma:`; no path takes both, no path takes two) → a
  collision can only add cross-key serialization, never corruption or AB-BA deadlock.
  `pg_advisory_xact_lock` is released at COMMIT → PgBouncer transaction-pooling safe.
  Contention: `lo:<user>` serializes all of one user's folds; folds are ms-scale and
  human-rate → negligible. Caveat: a lock waiter is bounded by `query_timeout: 5000`, so
  extreme contention surfaces as a 57014 error, not a hang.
- **Impact:** Residual, acceptable. Documented here for the record.
- **Suggested fix (optional):** Use the two-int4 overload
  `pg_advisory_xact_lock(hashtext(domain), hashtext(key))` to partition lock domains.

### C-07 — `completePracticeSession`'s "one bounded retry on unique violation" is dead code [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `src/lib/poc/completions.ts:70-83`.
- **Evidence:** Source: every write inside the unit uses ON CONFLICT
  (`recordCompleted` DO NOTHING, `loRepo.upsert` DO UPDATE); `pg_advisory_xact_lock` raises
  no 23505. No statement in the unit can produce 23505, so the retry can never fire.
- **Impact:** None functionally; misleading (suggests a conflict mode that cannot occur) and
  it would be the WRONG shape if a conflict were possible (a mid-tx 23505 aborts the unit —
  see C-02 — so only a whole-unit retry like `submitMasteryWithFold`'s is valid).
- **Suggested fix:** Drop the loop or keep with a comment that it's defensive only.

### C-08 — Documentation inaccuracies in DATABASE_TRANSACTION_FIX.md [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `ops/checkpoints/TASK-HANASO-24/DATABASE_TRANSACTION_FIX.md` §3/§5;
  `src/db/repositories/practice.ts:49-50` ("ephemeral server state with a 24h TTL").
- **Evidence:** (a) The 24h TTL is presented as a design property but `sweepExpired` has no
  production caller (C-01); (b) §5 claims "748 tests" — actual run: 751; (c) §2 "All
  single-statement writes elsewhere (`enter/progress/grade`, attempts route) were already
  atomic and are unchanged" — true per-statement, but the attempts route's MAX+1 sequence is
  a multi-statement race surface (C-02) that the new locks do not cover.
- **Impact:** Reader expectations diverge from production behavior (leak, unlocked writer).
- **Suggested fix:** Amend §3 to state the TTL is currently test-only and the in-flight
  store is unbounded until restart; correct counts; note the attempts-route gap.

### C-09 — Chapter fold lock domain is (user, dialogue) while the guarded row is (user, chapter) — safe only under the 1:1 chapter↔dialogue model [SEVERITY: Low] [STATUS: CONFIRMED (structural)]
- **Location:** `src/lib/poc/completions.ts:215` vs `curriculum.ts:191-223` (full-row
  chapter upsert), content: 1:1 chapter↔dialogue (`dialogue.kana-welcome-01.yaml`,
  `dialogue.first-meeting-01.yaml` headers).
- **Evidence:** `submitMasteryWithFold` serializes per (user, dialogue); two DIFFERENT gate
  dialogues of one chapter would read-modify-write the same `chapter_progress` row
  concurrently (lost update). Today each chapter has exactly one dialogue, and
  `completeStationWalk`'s chapter flip can't race the gate (the gate route's walk check
  requires the last core station's completeStationWalk tx to have committed, which is the
  tx that flipped the chapter; re-completes early-return at route `:418`).
- **Impact:** None today; a second gate dialogue per chapter would reopen a lost-update hole.
- **Suggested fix:** Lock on `ma:<userId>:<chapterSlug>` (or chapter-keyed lock) instead.

---

## POSITIVE FINDINGS (verified, not trusted)

1. **runInTx machinery is correct.** Drizzle `transaction()` on the pool checks out ONE
   dedicated client (`pool.connect()`), BEGIN/COMMIT/ROLLBACK on that connection; rollback
   proven by spec test 1 AND my Experiment A (nothing survived a failed unit). The
   contained cast (`asTxClient`) is sound for the repository surface used
   (select/insert/onConflict/returning).
2. **The advisory locks genuinely close the races — and the tests prove it.** Lock-removal
   experiment (throwaway copy): without `advisoryXactLock`, 10/10 suite runs failed —
   lost-update test 10/10, mastery attemptNos test 8/10. With locks: 5/5 green. The tests
   use `Promise.all` over real parallel pool connections — genuine races, not sequential
   in disguise.
3. **Idempotent practice completion is correct end-to-end in PG.** `ON CONFLICT (id) DO
   NOTHING + returning` gives exactly-once ('recorded'/'already') even for concurrent
   duplicates (PG blocks the second insert on the uncommitted PK entry until the first
   commits, then the conflict resolves). Live HTTP probe: one `practice_sessions` row, 10
   `eligible_for_review` objects, replay folded nothing (`newlyEligible: 0`), no 500s.
4. **Unique constraints are exactly as claimed** (`db/schema/app.ts`): attempts unique
   (user, dialogue, attempt_no) :76; station PK (user, station) :118; chapter PK (user,
   unit) :151; LO states PK (user, object) :236; practice_sessions PK id :197. No missing
   constraint the fixes rely on; the idempotent insert's ON CONFLICT target (PK id) is real.
5. **Migrations: additive only.** `git diff af49535..4216426 -- apps/web/db/` is EMPTY —
   no migration, schema, or drizzle-meta change on this branch; nothing destructive run.
6. **PgBouncer compatibility claim verified in drizzle source.** Ad-hoc queries pass
   `name: undefined` to `client.query` (unnamed extended-query statements) — safe behind
   `pool_mode=transaction`; xact-scoped advisory locks are released at COMMIT.
7. **Station double-submit converges** (test 5 + PK analysis): both txs write the same
   terminal state via PK upsert; no contradictory rows possible; chapter flips at most via
   the `status !== 'started'` guard.
8. **`learning_object_states` has exactly ONE writer** — the fold inside
   `completePracticeSequence` (grep over `src/`): no non-transactional writer exists to
   race the fold.
9. **Answer-action mutation is single-thread-safe:** after the one `await get()` in the
   answer branch, the progress read-modify-write (`Math.max`, `||`) is fully synchronous →
   no interleaving can corrupt `session.progress` in-process (route `:252-256`).
10. **Event store bounds hold:** ring capped at 1000 (`event-store.ts:24-29`); POST
    `/api/events` requires identity (401 guest, route `:25-34`) → spam/row-growth bounded;
    restart volatility documented accurately.
11. **Mastery attemptNos are race-free** under the lock (test 4: [1,2]); `bestWeighted`
    monotonic via `Math.max` (`progress-machine.ts:100`); the missing-aggregate guard
    (`completions.ts:200-205`) correctly aborts the whole unit.

## COVERAGE

| Audit item | Status | Method |
| --- | --- | --- |
| 1. runInTx machinery, tx-cast, nesting, PgBouncer, mid-tx statement failure | Covered | drizzle source read; Experiment A (25P02); no nesting call sites (grep) |
| 2. Advisory locks: domains, hashtext collisions, ordering, granularity | Covered | psql probes (int4, 200k-key collision count); lock-removal experiment |
| 3. Idempotency: ON CONFLICT race window, replay skips fold, 'already' flag, station/mastery convergence | Covered | Live HTTP probe + PG suite + source |
| 4. Lost update: LO fold vs non-tx writers | Covered | grep — only one writer exists |
| 5. In-flight session state: answer mutation, TTL, restart, multi-instance | Covered | source + live probe; docs cross-checked (C-01/C-08) |
| 6. Unique constraints audit | Covered | schema read, all six tables |
| 7. Migrations additivity | Covered | branch diff of `db/` empty |
| 8. Event store + volatile state docs | Covered | source read of store + route |
| 9. Test quality: real races? lock-removal proof | Covered | 10× lock-removed runs (10/10 fail), 1× restored run (5/5 pass) |
| 10. Consistency invariants | Covered w/ caveat | live probe (practice), suite (station/mastery), analysis for remediationCount drift (no live multi-remediation probe run — serialized-by-lock reasoning only) |

Not covered / limits: no load-level contention measurement of the `lo:` lock (analysis
only); no experiment on the `ma:`-lock-vs-`/api/attempts` 500 in a live server (mechanism
proven at service level, Experiment A); production DB untouched (read-only guarantee kept —
all writes went to `hanaso_qa_c`, created and dropped by me).

**Cleanup:** QA server killed, `hanaso_qa_c` dropped, `/tmp/hanaso24C` removed.
Worktree: only this report added (`SUBAGENT_REVIEW_C.md`). Note:
`SUBAGENT_REVIEW_A.md` (parallel subagent's report) was already untracked before this audit.

---

## FINAL VERIFICATION (round 2, commit 14d9d3a)

Independent re-verification of the remediation. Runs: PG suite **35 passed + 8 documented
skips** (was 34+1 new sequential-replay test), in-memory **755 passed / 64 files** — both
match the updated doc exactly. Live probe on own port 3133 + own DB `hanaso_qa_c2`
(created from `hanaso_test`, dropped after). Experiments in `/tmp/hanaso24C2` (removed).
`git diff 4216426..14d9d3a -- apps/web/db/` is empty — still zero schema/migration changes.

### Per-finding verdicts

| ID | Verdict | Evidence (all verified by me, round 2) |
| --- | --- | --- |
| C-01 High — in-flight leak + answered-after-complete | **FIXED** | Source: `deleteInFlight` on the interface + both impls (`modules/practice/repository.ts:88-91`, `db/repositories/practice.ts:113-115`); PG `recordCompleted` no longer touches the map; service calls `getPracticeSessionStore().deleteInFlight(stored.id)` AFTER commit (`completions.ts:86`); `sweepExpired(Date.now())` on every generate (`api/practice/route.ts:206-212`) — also grepped present in the compiled standalone chunks. **Live probe:** answer-after-complete → **404** (round 1: 200); sequential replay → **404** (round 1: 200 `recorded:true,already:true`) — PROD now matches DEV semantics; 200× generate spam → 200/200 OK, server healthy; DB consistent (1 session row, 10 eligible objects, fold exactly once). Residual (bounded, documented in the doc): abandoned sessions of a learner who never generates again persist until restart — heap bounded by the 24h window of active users. |
| C-02 Medium — in-tx 23505 → 25P02 → unhandled 500 | **FIXED** | Source: `isRetryableTxError` (23505 \| 25P02, cause-chain aware, `attempts.ts:76-89`) wired in BOTH service loops (`completions.ts:89,239`). **Deterministic experiment through the REAL service** (one-line hook after the MAX select, /tmp copy only): unlocked writer commits attempt_no mid-tx → 23505 → `create`'s `continue` → 25P02 on the aborted tx → predicate TRUE → whole-unit retry → fresh MAX read → attempt 3 inserted → chapter `understood` → **resolved, no unhandled error** (final attempts [1,2,3]). Predicate separately proven to see 25P02 through drizzle's cause-chain wrapping. A first flawed run (hook non-idempotent) incidentally proved the retry genuinely fires. |
| C-03 Medium — PROD replay path untested | **FIXED** | New PG test `SEQUENTIAL replay (PROD path, subagent C-03)` (`transaction-concurrency.spec.ts:107-125`): service-level replay → `'already'`, `newlyEligible: 0`, fold count exactly one (`K1.seen=1`) — passes in my run. Route-level sequential replay now 404s (live-probed; consistent with DEV). Nuance: the route-level 404 replay behavior has no automated test (verified live by me only) — minor gap, not blocking. |
| C-04 Low — attemptCount lost updates | **PARTIALLY FIXED (acceptably bounded)** | Source: fresh in-tx `stationRepo.get` and `attemptCount: fresh.attemptCount` (`completions.ts:149-153`) — the route's stale pre-tx value is discarded. **Honest remaining window:** under READ COMMITTED, a concurrent committed `incrementAttempts` between the in-tx read and the upsert is still lost (no `FOR UPDATE`, no row lock; `incrementAttempts` itself remains an unlocked RMW). Window narrowed from the whole request span to a sub-ms in-tx span; the counter is display/telemetry only (no gating consumer) → acceptable. Full closure = `SELECT … FOR UPDATE` in the unit or an atomic SQL increment. |
| C-05 Low — runInTx nesting guard | **FIXED** | ALS guard (`transactions.ts:26,45-51`). Experiment (/tmp copy): nested `runInTx` **throws**; two concurrent independent calls **both succeed**; 8 interleaved-by-await units all succeed — the guard distinguishes nesting from concurrency. Service-level whole-unit retries call `runInTx` from OUTSIDE the previous ALS context → unaffected (the C-02 experiment exercised exactly this). |
| C-07 Low — practice retry dead code | **FIXED** | `isRetryableTxError` wired at `completions.ts:89`; a mid-unit statement failure followed by continued use of the aborted tx (25P02) is now a real, recognized trigger; predicate proven by experiment. |
| C-08 Low — doc inaccuracies | **FIXED** | `DATABASE_TRANSACTION_FIX.md` now: TTL "actually ENFORCED" + zero-caller history stated; the /api/attempts unlocked-writer caveat + bounded retry stated; counts **755 / 35+8 skips** (match my runs exactly); lock-removal experiment noted. |
| C-06, C-09 Low — accepted residuals | N/A (no action requested) | Lock-key collision / per-chapter lock domain — unchanged, still benign under the 1:1 model; correctly left as-is. |

### Original guarantees re-verified on new tip

Rollback machinery, advisory-lock lost-update, MAX+1 race, station convergence — all green
in the 35-pass PG run; in-memory 755 green; no schema/migration change in 14d9d3a.

### NEW findings (introduced-by-fix hunt)

- **C-10 — Nesting guard has NO automated test [SEVERITY: Low] [STATUS: CONFIRMED]**
  Location: `src/db/transactions.ts:45-51`; `tests/` grep — zero references. My /tmp
  experiment was the only exercise of the guard; a regression (guard removed or ALS scoping
  broken) would pass CI. Also cosmetic: the guard's error message reads `'anaso/tx] …'`
  (missing the opening `[h`). Suggested fix: port my 3-case experiment
  (nested-throws / concurrent-both-succeed / 8-interleaved) into
  `tests/integration-pg/transaction-concurrency.spec.ts`.
- **C-11 — Sweep piggybacks on generate only [SEVERITY: Low] [STATUS: CONFIRMED (bounded, documented)]**
  Location: `src/app/api/practice/route.ts:206-212`. Sessions abandoned by a learner who
  never generates again persist until restart. The heap is now bounded by the 24h window of
  active generators — acceptable for the PoC and honestly documented; no action needed this
  mission.
- **C-12 — Cross-domain fixes touching my audit surface reviewed, no regression [STATUS: CONFIRMED, informational]**
  events route caller-scoping (B-05) + props bounding (A-04), assessment-bank key removal
  (B-06), learner identity LAST-wins/safeDecode (A-02/A-03), fail-closed session secret
  (A-01): all reviewed from the 4216426..14d9d3a diff — no DB/transaction integrity impact;
  server-side emitters stamp `user_id` (`modules/curriculum/events.ts:105`) so the
  caller-scoped event listing stays complete for the caller.

DOMAIN VERDICT: PASS
