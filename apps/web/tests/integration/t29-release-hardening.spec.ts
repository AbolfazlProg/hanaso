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
import { plantPrereqChain } from '../helpers/walk-chain';

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
  it("grades a station's OWN practice exercise (positive control — unchanged behavior)", async () => {
    await plantPrereqChain(QA_UUID, stn.slug);
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
    await plantPrereqChain(QA_UUID, stn.slug);
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

/*
 * Part-2 ج UPDATE (2026-11-20): the FSRS engine went LIVE (owner-pass —
 * app.fsrs_cards + /api/review) and /review is now a REAL route (the queue
 * runner). The F1 guard flips with the reality it protects: the home «due»
 * card MUST now link the real route — and the route files must exist, so a
 * future dead-link regression (route deleted, link kept) still fails here.
 */
describe('TASK-HANASO-29 F1 — the home review CTA links the REAL /review route', () => {
  const srcDir = join(process.cwd(), 'src');

  it('the /review route files exist (page + runner)', () => {
    const page = readFileSync(join(srcDir, 'app/review/page.tsx'), 'utf8');
    expect(page).toContain('ReviewRunner');
    expect(page).toContain('getFsrsReviewStore');
    const runner = readFileSync(join(srcDir, 'app/review/review-runner.tsx'), 'utf8');
    // the runner submits through the idempotent review API — never a fake queue
    expect(runner).toContain("fetch('/api/review'");
    expect(runner).toContain('clientReviewId');
  });

  it('the due-review branch renders the REAL CTA with the live count', () => {
    const page = readFileSync(join(srcDir, 'app/page.tsx'), 'utf8');
    expect(page).toContain("view.review.kind === 'due'");
    expect(page).toContain('href="/review"');
    expect(page).toContain('reviewStartCta');
    // the obsolete «route pending» key is gone entirely
    const fa = readFileSync(join(srcDir, 'messages/fa.ts'), 'utf8');
    expect(fa).not.toContain('reviewRoutePending');
    expect(fa).toContain('reviewStartCta');
  });

  it('no dishonest «coming soon» review strings survive anywhere learner-facing', () => {
    for (const rel of ['messages/fa.ts', 'app/learn/[chapter]/complete/page.tsx']) {
      const src = readFileSync(join(srcDir, rel), 'utf8');
      expect(src).not.toContain('به‌زودی فعال می‌شود');
      expect(src).not.toContain('هنوز فعال نیست');
      expect(src).not.toContain('موتور M2');
    }
  });
});
