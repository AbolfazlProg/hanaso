/**
 * HANASO — Chapter content validation tests (TASK-LEARNING-01).
 *
 * Fail-first rule: these tests encode the KB design contracts (island S/O rules,
 * L2 caps, QUESTION quality rules) over the BUNDLED chapter data — a content edit
 * that violates the blueprint breaks the build here, not in review.
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { validateChapter, validateChapterAgainstDialogue } from '@/modules/curriculum/validation';
import { orderedStations, resolveJourney, nextStation, masteryStation } from '@/modules/curriculum/journey';
import { gradeMasterySubmission, gradeExerciseAnswer, toClientExercise } from '@/modules/curriculum/grading';
import type { ExerciseAnswerPayload } from '@/modules/curriculum/grading';
import { loadDialogue } from '@/modules/dialogue/server';
import { FM01_EXERCISES } from '@/modules/curriculum/content/chapter-fm01.exercises';

describe('bundled chapters', () => {
  it('ships exactly the first chapter', () => {
    expect(listChapters().map((c) => c.slug)).toEqual(['first-meeting-01']);
  });
});

describe('chapter first-meeting-01 vs L2 policy', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  const dialogue = loadDialogue(chapter.dialogueSlug);
  const lineIds = dialogue.lines.map((l) => l.id);

  it('passes the full content validation (caps, S/O rules, exercise quality)', () => {
    const violations = [...validateChapter(chapter, level), ...validateChapterAgainstDialogue(chapter, level, lineIds)];
    expect(violations).toEqual([]);
  });

  it('carries the blueprint numbers: 10 core stations + 2 optional, 8 words, 2 grammar clusters, 9 lines', () => {
    expect(chapter.stations.filter((s) => s.core)).toHaveLength(10);
    expect(chapter.stations.filter((s) => !s.core)).toHaveLength(2);
    expect(chapter.words).toHaveLength(8);
    expect(chapter.grammar).toHaveLength(2);
    expect(dialogue.lines).toHaveLength(9);
    expect(chapter.expressions).toHaveLength(4);
  });

  it('walks stations in the authored topological order (never hardcoded in UI)', () => {
    const ordered = orderedStations(chapter).map((s) => s.slug);
    expect(ordered).toEqual([
      'stn-fm01-01-anchor',
      'stn-fm01-02-vocab',
      'stn-fm01-03-grammar-desu',
      'stn-fm01-04-structure',
      'stn-fm01-05-grammar-qa',
      'stn-fm01-06-expression',
      'stn-fm01-07-listen',
      'stn-fm01-08-practice',
      'stn-fm01-09-integrate',
      'stn-fm01-10-mastery',
      'stn-fm01-o1-review',
      'stn-fm01-o2-deepdive',
    ]);
    // prerequisites always precede
    const byslug = new Map(chapter.stations.map((s) => [s.slug, s]));
    for (const slug of ordered) {
      for (const preref of byslug.get(slug)!.prerequisites) {
        expect(ordered.indexOf(preref)).toBeLessThan(ordered.indexOf(slug));
      }
    }
  });

  it('separates the confusable pair じん/ご into the optional deepdive (O3)', () => {
    const deepdive = chapter.stations.find((s) => s.slug === 'stn-fm01-o2-deepdive')!;
    const deepdiveIds = deepdive.blocks.flatMap((b) => (b.kind === 'exercise' ? b.exerciseIds : []));
    expect(deepdiveIds).toContain('ex-fm01-d-01'); // 〜ご preview lives ONLY off-path
    for (const station of chapter.stations.filter((s) => s.core)) {
      const ids = station.blocks.flatMap((b) => (b.kind === 'exercise' ? b.exerciseIds : []));
      for (const id of ids) expect(id).not.toContain('-d-0'); // deepdive items never on the main path
    }
  });

  it('keeps mastery pool items out of every practice block (answer-leak guard)', () => {
    for (const station of chapter.stations) {
      for (const block of station.blocks) {
        if (block.kind !== 'exercise') continue;
        for (const id of block.exerciseIds) {
          expect(chapter.exercises[id]?.assessmentRole).toBe('practice');
        }
      }
    }
    const masteryCount = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_')).length;
    expect(masteryCount).toBe(10); // 2 switches × 5 measures
  });
});

describe('journey resolution', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  it('starts with only the anchor available (everything else locked)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.coreCompleted).toBe(0);
    expect(journey.coreTotal).toBe(10);
    const availabilities = journey.nodes.map((n) => `${n.station.slug}:${n.availability}`);
    expect(availabilities[0]).toBe('stn-fm01-01-anchor:available');
    expect(availabilities.filter((a) => a.endsWith(':available'))).toHaveLength(1);
    expect(nextStation(journey)?.slug).toBe('stn-fm01-01-anchor');
  });

  it('unlocks the next core station as each one completes (data-driven order)', () => {
    const done = ['stn-fm01-01-anchor', 'stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu'].map((slug) => ({
      stationSlug: slug,
      status: 'completed' as const,
      bestScore: 1,
      attemptCount: 4,
    }));
    const journey = resolveJourney(chapter, level, done, {
      status: 'started',
      bestWeighted: null,
      bestMeasures: null,
      remediationCount: 0,
    });
    expect(journey.coreCompleted).toBe(3);
    expect(nextStation(journey)?.slug).toBe('stn-fm01-04-structure');
    // optional review (off grammar-1) is available too but never blocks
    const review = journey.nodes.find((n) => n.station.slug === 'stn-fm01-o1-review')!;
    expect(review.availability).toBe('available');
  });

  it('completes the core path only when all 10 core stations are terminal', () => {
    const coreSlugs = orderedStations(chapter)
      .filter((s) => s.core)
      .map((s) => s.slug);
    const done = coreSlugs.map((slug) => ({
      stationSlug: slug,
      status: 'completed' as const,
      bestScore: 0.8,
      attemptCount: 3,
    }));
    const journey = resolveJourney(chapter, level, done, null);
    expect(journey.coreCompleted).toBe(10);
    expect(masteryStation(chapter)?.slug).toBe('stn-fm01-10-mastery');
  });

  it('treats needs_retry as walked (no dead ends) and skips never gate core', () => {
    const done = orderedStations(chapter)
      .filter((s) => s.core)
      .map((s) => s.slug)
      .map((slug, i) => ({
        stationSlug: slug,
        status: i === 2 ? ('needs_retry' as const) : ('completed' as const),
        bestScore: 0.5,
        attemptCount: 6,
      }));
    const journey = resolveJourney(chapter, level, done, null);
    expect(journey.coreCompleted).toBe(10);
  });
});

describe('grading (server-side answer key)', () => {
  const chapter = getChapter('first-meeting-01')!;

  it('never leaks the answer key through the client payload builder', () => {
    for (const ex of Object.values(chapter.exercises)) {
      const client = toClientExercise(ex) as unknown as Record<string, unknown>;
      expect(client.correctOptionId).toBeUndefined();
      expect(client.correctOrder).toBeUndefined();
      expect(client.acceptedChipOrder).toBeUndefined();
      expect(client.feedback).toBeUndefined();
      expect(JSON.stringify(client)).not.toContain('f1Fa');
    }
  });

  it('grades all three interaction shapes + ladder levels', () => {
    const select = chapter.exercises['ex-fm01-v1-03']!;
    expect(gradeExerciseAnswer(select, { kind: 'option', optionId: 'b' }).correct).toBe(true);
    const wrong1 = gradeExerciseAnswer(select, { kind: 'option', optionId: 'a' }, 1);
    expect(wrong1).toMatchObject({ correct: false, level: 1 });
    expect(wrong1.reveal).toBeUndefined();
    const wrong3 = gradeExerciseAnswer(select, { kind: 'option', optionId: 'a' }, 3);
    expect(wrong3.level).toBe(3);
    expect(wrong3.reveal).toBeTruthy();

    const order = chapter.exercises['ex-fm01-g1-01']!;
    expect(gradeExerciseAnswer(order, { kind: 'order', orderedIds: ['c1', 'c2', 'c3'] }).correct).toBe(true);
    expect(gradeExerciseAnswer(order, { kind: 'order', orderedIds: ['c2', 'c1', 'c3'] }).correct).toBe(false);

    const build = chapter.exercises['ex-fm01-g1-03']!;
    expect(gradeExerciseAnswer(build, { kind: 'build', chipOrder: ['c1', 'c2', 'c3', 'c4'] }).correct).toBe(true);
  });

  it('grades a perfect mastery submission as passed', () => {
    const answers: Record<string, ExerciseAnswerPayload> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      if (ex.correctOptionId) answers[ex.id] = { kind: 'option', optionId: ex.correctOptionId };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder };
      else if (ex.acceptedChipOrder) answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder };
    }
    const result = gradeMasterySubmission(chapter, answers);
    expect(result.outcome).toBe('passed');
    expect(result.weightedScore).toBe(1);
    expect(result.wrongByMeasure).toEqual({});
  });

  it('maps a failing submission to remediation stations (DD-048 point-return)', () => {
    const answers: Record<string, ExerciseAnswerPayload> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      const wrong =
        ex.options?.find((o) => o.id !== ex.correctOptionId)?.id ??
        ex.correctOrder?.slice().reverse() ??
        ex.acceptedChipOrder?.slice().reverse();
      if (ex.correctOptionId && wrong) answers[ex.id] = { kind: 'option', optionId: String(wrong) };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder.slice().reverse() };
      else if (ex.acceptedChipOrder)
        answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder.slice().reverse() };
    }
    const result = gradeMasterySubmission(chapter, answers);
    expect(result.outcome).toBe('remediate');
    expect(Object.keys(result.wrongByMeasure)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5']);
    expect(result.remediationStations).toContain('stn-fm01-02-vocab');
    expect(result.remediationStations).toContain('stn-fm01-07-listen');
  });
});

describe('exercise bank sanity (QUESTION §۲ quality rules)', () => {
  it('uses exactly 3 options for MCQ (minimal-pair 2 allowed)', () => {
    for (const ex of FM01_EXERCISES) {
      if (['listen-minimal-pair'].includes(ex.type)) continue;
      if (ex.options) expect(ex.options).toHaveLength(3);
    }
  });

  it('every exercise carries the full F1..F3 feedback ladder in Persian', () => {
    for (const ex of FM01_EXERCISES) {
      expect(ex.feedback.f1Fa.length).toBeGreaterThan(10);
      expect(ex.feedback.f2HintFa.length).toBeGreaterThan(5);
      expect(ex.feedback.f3ExplainFa.length).toBeGreaterThan(10);
    }
  });

  it('recall-first: practice pool is ≥60% non-Q1 (recognition MCQ is capped)', () => {
    const practice = FM01_EXERCISES.filter((e) => e.assessmentRole === 'practice');
    const pureRecognition = practice.filter((e) => e.type === 'meaning-select');
    expect(pureRecognition.length / practice.length).toBeLessThanOrEqual(0.4);
  });
});
