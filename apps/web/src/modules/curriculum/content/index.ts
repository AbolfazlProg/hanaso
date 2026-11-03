/**
 * HANASO — Chapter registry & assembly (TASK-LEARNING-01).
 *
 * Pure module: bundled chapters are the content source of truth (ADR-008
 * content-as-code pattern — same as the dialogue YAML). The DB stores the
 * FK-critical rows (units/stations) via the seed; the runtime reads content here.
 */
import type { Chapter } from '../types';
import { FM01_EXPRESSIONS, FM01_GRAMMAR, FM01_WORDS } from './chapter-fm01.items';
import { FM01_EXERCISES } from './chapter-fm01.exercises';
import { FM01_STATIONS } from './chapter-fm01.stations';

/** Chapter 1 — «اولین دیدار» (unit-first-meeting-01) — ORIGINAL HANASO content. */
export const CHAPTER_FIRST_MEETING: Chapter = {
  slug: 'first-meeting-01',
  levelCode: 'L2',
  titleFa: 'اولین دیدار — معرفی خود در کافه',
  canDoFa:
    'در پایان این فصل می‌توانی خودت را معرفی کنی، هویت (ملیت/شغل) بگویی و بپرسی، و به معرفی دیگران مؤدبانه واکنش نشان دهی.',
  summaryFa: 'میکی دوستش سورا را برای اولین بار به کافهٔ یامادا می‌آورد — و آن‌جا منتظر یک آشناییِ دیگر هم هستی.',
  dialogueSlug: 'first-meeting-01',
  orderInLevel: 1,
  estMinutes: 25,
  estLoad: 'medium',
  bandArc: 'cafe-intro',
  sceneFa:
    'کافه‌ای کوچک نزدیک دانشگاه در توکیو، بعدازظهر. میکی (مشتری ثابت) دوستش سورا (دانشجوی چینی) را برای اولین بار به کافه می‌آورد. یامادا، صاحب ژاپنی کافه، پشت پیشخان است؛ کنار پنجره هم علی — استاد ایرانی — کتاب ژاپنی می‌خواند.',
  words: FM01_WORDS,
  grammar: FM01_GRAMMAR,
  expressions: FM01_EXPRESSIONS,
  stations: FM01_STATIONS,
  exercises: Object.fromEntries(FM01_EXERCISES.map((e) => [e.id, e])),
  mastery: {
    weights: { M1: 0.3, M2: 0.2, M3: 0.2, M4: 0.2, M5: 0.1 },
    weakPointMap: {
      M2: 'stn-fm01-02-vocab',
      M3: 'stn-fm01-03-grammar-desu',
      M4: 'stn-fm01-07-listen',
      M5: 'stn-fm01-06-expression',
    },
  },
};

/** All bundled chapters, ordered by level/position. */
export const CHAPTERS: Chapter[] = [CHAPTER_FIRST_MEETING];

const CHAPTERS_BY_SLUG: Record<string, Chapter> = Object.fromEntries(
  CHAPTERS.map((c) => [c.slug, c]),
);

export function listChapters(): Chapter[] {
  return CHAPTERS;
}

export function getChapter(slug: string): Chapter | null {
  return CHAPTERS_BY_SLUG[slug] ?? null;
}

export function getChapterByDialogueSlug(dialogueSlug: string): Chapter | null {
  return CHAPTERS.find((c) => c.dialogueSlug === dialogueSlug) ?? null;
}

export { LEVEL_POLICIES, LEVELS_BY_CODE } from './levels';
