/**
 * HANASO — Learning analytics event contract (TASK-LEARNING-06 / WP-1 — ADR-016,
 * Ch02 blueprint §۸ / 05A §۷).
 *
 * INTEGRATION BOUNDARY — HONEST STATUS: the analytics BACKEND (pipeline,
 * aggregation, owner panel) is a future task (ADR-016 pipeline = M6). What
 * exists today is the /api/events endpoint backed by the in-memory ring store
 * (ADR-016's current honest state). This module is the TYPED CONTRACT for every
 * event the lesson system emits — names are frozen (object_verb, snake_case,
 * DD-055: flat + immutable), payloads are minimal and PII-free (DD-056).
 *
 * When the real pipeline lands it consumes the same names/shapes — no content or
 * UI rewrite. Events are recorded SERVER-SIDE at the trust boundary (the API
 * routes that already own grading/progress), never fabricated client-side.
 */
import { getEventStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';

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
  // FSRS (enrollment is data + event; the engine itself = not-integrated)
  'fsrs_cards_enrolled',
  // kana chapter (05A §۷)
  'kana_gate_measure_completed',
  'reading_word_played',
  'mnemonic_revealed',
  // handwriting practice (TASK-LEARNING-07 / DD-105/DD-111 — practice layer, never a gate)
  'writing_practice_completed',
] as const;

export type LearningEventName = (typeof LEARNING_EVENTS)[number];

/** Payload contracts per event (minimal, PII-free — blueprint §۸). */
export interface LearningEventPayloads {
  chapter_started: { chapter_id: string };
  chapter_completed: { chapter_id: string; outcome: 'understood' | 'remediate'; attempt_loop: number };
  unit_checkpoint_completed: { chapter_id: string; unit_id: string; stations_completed: number };
  station_entered: { chapter_id: string; station_id: string };
  station_exited: { chapter_id: string; station_id: string };
  station_completed: { chapter_id: string; station_id: string; score: number | null };
  optional_station_entered: { chapter_id: string; station_id: string; source: 'suggested' | 'curious' };
  exercise_answered: { exercise_id: string; type: string; correct: boolean; attempt_no: number; ms?: number };
  exercise_weak_point: { exercise_id: string; station_id: string; reference_block_id?: string };
  dialogue_encounter_ended: { chapter_id: string; phase: 'encounter' | 'reconnect' | 'return'; replays: number };
  line_replayed: { line_id: string };
  line_translation_revealed: { line_id: string };
  prediction_answered: { chapter_id: string; correct: boolean };
  gate_measure_completed: { chapter_id: string; measure: string; score: number; attempt_loop: number };
  remediation_triggered: { chapter_id: string; measure: string; target_station_id: string };
  integration_submitted: { chapter_id: string; station_id: string; used_template: boolean };
  fsrs_cards_enrolled: { chapter_id: string; station_id: string; items: string[]; engine: 'not-integrated' };
  kana_gate_measure_completed: { measure: string; score: number; attempt_loop: number };
  reading_word_played: { word: string };
  mnemonic_revealed: { kana_id: string };
  /** Writing practice — structured summary only (DD-111: raw pen paths never leave the browser). */
  writing_practice_completed: {
    chapter_id: string;
    station_id: string;
    character: string;
    mode: 'guided' | 'trace' | 'free';
    verdict: string;
    strokes_total: number;
    strokes_first_try: number;
    total_mistakes: number;
    hints_shown: number;
    completed: boolean;
    duration_ms: number;
  };
}

/**
 * Record one learning event server-side (trust boundary). Never throws into the
 * caller's flow — analytics must not break learning (S-5 spirit); failures are
 * swallowed after being logged by the store itself.
 */
export function recordLearningEvent<K extends LearningEventName>(
  name: K,
  props: LearningEventPayloads[K] & Record<string, unknown>,
  userId: string = POC_DEFAULT_USER_ID,
): void {
  try {
    const store = getEventStore();
    store.record(name, { ...props, user_id: userId });
  } catch {
    // Analytics outage must never fail a learning action.
  }
}
