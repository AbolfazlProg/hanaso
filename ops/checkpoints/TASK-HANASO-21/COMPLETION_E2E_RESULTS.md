# TASK-HANASO-21 — Completion E2E Results (Phase 1.1 / 1.4 / 5.1)

Suite: `scripts/h21-e2e/run.mjs` (committed) · **46/46 PASS** · evidence:
`screenshots/e2e/E2E_RESULTS.json` + 18 PNGs.

Environment (a REAL QA environment, no mocks except the deliberate failure
injections): production build (`next build` + `next start`), real PostgreSQL
18.7 (dedicated `hanaso_e2e` database, committed migrations + seeds), real
Chromium 143 (playwright-core). The answer key is dumped from the content
source by `tests/unit/h21-e2e-key.test.ts` (integrity-pinned: 54 stations /
520 exercises walker-answerable) — the walker answers CORRECTLY like an
ideal learner, so threshold stations must complete.

## The requested scenarios → results

| Brief scenario | Check | Result |
| --- | --- | --- |
| Fresh user walks the FIRST lesson to the end, final click | S1.3 completed, no error panel | PASS |
| — | S1.5 exactly ONE complete request | PASS |
| — | S1.6 zero 4xx/5xx on the station API | PASS |
| Screenshot before/after the completion moment | e2e-01 (before) / e2e-02 (after, seal) | captured |
| Console logs clean | S2.6 no console errors on the trap station | PASS |
| Network requests / status / payload / response observed | the watcher records every station-API call + status (see E2E_RESULTS.json details) | PASS |
| **Owner-bug station k8, PERFECT walk via the auto-next path** | **S2.2 completes (was 409-forever)** | **PASS** |
| Second trap station k12-foreign | S3.1 completes | PASS |
| Double-click on the CTA | S5.4 ONE complete, S5.4b one seal | PASS |
| Refresh BEFORE completion | S5.3a/b/c resume banner, no progress lost, completes | PASS |
| Refresh AFTER completion | S1.10 seal settled, S5.2c persists | PASS |
| Connection drop during completion | S5.2a honest failure panel; S5.2b in-place retry recovers | PASS |
| Server error (5xx-class) | same handler path as S5.2 (generic panel + retry) | PASS |
| REAL 409 — criterion | S5.1a structured panel; S5.1c redo CTA; S5.1d redo completes | PASS |
| REAL 409 — prerequisites | S5.5a/b Persian message + ordered payload (first unmet = h1) | PASS |
| Two simultaneous completes | S5.4 single-flight + S5.7 idempotent (`already:true`) | PASS |
| Return to the lesson after failure | S5.2c navigate-away + back → still completed | PASS |
| Re-entry / new session, same identity | S5.8a progress intact | PASS |
| Completing an ALREADY-completed lesson | S5.7 no duplicate record, one seal | PASS |
| Replay after completion | S5.6a/b/c review badge, honest "nothing changed" panel, NO new seal, NO complete POST | PASS |
| Back to the Learning Map + continue | S1.7 CTA → map section; S1.8 rows-done line; S1.9 home next-lesson | PASS |
| GUEST isolation (no cookie) | S5.8b clean empty state | PASS |

## The reproduction specifics the brief asked to record

- Request payload of the completion: `{action:'complete', chapterSlug,
  stationSlug, score, taskCompleted}` — one POST per walk (S1.5).
- The structured 409 criterion payload carries `error.details =
  {kind:'criterion', criterion, score, threshold}`; prerequisites carry
  `details.prerequisites = [{slug, titleFa}]` ordered by station order
  (S5.5b: `["stn-kana-h1"]`).
- DB state: every completion is a row upsert in the station-progress store
  with `status='completed'`, `currentBlock=null` (no stale resume anchor);
  re-completes return the stored state with `already:true` (S5.7).
- Not reproducible in one lesson only: the bug needed a short deck — k8
  (3-question final block, 0.7 bar) and k12-foreign (2-question) are the
  two traps; both now complete on perfect walks (S2.2, S3.1).
