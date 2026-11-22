/**
 * HANASO — Curriculum Plan types (phase ONE of the two-phase production
 * architecture — KANJI-TWO-PHASE §۴, 2026-11-22).
 *
 * «از این به بعد تولید هر فصل باید از دو مرحله مستقل عبور کند.»
 *
 *   PHASE 1 — Curriculum Planning / Content Extraction (THIS schema):
 *     the extraction agent's structured output — extracted items (vocab,
 *     grammar, kanji, expressions), the prerequisite graph, the teaching
 *     order, the station division with each station's goal+type, and the
 *     kanji-station placement. A plan is NOT a lesson: no explanations, no
 *     examples, no hints, no feedback, no assessment copy.
 *
 *   PHASE 2 — Lesson Authoring / Instruction Design (the EXISTING
 *     EngineChapter schema): the authoring agents turn an accepted plan into
 *     a real lesson (teaching steps, worked examples, staged practice, hint
 *     ladder, feedback, final assessment).
 *
 * The two schemas are deliberately DISJOINT in what they carry: a plan that
 * authors teaching copy has overstepped phase 1; a draft whose stations no
 * longer match the accepted plan has oversteled phase 2 (Gate P2 rejects it
 * — «تغییر پیش‌نیازها توسط ایجنت تولید درس بدون اعتبارسنجی مجدد»).
 */
import { z } from 'zod';

/* ------------------------------------------------------------- provenance */

/** Where an extracted item came from — reuse of the draft's source contract. */
export const planSourceRefSchema = z.object({
  artifact: z.string().min(1),
  lesson: z.number().int().min(1).optional(),
  page: z.number().int().min(1).optional(),
  section: z.enum(['goals', 'kaiwa', 'goi', 'hyoogen', 'bumpoo', 'renshuu', 'other']).optional(),
  locator: z.string().max(120).optional(),
});
export type PlanSourceRef = z.infer<typeof planSourceRefSchema>;

/* ------------------------------------------------------------- extracted items */

/** An extracted vocabulary item (surface + reading + meaning + prereqs). */
export const plannedVocabSchema = z.object({
  id: z.string().min(1).max(60),
  surface: z.string().min(1).max(40),
  reading: z.string().min(1).max(60),
  meaningFa: z.string().min(1).max(120),
  /** Source dialogue turn index (0-based) when the item appears in the dialogue. */
  dialogueLineIndex: z.number().int().min(0).optional(),
  /** The station id that will TEACH this item (assignment — validated by Gate P1). */
  teachStationId: z.string().min(1),
  sourceRef: planSourceRefSchema,
});
export type PlannedVocab = z.infer<typeof plannedVocabSchema>;

/** An extracted grammar target (framework budget ≤2 for NEW chapters; the
 *  plan schema carries a generous structural cap — extraction of existing
 *  content is never blocked by a budget meant for new authoring, and Gate P1
 *  surfaces the budget as a SOFT finding for the planning agent to justify). */
export const plannedGrammarSchema = z.object({
  id: z.string().min(1).max(60),
  patternJa: z.string().min(1).max(120),
  functionFa: z.string().min(1).max(200),
  teachStationId: z.string().min(1),
  sourceRef: planSourceRefSchema,
});
export type PlannedGrammar = z.infer<typeof plannedGrammarSchema>;

/** An extracted formulaic expression. */
export const plannedExpressionSchema = z.object({
  id: z.string().min(1).max(60),
  ja: z.string().min(1).max(120),
  reading: z.string().min(1).max(120),
  functionFa: z.string().min(1).max(160),
  teachStationId: z.string().min(1),
  sourceRef: planSourceRefSchema,
});
export type PlannedExpression = z.infer<typeof plannedExpressionSchema>;

/**
 * An extracted KANJI target — phase 1's kanji-station placement unit.
 * `character` must resolve in the N5 reference (Gate P1 checks); anchor words
 * are the extracted vocab surfaces that carry the kanji (≥2 — D-0006) and
 * must be taught at an EARLIER station than the kanji station.
 */
export const plannedKanjiSchema = z.object({
  character: z.string().length(1),
  /** Word ids (planned vocab) that carry this kanji — the anchor vessels. */
  anchorWordIds: z.array(z.string().min(1)).min(2),
  teachStationId: z.string().min(1),
  sourceRef: planSourceRefSchema,
});
export type PlannedKanji = z.infer<typeof plannedKanjiSchema>;

/** The extracted anchor dialogue (raw — no three-origin declaration yet). */
export const plannedDialogueLineSchema = z.object({
  speaker: z.string().min(1).max(40),
  textJa: z.string().min(1).max(300),
  romaji: z.string().max(300).optional(),
  sourceRef: planSourceRefSchema,
});
export type PlannedDialogueLine = z.infer<typeof plannedDialogueLineSchema>;

/* ------------------------------------------------------------- the station map */

/**
 * The planned station — phase 1 owns: id, domain/type, the ONE-sentence
 * objective, walk order, prerequisites, and WHICH items land here. Phase 2
 * may only AUTHOR inside these walls (deviation = Gate P2 finding).
 */
export const plannedStationSchema = z.object({
  id: z.string().regex(/^stn-[a-z0-9-]+$/, 'station id must be stn-*'),
  domain: z.enum([
    'anchor',
    'grammar',
    'vocab',
    'kanji',
    'kana',
    'pron',
    'listening',
    'speaking',
    'reading',
    'writing',
    'practice',
    'review',
    'transfer',
  ]),
  type: z.enum(['teaching', 'practice', 'review']),
  /** ONE measurable sentence — the station's goal (QC1). */
  objectiveFa: z.string().min(4).max(200),
  /** Walk order (topological — Gate P1 validates against prerequisites). */
  order: z.number().int().min(1),
  prerequisites: z.array(z.string()).default([]),
});
export type PlannedStation = z.infer<typeof plannedStationSchema>;

/* ------------------------------------------------------------- the plan */

/** The phase-1 output — the accepted input of phase 2. */
export const curriculumPlanSchema = z.object({
  planVersion: z.literal(1),
  /** The chapter this plan prepares (matches the future EngineChapter.id). */
  chapterId: z.string().regex(/^[a-z0-9-]+$/),
  /** Phase status of THIS document: 'extracted' = phase 1 done, not yet accepted. */
  phaseStatus: z.enum(['extracted', 'accepted']),
  source: z.object({
    artifact: z.string().min(1),
    lesson: z.number().int().min(1),
  }),
  titleFa: z.string().min(1).max(160),
  canDoFa: z.string().min(8).max(300),
  level: z.enum(['H0', 'H1', 'H2', 'H3', 'H4']),
  prerequisiteChapterSlug: z.string().optional(),
  dialogue: z.array(plannedDialogueLineSchema).max(30),
  vocabulary: z.array(plannedVocabSchema).max(80),
  grammar: z.array(plannedGrammarSchema).max(8),
  expressions: z.array(plannedExpressionSchema).max(12),
  kanji: z.array(plannedKanjiSchema).max(20),
  stations: z.array(plannedStationSchema).max(40),
  /** Extraction-time flags — honest gaps that phase 2 or the owner must resolve. */
  notes: z.array(z.string().max(300)).default([]),
});
export type CurriculumPlan = z.infer<typeof curriculumPlanSchema>;

/* ------------------------------------------------------------- gate reports */

export type PlanSeverity = 'hard' | 'soft';

export interface PlanFinding {
  rule: string;
  severity: PlanSeverity;
  message: string;
  location: string;
}

export interface GateP1Report {
  chapterId: string;
  /** Gate P1 verdict: true = the plan is ACCEPTED (phase 2 may begin). */
  passed: boolean;
  hardCount: number;
  softCount: number;
  findings: PlanFinding[];
  checkedRules: number;
}
