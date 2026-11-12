/**
 * HANASO — Learner data-isolation tests (TASK-HANASO-20 — PHASE 1 scenarios A–E
 * at the API seam; the CI-able part of the onboarding recovery).
 *
 * The audit (audit/TASK-HANASO-19, BUG-001/002/004) reproduced the broken
 * first-visit chain: a cookie-less SSR render showed the SHARED poc-user
 * progress and its CTA led into a locked lesson whose completion 409'd with a
 * dead retry. These tests pin the NEW contract:
 *
 *  - Scenario A (anonymous): a cookie-less request sees NO ONE's data (empty
 *    state / 401 on writes) — even when legacy `poc-user` rows exist in the
 *    store (simulated by writing them directly, as the live DB carries them).
 *  - Scenario B/C (two QA learners): completely independent stores; one
 *    learner's completions never satisfy the other's prerequisites.
 *  - The 409 is self-explaining: Persian message + ordered prerequisite list
 *    in `error.details.prerequisites` (the runner links to the first unmet).
 *  - The recovery path works: after walking the prerequisites in order, the
 *    previously-rejected completion succeeds (the mission's acceptance flow).
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { GET as getStation, POST as postStation } from '@/app/api/curriculum/station/route';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { resetStoresForTests, getStationProgressStore } from '@/lib/poc/stores';

const BASE = 'http://localhost/api/curriculum/station';
const CH = 'kana-foundation-01';

/** Two QA accounts with independent per-browser ids (UUID shape — real ones). */
const QA_A = '11111111-2222-3333-4444-555555555555';
const QA_B = '99999999-8888-7777-6666-555555555555';

function post(body: unknown, learner: string | null = QA_A): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(learner ? { cookie: `${LEARNER_COOKIE_NAME}=${learner}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function get(stationSlug: string, learner: string | null = QA_A): Request {
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

async function errorOf(res: Response): Promise<{ code?: string; message?: string; details?: unknown }> {
  const json = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
  return json.error ?? {};
}

beforeEach(() => {
  resetStoresForTests();
});

describe('TASK-HANASO-20 — learner data isolation (onboarding recovery)', () => {
  it('Scenario A: a cookie-less GET sees NO ONE\'s data — not even legacy poc-user rows', async () => {
    // legacy shared-account rows, as the live DB carries them (BUG-001 setup)
    const store = getStationProgressStore();
    await store.upsert('poc-user', 'stn-kana-h0', {
      stationSlug: 'stn-kana-h0',
      status: 'completed',
      bestScore: 1,
      attemptCount: 1,
      currentBlock: null,
      lastActivityAt: new Date().toISOString(),
    });
    await store.upsert('poc-user', 'stn-kana-h1', {
      stationSlug: 'stn-kana-h1',
      status: 'completed',
      bestScore: 1,
      attemptCount: 1,
      currentBlock: null,
      lastActivityAt: new Date().toISOString(),
    });

    const res = await getStation(get('stn-kana-h1', null));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data?: { state?: StateShape | null } };
    expect(json.data?.state ?? null).toBeNull(); // empty honest state — no leak
  });

  it('Scenario A: a cookie-less WRITE is rejected 401 — never a silent shared-store write', async () => {
    const res = await postStation(
      post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }, null),
    );
    expect(res.status).toBe(401);
    const err = await errorOf(res);
    expect(err.code).toBe('learner/no_identity');
    // nothing was written anywhere
    expect(await getStationProgressStore().get('poc-user', 'stn-kana-h0')).toBeNull();
    expect(await getStationProgressStore().get('guest', 'stn-kana-h0')).toBeNull();
  });

  it('Scenario B/C: two QA learners are completely independent (no cross-visibility)', async () => {
    // QA A walks h0 + h1 in order
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }, QA_A));
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h1', score: 1 }, QA_A));

    // QA B sees NONE of A's progress
    const bH0 = await stateOf(await getStation(get('stn-kana-h0', QA_B)));
    const bH1 = await stateOf(await getStation(get('stn-kana-h1', QA_B)));
    expect(bH0.status ?? null).toBeNull();
    expect(bH1.status ?? null).toBeNull();

    // A's completions do NOT satisfy B's prerequisites
    const res = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h2' }, QA_B));
    expect(res.status).toBe(409);
    const err = await errorOf(res);
    expect(err.code).toBe('station/prerequisites_not_met');
  });

  it('BUG-004: the 409 explains itself — Persian message + ordered prerequisite list', async () => {
    // QA B jumps straight to h6 (deep in the chain) like the audit's direct-URL entry
    const res = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h6' }, QA_B));
    expect(res.status).toBe(409);
    const err = await errorOf(res);
    expect(err.code).toBe('station/prerequisites_not_met');
    expect(err.message ?? '').toContain('برای ثبت این درس');
    const details = err.details as { prerequisites?: { slug: string; titleFa: string }[] } | undefined;
    expect(details?.prerequisites?.[0]?.slug).toBe('stn-kana-h5'); // the only declared prerequisite
    expect(details?.prerequisites?.[0]?.titleFa ?? '').not.toBe('stn-kana-h5'); // a real Persian title
    // ordered by walk order so the client links to the FIRST unmet lesson
  });

  it('the recovery path: walking the prerequisites in order unlocks the rejected completion', async () => {
    // QA B starts honestly from the FIRST lesson and walks the chain up to h2
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }, QA_B));
    const rejected = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h2' }, QA_B));
    expect(rejected.status).toBe(409); // h1 still missing
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h1', score: 1 }, QA_B));
    const ok = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h2', score: 1 }, QA_B));
    expect(ok.status).toBe(200);
    const state = await stateOf(ok);
    expect(state.status).toBe('completed');
  });

  it('Scenario D (identity switch): the same endpoint returns each caller\'s own data only', async () => {
    await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-h0' }, QA_A));
    const forA = await stateOf(await getStation(get('stn-kana-h0', QA_A)));
    const forB = await stateOf(await getStation(get('stn-kana-h0', QA_B)));
    expect(forA.status).toBe('completed');
    expect(forB.status ?? null).toBeNull();
  });
});
