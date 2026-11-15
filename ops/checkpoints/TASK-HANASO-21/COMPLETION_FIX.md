# TASK-HANASO-21 — Completion Fix (Phase 1.3)

Commit `5204883` — `fix(learning): TASK-HANASO-21 P0 — final-completion
reliability (owner-observed 409 dead end)`. Validation itself is UNCHANGED:
nothing invalid is accepted. Every fix is on the honest path.

## Client (component `exercise-session.tsx`)

1. **`firstTryCorrectRef`** — a SYNCHRONOUS mirror incremented in the same
   guarded branch as the state update. Every advance path (auto-next timer,
   audio-end beat, immediate-failure fallback, manual button) now reads the
   CURRENT truth, never a stale closure. The stale (N−1)/N score is
   impossible.
2. **Late-bound `advanceRef`** — `scheduleAutoNext`'s timer calls
   `advanceRef.current` (the freshest committed advance), never the captured
   closure. Defense in depth on top of the mirror.

## Client (runner `station-runner.tsx`)

3. **`finishSession` single-flight (`completingRef`)** — double activation
   (rapid double-click on the final advance, retry while a POST is in
   flight) fires exactly ONE `complete` POST.
4. **Bounded pre-complete sync** — `finishSession` awaits the in-flight
   walk-position save (≤3s) BEFORE posting `complete`: the final progress
   write is persisted first; a hanging save can never lock the completion.
5. **Criterion failure panel** (`data-completion-failed="criterion"` +
   `data-testid="criterion-failure-panel"`) — explains the miss in Persian,
   and offers exactly ONE action: **redo ONLY the final exercise block**
   (`retryFinalExercise` drops just that block's result, keeps the whole
   earned walk; a fresh pass re-fires completion with the new score). No
   dead same-score retry, no full re-walk. The validation is not weakened —
   the learner genuinely re-earns the score.

## API (`api/curriculum/station/route.ts`)

6. **Structured 409** — same contract as the BUG-004 prerequisites payload:
   a Persian message naming the bar and the earned score («برای ثبت پایان
   این درس، نمرهٔ تمرین پایانی باید دست‌کم ۷۰٪ باشد — نمرهٔ این دور: ۶۷٪ …»)
   + `details.kind='criterion'` with `threshold`/`score`. The client can
   finally tell the two 409s apart and route each to its real recovery.

## The 10 mandatory requirements — where each lives

| # | Requirement | Implementation |
| --- | --- | --- |
| 1 | Prerequisite activities persist before completion | bounded pre-complete sync await (#4) |
| 2 | Completion after saves succeed | same (#4) |
| 3 | Idempotent — no duplicate records/stamps on re-click | server `already:true` + single-flight (#3) + seal settles on `already` |
| 4 | No race on concurrent requests | single-flight guard + server-side state check |
| 5 | Real errors identifiable (status + message) | structured 409 payloads (#6) |
| 6 | UI never claims success before the server confirms | panel renders ONLY on `res.ok`; `freshCompletion` from the response body |
| 7 | Failure never destroys valid progress | nothing is deleted on failure; walk snapshot + blockResults survive |
| 8 | Retry without re-walking the whole lesson | redo-final-exercise (#5) |
| 9 | Success response drives the correct UI state | `setCompleted(res.ok)` → completion panel + seal |
| 10 | Map return + continue path works | E2E S1.7/S1.8/S1.9 green |

## Tests

6 new unit tests (`tests/unit/ui/final-completion-reliability.test.ts`,
R1–R7): the stale-score regression through all three advance paths, a PERFECT
walk of the k8 trap completes, an honest below-threshold walk shows the
criterion panel, and the redo recovers end-to-end. Browser E2E S2.2/S3.1
(the real owner path) + the S5 error matrix are green (46/46).
