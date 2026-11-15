/**
 * HANASO — progress module public API, CLIENT-SAFE (TASK-SLICE-01 / Issue #40).
 * Types + the pure state machine + route hints are shared between the /learn island
 * and the API routes; the node-backed repository is behind `@/modules/progress/server`.
 */
export { UNIT_STAGES, progressEventSchema, progressInputSchema } from './types';
export type { ProgressEvent, ProgressInput, UnitProgress, UnitStage, UnitStatus } from './types';
export { applyProgressEvent, CYCLE_STAGES, nextRouteForStage } from './progress-machine';
export type { ApplyEventOptions } from './progress-machine';
export { ProgressTransitionError } from './progress-machine';
