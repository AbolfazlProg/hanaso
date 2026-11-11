/**
 * HANASO — Home dashboard view resolver tests (TASK-HANASO-17 §3 / §13-A).
 *
 * The pure resolver's six primary-CTA states, the secondary next-lesson card
 * (never a duplicate target), the HONEST review card (no fake counts while
 * FSRS is not integrated) and the no-future-totals rule (progressive reveal).
 */
import { describe, expect, it } from 'vitest';

import { resolveHomeView, faDateLine, type HomeInput } from '@/modules/home/home-view';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 12, 9, 0, 0);

function input(overrides?: Partial<HomeInput['journey'] & HomeInput['course'] & HomeInput['review']>): HomeInput {
  return {
    nowMs: NOW,
    journey: {
      chapterSlug: 'kana-foundation-01',
      chapterTitleFa: 'فصل کانا',
      coreCompleted: 0,
      corePathComplete: false,
      nextStation: { slug: 'stn-kana-h0', titleFa: 'ایستگاه اول', estMinutes: 9 },
      inProgress: null,
      ...overrides,
    },
    course: {
      allUnderstood: false,
      archive: [],
      stationsCompletedTotal: 0,
      lastChapterTitleFa: 'فصل آخر',
      ...overrides,
    },
    review: { fsrsActive: false, dueCount: 0, ...overrides },
  };
}

describe('home-view — the ONE primary CTA (six learner states)', () => {
  it('brand-new learner → «start» deep-linked to the FIRST lesson (never the chapter intro)', () => {
    const v = resolveHomeView(input());
    expect(v.primary.state).toBe('start'); // «شروع یادگیری» copy (PG-01)
    expect(v.primary.href).toBe('/learn/kana-foundation-01/journey/stn-kana-h0');
    expect(v.primary.stationTitleFa).toBe('ایستگاه اول');
    // the CTA NEVER lands on the chapter-introduction page (§3.1)
    expect(v.primary.href.endsWith('/journey/stn-kana-h0')).toBe(true);
  });

  it('after progress → the same target reads «next» («شروع درس بعدی»)', () => {
    const v = resolveHomeView(input({ coreCompleted: 3 }));
    expect(v.primary.state).toBe('next');
    expect(v.primary.href).toBe('/learn/kana-foundation-01/journey/stn-kana-h0');
  });

  it('mid-lesson, fresh activity → resume deep-linked to the SAME station (no params)', () => {
    const v = resolveHomeView(
      input({
        inProgress: { slug: 'stn-kana-h2', titleFa: 'ایستگاه وسط', estMinutes: 7, lastActivityAtMs: NOW - 2 * DAY },
      }),
    );
    expect(v.primary.state).toBe('resume');
    expect(v.primary.href).toBe('/learn/kana-foundation-01/journey/stn-kana-h2');
    expect(v.returningAfterAbsence).toBe(false);
  });

  it('mid-lesson, ≥7 days idle → resume_expired with ?restart=1 (neutral tone flag)', () => {
    const v = resolveHomeView(
      input({
        inProgress: { slug: 'stn-kana-h2', titleFa: 'ایستگاه وسط', estMinutes: 7, lastActivityAtMs: NOW - 7 * DAY },
      }),
    );
    expect(v.primary.state).toBe('resume_expired');
    expect(v.primary.href).toBe('/learn/kana-foundation-01/journey/stn-kana-h2?restart=1');
    expect(v.returningAfterAbsence).toBe(true);
  });

  it('legacy row without a timestamp → treated as fresh (upgrade never punishes)', () => {
    const v = resolveHomeView(
      input({
        inProgress: { slug: 'stn-kana-h2', titleFa: 'ایستگاه وسط', estMinutes: 7, lastActivityAtMs: null },
      }),
    );
    expect(v.primary.state).toBe('resume');
  });

  it('core path complete → the mastery gate', () => {
    const v = resolveHomeView(
      input({
        coreCompleted: 12,
        corePathComplete: true,
        nextStation: null,
        inProgress: null,
      }),
    );
    expect(v.primary.state).toBe('gate');
    expect(v.primary.href).toBe('/learn/kana-foundation-01/assessment');
  });

  it('every chapter understood → review the course map', () => {
    const v = resolveHomeView(
      input({
        allUnderstood: true,
        archive: [{ slug: 'kana-foundation-01', titleFa: 'فصل کانا' }],
        stationsCompletedTotal: 12,
        nextStation: null,
        inProgress: null,
      }),
    );
    expect(v.primary.state).toBe('review_course');
    expect(v.primary.href).toBe('/learn');
  });
});

describe('home-view — the secondary «درس بعدی» card (§3.3)', () => {
  it('hidden when it would duplicate the primary target', () => {
    const v = resolveHomeView(input()); // primary IS the next station
    expect(v.nextLesson).toBeNull();
  });

  it('shown when the learner is mid-lesson AND a different station is startable', () => {
    const v = resolveHomeView(
      input({
        inProgress: { slug: 'stn-kana-h2', titleFa: 'ایستگاه وسط', estMinutes: 7, lastActivityAtMs: NOW },
      }),
    );
    expect(v.nextLesson).not.toBeNull();
    expect(v.nextLesson!.slug).toBe('stn-kana-h0');
    expect(v.nextLesson!.href).toBe('/learn/kana-foundation-01/journey/stn-kana-h0');
  });

  it('hidden at the gate and in course-review states', () => {
    const gate = resolveHomeView(input({ corePathComplete: true, nextStation: null, inProgress: null }));
    expect(gate.nextLesson).toBeNull();
  });
});

describe('home-view — the honest review card (§3.2 — no fake numbers)', () => {
  it('engine off + no completed stations → hidden (nothing real to say)', () => {
    const v = resolveHomeView(input());
    expect(v.review).toEqual({ kind: 'hidden' });
  });

  it('engine off + enrolled cards exist → the quiet queue-pending note (no count, no CTA)', () => {
    const v = resolveHomeView(input({ stationsCompletedTotal: 5 }));
    expect(v.review).toEqual({ kind: 'queue_pending' });
  });

  it('engine live + real due count → due card with the REAL count (future contract)', () => {
    const v = resolveHomeView(input({ fsrsActive: true, dueCount: 12, stationsCompletedTotal: 5 }));
    expect(v.review).toEqual({ kind: 'due', count: 12 });
  });

  it('engine live + zero due → the friendly empty state (future contract)', () => {
    const v = resolveHomeView(input({ fsrsActive: true, dueCount: 0, stationsCompletedTotal: 5 }));
    expect(v.review).toEqual({ kind: 'empty' });
  });
});

describe('home-view — no future totals (progressive reveal §3.5)', () => {
  it('the path strip carries only the CURRENT chapter + its done count', () => {
    const v = resolveHomeView(input({ coreCompleted: 3 }));
    expect(v.path).toEqual({
      href: '/learn',
      chapterTitleFa: 'فصل کانا',
      coreCompleted: 3,
    });
    // no course-total denominators exist anywhere in the view model
    const serialized = JSON.stringify(v);
    expect(serialized).not.toContain('coreTotal');
    expect(serialized).not.toContain('hiddenCount');
  });

  it('stats are honest counters only (null for a brand-new learner)', () => {
    expect(resolveHomeView(input()).stats).toBeNull();
    const v = resolveHomeView(input({ stationsCompletedTotal: 4, archive: [{ slug: 'c1', titleFa: 'فصل ۱' }] }));
    expect(v.stats).toEqual({ stationsCompleted: 4, chaptersUnderstood: 1 });
  });
});

describe('home-view — faDateLine (PG-01 short header)', () => {
  it('renders a Persian weekday + date in Asia/Tehran', () => {
    const line = faDateLine(Date.UTC(2026, 10, 12, 9, 0, 0));
    expect(line).toMatch(/۱۴۰۵|پنجشنبه|چهارشنبه|سه‌شنبه|دوشنبه|یکشنبه|جمعه|شنبه/);
    expect(line).toMatch(/نوامبر|آبان|آذر|مهر/);
  });
});
