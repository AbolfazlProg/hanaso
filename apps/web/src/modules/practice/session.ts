/**
 * HANASO — Practice session contract (TASK-HANASO-22) — skill-agnostic.
 *
 * The shared surface every skill's practice plugs into (Kana today;
 * Vocabulary/Grammar/Kanji/Listening/Reading/Speaking later — each adds a
 * dimensions+generator pair, never a parallel system). Two hard rules from the
 * mission and the research docs:
 *
 *  1. THE ANSWER KEY NEVER CROSSES TO THE CLIENT (same rule as SKL-013 for
 *     lessons): generators produce keyed items for the SERVER session; the
 *     client payload is the stripped projection (`toClientItem`).
 *  2. PRACTICE NEVER SCHEDULES REVIEWS and never mutates FSRS state
 *     (FSRS_INTEGRATION_CONTRACT — single scheduler; the future M2 engine
 *     consumes the `eligible_for_review` states this module records).
 */
import type { KanaPracticeDimension } from './kana/dimensions';

/** Skills with a practice implementation today (extensible registry). */
export const PRACTICE_SKILLS = ['kana'] as const;
export type PracticeSkill = (typeof PRACTICE_SKILLS)[number];

/** Session flavour (PRACTICE_SCHEDULING_RESEARCH §1). */
export type PracticeKind = 'focused' | 'mixed';

/** Per-skill dimension union (Kana's K1..K8 today; future skills extend). */
export type PracticeDimension = KanaPracticeDimension;

/** One generated practice item — SERVER shape (carries the answer key). */
export interface KeyedPracticeItem {
  /** Stable id within the session (never content-order dependent). */
  id: string;
  skill: PracticeSkill;
  dimension: PracticeDimension;
  /** Learning object this item exercises (e.g. 'kn-rec-hira-a' — the FSRS future id). */
  objectId: string;
  /** Interaction shape the client renders. */
  interaction:
    | {
        kind: 'choice';
        /** Persian instruction. */
        promptFa: string;
        /** Japanese glyph/word prompt (the thing to read/recognise). */
        promptJa?: string;
        /** Audio to play (sound-first items — the sound IS the question). */
        promptAudio?: { opus: string; m4a: string };
        /** Options (never carry the key). */
        options: { id: string; label: string }[];
        /** SERVER-ONLY: the correct option id (stripped for the client). */
        correctOptionId: string;
        /** SERVER-ONLY: short teaching copy for the reveal. */
        revealFa: string;
      }
    | {
        /** Writing recall — the shared writing canvas judges it client-side. */
        kind: 'write';
        promptFa: string;
        /** The character to write (server strips it — the prompt is audio/romaji). */
        promptAudio?: { opus: string; m4a: string };
        /** SERVER-ONLY: the target glyph. */
        character: string;
        /** SERVER-ONLY: romaji shown in the reveal. */
        revealFa: string;
      };
}

/** The client-safe projection of one item (no key material). */
export interface ClientPracticeItem {
  id: string;
  dimension: PracticeDimension;
  interaction:
    | {
        kind: 'choice';
        promptFa: string;
        promptJa?: string;
        promptAudio?: { opus: string; m4a: string };
        options: { id: string; label: string }[];
      }
    | {
        kind: 'write';
        promptFa: string;
        promptAudio?: { opus: string; m4a: string };
        /** Target glyph — the writing engine judges locally (lesson parity). */
        character: string;
      };
}

/** Strip the answer key — the ONLY way a client payload is produced. */
export function toClientItem(item: KeyedPracticeItem): ClientPracticeItem {
  if (item.interaction.kind === 'choice') {
    const { correctOptionId: _key, revealFa: _reveal, ...rest } = item.interaction;
    void _key;
    void _reveal;
    return {
      id: item.id,
      dimension: item.dimension,
      interaction: { kind: 'choice' as const, promptFa: rest.promptFa, promptJa: rest.promptJa, promptAudio: rest.promptAudio, options: rest.options },
    } satisfies ClientPracticeItem;
  }
  const { revealFa: _r, ...rest } = item.interaction;
  void _r;
  /* Writing items keep the target character on the client ON PURPOSE: the
   * shared writing engine judges strokes locally (exactly like the lesson
   * writing-practice block ships its characters) — a write item's key is the
   * drawing itself, not a hidden choice option. */
  return {
    id: item.id,
    dimension: item.dimension,
    interaction: { kind: 'write' as const, promptFa: rest.promptFa, promptAudio: rest.promptAudio, character: rest.character },
  } satisfies ClientPracticeItem;
}

/** Per-item outcome recorded at session end (evidence feed). */
export interface PracticeItemResult {
  itemId: string;
  objectId: string;
  dimension: PracticeDimension;
  /** True when the FIRST attempt was correct (the honest practice metric). */
  firstTryCorrect: boolean;
  /** Attempts used (≥1). */
  attempts: number;
  /** Milliseconds on the item (0 when unknown). */
  ms: number;
}

/** A stored practice session (append-only log). */
export interface StoredPracticeSession {
  /** uuid (server-generated). */
  id: string;
  userId: string;
  skill: PracticeSkill;
  kind: PracticeKind;
  /** Station slug (focused) or chapter scope key (mixed). */
  scopeKey: string;
  itemResults: PracticeItemResult[];
  startedAt: string;
  completedAt: string | null;
}

/**
 * Learning-object practice state (PRACTICE_SCHEDULING_RESEARCH §5).
 * States are only the ones the CURRENT system can honestly evidence —
 * `reviewed` / mastery live with the future M2 engine, never faked here.
 */
export type LearningObjectState = 'introduced' | 'practiced' | 'eligible_for_review';

export interface LearningObjectRecord {
  userId: string;
  /** Stable content id — the SAME id the future FSRS engine will use (kn-…). */
  objectId: string;
  skill: PracticeSkill;
  state: LearningObjectState;
  /** Per-dimension honest counts { seen, firstTryCorrect }. */
  dimensionStats: Partial<Record<PracticeDimension, { seen: number; firstTryCorrect: number }>>;
  updatedAt: string;
}

/** The answer payload for one item. */
export type PracticeAnswerPayload = { kind: 'choice'; optionId: string } | { kind: 'write'; accepted: boolean };
