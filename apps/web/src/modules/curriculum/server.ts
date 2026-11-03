/**
 * HANASO — Curriculum module SERVER entry (TASK-LEARNING-01) — node-only.
 * Loads the chapter + its anchor dialogue bundle (YAML loader) and runs the
 * dialogue-anchored content validation at load time (fail fast on content drift).
 */
import { getChapterByDialogueSlug, getChapter, listChapters } from './content';
import { LEVELS_BY_CODE } from './content/levels';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { validateChapter, validateChapterAgainstDialogue, type ContentViolation } from './validation';
import type { Chapter } from './types';

export interface ChapterBundle {
  chapter: Chapter;
  /** The anchor dialogue bundle (dialogue + characters + audio manifest). */
  bundle: ReturnType<typeof loadDialogueBundle>;
  /** Line ids of the anchor dialogue (validation universe). */
  lineIds: string[];
}

const bundleCache = new Map<string, ChapterBundle>();

/** Load one chapter with its anchor dialogue; validates content on first load. */
export function loadChapterBundle(slug: string): ChapterBundle {
  const cached = bundleCache.get(slug);
  if (cached) return cached;

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

export { getChapter, getChapterByDialogueSlug, listChapters, LEVELS_BY_CODE };
export { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
