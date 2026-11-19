/**
 * HANASO — Lesson Engine types (owner-pass 2026-11-19, mission «Lesson Engine Foundation»).
 *
 * The AUTHORING layer between the teaching-framework docs and the product runtime.
 * Design contract (D-0011 — «هیچ موتور موازی»): this schema NEVER runs the walk —
 * `compile.ts` lowers EngineChapter → the EXISTING runtime types
 * (modules/curriculum/types.ts Station/TeachingBlock/Exercise) that StationRunner
 * already executes. Everything here is zod-validated, framework-sourced, and
 * carries BOOKLET PROVENANCE (the gap G2: no source/evidence fields existed).
 *
 * Framework references (see docs/lesson-engine/REQUIREMENTS.md for the full list):
 * - station shape: teaching-framework `implementation/station-blueprint.md` §۵ (YAML data spec)
 * - three levels: `implementation/teaching-interaction-model.md` §۱ (D-0010/0012)
 * - domain flows: grammar-interaction/vocabulary-interaction/kanji-interaction/other-domains blueprints
 * - 10 interaction types: `research/micro-interaction-and-feedback.md` §۱
 * - chapter fields: `curriculum/chapter-blueprint.md` §۱–۲ (۱۴ بلوک + درس ۱۱ فیلد)
 */
import { z } from 'zod';

/* ------------------------------------------------------------- provenance */

/** Source ref to the owner booklet (or any framework doc) — the anti-invention contract. */
export const lessonSourceRefSchema = z.object({
  /** Booklet artifact id (e.g. 'n5-booklet' — the uploaded HANASO-OWNER-EDUCATIONAL-NOTES file). */
  artifact: z.string().min(1),
  /** Lesson number in the booklet (1..15 for the N5 course). */
  lesson: z.number().int().min(1).optional(),
  /** Printed page number from the booklet's 〔ص N〕 markers. */
  page: z.number().int().min(1).optional(),
  /** Section inside the lesson (Ⅰ goals / Ⅱ kaiwa / Ⅲ goi / Ⅳ hyoogen / Ⅴ bumpoo…). */
  section: z.enum(['goals', 'kaiwa', 'goi', 'hyoogen', 'bumpoo', 'renshuu', 'other']).optional(),
  /** Free line locator (numbered item, speaker turn…) for byte-precise provenance. */
  locator: z.string().max(120).optional(),
});
export type LessonSourceRef = z.infer<typeof lessonSourceRefSchema>;

/** Review flags — the honest gap markers (the engine never invents: it flags). */
export const draftFlagSchema = z.enum([
  'needs_review', // content present but ambiguous/low-confidence — owner must confirm
  'missing_source', // no booklet page found for this item
  'prereq_unclear', // prerequisite not evident from booklet order
  'audio_pending', // no audio asset registered yet
  'hypothesis', // framework hypothesis label must survive into content (QC #10)
]);
export type DraftFlag = z.infer<typeof draftFlagSchema>;

/* ------------------------------------------------------------- interactions */

/** The framework's 10 interaction types (micro-interaction-and-feedback §۱). */
export const ENGINE_INTERACTION_TYPES = [
  'select',
  'spot',
  'match',
  'complete',
  'order_build',
  'transform',
  'listen_choose',
  'repeat_record',
  'sort',
  'judge',
] as const;
export type EngineInteractionType = (typeof ENGINE_INTERACTION_TYPES)[number];

/** Teaching/Guided/Independent (D-0010) — the step's stage on the three-level model. */
export const ENGINE_STAGES = ['teach', 'guided', 'independent'] as const;
export type EngineStage = (typeof ENGINE_STAGES)[number];

/** Attempt policy per stage (teaching-interaction-model §۱: unlimited / 2 / 1). */
export const ATTEMPT_POLICY_BY_STAGE: Record<EngineStage, 'unlimited' | 'two' | 'one'> = {
  teach: 'unlimited',
  guided: 'two',
  independent: 'one',
};

export const engineOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  audioRef: z.string().optional(),
  ja: z.string().optional(),
  fa: z.string().optional(),
});
export type EngineOption = z.infer<typeof engineOptionSchema>;

/**
 * One micro-interaction (framework §۴). Distractors MUST carry reasons sourced
 * from recorded errors (D-0015; micro-interaction §۱); the hint ladder is the
 * product's existing F1→F3 (H1=attention, H2=constrain, H3=approximate answer).
 */
export const engineInteractionSchema = z.object({
  type: z.enum(ENGINE_INTERACTION_TYPES),
  promptFa: z.string().min(1).max(200),
  options: z.array(engineOptionSchema).max(4).optional(),
  /** Option id / order / mapping answer — semantics per interaction type. */
  correct: z.union([z.string(), z.array(z.string())]).optional(),
  /** Per-wrong-option explanation (from common_errors — never invented). */
  distractorReasons: z.record(z.string(), z.string().max(300)).optional(),
  /** Hint ladder — H1..H3 (each must carry instructional content). */
  hints: z.array(z.string().max(200)).max(3).optional(),
  feedbackCorrectFa: z.string().max(300).optional(),
  feedbackWrongFa: z.string().max(300).optional(),
  audioRef: z.string().optional(),
  /** Tiles/chunks for order/build/transform. */
  tiles: z.array(z.string().max(40)).max(6).optional(),
  /** Extra distractor tiles beyond the correct answer count. */
  extraTiles: z.array(z.string().max(40)).optional(),
});
export type EngineInteraction = z.infer<typeof engineInteractionSchema>;

/* ------------------------------------------------------------- steps & stations */

/** Domain flow prefixes — the framework's flows G/V/K/P/L/R/W (§۴ REQUIREMENTS). */
export const ENGINE_DOMAINS = [
  'anchor', // chapter conversation station (C-Dialogue opening)
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
] as const;
export type EngineDomain = (typeof ENGINE_DOMAINS)[number];

/** Step transition rules (station-blueprint §۴ + micro-interaction §۴). */
export const ENGINE_TRANSITIONS = ['auto_after_audio', 'on_correct_or_revealed', 'on_view'] as const;
export type EngineTransition = (typeof ENGINE_TRANSITIONS)[number];

export const engineStepSchema = z.object({
  id: z.string().min(1).max(40),
  /** Flow goal — for domain flows this must follow the flow order (validator). */
  goal: z.string().min(1).max(40),
  stage: z.enum(ENGINE_STAGES).default('teach'),
  /** Display card — highlight = the signaling rule (staged-principles F2). */
  card: z
    .object({
      textFa: z.string().max(600).optional(),
      textJa: z.string().max(300).optional(),
      reading: z.string().max(300).optional(),
      /** Dialogue line ref (g0/g7 FonF loop) or audio registry ref. */
      lineRef: z.string().max(80).optional(),
      audioRef: z.string().max(80).optional(),
      highlight: z.string().max(80).optional(),
      imageHint: z.string().max(80).optional(),
    })
    .optional(),
  interaction: engineInteractionSchema.nullable().default(null),
  transition: z.enum(ENGINE_TRANSITIONS).default('on_correct_or_revealed'),
  /** Skip only for reference/optional steps (station-blueprint §۳). */
  skippable: z.boolean().default(false),
  /** Transcript reveal gate for listening steps (D-0007: only after ≥2 listenings). */
  listeningsBeforeTranscript: z.number().int().min(0).max(4).optional(),
  sourceRef: lessonSourceRefSchema.optional(),
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineStep = z.infer<typeof engineStepSchema>;

/** SRS horizons — per-domain config values (vocab 7/30, kanji 14/60; configurable). */
export const engineSrsHorizonSchema = z.object({
  days: z.array(z.number().int()).min(1).max(4),
});
export type EngineSrsHorizon = z.infer<typeof engineSrsHorizonSchema>;

export const engineStationSchema = z.object({
  id: z.string().regex(/^stn-[a-z0-9-]+$/, 'station id must be stn-*'),
  domain: z.enum(ENGINE_DOMAINS),
  type: z.enum(['teaching', 'practice', 'review']),
  /** ONE measurable sentence (station-blueprint §۱ QC1). */
  objectiveFa: z.string().min(4).max(200),
  prerequisites: z.array(z.string()).default([]),
  intro: z
    .object({
      textFa: z.string().max(400),
      conversationRef: z.string().max(80).optional(),
    })
    .optional(),
  steps: z.array(engineStepSchema).min(1),
  /** Guided Application = the LAST 2–3 teaching steps (D-0011). */
  guidedStepIds: z.array(z.string()).max(3).default([]),
  completion: z
    .object({
      kind: z.enum(['task_completed', 'exercise_threshold', 'viewed']),
      threshold: z.number().min(0).max(1).optional(),
    })
    .default({ kind: 'task_completed' }),
  connections: z
    .object({
      next: z.string().optional(),
      practiceStationIds: z.array(z.string()).default([]),
      srs: engineSrsHorizonSchema.optional(),
      /** conversation loop: source line / return line / transfer situation. */
      conversation: z
        .object({
          sourceLineRef: z.string().max(80).optional(),
          returnLineRef: z.string().max(80).optional(),
          transferNoteFa: z.string().max(200).optional(),
        })
        .optional(),
    })
    .default({}),
  fsrsItems: z.array(z.string()).default([]),
  sourceRef: lessonSourceRefSchema.optional(),
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineStation = z.infer<typeof engineStationSchema>;

/* ------------------------------------------------------------- lesson & chapter */

/** Framework's Lesson (chapter-blueprint §۲ — the 11 fields, engine-draft form). */
export const engineLessonSchema = z.object({
  id: z.string().min(1).max(60),
  microObjectiveFa: z.string().min(4).max(300),
  /** 13-stage mapping (conversation-centered §۳) — stage numbers 1..13 covered here. */
  stages: z.array(z.number().int().min(1).max(13)).default([]),
  newKnowledgeRefs: z.array(z.string()).default([]),
  skillLinkFa: z.string().max(200).optional(),
  stationIds: z.array(z.string()).default([]),
  nextLessonId: z.string().optional(),
  sourceRef: lessonSourceRefSchema.optional(),
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineLesson = z.infer<typeof engineLessonSchema>;

/** A dialogue line draft — with the THREE-ORIGIN declaration (conversation-centered §۲.۳). */
export const engineDialogueLineSchema = z.object({
  speaker: z.string().min(1).max(40),
  textJa: z.string().min(1).max(300),
  romaji: z.string().max(300).optional(),
  fa: z.string().max(300).optional(),
  /** Three-origin rule — the validator rejects undeclared lines. */
  origin: z.enum(['prior', 'target', 'guessable', 'transfer_keyword']),
  originNoteFa: z.string().max(160).optional(),
  sourceRef: lessonSourceRefSchema.optional(),
});
export type EngineDialogueLine = z.infer<typeof engineDialogueLineSchema>;

/** Vocabulary target draft (tier rule: T1 ≤1–2 per station — everyday-vocabulary-use §۵). */
export const engineVocabItemSchema = z.object({
  id: z.string().min(1).max(60),
  surface: z.string().min(1).max(40),
  reading: z.string().min(1).max(60),
  romaji: z.string().max(60).optional(),
  meaningFa: z.string().min(1).max(120),
  pos: z.string().max(40).optional(),
  tier: z.enum(['T1', 'T2', 'T3']).default('T2'),
  dialogueLineIndex: z.number().int().min(0).optional(),
  collocations: z.array(z.string().max(80)).max(4).default([]),
  everydayUsage: z
    .object({
      situationFa: z.string().max(200).optional(),
      expectedResponseJa: z.string().max(160).optional(),
      formulaicAlt: z.string().max(160).optional(),
    })
    .optional(),
  sourceRef: lessonSourceRefSchema,
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineVocabItem = z.infer<typeof engineVocabItemSchema>;

/** Grammar target draft (grammar budget ≤2/chapter — prerequisite-and-sequencing §۳). */
export const engineGrammarItemSchema = z.object({
  id: z.string().min(1).max(60),
  patternJa: z.string().min(1).max(120),
  functionFa: z.string().min(1).max(200),
  formulaFa: z.string().max(160).optional(),
  persianEquivalentFa: z.string().max(200).optional(),
  commonErrors: z.array(z.string().max(200)).max(4).default([]),
  examples: z
    .array(
      z.object({
        ja: z.string().max(200),
        reading: z.string().max(200).optional(),
        fa: z.string().max(200).optional(),
        kind: z.enum(['anchor', 'simple', 'varied', 'wrong_correct', 'comparison']).default('simple'),
      }),
    )
    .max(6)
    .default([]),
  sourceRef: lessonSourceRefSchema,
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineGrammarItem = z.infer<typeof engineGrammarItemSchema>;

/** Kanji target draft (D-0006: readings only inside ≥2 anchor words). */
export const engineKanjiItemSchema = z.object({
  id: z.string().min(1).max(40),
  character: z.string().length(1),
  meaningFa: z.string().max(80),
  anchorWords: z
    .array(
      z.object({
        word: z.string().max(40),
        reading: z.string().max(40),
        meaningFa: z.string().max(80),
      }),
    )
    .min(1),
  sourceRef: lessonSourceRefSchema,
  flags: z.array(draftFlagSchema).default([]),
});
export type EngineKanjiItem = z.infer<typeof engineKanjiItemSchema>;

/** The chapter-level draft — everything an agent fills from a booklet lesson. */
export const engineChapterSchema = z.object({
  engineVersion: z.literal(1),
  /** Draft chapters are NEVER published; compile gate requires published:false. */
  published: z.literal(false).default(false),
  id: z.string().regex(/^[a-z0-9-]+$/, 'chapter id slug'),
  bookletLesson: z.number().int().min(1),
  bookletSourceFile: z.string().min(1),
  titleJa: z.string().min(1).max(120),
  titleFa: z.string().min(1).max(160),
  canDoFa: z.string().min(8).max(300),
  level: z.enum(['H0', 'H1', 'H2', 'H3', 'H4']),
  archetype: z.enum(['C-Dialogue', 'C-Kanji', 'C-Review']).default('C-Dialogue'),
  characters: z.array(z.object({ name: z.string().max(40), roleFa: z.string().max(120) })).max(6),
  dialogue: z.array(engineDialogueLineSchema).max(30),
  vocabulary: z.array(engineVocabItemSchema).max(80),
  grammar: z.array(engineGrammarItemSchema).max(2),
  kanji: z.array(engineKanjiItemSchema).max(20),
  lessons: z.array(engineLessonSchema).max(20),
  stations: z.array(engineStationSchema).max(40),
  finalTask: z.object({ descriptionFa: z.string().max(400), sourceRef: lessonSourceRefSchema.optional() }).optional(),
  culturalNote: z.array(z.object({ textFa: z.string().max(300), sourceRef: lessonSourceRefSchema.optional() })).max(2),
  productionAudit: z
    .object({
      coveragePercent: z.number().min(0).max(100).optional(),
      interleavingNewOld: z.string().max(40).optional(),
      auditedBy: z.string().max(80).optional(),
    })
    .optional(),
});
export type EngineChapter = z.infer<typeof engineChapterSchema>;

/* ------------------------------------------------------------- validation report */

export type ValidatorSeverity = 'hard' | 'soft';
export interface ValidatorFinding {
  rule: string;
  severity: ValidatorSeverity;
  message: string;
  location: string;
}
export interface ValidatorReport {
  chapterId: string;
  passed: boolean;
  hardCount: number;
  softCount: number;
  findings: ValidatorFinding[];
  checkedRules: number;
}
