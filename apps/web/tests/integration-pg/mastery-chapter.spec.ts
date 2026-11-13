/**
 * TASK-HANASO-21 — the CHAPTER mastery gate against REAL PostgreSQL 18.
 *
 * Regression for the production 500 the browser E2E found: chapter dialogues
 * (kana-welcome-01) carry NO B_lesson anchor by design (TASK-LEARNING-01),
 * so the content map's INNER JOIN made them unresolvable and the kana
 * chapter's mastery gate crashed with ContentNotSeededError while persisting
 * the gate attempt (`app.dialogue_mastery_attempts`). A learner who walked
 * the whole kana core path could never open the second chapter.
 *
 * The fix (content-map LEFT JOIN, nullable lessonUuid) is proven here by
 * walking the kana core path through the REAL stores and submitting the gate
 * through the REAL route handler with honest correct answers.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as postMastery } from '@/app/api/curriculum/mastery/route';
import { getChapterProgressStore, getStationProgressStore, resetStoresForTests } from '@/lib/poc/stores';
import { resetDbClientForTests } from '@/db/client';
import { refreshContentMap } from '@/db/content-map';
import { ensureTestDatabase } from './helpers';
import { getChapter } from '@/modules/curriculum/content';
import { applyStationEvent } from '@/modules/curriculum/progress-machine';
import { orderedStations } from '@/modules/curriculum';

const LEARNER = '11111111-1111-4111-8111-111111111111';

function masteryRequest(answers: Record<string, unknown>): Request {
  return new Request('http://localhost/api/curriculum/mastery', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `hanaso_lid=${LEARNER}` },
    body: JSON.stringify({ chapterSlug: 'kana-foundation-01', answers }),
  });
}

beforeAll(async () => {
  await ensureTestDatabase();
  resetDbClientForTests();
  resetStoresForTests();
  await refreshContentMap();
});

afterAll(async () => {
  resetStoresForTests();
  resetDbClientForTests();
});

describe('the kana chapter mastery gate (chapter dialogue, no B_lesson anchor)', () => {
  it('resolves the chapter dialogue and persists a PASSED gate attempt (no 500)', async () => {
    const chapter = getChapter('kana-foundation-01')!;
    const stationStore = getStationProgressStore();

    // walk the whole core path through the real store (the gate's precondition)
    for (const station of orderedStations(chapter).filter((s) => s.core)) {
      await stationStore.incrementAttempts(LEARNER, station.slug);
      const current = await stationStore.get(LEARNER, station.slug);
      const next = applyStationEvent(current ?? undefined, {
        type: 'station_completed',
        stationSlug: station.slug,
        score: 1,
      });
      await stationStore.upsert(LEARNER, station.slug, next!);
    }

    // every gate question answered CORRECTLY (honest answers, same trust model)
    const answers: Record<string, { kind: string; optionId: string }> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (!ex.assessmentRole.startsWith('mastery_')) continue;
      if (!ex.options || !ex.correctOptionId) throw new Error(`gate exercise ${ex.id} has no option answer`);
      answers[ex.id] = { kind: 'option', optionId: ex.correctOptionId };
    }
    expect(Object.keys(answers).length).toBeGreaterThan(0);

    const res = await postMastery(masteryRequest(answers));
    expect(res.status).toBe(201); // was 500 (ContentNotSeededError) before the fix
    const body = (await res.json()) as { ok: boolean; data?: { outcome?: string } };
    expect(body.ok).toBe(true);
    expect(body.data?.outcome).toBe('passed'); // the ATTEMPT outcome — the chapter aggregate folds to understood below

    // the chapter aggregate is folded — the second chapter unlocks
    const chapterState = await getChapterProgressStore().get(LEARNER, chapter.slug);
    expect(chapterState?.status).toBe('understood');
  });
});
