/**
 * HANASO — Progressive chapter reveal (TASK-HANASO-16) — PURE module.
 *
 * WHICH CHAPTER the learner sees is EXTRACTED FROM PROGRESS — never a frontend
 * constant, never «all chapters listed» (owner's progressive-reveal direction):
 *
 *   active   — the first chapter of the course whose ChapterState is NOT
 *              `understood` (a brand-new learner → the first chapter; a learner
 *              mid-chapter → that chapter; a learner who passed the gate → the
 *              next chapter auto-becomes active). All-understood → the last
 *              chapter (review mode + full archive).
 *   archive  — chapters the learner has UNDERSTOOD (DD-048: only the gate gives
 *              this) — browsable again, never deleted, shown compactly.
 *   teaser   — the chapter RIGHT AFTER the active one, revealed ONLY when the
 *              active chapter is ≥75% through its core path (curiosity hook,
 *              not a list: title + one-line topic, no counts anywhere).
 *   hidden   — everything beyond the next chapter: never listed, never teased.
 *
 * Course order is DATA: level.orderInCourse, then chapter.orderInLevel.
 */
import type { Chapter, ChapterState } from './types';
import { LEVELS_BY_CODE } from './content/levels';

/** A completed (understood) chapter card of the archive. */
export interface ArchiveChapterCard {
  slug: string;
  titleFa: string;
  levelCode: string;
}

/** The limited preview of the next chapter (model B — curiosity, no counts). */
export interface RevealTeaser {
  slug: string;
  titleFa: string;
  /** One line about what is coming (chapter summaryFa, first sentence). */
  topicFa: string;
}

/** The resolved reveal plan for the learning home. */
export interface RevealPlan {
  /** The chapter the learner should see right now (from progress). */
  activeSlug: string;
  /** Understood chapters in course order (the archive). */
  archive: ArchiveChapterCard[];
  /** Eligible teaser of the immediately-next chapter, else null. */
  teaser: RevealTeaser | null;
  /** How many chapters exist beyond the next one — a COUNT only (never listed). */
  hiddenCount: number;
}

/** Share of the active chapter's core path completed (0 when unknown). */
export function coreProgressFraction(coreCompleted: number, coreTotal: number): number {
  if (coreTotal <= 0) return 0;
  return coreCompleted / coreTotal;
}

/** Course order: level band first, then the chapter's authored position. */
export function courseOrder(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => {
    const la = LEVELS_BY_CODE[a.levelCode]?.orderInCourse ?? 0;
    const lb = LEVELS_BY_CODE[b.levelCode]?.orderInCourse ?? 0;
    return la !== lb ? la - lb : a.orderInLevel - b.orderInLevel;
  });
}

/** First sentence of a Persian summary (teaser topic line — honest, short). */
function firstSentence(text: string): string {
  const cut = text.split(/[.!?؟।]\s/)[0] ?? text;
  return cut.length > 96 ? `${cut.slice(0, 96).trim()}…` : cut.trim();
}

/**
 * Resolve the reveal plan. `chapterStates` maps slug → stored ChapterState
 * (null when the learner never touched the chapter). `activeCoreProgress` is
 * the ACTIVE chapter's core-path counters (from resolveJourney) — it alone
 * decides teaser eligibility, so nothing about the future is revealed early.
 */
export function resolveRevealPlan(
  chapters: Chapter[],
  chapterStates: ReadonlyMap<string, ChapterState | null>,
  activeCoreProgress?: { coreCompleted: number; coreTotal: number },
): RevealPlan {
  const ordered = courseOrder(chapters);
  if (ordered.length === 0) {
    throw new Error('resolveRevealPlan: no chapters bundled');
  }

  let activeIndex = ordered.findIndex((c) => chapterStates.get(c.slug)?.status !== 'understood');
  if (activeIndex < 0) activeIndex = ordered.length - 1; // everything understood → last (review)

  const active = ordered[activeIndex]!;
  const archive: ArchiveChapterCard[] = ordered
    .slice(0, activeIndex)
    .filter((c) => chapterStates.get(c.slug)?.status === 'understood')
    .map((c) => ({ slug: c.slug, titleFa: c.titleFa, levelCode: c.levelCode }));

  const next = activeIndex + 1 < ordered.length ? ordered[activeIndex + 1]! : null;
  const fraction = activeCoreProgress
    ? coreProgressFraction(activeCoreProgress.coreCompleted, activeCoreProgress.coreTotal)
    : 0;
  const teaser: RevealTeaser | null =
    next !== null && fraction >= 0.75
      ? { slug: next.slug, titleFa: next.titleFa, topicFa: firstSentence(next.summaryFa) }
      : null;

  // beyond the next chapter: a count only — never a list, never a title
  const hiddenCount = Math.max(0, ordered.length - (activeIndex + 1) - 1);

  return { activeSlug: active.slug, archive, teaser, hiddenCount };
}
