/**
 * HANASO — content schema (Drizzle) — TASK-SLICE-01 / Issue #40.
 *
 * Source of truth (columns exactly per KB docs):
 * - dialogue-content-schema.md §۲ (dialogue-anchored extensions: dialogue_scenes,
 *   learning_objectives, comprehension_banks, lessons.dialogue_id, lesson_sections.line_refs,
 *   lesson_items.source_dialogue_line_id, vocab/grammar first_seen_line_id)
 * - database-architecture.md §۳ (base tables: characters/dialogues/dialogue_lines/lessons/
 *   lesson_items/vocab_items/grammar_points — common contract: uuidv7() PK, timestamptz,
 *   no soft-delete)
 * - audio_assets per DD-081 (line/speaker/character/hash/version/format/bitrate/duration/
 *   LUFS + created_at — traceability registry for build-time VOICEVOX output)
 *
 * Slice-scope honesty notes (see docs/research/SLICE-01-REPORT.md):
 * - `sentences`, `units`, `courses`, `content_revisions` are NOT part of this slice, so the
 *   columns referencing them stay LOGICAL refs (plain uuid, no FK) until they land (M3/M1).
 * - generated `search_key` columns + pg_trgm/GIN indexes are intentionally omitted: they
 *   depend on `content.fold_search_key()` and extensions that live with the search slice.
 * - This module is imported by drizzle-kit and tests only — the app itself keeps running on
 *   the in-memory DEV-ONLY repositories until DATABASE_URL lands (M0-10/M1).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** Schema `content` — owned by the content pipeline, rebuilt from the content repo (ADR-008). */
export const content = pgSchema('content');

/** KB common contract: PK uuid with PG18 uuidv7() default. */
const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ characters (§۳-۴ + §۲) */
export const characters = content.table(
  'characters',
  {
    id: id(),
    slug: text('slug').notNull(),
    nameJa: text('name_ja').notNull(),
    nameFa: text('name_fa').notNull(),
    descriptionFa: text('description_fa').notNull(),
    /** TTS voice id — distinct voice per character (FEAT-055 / DD-081 registry). */
    voiceProfile: text('voice_profile').notNull(),
    /** Voice distinctness family (KB audio-multi-speaker §۳ matrix — DD-081 traceability). */
    voiceFamily: text('voice_family'),
    /** DD-067 token name, e.g. 'speaker-1' → var(--color-speaker-1). */
    colorToken: text('color_token').notNull(),
    illustrationRef: text('illustration_ref'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('characters_slug_key').on(t.slug)],
);

/* ------------------------------------------------------------------ dialogues (§۳-۴ + §۲) */
export const dialogues = content.table(
  'dialogues',
  {
    id: id(),
    slug: text('slug').notNull(),
    titleFa: text('title_fa').notNull(),
    situationFa: text('situation_fa').notNull(),
    jlpt: text('jlpt').notNull(),
    /** Illustrated frame reference (FEAT-064) — legacy single-frame column; frames live in dialogue_scenes. */
    sceneRef: text('scene_ref'),
    /** Position inside its unit's dialogue sequence (dialogue = unit anchor, G1). */
    unitOrder: integer('unit_order'),
    turnGapDefaultMs: integer('turn_gap_default_ms').notNull().default(300),
    /** Story series (recursive series table lands with the full content schema) — logical ref. */
    seriesId: uuid('series_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('dialogues_slug_key').on(t.slug)],
);

/* ------------------------------------------------------------------ dialogue_lines (§۳-۴ + §۲) */
export const dialogueLines = content.table(
  'dialogue_lines',
  {
    id: id(),
    dialogueId: uuid('dialogue_id')
      .notNull()
      .references(() => dialogues.id),
    order: integer('order').notNull(),
    speakerCharacterId: uuid('speaker_character_id')
      .notNull()
      .references(() => characters.id),
    /** Logical ref → content.sentences (sentence text/tokens live there; table lands in M3). */
    sentenceId: uuid('sentence_id').notNull(),
    /** 2–3 tonal choices + branch to the next line's order (FEAT-063). */
    decisionPoint: jsonb('decision_point'),
    /** Per-line silence override (KB dialogue-content-schema §۲ — rhythm). */
    gapAfterMs: integer('gap_after_ms'),
    /** Per-line voice override for emotional lines (KB audio-ms §۲). */
    voiceOverride: text('voice_override'),
    emotionTag: text('emotion_tag'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('dialogue_lines_dialogue_id_order_key').on(t.dialogueId, t.order)],
);

/* ------------------------------------------------------------------ dialogue_scenes (§۲ new) */
export const dialogueScenes = content.table(
  'dialogue_scenes',
  {
    id: id(),
    dialogueId: uuid('dialogue_id')
      .notNull()
      .references(() => dialogues.id),
    /** 'wide' | 'speaker-a' | 'speaker-b' | 'close' (DD-012/FEAT-064 framing). */
    frameKey: text('frame_key').notNull(),
    speakerCharacterId: uuid('speaker_character_id').references(() => characters.id),
    illustrationRef: text('illustration_ref').notNull(),
    /** Slow pan/zoom camera note for the renderer. */
    cameraNote: text('camera_note'),
    createdAt: createdAt(),
  },
  (t) => [index('dialogue_scenes_dialogue_id_idx').on(t.dialogueId)],
);

/* ------------------------------------------------------------------ levels (TASK-LEARNING-01) */
/**
 * Level band policies (L1..L7) — DATA, not code (KB LEVEL_BASED_CONTENT_MATRIX §۲,
 * DD-091). The curriculum engine reads caps/thresholds from these rows; an owner
 * decision (e.g. OQ-016 gate hardness) becomes a data change, never a code change.
 */
export const levels = content.table(
  'levels',
  {
    id: id(),
    /** 'L1'..'L7' — stable band code. */
    code: text('code').notNull(),
    titleFa: text('title_fa').notNull(),
    /** Approximate public-facing labels (honesty: planning bands, not official mapping). */
    jlptLabel: text('jlpt_label'),
    cefrLabel: text('cefr_label'),
    /** Can-do summary for this band (Persian). */
    canDoFa: text('can_do_fa'),
    orderInCourse: integer('order_in_course').notNull(),
    /**
     * Band policy bundle (LEVEL_MATRIX §۲ + LOAD_SPEC): vocab/grammar/station/time caps,
     * listening speed, furigana policy, mastery gate thresholds {weighted, minMeasure}.
     * Content-validation tests read the same values from the bundled module.
     */
    policy: jsonb('policy').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('levels_code_key').on(t.code)],
);

/* ------------------------------------------------------------------ units = chapters (TASK-LEARNING-01) */
/**
 * Chapter ≡ Unit (KB CHAPTER_COMPOSITION §۲, DD-090): the smallest "understood"
 * entity — one anchor dialogue + a station graph + a mastery gate. `understood`
 * is only ever issued at this level (DD-048).
 */
export const units = content.table(
  'units',
  {
    id: id(),
    slug: text('slug').notNull(),
    levelId: uuid('level_id')
      .notNull()
      .references(() => levels.id),
    titleFa: text('title_fa').notNull(),
    /** Can-do goal card shown BEFORE the anchor dialogue (COMPOSITION §۳-۲). */
    canDoFa: text('can_do_fa').notNull(),
    /** One-sentence scene summary (Persian). */
    summaryFa: text('summary_fa').notNull(),
    /** Anchor dialogue (1:1 — double-anchor is forbidden, DD-090). */
    dialogueId: uuid('dialogue_id')
      .notNull()
      .references(() => dialogues.id),
    /** Position inside the level. */
    orderInLevel: integer('order_in_level').notNull(),
    estMinutes: integer('est_minutes').notNull(),
    /** 'light' | 'medium' | 'heavy' (LOAD_SPEC §۵). */
    estLoad: text('est_load').notNull(),
    /** Story-arc tag (split chapters share it — S3-3). */
    bandArc: text('band_arc'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('units_slug_key').on(t.slug),
    uniqueIndex('units_dialogue_id_key').on(t.dialogueId),
    index('units_level_order_idx').on(t.levelId, t.orderInLevel),
  ],
);

/* ------------------------------------------------------------------ lessons (§۳-۱ + §۲ + TASK-LEARNING-01 station model) */
/**
 * Lesson ≡ Station (KB DD-090): one learning objective per row, walked as one node
 * of the chapter's island journey. The PoC-era columns stay untouched; the station
 * extension (core/lineRefs/estLoad/criteria) is additive (expand — SKL-006).
 */
export const lessons = content.table(
  'lessons',
  {
    id: id(),
    /** Logical ref → content.units (chapters); FK-able in a later contract phase. */
    unitId: uuid('unit_id').notNull(),
    slug: text('slug').notNull(),
    titleFa: text('title_fa').notNull(),
    /** Station type enum (DATA-CONTRACT §۲): anchor|context|vocab|kana|kanji|grammar|particles|structure|expression|register|pronunciation|culture|listen|practice|integrate|mastery|review|deepdive|extra-examples (+ legacy 'conversation' for the PoC row). */
    type: text('type').notNull(),
    stage: integer('stage').notNull(),
    jlpt: text('jlpt'),
    estMinutes: integer('est_minutes'),
    /** Validated at publish (CONTENT-060 pattern — array refs carry no DB FK). */
    prerequisiteIds: uuid('prerequisite_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    order: integer('order').notNull(),
    /** Unit anchor (G1): NOT NULL for stage-2+ dialogue-anchored units; NULL for support lessons. */
    dialogueId: uuid('dialogue_id').references(() => dialogues.id),
    /** Cycle stage this lesson serves in the A→D model (anchor lesson = 'B_lesson'); NULL for support lessons. */
    unitStage: text('unit_stage'),
    /* ---- station extension (TASK-LEARNING-01) ---- */
    /** Core-path station vs optional off-path branch (island architecture §۷). */
    core: boolean('core').notNull().default(true),
    /** Source dialogue lines (station 15-field spec #4; CONTENT-080) — resolved line UUIDs. */
    lineRefs: uuid('line_refs')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Learning objective code (logical ref → learning_objectives.code). */
    objectiveCode: text('objective_code'),
    /** 'light' | 'medium' | 'heavy' cognitive load (S1 #14). */
    estLoad: text('est_load'),
    /** Completion criterion — {kind:'viewed'|'exercise_threshold'|'task_completed', threshold?}. */
    completionCriteria: jsonb('completion_criteria'),
    /** Mastery criterion (station-level, feeds FSRS/Test-Out) — nullable. */
    masteryCriteria: jsonb('mastery_criteria'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('lessons_unit_id_order_idx').on(t.unitId, t.order),
    index('lessons_type_idx').on(t.type),
  ],
);

/* ------------------------------------------------------------------ learning_objectives (§۲ new) */
export const learningObjectives = content.table(
  'learning_objectives',
  {
    id: id(),
    /** Stable code like 'polite-refusal' — the error→section mapping key (DR-04h). */
    code: text('code').notNull(),
    /** 'vocabulary' | 'kanji' | 'grammar' | 'particle' | 'register' | 'pronunciation' | 'culture' | 'listening' | 'speaker-intent'. */
    kind: text('kind').notNull(),
    titleFa: text('title_fa').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('learning_objectives_code_key').on(t.code)],
);

/* ------------------------------------------------------------------ lesson_sections (§۲ new) */
export const lessonSections = content.table(
  'lesson_sections',
  {
    id: id(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    order: integer('order').notNull(),
    /** 'context' | 'vocab' | 'kanji' | 'kana' | 'grammar' | 'particles' | 'structure' | 'register' | 'pronunciation' | 'culture' | 'wrap'. */
    sectionKind: text('section_kind').notNull(),
    objectiveId: uuid('objective_id').references(() => learningObjectives.id),
    /** Resolved line UUIDs at publish (CONTENT-060 — resolve before publish, no FK). */
    lineRefs: uuid('line_refs')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** Section body per the lesson-design format (title_fa/body_fa/items/...). */
    content: jsonb('content').notNull(),
    masteryThreshold: real('mastery_threshold').notNull().default(0.7),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('lesson_sections_lesson_id_order_key').on(t.lessonId, t.order),
    index('lesson_sections_objective_id_idx').on(t.objectiveId),
  ],
);

/* ------------------------------------------------------------------ comprehension_banks (§۲ new) */
export const comprehensionBanks = content.table(
  'comprehension_banks',
  {
    id: id(),
    dialogueId: uuid('dialogue_id')
      .notNull()
      .references(() => dialogues.id),
    /** 'M1'..'M5' (dialogue-mastery-model §۱ — meaning/vocab/structure/listening/speaker&intent). */
    measure: text('measure').notNull(),
    /** Logical ref → content.dialogue_lines (the target line; nullable for whole-dialogue measures). */
    lineRef: uuid('line_ref'),
    /** Logical FK → learning_objectives.kind (the knowledge type being probed). */
    knowledgeType: text('knowledge_type').notNull(),
    /** { prompt, options, answer, explanation } — kept OUT of exercise_banks (answer-leak, G3/AC-952). */
    payload: jsonb('payload').notNull(),
    /** Pipeline review status ('draft' | 'ready'). */
    status: text('status').notNull().default('draft'),
    createdAt: createdAt(),
  },
  (t) => [index('comprehension_banks_dialogue_id_measure_idx').on(t.dialogueId, t.measure)],
);

/* ------------------------------------------------------------------ lesson_items (§۳-۱ + §۲) */
export const lessonItems = content.table(
  'lesson_items',
  {
    id: id(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    order: integer('order').notNull(),
    /** 'word' | 'kanji' | 'grammar' | 'sentence' + item_id = polymorphic logical ref. */
    itemType: text('item_type').notNull(),
    itemId: uuid('item_id').notNull(),
    /** 'teach' | 'practice' | 'example'. */
    role: text('role').notNull(),
    /** G4: where this FSRS-bound item was first met — links review cards back to the dialogue. */
    sourceDialogueLineId: uuid('source_dialogue_line_id'),
    objectiveId: uuid('objective_id').references(() => learningObjectives.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('lesson_items_lesson_id_order_key').on(t.lessonId, t.order),
    index('lesson_items_item_type_item_id_idx').on(t.itemType, t.itemId),
  ],
);

/* ------------------------------------------------------------------ vocab_items (§۳-۲ + §۲) */
export const vocabItems = content.table(
  'vocab_items',
  {
    id: id(),
    term: text('term').notNull(),
    readingKana: text('reading_kana').notNull(),
    readingRomaji: text('reading_romaji'),
    /** [{ pos, gloss, register? }] (Persian meanings). */
    meaningsFa: jsonb('meanings_fa').notNull(),
    /** Pitch accent mora count (kanjium, CC BY-SA 4.0 — attribution TR-026). */
    pitchMora: smallint('pitch_mora'),
    jlpt: text('jlpt'),
    isCommon: boolean('is_common').notNull().default(false),
    freqRank: integer('freq_rank'),
    /** §۲: first dialogue line where this word appears (initial encounter context). */
    firstSeenLineId: uuid('first_seen_line_id'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('vocab_items_term_reading_kana_key').on(t.term, t.readingKana)],
);

/* ------------------------------------------------------------------ grammar_points (§۳-۲ + §۲) */
export const grammarPoints = content.table(
  'grammar_points',
  {
    id: id(),
    pattern: text('pattern').notNull(),
    titleFa: text('title_fa').notNull(),
    structure: text('structure').notNull(),
    /** Rich Persian explanation. */
    explanationFa: text('explanation_fa').notNull(),
    /** ['casual', 'polite', …] (FEAT-038 register contrast). */
    registerTags: text('register_tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Points worth contrasting side-by-side (FEAT-039) — logical refs. */
    similarTo: uuid('similar_to')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    /** §۲: first dialogue line where this pattern appears. */
    firstSeenLineId: uuid('first_seen_line_id'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('grammar_points_pattern_key').on(t.pattern)],
);

/* ------------------------------------------------------------------ audio_assets (DD-081) */
/**
 * Build-time audio registry per DD-081: for every file the character identity, speaker
 * (voice registry id), dialogue line, version and file specs are traceable. No runtime TTS.
 */
export const audioAssets = content.table(
  'audio_assets',
  {
    id: id(),
    /** The dialogue line this file voices. */
    lineId: uuid('line_id')
      .notNull()
      .references(() => dialogueLines.id),
    /** Voice/speaker id from config/voices.yaml (DD-081 registry). */
    speaker: text('speaker').notNull(),
    /** Character identity (who speaks — distinct voice per character). */
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id),
    /** Content hash — stable content→asset identity (ADR-009 hash naming). */
    hash: text('hash').notNull(),
    version: integer('version').notNull().default(1),
    /** Dual-format per ADR-009: 'opus' (primary) | 'aac' (fallback). */
    format: text('format').notNull(),
    /** Encode bitrate in bits per second. */
    bitrate: integer('bitrate').notNull(),
    durationMs: integer('duration_ms').notNull(),
    /** Integrated loudness (LUFS) of the encoded file. */
    lufs: real('lufs').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('audio_assets_line_speaker_format_version_key').on(t.lineId, t.speaker, t.format, t.version),
    uniqueIndex('audio_assets_hash_key').on(t.hash),
  ],
);
