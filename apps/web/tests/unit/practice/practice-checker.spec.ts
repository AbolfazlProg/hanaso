/**
 * TASK-SLICE-01 — practice checker (stage C): correct/incorrect per exercise,
 * weak-point mapping to (lineId, objective), severity escalation on taught lines,
 * typed error on unknown exercise ids, order-reconstruct exact-sequence check.
 */
import { describe, expect, it } from 'vitest';
import { resolveSpeaker } from '@/modules/character';
import { loadDialogue } from '@/modules/dialogue/server';
import type { CharacterRef } from '@/modules/dialogue';
import { PracticeCheckError, checkAnswers, isAnswerCorrect } from '@/modules/practice';
import type { Exercise, ExerciseAnswer } from '@/modules/practice';

const dialogue = loadDialogue('cafe-morning-01');
const characters: CharacterRef[] = dialogue.characterIds.map((id) => {
  const { manifest, voiceId } = resolveSpeaker(id);
  return { id: manifest.id, nameJa: manifest.nameJa, nameFa: manifest.nameFa, colorToken: manifest.colorToken, voiceId };
});

// deterministic session built via the generator itself (integration of gen→check)
import { generateExercises } from '@/modules/practice';
const exercises = generateExercises(dialogue, characters);

function allCorrectAnswers(): Record<string, ExerciseAnswer> {
  const answers: Record<string, ExerciseAnswer> = {};
  for (const ex of exercises) {
    const item = ex.items[0]!;
    if (item.kind === 'order-reconstruct') answers[ex.id] = { orderedLineIds: [...item.correctOrder] };
    else answers[ex.id] = { optionId: item.correctOptionId };
  }
  return answers;
}

const teachesByLine = new Map(dialogue.lines.map((l) => [l.id, l.teaches ?? []]));

describe('checkAnswers — correctness', () => {
  it('all-correct session: 100%, no weak points', () => {
    const result = checkAnswers(exercises, allCorrectAnswers(), teachesByLine);
    expect(result.total).toBe(exercises.length);
    expect(result.correctCount).toBe(exercises.length);
    expect(result.weakPoints).toEqual([]);
    expect(result.outcomes.every((o) => o.correct)).toBe(true);
  });

  it('wrong answers map to (lineId, objective) weak points with severity', () => {
    const answers = allCorrectAnswers();
    const target = exercises.find((e) => e.kind === 'fill-token')!;
    answers[target.id] = { optionId: 'token:は' }; // wrong particle
    const result = checkAnswers(exercises, answers, teachesByLine);
    expect(result.correctCount).toBe(exercises.length - 1);
    expect(result.weakPoints).toHaveLength(1);
    const wp = result.weakPoints[0]!;
    const item = target.items[0]!;
    if (item.kind !== 'fill-token') throw new Error('kind mismatch');
    expect(wp.lineId).toBe(item.lineId);
    expect(wp.objective).toBe(target.objective);
    // the first fill-token exercise targets l2 (を) which teaches catalog items → 'high'
    const line = dialogue.lines.find((l) => l.id === item.lineId)!;
    expect(line.teaches?.length ?? 0).toBeGreaterThan(0);
    expect(wp.severity).toBe('high');
  });

  it('order-reconstruct needs the EXACT sequence — a swap is wrong', () => {
    const order = exercises.find((e) => e.kind === 'order-reconstruct')!;
    const item = order.items[0]!;
    if (item.kind !== 'order-reconstruct') throw new Error('kind mismatch');
    const swapped = [...item.correctOrder];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    expect(isAnswerCorrect(order, { orderedLineIds: swapped })).toBe(false);
    expect(isAnswerCorrect(order, { orderedLineIds: [...item.correctOrder] })).toBe(true);
    // partial answer (missing one sentence) is wrong
    expect(isAnswerCorrect(order, { orderedLineIds: item.correctOrder.slice(0, -1) })).toBe(false);
  });

  it('missing answers count as incorrect (still weak-point mapped)', () => {
    const answers = allCorrectAnswers();
    delete answers[exercises[0]!.id];
    const result = checkAnswers(exercises, answers, teachesByLine);
    expect(result.correctCount).toBe(exercises.length - 1);
    expect(result.weakPoints).toHaveLength(1);
    expect(result.weakPoints[0]!.objective).toBe(exercises[0]!.objective);
  });

  it('wrong shape for the kind is incorrect (optionId given to an ordering task)', () => {
    const order = exercises.find((e) => e.kind === 'order-reconstruct')!;
    expect(isAnswerCorrect(order, { optionId: 'whatever' })).toBe(false);
  });

  it('throws a typed error on unknown exercise ids', () => {
    expect(() => checkAnswers(exercises, { 'ex-ghost': { optionId: 'x' } })).toThrow(PracticeCheckError);
    try {
      checkAnswers(exercises, { 'ex-ghost': { optionId: 'x' } });
    } catch (err) {
      expect(err).toBeInstanceOf(PracticeCheckError);
      expect((err as PracticeCheckError).code).toBe('practice/invalid_input');
    }
  });

  it('severity: un-taught lines use the kind base severity', () => {
    const answers = allCorrectAnswers();
    const target = exercises.find((e) => e.kind === 'speaker-identify')!;
    const item = target.items[0]!;
    if (item.kind !== 'speaker-identify') throw new Error('kind mismatch');
    answers[target.id] = { optionId: 'chr-sora' };
    const result = checkAnswers(exercises, answers, teachesByLine);
    const wp = result.weakPoints.find((w) => w.lineId === item.lineId);
    expect(wp).toBeTruthy();
    const line = dialogue.lines.find((l) => l.id === item.lineId)!;
    if (!line.teaches?.length) expect(wp!.severity).toBe('low'); // speaker-identify base
  });

  it('multi-item exercises are rejected explicitly (v1 contract)', () => {
    const twoItems: Exercise = {
      ...exercises[0]!,
      id: 'ex-multi',
      items: [exercises[0]!.items[0]!, exercises[1]!.items[0]!],
    };
    expect(() => isAnswerCorrect(twoItems, { optionId: 'x' })).toThrow(PracticeCheckError);
  });
});
