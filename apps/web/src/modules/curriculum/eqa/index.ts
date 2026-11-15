/**
 * HANASO — Educational QA gates (TASK-LEARNING-04, Issue #97) — public API.
 *
 * Usage (CI): pnpm --filter web test:eqa   → tests/unit/eqa-gates.test.ts runs
 * runEqa over every bundled chapter and fails on unwaived errors, printing the
 * full Persian report. Docs: docs/engineering/learning/EQA_GATE_REGISTRY.md.
 */
export {
  EQA_POLICY,
  EQA_GATE_REGISTRY,
  RECALL_FIRST_TYPES,
  LINE_COMPREHENSION_TYPES,
  RECEIPT_STATION_TYPES,
  blockIsInteractive,
  blockIsReceptive,
  blockIsExplanation,
  findingKey,
} from './policy';
export type { EqaSeverity, EqaGateId, EqaFinding, EqaGateSpec } from './policy';
export {
  buildTaughtModel,
  hostStationOf,
  stationsInWalkOrder,
  clustersAnchoredToLine,
  wordsAnchoredToLine,
} from './model';
export type { TaughtModel } from './model';
export { gateEqa1, gateEqa2, gateEqa3, gateEqa4, gateEqa5, gateEqa6, gateEqa7Chapter, gateEqa7Levels } from './gates';
export { runEqa } from './run';
export type { EqaRunResult, EqaChapterResult } from './run';
export { renderConsole, renderMarkdown } from './report';
export type { EqaWaiver } from './waivers';
export { matchWaivers } from './waivers';
