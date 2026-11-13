# TASK-HANASO-22 — IMPLEMENTATION PROGRESS

> Updated continuously. CP-03 = practice engine + API + hub shipped.

## Milestone 1 — Practice engine + persistence + API + hub (DONE, typecheck green)

Files created:
- `apps/web/src/modules/practice/session.ts` — skill-agnostic contract; toClientItem strips keys.
- `apps/web/src/modules/practice/kana/dimensions.ts` — K1..K8 + labels.
- `apps/web/src/modules/practice/kana/policy.ts` — PRACTICE_POLICY (owner-tunable DATA).
- `apps/web/src/modules/practice/kana/items.ts` — taught-scope derivation, decodability
  rules (ゃゅょ→h6, っ→h13, ー→k8), mora counting, audio resolution.
- `apps/web/src/modules/practice/kana/generator.ts` — deterministic seeded generator;
  focused (station glyphs, block) + mixed (weak-weighted, interleaved); K1..K8 items;
  never untaught material.
- `apps/web/src/modules/practice/evidence.ts` — LO state folding, weak detection, session summary.
- `apps/web/src/modules/practice/repository.ts` — in-memory twins + interfaces.
- `apps/web/src/db/schema/app.ts` — app.practice_sessions + app.learning_object_states (additive).
- `apps/web/db/migrations/0004_minor_morlun.sql` — generated, clean CREATE TABLE ×2 + indexes.
- `apps/web/src/db/repositories/practice.ts` — PG repos (completed sessions persist; in-flight
  stay process-local; upsert LO states).
- `apps/web/src/lib/poc/stores.ts` — getPracticeSessionStore/getLearningObjectStore + reset hook.
- `apps/web/src/app/api/practice/route.ts` — generate/answer/complete + GET status; guest 401;
  focused requires completed station; mixed requires ≥3; server-side grading; honest reveals.
- `apps/web/src/app/practice/page.tsx` — RSC hub (server-computed status).
- `apps/web/src/components/practice/practice-hub.tsx` — hub cards + inline session runner
  (immediate click feedback, loading spinners, in-place feedback panel, write items via
  lazy WritingCanvas, safe exit with partial record, recap driven by server response).
- `apps/web/src/messages/fa.ts` — practice.* strings + nav.practice.
- `apps/web/src/components/site-nav.tsx` — 3rd nav destination (تمرین, Dumbbell icon).

Guarantees implemented:
- Answer keys never reach the client (choice items stripped; write items carry the glyph
  ONLY because the writing engine judges locally — same as lesson writing blocks).
- Practice never mutates FSRS / never gates / never shows pass-fail.
- Untaught material impossible: scope derives from completed stations in the walk store.
- Weakness list only from real evidence (≥3 seen, <60% first-try).

## Next (Milestone 2)

Learn de-scoring (exercise_threshold → task_completed on walk stations) + wrong-answer
feedback fix (no F1 spoiler; in-place animated panel) + tests update.

## Milestone 2 — Learn de-scoring + wrong-answer feedback fix (DONE, 737/737 unit + 22/22 in-mem integration green)

Changes:
1. **exercise_threshold → task_completed on ALL walk stations** (31 kana + 19 fm01):
   `chapter-kana01.stations.ts` + `chapter-fm01.stations.ts`. The chapter GATE (assessment,
   0.90/0.80 + 0.70/0.50) and all prerequisite validation are UNTOUCHED — the gate is the
   only judge now; Learn never fails a learner.
2. `station-runner.tsx`:
   - `onExerciseDone` final-block path: task_completed stations send `finishSession(score, true)`
     (the exercise finishing IS the task; the score rides for bestScore).
   - `next()` wrap-up path: task_completed sends the honest stationFinishScore + taskCompleted
     (was null → would have 409'd).
3. **Spoiler fix (owner complaint)** — `api/curriculum/station/route.ts`: `correctReading` +
   `correctAudio` attach ONLY to `outcome.correct || level >= 3` (reveal). First miss (F1)
   gets the statement only; the reading card + pronunciation arrive with the answer itself.
4. **Gentle feedback entrance** — `globals.css` `hanaso-feedback-in` (rise+fade, motion
   tokens, reduced-motion safe) applied to the in-place feedback panel.
5. Tests updated honestly:
   - `final-completion-reliability.test.tsx`: mock implements the task-completed contract;
     R4 asserts taskCompleted=true + fresh score still recorded; R6/R7 keep the criterion-409
     recovery coverage via a forced/one-shot server rejection (panel stays for future bars).
   - integration specs: complete calls on exercise stations now send taskCompleted:true
     (learner-isolation, station-walk-position, station-resume-expiry) — 22/22 pass.
   - `scripts/h21-e2e/run.mjs`: fastForward sends taskCompleted:true; S5.1 rewritten to the
     new contract (a WRONG final block still completes; no criterion panel; gate is the judge).

Verified: pnpm test 737/737 · vitest integration (in-mem) 22/22 · tsc clean.

## Next (Milestone 3)

Chapter-01 restructure: 4 islands → 2 sections (Hiragana / Katakana), honest section goals,
2 milestone stations (type practice + task_completed), estMinutes recompute, journey icon
identity + locked-click feedback.
