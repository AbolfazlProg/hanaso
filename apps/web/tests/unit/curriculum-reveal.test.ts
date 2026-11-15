/**
 * HANASO — Learning-journey reveal & section tests (TASK-HANASO-16).
 *
 * Pure-resolver contract tests over the REAL bundled chapters:
 *
 * resolveRevealPlan — which chapter the learner sees (extracted FROM PROGRESS,
 *   never a constant): new learner → first chapter; mid-chapter → same chapter;
 *   gate passed → the next chapter auto-activates; all understood → the last
 *   chapter in review + a full archive. The teaser appears ONLY ≥75% through
 *   the active chapter's core path and only ever names the IMMEDIATE next
 *   chapter (never the total course size).
 *
 * resolveSections — the one-section-at-a-time panel: sections are the chapter's
 *   authored units[] (islands/story groups — grouping only), statuses are
 *   DERIVED from the same availability data (nothing new is stored), the
 *   default active section is the one holding the next actionable station, and
 *   a chapter without units[] resolves to ONE implicit section.
 *
 * validateCourseChain — the progressive-reveal honesty gate: every chapter
 *   after the first must chain to a real prerequisite (a hidden-but-enterable
 *   future chapter would make the reveal promise fake).
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters, LEVELS_BY_CODE } from '@/modules/curriculum/content';
import { resolveJourney, resolveSections, nextStation } from '@/modules/curriculum/journey';
import { courseOrder, resolveRevealPlan } from '@/modules/curriculum/reveal';
import { validateCourseChain } from '@/modules/curriculum/validation';
import type { Chapter, ChapterState, StationState } from '@/modules/curriculum/types';

const KANA = 'kana-foundation-01';
const FM = 'first-meeting-01';

/* --------------------------------------------------------------- helpers */

function statesMap(entries: [string, ChapterState | null][]): Map<string, ChapterState | null> {
  return new Map(entries);
}

function stationState(slug: string, status: StationState['status']): StationState {
  return { stationSlug: slug, status, bestScore: null, attemptCount: 1 };
}

/** Build a journey of the real chapter with the given walk states. */
function journeyOf(chapter: Chapter, states: StationState[]) {
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  return resolveJourney(chapter, level, states, null);
}

/** The first N core stations of the chapter marked completed. */
function doneFirstN(chapter: Chapter, n: number): StationState[] {
  return chapter.stations
    .filter((s) => s.core)
    .slice(0, n)
    .map((s) => stationState(s.slug, 'completed'));
}

/* ------------------------------------------------------------ courseOrder */

describe('courseOrder — course order is data, not array order', () => {
  it('sorts by level band, then authored chapter position', () => {
    const ordered = courseOrder(listChapters());
    expect(ordered[0]!.slug).toBe(KANA); // L1
    expect(ordered[1]!.slug).toBe(FM); // L2
  });
});

/* ---------------------------------------------------------- resolveReveal */

describe('resolveRevealPlan — the active chapter comes from progress', () => {
  it('a brand-new learner sees the FIRST chapter, no teaser, empty archive', () => {
    const plan = resolveRevealPlan(listChapters(), statesMap([]));
    expect(plan.activeSlug).toBe(KANA);
    expect(plan.archive).toEqual([]);
    expect(plan.teaser).toBeNull();
    // the whole course size stays hidden — only a count, never names
    expect(plan.hiddenCount).toBe(0);
  });

  it('a learner mid-chapter keeps that chapter active (refresh changes nothing)', () => {
    const mid: ChapterState = { status: 'started', bestWeighted: null, bestMeasures: null, remediationCount: 0 };
    const plan = resolveRevealPlan(listChapters(), statesMap([[KANA, mid]]));
    expect(plan.activeSlug).toBe(KANA);
    expect(plan.archive).toEqual([]);
  });

  it('a started-but-not-understood chapter never archives and never hands over', () => {
    const walked: ChapterState = {
      status: 'stations_complete',
      bestWeighted: null,
      bestMeasures: null,
      remediationCount: 0,
    };
    const plan = resolveRevealPlan(listChapters(), statesMap([[KANA, walked]]));
    expect(plan.activeSlug).toBe(KANA); // DD-048: only understood counts
    expect(plan.archive).toEqual([]);
  });

  it('passing the gate (understood) auto-activates the NEXT chapter and archives the old one', () => {
    const understood: ChapterState = {
      status: 'understood',
      bestWeighted: 0.93,
      bestMeasures: null,
      remediationCount: 0,
    };
    const plan = resolveRevealPlan(listChapters(), statesMap([[KANA, understood]]));
    expect(plan.activeSlug).toBe(FM);
    expect(plan.archive.map((c) => c.slug)).toEqual([KANA]);
  });

  it('all chapters understood → the LAST chapter stays open in review mode + full archive', () => {
    const understood: ChapterState = {
      status: 'understood',
      bestWeighted: 0.95,
      bestMeasures: null,
      remediationCount: 0,
    };
    const plan = resolveRevealPlan(
      listChapters(),
      statesMap([
        [KANA, understood],
        [FM, understood],
      ]),
    );
    expect(plan.activeSlug).toBe(FM);
    expect(plan.archive.map((c) => c.slug)).toEqual([KANA]);
  });
});

describe('resolveRevealPlan — the teaser (curiosity, never a list)', () => {
  const chapter = getChapter(KANA)!;
  const coreTotal = chapter.stations.filter((s) => s.core).length;

  it('below 75% of the core path the next chapter stays invisible', () => {
    const below = Math.floor(coreTotal * 0.74);
    const plan = resolveRevealPlan(listChapters(), statesMap([]), {
      coreCompleted: below,
      coreTotal,
    });
    expect(plan.teaser).toBeNull();
  });

  it('from 75% onward exactly ONE teaser appears — the immediate next chapter, without counts', () => {
    const at = Math.ceil(coreTotal * 0.75);
    const plan = resolveRevealPlan(listChapters(), statesMap([]), {
      coreCompleted: at,
      coreTotal,
    });
    expect(plan.teaser).not.toBeNull();
    expect(plan.teaser!.slug).toBe(FM);
    expect(plan.teaser!.titleFa).toBe(getChapter(FM)!.titleFa);
    expect(plan.teaser!.topicFa.length).toBeGreaterThan(0);
    expect(plan.teaser!.topicFa.length).toBeLessThanOrEqual(100);
  });

  it('no progress data → never a teaser (nothing about the future leaks)', () => {
    const plan = resolveRevealPlan(listChapters(), statesMap([]));
    expect(plan.teaser).toBeNull();
  });
});

/* -------------------------------------------------------- resolveSections */

describe('resolveSections — one section at a time, derived from availability', () => {
  const chapter = getChapter(KANA)!;

  it('a new learner: the first section is active, its rows start locked→start, later sections locked', () => {
    const sections = resolveSections(journeyOf(chapter, []));
    expect(sections.sections.length).toBe(chapter.units!.length); // sections ARE the units[]
    expect(sections.activeIndex).toBe(0);
    const first = sections.sections[0]!;
    expect(first.status).toBe('in_progress');
    expect(first.isFocus).toBe(true);
    // the first station of the walk is startable; later rows stay locked
    expect(first.rows[0]!.action).toBe('start');
    expect(first.rows.some((r) => r.action === 'locked')).toBe(true);
    // future sections: honest locked view (DD-114 — visible, not enterable).
    // TASK-HANASO-22: section B's CORE rows are all locked for a new learner;
    // the optional free drill (prerequisites: [] by design — FEAT-158) stays
    // honestly enterable, so the section itself is not "allLocked".
    const sectionB = sections.sections[1]!;
    expect(sectionB.rows.filter((r) => r.node.station.core).every((r) => r.action === 'locked')).toBe(true);
    expect(sectionB.rows.find((r) => r.node.station.slug === 'stn-kana-opt-drill')!.action).toBe('start');
  });

  it('the default active section always holds the next actionable station', () => {
    // complete exactly the core stations of island 1 (H0..H6 minus optional)
    const island1 = chapter.units![0]!;
    const island1Core = island1.stationSlugs
      .map((slug) => chapter.stations.find((s) => s.slug === slug)!)
      .filter((s) => s.core);
    const journey = journeyOf(
      chapter,
      island1Core.map((s) => stationState(s.slug, 'completed')),
    );
    const sections = resolveSections(journey);

    expect(sections.sections[0]!.status).toBe('completed');
    expect(sections.sections[1]!.isFocus).toBe(true);
    expect(sections.activeIndex).toBe(1);
    // the next station lives inside section 2 — one CTA away
    const next = nextStation(journey);
    expect(sections.sections[1]!.rows.some((r) => r.node.station.slug === next!.slug)).toBe(true);
  });

  it('a section completes only when ALL its core stations are done — and never completes the chapter early', () => {
    const island1 = chapter.units![0]!;
    const oneShort = island1.stationSlugs
      .map((slug) => chapter.stations.find((s) => s.slug === slug)!)
      .filter((s) => s.core)
      .slice(0, -1); // all but the last
    const sections = resolveSections(
      journeyOf(
        chapter,
        oneShort.map((s) => stationState(s.slug, 'completed')),
      ),
    );
    expect(sections.sections[0]!.status).toBe('in_progress'); // one core row short
    expect(sections.sections[0]!.coreCompleted).toBe(oneShort.length);
  });

  it('completed rows turn into review CTAs (returning without re-recording)', () => {
    const island1 = chapter
      .units![0]!.stationSlugs.map((slug) => chapter.stations.find((s) => s.slug === slug)!)
      .filter((s) => s.core);
    const sections = resolveSections(
      journeyOf(
        chapter,
        island1.map((s) => stationState(s.slug, 'completed')),
      ),
    );
    expect(sections.sections[0]!.rows.every((r) => r.action === 'review' || !r.node.station.core)).toBe(true);
  });

  it('an in-progress station keeps its section active with a continue CTA', () => {
    const h0 = chapter.stations.find((s) => s.slug === 'stn-kana-h0')!;
    const h1 = chapter.stations.find((s) => s.slug === 'stn-kana-h1')!;
    const sections = resolveSections(
      journeyOf(chapter, [stationState(h0.slug, 'completed'), stationState(h1.slug, 'in_progress')]),
    );
    expect(sections.activeIndex).toBe(0);
    const row = sections.sections[0]!.rows.find((r) => r.node.station.slug === h1.slug)!;
    expect(row.action).toBe('continue');
  });

  it('a chapter WITHOUT units[] resolves to ONE implicit section holding the whole walk', () => {
    const bare: Chapter = { ...chapter, units: undefined };
    const sections = resolveSections(journeyOf(bare, []));
    expect(sections.sections.length).toBe(1);
    expect(sections.sections[0]!.rows.length).toBe(bare.stations.length);
    expect(sections.activeIndex).toBe(0);
  });

  it('everything completed → the LAST section is the review default', () => {
    const all = chapter.stations.filter((s) => s.core).map((s) => stationState(s.slug, 'completed'));
    const sections = resolveSections(journeyOf(chapter, all));
    expect(sections.sections.every((s) => s.status === 'completed')).toBe(true);
    expect(sections.activeIndex).toBe(sections.sections.length - 1);
  });
});

/* ----------------------------------------------------- validateCourseChain */

describe('validateCourseChain — progressive-reveal honesty gate (HANASO-16)', () => {
  it('the bundled registry passes (Ch01 entry + Ch02 chained to Ch01)', () => {
    expect(validateCourseChain(listChapters())).toEqual([]);
  });

  it('a later chapter without a prerequisite violates the chain (hidden-but-enterable is forbidden)', () => {
    const orphan: Chapter = { ...getChapter(FM)!, prerequisiteChapterSlug: undefined };
    const violations = validateCourseChain([getChapter(KANA)!, orphan]);
    expect(violations.length).toBe(1);
    expect(violations[0]!.rule).toContain('CHAPTER-CHAIN');
    expect(violations[0]!.message).toContain(FM);
  });

  it('a prerequisite that is not a bundled chapter violates the chain', () => {
    const dangling: Chapter = { ...getChapter(FM)!, prerequisiteChapterSlug: 'no-such-chapter' };
    const violations = validateCourseChain([getChapter(KANA)!, dangling]);
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain('no-such-chapter');
  });

  it('the FIRST chapter of the course needs no prerequisite (it is the entry)', () => {
    const first: Chapter = { ...getChapter(KANA)!, prerequisiteChapterSlug: undefined };
    expect(validateCourseChain([first])).toEqual([]);
  });
});

/* -------------------------------------------- resolver parity (regression) */

describe('resolveSections ↔ resolveJourney parity (same data, no drift)', () => {
  it('every station appears exactly once across the section rows', () => {
    for (const chapter of listChapters()) {
      const journey = journeyOf(chapter, doneFirstN(chapter, 2));
      const { sections } = resolveSections(journey);
      const rowSlugs = sections.flatMap((s) => s.rows.map((r) => r.node.station.slug));
      expect(rowSlugs.length).toBe(journey.nodes.length);
      expect(new Set(rowSlugs).size).toBe(rowSlugs.length);
      for (const node of journey.nodes) {
        expect(rowSlugs).toContain(node.station.slug);
      }
    }
  });

  it('core counters of all sections sum to the chapter core counters', () => {
    for (const chapter of listChapters()) {
      const journey = journeyOf(chapter, doneFirstN(chapter, 3));
      const { sections } = resolveSections(journey);
      const sumCompleted = sections.reduce((acc, s) => acc + s.coreCompleted, 0);
      const sumTotal = sections.reduce((acc, s) => acc + s.coreTotal, 0);
      expect(sumCompleted).toBe(journey.coreCompleted);
      expect(sumTotal).toBe(journey.coreTotal);
    }
  });
});
