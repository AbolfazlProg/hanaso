/**
 * HANASO — Unit progress state machine (TASK-SLICE-01 / Issue #40).
 *
 * Pure transition function for the A→D cycle (KB dialogue-based-learning-model §۲).
 * Illegal transitions throw a typed ProgressTransitionError; idempotent re-fires
 * (re-entering the current stage, or re-completing an already-passed milestone)
 * return the record unchanged so UI buttons can fire safely on revisits.
 *
 * The mastery gate: `mastery_passed` only flips status to 'understood' when the
 * caller passes the attempt's real outcome ('passed'). The API layer looks the
 * attempt up; the machine enforces the rule (testable without HTTP).
 */
import type { ProgressEvent, UnitProgress, UnitStage } from './types';
import { UNIT_STAGES } from './types';

/** Typed illegal-transition error (details carry from/to/event for the API envelope). */
export class ProgressTransitionError extends Error {
  readonly code: 'progress/invalid_transition' | 'progress/mastery_not_passed' | 'progress/not_started';

  constructor(
    code: ProgressTransitionError['code'],
    message: string,
    readonly details: { from: UnitStage | 'none'; event: ProgressEvent['type']; to?: UnitStage | 'understood' },
  ) {
    super(message);
    this.name = 'ProgressTransitionError';
    this.code = code;
  }
}

const STAGE_RANK: Record<UnitStage, number> = {
  A_selfcheck: 0,
  B_lesson: 1,
  C_practice: 2,
  D_mastery: 3,
};

/** Which stage each milestone event moves the unit INTO. */
const EVENT_TARGET_STAGE: Record<Exclude<ProgressEvent['type'], 'mastery_passed'>, UnitStage> = {
  unit_started: 'A_selfcheck',
  dialogue_watched: 'B_lesson',
  lesson_studied: 'C_practice',
  practice_done: 'D_mastery',
};

export interface ApplyEventOptions {
  /**
   * Real outcome of the mastery attempt referenced by a `mastery_passed` event.
   * Required for the D→understood gate (anything ≠ 'passed' → typed error).
   */
  attemptOutcome?: 'passed' | 'remediate' | 'incomplete';
}

/** Apply one cycle event; returns the NEXT record (never mutates the input). */
export function applyProgressEvent(
  current: UnitProgress | null,
  dialogueId: string,
  userId: string,
  event: ProgressEvent,
  options: ApplyEventOptions = {},
): UnitProgress {
  if (current && (current.dialogueId !== dialogueId || current.userId !== userId)) {
    throw new ProgressTransitionError(
      'progress/invalid_transition',
      `progress record belongs to (${current.userId}, ${current.dialogueId}), not (${userId}, ${dialogueId})`,
      { from: current.stage, event: event.type },
    );
  }
  const now = new Date().toISOString();

  // ---- the mastery gate (D → understood, DD-048) ------------------------------
  if (event.type === 'mastery_passed') {
    if (!current) {
      throw new ProgressTransitionError(
        'progress/not_started',
        'cannot pass mastery before the unit is started and its practice is done (D)',
        { from: 'none', event: event.type },
      );
    }
    if (current.status === 'understood') return current; // idempotent re-fire
    if (current.stage !== 'D_mastery') {
      throw new ProgressTransitionError(
        'progress/invalid_transition',
        `mastery_passed requires stage D_mastery (current: ${current.stage}) — no skipping the cycle`,
        { from: current.stage, event: event.type, to: 'understood' },
      );
    }
    if (options.attemptOutcome !== 'passed') {
      throw new ProgressTransitionError(
        'progress/mastery_not_passed',
        `the mastery gate needs a passed attempt (got: ${options.attemptOutcome ?? 'no attempt'})`,
        { from: current.stage, event: event.type, to: 'understood' },
      );
    }
    return { ...current, status: 'understood', masteryAttemptId: event.attemptId, updatedAt: now };
  }

  // ---- stage milestones (A→B→C→D) ---------------------------------------------
  const target = EVENT_TARGET_STAGE[event.type];

  if (!current) {
    if (event.type !== 'unit_started') {
      throw new ProgressTransitionError(
        'progress/not_started',
        `event "${event.type}" needs an existing unit record — post unit_started first`,
        { from: 'none', event: event.type, to: target },
      );
    }
    return { userId, dialogueId, stage: 'A_selfcheck', status: 'active', updatedAt: now };
  }

  if (event.type === 'unit_started') return current; // already started — idempotent ping

  const from = current.stage;
  if (STAGE_RANK[target] === STAGE_RANK[from]) return current; // re-entering current stage
  if (STAGE_RANK[target] > STAGE_RANK[from] + 1) {
    throw new ProgressTransitionError(
      'progress/invalid_transition',
      `illegal jump ${from} → ${target} (event "${event.type}") — the cycle is strictly sequential`,
      { from, event: event.type, to: target },
    );
  }
  if (STAGE_RANK[target] <= STAGE_RANK[from]) return current; // milestone already passed

  return { ...current, stage: target, status: 'active', updatedAt: now };
}

/** Route hint for «ادامه از همان مرحله» on /learn. */
export function nextRouteForStage(progress: UnitProgress | null): {
  stage: UnitStage | 'none';
  route: string;
} {
  if (!progress) return { stage: 'none', route: '/poc/dialogue' };
  switch (progress.stage) {
    case 'A_selfcheck':
      return { stage: progress.stage, route: '/poc/dialogue' };
    case 'B_lesson':
      return { stage: progress.stage, route: '/poc/lesson' };
    case 'C_practice':
      return { stage: progress.stage, route: '/poc/practice' };
    case 'D_mastery':
      // understood units revisit the dialogue; active D goes to the mastery gate
      return { stage: progress.stage, route: progress.status === 'understood' ? '/poc/dialogue' : '/poc/assessment' };
  }
}

/** All stages in order (UI stepper helper). */
export const CYCLE_STAGES: readonly UnitStage[] = UNIT_STAGES;
