/**
 * HANASO — Level band policies (TASK-LEARNING-01) — DATA, seeded to content.levels.
 *
 * Numbers are the PROVISIONAL policies of KB LEVEL_BASED_CONTENT_MATRIX §۲ (DD-091)
 * + LOAD_SPEC §۱/§۳ + island S3 + gate thresholds (OQ-016). Every number is owner-
 * tunable DATA: changing a cap or threshold is a content edit, never a code edit.
 * Honesty: L4+ rows are the research-proposed generalization (gated by OQ-035);
 * only L1..L3 are exercised by current chapters.
 */
import type { LevelPolicy } from '../types';

export const LEVEL_POLICIES: LevelPolicy[] = [
  {
    code: 'L1',
    titleFa: 'آغاز مطلق',
    jlptLabel: 'Pre-N5',
    cefrLabel: 'pre-A1',
    canDoFa: 'هر دو خط کانا را روان می‌خواند؛ اولین کلمه‌ها را با صدا می‌شناسد.',
    orderInCourse: 1,
    caps: {
      vocabCore: [0, 0],
      grammarClusters: [0, 0],
      stationsCore: [4, 6],
      chapterMinutes: [10, 20],
      dialogueLines: [2, 4],
      listeningSpeed: 0.8,
      furigana: 'all',
      gate: { weighted: 0.7, minMeasure: 0.5 },
      maxRemediationLoops: 3,
    },
  },
  {
    code: 'L2',
    titleFa: 'مبتدی',
    jlptLabel: 'N5 (پایین)',
    cefrLabel: 'A1',
    canDoFa: 'خودش را معرفی می‌کند، احوال‌پرسی می‌کند، هویت می‌پرسد و تأیید می‌کند — در مکالمهٔ ۶–۹ خطی مؤدبانه.',
    orderInCourse: 2,
    caps: {
      vocabCore: [4, 8],
      grammarClusters: [1, 2],
      stationsCore: [8, 10],
      chapterMinutes: [15, 25],
      dialogueLines: [6, 9],
      listeningSpeed: 0.9,
      furigana: 'all',
      gate: { weighted: 0.7, minMeasure: 0.5 },
      maxRemediationLoops: 3,
    },
  },
  {
    code: 'L3',
    titleFa: 'مقدماتی',
    jlptLabel: 'N5 (بالا)',
    cefrLabel: 'A1–A2',
    canDoFa: 'دربارهٔ مکان/زمان/فعالیت روزمره حرف می‌زند؛ دعوت می‌کند و توصیف ساده می‌سازد — مکالمهٔ ۸–۱۰ خطی.',
    orderInCourse: 3,
    caps: {
      vocabCore: [6, 10],
      grammarClusters: [2, 3],
      stationsCore: [8, 10],
      chapterMinutes: [15, 25],
      dialogueLines: [8, 10],
      listeningSpeed: 0.9,
      furigana: 'all',
      gate: { weighted: 0.7, minMeasure: 0.5 },
      maxRemediationLoops: 3,
    },
  },
  {
    code: 'L4',
    titleFa: 'متوسطٔ پایین',
    jlptLabel: 'N4',
    cefrLabel: 'A2',
    canDoFa: 'سیستم فعل کامل (فرم عادی + て)، درخواست/پیشنهاد و تجربه — مکالمهٔ ۸–۱۲ خطی.',
    orderInCourse: 4,
    caps: {
      vocabCore: [8, 12],
      grammarClusters: [2, 3],
      stationsCore: [8, 12],
      chapterMinutes: [20, 30],
      dialogueLines: [8, 12],
      listeningSpeed: 0.95,
      furigana: 'new-only',
      gate: { weighted: 0.75, minMeasure: 0.55 },
      maxRemediationLoops: 3,
    },
  },
  {
    code: 'L5',
    titleFa: 'متوسط',
    jlptLabel: 'N3',
    cefrLabel: 'B1',
    canDoFa: 'بحث نظر/توضیح/شرط؛ روایت تجربه؛ مکالمهٔ سرعت طبیعی.',
    orderInCourse: 5,
    caps: {
      vocabCore: [10, 14],
      grammarClusters: [3, 4],
      stationsCore: [9, 14],
      chapterMinutes: [25, 35],
      dialogueLines: [10, 14],
      listeningSpeed: 1,
      furigana: 'new-only',
      gate: { weighted: 0.75, minMeasure: 0.55 },
      maxRemediationLoops: 3,
    },
  },
  {
    code: 'L6',
    titleFa: 'متوسطٔ بالا',
    jlptLabel: 'N2',
    cefrLabel: 'B1–B2',
    canDoFa: 'مقالهٔ کوتاه/خبر؛ keigo کاری؛ بحث انتزاعی روزمره.',
    orderInCourse: 6,
    caps: {
      vocabCore: [12, 18],
      grammarClusters: [3, 5],
      stationsCore: [10, 16],
      chapterMinutes: [30, 40],
      dialogueLines: [12, 16],
      listeningSpeed: 1,
      furigana: 'off',
      gate: { weighted: 0.8, minMeasure: 0.6 },
      maxRemediationLoops: 2,
    },
  },
  {
    code: 'L7',
    titleFa: 'پیشرفته',
    jlptLabel: 'N1',
    cefrLabel: 'C1',
    canDoFa: 'نقد/استدلال؛ زبان رسانه؛ نوانس فرهنگی-واژگانی.',
    orderInCourse: 7,
    caps: {
      vocabCore: [14, 20],
      grammarClusters: [4, 6],
      stationsCore: [10, 16],
      chapterMinutes: [35, 45],
      dialogueLines: [14, 20],
      listeningSpeed: 1,
      furigana: 'off',
      gate: { weighted: 0.8, minMeasure: 0.6 },
      maxRemediationLoops: 2,
    },
  },
];

export const LEVELS_BY_CODE: Record<string, LevelPolicy> = Object.fromEntries(LEVEL_POLICIES.map((l) => [l.code, l]));
