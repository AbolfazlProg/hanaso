/**
 * HANASO — Experience tuning constants (TASK-LEARNING-08 / WP-5).
 *
 * ONE place for interaction timings so they stay reviewable and consistent —
 * the mission demands the auto-next delay be configurable from a single spot
 * and NOT hardcoded at the call site.
 */
export const EXPERIENCE = {
  /**
   * Auto-next after a CORRECT answer (mission §7): long enough to read the
   * short confirmation feedback, short enough to never feel like a wait.
   */
  autoNextDelayMsCorrect: 1500,
  /**
   * Extra delay before auto-advance when the correct answer came on a later
   * attempt (feedback usually carries an explanation worth reading).
   */
  autoNextDelayMsCorrectAfterRetry: 2200,
  /**
   * UPPER bound safety: a stale timer may never fire long after the fact
   * (rapid double navigation) — anything scheduled beyond this is dropped.
   */
  autoNextMaxDelayMs: 4000,
  /**
   * TASK-LEARNING-08 Addendum-2 §2: the calm review beat after an ACCEPTED
   * drawing. The learner's raw ink is replaced by the standard glyph sample
   * and the card holds ~1s so the result can be SEEN before the flow
   * continues on its own — a teaching pause, not a slowdown.
   */
  kanaReviewPauseMs: 1100,
  /**
   * TASK-LEARNING-10 §5 — the review beat AFTER the correct-answer sound
   * ends. The auto-next no longer races the audio: it waits for the learner
   * to HEAR the correct pronunciation, holds this short beat so the reading
   * can also be READ, and only then advances.
   */
  autoNextAudioBeatMs: 650,
  /**
   * TASK-LEARNING-10 §5 — a stalled sound (no `ended`, no `error`) may never
   * lock the learner on a question: the flow still advances after this bound
   * and a short note is shown (the replay control stays available).
   */
  autoNextAudioFallbackMs: 3200,
} as const;
