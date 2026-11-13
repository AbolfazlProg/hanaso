/**
 * TASK-HANASO-21 — the E2E answer-key integrity test (+ dump mode).
 *
 * The browser E2E suite (scripts/h21-e2e/run.mjs) walks real lessons and must
 * answer exercises CORRECTLY on the first try (threshold stations reject
 * below-bar scores by design). The answer key never reaches the client
 * (SKL-013), so the E2E consumes a key JSON dumped from THIS test:
 *
 *   H21_E2E_DUMP=/tmp/h21-e2e-key.json npx vitest run tests/unit/h21-e2e-key.test.ts
 *
 * Permanently, this test asserts the key's INTEGRITY so the E2E can never
 * silently go stale: every practice exercise of both chapters must expose a
 * machine-resolvable correct answer (option label, chunk order, or chip
 * order) — an exercise the walker cannot answer correctly would fail the
 * completion E2E for a reason that is NOT a product bug.
 */
import { test, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CHAPTERS } from '@/modules/curriculum/content';
import type { Exercise } from '@/modules/curriculum/types';

export interface E2eQuestion {
  id: string;
  type: string;
  answerKind: 'option' | 'order' | 'build';
  /** option kind: the correct option's LABEL (matched on screen by text). */
  correctLabel?: string;
  /** option kind: the raw correctOptionId (API submissions — the mastery gate). */
  correctOptionId?: string;
  /** order kind: chunk ids in the correct order (matched by ja text). */
  correctOrderJa?: string[];
  /** build kind: chip ids in the accepted order (matched by ja text). */
  acceptedChipOrderJa?: string[];
  /** every option label (option kind) — for the on-screen fingerprint. */
  optionLabels?: string[];
}

export interface E2eBlock {
  id: string;
  kind: string;
  questions?: E2eQuestion[];
}

export interface E2eStation {
  slug: string;
  completionKind: string;
  threshold?: number;
  prerequisites: string[];
  blocks: E2eBlock[];
}

function keyForExercise(ex: Exercise): E2eQuestion {
  if (ex.options && ex.correctOptionId) {
    const correct = ex.options.find((o) => o.id === ex.correctOptionId);
    if (!correct) throw new Error(`${ex.id}: correctOptionId ${ex.correctOptionId} not in options`);
    return {
      id: ex.id,
      type: ex.type,
      answerKind: 'option',
      correctLabel: correct.label,
      correctOptionId: ex.correctOptionId,
      optionLabels: ex.options.map((o) => o.label),
    };
  }
  if (ex.chunks && ex.correctOrder) {
    const byId = new Map(ex.chunks.map((c) => [c.id, c.ja]));
    return {
      id: ex.id,
      type: ex.type,
      answerKind: 'order',
      correctOrderJa: ex.correctOrder.map((id) => byId.get(id) ?? ''),
    };
  }
  if (ex.chips && ex.acceptedChipOrder) {
    const byId = new Map(ex.chips.map((c) => [c.id, c.ja]));
    return {
      id: ex.id,
      type: ex.type,
      answerKind: 'build',
      acceptedChipOrderJa: ex.acceptedChipOrder.map((id) => byId.get(id) ?? ''),
    };
  }
  throw new Error(`${ex.id} (${ex.type}): no machine-resolvable correct answer for the E2E walker`);
}

test('E2E answer key integrity — every practice exercise in both chapters is walker-answerable', () => {
  const stations: E2eStation[] = [];
  let exerciseCount = 0;
  for (const ch of CHAPTERS) {
    for (const st of ch.stations) {
      const blocks: E2eBlock[] = [];
      for (const b of st.blocks) {
        if (b.kind === 'exercise') {
          const questions = b.exerciseIds.map((id) => {
            const ex = ch.exercises[id];
            if (!ex) throw new Error(`${st.slug}/${b.id}: unknown exercise ${id}`);
            exerciseCount += 1;
            return keyForExercise(ex);
          });
          blocks.push({ id: b.id, kind: b.kind, questions });
        } else {
          blocks.push({ id: (b as { id: string }).id, kind: b.kind });
        }
      }
      stations.push({
        slug: st.slug,
        completionKind: st.completion.kind,
        threshold: st.completion.kind === 'exercise_threshold' ? st.completion.threshold : undefined,
        prerequisites: st.prerequisites,
        blocks,
      });
    }
  }
  // sanity: the real curriculum shape
  expect(stations).toHaveLength(56); // 34 kana (TASK-HANASO-22: +2 milestones) + 22 fm01
  expect(exerciseCount).toBeGreaterThan(300);

  if (process.env.H21_E2E_DUMP) {
    /* the chapter gate banks too — the E2E unlocks the second chapter by
     * passing the first chapter's mastery gate with honest correct answers. */
    const mastery: Record<
      string,
      Array<{ id: string; type: string; answer: { kind: string; optionId?: string } | null }>
    > = {};
    for (const ch of CHAPTERS) {
      mastery[ch.slug] = Object.values(ch.exercises)
        .filter((e) => e.assessmentRole.startsWith('mastery_'))
        .map((e) => {
          const q = keyForExercise(e);
          return {
            id: e.id,
            type: e.type,
            answer: q.answerKind === 'option' ? { kind: 'option', optionId: q.correctOptionId } : null,
          };
        });
    }
    writeFileSync(process.env.H21_E2E_DUMP, JSON.stringify({ stations, mastery }, null, 1));
    console.log(`[h21-e2e-key] dumped ${stations.length} stations / ${exerciseCount} exercises → ${process.env.H21_E2E_DUMP}`);
  }
});
