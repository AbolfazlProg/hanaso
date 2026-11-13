/**
 * HANASO — practice-completion idempotency (TASK-HANASO-24 / CP-04 — BUG-036).
 *
 * In-memory suite (route-handler level, real /api/practice flow):
 *  - a duplicate complete NEVER double-folds evidence: a sequential replay 404s
 *    (the in-flight session is consumed); a concurrent replay resolves
 *    'already' — in every outcome the learning-object stats equal exactly ONE
 *    fold and the session row is written exactly once.
 *  - guest requests are rejected 401 on both GET and POST.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getPracticeStatus, POST as postPractice } from '@/app/api/practice/route';
import { getLearningObjectStore, getPracticeSessionStore, resetStoresForTests } from '@/lib/poc/stores';
import { signSessionTokenSync } from '@/lib/learner/session-node';

const BASE = 'http://localhost/api/practice';

/** A real per-browser learner id (cookie-signed). */
const QA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const QA_COOKIE = `hanaso_lid=${signSessionTokenSync(QA)}`;

beforeEach(() => {
  resetStoresForTests();
});

function post(body: unknown, cookie = QA_COOKIE): Request {
  return new Request(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  expect(res.ok).toBe(true);
  const body = (await res.json()) as { ok: boolean; data: T };
  expect(body.ok).toBe(true);
  return body.data;
}

interface ClientItem {
  id: string;
  dimension: string;
}

/** Mark h1 completed for QA (focused practice needs the station completed). */
async function completeH1ForQA(): Promise<void> {
  const { getStationProgressStore } = await import('@/lib/poc/stores');
  await getStationProgressStore().upsert(QA, 'stn-kana-h1', {
    stationSlug: 'stn-kana-h1',
    status: 'completed',
    bestScore: null,
    attemptCount: 0,
    currentBlock: null,
    lastActivityAt: new Date().toISOString(),
  });
}

/** Generate a focused session on h1 and answer every item correctly at attempt 1. */
async function generateAndAnswerAll(): Promise<{ sessionId: string; items: ClientItem[] }> {
  const gen = await json<{ sessionId: string; items: ClientItem[] }>(
    await postPractice(post({ action: 'generate', skill: 'kana', kind: 'focused', scopeKey: 'stn-kana-h1', includeWriting: false })),
  );
  expect(gen.items.length).toBeGreaterThan(0);
  for (const item of gen.items) {
    const session = await getPracticeSessionStore().get(gen.sessionId);
    expect(session).toBeTruthy();
    const item0 = session!.items.find((i) => i.id === item.id)!;
    const answer =
      item0.interaction.kind === 'choice'
        ? { kind: 'choice' as const, optionId: item0.interaction.correctOptionId }
        : { kind: 'write' as const, accepted: true };
    const res = await postPractice(post({ action: 'answer', sessionId: gen.sessionId, itemId: item.id, attemptNo: 1, answer }));
    expect(res.status).toBe(200);
  }
  return gen;
}

/** Sum of all learning-object `seen` counters for QA (the fold footprint). */
async function totalSeenForQA(): Promise<number> {
  const records = await getLearningObjectStore().listForUser(QA, 'kana');
  return records.reduce((acc, r) => {
    const stats = r.dimensionStats as Record<string, { seen: number }>;
    return acc + Object.values(stats ?? {}).reduce((a, s) => a + (s?.seen ?? 0), 0);
  }, 0);
}

describe('practice completion — idempotency + no double fold (BUG-036)', () => {
  it('a sequential replay 404s; evidence equals exactly ONE fold', async () => {
    await completeH1ForQA();
    const gen = await generateAndAnswerAll();

    const first = await postPractice(post({ action: 'complete', sessionId: gen.sessionId, items: gen.items.map((i) => ({ itemId: i.id, ms: 100 })) }));
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { data: { recorded: boolean; already?: boolean } };
    expect(firstBody.data.recorded).toBe(true);
    expect(firstBody.data.already).toBeUndefined();

    // sequential replay: the in-flight session is consumed → 404, no second fold
    const replay = await postPractice(post({ action: 'complete', sessionId: gen.sessionId, items: gen.items.map((i) => ({ itemId: i.id, ms: 100 })) }));
    expect(replay.status).toBe(404);

    // exactly one fold per item — NOT doubled by the replay
    expect(await totalSeenForQA()).toBe(gen.items.length);
    // session row written once
    const sessions = await getPracticeSessionStore().listForUser(QA, 10);
    expect(sessions.filter((s) => s.id === gen.sessionId)).toHaveLength(1);
  });

  it('a CONCURRENT duplicate complete never double-folds (already, single-folded)', async () => {
    await completeH1ForQA();
    const gen = await generateAndAnswerAll();

    const payload = {
      action: 'complete' as const,
      sessionId: gen.sessionId,
      items: gen.items.map((i) => ({ itemId: i.id, ms: 50 })),
    };
    const [a, b] = await Promise.all([postPractice(post(payload)), postPractice(post(payload))]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const [bodyA, bodyB] = (await Promise.all([a.json(), b.json()])) as [{ data: { already?: boolean } }, { data: { already?: boolean } }];
    // exactly one recorded fold + at most one idempotent 'already'
    const alreadyCount = [bodyA.data.already, bodyB.data.already].filter(Boolean).length;
    expect(alreadyCount).toBeLessThanOrEqual(1);

    // session row still exactly once; stats still exactly one fold
    const sessions = await getPracticeSessionStore().listForUser(QA, 10);
    expect(sessions.filter((s) => s.id === gen.sessionId)).toHaveLength(1);
    expect(await totalSeenForQA()).toBe(gen.items.length);
  });

  it('guest requests never touch the practice surface (401 on GET and POST)', async () => {
    const res = await postPractice(post({ action: 'generate', skill: 'kana', kind: 'focused', scopeKey: 'stn-kana-h1' }, ''));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('learner/no_identity');

    const g = await getPracticeStatus(new Request(BASE, { headers: {} }));
    expect(g.status).toBe(401);
    expect(((await g.json()) as { error: { code: string } }).error.code).toBe('learner/no_identity');
  });
});
