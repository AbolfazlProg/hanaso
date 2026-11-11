/**
 * HANASO — Station walk-position API tests (TASK-LEARNING-08 / WP-5 — owner
 * feedback E + #109).
 *
 * Route handlers called directly (the repo's integration pattern). Contract:
 * - `enter` marks the station in_progress with the resume anchor (currentBlock)
 *   — it was NEVER fired by the client before WP-5, so stations only became
 *   visible in the store at `complete` (part of the lost-progress bug).
 * - `progress` moves the anchor block-by-block WITHOUT touching status/score.
 * - an INVALID anchor block id is rejected (never stored) — a corrupt client
 *   cannot poison the resume position.
 * - the learner cookie isolates stores: two learners never share progress
 *   (the #109 shared poc-user collapse).
 * - `complete` clears the anchor and the state flips to completed.
 * - GET returns the stored state for the SAME learner only.
 */
import { describe, expect, it } from 'vitest';

import { GET as getStation, POST as postStation } from '@/app/api/curriculum/station/route';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { resetStoresForTests, getStationProgressStore } from '@/lib/poc/stores';

const BASE = 'http://localhost/api/curriculum/station';
const CH = 'kana-foundation-01';
const STN = 'stn-kana-h1';
const L1 = '11111111-2222-3333-4444-555555555555';
const L2 = '99999999-8888-7777-6666-555555555555';

function post(body: unknown, learner: string | null = L1): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(learner ? { cookie: `${LEARNER_COOKIE_NAME}=${learner}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function get(stationSlug: string, learner: string | null = L1): Request {
  return new Request(`${BASE}?chapter=${CH}&station=${stationSlug}`, {
    headers: learner ? { cookie: `${LEARNER_COOKIE_NAME}=${learner}` } : {},
  });
}

interface StateShape {
  stationSlug?: string;
  status?: string;
  bestScore?: number | null;
  currentBlock?: string | null;
}

async function stateOf(res: Response): Promise<StateShape> {
  const json = (await res.json()) as { data?: { state?: StateShape } };
  return json.data?.state ?? ({} as StateShape);
}

describe('POST /api/curriculum/station — walk position actions (WP-5)', () => {
  it('enter marks in_progress AND stores the resume anchor block', async () => {
    const res = await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 0,
      }),
    );
    expect(res.status).toBe(200);
    const state = await stateOf(res);
    expect(state.status).toBe('in_progress');
    expect(state.currentBlock).toBe('blk-stn-kana-h1-card-hira-a');
  });

  it('progress moves the anchor without touching status or score', async () => {
    await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 0,
      }),
    );
    const res = await postStation(
      post({
        action: 'progress',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-retrieval-1',
        stepIndex: 3,
      }),
    );
    expect(res.status).toBe(200);
    const state = await stateOf(res);
    expect(state.status).toBe('in_progress');
    expect(state.currentBlock).toBe('blk-stn-kana-h1-retrieval-1');
    expect(state.bestScore ?? null).toBeNull();
  });

  it('an unknown anchor block id is never stored (honest anchor — TASK-HANASO-17: the last VALID anchor is preserved)', async () => {
    // seed a known-good anchor first
    await postStation(
      post({
        action: 'progress',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 1,
      }),
    );
    const res = await postStation(
      post({
        action: 'progress',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-does-not-exist',
        stepIndex: 2,
      }),
    );
    expect(res.status).toBe(200);
    const state = await stateOf(res);
    // the unknown id is never stored; the merge semantics keep the last valid
    // anchor (a mid-walk sync with stale content must not drop the resume).
    expect(state.currentBlock).toBe('blk-stn-kana-h1-card-hira-a');
  });

  it('learner cookies isolate progress stores (#109 — no shared poc-user)', async () => {
    await postStation(
      post(
        {
          action: 'enter',
          chapterSlug: CH,
          stationSlug: STN,
          currentBlockId: 'blk-stn-kana-h1-card-hira-a',
          stepIndex: 0,
        },
        L1,
      ),
    );
    // learner 2 walks a DIFFERENT station — learner 1's state must not appear
    await postStation(
      post(
        {
          action: 'enter',
          chapterSlug: CH,
          stationSlug: 'stn-kana-h2',
          currentBlockId: 'blk-stn-kana-h2-card-hira-ka',
          stepIndex: 0,
        },
        L2,
      ),
    );
    const s1 = await stateOf(await getStation(get(STN, L1)));
    const s2 = await stateOf(await getStation(get(STN, L2)));
    expect(s1.status).toBe('in_progress');
    expect(s2.status).not.toBe('in_progress'); // learner 2 never walked this station

    const s2h2 = await stateOf(await getStation(get('stn-kana-h2', L2)));
    expect(s2h2.status).toBe('in_progress');
    const s1h2 = await stateOf(await getStation(get('stn-kana-h2', L1)));
    expect(s1h2.status).not.toBe('in_progress');
  });

  it('complete clears the anchor and flips the state to completed', async () => {
    // prerequisites: walk H0 (viewed completion) then H1 with a passing score
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }));
    await postStation(
      post({
        action: 'progress',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 0,
      }),
    );
    const res = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: STN, score: 1 }));
    expect(res.status).toBe(200);
    const state = await stateOf(res);
    expect(state.status).toBe('completed');
    expect(state.currentBlock ?? null).toBeNull();
    // GET no longer offers a resume anchor
    const after = await stateOf(await getStation(get(STN)));
    expect(after.currentBlock ?? null).toBeNull();
  });

  it('re-entering a completed station keeps it completed (revisit is a review)', async () => {
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }));
    const res = await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: 'stn-kana-h0',
        currentBlockId: 'blk-stn-kana-h0-scene',
        stepIndex: 0,
      }),
    );
    const state = await stateOf(res);
    expect(state.status).toBe('completed');
  });
});

describe('station store state after walk actions (WP-5)', () => {
  it('the in-memory store reflects the anchor for resume reads', async () => {
    await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: 'stn-kana-h2',
        currentBlockId: 'blk-stn-kana-h2-card-hira-ka',
        stepIndex: 0,
      }),
    );
    const stored = await getStationProgressStore().get(L1, 'stn-kana-h2');
    expect(stored?.status).toBe('in_progress');
    expect(stored?.currentBlock).toBe('blk-stn-kana-h2-card-hira-ka');
  });
});

resetStoresForTests();
