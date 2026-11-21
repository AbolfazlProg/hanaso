/**
 * HANASO — Knowledge Reference Registry (ENGINE-REFORM 2026-11-22).
 *
 * The engine's single source of truth for prerequisite knowledge: a derived,
 * deterministic, searchable, versioned index of every teachable item in the
 * course (words, grammar, expressions, kana glyphs, rule marks, derived forms,
 * declared concepts) with prerequisite relations and first-teaching locations.
 *
 * See types.ts for the design contract and registry.ts for the builder.
 * The CI surface: EQA-8 (prerequisites) + EQA-10 (station contracts) in
 * modules/curriculum/eqa — run by `pnpm eqa` on every push/PR.
 */
export type {
  KnowledgeEntry,
  KnowledgeKind,
  KnowledgePoint,
  KnowledgeRegistry,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  RegistryIntegrityIssue,
  RegistrySource,
  RuleMarkId,
} from './types';
export {
  KNOWLEDGE_REGISTRY_SCHEMA_VERSION,
  RULE_MARK_FA,
  buildKnowledgeRegistry,
  foldScript,
  isTaughtAtOrBefore,
  searchKnowledge,
  taughtAtPoint,
  taughtSetAt,
  wordsInSurface,
} from './registry';
export { collectChapterSurfaces, jaRunsOf, type ContentSurface, type SurfaceRole } from './surfaces';
export { gateEqa8, gateEqa8Course } from './prereq-gate';
export { buildCourseAssessmentEvents, gateEqa10, STATION_TYPE_CONTRACT, type AssessmentEvent } from './contracts';
