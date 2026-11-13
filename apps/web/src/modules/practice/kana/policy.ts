/**
 * HANASO — Practice policy DATA (TASK-HANASO-22).
 * Every number here is an owner-tunable initial policy grounded in
 * docs/research/PRACTICE_SCHEDULING_RESEARCH.md §۶ — changing a size or an
 * unlock rule is a DATA edit, never a code edit (the LEVEL_POLICIES pattern).
 *
 * Honesty: the research supports "short frequent sessions" and "block for new
 * items, interleaved for discrimination" (EV-065); the exact item counts are
 * labeled initial policy, not proven optima.
 */

export interface PracticePolicy {
  /** Focused session target size (items). */
  focusedItems: number;
  /** Mixed session target size (items). */
  mixedItems: number;
  /** Completed stations required before mixed practice unlocks. */
  mixedMinStations: number;
  /** Options per choice item (QUESTION §۲-۳ parity with lessons: 3). */
  choicesPerItem: number;
  /**
   * Weakness line: an object enters the weak list when first-try accuracy is
   * below this AND it has been seen at least `weakMinSeen` times.
   */
  weakAccuracyBelow: number;
  weakMinSeen: number;
  /** Max weak objects suggested in one mixed session / hub list. */
  weakMaxSuggestions: number;
  /** Weight of weak objects in mixed selection (0..1 share of items). */
  weakSelectionShare: number;
  /** In-session retries before the reveal (practice ladder is shorter than lessons). */
  maxAttempts: number;
}

export const PRACTICE_POLICY: PracticePolicy = {
  focusedItems: 14,
  mixedItems: 20,
  mixedMinStations: 3,
  choicesPerItem: 3,
  weakAccuracyBelow: 0.6,
  weakMinSeen: 3,
  weakMaxSuggestions: 8,
  weakSelectionShare: 0.4,
  maxAttempts: 2,
};

/** Persian copy for the honest review line (never a fake count/dates). */
export const PRACTICE_COPY_FA = {
  reviewQueueNote: 'کارت‌های واجد مرور ثبت می‌شوند؛ صف مرور با موتور زمان‌بندی فعال می‌شود (هنوز فعال نیست).',
  writingOptionalNote: 'تمرین نوشتاری اختیاری است و هیچ‌وقت شرط پیشرفت مسیر نیست.',
} as const;
