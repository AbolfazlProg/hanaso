/**
 * TASK-DLG-POC-01 — mastery API integration (route handlers called directly):
 * POST /api/attempts (validation + server-side scoring + persistence) and GET /api/attempts.
 * Also covers the /api/events sink used by the PoC pages.
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

const fullScores = { M1: 0.9, M2: 0.8, M3: 1, M4: 0.7, M5: 1 };

describe('POST /api/attempts', () => {
  it('validates and stores an attempt with server-side scoring (201)', async () => {
    const res = await postAttempt(
      post(`${BASE}/attempts`, {
        dialogueId: 'dlg-cafe-morning-01',
        scores: fullScores,
        weakPoints: [{ lineId: 's-cafe-morning-01-l4', objective: 'voc-kekkou-desu', severity: 'medium' }],
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        attempt: Record<string, unknown> & { attemptNo: number; outcome: string; weakPoints: unknown[] };
        scoring: { weightedScore: number; outcome: string; weakMeasures: string[] };
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.attempt.attemptNo).toBe(1);
    expect(body.data.attempt.outcome).toBe('passed'); // weighted ≥ 0.7, all measures ≥ 0.5
    expect(body.data.scoring.weightedScore).toBeCloseTo(
      Object.entries(fullScores).reduce(
        (acc, [m, v]) => acc + MASTERY_WEIGHTS[m as keyof typeof MASTERY_WEIGHTS]! * (v as number),
        0,
      ),
      3,
    );
    expect(body.data.attempt.weakPoints).toHaveLength(1);
  });

  it('scores a weak listener as remediate (M4 below floor)', async () => {
    const res = await postAttempt(
      post(`${BASE}/attempts`, {
        dialogueId: 'dlg-cafe-morning-01',
        scores: { M1: 0.9, M2: 0.9, M3: 0.9, M4: 0.3, M5: 0.9 }, // weighted ok, M4 < 0.5
        weakPoints: [],
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      ok: boolean;
      data: { attempt: { outcome: string; attemptNo: number }; scoring: { weakMeasures: string[] } };
    };
    expect(body.ok).toBe(true);
    expect(body.data.attempt.attemptNo).toBe(2);
    expect(body.data.attempt.outcome).toBe('remediate');
    expect(body.data.scoring.weakMeasures).toEqual(['M4']);
  });

  it('rejects invalid payloads (400 + module/cause code)', async () => {
    const badScore = await postAttempt(
      post(`${BASE}/attempts`, { dialogueId: 'dlg-x', scores: { M1: 5, M2: null, M3: null, M4: null, M5: null } }),
    );
    expect(badScore.status).toBe(400);
    const errBody = (await badScore.json()) as { ok: boolean; error: { code: string } };
    expect(errBody.ok).toBe(false);
    expect(errBody.error.code).toBe('attempts/validation_failed');

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
