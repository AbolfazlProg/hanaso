/**
 * HANASO — Station API resume-expiry integration tests (TASK-HANASO-17 §۸ /
 * §13-E). Route handlers called directly (the repo's integration pattern).
 *
 * The server-authoritative 7-day policy:
 * - a RE-enter of an in-progress station does NOT move the activity clock
 *   (a refresh must never extend the resume deadline — §8.1);
 * - `progress` / `grade` / `complete` DO move it (meaningful activity);
 * - an EXPIRED anchor is dropped on enter (idempotently) and the response
 *   says resumeExpired, so every device agrees (§10);
 * - GET computes the same expiry server-side (the client never decides alone);
 * - expiry NEVER touches completed rows, scores, attempt counts or history
 *   (§8.4 — only the walk POSITION expires).
 */
import { describe, expect, it, beforeEach } from 'vitest';

import { GET as getStation, POST as postStation } from '@/app/api/curriculum/station/route';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { resetStoresForTests, getStationProgressStore } from '@/lib/poc/stores';
import { RESUME_TTL_MS } from '@/modules/curriculum/resume-policy';

const BASE = 'http://localhost/api/curriculum/station';
const CH = 'kana-foundation-01';
const STN = 'stn-kana-h1';
const L1 = '11111111-2222-3333-4444-555555555555';

function post(body: unknown, learner: string = L1): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `${LEARNER_COOKIE_NAME}=${learner}` },
    body: JSON.stringify(body),
  });
}

function get(stationSlug: string, learner: string = L1): Request {
  return new Request(`${BASE}?chapter=${CH}&station=${stationSlug}`, {
    headers: { cookie: `${LEARNER_COOKIE_NAME}=${learner}` },
  });
}

async function bodyOf(res: Response) {
  return (await res.json()) as {
    data?: {
      state?: {
        status?: string;
        currentBlock?: string | null;
        lastActivityAt?: string;
        attemptCount?: number;
        bestScore?: number | null;
      };
      resumeExpired?: boolean;
    };
  };
}

/** Plant a station row whose activity clock sits `ageMs` in the past. */
async function plantRow(
  ageMs: number,
  status = 'in_progress',
  currentBlock: string | null = 'blk-stn-kana-h1-card-hira-a',
) {
  const store = getStationProgressStore();
  await store.upsert(L1, STN, {
    stationSlug: STN,
    status: status as 'in_progress',
    bestScore: null,
    attemptCount: 2,
    currentBlock,
    lastActivityAt: new Date(Date.now() - ageMs).toISOString(),
  });
}

beforeEach(() => {
  resetStoresForTests();
});

describe('POST /api/curriculum/station — the 7-day resume clock (§۸)', () => {
  it('a plain re-enter of an in_progress row does NOT move the activity clock (§8.1: refresh ≠ activity)', async () => {
    await plantRow(3 * 24 * 60 * 60 * 1000); // 3 days ago
    const before = (await bodyOf(await getStation(get(STN)))).data?.state?.lastActivityAt;

    await new Promise((r) => setTimeout(r, 5)); // let the wall clock tick
    const res = await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 1,
      }),
    );
    expect(res.status).toBe(200);
    const after = (await bodyOf(res)).data?.state?.lastActivityAt;
    expect(after).toBe(before); // preserved — the deadline did NOT extend
  });

  it('progress (a block transition) DOES move the clock (§8.1: meaningful activity)', async () => {
    await plantRow(6 * 24 * 60 * 60 * 1000); // almost expired
    const before = (await bodyOf(await getStation(get(STN)))).data?.state?.lastActivityAt;
    const res = await postStation(
      post({
        action: 'progress',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 2,
      }),
    );
    expect(res.status).toBe(200);
    const after = (await bodyOf(res)).data?.state?.lastActivityAt;
    expect(after).not.toBe(before);
    expect(new Date(after!).getTime()).toBeGreaterThan(new Date(before!).getTime());
  });

  it('a graded answer moves the clock (incrementAttempts — meaningful)', async () => {
    await plantRow(6 * 24 * 60 * 60 * 1000);
    const before = (await bodyOf(await getStation(get(STN)))).data?.state?.lastActivityAt;
    const res = await postStation(
      post({
        action: 'grade',
        chapterSlug: CH,
        stationSlug: STN,
        exerciseId: 'ex-kana-h1-rec-hira-a',
        attemptNo: 1,
        answer: { kind: 'option', optionId: 'opt-1' },
      }),
    );
    expect(res.status).toBe(200); // graded (right or wrong — the ANSWER is the activity)
    const store = getStationProgressStore();
    const row = await store.get(L1, STN);
    expect(new Date(row!.lastActivityAt!).getTime()).toBeGreaterThan(new Date(before!).getTime());
  });

  it('the FIRST entry of a fresh row stamps the clock (the walk truly started)', async () => {
    const res = await postStation(post({ action: 'enter', chapterSlug: CH, stationSlug: STN, stepIndex: 0 }));
    expect(res.status).toBe(200);
    const state = (await bodyOf(res)).data?.state;
    expect(state?.lastActivityAt).toBeDefined();
  });
});

describe('POST enter — expired anchor handling (server-authoritative §10)', () => {
  it('an expired in_progress anchor is DROPPED and the response reports resumeExpired', async () => {
    await plantRow(RESUME_TTL_MS + 1000); // past the 7-day edge
    const res = await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 1,
      }),
    );
    expect(res.status).toBe(200);
    const json = await bodyOf(res);
    expect(json.data?.resumeExpired).toBe(true);
    expect(json.data?.state?.currentBlock ?? null).toBeNull(); // anchor cleared
  });

  it('a FRESH anchor survives the enter untouched (no false expiry)', async () => {
    await plantRow(2 * 24 * 60 * 60 * 1000); // 2 days
    const res = await postStation(
      post({
        action: 'enter',
        chapterSlug: CH,
        stationSlug: STN,
        currentBlockId: 'blk-stn-kana-h1-card-hira-a',
        stepIndex: 1,
      }),
    );
    const json = await bodyOf(res);
    expect(json.data?.resumeExpired).toBeUndefined();
    expect(json.data?.state?.currentBlock).toBe('blk-stn-kana-h1-card-hira-a');
  });

  it('GET computes the same expiry server-side (multi-device truth)', async () => {
    await plantRow(RESUME_TTL_MS + 2000);
    const res = await getStation(get(STN));
    const json = await bodyOf(res);
    expect(json.data?.resumeExpired).toBe(true);

    // a fresh row on the SAME learner never reports expiry
    await plantRow(1000);
    const fresh = await bodyOf(await getStation(get(STN)));
    expect(fresh.data?.resumeExpired).toBeUndefined();
  });

  it('expiry NEVER touches a completed row (history is immune — §8.4)', async () => {
    await plantRow(RESUME_TTL_MS * 3, 'completed', null);
    const res = await getStation(get(STN));
    const json = await bodyOf(res);
    expect(json.data?.state?.status).toBe('completed');
    expect(json.data?.resumeExpired).toBeUndefined(); // completed ≠ resumable
  });
});

describe('complete — the terminal write (idempotent + meaningful)', () => {
  // stn-kana-h0 completes on the 'viewed' criterion (score null is valid).
  const STN0 = 'stn-kana-h0';
  it('completion clears the anchor, moves the clock, and a repeat is already:true', async () => {
    await plantRow(1000, 'in_progress', 'blk-stn-kana-h0-scene');
    // re-point the planted row at the h0 station (plantRow keys STN) — plant directly:
    const store = getStationProgressStore();
    await store.upsert(L1, STN0, {
      stationSlug: STN0,
      status: 'in_progress',
      bestScore: null,
      attemptCount: 1,
      currentBlock: 'blk-stn-kana-h0-scene',
      lastActivityAt: new Date(Date.now() - 1000).toISOString(),
    });
    const first = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: STN0, score: null, taskCompleted: true }));
    expect(first.status).toBe(200);
    const firstJson = await bodyOf(first);
    expect(firstJson.data?.state?.status).toBe('completed');
    expect(firstJson.data?.state?.currentBlock ?? null).toBeNull(); // anchor cleared

    const second = await postStation(post({ action: 'complete', chapterSlug: CH, stationSlug: STN0, score: null, taskCompleted: true }));
    const secondJson = (await second.json()) as { data?: { already?: boolean } };
    expect(secondJson.data?.already).toBe(true); // idempotent — no double reward
  });
});
