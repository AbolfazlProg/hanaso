# TASK-HANASO-24 — DATABASE TRANSACTION FIX (CP-04)

> Closes audit BUG-036 (zero transactions repo-wide) and mission finding 4.
> Every multi-step write is now ONE unit of work — all-or-nothing, idempotent,
> race-tested.

## 1. What was wrong (recap — SECURITY_ROOT_CAUSE.md §RC-4)

Repo-wide: zero `db.transaction` calls. Three flows could fail midway and
persist contradictory state:

| Flow | Writes (pre-24, non-atomic) | Partial-failure damage |
| --- | --- | --- |
| practice `complete` (`api/practice/route.ts`) | 1× INSERT `practice_sessions` + N× read-modify-write upserts `learning_object_states` | session logged with missing/half evidence; concurrent duplicate complete → raw 23505 → 500; concurrent different sessions same object → LOST UPDATE |
| station `complete` (`api/curriculum/station/route.ts`) | upsert `station_progress` + conditional upsert `chapter_progress` | station completed while the chapter aggregate never flips → learner permanently locked out of the gate by an inconsistent aggregate |
| mastery gate (`api/curriculum/mastery/route.ts`) | INSERT attempt (MAX+1 attemptNo) + chapter fold | attempt row without its aggregate; MAX+1 race under double-submit |

## 2. The fix

**New `src/db/transactions.ts`** — `runInTx(fn)`: one Postgres transaction;
`fn` receives a tx-bound `DbClient` (one contained cast — repositories just
construct with it). `usingDbTransactions()` switches on DATABASE_URL.
In-memory DEV mode keeps the identical sequence on singletons (single JS
thread — no interleaving); documented, semantics unchanged.

**New `src/lib/poc/completions.ts`** — the three multi-step flows as services:

### completePracticeSession(stored, groups)
- ONE transaction: session insert + every object's evidence fold.
- **Idempotent**: `recordCompleted` is now `ON CONFLICT (id) DO NOTHING` +
  returning (Pg) / existence check (in-memory) → a duplicate replay resolves
  `'already'` and SKIPS the fold entirely (never double-counts stats).
- **No lost update**: a per-user transaction advisory lock
  (`pg_advisory_xact_lock('lo:<userId>')`) serializes concurrent folds; both
  folds of different sessions land in the stats (proven below). One bounded
  service-level retry on unique-violation.
- The route now returns `already: true` on the replay path (plus the existing
  `recorded: true`); response otherwise unchanged.

### completeStationWalk(userId, chapterSlug, stationSlug, stationState, coreSlugs)
- ONE transaction: station upsert + the chapter fold.
- The aggregate precondition (`allDone`) is computed INSIDE the unit — the
  same statement scope sees the station write above (same read-after-write
  semantics as the old code, now atomic).
- When the fold doesn't apply, the existing chapter row is returned as-is
  (response shape preserved exactly).

### submitMasteryWithFold(userId, chapterSlug, dialogueId, input, outcome, gate, maxLoops)
- ONE transaction: attempt insert + chapter fold, guarded by
  `pg_advisory_xact_lock('ma:<userId>:<dialogueId>')` — MAX+1 is race-free and
  double-submits serialize; the existing in-`create` 23505 retry stays as the
  backstop; one service-level retry on unique violation.
- Defensive hardening: if the chapter aggregate row is absent entirely (a
  contract violation — the gate implies a walked chapter), the service throws
  and the WHOLE unit rolls back — no attempt row can ever exist without its
  fold.

### Repository changes
- `PracticeSessionRepository.recordCompleted` → `Promise<'recorded' | 'already'>`;
  Pg: `onConflictDoNothing({target: id}).returning()` — a concurrent duplicate
  resolves `'already'` instead of a raw 500.
- `isUniqueViolation` exported from `db/repositories/attempts.ts` (was module-
  private) for the service-level retries.

### Route changes
- `api/practice` complete branch → `completePracticeSession` (+ `already` flag).
- `api/curriculum/station` complete branch → `completeStationWalk` (the
  `allDone` read moved inside the unit).
- `api/curriculum/mastery` → `submitMasteryWithFold`. All single-statement
  writes elsewhere (`enter/progress/grade`, attempts route) were already atomic
  and are unchanged.

### Unique constraints (verified — `db/schema/app.ts`)
`dialogue_mastery_attempts (user_id, dialogue_id, attempt_no)` unique (the
23505 backstop); `station_progress` PK (user, station); `chapter_progress` PK
(user, unit); `learning_object_states` PK (user, objectId); `practice_sessions`
PK (id). No migration needed — additive code only; nothing destructive run.

## 3. Event-store & in-flight volatility (mission §4 documentation duty)

- In-flight practice sessions (`PgPracticeSessionRepository.inFlight` heap map)
  and the analytics ring (`InMemoryEventStore`) remain process-local BY DESIGN:
  restart mid-practice 404s the session honestly; single-instance VPS only.
  A PG-backed in-flight store / event store is the NEXT data mission's work
  (this mission's boundary: no new FSRS, no new event-sourcing).
- CORRECTED after subagent C-01 (the first version of this doc overstated):
  the 24h TTL is now actually ENFORCED — `sweepExpired` runs on every practice
  `generate` (it previously had ZERO production callers, so the map grew
  unboundedly), and `deleteInFlight` on the SINGLETON frees the entry after
  the transaction commits (the tx-bound instance never touches the map).
- CORRECTED after subagent C-02: the /api/attempts route is atomic for ITS OWN
  single insert, but as an UNLOCKED writer it can race the mastery gate's
  transaction and surface 25P02 — the service retries the whole unit once on
  `isRetryableTxError` (23505 | 25P02) now. Remaining trigger surface: crafted
  concurrency against a still-live legacy API; documented, bounded.
- The DB-written rows (completed sessions, LO states, station/chapter progress,
  attempts) are unaffected by restarts and are now always written in consistent
  units.

## 4. Race & idempotency proof (new tests)

`tests/integration/practice-completion-idempotency.spec.ts` (in-memory, real
route flow, 3 tests):
- sequential replay → 404, evidence = exactly ONE fold, session row written once;
- CONCURRENT duplicate complete → one `recorded` + one `already`, stats
  single-folded, row written once;
- guest 401 on GET+POST.

`tests/integration-pg/transaction-concurrency.spec.ts` (real PostgreSQL 18.4,
service level, 5 tests):
- `runInTx` rollback machinery: a thrown unit leaves NOTHING;
- concurrent duplicate completes → `['already','recorded']`, one row;
- concurrent DIFFERENT sessions on the SAME object → BOTH folds visible
  (`K1.seen=1` AND `K3.seen=1`) — the lost-update hole is closed;
- mastery double-submit → attemptNos `[1,2]` (MAX+1 race-free), both folds
  consistent, aggregate `understood`;
- concurrent station completes → chapter flips to `stations_complete` exactly
  once (upsert convergence, single row).

## 5. Verification status (post-CP-07 remediation)

- TypeScript clean, ESLint clean.
- In-memory: **64 files / 755 tests — all green**.
- PostgreSQL suite: **8 files / 35 passed, 8 pre-existing documented skips** —
  all green (added: the C-03 SEQUENTIAL PROD-path replay test — 'already',
  never a second fold).
- Subagent-verified: the advisory-lock machinery was proven by C's
  lock-removal experiment (10/10 runs fail without the locks, 5/5 with).
