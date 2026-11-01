/**
 * TASK-SLICE-01 — unit progress machine (the A→D cycle):
 * full happy path A→B→C→D→understood, rejection of every jump/skip, the mastery gate
 * (D→understood ONLY with a passed attempt), idempotent re-fires, and route hints.
 */
import { describe, expect, it } from 'vitest';
import { ProgressTransitionError, applyProgressEvent, nextRouteForStage } from '@/modules/progress';
import type { UnitProgress } from '@/modules/progress';

const USER = 'user-1';
const DLG = 'dlg-cafe-morning-01';

function start(): UnitProgress {
  return applyProgressEvent(null, DLG, USER, { type: 'unit_started' });
}

describe('progress machine — the full cycle A→D→understood', () => {
  it('happy path: unit_started → dialogue_watched → lesson_studied → practice_done → mastery_passed', () => {
    const a = start();
    expect(a.stage).toBe('A_selfcheck');
    expect(a.status).toBe('active');
    expect(a.userId).toBe(USER);
    expect(a.dialogueId).toBe(DLG);

    const b = applyProgressEvent(a, DLG, USER, { type: 'dialogue_watched' });
    expect(b.stage).toBe('B_lesson');

    const c = applyProgressEvent(b, DLG, USER, { type: 'lesson_studied' });
    expect(c.stage).toBe('C_practice');

    const d = applyProgressEvent(c, DLG, USER, { type: 'practice_done' });
    expect(d.stage).toBe('D_mastery');
    expect(d.status).toBe('active'); // reaching D is NOT understanding (DD-048)

    const done = applyProgressEvent(d, DLG, USER, {
      type: 'mastery_passed',
      attemptId: 'att-1',
    }, { attemptOutcome: 'passed' });
    expect(done.stage).toBe('D_mastery');
    expect(done.status).toBe('understood'); // «فهمیدم» — never "completed"
    expect(done.masteryAttemptId).toBe('att-1');

    // inputs are never mutated (pure transitions)
    expect(a.stage).toBe('A_selfcheck');
    expect(d.status).toBe('active');
  });

  it('the mastery gate: only outcome=passed flips D→understood', () => {
    const d = applyProgressEvent(
      applyProgressEvent(
        applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' }),
        DLG,
        USER,
        { type: 'lesson_studied' },
      ),
      DLG,
      USER,
      { type: 'practice_done' },
    );

    for (const outcome of ['remediate', 'incomplete', undefined] as const) {
      expect(() =>
        applyProgressEvent(d, DLG, USER, { type: 'mastery_passed', attemptId: 'att-x' }, { attemptOutcome: outcome }),
      ).toThrow(ProgressTransitionError);
    }
    const refused = (() => {
      try {
        applyProgressEvent(d, DLG, USER, { type: 'mastery_passed', attemptId: 'att-x' });
        return null;
      } catch (err) {
        return err as ProgressTransitionError;
      }
    })();
    expect(refused?.code).toBe('progress/mastery_not_passed');
  });
});

describe('progress machine — illegal transitions (typed errors)', () => {
  it('rejects events before the unit is started', () => {
    for (const event of [
      { type: 'dialogue_watched' },
      { type: 'lesson_studied' },
      { type: 'practice_done' },
      { type: 'mastery_passed', attemptId: 'att-1' },
    ] as const) {
      expect(() => applyProgressEvent(null, DLG, USER, event)).toThrow(ProgressTransitionError);
    }
    const err = (() => {
      try {
        applyProgressEvent(null, DLG, USER, { type: 'lesson_studied' });
        return null;
      } catch (e) {
        return e as ProgressTransitionError;
      }
    })();
    expect(err?.code).toBe('progress/not_started');
    expect(err?.details).toMatchObject({ from: 'none', event: 'lesson_studied', to: 'C_practice' });
  });

  it('rejects every forward jump (A→C, A→D, B→D, and mastery before D)', () => {
    const a = start();
    const b = applyProgressEvent(a, DLG, USER, { type: 'dialogue_watched' });

    expect(() => applyProgressEvent(a, DLG, USER, { type: 'lesson_studied' })).toThrow(/illegal jump/);
    expect(() => applyProgressEvent(a, DLG, USER, { type: 'practice_done' })).toThrow(/illegal jump/);
    expect(() => applyProgressEvent(b, DLG, USER, { type: 'practice_done' })).toThrow(/illegal jump/);
    expect(() =>
      applyProgressEvent(b, DLG, USER, { type: 'mastery_passed', attemptId: 'x' }, { attemptOutcome: 'passed' }),
    ).toThrow(/requires stage D_mastery/);
  });

  it('carries from/to/event details on the typed error', () => {
    try {
      applyProgressEvent(start(), DLG, USER, { type: 'practice_done' });
      expect.unreachable('must throw');
    } catch (err) {
      const e = err as ProgressTransitionError;
      expect(e.code).toBe('progress/invalid_transition');
      expect(e.details).toEqual({ from: 'A_selfcheck', event: 'practice_done', to: 'D_mastery' });
    }
  });

  it('rejects a record that belongs to another user/dialogue (defensive)', () => {
    const a = start();
    expect(() => applyProgressEvent(a, DLG, 'user-2', { type: 'dialogue_watched' })).toThrow(
      ProgressTransitionError,
    );
    expect(() => applyProgressEvent(a, 'dlg-other', USER, { type: 'dialogue_watched' })).toThrow(
      ProgressTransitionError,
    );
  });
});

describe('progress machine — idempotency (safe re-fires from the UI)', () => {
  it('re-entering the current stage is a no-op', () => {
    const b = applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' });
    const again = applyProgressEvent(b, DLG, USER, { type: 'dialogue_watched' });
    expect(again.stage).toBe('B_lesson');
    expect(again.updatedAt).toBe(b.updatedAt);
  });

  it('re-completing an already-passed milestone is a no-op (user revisits pages)', () => {
    const c = applyProgressEvent(
      applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' }),
      DLG,
      USER,
      { type: 'lesson_studied' },
    );
    const rewired = applyProgressEvent(c, DLG, USER, { type: 'dialogue_watched' });
    expect(rewired.stage).toBe('C_practice');
    expect(rewired.updatedAt).toBe(c.updatedAt);
  });

  it('unit_started on an existing record is an idempotent ping', () => {
    const c = applyProgressEvent(
      applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' }),
      DLG,
      USER,
      { type: 'lesson_studied' },
    );
    expect(applyProgressEvent(c, DLG, USER, { type: 'unit_started' })).toBe(c);
  });

  it('mastery_passed on an already-understood unit is a no-op', () => {
    const done = applyProgressEvent(
      applyProgressEvent(
        applyProgressEvent(
          applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' }),
          DLG,
          USER,
          { type: 'lesson_studied' },
        ),
        DLG,
        USER,
        { type: 'practice_done' },
      ),
      DLG,
      USER,
      { type: 'mastery_passed', attemptId: 'att-1' },
      { attemptOutcome: 'passed' },
    );
    const again = applyProgressEvent(done, DLG, USER, { type: 'mastery_passed', attemptId: 'att-1' }, {
      attemptOutcome: 'passed',
    });
    expect(again).toBe(done);
    // even without re-verifying the attempt (already understood — the gate latched)
    expect(applyProgressEvent(done, DLG, USER, { type: 'mastery_passed', attemptId: 'att-1' })).toBe(done);
  });
});

describe('nextRouteForStage — «ادامه از همان مرحله»', () => {
  it('routes each stage to its page', () => {
    expect(nextRouteForStage(null)).toEqual({ stage: 'none', route: '/poc/dialogue' });
    expect(nextRouteForStage(start())).toEqual({ stage: 'A_selfcheck', route: '/poc/dialogue' });
    const b = applyProgressEvent(start(), DLG, USER, { type: 'dialogue_watched' });
    expect(nextRouteForStage(b)).toEqual({ stage: 'B_lesson', route: '/poc/lesson' });
    const c = applyProgressEvent(b, DLG, USER, { type: 'lesson_studied' });
    expect(nextRouteForStage(c)).toEqual({ stage: 'C_practice', route: '/poc/practice' });
    const d = applyProgressEvent(c, DLG, USER, { type: 'practice_done' });
    expect(nextRouteForStage(d)).toEqual({ stage: 'D_mastery', route: '/poc/assessment' });
    const done = applyProgressEvent(d, DLG, USER, { type: 'mastery_passed', attemptId: 'a' }, {
      attemptOutcome: 'passed',
    });
    expect(nextRouteForStage(done)).toEqual({ stage: 'D_mastery', route: '/poc/dialogue' }); // revisit
  });
});
