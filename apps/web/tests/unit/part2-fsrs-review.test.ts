/**
 * PART2-FSRS — the end-to-end review-engine contract through the REAL API
 * routes (Part-2 ج). The engine went live with the owner-pass (2026-11-19);
 * Part-2 wires the learner-facing surface. This suite proves the four owner
 * requirements over the shipped HTTP handlers (NOT the store directly):
 *
 *   ۱. card REGISTRATION — completing a kana station enrolls its kn- cards
 *  ۲. USER OWNERSHIP — cards are per-learner; learner B never sees A's queue
 *   ۳. DUE retrieval — GET /api/review/queue returns the learner's own due
 *      cards (an honest empty state before enrollment)
 *   ۴. ANSWER RECORDING — POST /api/review applies the grade, reschedules,
 *      is idempotent on clientReviewId, and refuses unknown items honestly
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST as reviewPost } from '@/app/api/review/route';
import { GET as queueGet } from '@/app/api/review/queue/route';
import { POST as stationPost } from '@/app/api/curriculum/station/route';
import { getChapter } from '@/modules/curriculum/content';
import { resetStoresForTests } from '@/lib/poc/stores';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import type { Station } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const UUID_A = 'aaaa1111-2222-4333-8444-555555555555';
const UUID_B = 'bbbb1111-2222-4333-8444-555555555555';
const cookieFor = (id: string) => `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(id)}`;
const BASE = 'http://localhost/api';

const cookieA = cookieFor(UUID_A);
const cookieB = cookieFor(UUID_B);

function stationReq(id: string, body: unknown): Request {
  return new Request(BASE + '/curriculum/station', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieFor(id) },
    body: JSON.stringify(body),
  });
}
function queueReq(id: string): Request {
  return new Request(BASE + '/review/queue?limit=50', { headers: { cookie: cookieFor(id) } });
}
function reviewReq(id: string, body: unknown): Request {
  return new Request(BASE + '/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookieFor(id) },
    body: JSON.stringify(body),
  });
}
const asJson = async (res: Response): Promise<Record<string, unknown>> => (await res.json()) as Record<string, unknown>;

const h1 = chapter.stations.find((s) => s.slug === 'stn-kana-h1')!;

/** Drive ONE graded answer for a station's first exercise block (registration
 * requires ≥1 server-graded answer before completion — the station guard). */
async function gradeFirstExercise(id: string, station: Station): Promise<void> {
  const exBlock = station.blocks.find((b) => b.kind === 'exercise') as { exerciseIds: string[] };
  const ex = chapter.exercises[exBlock.exerciseIds[0]!]!;
  const res = await stationPost(
    stationReq(id, { action: 'grade', chapterSlug: chapter.slug, stationSlug: station.slug, exerciseId: ex.id, attemptNo: 1, answer: { kind: 'option', optionId: ex.correctOptionId } }),
  );
  const json = (await asJson(res)) as { ok?: boolean };
  expect(json.ok, `grade of ${ex.id} for learner ${id}`).toBe(true);
}

beforeEach(() => {
  resetStoresForTests();
});
afterEach(() => {
  resetStoresForTests();
});

describe('PART2 ج — the review engine through the real API', () => {
  it('① the queue is honestly EMPTY before any enrollment', async () => {
    const res = await queueGet(queueReq(UUID_A));
    expect(res.status).toBe(200);
    const json = (await asJson(res)) as { ok?: boolean; data?: { status?: string; dueCount?: number; due?: unknown[] } };
    expect(json.ok).toBe(true);
    expect(json.data?.status).toBe('integrated');
    expect(json.data?.dueCount).toBe(0);
    expect(json.data?.due).toEqual([]);
  });

  it('② completing h1 registers its kana cards (registration + wave-1 inventory)', async () => {
    expect(h1.fsrsItems.length).toBeGreaterThanOrEqual(5);
    // the prerequisite h0 completes first (viewed — no exercise guard)
    await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: 'stn-kana-h0', score: null }));
    await gradeFirstExercise(UUID_A, h1);
    const done = await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: h1.slug, score: null, taskCompleted: true }));
    const doneJson = (await asJson(done)) as { ok?: boolean };
    expect(doneJson.ok).toBe(true);

    const q = (await asJson(await queueGet(queueReq(UUID_A)))) as {
      data?: { dueCount?: number; due?: { itemId: string }[] };
    };
    const ids = (q.data?.due ?? []).map((d) => d.itemId);
    for (const expected of h1.fsrsItems) expect(ids, `enrolled ${expected}`).toContain(expected);
    expect(q.data?.dueCount).toBeGreaterThanOrEqual(h1.fsrsItems.length);
  });

  it('③ ownership — learner B sees an empty queue while A sees their cards', async () => {
    await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: 'stn-kana-h0', score: null }));
    await gradeFirstExercise(UUID_A, h1);
    await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: h1.slug, score: null, taskCompleted: true }));
    const a = (await asJson(await queueGet(queueReq(UUID_A)))) as { data?: { dueCount?: number } };
    const b = (await asJson(await queueGet(queueReq(UUID_B)))) as { data?: { dueCount?: number } };
    expect(a.data?.dueCount).toBeGreaterThan(0);
    expect(b.data?.dueCount).toBe(0);
  });

  it('④ answer recording — the grade applies, reschedules, and is idempotent on clientReviewId', async () => {
    await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: 'stn-kana-h0', score: null }));
    await gradeFirstExercise(UUID_A, h1);
    await stationPost(stationReq(UUID_A, { action: 'complete', chapterSlug: chapter.slug, stationSlug: h1.slug, score: null, taskCompleted: true }));
    const q = (await asJson(await queueGet(queueReq(UUID_A)))) as { data?: { due?: { itemId: string; dueAt: string }[] } };
    const item = q.data!.due![0]!;

    const clientReviewId = 'c1111111-2222-4333-8444-555555555555';
    const first = (await asJson(await reviewPost(reviewReq(UUID_A, { reviews: [{ itemId: item.itemId, rating: 'good', clientReviewId }] })))) as {
      data?: { applied?: number; duplicate?: number; results?: { dueAfter?: string }[] };
    };
    expect(first.data?.applied).toBe(1);
    expect(first.data?.duplicate).toBe(0);
    const dueAfter = first.data?.results?.[0]?.dueAfter;
    expect(dueAfter).toBeTruthy();
    // a 'good' grade schedules the future — strictly after the old due instant
    expect(new Date(dueAfter!).getTime()).toBeGreaterThan(new Date(item.dueAt).getTime());

    // the SAME clientReviewId replays as a duplicate — never a second grade
    const replay = (await asJson(await reviewPost(reviewReq(UUID_A, { reviews: [{ itemId: item.itemId, rating: 'easy', clientReviewId }] })))) as {
      data?: { applied?: number; duplicate?: number };
    };
    expect(replay.data?.applied).toBe(0);
    expect(replay.data?.duplicate).toBe(1);
  });

  it('④-b unknown items are refused honestly (never a fake success)', async () => {
    const res = await reviewPost(
      reviewReq(UUID_A, { reviews: [{ itemId: 'kn-rec-hira-a', rating: 'good', clientReviewId: 'c2222222-2222-4333-8444-555555555555' }] }),
    );
    const json = (await asJson(res)) as { ok?: boolean; data?: { unknown_item?: number } };
    expect(json.ok).toBe(true);
    expect(json.data?.unknown_item).toBe(1);
  });
});
