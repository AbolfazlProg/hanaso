/**
 * TASK-DLG-POC-01 — T7: FSRS cards bound to their dialogue context (`context_line_id`).
 * createCardFromLine → review → serialize/deserialize roundtrip must preserve the
 * dialogue binding («مرور در بافت»), and reviews must schedule + log through ts-fsrs.
 */
import { describe, expect, it } from 'vitest';
import { loadDialogue } from '@/modules/dialogue/server';
import {
  createCardFromLine,
  deserializeCard,
  Rating,
  review,
  serializeCard,
  type DialogueFsrsCard,
} from '@/modules/fsrs';

const dialogue = loadDialogue('cafe-morning-01');

describe('FSRS dialogue-context cards (T7)', () => {
  it('creates a sentence card bound to its dialogue line', () => {
    const line = dialogue.lines[1]!; // おはようございます。コーヒーをお願いします。
    const card = createCardFromLine(line, new Date('2026-11-01T09:00:00Z'));
    expect(card.itemId).toBe(`sent:${line.id}`);
    expect(card.contextLineId).toBe(line.id); // fsrs_cards.context_line_id
    expect(card.card.due.getTime()).toBe(new Date('2026-11-01T09:00:00Z').getTime());
    expect(card.card.reps).toBe(0);
  });

  it('review() advances scheduling and logs the grade, preserving the context', () => {
    const line = dialogue.lines[7]!; // けっこうです line — a key sentence card
    const t0 = new Date('2026-11-01T09:00:00Z');
    const { item, log } = review(createCardFromLine(line, t0), 'good', new Date('2026-11-01T12:00:00Z'));

    expect(item.contextLineId).toBe(line.id);
    expect(item.card.reps).toBe(1);
    expect(item.card.due.getTime()).toBeGreaterThan(t0.getTime());
    expect(item.card.last_review?.getTime()).toBe(new Date('2026-11-01T12:00:00Z').getTime());
    expect(log.rating).toBe(Rating.Good);

    // a failed recall resets the schedule but keeps the binding
    const again = review(item, 'again', new Date('2026-11-01T18:00:00Z'));
    expect(again.item.contextLineId).toBe(line.id);
    expect(again.item.card.reps).toBe(2);
    expect(again.item.card.due.getTime()).toBeLessThanOrEqual(
      new Date('2026-11-01T18:00:00Z').getTime() + 60 * 60 * 1000,
    );
    expect(again.log.rating).toBe(Rating.Again);
  });

  it('serializes/deserializes with context_line_id intact (persistence roundtrip)', () => {
    const line = dialogue.lines[4]!;
    const reviewed = review(createCardFromLine(line, new Date('2026-11-01T09:00:00Z')), 'easy');
    const json = serializeCard(reviewed.item);
    const restored: DialogueFsrsCard = deserializeCard(json);

    expect(restored.itemId).toBe(reviewed.item.itemId);
    expect(restored.contextLineId).toBe(line.id); // T7: the binding survives persistence
    expect(restored.card.due instanceof Date).toBe(true);
    expect(restored.card.due.getTime()).toBe(reviewed.item.card.due.getTime());
    expect(restored.card.last_review?.getTime()).toBe(reviewed.item.card.last_review?.getTime());
    expect(restored.card.reps).toBe(reviewed.item.card.reps);

    // and the restored card keeps reviewing in context
    const next = review(restored, 'hard', new Date('2026-11-02T09:00:00Z'));
    expect(next.item.contextLineId).toBe(line.id);
  });

  it('rejects corrupted serialized cards', () => {
    expect(() => deserializeCard('{"itemId":"x"}')).toThrowError(/invalid serialized/);
    expect(() => deserializeCard('not json')).toThrowError();
  });

  it('every dialogue line can become a context card (the full bank)', () => {
    const cards = dialogue.lines.map((l) => createCardFromLine(l));
    expect(cards).toHaveLength(dialogue.lines.length);
    expect(new Set(cards.map((c) => c.contextLineId)).size).toBe(dialogue.lines.length);
  });
});
