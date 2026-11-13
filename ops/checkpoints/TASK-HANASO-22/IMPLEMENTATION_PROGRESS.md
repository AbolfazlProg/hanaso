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
