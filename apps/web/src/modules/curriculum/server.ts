/**
 * HANASO — Curriculum module SERVER entry (TASK-LEARNING-01) — node-only.
 * Loads the chapter + its anchor dialogue bundle (YAML loader) and runs the
 * dialogue-anchored content validation at load time (fail fast on content drift).
 */
import { getChapterByDialogueSlug, getChapter, listChapters } from './content';
import { hasPreviewAccess, previewLocksMode, unlockAllMode } from '@/lib/preview';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { engineChapterSchema, compileEngineChapter } from '../../modules/lesson-engine';
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

/**
 * REBUILD-02 — DRAFT chapter lookup (walkable preview, NOT published).
 *
 * Draft chapters authored with the Lesson Engine (content/lesson-engine/*.yaml)
 * resolve here through compileEngineChapter — the D-0011 path: the EXISTING
 * runtime Chapter shape, then the SAME validateChapter gates below. They are
 * deliberately ABSENT from content/index.ts CHAPTERS, so the journey home, the
 * reveal plan and the course chain never see them — access is by direct URL
 * only (owner preview / walkthrough testing). PUBLISH = generate a real content
 * module from the same YAML and register it in CHAPTERS.
 */
function getDraftChapter(slug: string): Chapter | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const parsed = engineChapterSchema.safeParse(parseYaml(readFileSync(`content/lesson-engine/${slug}.yaml`, 'utf8')));
    if (!parsed.success) {
      throw new Error(`draft schema invalid: ${JSON.stringify(parsed.error.flatten())}`);
    }
    const { chapter, findings } = compileEngineChapter(parsed.data);
    const hard = findings.filter((f) => f.severity === 'hard');
    if (hard.length > 0) {
      throw new Error(`draft compile has hard findings: ${hard.map((f) => f.rule).join(', ')}`);
    }
    return chapter;
  } catch {
    return null; // no such draft / unreadable — normal slug fallthrough
  }
}

/** Load one chapter with its anchor dialogue; validates content on first load. */
export function loadChapterBundle(slug: string): ChapterBundle {
  const cached = bundleCache.get(slug);
  if (cached) return cached;

  checkCourseChainOnce();
  const chapter = getChapter(slug) ?? getDraftChapter(slug);
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
 * PREVIEW MODE (FINALIZATION): is `slug` a Lesson-Engine draft? Filename check
 * only (no YAML parse) — cheap enough for per-request gating.
 */
export function isDraftChapter(slug: string): boolean {
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  try {
    return existsSync(`content/lesson-engine/${slug}.yaml`);
  } catch {
    return false;
  }
}

/**
 * PREVIEW MODE (FINALIZATION): the Lesson-Engine drafts (content/lesson-engine/*.yaml)
 * as summaries for the owner's preview index — reads the YAML straight from the
 * content dir (server-only). Never used by normal-user surfaces.
 */
export function listDraftChapterSummaries(): { slug: string; titleFa: string; levelCode: string }[] {
  const out: { slug: string; titleFa: string; levelCode: string }[] = [];
  try {
    const dir = 'content/lesson-engine';
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.yaml')) continue;
      const slug = f.replace(/\.yaml$/, '');
      try {
        const chapter = getDraftChapter(slug);
        if (chapter) out.push({ slug: chapter.slug, titleFa: chapter.titleFa, levelCode: chapter.levelCode });
      } catch {
        // unreadable draft — skip, never break the home page
      }
    }
  } catch {
    // no draft dir — normal deployments
  }
  return out;
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
  // TEMPORARY SITE-WIDE UNLOCK (owner directive): env UNLOCK_ALL_MODE=1 opens
  // every gate — published prereqs AND the draft gate — for every visitor,
  // no preview cookie needed. View-level only; see lib/preview.ts.
  if (unlockAllMode()) {
    return { locked: false, prerequisiteSlug: null, prerequisiteTitleFa: null };
  }
  // PREVIEW MODE: the owner browses with prereq gates bypassed (view-level only).
  // Guarded: outside a request scope (direct-call unit tests) next/headers throws —
  // no request = no preview cookie = normal locking semantics.
  let previewActive = false;
  try {
    previewActive = await hasPreviewAccess();
  } catch {
    previewActive = false;
  }
  if (previewActive) {
    // OWNER LOCK CONTROL: 'open' (default) bypasses every gate at view level;
    // 'enforce' applies the REAL prereq gates so the owner can rehearse the
    // actual learner path. Draft chapters stay owner-reviewable in BOTH modes —
    // they are unpublished content and not part of the real learner path at all;
    // the draft gate below for every non-owner request is untouched.
    let locksMode: 'open' | 'enforce' = 'open';
    try {
      locksMode = await previewLocksMode();
    } catch {
      locksMode = 'open';
    }
    if (locksMode === 'open' || isDraftChapter(chapter.slug)) {
      return { locked: false, prerequisiteSlug: null, prerequisiteTitleFa: null };
    }
    // enforce + published chapter → fall through to the normal prereq gate below
  }
  // A Lesson-Engine draft is UNPUBLISHED content: without the preview cookie it
  // is locked for EVERY user (direct-URL leak closed — loadChapterBundle resolves
  // drafts, so the access layer must be the gate).
  if (isDraftChapter(chapter.slug)) {
    return {
      locked: true,
      prerequisiteSlug: null,
      prerequisiteTitleFa: 'درس منتشرنشده — فقط با حالت پیش‌نمایش مالک قابل مشاهده است',
    };
  }
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

export async function resolveLearnerJourney(
  userId: string,
  chapterSlug?: string,
  opts?: { preview?: boolean },
): Promise<LearnerJourneyHome> {
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
  const journey = resolveJourney(chapter, level, stationStates, chapterState, {
    unlockAll: opts?.preview === true,
  });

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
