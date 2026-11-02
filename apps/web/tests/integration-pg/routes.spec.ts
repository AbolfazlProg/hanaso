/**
 * TASK-M0-10 — API routes against REAL PostgreSQL 18 (Issue #11).
 *
 * The same route-handler level exercises as the in-memory suite (learning-slice /
 * mastery-api), but with DATABASE_URL set: /api/attempts persists to
 * app.dialogue_mastery_attempts, /api/progress runs the A→D machine over
 * app.lesson_progress, and /api/ready reports a REAL database check.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as getReady } from '@/app/api/ready/route';
import { GET as getAttempts, POST as postAttempt } from '@/app/api/attempts/route';
import { GET as getProgress, POST as postProgress } from '@/app/api/progress/route';
import { resetStoresForTests } from '@/lib/poc/stores';
import { getDbClient, resetDbClientForTests } from '@/db/client';
import { refreshContentMap } from '@/db/content-map';
import { ensureTestDatabase } from './helpers';

const BASE = 'http://localhost/api';
const DLG = 'dlg-cafe-morning-01';

const ALL_CORRECT: Record<string, string> = {
  'q-m1-kekkou': 'b',
  'q-m2-shoushou': 'b',
  'q-m3-wo': 'a',
  'q-m4-blind': 'b',
  'q-m5-speaker': 'a',
};

const WEAK_M4: Record<string, string> = { ...ALL_CORRECT, 'q-m4-blind': 'a' };

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
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
  await getDbClient()
    .pool.end()
    .catch(() => undefined);
});

describe('GET /api/ready (real database check)', () => {
  it('reports database ok with server version + latency', async () => {
    const body = await json<{ ok: boolean; checks: { database: { status: string; serverVersion?: string } } }>(
      await getReady(),
    );
    expect(body.ok).toBe(true);
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.database.serverVersion).toMatch(/^18\./);
  });
});

describe('POST /api/attempts → app.dialogue_mastery_attempts', () => {
  it('grades server-side and persists a passed attempt', async () => {
    const res = await postAttempt(post(`${BASE}/attempts`, { dialogueId: DLG, answers: ALL_CORRECT }));
    expect(res.status).toBe(201);
    const body = await json<{ data: { attempt: { id: string; attemptNo: number; outcome: string } } }>(res);
    expect(body.data.attempt.outcome).toBe('passed');
    expect(body.data.attempt.attemptNo).toBe(1);
    expect(body.data.attempt.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sequentially numbers a second attempt and lists via the dialogue filter', async () => {
    const res = await postAttempt(post(`${BASE}/attempts`, { dialogueId: DLG, answers: WEAK_M4 }));
    expect(res.status).toBe(201);
    const body = await json<{ data: { attempt: { attemptNo: number; outcome: string } } }>(res);
    expect(body.data.attempt.attemptNo).toBe(2);
    expect(body.data.attempt.outcome).toBe('remediate');

    const list = await json<{ data: { attempts: unknown[] } }>(
      await getAttempts(new Request(`${BASE}/attempts?dialogueId=${DLG}`)),
    );
    expect(list.data.attempts).toHaveLength(2);
  });
});

describe('POST /api/progress → app.lesson_progress (A→D over Postgres)', () => {
  it('walks A→B→C→D and gates understood on a passed attempt', async () => {
    const userId = 'route-user';
    const step = async (event: unknown) => postProgress(post(`${BASE}/progress`, { dialogueId: DLG, userId, event }));

    expect((await step({ type: 'unit_started' })).status).toBe(201);
    expect((await step({ type: 'dialogue_watched' })).status).toBe(201);
    expect((await step({ type: 'lesson_studied' })).status).toBe(201);
    expect((await step({ type: 'practice_done' })).status).toBe(201);

    // the gate: a remediate attempt must NOT open understood (DD-048)
    const weakAttempt = await json<{ data: { attempt: { id: string } } }>(
      await postAttempt(post(`${BASE}/attempts`, { dialogueId: DLG, userId, answers: WEAK_M4 })),
    );
    const refused = await step({ type: 'mastery_passed', attemptId: weakAttempt.data.attempt.id });
    expect(refused.status).toBe(400);

    const goodAttempt = await json<{ data: { attempt: { id: string } } }>(
      await postAttempt(post(`${BASE}/attempts`, { dialogueId: DLG, userId, answers: ALL_CORRECT })),
    );
    const done = await step({ type: 'mastery_passed', attemptId: goodAttempt.data.attempt.id });
    expect(done.status).toBe(201);

    const reread = await json<{ data: { progress: { status: string; masteryAttemptId: string } | null } }>(
      await getProgress(new Request(`${BASE}/progress?dialogueId=${DLG}&userId=${userId}`)),
    );
    expect(reread.data.progress?.status).toBe('understood');
    expect(reread.data.progress?.masteryAttemptId).toBe(goodAttempt.data.attempt.id);
  });
});
