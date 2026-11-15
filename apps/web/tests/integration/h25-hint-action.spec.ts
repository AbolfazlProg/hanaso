/**
 * TASK-HANASO-25 — the «سرنخ» hint wiring (BUG-023 remediation, Phase 4).
 *
 * The audit (browser-verified): the hint button only rendered inside the
 * feedback panel, the hint paragraph required !feedback — dead by construction;
 * after a retry a stray «سرنخ…» label appeared. The fix: a server `hint`
 * action (the authored f2HintFa NEVER rides the bank payload — answer-key
 * discipline) + the client renders it in the wrong-answer panel; retry/advance
 * reset it; the learner keeps full answering ability.
 *
 * This spec pins the contract at the route level (route handler called
 * directly, same harness as mastery-api.spec.ts):
 *  1. hint for a station's own practice exercise returns the authored text;
 *  2. hint NEVER returns options/key/rationale (no answer material);
 *  3. cross-station / mastery-pool / unknown exercise → 404;
 *  4. every ch1 practice exercise HAS a hint (non-empty f2HintFa) — the
 *     button can never be a no-op for missing content.
 */
import { describe, expect, it } from 'vitest';
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
const ex = ch1.exercises['ex-kana-h1-rec-hira-a']!;
const stn = ch1.stations.find((s) =>
  (s.blocks as unknown as Array<{ exerciseIds?: string[] }>).some((b) => b.exerciseIds?.includes(ex.id)),
)!;

describe('TASK-HANASO-25 hint action (BUG-023)', () => {
  it('returns the authored F2 hint for a station exercise', async () => {
    const res = await stationPost(
      post({ action: 'hint', chapterSlug: 'kana-foundation-01', stationSlug: stn.slug, exerciseId: ex.id }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data?: { hintFa?: string } };
    expect(json.data?.hintFa).toBe(ex.feedback.f2HintFa);
    expect((json.data?.hintFa ?? '').length).toBeGreaterThan(5);
  });

  it('carries NO answer material (no options, no key, no rationale)', async () => {
    const res = await stationPost(
      post({ action: 'hint', chapterSlug: 'kana-foundation-01', stationSlug: stn.slug, exerciseId: ex.id }),
    );
    const json = (await res.json()) as Record<string, unknown>;
    const data = json.data as Record<string, unknown> | undefined;
    expect(Object.keys(data ?? {})).toEqual(['hintFa']);
  });

  it('404s for an exercise outside the named station (no cross-station probing)', async () => {
    const other = ch1.stations.find((s) => s.slug !== stn.slug)!;
    const res = await stationPost(
      post({ action: 'hint', chapterSlug: 'kana-foundation-01', stationSlug: other.slug, exerciseId: ex.id }),
    );
    expect(res.status).toBe(404);
  });

  it('404s for mastery-pool exercises (the gate is not hint-able)', async () => {
    const gate = Object.values(ch1.exercises).find((e) => e.assessmentRole.startsWith('mastery_'))!;
    const res = await stationPost(
      post({ action: 'hint', chapterSlug: 'kana-foundation-01', stationSlug: stn.slug, exerciseId: gate.id }),
    );
    expect(res.status).toBe(404);
  });

  it('every ch1 practice exercise has a non-empty hint (the button can never no-op on content)', () => {
    const practice = Object.values(ch1.exercises).filter((e) => e.assessmentRole === 'practice');
    expect(practice.length).toBeGreaterThan(400);
    for (const e of practice) {
      expect(
        typeof e.feedback.f2HintFa === 'string' && e.feedback.f2HintFa.length > 5,
        `${e.id}: missing/empty f2HintFa`,
      ).toBe(true);
    }
  });
});
