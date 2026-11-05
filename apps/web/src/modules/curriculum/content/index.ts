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
import { CHAPTER_KANA_FOUNDATION } from './chapter-kana01';

/** Chapter 2 — «اولین مکالمه» (unit-first-meeting-01) — the 05B two-unit rebuild (TASK-LEARNING-06). */
export const CHAPTER_FIRST_MEETING: Chapter = {
  slug: 'first-meeting-01',
  levelCode: 'L2',
  titleFa: 'فصل ۰۲ — اولین مکالمه: わたしは学生です',
  canDoFa:
    'در پایان این فصل می‌توانی خودت را کامل معرفی کنی (نام، ملیت، خاستگاه)، هویت دیگران را بپرسی و تأیید کنی، فرض غلط را مؤدبانه رد کنی — و کل مکالمهٔ ۱۴ نوبتی را بفهمی.',
  summaryFa:
    'میکی دوستش سورا را به کافهٔ یامادا می‌آورد؛ کنار پنجره علی کتاب می‌خواند و کمی بعد کیم — همکلاسی کره‌ای سورا — وارد می‌شود. یک مکالمه، دو واحد داستانی، و در پایان گیت فهم.',
  dialogueSlug: 'first-meeting-01',
  orderInLevel: 1,
  estMinutes: 45,
  estLoad: 'medium',
  bandArc: 'cafe-intro',
  sceneFa:
    'کافه‌ای کوچک نزدیک دانشگاه در توکیو، بعدازظهر. میکی (مشتری ثابت) دوستش سورا (دانشجوی چینی) را برای اولین بار به کافه می‌آورد. یامادا، صاحب ژاپنی کافه، پشت پیشخوان است؛ کنار پنجره علی — استاد ایرانی — کتاب ژاپنی می‌خواند؛ و کمی بعد، کیم (دانشجوی کره‌ای و همکلاسی سورا) وارد می‌شود.',
  words: FM01_WORDS,
  grammar: FM01_GRAMMAR,
  expressions: FM01_EXPRESSIONS,
  stations: FM01_STATIONS,
  exercises: Object.fromEntries(FM01_EXERCISES.map((e) => [e.id, e])),
  mastery: {
    weights: { M1: 0.3, M2: 0.2, M3: 0.2, M4: 0.2, M5: 0.1 },
    weakPointMap: {
      M1: ['stn-fm01-10-reconnect', 'stn-fm01-12-grammar-mo'],
      M2: ['stn-fm01-02-vocab', 'stn-fm01-11-vocab2'],
      M3: ['stn-fm01-03-grammar-desu', 'stn-fm01-05-grammar-qa', 'stn-fm01-13-grammar-dewa', 'stn-fm01-16-grammar-kara'],
      M4: ['stn-fm01-07-listen', 'stn-fm01-15-listen'],
      M5: ['stn-fm01-14-expression'],
    },
  },
  // T-79 (DD-123): the two story units of the 05B map — one anchor dialogue,
  // two narrative halves, one comprehension gate at the end.
  units: [
    {
      slug: 'unit-02-1-saijo-no-aisatsu',
      titleFa: 'واحد ۱ — 最初のあいさつ (نوبت‌های ۱–۸)',
      summaryFa: 'سلام و معرفی: ۸ واژهٔ هویت + は+です + پرسش/تأیید + آیین آشنایی',
      stationSlugs: [
        'stn-fm01-01-anchor', 'stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu',
        'stn-fm01-04-structure', 'stn-fm01-05-grammar-qa', 'stn-fm01-06-expression',
        'stn-fm01-07-listen', 'stn-fm01-08-practice', 'stn-fm01-09-integrate',
      ],
    },
    {
      slug: 'unit-02-2-kimu-san-no-shookai',
      titleFa: 'واحد ۲ — キムさんの紹介 (نوبت‌های ۹–۱۴)',
      summaryFa: 'ورود کیم: も + نفی مؤدبانه + خاستگاه + واکنش‌ها — و گیت فهم فصل',
      stationSlugs: [
        'stn-fm01-10-reconnect', 'stn-fm01-11-vocab2', 'stn-fm01-12-grammar-mo',
        'stn-fm01-13-grammar-dewa', 'stn-fm01-14-expression', 'stn-fm01-15-listen',
        'stn-fm01-16-grammar-kara', 'stn-fm01-17-practice', 'stn-fm01-18-integrate',
      ],
    },
  ],
  // DD-117/120 (OQ-053): the kana gate G1 unlocks this chapter — a first conversation
  // is undecodable without the writing foundation the kana chapter builds.
  prerequisiteChapterSlug: 'kana-foundation-01',
};

/** All bundled chapters, ordered by level/position. */
export const CHAPTERS: Chapter[] = [CHAPTER_KANA_FOUNDATION, CHAPTER_FIRST_MEETING];

const CHAPTERS_BY_SLUG: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.slug, c]));

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
