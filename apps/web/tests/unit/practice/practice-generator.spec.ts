/**
 * TASK-SLICE-01 — practice generator (stage C):
 * deterministic generation from the cafe dialogue, ≥8 exercises, all 4 kinds present,
 * kind rotation (anti-fatigue §۳), everything sourced from the dialogue itself (AC-949).
 */
import { describe, expect, it } from 'vitest';
import { resolveSpeaker } from '@/modules/character';
import { loadDialogue } from '@/modules/dialogue/server';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';
import { EXERCISE_KINDS, KIND_OBJECTIVES, generateExercises } from '@/modules/practice';

const dialogue = loadDialogue('cafe-morning-01');

function cafeCharacters(): CharacterRef[] {
  return dialogue.characterIds.map((id) => {
    const { manifest, voiceId } = resolveSpeaker(id);
    return {
      id: manifest.id,
      nameJa: manifest.nameJa,
      nameFa: manifest.nameFa,
      colorToken: manifest.colorToken,
      voiceId,
    };
  });
}

const exercises = generateExercises(dialogue, cafeCharacters());

describe('generateExercises — cafe-morning-01', () => {
  it('produces ≥8 exercises (KB §۳: 8–15 in-unit items)', () => {
    expect(exercises.length).toBeGreaterThanOrEqual(8);
    expect(exercises.length).toBeLessThanOrEqual(15);
    expect(exercises.every((e) => e.items.length === 1)).toBe(true);
  });

  it('covers all four dialogue-native kinds (FEAT-096..099)', () => {
    const kinds = new Set(exercises.map((e) => e.kind));
    expect(kinds).toEqual(new Set(EXERCISE_KINDS));
  });

  it('rotates kinds — no two consecutive exercises of the same kind (§۳ anti-fatigue)', () => {
    for (let i = 1; i < exercises.length; i++) {
      expect(exercises[i]!.kind).not.toBe(exercises[i - 1]!.kind);
    }
  });

  it('is deterministic — same dialogue, byte-identical session', () => {
    const again = generateExercises(dialogue, cafeCharacters());
    expect(again).toEqual(exercises);
    // and across separately-loaded (structurally equal) dialogue objects
    const reloaded: Dialogue = JSON.parse(JSON.stringify(dialogue));
    expect(generateExercises(reloaded, cafeCharacters())).toEqual(exercises);
  });

  it('every sourceLineIds entry exists in the dialogue and ids are unique', () => {
    const lineIds = new Set(dialogue.lines.map((l) => l.id));
    const seen = new Set<string>();
    for (const ex of exercises) {
      expect(seen.has(ex.id)).toBe(false);
      seen.add(ex.id);
      expect(ex.sourceLineIds.length).toBeGreaterThan(0);
      for (const id of ex.sourceLineIds) expect(lineIds.has(id)).toBe(true);
      expect(ex.prompt.length).toBeGreaterThan(0);
      expect(ex.objective.length).toBeGreaterThan(0);
    }
  });

  it('speaker-identify: options are the 3 characters, correct = the actual speaker, no JP text in payload', () => {
    const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));
    const items = exercises.filter((e) => e.kind === 'speaker-identify');
    expect(items.length).toBe(3); // one per speaker
    const correctSpeakers = new Set<string>();
    for (const ex of items) {
      const item = ex.items[0]!;
      if (item.kind !== 'speaker-identify') throw new Error('kind mismatch');
      const line = linesById.get(item.lineId)!;
      correctSpeakers.add(line.speaker);
      expect(item.options.map((o) => o.id).sort()).toEqual(['chr-miki', 'chr-sora', 'chr-yamada']);
      expect(item.options.map((o) => o.id)).toContain(item.correctOptionId);
      expect(item.correctOptionId).toBe(line.speaker);
      // the payload must not leak the line's text (blind task)
      expect(JSON.stringify(item)).not.toContain(line.tokens[0]!.surface);
      expect(ex.objective).toBe(KIND_OBJECTIVES['speaker-identify']);
    }
    expect(correctSpeakers.size).toBe(3);
  });

  it('order-reconstruct: same sentence set as the dialogue window, correctOrder = dialogue order', () => {
    const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));
    const items = exercises.filter((e) => e.kind === 'order-reconstruct');
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const ex of items) {
      const item = ex.items[0]!;
      if (item.kind !== 'order-reconstruct') throw new Error('kind mismatch');
      expect(item.sentences.map((s) => s.lineId).sort()).toEqual([...item.correctOrder].sort());
      // correctOrder follows the dialogue's own order
      const positions = item.correctOrder.map((id) => dialogue.lines.findIndex((l) => l.id === id));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      // sentences carry the real tokens/fa (source material, not fabricated)
      for (const s of item.sentences) {
        const line = linesById.get(s.lineId)!;
        expect(s.fa).toBe(line.fa);
        expect(s.tokens).toEqual(line.tokens);
      }
    }
    // the shuffle must actually shuffle at least one of the windows
    expect(
      items.some((e) => {
        const it = e.items[0]!;
        return it.kind === 'order-reconstruct' && it.sentences.some((s, i) => s.lineId !== it.correctOrder[i]);
      }),
    ).toBe(true);
  });

  it('listen-no-text: correct fa + 2 distinct distractors from OTHER lines', () => {
    const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));
    const items = exercises.filter((e) => e.kind === 'listen-no-text');
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const ex of items) {
      const item = ex.items[0]!;
      if (item.kind !== 'listen-no-text') throw new Error('kind mismatch');
      const line = linesById.get(item.lineId)!;
      expect(item.options).toHaveLength(3);
      expect(item.options.map((o) => o.id)).toContain(item.correctOptionId);
      expect(item.correctOptionId).toBe(line.id);
      expect(new Set(item.options.map((o) => o.id)).size).toBe(3);
      const distractors = item.options.filter((o) => o.id !== item.correctOptionId);
      for (const d of distractors) {
        expect(d.id).not.toBe(line.id);
        expect(linesById.get(d.id)).toBeTruthy(); // still the same dialogue (AC-949)
      }
      // no JP text leaked into the blind-listening payload
      expect(JSON.stringify(item)).not.toContain(line.tokens[0]!.surface);
    }
  });

  it('fill-token: blanked particle, masked tokens, distractors from the same dialogue', () => {
    const linesById = new Map(dialogue.lines.map((l) => [l.id, l]));
    const items = exercises.filter((e) => e.kind === 'fill-token');
    expect(items.length).toBeGreaterThanOrEqual(3);
    const dialogueParticles = new Set(
      dialogue.lines.flatMap((l) => l.tokens.filter((t) => t.pos === 'particle').map((t) => t.surface)),
    );
    for (const ex of items) {
      const item = ex.items[0]!;
      if (item.kind !== 'fill-token') throw new Error('kind mismatch');
      const line = linesById.get(item.lineId)!;
      expect(item.blankIndex).toBeGreaterThanOrEqual(0);
      expect(item.blankIndex).toBeLessThan(line.tokens.length);
      expect(item.maskedTokens).toHaveLength(line.tokens.length);
      expect(item.maskedTokens[item.blankIndex]).toBeNull();
      // the unmasked tokens stay intact
      item.maskedTokens.forEach((t, i) => {
        if (i !== item.blankIndex) expect(t).toEqual(line.tokens[i]);
      });
      const correctSurface = line.tokens[item.blankIndex]!.surface;
      expect(item.correctOptionId).toBe(`token:${correctSurface}`);
      expect(dialogueParticles.has(correctSurface)).toBe(true);
      expect(item.options).toHaveLength(3);
      expect(item.options.map((o) => o.id)).toContain(item.correctOptionId);
      for (const o of item.options) {
        expect(dialogueParticles.has(o.surface)).toBe(true); // distractors from the dialogue
      }
      expect(new Set(item.options.map((o) => o.id)).size).toBe(3);
      // objective resolves to the lesson-catalog grammar id when the line teaches one
      const gr = line.teaches?.find((id) => id.startsWith('gr-'));
      if (gr) expect(ex.objective).toBe(gr);
    }
  });

  it('throws when a speaker is missing from the character list (defensive)', () => {
    expect(() => generateExercises(dialogue, [])).toThrow(/not in characters/);
  });
});
