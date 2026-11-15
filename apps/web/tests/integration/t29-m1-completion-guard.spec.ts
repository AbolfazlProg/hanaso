/**
 * TASK-HANASO-29 — Subagent B M1 regression: completion requires a
 * server-witnessed graded answer for stations with exercise blocks.
 *
 * Before: the `complete` action trusted the client-attested score/taskCompleted
 * with no reconciliation against server-graded answers — a tampered client
 * could complete an exercise station without answering anything.
 *
 * After: stations that carry exercise blocks (all kana lessons + the 4 practice
 * stations) also require attemptCount > 0 — the counter the `grade` action
 * (and only it) increments. Stations WITHOUT exercise blocks (pure
 * teaching/dialogue — chapter 2 style) are unaffected.
 *
 * Same direct route-handler harness as h25-hint-action.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { POST as stationPost } from '@/app/api/curriculum/station/route';
import { getChapter } from '@/modules/curriculum/content';
import { getStationProgressStore } from '@/lib/poc/stores';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';

const QA_UUID = '33333333-4444-5555-6666-777777777777';
const QA_COOKIE = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(QA_UUID)}`;
const BASE = 'http://localhost/api';

function post(body: unknown): Request {
  return new Request(BASE + '/curriculum/station', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: QA_COOKIE },
    body: JSON.stringify(body),
  });
}

const ch1 = getChapter('kana-foundation-01')!;
/** h1 has 5 exercise blocks + task_completed criterion — the guard's target. */
const h1 = ch1.stations.find((s) => s.slug === 'stn-kana-h1')!;
const h1ExerciseBlock = h1.blocks.find((b) => b.kind === 'exercise') as { exerciseIds: string[] };
const h1FirstExercise = ch1.exercises[h1ExerciseBlock.exerciseIds[0]!]!;

/** A pure-teaching station of chapter 1 (h0 — viewed criterion, no exercises). */
const h0 = ch1.stations.find((s) => s.slug === 'stn-kana-h0')!;

/** Complete h0 (h1's prerequisite) for the QA learner — the honest walk order. */
async function completeH0(): Promise<void> {
  const store = getStationProgressStore();
  await store.upsert(QA_UUID, h0.slug, {
    stationSlug: h0.slug,
    status: 'in_progress',
    bestScore: null,
    attemptCount: 0,
  });
  const res = await stationPost(
    post({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: h0.slug, score: null }),
  );
  expect(res.status).toBe(200);
}

describe('TASK-HANASO-29 M1 — completion needs a server-witnessed graded answer', () => {
  it('NEGATIVE: complete an exercise station with ZERO graded answers → 409 no_graded_answers', async () => {
    await completeH0(); // satisfy h1's prerequisite first (honest walk order)
    const store = getStationProgressStore();
    await store.upsert(QA_UUID, h1.slug, {
      stationSlug: h1.slug,
      status: 'in_progress',
      bestScore: null,
      attemptCount: 0, // no grade ever fired for this learner+station
    });
    const res = await stationPost(
      post({
        action: 'complete',
        chapterSlug: 'kana-foundation-01',
        stationSlug: h1.slug,
        score: 1, // forged perfect score
        taskCompleted: true, // forged task flag
      }),
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('station/no_graded_answers');
    // and the station is NOT completed in the store
    const state = await store.get(QA_UUID, h1.slug);
    expect(state?.status).not.toBe('completed');
  });

  it('POSITIVE: one real grade round-trip unlocks the completion (honest walk passes)', async () => {
    await completeH0(); // satisfy h1's prerequisite first (honest walk order)
    const store = getStationProgressStore();
    await store.upsert(QA_UUID, h1.slug, {
      stationSlug: h1.slug,
      status: 'in_progress',
      bestScore: null,
      attemptCount: 0,
    });
    // the learner answers the first exercise correctly through the REAL grade action
    const gradeRes = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: h1.slug,
        exerciseId: h1FirstExercise.id,
        attemptNo: 1,
        answer: { kind: 'option', optionId: h1FirstExercise.correctOptionId! },
      }),
    );
    expect(gradeRes.status).toBe(200);
    const completeRes = await stationPost(
      post({
        action: 'complete',
        chapterSlug: 'kana-foundation-01',
        stationSlug: h1.slug,
        score: 1,
        taskCompleted: true,
      }),
    );
    expect(completeRes.status).toBe(200);
    const json = (await completeRes.json()) as { data?: { state?: { status?: string } } };
    expect(json.data?.state?.status).toBe('completed');
  });

  it('UNAFFECTED: exercise-free stations (h0, viewed criterion) complete without any grade', async () => {
    const store = getStationProgressStore();
    await store.upsert(QA_UUID, h0.slug, {
      stationSlug: h0.slug,
      status: 'in_progress',
      bestScore: null,
      attemptCount: 0,
    });
    const res = await stationPost(
      post({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: h0.slug, score: null }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data?: { state?: { status?: string } } };
    expect(json.data?.state?.status).toBe('completed');
  });
});
