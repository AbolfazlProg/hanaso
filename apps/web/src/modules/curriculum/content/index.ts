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
import { CHAPTER_KANA_EXPANSION } from './chapter-kana-expansion';
import type { KanjiItem } from '../types';

/*
 * AUDIO-UNIT/KANJI 2026-11-23 §۲ — the chapter's DEDICATED kanji teaching
 * targets (the kanji-pilot plan's declarations, now in the REAL chapter):
 * 人 (kj-4eba) rides inside four already-taught nationality words; 国
 * (kj-56fd) inside two of them. Facts live in the N5 reference; the
 * declaration is what makes the kanji «taught» in the course (the registry
 * reads the kanji-card of stn-fm01-23-kanji — EQA-12 K2 both directions).
 */
const FM01_KANJI: KanjiItem[] = [
  {
    kanjiId: 'kj-4eba',
    fsrs: { rec: 'kj-rec-kj-4eba', wri: 'kj-wri-kj-4eba' },
    anchorWordIds: ['voc-nihonjin', 'voc-chuugokujin', 'voc-iranjin', 'voc-kankokujin'],
  },
  {
    kanjiId: 'kj-56fd',
    fsrs: { rec: 'kj-rec-kj-56fd', wri: 'kj-wri-kj-56fd' },
    anchorWordIds: ['voc-chuugokujin', 'voc-kankokujin'],
  },
];

/** Chapter 2 — «اولین مکالمه» (unit-first-meeting-01) — the 05B two-unit rebuild (TASK-LEARNING-06). */
export const CHAPTER_FIRST_MEETING: Chapter = {
  slug: 'first-meeting-01',
  levelCode: 'L2',
  titleFa: 'فصل ۰۲ — اولین مکالمه: わたしは学生です',
  canDoFa:
    'در پایان این فصل می‌توانی خودت را کامل معرفی کنی (نام، ملیت، خاستگاه)، هویت دیگران را بپرسی و تأیید کنی، فرض غلط را مؤدبانه رد کنی — و کل مکالمهٔ ۱۳ خطی را بفهمی.',
  summaryFa:
    'میکی دوستش سورا را به کافهٔ یامادا می‌آورد؛ کنار پنجره علی کتاب می‌خواند و کمی بعد کیم — همکلاسی کره‌ای سورا — وارد می‌شود. یک مکالمه، دو بخش داستانی، و در پایان دروازهٔ فهم.',
  dialogueSlug: 'first-meeting-01',
  orderInLevel: 1,
  /* JOURNEY-FIX 2026-11-23 §۵ (honest station timing): the per-station
   * estMinutes were recalibrated to the per-block model (card ≈45″, exercise ≈
   * 30″, full listen = 13 lines × 8″ + gist checks, rule/DIA block ≈1.5′) — the
   * old flat «4′ for everything» lied about the real beginner pace. The sum
   * 91′ (= 80′ core + 11′ optional) updates chapter.estMinutes; the L2 window
   * is raised with the same honest-budget justification (TASK-HANASO-21
   * precedent: the time budget no longer lies to keep the old cap).
   *
   * AUDIO-UNIT/KANJI 2026-11-23 §۲: the dedicated kanji station (+7′ — two
   * kanji-cards with retrieval, the writing practice, the exit) makes the
   * honest sum 98′ (= 87′ core + 11′ optional); the window moves to [40,105]
   * on the same honest-budget rule. */
  estMinutes: 98,
  estLoad: 'medium',
  bandArc: 'cafe-intro',
  sceneFa:
    'کافه‌ای کوچک نزدیک دانشگاه در توکیو، بعدازظهر. میکی (مشتری ثابت) دوستش سورا (دانشجوی چینی) را برای اولین بار به کافه می‌آورد. یامادا، صاحب ژاپنی کافه، پشت پیشخوان است؛ کنار پنجره علی — استاد ایرانی — کتاب ژاپنی می‌خواند؛ و کمی بعد، کیم (دانشجوی کره‌ای و همکلاسی سورا) وارد می‌شود.',
  words: FM01_WORDS,
  grammar: FM01_GRAMMAR,
  expressions: FM01_EXPRESSIONS,
  stations: FM01_STATIONS,
  kanji: FM01_KANJI,
  exercises: Object.fromEntries(FM01_EXERCISES.map((e) => [e.id, e])),
  mastery: {
    weights: { M1: 0.3, M2: 0.2, M3: 0.2, M4: 0.2, M5: 0.1 },
    weakPointMap: {
      M1: ['stn-fm01-10-reconnect', 'stn-fm01-12-grammar-mo'],
      M2: ['stn-fm01-02-vocab', 'stn-fm01-11-vocab2'],
      M3: [
        'stn-fm01-03-grammar-desu',
        'stn-fm01-05-grammar-qa',
        'stn-fm01-13-grammar-dewa',
        'stn-fm01-16-grammar-kara',
      ],
      M4: ['stn-fm01-07-listen', 'stn-fm01-15-listen'],
      M5: ['stn-fm01-14-expression'],
    },
  },
  // T-79 (DD-123): the two story units of the 05B map — one anchor dialogue,
  // two narrative halves, one comprehension gate at the end.
  /* JOURNEY-FIX 2026-11-23 §۵ (beginner-friendly section naming): the unit
  // titles are Persian-first with the Japanese name as a labelled gloss — the
  // old «واحد ۱ — 最初のあいさつ (نوبت‌های ۱–۸)» asked an absolute beginner to
  // parse a bare Japanese title plus a turn-range. «واحد» (military/academic
  // register) became «بخش» (matching the UI shell's own vocabulary), and
  // «نوبت» (turn) became «خط» (line) — the exact term the dialogue player
  // itself uses, so one concept carries ONE name across every surface. The
  // real line range is 1–13 (13 lines — the old «۹–۱۴»/«۱۴ نوبتی» data lied). */
  units: [
    {
      slug: 'unit-02-1-saijo-no-aisatsu',
      titleFa: 'بخش ۱ — سلام و آشنایی (最初のあいさつ)',
      summaryFa: 'خط‌های ۱ تا ۸ مکالمه: ۸ واژهٔ هویت + は+です + پرسش/تأیید + آیین آشنایی',
      stationSlugs: [
        'stn-fm01-01-anchor',
        'stn-fm01-02-vocab',
        'stn-fm01-03-grammar-desu',
        'stn-fm01-04-structure',
        'stn-fm01-05-grammar-qa',
        'stn-fm01-06-expression',
        'stn-fm01-07-listen',
        'stn-fm01-08-practice',
        'stn-fm01-09-integrate',
      ],
    },
    {
      slug: 'unit-02-2-kimu-san-no-shookai',
      titleFa: 'بخش ۲ — ورود کیم و معرفی (キムさんの紹介)',
      summaryFa: 'خط‌های ۹ تا ۱۳ مکالمه: も + نفی مؤدبانه + خاستگاه + واکنش‌ها — و دروازهٔ فهم فصل',
      stationSlugs: [
        'stn-fm01-10-reconnect',
        'stn-fm01-11-vocab2',
        'stn-fm01-12-grammar-mo',
        'stn-fm01-13-grammar-dewa',
        'stn-fm01-14-expression',
        'stn-fm01-15-listen',
        'stn-fm01-16-grammar-kara',
        'stn-fm01-17-practice',
        'stn-fm01-18-integrate',
        // TASK-HANASO-21 (OBS-004): the optionals join their natural unit
        // (kana01's pattern — an optional lives in a real island, never
        // the __rest__ group).
        'stn-fm01-opt-countries',
        'stn-fm01-opt-review-desu',
        'stn-fm01-opt-jobs',
        'stn-fm01-opt-drill',
        // AUDIO-UNIT/KANJI 2026-11-23 §۲ — the dedicated kanji station closes
        // unit 02-2: every anchor word is already taught by stn-02/stn-11 and
        // the learner has USED the nationalities through both grammar arcs.
        'stn-fm01-23-kanji',
      ],
    },
  ],
  // DD-117/120 (OQ-053): the kana gate G1 unlocks this chapter — a first conversation
  // is undecodable without the writing foundation the kana chapter builds.
  prerequisiteChapterSlug: 'kana-foundation-01',
};

/** All bundled chapters, ordered by level/position. */
export const CHAPTERS: Chapter[] = [CHAPTER_KANA_FOUNDATION, CHAPTER_KANA_EXPANSION, CHAPTER_FIRST_MEETING];

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
