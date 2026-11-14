/**
 * HANASO — Curriculum module SERVER entry (TASK-LEARNING-01) — node-only.
 * Loads the chapter + its anchor dialogue bundle (YAML loader) and runs the
 * dialogue-anchored content validation at load time (fail fast on content drift).
 */
import { getChapterByDialogueSlug, getChapter, listChapters } from './content';
import { LEVELS_BY_CODE } from './content/levels';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import {
  validateChapter,
  validateChapterAgainstDialogue,
  validateCourseChain,
  type ContentViolation,
} from './validation';
import type { Chapter, ChapterState } from './types';
import { resolveJourney, resolveSections, nextStation, corePathComplete } from './journey';
import { resolveRevealPlan, courseOrder, type RevealPlan } from './reveal';
import type { SectionView } from './journey';
import type { StationState } from './types';

export interface ChapterBundle {
  chapter: Chapter;
  /** The anchor dialogue bundle (dialogue + characters + audio manifest). */
  bundle: ReturnType<typeof loadDialogueBundle>;
  /** Line ids of the anchor dialogue (validation universe). */
  lineIds: string[];
}

const bundleCache = new Map<string, ChapterBundle>();

/**
 * TASK-HANASO-16 — course-chain validation runs ONCE per process (fail fast on
 * a registry that would break progressive reveal). Per-chapter validation
 * stays inside loadChapterBundle below.
 */
let courseChainChecked = false;
function checkCourseChainOnce(): void {
  if (courseChainChecked) return;
  courseChainChecked = true;
  const violations = validateCourseChain(listChapters());
  if (violations.length > 0) {
    const detail = violations.map((v) => `  [${v.rule}] ${v.message}`).join('\n');
    throw new Error(`course chain failed validation (${violations.length} violations):\n${detail}`);
  }
}

/** Load one chapter with its anchor dialogue; validates content on first load. */
export function loadChapterBundle(slug: string): ChapterBundle {
  const cached = bundleCache.get(slug);
  if (cached) return cached;

  checkCourseChainOnce();
  const chapter = getChapter(slug);
  if (!chapter) throw new Error(`unknown chapter: ${slug}`);
  const level = LEVELS_BY_CODE[chapter.levelCode];
  if (!level) throw new Error(`chapter ${slug} references unknown level ${chapter.levelCode}`);

  const bundle = loadDialogueBundle(chapter.dialogueSlug);
  const lineIds = bundle.dialogue.lines.map((l) => l.id);

  const violations: ContentViolation[] = [
    ...validateChapter(chapter, level),
    ...validateChapterAgainstDialogue(chapter, level, lineIds),
  ];
  if (violations.length > 0) {
    const detail = violations.map((v) => `  [${v.rule}] ${v.message}`).join('\n');
    throw new Error(`chapter ${slug} failed content validation (${violations.length} violations):\n${detail}`);
  }

  const result: ChapterBundle = { chapter, bundle, lineIds };
  bundleCache.set(slug, result);
  return result;
}

/** All chapters with their levels (for the /learn index + seed). */
export function listChapterSummaries(): { slug: string; titleFa: string; levelCode: string }[] {
  return listChapters().map((c) => ({ slug: c.slug, titleFa: c.titleFa, levelCode: c.levelCode }));
}

/**
 * TASK-LEARNING-06 (DD-117/120 — OQ-053): chapter-level soft prerequisite.
 * A chapter declaring `prerequisiteChapterSlug` stays LOCKED (journey/entry
 * gated at the page/API layer) until the prerequisite chapter reaches
 * `understood` (its gate passed). Soft lock: never destroys stored progress —
 * a locked chapter simply is not enterable through the UI.
 */
export async function chapterAccessStatus(
  chapter: Chapter,
  userId: string,
): Promise<{ locked: boolean; prerequisiteSlug: string | null; prerequisiteTitleFa: string | null }> {
  if (!chapter.prerequisiteChapterSlug) {
    return { locked: false, prerequisiteSlug: null, prerequisiteTitleFa: null };
  }
  const prereq = getChapter(chapter.prerequisiteChapterSlug);
  if (!prereq) {
    return { locked: false, prerequisiteSlug: null, prerequisiteTitleFa: null };
  }
  const state = await (await import('@/lib/poc/stores')).getChapterProgressStore().get(userId, prereq.slug);
  return {
    locked: state?.status !== 'understood',
    prerequisiteSlug: prereq.slug,
    prerequisiteTitleFa: prereq.titleFa,
  };
}

/*
 * TASK-HANASO-16 — the learning-home composition (one server call per render).
 *
 * Everything the one-section-at-a-time journey pages need: the reveal plan
 * (active chapter FROM PROGRESS + archive + teaser), the resolved journey of
 * the target chapter, and its derived section panel view. No new stored
 * state — a pure read over the existing stores.
 */
export interface LearnerJourneyHome {
  reveal: RevealPlan;
  chapter: Chapter;
  /** True when the requested chapter is not the reveal-active one (archive browsing / review). */
  isReview: boolean;
  sections: SectionView[];
  /** Default active section index (the section holding the next actionable station). */
  activeSectionIndex: number;
  coreCompleted: number;
  coreTotal: number;
  chapterState: ChapterState | null;
  /** Deep-linked continue target: the next actionable station (null → the gate). */
  nextStationSlug: string | null;
  /** True when every core station is done — the CTA becomes the mastery gate. */
  corePathComplete: boolean;
  stationStates: StationState[];
}

export async function resolveLearnerJourney(userId: string, chapterSlug?: string): Promise<LearnerJourneyHome> {
  checkCourseChainOnce();
  const chapters = courseOrder(listChapters());
  const chapterStore = (await import('@/lib/poc/stores')).getChapterProgressStore();
  const states = new Map<string, ChapterState | null>();
  for (const c of chapters) {
    states.set(c.slug, await chapterStore.get(userId, c.slug));
  }

  // First pass reveals the ACTIVE chapter (progress-driven) before any heavy load.
  const firstPass = resolveRevealPlan(chapters, states);
  const targetSlug = chapterSlug ?? firstPass.activeSlug;

  const bundle = loadChapterBundle(targetSlug); // throws on unknown slug → 404 at the page
  const chapter = bundle.chapter;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  const stationStore = (await import('@/lib/poc/stores')).getStationProgressStore();
  const stationStates = await stationStore.listForUnit(
    userId,
    chapter.stations.map((s) => s.slug),
  );
  const chapterState = states.get(chapter.slug) ?? null;
  const journey = resolveJourney(chapter, level, stationStates, chapterState);

  // Second pass: the teaser threshold needs the ACTIVE chapter's core counters.
  const activeIsTarget = targetSlug === firstPass.activeSlug;
  const reveal = activeIsTarget
    ? resolveRevealPlan(chapters, states, {
        coreCompleted: journey.coreCompleted,
        coreTotal: journey.coreTotal,
      })
    : resolveRevealPlan(chapters, states);

  const { sections, activeIndex } = resolveSections(journey);
  const next = nextStation(journey);

  return {
    reveal,
    chapter,
    isReview: targetSlug !== reveal.activeSlug,
    sections,
    activeSectionIndex: activeIndex,
    coreCompleted: journey.coreCompleted,
    coreTotal: journey.coreTotal,
    chapterState,
    nextStationSlug: next?.slug ?? null,
    corePathComplete: corePathComplete(journey),
    stationStates,
  };
}

export { getChapter, getChapterByDialogueSlug, listChapters, LEVELS_BY_CODE };
export { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
