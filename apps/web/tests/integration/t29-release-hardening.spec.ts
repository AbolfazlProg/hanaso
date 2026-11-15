/**
 * TASK-HANASO-29 — Subagent A F1 + F2 regression (release hardening).
 *
 * F2 (grade station-scope): the `grade` action now validates the SAME station
 * scope as `hint` — the exercise must be a practice item of the POSTED station
 * (one of its blocks references it). Before the fix, grading an exercise that
 * belonged to a DIFFERENT station of the same chapter was accepted and its
 * attempt counter landed on the posted station (validation inconsistency
 * between hint and grade; not a key leak — grading is server-side either way).
 *
 * F1 (no dead /review link): the home «due» review card must never render a
 * clickable link to a route that does not exist. The FSRS engine is NOT
 * integrated (honest state), so this is pinned at the source level: the home
 * page contains no `href="/review"` and no `reviewCta` message key; the due
 * branch renders an honest non-clickable notice message instead.
 *
 * Same direct route-handler harness as h25-hint-action.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POST as stationPost } from '@/app/api/curriculum/station/route';
import { getChapter } from '@/modules/curriculum/content';
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
/** A real practice exercise + the station that owns it (h1 recognition a). */
const ex = ch1.exercises['ex-kana-h1-rec-hira-a']!;
const stn = ch1.stations.find((s) =>
  (s.blocks as unknown as Array<{ exerciseIds?: string[] }>).some((b) => b.exerciseIds?.includes(ex.id)),
)!;

describe('TASK-HANASO-29 F2 — grade action is station-scoped like hint', () => {
  it('grades a station\'s OWN practice exercise (positive control — unchanged behavior)', async () => {
    const correctOptionId = ex.correctOptionId!;
    const res = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: stn.slug,
        exerciseId: ex.id,
        attemptNo: 1,
        answer: { kind: 'option', optionId: correctOptionId },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; data?: { outcome?: { correct?: boolean } } };
    expect(json.ok).toBe(true);
    expect(json.data?.outcome?.correct).toBe(true);
  });

  it('404s when grading an exercise that belongs to a DIFFERENT station (no cross-station attempts)', async () => {
    const other = ch1.stations.find((s) => s.slug !== stn.slug)!;
    const res = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: other.slug,
        exerciseId: ex.id,
        attemptNo: 1,
        answer: { kind: 'option', optionId: ex.correctOptionId! },
      }),
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('station/unknown_exercise');
  });

  it('404s for mastery-pool exercises through the grade action too', async () => {
    const gate = Object.values(ch1.exercises).find((e) => e.assessmentRole.startsWith('mastery_'))!;
    const res = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: stn.slug,
        exerciseId: gate.id,
        attemptNo: 1,
        answer: { kind: 'option', optionId: gate.correctOptionId! },
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('TASK-HANASO-29 F1 — no dead /review link on home (engine not integrated)', () => {
  const srcDir = join(process.cwd(), 'src');

  it('the home page source contains no href="/review" (the route does not exist)', () => {
    const page = readFileSync(join(srcDir, 'app/page.tsx'), 'utf8');
    // strip /* … */ comments so the explanatory fix comment doesn't false-positive
    const code = page.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toContain('href="/review"');
    expect(code).not.toContain("href='/review'");
    expect(code).not.toContain('href={`/review`}');
  });

  it('the due-review branch renders the honest non-clickable notice instead of a CTA', () => {
    const page = readFileSync(join(srcDir, 'app/page.tsx'), 'utf8');
    expect(page).toContain("view.review.kind === 'due'");
    expect(page).toContain('reviewRoutePending');
    // the dead-link CTA message key is gone entirely
    const fa = readFileSync(join(srcDir, 'messages/fa.ts'), 'utf8');
    expect(fa).not.toContain('reviewCta');
    expect(fa).toContain('reviewRoutePending');
  });
});
