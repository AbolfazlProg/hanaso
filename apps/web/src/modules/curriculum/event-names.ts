/**
 * HANASO — Learning analytics event-name registry (pure data, zero imports).
 *
 * Extracted from events.ts (owner-pass 2026-11-19) so BOTH the lesson-system
 * emitters and the durable analytics store (modules/analytics/store.ts) can
 * share ONE frozen source of truth without import cycles. Names are IMMUTABLE
 * (DD-055 / ADR-016): changing a name = new name + plan_version bump.
 */
/** The frozen event-name registry the lesson system may emit (blueprint §۸ + 05A §۷). */
export const LEARNING_EVENTS = [
  // chapter/unit flow
  'chapter_started',
  'chapter_completed',
  'unit_checkpoint_completed',
  // station flow
  'station_entered',
  'station_exited',
  'station_completed',
  'optional_station_entered',
  // exercises + feedback ladder (issue #106 signals)
  'exercise_answered',
  'exercise_weak_point',
  // dialogue encounter (A / reconnect / return)
  'dialogue_encounter_ended',
  'line_replayed',
  'line_translation_revealed',
  'prediction_answered',
  // mastery gate
  'gate_measure_completed',
  'remediation_triggered',
  // production
  'integration_submitted',
  // FSRS (enrollment is data + event; the engine status stamps the payload)
  'fsrs_cards_enrolled',
  // kana chapter (05A §۷)
  'kana_gate_measure_completed',
  'reading_word_played',
  'mnemonic_revealed',
  // handwriting practice (TASK-LEARNING-07 / DD-105/DD-111 — practice layer, never a gate)
  'writing_practice_completed',
  // review engine (owner-pass 2026-11-19 — the FSRS port went live)
  'review_logged',
] as const;

export type LearningEventName = (typeof LEARNING_EVENTS)[number];

/**
 * Legacy client PoC event names (dialogue-player interactions + the
 * practice/assessment flows that shipped before the durable store). They pass
 * the registry gate; anything else quarantines (ADR-016).
 */
export const LEGACY_CLIENT_EVENTS = [
  'assessment_submitted',
  'mastery_passed',
  'mastery_remediated',
  'unit_understood',
  'practice_started',
  'practice_submitted',
  'lesson_studied',
  'dialogue_started',
  'dialogue_line_replayed',
  'dialogue_line_audio_played',
  'dialogue_translation_revealed',
  'dialogue_paused',
  'dialogue_resumed',
  'dialogue_completed',
] as const;

const KNOWN_NAMES: Set<string> = new Set([...LEARNING_EVENTS, ...LEGACY_CLIENT_EVENTS]);

/** true = registered name; false = quarantine (kept + flagged, never dropped). */
export function isKnownLearningEventName(name: string): boolean {
  return KNOWN_NAMES.has(name);
}
