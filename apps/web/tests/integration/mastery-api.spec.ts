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
import { computeMastery, MASTERY_WEIGHTS } from '@/modules/mastery';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';

/*
 * TASK-HANASO-24: the attempts/events routes now resolve identity from the
 * SIGNED hanaso_lid session token (IDOR fix) — every request carries one
 * (assertions unchanged; only the identity transport changed).
 */
const QA_UUID = '33333333-4444-5555-6666-777777777777';
const QA_COOKIE = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(QA_UUID)}`;

const BASE = 'http://localhost/api';

function post(url: string, body: unknown, raw = false): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: QA_COOKIE },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function get(url: string): Request {
  return new Request(url, { headers: { cookie: QA_COOKIE } });
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
        perQuestion: { questionId: string; correct: boolean }[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.attempt.attemptNo).toBe(1);
    expect(body.data.attempt.outcome).toBe('passed'); // 5/5 → weighted 1.0, all floors met
    expect(body.data.attempt.scores).toEqual({ M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 });
    expect(body.data.attempt.weakPoints).toHaveLength(0);
    expect(body.data.perQuestion).toHaveLength(5);
    expect(body.data.perQuestion.every((p) => p.correct)).toBe(true);
    // TASK-HANASO-24 (B-06): the answer key itself never crosses back — only correctness
    expect(JSON.stringify(body.data.perQuestion)).not.toContain('correctOptionId');
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
    const res = await getAttempts(get(`${BASE}/attempts?dialogueId=dlg-cafe-morning-01`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { attempts: { attemptNo: number; dialogueId: string }[] } };
    expect(body.ok).toBe(true);
    expect(body.data.attempts.length).toBeGreaterThanOrEqual(2);
    expect(body.data.attempts.map((a) => a.attemptNo)).toEqual([1, 2]); // insertion order (in-memory PoC repo)
    expect(body.data.attempts.every((a) => a.dialogueId === 'dlg-cafe-morning-01')).toBe(true);

    const other = await getAttempts(get(`${BASE}/attempts?dialogueId=dlg-none`));
    const otherBody = (await other.json()) as { data: { attempts: unknown[] } };
    expect(otherBody.data.attempts).toHaveLength(0);
  });
});

describe('computeMastery (thresholds injected from level policy — TASK-LEARNING-04 #110)', () => {
  it('the PoC/dialogue path uses the L2 policy gate (0.70/0.50) — the LEVEL_MATRIX §۶ L2–L3 band', () => {
    const l2Gate = LEVELS_BY_CODE['L2']!.caps.gate;
    expect(l2Gate).toEqual({ weighted: 0.7, minMeasure: 0.5 });
    expect(
      MASTERY_WEIGHTS.M1 + MASTERY_WEIGHTS.M2 + MASTERY_WEIGHTS.M3 + MASTERY_WEIGHTS.M4 + MASTERY_WEIGHTS.M5,
    ).toBeCloseTo(1, 10);
  });

  it('unassessed measures make the attempt incomplete (the D-gate needs all five)', () => {
    const result = computeMastery({ M1: 1, M2: null, M3: 1, M4: 1, M5: 1 }, LEVELS_BY_CODE['L2']!.caps.gate);
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

    const list = await getEvents(new Request(`${BASE}/events`, { headers: { cookie: QA_COOKIE } }));
    const listBody = (await list.json()) as { data: { total: number; events: { name: string }[] } };
    expect(listBody.data.total).toBeGreaterThanOrEqual(1);
    expect(listBody.data.events.some((e) => e.name === 'dialogue_line_replayed')).toBe(true);
  });

  it('TASK-HANASO-24 (A-04): event props are BOUNDED — oversized payloads are rejected', async () => {
    // 17 keys > the 16-key bound
    const tooManyKeys: Record<string, unknown> = {};
    for (let i = 0; i < 17; i += 1) tooManyKeys[`k${i}`] = 'x';
    const many = await postEvent(post(`${BASE}/events`, { name: 'dialogue_line_replayed', props: tooManyKeys }));
    expect(many.status).toBe(400);

    // > 4KB serialized in a single value
    const huge = await postEvent(post(`${BASE}/events`, { name: 'dialogue_line_replayed', props: { blob: 'x'.repeat(8192) } }));
    expect(huge.status).toBe(400);

    // the legit shape still passes (17-key/4KB bounds are far above real events)
    const ok2 = await postEvent(post(`${BASE}/events`, { name: 'line_replayed', props: { line_index: 1 } }));
    expect(ok2.status).toBe(201);
  });

  it('TASK-HANASO-24 (B-05): events GET requires an identity and lists ONLY the caller-own events', async () => {
    const anon = await getEvents(new Request(`${BASE}/events`));
    expect(anon.status).toBe(401);
    expect(((await anon.json()) as { error: { code: string } }).error.code).toBe('learner/no_identity');

    // caller-scoped listing: the ring carries THIS caller's events, never others'
    const own = await getEvents(new Request(`${BASE}/events`, { headers: { cookie: QA_COOKIE } }));
    expect(own.status).toBe(200);
    const ownBody = (await own.json()) as { data: { events: { name: string; props: Record<string, unknown> }[] } };
    expect(ownBody.data.events.length).toBeGreaterThan(0);
    expect(ownBody.data.events.every((e) => !('user_id' in e.props))).toBe(true);
  });
});
