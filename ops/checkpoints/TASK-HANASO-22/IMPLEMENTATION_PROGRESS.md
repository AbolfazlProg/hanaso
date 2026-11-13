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

## Milestone 3 — Chapter-01 two-section split + real-world milestones (DONE, 737/737 unit green)

Content changes (all additive, validation-clean):
- `chapter-kana01.ts`: 4 islands → 2 sections — `section-a-hiragana` (h0..h15 + m1 + opt-r-h9,
  core 201' + milestone 10') and `section-b-katakana` (k1..k13 + k12f + m2 + opt-drill,
  core 165' + milestone 10'). Honest section goals (summaryFa) promise ONLY what the
  sections actually teach. Chapter estMinutes 386 → 406 (2×10' milestones added; no
  double counting — practice is optional and uncounted).
- `chapter-kana01.stations.ts`: orders renumbered (m1=17 between h15 and k1; k1..k13 →
  18..31; m2=32 after k13; optionals 33/34). Two milestone stations added:
  `stn-kana-m1-reading` (برگهٔ خواندن هیراگانا — 6 meaning-select items over REGISTERED
  hostwords: すし ねこ いぬ えき みず ともだち) and `stn-kana-m2-realworld` (منو و تابلوی
  کاتاکانا — ドア エアコン カラオケ パソコン テスト ラジオ). Type 'practice', core, task_completed,
  prereq h15/k13 — ZERO new material (the prerequisite law).
- `chapter-kana01.exercises.ts`: 12 milestone exercises; assessesConcepts reference BASE
  glyphs only (dakuten forms are rule-derived); targetConcept = the milestones' shared
  objectiveCode 'kana-realworld-reading'.
- Tests repinned: curriculum-content (34/32/2, 2 sections, milestone contracts),
  h21-e2e-key (56 stations), curriculum-reveal (section B core rows locked for a new
  learner; the free drill stays enterable — FEAT-158 design), section-deeplink (new slugs).

## Next (Milestone 4)

Journey UI: content-type icons (right side identity, locked keeps identity), left access
state, locked-row click feedback (shake/pulse/vermilion + reason), button feedback audit.
