/**
 * HANASO — FSRS dialogue-context cards (TASK-DLG-POC-01 / T7).
 * Wraps ts-fsrs with the dialogue binding from KB dialogue-content-schema §۲:
 * `fsrs_cards.context_line_id` — the dialogue line a review item lives in
 * («مرور در بافت»: review = replay the line's audio + comprehension, no translation first).
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type FSRS,
  type Grade,
  type ReviewLog,
} from 'ts-fsrs';
import type { DialogueLine } from '@/modules/dialogue';

export { createEmptyCard, fsrs, generatorParameters, Rating };
export type { Card, Grade, ReviewLog };

export const FSRS_PARAMETERS = generatorParameters({ enable_fuzz: false });

/** A review item bound to its dialogue context (fsrs_cards + context_line_id). */
export interface DialogueFsrsCard {
  /** Stable item id, e.g. 'sent:s-cafe-morning-01-l8' or 'voc:kekkou-desu'. */
  itemId: string;
  /** The dialogue line this item reviews in context (nullable in the DB — always set here). */
  contextLineId: string;
  card: Card;
}

function engine(): FSRS {
  return fsrs(FSRS_PARAMETERS);
}

/** Create a fresh (New) card for a dialogue line — the sentence-card type from mastery §۴. */
export function createCardFromLine(line: DialogueLine, now: Date = new Date()): DialogueFsrsCard {
  return {
    itemId: `sent:${line.id}`,
    contextLineId: line.id,
    card: createEmptyCard(now),
  };
}

export type ReviewOutcome = 'again' | 'hard' | 'good' | 'easy';

const RATING_BY_OUTCOME: Record<ReviewOutcome, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** Apply a review to a card; returns the updated card + log, preserving the dialogue context. */
export function review(
  item: DialogueFsrsCard,
  outcome: ReviewOutcome,
  now: Date = new Date(),
): { item: DialogueFsrsCard; log: ReviewLog } {
  const result = engine().next(item.card, now, RATING_BY_OUTCOME[outcome]);
  return {
    item: { itemId: item.itemId, contextLineId: item.contextLineId, card: result.card },
    log: result.log,
  };
}

/** Roundtrip-safe serialization (context_line_id must survive persistence — T7). */
export function serializeCard(item: DialogueFsrsCard): string {
  return JSON.stringify(item);
}

export function deserializeCard(json: string): DialogueFsrsCard {
  const parsed = JSON.parse(json) as DialogueFsrsCard;
  if (typeof parsed.itemId !== 'string' || typeof parsed.contextLineId !== 'string' || !parsed.card) {
    throw new Error('invalid serialized DialogueFsrsCard');
  }
  return {
    itemId: parsed.itemId,
    contextLineId: parsed.contextLineId,
    card: {
      ...parsed.card,
      due: new Date(parsed.card.due),
      last_review: parsed.card.last_review ? new Date(parsed.card.last_review) : undefined,
    },
  };
}
