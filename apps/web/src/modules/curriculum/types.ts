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
  /**
   * TASK-LEARNING-06 (DD-119 / D-3, Issue #103): stable content-id of this word's
   * INDEPENDENT audio asset (never a card index). The asset itself may not be
   * generated yet — resolution goes through the word-audio registry, and the UI
   * falls back to the source-line audio honestly when the file is absent.
   */
  wordAudio?: string;
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
  | 'gist-select' // listening gist (LISTEN station)
  /** TASK-LEARNING-06 (S-K1): kana glyph shown → pick its sound/romaji. Option-based. */
  | 'kana-recognition'
  /** TASK-LEARNING-06 (S-K2): romaji shown → pick the kana glyph. Option-based. */
  | 'kana-recall'
  /** TASK-LEARNING-06 (S-K5): a decodable kana word shown → pick its romaji reading. Option-based. */
  | 'kana-decode'
  /** TASK-LEARNING-08 Addendum-5 §3: the kana SOUND is the question (auto-plays
   *  at question start; replayable) → pick the glyph. Option-based. */
  | 'kana-listening'
  /**
   * TASK-LEARNING-13 (Japanese foundations — exercise type T1, auditory
   * discrimination): a committed WORD recording is the question; the learner
   * picks the written form they heard. `promptJa` carries the word whose
   * PRE-GENERATED asset (hostwords registry — DD-081) plays; the word itself
   * is NEVER rendered before answering (the sound IS the question — same
   * no-leak rule as kana-listening). Used for minimal-pair listening:
   * いえ/いいえ، ここ/ごご، せんせい/せんせ✗، がっこう/がこう✗…
   */
  | 'rule-listening';

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
  /**
   * TASK-LEARNING-04 (EQA-1): EVERY concept the item's prompt requires the learner
   * to handle — including sentence-structure/particles of the prompt (e.g. the の
   * of an audio-meaning line). Declared by the author so gate EQA-1 can verify
   * «assessed ⊆ taught» fully. Absent → the gate verifies targetConcept + the
   * line-anchored structure layer only (semantic remainder = human EQA-9 review).
   */
  assessesConcepts?: string[];
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
  /**
   * TASK-LEARNING-06 (Issue #106 — feedback ladder step F4): the teaching block
   * this exercise returns to when the learner exhausts the ladder (wrong at F3).
   * The grade outcome carries it back so the client can offer «بازگشت به آموزش».
   */
  referenceBlockId?: string;
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
        /**
         * TASK-LEARNING-06 (05A §۴): 'reading' = a reading-moment item — a REAL
         * newly-unlocked word (meaning + reading accompany it; kana words are
         * reading vessels, never L1 vocabulary — DD-119). Rendered with its own
         * label, not as a fading-ladder rung.
         */
        role: 'anchor' | 'near' | 'varied' | 'faded' | 'reading';
        ja: string;
        reading: string;
        fa: string;
        whyFa: string;
        lineRef?: string;
        selfExplainFa?: string;
        /**
         * TASK-LEARNING-08 Addendum-5 §6 — a SHORT, genuinely-useful
         * pronunciation guide (mouth / lips / tongue / airflow / voicing /
         * how the Japanese sound differs from the nearest Persian sound).
         * Authored ONLY where a real pronunciation point exists — never a
         * mechanical template for every word. Persian leads; Latin complements.
         */
        pronFa?: string;
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
  | {
      /**
       * TASK-LEARNING-06 (DD-122 / TB-KanaCard — Issue #94, add-only): one kana
       * glyph presentation card. Purely receptive — the micro-retrieval that
       * follows a 2–3 card packet is a normal `exercise` block (packet rule,
       * LEARNING_SEQUENCE_POLICY §۱-۲), so this block carries NO answer material.
       *
       * Fields come from the KanaItem registry by `kanaId`; only display policy
       * lives here (romaji fading is unit-scoped data — CONTENT-107).
       */
      kind: 'kana-card';
      id: string;
      /** Registry key (kana-items registry: 'hira-a', 'kata-a', …). */
      kanaId: string;
      /** Show the romaji on the card (H1–H6 full · H7–H15 after-answer is exercised via packets · K off). */
      showRomaji: boolean;
      /** Explicitly confusable pair(s) surfaced on the card (discrimination aid — S-K4). */
      confusableNoteFa?: string;
    }
  | { kind: 'exercise'; id: string; exerciseIds: string[] }
  | {
      /**
       * TASK-LEARNING-14 (slide-by-slide teaching — prerequisites slide):
       * reactivates required prior knowledge (retrieval, not re-teaching) and/or
       * gives a FIRST LOOK at glyphs this lesson needs visually (e.g. the big
       * やゆよ forms before the small-kana rule). Purely receptive + playable;
       * never scored, never a walk gate. Glyphs first SEEN here must be declared
       * on Station.introducesGlyphs so the GLYPH-BUDGET gate stays honest.
       */
      kind: 'rule-prereq';
      id: string;
      titleFa: string;
      items: {
        /** A single glyph (registry kana) OR a real word (reading vessel). */
        glyph?: string;
        word?: string;
        readingFa: string;
        noteFa?: string;
        /** True when this item is a FIRST LOOK (not previously taught) — honest badge. */
        firstLook?: boolean;
      }[];
    }
  | {
      /**
       * TASK-LEARNING-14 (slide-by-slide teaching — contrast slide): the minimal
       * pair (or mark pair) side by side, each playable, with mora beat dots and
       * the rule-bearing part highlighted. "Incorrect" forms carry an honest
       * non-word label in `fa`. Optional unscored micro-question.
       */
      kind: 'rule-contrast';
      id: string;
      titleFa?: string;
      a: ContrastWord;
      b: ContrastWord;
      ask?: MicroAsk;
    }
  | {
      /**
       * TASK-LEARNING-14 (slide-by-slide teaching — ONE-concept slide): the
       * decomposed rule-card. `notice` shows the rule at work in a word (worked
       * example); `explain` names the concept in Persian. bodyFa ≤ ~3 sentences;
       * optional mini table (≤3 rows) and optional predict micro-question
       * (guess BEFORE the full explanation — pretesting effect, unscored).
       */
      kind: 'rule-step';
      id: string;
      role: 'notice' | 'explain';
      titleFa?: string;
      bodyFa: string;
      word?: { ja: string; readingFa: string; fa: string; highlight: string[]; beats?: number };
      miniTable?: { headers: string[]; rows: string[][] };
      ask?: MicroAsk;
    }
  | {
      /**
       * TASK-LEARNING-07 (DD-111 / TB-WriteCanvas — owner-ordered capability):
       * handwriting practice block — REAL drawing with correctness evaluation
       * (modes: guided stroke animation / trace over the guide / free recall).
       * Practice-layer only: NEVER a mastery gate (DD-106 «هرگز گیت پیشرفت»).
       * Char-agnostic: kana glyphs today, kanji for future chapters — the engine
       * reports `data_missing` honestly when a character has no stroke data.
       */
      kind: 'writing-practice';
      id: string;
      /** Characters to practice, in order (curated per station — small sets). */
      characters: string[];
      /** First mode the panel opens in (guided for new glyphs, free for review). */
      initialMode: 'guided' | 'trace' | 'free';
      /** Similar-pair discrimination focus (e.g. さ/き, シ/ツ) — rendered as a compare panel. */
      focusPairs?: [string, string][];
      /** Persian instructions shown above the canvas. */
      instructionsFa?: string;
    }
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

/* ------------------------------------------------------------------ rule slides (TASK-LEARNING-14) */

/** One side of a rule-contrast slide (TL-14 — the live minimal-pair comparison). */
export interface ContrastWord {
  ja: string;
  readingFa: string;
  fa: string;
  /** Substrings of `ja` to visually emphasize (the rule-bearing part). */
  highlight: string[];
  /** Mora count for the beat-dot visualization (the visual analog of duration). */
  beats: number;
}

/**
 * Unscored micro-question on a rule slide (TL-14 — pretesting / noticing).
 * Graded server-side exactly like dialogue-player.prediction: the reveal is
 * educational in BOTH outcomes and NEVER reaches the client up front (SKL-013).
 */
export interface MicroAsk {
  questionFa: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  revealFa: string;
}

/* ------------------------------------------------------------------ rule slides (TASK-LEARNING-14) */

/** One side of a rule-contrast slide (TL-14 — the live minimal-pair comparison). */
export interface ContrastWord {
  ja: string;
  readingFa: string;
  fa: string;
  /** Substrings of `ja` to visually emphasize (the rule-bearing part). */
  highlight: string[];
  /** Mora count for the beat-dot visualization (the visual analog of duration). */
  beats: number;
}

/**
 * Unscored micro-question on a rule slide (TL-14 — pretesting / noticing).
 * Graded server-side exactly like dialogue-player.prediction: the reveal is
 * educational in BOTH outcomes and NEVER reaches the client up front (SKL-013).
 */
export interface MicroAsk {
  questionFa: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  revealFa: string;
}

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
  /** TASK-LEARNING-06 (DD-117/122 — Issue #94): kana-teaching station (row/rule unit of chapter 01). */
  'kana',
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
  /**
   * TASK-LEARNING-04 (EQA-1/EQA-5): concepts taught here BEYOND the machine-derivable
   * ones (vocab-card→wordId, expression-card→expressionId, grammar clusters anchored
   * by lineRefs). Use it to register e.g. listening sub-skills
   * (「listen-final-intonation」) so exercise references resolve.
   */
  teachesConcepts?: string[];
  estMinutes: number;
  estLoad: 'light' | 'medium' | 'heavy';
  completion: CompletionCriteria;
  /** Optional station mastery criterion (feeds FSRS/Test-Out — data for M2). */
  mastery?: { threshold: number };
  /**
   * TASK-LEARNING-14 (GLYPH-BUDGET gate): glyphs this station shows for the
   * FIRST time (e.g. H6's first look at the big やゆよ forms inside its rule
   * deck). They are legal inside THIS station's blocks from this point on —
   * everything else must come from previously taught glyphs. Required (even
   * as []) on stations that carry rule-* blocks.
   */
  introducesGlyphs?: string[];
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
  /**
   * TASK-LEARNING-06 (DD-120): chapter-specific Persian labels for the M1..M5
   * slots — e.g. the kana gate maps M1..M5 onto M-K1..M-K5 (recognition/recall/
   * decoding/discrimination/typing) on the SAME shared scoring engine (a parallel
   * gate system is forbidden — DD-117). Absent → the default measure labels are used.
   */
  measureLabelsFa?: Partial<Record<'M1' | 'M2' | 'M3' | 'M4' | 'M5', string>>;
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
  /**
   * TASK-LEARNING-06 (T-79 — DD-123, add-only): story/island sub-units inside the
   * chapter (Ch02 = two story units; Ch01 = four kana islands). Purely a grouping
   * of station slugs for the two-level journey map and per-unit checkpoints —
   * walk order and prereqs stay station-scoped data (unchanged engine).
   * Absent → the chapter renders as a single flat journey (all existing chapters).
   */
  units?: ChapterUnit[];
  /**
   * TASK-LEARNING-06 (DD-117/120 — OQ-053): a chapter that stays LOCKED until the
   * prerequisite chapter reaches `understood` (the kana gate G1 unlocks Ch02).
   * Soft lock: enforced at the journey/page layer, never destroys stored progress.
   */
  prerequisiteChapterSlug?: string;
}

/** A story/island sub-unit of a chapter (T-79 — grouping only, never a walk gate). */
export interface ChapterUnit {
  slug: string;
  titleFa: string;
  /** Short Persian subtitle (e.g. «نوبت‌های ۱–۸» / island promise). */
  summaryFa?: string;
  /** Station slugs belonging to this unit, in walk order (subset of chapter.stations). */
  stationSlugs: string[];
}

/* ------------------------------------------------------------------ kana (TASK-LEARNING-06 — DD-122) */

/** Persian mnemonic for one kana glyph — HONEST review status is part of the data. */
export interface KanaMnemonic {
  /** The shape/sound hook in a few words (e.g. «A لاتین با یک پیچ»). */
  coreImageFa: string;
  /** The full Persian memory story (≤ ~220 chars — rubric R1). */
  storyFa: string;
  /** Honesty label rendered with the story («داستانِ یادسپار» — never presented as fact). */
  honestLabelFa: string;
  /** Glyph(s) this story explicitly contrasts with (discrimination aid). */
  pairGlyphs?: string[];
  /** Katakana mirror: the hiragana glyph this katakana card mirrors (transfer schema). */
  mirrorOf?: string;
  /**
   * Review status (OQ-051): 'draft' = pilot_draft, human review PENDING — the UI
   * must surface the pending-review badge; 'approved' only after human review.
   */
  status: 'draft' | 'approved';
}

/** One kana glyph of the L1 kana foundation (registry mirror of KanjiItem — DD-122). */
export interface KanaItem {
  /** Registry key: 'hira-a' | 'kata-a' | … (stable content id). */
  kanaId: string;
  glyph: string;
  script: 'hira' | 'kata';
  /** Gojūon row ('a-row', 'ka-row', …) — packet schema data. */
  row: string;
  /** HANASO-standard romaji (double-vowel style — R1-03). */
  romaji: string;
  /** Persian note on the romaji where the mapping is not 1:1 (e.g. を/he-row exceptions). */
  romajiNoteFa?: string;
  /** A real decodable word this glyph unlocks first (reading vessel — DD-119: words are NOT L1 cards). */
  hostWord?: { word: string; meaningFa: string };
  /** Documented confusable glyph(s) (S-K4 discrimination data — CONTENT-104). */
  confusableWith?: string[];
  /** Persian mnemonic (may be absent — the card renders without it; status preserved). */
  mnemonic?: KanaMnemonic;
  /** DD-119 kn- card id (data-only; FSRS engine = future task, not integrated). */
  fsrsCardId?: string;
  /** Unit that introduces this glyph (e.g. 'H1'). */
  introducedInUnit: string;
}

/**
 * TASK-LEARNING-08 (WP-2/WP-3 — owner feedback A+B): the per-glyph TEACHING layer
 * joined to KanaItem by kanaId (content/kana-teaching.ts). Separately editable per
 * character (mission §4.2); the base registry stays the structural truth (DD-122).
 */
export interface KanaTeaching {
  /** Registry key — joins KanaItem.kanaId 1:1. */
  kanaId: string;
  /** Content id for the pre-generated audio pair public/audio/kana/<ref>.{opus,m4a}. */
  audioRef: string;
  /** Persian approximation of the sound (the card TEACHES the sound — owner feedback A). */
  pronunciationFa: string;
  /** Persian-speaker pitfall/simile (unrounded u, flap r, wo→o, …). */
  pronunciationNoteFa?: string;
  /** One-line writing hint where stroke order/direction genuinely matters. */
  strokeHintFa?: string;
  /** Rewritten mnemonic (owner quality standard — mission §4.1). */
  mnemonic: {
    /** The shape/sound hook in a few words. */
    coreImageFa: string;
    /** The memory story / shape rule (≤ ~220 chars). */
    storyFa: string;
    /** story = mental image; pattern = shape-recognition rule (beats a weak story). */
    style: 'story' | 'pattern';
    /** Honest label rendered with the story (never presented as fact). */
    honestLabelFa: string;
    /** Glyph(s) this story explicitly contrasts with (discrimination aid). */
    pairGlyphs?: string[];
    /** HOW to tell the pair apart (the concrete cue — owner feedback A). */
    pairHintFa?: string;
    /** Katakana mirror: the hiragana glyph this katakana card transfers from. */
    mirrorOf?: string;
    /** Review status (OQ-051): draft = human review PENDING (honest badge in UI). */
    status: 'draft' | 'approved';
  };
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

/** One resolved sub-unit group (T-79) — a lane/isle of the two-level map. */
export interface JourneyUnitGroup {
  unit: ChapterUnit;
  nodes: JourneyNode[];
  coreCompleted: number;
  coreTotal: number;
}

/** The resolved chapter journey — ORDER COMES FROM DATA (never hardcoded in UI). */
export interface Journey {
  chapter: Chapter;
  level: LevelPolicy;
  nodes: JourneyNode[];
  coreCompleted: number;
  coreTotal: number;
  chapterState: ChapterState | null;
  /** Present only when the chapter declares units[] (T-79) — same nodes, grouped. */
  unitGroups?: JourneyUnitGroup[];
}
