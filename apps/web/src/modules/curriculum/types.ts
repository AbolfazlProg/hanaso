/**
 * HANASO — Curriculum module types (TASK-LEARNING-01) — PURE module (client-safe).
 *
 * The data-driven chapter/station model per KB DATA-CONTRACT §۲ (chain 1):
 *   Level → Chapter(≡unit) → Dialogue → Lesson(≡station) → Teaching Block →
 *   Question/Activity → Assessment(unit_gate)
 *
 * Hard rules encoded in this model (island architecture 13-05 + composition 14):
 * - Station ORDER is DATA (order + prerequisites), never frontend-hardcoded.
 * - Multiple stations of the same type are allowed (VOCAB-1 → VOCAB-2 …).
 * - Every knowledge station carries `lineRefs` back to the anchor dialogue (CONTENT-080).
 * - completed (station walk fact) ≠ understood (chapter gate fact — DD-048).
 * - Answer keys live in the SERVER content; client payloads are stripped (SKL-013).
 */

/* ------------------------------------------------------------------ levels */

/** Level band policy — DATA not code (LEVEL_BASED_CONTENT_MATRIX §۲, DD-091). */
export interface LevelPolicy {
  /** 'L1'..'L7'. */
  code: string;
  titleFa: string;
  jlptLabel: string;
  cefrLabel: string;
  canDoFa: string;
  orderInCourse: number;
  /** Caps + thresholds + support policies (all PROVISIONAL DD-091 — owner-tunable data). */
  caps: {
    /** Core vocabulary per chapter (LOAD_SPEC §۱). */
    vocabCore: [number, number];
    /** Grammar pattern clusters per chapter. */
    grammarClusters: [number, number];
    /** Core-path stations: [target, hardMax] (S3 — the hardMax is a registered exception ceiling). */
    stationsCore: [number, number];
    /** Chapter duration incl. A and D, minutes. */
    chapterMinutes: [number, number];
    /** Anchor dialogue line count range. */
    dialogueLines: [number, number];
    /** Default listening speed multiplier (L2: 0.9×). */
    listeningSpeed: number;
    /** Furigana policy on the anchor text: 'all' | 'new-only' | 'off'. */
    furigana: 'all' | 'new-only' | 'off';
    /** Mastery gate thresholds (OQ-016 — weighted + per-measure floor). */
    gate: { weighted: number; minMeasure: number };
    /** Max remediation loops per session before "rest + FSRS". */
    maxRemediationLoops: number;
  };
}

/* ------------------------------------------------------------------ words & grammar & expressions */

/** One core vocabulary item (LOAD_SPEC three layers — only 'core' walks the main path). */
export interface VocabItem {
  id: string;
  /** Japanese surface (kanji form when applicable). */
  term: string;
  /**
   * TASK-LEARNING-02: furigana DSL for the term (FuriganaText children format,
   * e.g. '中国人[ちゅうごくじん]') — rendered as group-ruby on the vocab card.
   * Present whenever the term carries kanji (L2: recognition-only kanji).
   */
  termFurigana?: string;
  /** Kana reading. */
  readingKana: string;
  /** HANASO-standard romaji (double-vowel style: sensee, chuugoku — 13-09 §۴-۲). */
  romaji: string;
  /** Persian meaning (compositional gloss, EV-281). */
  meaningFa: string;
  /** Note on the word card (usage/caution). */
  noteFa?: string;
  /** Source dialogue line (first teaching encounter). */
  lineRef: string;
  /** FSRS wave-1 card ids (w- text / s- audio). */
  fsrs: { w: string; s: string };
  /** The word as it appears inside its source line (for in-context highlighting). */
  surfaceInLine: string;
}

/** Grammar pattern cluster (S1: one cluster = one station objective). */
export interface GrammarCluster {
  id: string;
  /** Pattern formula shown on the rule card, e.g. 'AはBです'. */
  pattern: string;
  titleFa: string;
  lineRefs: string[];
  fsrs: { gr: string };
}

/** Functional expression (four-column record — station-design §۴). */
export interface ExpressionItem {
  id: string;
  /** The expression itself. */
  ja: string;
  reading: string;
  /** Function in Persian (what it DOES, not literal translation). */
  functionFa: string;
  /** Formality level. */
  formalityFa: string;
  /** Expected mutual reply. */
  replyFa: string;
  /** Taarof/pragmatic note (EV-278/279) when the expression is formula-like. */
  taarofNoteFa?: string;
  lineRef: string;
  fsrs: { chrk: string };
}

/* ------------------------------------------------------------------ exercises */

/** Exercise types v1 (from the Q-catalog QUESTION_ARCH §۱ — the shapes this chapter needs). */
export type ExerciseType =
  | 'meaning-select' // Q1 — jp→fa recognition
  | 'audio-meaning' // Q2 — sound→meaning
  | 'cloze' // Q3 — particle/pattern blank
  | 'match-in-line' // Q4 — which word appears in this line
  | 'word-order' // Q5 — click-to-order chunks
  | 'speaker-identify' // Q6 — who said it (audio)
  | 'response-select' // Q8 — situational reply
  | 'dialogue-order' // Q13 — order a 3-line mini exchange
  | 'listen-minimal-pair' // Q14 — minimal pair (vowel length / intonation)
  | 'listen-who-asked' // Q15 — audio-only: what/whom was asked about
  | 'produce-template' // Q10 semi-free — build from chips (L2 no-IME pattern)
  | 'gist-select'; // listening gist (LISTEN station)

export type TargetSkill = 'vocab' | 'grammar' | 'listening' | 'expression' | 'production' | 'structure';

/**
 * One exercise — server record (QUESTION_ARCH §۵ 16-field shape, v1 fields).
 * `correctOptionId`/`correctOrder`/`acceptedChipOrder`/`feedback` NEVER reach the
 * client (stripped in the station payload builder — SKL-013 / backend §۴-۲).
 */
export interface Exercise {
  id: string;
  type: ExerciseType;
  targetSkill: TargetSkill;
  /** Objective / pattern / word this item measures (single-target rule §۲-۱). */
  targetConcept: string;
  /** Source dialogue line (CONTENT-085 — exercises are anchored to the dialogue). */
  lineRef?: string;
  difficulty: 1 | 2 | 3;
  /** Persian instruction. */
  promptFa: string;
  /** Japanese prompt surface (cloze sentence, term to recognise…). */
  promptJa?: string;
  /** Reading of promptJa. */
  promptJaReading?: string;
  /** Audio line to play (Q2/Q6/Q14/gist). */
  audioLineRef?: string;
  /** Choice options (MCQ — exactly 3 per QUESTION §۲-۳). */
  options?: { id: string; label: string }[];
  /** Correct option id (select kinds). */
  correctOptionId?: string;
  /** Cloze: the sentence tokens with the blank marked null. */
  clozeTokens?: (string | null)[];
  /** Order kinds: chunk list + correct order. */
  chunks?: { id: string; ja: string }[];
  correctOrder?: string[];
  /** Produce-template: chips + the accepted chip order. */
  chips?: { id: string; ja: string }[];
  acceptedChipOrder?: string[];
  /** Documented-error rationale per distractor (QUESTION §۲-۲). */
  distractorRationaleFa?: Record<string, string>;
  /** Feedback ladder copy (F0 auto / F1 statement / F2 hint / F3 explanation). */
  feedback: {
    f1Fa: string;
    f2HintFa: string;
    f3ExplainFa: string;
  };
  /** practice | mastery_M1..M5 (non-overlapping pools — QUESTION §۵-۱). */
  assessmentRole: 'practice' | `mastery_${'M1' | 'M2' | 'M3' | 'M4' | 'M5'}`;
}

/* ------------------------------------------------------------------ teaching blocks */

/** Teaching Block catalog (DATA-CONTRACT §۲ TB-* — the closed v1 set this chapter renders). */
export type TeachingBlock =
  | { kind: 'scene'; id: string; titleFa: string; bodyFa: string }
  | {
      kind: 'dialogue-player';
      id: string;
      /** Lines to focus/highlight first (the anchor station plays all). */
      focusLineRefs: string[];
      /** Prediction question (stage-2: exactly one — COMPOSITION §۳-۲). */
      prediction?: {
        questionFa: string;
        options: { id: string; label: string }[];
        correctOptionId: string;
        revealFa: string;
      };
      /** Less support on the D-side replay (subtitle hidden until tap). */
      reducedSupport?: boolean;
    }
  | { kind: 'vocab-card'; id: string; wordId: string }
  | { kind: 'expression-card'; id: string; expressionId: string }
  | {
      /** DIA-loop step I — guided discovery (grammar stations). */
      kind: 'guided-discovery';
      id: string;
      displayLineRef: string;
      /** Token surfaces to highlight in the display line. */
      highlightSurfaces: string[];
      compareLineRef?: string;
      questionFa: string;
      options: { id: string; label: string }[];
      correctOptionId: string;
      explainFa: string;
    }
  | {
      /** DIA-loop step A — the Persian rule card. */
      kind: 'rule-card';
      id: string;
      patternJa: string;
      titleFa: string;
      bodyFa: string;
      structureTable?: { headers: string[]; rows: string[][] };
      persianBridgeFa?: string;
      /** Honesty label — the SOV-bridge is our prediction, not proven (station-design §۳). */
      honestyLabelFa?: string;
    }
  | {
      /** Fading example ladder (anchor → near → varied → faded — example standard). */
      kind: 'example-set';
      id: string;
      examples: {
        id: string;
        role: 'anchor' | 'near' | 'varied' | 'faded';
        ja: string;
        reading: string;
        fa: string;
        whyFa: string;
        lineRef?: string;
        selfExplainFa?: string;
      }[];
    }
  | {
      /** Structured input before production (EV-241/242). */
      kind: 'structured-input';
      id: string;
      questionFa: string;
      lineRef?: string;
      options: { id: string; label: string }[];
      correctOptionId: string;
      explainFa: string;
    }
  | { kind: 'exercise'; id: string; exerciseIds: string[] }
  | {
      /** Character scene — INTEGRATE communicative task (C5) and light reactions (C6). */
      kind: 'character-scene';
      id: string;
      steps: { speaker: string; ja: string; reading: string; fa: string; userReply?: UserReplySpec }[];
    }
  | {
      /** Three-listener listening task (station-design §۵). */
      kind: 'listening-task';
      id: string;
      taskId: string;
    }
  | { kind: 'wrap-up'; id: string; titleFa: string; itemsFa: string[]; fsrsNoteFa?: string };

/** The INTEGRATE user reply spec (semi-free: template build / choice — L2 no-IME pattern). */
export interface UserReplySpec {
  kind: 'template-build' | 'choice';
  promptFa: string;
  /** template-build: chips + accepted orders (name slot is free text). */
  chips?: { id: string; ja: string }[];
  acceptedOrders?: string[][];
  /** Name slot: one chip marked as the free-text name position. */
  nameSlotChipId?: string;
  /** choice: options + correct id. */
  options?: { id: string; label: string }[];
  correctOptionId?: string;
}

/* ------------------------------------------------------------------ stations & chapter */

export const STATION_TYPES = [
  'anchor',
  'vocab',
  'grammar',
  'structure',
  'expression',
  'listen',
  'practice',
  'integrate',
  'mastery',
  'review',
  'deepdive',
] as const;
export type StationType = (typeof STATION_TYPES)[number];

/** Completion criterion (station 15-field spec #12). */
export type CompletionCriteria =
  { kind: 'viewed' } | { kind: 'task_completed' } | { kind: 'exercise_threshold'; threshold: number };

/** One station (≡ lesson) of a chapter's island journey. */
export interface Station {
  /** Stable slug: stn-<unit>-<nn>-<type>. */
  slug: string;
  type: StationType;
  titleFa: string;
  /** One-line objective shown on the island map node. */
  objectiveFa: string;
  /** Main path (core) or optional off-path branch (island §۷). */
  core: boolean;
  /** Walk order inside the chapter (topological per O1..O5 — authored data, validated). */
  order: number;
  /** Prerequisite station slugs (empty = entry). */
  prerequisites: string[];
  /** Source dialogue lines (CONTENT-080 — empty only for pure-new-context stations). */
  lineRefs: string[];
  objectiveCode: string;
  estMinutes: number;
  estLoad: 'light' | 'medium' | 'heavy';
  completion: CompletionCriteria;
  /** Optional station mastery criterion (feeds FSRS/Test-Out — data for M2). */
  mastery?: { threshold: number };
  /** The teaching blocks rendered in order — the lesson engine walks this array. */
  blocks: TeachingBlock[];
  /** FSRS wave-1 cards enrolled by completing this station (engine = M2). */
  fsrsItems: string[];
}

/** The mastery gate bank (M1..M5, ≥2 switches per measure — QUESTION §۵-۲). */
export interface MasteryBank {
  /** Measures with their weight (sum = 1 — dialogue-mastery-model §۱). */
  weights: Record<'M1' | 'M2' | 'M3' | 'M4' | 'M5', number>;
  /** Weakness-measure → station slugs (DD-048 point-return — arrays so a measure
   *  probing two stations (e.g. M3: は + ですか) can return to both). */
  weakPointMap: Record<string, string[]>;
}

/** One chapter (≡ unit) — the complete vertical-slice unit. */
export interface Chapter {
  slug: string;
  levelCode: string;
  titleFa: string;
  canDoFa: string;
  summaryFa: string;
  /** Anchor dialogue slug (1:1 — double anchor forbidden, DD-090). */
  dialogueSlug: string;
  orderInLevel: number;
  estMinutes: number;
  estLoad: 'light' | 'medium' | 'heavy';
  bandArc?: string;
  /** Scene card copy shown before the anchor dialogue. */
  sceneFa: string;
  words: VocabItem[];
  grammar: GrammarCluster[];
  expressions: ExpressionItem[];
  stations: Station[];
  /** All exercises (practice + mastery pools) keyed by id. */
  exercises: Record<string, Exercise>;
  mastery: MasteryBank;
}

/* ------------------------------------------------------------------ journey (runtime view) */

/** Derived (never stored) availability — island architecture §۹. */
export type StationAvailability = 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_retry' | 'skipped';

/** Stored station walk state (app.station_progress mirror). */
export interface StationState {
  stationSlug: string;
  status: 'in_progress' | 'completed' | 'needs_retry' | 'skipped';
  bestScore: number | null;
  attemptCount: number;
  currentBlock?: string;
}

/** Stored chapter A→D state (app.chapter_progress mirror). */
export interface ChapterState {
  status: 'started' | 'stations_complete' | 'mastery_attempted' | 'understood' | 'remediate';
  bestWeighted: number | null;
  bestMeasures: Record<string, number | null> | null;
  remediationCount: number;
}

/** One node of the resolved journey (what the island map renders). */
export interface JourneyNode {
  station: Station;
  availability: StationAvailability;
  /** Prereq slugs not yet satisfied (empty when available). */
  blockedBy: string[];
}

/** The resolved chapter journey — ORDER COMES FROM DATA (never hardcoded in UI). */
export interface Journey {
  chapter: Chapter;
  level: LevelPolicy;
  nodes: JourneyNode[];
  coreCompleted: number;
  coreTotal: number;
  chapterState: ChapterState | null;
}
