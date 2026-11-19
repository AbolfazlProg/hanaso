/**
 * HANASO — Lesson Engine (owner-pass 2026-11-19, mission «Lesson Engine Foundation»).
 *
 * Pure authoring layer between the teaching framework and the product runtime.
 * Public surface:
 *  - types/parse: engineChapterSchema (zod) + LessonSourceRef provenance
 *  - validateEngineChapter / formatValidatorReport — the pedagogical validator
 *  - compileEngineChapter — draft → EXISTING runtime Chapter (D-0011: no parallel engine)
 *  - ENGINE_CONFIG — every calibratable framework number in ONE place (Q-004/007/009/011/017/020)
 *
 * Docs: docs/lesson-engine/{REQUIREMENTS,GAP-ANALYSIS,AGENT-PRODUCTION-GUIDE}.md
 */
export * from './types';
export { ENGINE_CONFIG } from './engine-config';
export { validateEngineChapter, formatValidatorReport, type ValidateOptions } from './validate';
export { compileEngineChapter, type CompileResult } from './compile';
