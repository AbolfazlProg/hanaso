/**
 * PART2-FULLWALK — the 38-node chapter dependency check over the REAL API:
 * every station (in journey order) is entered → its exercises graded (one
 * server-graded answer minimum) → completed. The linear unlock must hold for
 * all 36 core stations; the two optionals complete too. This is the same
 * walk the Part-1 evaluation reproduced (559 answers) — compressed to the
 * contract that matters: the chain unlocks END-TO-END, no station completes
 * out of order, and the chapter flips to stations_complete.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST as stationPost } from '@/app/api/curriculum/station/route';
import { getChapter } from '@/modules/curriculum/content';
import { resetStoresForTests } from '@/lib/poc/stores';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import type { Exercise, Station } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const UUID = 'cccc1111-2222-4333-8444-555555555555';
const cookie = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(UUID)}`;
const BASE = 'http://localhost/api';

function post(body: unknown, withCookie = cookie): Request {
  return new Request(BASE + '/curriculum/station', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: withCookie },
    body: JSON.stringify(body),
  });
}
const asJson = async (res: Response): Promise<Record<string, unknown>> => (await res.json()) as Record<string, unknown>;

const exercisesOf = (st: Station): Exercise[] =>
  st.blocks
    .filter((b): b is Extract<Station['blocks'][number], { kind: 'exercise' }> => b.kind === 'exercise')
    .flatMap((b) => b.exerciseIds)
    .map((id) => chapter.exercises[id]!)
    .filter(Boolean);

beforeEach(() => resetStoresForTests());
afterEach(() => resetStoresForTests());

describe('PART2 — the 38-node walk (journey order, server-enforced chain)', () => {
  it('completes the whole chapter in walk order — every node, no out-of-order completion', async () => {
    const { orderedStations } = await import('@/modules/curriculum/journey');
    const slugs = orderedStations(chapter).map((st) => st.slug);
    expect(slugs.length).toBe(38); // the full journey — 36 core + 2 optional

    const completed: string[] = [];
    for (const slug of slugs) {
      const station = chapter.stations.find((s) => s.slug === slug)!;
      // grade ONE practice exercise of the station (the no_graded_answers guard)
      for (const ex of exercisesOf(station).slice(0, 1)) {
        const g = await stationPost(
          post({
            action: 'grade',
            chapterSlug: chapter.slug,
            stationSlug: slug,
            exerciseId: ex.id,
            attemptNo: 1,
            answer: { kind: 'option', optionId: ex.correctOptionId },
          }),
        );
        const gj = (await asJson(g)) as { ok?: boolean };
        expect(gj.ok, `grade ${ex.id} @ ${slug}`).toBe(true);
      }
      const c = await stationPost(
        post({
          action: 'complete',
          chapterSlug: chapter.slug,
          stationSlug: slug,
          score: null,
          ...(station.completion.kind === 'task_completed' ? { taskCompleted: true } : {}),
        }),
      );
      const cj = (await asJson(c)) as { ok?: boolean; error?: { code?: string } };
      expect(cj.ok, `complete ${slug} (all previous: ${completed.length})`).toBe(true);
      completed.push(slug);
    }
    expect(completed.length).toBe(38);

    // the chapter aggregate flipped — the gate is open (the journey core path complete)
    const { LEVELS_BY_CODE } = await import('@/modules/curriculum/content/levels');
    const { resolveJourney: rj, corePathComplete } = await import('@/modules/curriculum/journey');
    const { getStationProgressStore } = await import('@/lib/poc/stores');
    const states = await getStationProgressStore().listForUnit(
      UUID,
      chapter.stations.map((st) => st.slug),
    );
    const journey2 = rj(chapter, LEVELS_BY_CODE[chapter.levelCode]!, states, null);
    expect(corePathComplete(journey2), 'core path complete after the 38-node walk').toBe(true);
    expect(journey2.coreTotal).toBeGreaterThanOrEqual(36);
  });

  it('refuses an OUT-OF-ORDER completion (the chain stays honest)', async () => {
    const res = await stationPost(
      post({
        action: 'complete',
        chapterSlug: chapter.slug,
        stationSlug: 'stn-kana-k13',
        score: null,
        taskCompleted: true,
      }),
    );
    const json = (await asJson(res)) as { ok?: boolean; error?: { code?: string } };
    expect(json.ok).toBe(false);
    expect(json.error?.code).toBe('station/prerequisites_not_met');
  });
});
