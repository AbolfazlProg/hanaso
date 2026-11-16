/**
 * TASK-HANASO-27 — integrated-practice integration tests.
 *
 * Practice now runs INSIDE the learning journey (stn-kana-p1..p4) through the
 * ONE station engine. These tests pin the integration contract:
 *   1. /api/practice GET status is healthy (the hub surface) and reports the
 *      practice stations; the POST session engine is GONE (405).
 *   2. Completing a practice station is IDEMPOTENT through the station API
 *      (sequential replay + concurrent duplicate → `already`, single fold).
 *   3. Prerequisite truth: stn-kana-p1 stays locked until stn-kana-h5 is
 *      completed (server rejects completion of a locked practice station).
 *   4. Learner isolation: one learner's practice completion never appears in
 *      another learner's status.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getPracticeStatus } from '@/app/api/practice/route';
import { POST as postStation, GET as getStation } from '@/app/api/curriculum/station/route';
import { resetStoresForTests } from '@/lib/poc/stores';
import { firstExerciseOf } from '../helpers/grade-first';
import { signSessionTokenSync } from '@/lib/learner/session-node';

const BASE = 'http://localhost/api/practice';
const CH = 'kana-foundation-01';

/** Real per-browser learner ids (cookie-signed). */
const QA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const QB = '11111111-2222-4333-8444-555555555555';
const QA_COOKIE = `hanaso_lid=${signSessionTokenSync(QA)}`;
const QB_COOKIE = `hanaso_lid=${signSessionTokenSync(QB)}`;

beforeEach(() => {
  resetStoresForTests();
});

function get(cookie: string = QA_COOKIE): Request {
  return new Request(BASE, { headers: { cookie } });
}
function stationPost(body: unknown, cookie: string = QA_COOKIE): Request {
  return new Request('http://localhost/api/curriculum/station', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}
async function statusBody(res: Response): Promise<Record<string, unknown>> {
  const json = (await res.json()) as { ok: boolean; data?: Record<string, unknown> };
  expect(json.ok).toBe(true);
  return json.data ?? {};
}

/** Walk the prerequisite chain honestly (each station completes → next unlocks).
 * h0 completes by VIEWING (viewed criterion); h1+ are task_completed → the
 * payload must carry taskCompleted: true (same as the real runner sends). */
async function completeChain(learnerCookie: string, slugs: string[]) {
  for (const slug of slugs) {
    /* TASK-29 M1: stations with exercise blocks need one server-graded answer
     * before `complete` (the completion guard) — the honest walk shape. */
    const first = firstExerciseOf(slug);
    if (first) {
      const graded = await postStation(
        stationPost(
          {
            action: 'grade',
            chapterSlug: CH,
            stationSlug: slug,
            exerciseId: first.exerciseId,
            attemptNo: 1,
            answer: { kind: 'option', optionId: first.correctOptionId },
          },
          learnerCookie,
        ),
      );
      expect(graded.status, `grade ${slug}`).toBe(200);
    }
    const res = await postStation(
      stationPost(
        { action: 'complete', chapterSlug: CH, stationSlug: slug, score: 1, taskCompleted: true },
        learnerCookie,
      ),
    );
    expect(res.status, `prereq complete ${slug}`).toBe(200);
  }
}

describe('TASK-27 — the /practice hub surface (status-only)', () => {
  it('GET status reports the integrated practice stations (journey links)', async () => {
    const res = await getPracticeStatus(get());
    expect(res.status).toBe(200);
    const data = await statusBody(res);
    const stations = data.practiceStations as { stationSlug: string; href: string; completed: boolean }[];
    expect(stations.map((s) => s.stationSlug)).toEqual(['stn-kana-p1', 'stn-kana-p2', 'stn-kana-p3', 'stn-kana-p4']);
    for (const s of stations) {
      expect(s.href.startsWith('/learn/kana-foundation-01/journey/stn-kana-p')).toBe(true);
    }
  });

  it('the parallel session engine is retired: the route module exports GET only (no POST handler)', async () => {
    // architectural assertion: the generate/answer/complete surface is gone.
    const route = await import('@/app/api/practice/route');
    expect(typeof route.GET).toBe('function');
    expect('POST' in route).toBe(false);
  });

  it('guest (unsigned cookie) never reaches the practice surface', async () => {
    const res = await getPracticeStatus(new Request(BASE, { headers: { cookie: 'hanaso_lid=unsigned' } }));
    expect(res.status).toBe(401);
  });
});

describe('TASK-27 — practice-station completion via the ONE station engine', () => {
  it('p1 completes only after its prerequisite h5; sequential replay is idempotent (already)', async () => {
    // completing p1 while locked → 409 with the prerequisite list
    const locked = await postStation(stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1' }));
    expect(locked.status).toBe(409);

    await completeChain(QA_COOKIE, [
      'stn-kana-h0',
      'stn-kana-h1',
      'stn-kana-h2',
      'stn-kana-h3',
      'stn-kana-h4',
      'stn-kana-h5',
    ]);

    /* TASK-29 M1: p1 carries exercise blocks — one honest grade first. */
    const p1First = firstExerciseOf('stn-kana-p1')!;
    const p1Graded = await postStation(
      stationPost({
        action: 'grade',
        chapterSlug: CH,
        stationSlug: 'stn-kana-p1',
        exerciseId: p1First.exerciseId,
        attemptNo: 1,
        answer: { kind: 'option', optionId: p1First.correctOptionId },
      }),
    );
    expect(p1Graded.status).toBe(200);
    const first = await postStation(
      stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1', score: 1, taskCompleted: true }),
    );
    expect(first.status).toBe(200);

    // sequential replay → already, never re-registered
    const replay = await postStation(
      stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1', score: 1, taskCompleted: true }),
    );
    expect(replay.status).toBe(200);
    const body2 = (await replay.json()) as { data?: { already?: boolean } };
    expect(body2.data?.already).toBe(true);

    // the hub now reports p1 completed
    const status = await statusBody(await getPracticeStatus(get()));
    const p1 = (status.practiceStations as { stationSlug: string; completed: boolean }[]).find(
      (s) => s.stationSlug === 'stn-kana-p1',
    )!;
    expect(p1.completed).toBe(true);
  });

  it('a CONCURRENT duplicate complete never double-registers (single completion state)', async () => {
    await completeChain(QA_COOKIE, [
      'stn-kana-h0',
      'stn-kana-h1',
      'stn-kana-h2',
      'stn-kana-h3',
      'stn-kana-h4',
      'stn-kana-h5',
    ]);
    /* TASK-29 M1: p1 carries exercise blocks — one honest grade before the race. */
    const p1First = firstExerciseOf('stn-kana-p1')!;
    const p1Graded = await postStation(
      stationPost({
        action: 'grade',
        chapterSlug: CH,
        stationSlug: 'stn-kana-p1',
        exerciseId: p1First.exerciseId,
        attemptNo: 1,
        answer: { kind: 'option', optionId: p1First.correctOptionId },
      }),
    );
    expect(p1Graded.status).toBe(200);
    const [a, b] = await Promise.all([
      postStation(
        stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1', score: 1, taskCompleted: true }),
      ),
      postStation(
        stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1', score: 1, taskCompleted: true }),
      ),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const states = await Promise.all([a, b].map(async (r) => (await r.json()) as { data?: { already?: boolean } }));
    // at most one idempotent 'already' among the two raced responses
    const alreadyCount = states.filter((s) => s.data?.already).length;
    expect(alreadyCount).toBeLessThanOrEqual(1);

    // the walk store settles on exactly ONE completed state for p1 (the row
    // is an upsert keyed uuidV5('lesson:stn-kana-p1') — never duplicated)
    const getRes = await getStation(
      new Request(`http://localhost/api/curriculum/station?chapter=${CH}&station=stn-kana-p1`, {
        headers: { cookie: QA_COOKIE },
      }),
    );
    const getBody = (await getRes.json()) as { data?: { state?: { status?: string } } };
    expect(getBody.data?.state?.status).toBe('completed');
  });

  it('learner isolation: QB never sees QA’s practice progress', async () => {
    await completeChain(QA_COOKIE, [
      'stn-kana-h0',
      'stn-kana-h1',
      'stn-kana-h2',
      'stn-kana-h3',
      'stn-kana-h4',
      'stn-kana-h5',
    ]);
    await postStation(
      stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1', score: 1, taskCompleted: true }),
    );

    const qbStatus = await statusBody(await getPracticeStatus(get(QB_COOKIE)));
    const p1 = (qbStatus.practiceStations as { stationSlug: string; completed: boolean }[]).find(
      (s) => s.stationSlug === 'stn-kana-p1',
    )!;
    expect(p1.completed).toBe(false);

    // QB cannot complete p1 either (their own walk is empty → locked)
    const qbTry = await postStation(
      stationPost({ action: 'complete', chapterSlug: CH, stationSlug: 'stn-kana-p1' }, QB_COOKIE),
    );
    expect(qbTry.status).toBe(409);
  });
});
