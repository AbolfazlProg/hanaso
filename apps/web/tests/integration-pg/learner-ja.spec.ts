/**
 * HANASO — SMART-RUBY §۲ integration (REAL PostgreSQL): the per-learner
 * learner-ja view API — the mission's two-learner acceptance at the real
 * database level.
 *
 * Two learners walk the same chapter to DIFFERENT depths:
 *   - LEARNER-B stops after the anchor vocab stations (the nationality words
 *     are taught — the KANJI is not: its dedicated station is not completed);
 *   - LEARNER-A additionally completes stn-fm01-23-kanji.
 *
 * The API must answer different truths: B's view carries NO taught kanji
 * (every ruby shows), A's carries 人+国 taught with the readings their
 * completed carrier/anchor words exhibited (じん / こく+ごく). Presence of the
 * kanji in the dialogue content never counts as teaching.
 */
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureTestDatabase } from './helpers';
import { getStationProgressStore, resetStoresForTests } from '@/lib/poc/stores';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import type { StationState } from '@/modules/curriculum/types';
import { GET } from '@/app/api/curriculum/learner-ja/route';
import type { LearnerJaView } from '@/modules/curriculum/knowledge/reading-model';

let pool: Pool | null = null;

const LEARNER_A = 'aaaaaaaa-1111-2222-3333-444444444444'; // completed the kanji station
const LEARNER_B = 'bbbbbbbb-1111-2222-3333-444444444444'; // vocab only — no kanji station

function cookieFor(userId: string): string {
  return `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(userId)}`;
}

function getLearnerJa(userId: string): Promise<LearnerJaView> {
  return GET(
    new Request('http://localhost/api/curriculum/learner-ja', { headers: { cookie: cookieFor(userId) } }),
  ).then(async (res) => {
    const json = (await res.json()) as { ok: boolean; data: LearnerJaView };
    expect(json.ok).toBe(true);
    return json.data;
  });
}

function completed(slug: string): StationState {
  return {
    stationSlug: slug,
    status: 'completed',
    bestScore: 1,
    attemptCount: 1,
    currentBlock: null,
  };
}

beforeAll(async () => {
  const url = await ensureTestDatabase();
  pool = new Pool({ connectionString: url, max: 2 });
  resetStoresForTests();

  const store = getStationProgressStore();
  for (const slug of ['stn-fm01-02-vocab', 'stn-fm01-11-vocab2']) {
    await store.upsert(LEARNER_A, slug, completed(slug));
    await store.upsert(LEARNER_B, slug, completed(slug));
  }
  // only LEARNER-A completed the DEDICATED kanji station
  await store.upsert(LEARNER_A, 'stn-fm01-23-kanji', completed('stn-fm01-23-kanji'));
});

afterAll(async () => {
  await pool?.end();
});

describe('/api/curriculum/learner-ja — the two-learner furigana truth', () => {
  it('LEARNER-B (vocab only): NO taught kanji — every kanji ruby shows', async () => {
    const view = await getLearnerJa(LEARNER_B);
    expect(view.completedStations).toContain('stn-fm01-02-vocab');
    expect(view.completedStations).not.toContain('stn-fm01-23-kanji');
    const taught = view.kanji.filter((k) => k.taught).map((k) => k.literal);
    expect(taught).toEqual([]);
  });

  it('LEARNER-A (kanji station completed): 人 and 国 taught with their carrier readings', async () => {
    const view = await getLearnerJa(LEARNER_A);
    expect(view.completedStations).toContain('stn-fm01-23-kanji');
    const taught = view.kanji
      .filter((k) => k.taught)
      .map((k) => k.literal)
      .sort();
    expect(taught).toEqual(['人', '国']);

    const jin = view.kanji.find((k) => k.literal === '人')!;
    expect(jin.readings).toEqual(['じん']);
    expect(jin.meaningFa).toContain('انسان');
    expect(jin.strokeCount).toBe(2);
    expect(jin.taughtStationTitleFa).toContain('人 و 国');

    const kuni = view.kanji.find((k) => k.literal === '国')!;
    expect(kuni.readings.sort()).toEqual(['こく', 'ごく']); // かんこくじん + ちゅうごくじん rendaku
  });

  it('the two views DIFFER exactly at the kanji the station teaches (the ruby law flips)', async () => {
    const [a, b] = await Promise.all([getLearnerJa(LEARNER_A), getLearnerJa(LEARNER_B)]);
    const aBy = new Map(a.kanji.map((k) => [k.literal, k] as const));
    for (const k of b.kanji) {
      const aK = aBy.get(k.literal);
      if (!aK) continue;
      expect(aK.taught || k.taught).toBe(aK.taught); // teaching can only grow
    }
    expect(b.kanji.every((k) => !k.taught)).toBe(true);
    expect(a.kanji.filter((k) => k.taught).length).toBe(2);
  });

  it('an unauthenticated (guest) request gets the honest all-untaught view', async () => {
    const view = await GET(new Request('http://localhost/api/curriculum/learner-ja')).then(async (res) => {
      const json = (await res.json()) as { ok: boolean; data: LearnerJaView };
      expect(json.ok).toBe(true);
      return json.data;
    });
    expect(view.completedStations).toEqual([]);
    expect(view.kanji.every((k) => !k.taught)).toBe(true);
  });
});
