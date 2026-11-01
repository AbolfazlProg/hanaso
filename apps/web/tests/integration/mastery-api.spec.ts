/**
 * TASK-DLG-POC-01 — mastery API integration (route handlers called directly):
 * POST /api/attempts (raw-answer submission + SERVER-side grading + persistence)
 * and GET /api/attempts. Also covers the /api/events sink used by the PoC pages.
 *
 * TASK-SLICE-01 remediation (review F1/S1): the answer key never leaves the
 * server — clients POST { dialogueId, answers } and grading happens in the route.
 */
import { describe, expect, it } from 'vitest';
import { GET as getAttempts, POST as postAttempt } from '@/app/api/attempts/route';
import { GET as getEvents, POST as postEvent } from '@/app/api/events/route';
import { computeMastery, MASTERY_THRESHOLDS, MASTERY_WEIGHTS } from '@/modules/mastery';

const BASE = 'http://localhost/api';

function post(url: string, body: unknown, raw = false): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

/** The 5-question cafe bank (answers the SERVER grades against — client never sees these). */
const ALL_CORRECT: Record<string, string> = {
  'q-m1-kekkou': 'b',
  'q-m2-shoushou': 'b',
  'q-m3-wo': 'a',
  'q-m4-blind': 'b',
  'q-m5-speaker': 'a',
};

describe('POST /api/attempts', () => {
  it('grades RAW ANSWERS server-side and stores a passed attempt (201)', async () => {
    const res = await postAttempt(
      post(`${BASE}/attempts`, { dialogueId: 'dlg-cafe-morning-01', answers: ALL_CORRECT }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        attempt: {
          attemptNo: number;
          outcome: string;
          scores: Record<string, number | null>;
          weakPoints: unknown[];
        };
        scoring: { weightedScore: number; outcome: string; weakMeasures: string[] };
        perQuestion: { questionId: string; correct: boolean; correctOptionId: string }[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.attempt.attemptNo).toBe(1);
    expect(body.data.attempt.outcome).toBe('passed'); // 5/5 → weighted 1.0, all floors met
    expect(body.data.attempt.scores).toEqual({ M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 });
    expect(body.data.attempt.weakPoints).toHaveLength(0);
    expect(body.data.perQuestion).toHaveLength(5);
    expect(body.data.perQuestion.every((p) => p.correct)).toBe(true);
  });

  it('grades a missed listening question as remediate (M4 below floor)', async () => {
    const answers = { ...ALL_CORRECT, 'q-m4-blind': 'a' }; // only M4 wrong
    const res = await postAttempt(post(`${BASE}/attempts`, { dialogueId: 'dlg-cafe-morning-01', answers }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        attempt: { outcome: string; attemptNo: number; weakPoints: { objective: string; lineId: string }[] };
        scoring: { weakMeasures: string[] };
        perQuestion: { questionId: string; correct: boolean }[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.attempt.attemptNo).toBe(2);
    expect(body.data.attempt.outcome).toBe('remediate'); // M4 = 0 < 0.5 floor
    expect(body.data.scoring.weakMeasures).toEqual(['M4']);
    expect(body.data.attempt.weakPoints).toHaveLength(1);
    expect(body.data.attempt.weakPoints[0]?.objective).toBe('listening-comprehension');
    expect(body.data.perQuestion.find((p) => p.questionId === 'q-m4-blind')?.correct).toBe(false);
  });

  it('rejects invalid payloads with typed codes (400)', async () => {
    // legacy/client-computed scores are NO LONGER accepted — raw answers only
    const legacyScores = await postAttempt(
      post(`${BASE}/attempts`, { dialogueId: 'dlg-x', scores: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 } }),
    );
    expect(legacyScores.status).toBe(400);
    const legacyBody = (await legacyScores.json()) as { error: { code: string } };
    expect(legacyBody.error.code).toBe('attempts/validation_failed');

    // unknown question ids
    const unknown = await postAttempt(
      post(`${BASE}/attempts`, { dialogueId: 'dlg-cafe-morning-01', answers: { 'q-hacker': 'a' } }),
    );
    expect(unknown.status).toBe(400);
    const unknownBody = (await unknown.json()) as { error: { code: string } };
    expect(unknownBody.error.code).toBe('attempts/unknown_question');

    // incomplete submissions
    const partial = { ...ALL_CORRECT } as Record<string, string>;
    delete partial['q-m3-wo'];
    const incomplete = await postAttempt(
      post(`${BASE}/attempts`, { dialogueId: 'dlg-cafe-morning-01', answers: partial }),
    );
    expect(incomplete.status).toBe(400);
    const incompleteBody = (await incomplete.json()) as { error: { code: string } };
    expect(incompleteBody.error.code).toBe('attempts/incomplete');

    const badJson = await postAttempt(post(`${BASE}/attempts`, '{not-json', true));
    expect(badJson.status).toBe(400);
    const errJson = (await badJson.json()) as { error: { code: string } };
    expect(errJson.error.code).toBe('attempts/invalid_json');
  });
});

describe('GET /api/attempts', () => {
  it('lists stored attempts (optionally filtered by dialogueId)', async () => {
    const res = await getAttempts(new Request(`${BASE}/attempts?dialogueId=dlg-cafe-morning-01`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { attempts: { attemptNo: number; dialogueId: string }[] } };
    expect(body.ok).toBe(true);
    expect(body.data.attempts.length).toBeGreaterThanOrEqual(2);
    expect(body.data.attempts.map((a) => a.attemptNo)).toEqual([1, 2]); // insertion order (in-memory PoC repo)
    expect(body.data.attempts.every((a) => a.dialogueId === 'dlg-cafe-morning-01')).toBe(true);

    const other = await getAttempts(new Request(`${BASE}/attempts?dialogueId=dlg-none`));
    const otherBody = (await other.json()) as { data: { attempts: unknown[] } };
    expect(otherBody.data.attempts).toHaveLength(0);
  });
});

describe('computeMastery (scoring constants — DD-048 provisional)', () => {
  it('stage2 thresholds: weighted 0.70, per-measure floor 0.50', () => {
    expect(MASTERY_THRESHOLDS.stage2).toEqual({ weighted: 0.7, minMeasure: 0.5 });
    expect(
      MASTERY_WEIGHTS.M1 + MASTERY_WEIGHTS.M2 + MASTERY_WEIGHTS.M3 + MASTERY_WEIGHTS.M4 + MASTERY_WEIGHTS.M5,
    ).toBeCloseTo(1, 10);
  });

  it('unassessed measures make the attempt incomplete (the D-gate needs all five)', () => {
    const result = computeMastery({ M1: 1, M2: null, M3: 1, M4: 1, M5: 1 });
    expect(result.outcome).toBe('incomplete');
    expect(result.unassessed).toEqual(['M2']);
  });
});

describe('POST/GET /api/events (PoC analytics sink)', () => {
  it('records object_action events and rejects malformed names', async () => {
    const ok = await postEvent(post(`${BASE}/events`, { name: 'dialogue_line_replayed', props: { line_index: 3 } }));
    expect(ok.status).toBe(201);
    const okBody = (await ok.json()) as { ok: boolean; data: { recorded: boolean; total: number } };
    expect(okBody.data.recorded).toBe(true);

    const bad = await postEvent(post(`${BASE}/events`, { name: 'NotSnakeCase', props: {} }));
    expect(bad.status).toBe(400);
    const badBody = (await bad.json()) as { error: { code: string } };
    expect(badBody.error.code).toBe('events/validation_failed');

    const list = await getEvents();
    const listBody = (await list.json()) as { data: { total: number; events: { name: string }[] } };
    expect(listBody.data.total).toBeGreaterThanOrEqual(1);
    expect(listBody.data.events.some((e) => e.name === 'dialogue_line_replayed')).toBe(true);
  });
});
