# TASK-HANASO-21 — Completion Root Cause (Phase 1)

## The owner's report

The learner walks the WHOLE lesson, all activities record their progress, but
the FINAL completion click fails: an error message says the lesson could not be
completed, the station never registers as Completed, and the path forward is
blocked. TASK-HANASO-20's 22/22 E2E did not invalidate the observation — those
tests never exercised THIS path's failing configuration.

## Root cause (commit `5204883`)

**A stale closure in the auto-next timer under-scored a PERFECT walk on
short-deck stations.**

`ExerciseSession`'s auto-next timer captured the `advance` closure of the
render that SCHEDULED it. That closure froze the PRE-increment
`firstTryCorrect` state — so when the LAST question was answered correctly and
the timer advanced the session, `onSessionDone` reported the final answer as
NOT first-try-correct. The earned score became (N−1)/N:

| Station | Deck size | Perfect walk scored | Threshold | Result |
| --- | --- | --- | --- | --- |
| `stn-kana-k8` (chōonpu) | 3 questions | **2/3 = 0.667** | 0.7 | 409 `completion_not_met` |
| `stn-kana-k12-foreign` | 2 questions | **1/2 = 0.5** | 0.7 | 409 `completion_not_met` |

The API then behaved AS DESIGNED — it rejected a below-threshold score — but
the rejection body was an English technical string
(`criterion not met (exercise_threshold; score=0.6)`) the client could only
surface as a generic "try again". Retrying re-submitted the SAME stale score:
an infinite dead loop. This is exactly what the owner saw: prior progress
recorded, final completion impossible, an error message, and no way out.

Why the earlier stations (h0, h1…) never hit it: their decks are larger, so
(N−1)/N ≥ threshold still passed (e.g. 4/5 = 0.8 ≥ 0.7). The bug needed a
station whose deck is small enough that ONE lost answer crosses the line —
k8 and k12-foreign are exactly those stations (both with pending word audio,
which forces the timer path instead of the audio-end path).

## The chain, layer by layer

- **Client (the bug lived here):** `scheduleAutoNext`'s `setTimeout` called a
  captured `advance` closure → stale `firstTryCorrect` → the score handed to
  `onSessionDone` was wrong for the final question.
- **Client (aggravating):** `finishSession` could POST `complete` while a
  walk-position save was still in flight (no ordering), and nothing prevented
  double activation; the generic failure panel offered a retry that re-sent
  the identical score.
- **API:** correct validation, wrong VOICE — 409 with an un-actionable body;
  no distinction between "criterion not met" and other failures.
- **DB:** healthy — completions that passed validation were persisted
  correctly; nothing was lost.

## Why the 22 TASK-HANASO-20 E2E did not catch it

Those E2E walks drove stations whose decks pass even with the last answer
lost (and the completion assertions targeted the 409-prerequisites path).
No test walked k8/k12-foreign to the end through the auto-next timer path —
that gap is now closed by the committed TASK-21 E2E suite
(`scripts/h21-e2e/run.mjs`, S2.2 and S3.1).
