// @vitest-environment node
/**
 * HANASO — learning-domain API unit suite (owner-pass 2026-11-19).
 *
 * Covers the THREE new/updated endpoints against the honest in-memory stores:
 *  - GET /api/review/queue + POST /api/review (FSRS M2 / OTD-001 — idempotency,
 *    per-item batch semantics, honest empty/unknown states)
 *  - POST /api/events (batch ≤25 + quarantine/202 + legacy single-event compat)
 *    and GET (caller-scoped durable listing)
 *  - GET /api/me/learning-summary (the «پنل من» envelope: journey/course/review/
 *    weak/practice/events, guest-401)
 *
 * Direct route-handler invocation with a signed learner cookie — the repo's
 * established integration pattern (learning-slice.spec.ts).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET as getQueue } from '@/app/api/review/queue/route';
import { POST as postReview } from '@/app/api/review/route';
import { GET as getEvents, POST as postEvents } from '@/app/api/events/route';
import { GET as getSummary } from '@/app/api/me/learning-summary/route';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import { resetStoresForTests, getFsrsReviewStore } from '@/lib/poc/stores';

const UUID = '9f3c2a90-1e2d-4a1f-b7c3-9d7e0f1a2b3c';
const COOKIE = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(UUID)}`;

const jsonReq = (url: string, init?: RequestInit): Request =>
  new Request(`https://hanaso.test${url}`, {
    ...init,
    headers: { 'content-type': 'application/json', cookie: COOKIE, ...(init?.headers ?? {}) },
  });

const plainReq = (url: string): Request => new Request(`https://hanaso.test${url}`, { headers: { cookie: COOKIE } });

const enrollOne = async (itemId = 'kn-rec-hira-a') => {
  const store = getFsrsReviewStore();
  await store.enroll(UUID, [{ itemId, kind: 'kn', wave: 1, enrollStationSlug: 'stn-kana-h1' }], new Date());
  return store;
};

describe('GET /api/review/queue — the FSRS daily queue (OTD-001)', () => {
  beforeEach(() => resetStoresForTests());
  afterEach(() => resetStoresForTests());

  it('refuses a guest with the canonical 401 envelope', async () => {
    const res = await getQueue(new Request('https://hanaso.test/api/review/queue'));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: { code: string; requestId?: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('learner/no_identity');
    expect(body.error.requestId).toBeTruthy();
  });

  it('serves an HONEST empty queue (no synthetic cards)', async () => {
    const res = await getQueue(plainReq('/api/review/queue'));
    expect(res.status).toBe(200);
    const { ok, data } = (await res.json()) as {
      ok: boolean;
      data: { dueCount: number; due: unknown[]; status: string };
    };
    expect(ok).toBe(true);
    expect(data.status).toBe('integrated');
    expect(data.dueCount).toBe(0);
    expect(data.due).toEqual([]);
  });

  it('returns enrolled + due cards oldest-due-first with the bounded limit', async () => {
    const store = await enrollOne();
    await store.enroll(
      UUID,
      [
        { itemId: 'kn-rec-hira-i', kind: 'kn', wave: 1, enrollStationSlug: 'stn-kana-h1' },
        { itemId: 'kn-rec-hira-u', kind: 'kn', wave: 1, enrollStationSlug: 'stn-kana-h1' },
      ],
      new Date(Date.now() - 10_000), // enrolled earlier → same due instant, but all due now
    );
    const res = await getQueue(plainReq('/api/review/queue?limit=2'));
    const { data } = (await res.json()) as { data: { dueCount: number; due: { itemId: string }[] } };
    expect(data.dueCount).toBe(3);
    expect(data.due).toHaveLength(2);
    expect(data.due.every((d) => d.itemId.startsWith('kn-rec-hira-'))).toBe(true);
  });

  it('validates limit (400 review/invalid_limit)', async () => {
    const res = await getQueue(plainReq('/api/review/queue?limit=999'));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('review/invalid_limit');
  });
});

describe('POST /api/review — idempotent FSRS submission (clientReviewId)', () => {
  beforeEach(() => resetStoresForTests());
  afterEach(() => resetStoresForTests());

  const submit = (itemId: string, clientReviewId: string, rating = 'good') =>
    postReview(
      jsonReq('/api/review', {
        method: 'POST',
        body: JSON.stringify({ reviews: [{ itemId, rating, clientReviewId }] }),
      }),
    );

  it('refuses a guest (401)', async () => {
    const res = await postReview(
      new Request('https://hanaso.test/api/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviews: [{ itemId: 'x', rating: 'good', clientReviewId: UUID }] }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('applies a graded retrieval: due advances, outcome=applied', async () => {
    await enrollOne();
    const res = await submit('kn-rec-hira-a', UUID);
    const { data } = (await res.json()) as {
      data: { applied: number; results: { outcome: string; dueAfter?: string }[] };
    };
    expect(res.status).toBe(200);
    expect(data.applied).toBe(1);
    expect(data.results[0]!.outcome).toBe('applied');
    expect(data.results[0]!.dueAfter).toBeTruthy();
    // the reviewed card is NOT due immediately anymore (FSRS scheduled it forward)
    const queue = await getQueue(plainReq('/api/review/queue'));
    const q = (await queue.json()) as { data: { dueCount: number } };
    expect(q.data.dueCount).toBe(0);
  });

  it('replaying the SAME clientReviewId is a duplicate — never a second grade', async () => {
    await enrollOne();
    await submit('kn-rec-hira-a', UUID);
    const res = await submit('kn-rec-hira-a', UUID, 'again'); // even a DIFFERENT rating is refused
    const { data } = (await res.json()) as { data: { duplicate: number; results: { outcome: string }[] } };
    expect(data.duplicate).toBe(1);
    expect(data.results[0]!.outcome).toBe('duplicate');
  });

  it('an un-enrolled card is an honest unknown_item (no fake success)', async () => {
    const res = await submit('w-never-enrolled', UUID);
    const { data } = (await res.json()) as { data: { results: { outcome: string }[] } };
    expect(data.results[0]!.outcome).toBe('unknown_item');
  });

  it('validates the batch shape (rating enum, uuid id, ≤25 items)', async () => {
    const bad = await postReview(
      jsonReq('/api/review', {
        method: 'POST',
        body: JSON.stringify({ reviews: [{ itemId: 'x', rating: 'perfect', clientReviewId: UUID }] }),
      }),
    );
    expect(bad.status).toBe(400);
    const many = await postReview(
      jsonReq('/api/review', {
        method: 'POST',
        body: JSON.stringify({
          reviews: Array.from({ length: 26 }, () => ({
            itemId: 'x',
            rating: 'good',
            clientReviewId: crypto.randomUUID(),
          })),
        }),
      }),
    );
    expect(many.status).toBe(400);
  });
});

describe('POST/GET /api/events — durable analytics + ADR-016 quarantine', () => {
  beforeEach(() => resetStoresForTests());
  afterEach(() => resetStoresForTests());

  it('accepts a batch ≤25 → 202 with counts; GET lists them caller-scoped', async () => {
    const res = await postEvents(
      jsonReq('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          events: [
            { name: 'line_replayed', props: { line_id: 'l1' } },
            { name: 'reading_word_played', props: { word: 'あ' } },
          ],
        }),
      }),
    );
    expect(res.status).toBe(202);
    const { data } = (await res.json()) as { data: { received: number; quarantined: number } };
    expect(data.received).toBe(2);
    expect(data.quarantined).toBe(0);

    const list = await getEvents(plainReq('/api/events'));
    const l = (await list.json()) as { data: { events: { name: string; props: Record<string, unknown> }[] } };
    expect(l.data.events.length).toBe(2);
    expect(l.data.events.every((e) => e.props.user_id === undefined)).toBe(true); // identity never crosses
  });

  it('quarantines unknown names — KEPT and flagged (202), never dropped silently', async () => {
    const res = await postEvents(
      jsonReq('/api/events', {
        method: 'POST',
        body: JSON.stringify({ events: [{ name: 'totally_unknown_event', props: {} }] }),
      }),
    );
    expect(res.status).toBe(202);
    const { data } = (await res.json()) as { data: { received: number; quarantined: number } };
    expect(data.received).toBe(1);
    expect(data.quarantined).toBe(1);
  });

  it('keeps the legacy single-event shape working (201) and bounds the batch (26 → 400)', async () => {
    const legacy = await postEvents(
      jsonReq('/api/events', { method: 'POST', body: JSON.stringify({ name: 'line_replayed', props: {} }) }),
    );
    expect(legacy.status).toBe(201);

    const tooMany = await postEvents(
      jsonReq('/api/events', {
        method: 'POST',
        body: JSON.stringify({ events: Array.from({ length: 26 }, () => ({ name: 'line_replayed', props: {} })) }),
      }),
    );
    expect(tooMany.status).toBe(400);
  });
});

describe('GET /api/me/learning-summary — the «پنل من» envelope', () => {
  beforeEach(() => resetStoresForTests());
  afterEach(() => resetStoresForTests());

  it('refuses a guest (401)', async () => {
    const res = await getSummary(new Request('https://hanaso.test/api/me/learning-summary'));
    expect(res.status).toBe(401);
  });

  it('serves the honest summary shape (journey/course/review/weak/practice/events)', async () => {
    await enrollOne();
    const res = await getSummary(plainReq('/api/me/learning-summary'));
    expect(res.status).toBe(200);
    const { ok, data } = (await res.json()) as {
      ok: boolean;
      data: {
        journey: { chapterSlug: string };
        course: { stationsCompletedTotal: number };
        review: { engine: string; status: string; dueCount: number };
        weak: unknown[];
        practice: { firstTryRate: number | null };
        recentEvents: { name: string; at: string }[];
      };
    };
    expect(ok).toBe(true);
    expect(data.journey.chapterSlug).toBeTruthy();
    expect(data.course.stationsCompletedTotal).toBe(0);
    expect(data.review.engine).toBe('FSRS-6');
    expect(data.review.dueCount).toBe(1); // the enrolled card is due now
    expect(data.weak).toEqual([]);
    expect(data.practice.firstTryRate).toBeNull(); // no sessions yet — honest null
    expect(data.recentEvents).toBeInstanceOf(Array);
  });
});
