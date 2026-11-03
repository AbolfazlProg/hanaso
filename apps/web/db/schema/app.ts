/**
 * HANASO — app schema (Drizzle) — TASK-SLICE-01 / Issue #40.
 *
 * Source of truth:
 * - dialogue-content-schema.md §۳ (app tables: dialogue_mastery_attempts new,
 *   lesson_progress extended — the separate `unit_progress` table is explicitly NOT built)
 * - database-architecture.md §۴ (lesson_progress base: composite PK (user_id, lesson_id),
 *   current_step, updated_at — «گام درس جاری» for resume)
 *
 * Rules (KB §۱): schema `app` holds USER data — never rewritten from content publishes;
 * attempts are pinned to `revision_id` so republishing a lesson does not invalidate old
 * results. PKs are uuidv7(), timestamps are timestamptz.
 *
 * Slice-scope honesty notes (see docs/research/SLICE-01-REPORT.md):
 * - `user_id` is a LOGICAL ref to the better-auth `app."user"` table (single-named) — the
 *   auth tables land with M1, so no FK here yet.
 * - `revision_id` is a LOGICAL ref to `content.content_revisions` (not in this slice).
 * - `mastery_attempt_id` is a LOGICAL ref per KB §۳ (append-only attempts; logical on purpose).
 * - The runtime of this slice keys unit progress by `dialogueId` (in-memory DEV-ONLY
 *   repository); `lesson_progress` follows the KB's canonical (user_id, lesson_id) PK and
 *   carries `dialogue_id` as the anchor column for dialogue-keyed lookups.
 */
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { dialogues, lessons, units } from './content';

/** Schema `app` — user data; never rewritten from content publishes. */
export const app = pgSchema('app');

/** Per-measure fractions { M1..M5: 0..1 | null } — null = not assessed in this attempt. */
export type MasteryScoresJson = Record<'M1' | 'M2' | 'M3' | 'M4' | 'M5', number | null>;

/** Diagnosis tuples per KB dialogue-mastery-model §۳: [(line_id, objective, severity)]. */
export type WeakPointsJson = { lineId: string; objective: string; severity: 'low' | 'medium' | 'high' }[];

/* ------------------------------------------------------- dialogue_mastery_attempts (§۳ new) */
export const dialogueMasteryAttempts = app.table(
  'dialogue_mastery_attempts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    /** Logical ref → app."user" (better-auth) — FK lands with the auth tables (M1). */
    userId: text('user_id').notNull(),
    /** Cross-schema FK per KB ERD: attempts assess a content dialogue. */
    dialogueId: uuid('dialogue_id')
      .notNull()
      .references(() => dialogues.id),
    /** Logical ref → content.content_revisions — pins the assessed content version. */
    revisionId: uuid('revision_id'),
    /** 1-based attempt number per (user, dialogue). */
    attemptNo: integer('attempt_no').notNull(),
    /** Weighted measure scores (dialogue-mastery-model §۱ M1..M5). */
    scores: jsonb('scores').$type<MasteryScoresJson>().notNull(),
    /** [(line_id, objective, severity)] — the remediation loop's input (G8). */
    weakPoints: jsonb('weak_points')
      .$type<WeakPointsJson>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** 'passed' | 'remediate' | 'incomplete'. */
    outcome: text('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('dialogue_mastery_attempts_user_dialogue_no_key').on(t.userId, t.dialogueId, t.attemptNo),
    index('dialogue_mastery_attempts_dialogue_idx').on(t.dialogueId),
  ],
);

/* ------------------------------------------------------- station_progress (TASK-LEARNING-01) */
/**
 * Station-level state per user (island architecture §۹): the walk record of one
 * lesson≡station node. Station states are LOCKED/AVAILABLE (derived — never stored),
 * then in_progress → completed | needs_retry (+ skipped via Test-Out, equivalent to
 * completed for prerequisite checks — O5-2). `completed` is a WALK fact, never a
 * comprehension claim (understood lives on chapter_progress — DD-048).
 */
export const stationProgress = app.table(
  'station_progress',
  {
    /** Logical ref → app."user" (better-auth) — FK lands with the auth tables (M1). */
    userId: text('user_id').notNull(),
    /** FK → content.lessons (the station row). */
    stationId: uuid('station_id')
      .notNull()
      .references(() => lessons.id),
    /** 'in_progress' | 'completed' | 'needs_retry' | 'skipped'. */
    status: text('status').notNull().default('in_progress'),
    /** Best exercise score 0..1 at this station (null for viewed/task stations). */
    bestScore: real('best_score'),
    /** Total exercise attempts at this station. */
    attemptCount: integer('attempt_count').notNull().default(0),
    /** Resume anchor: last teaching-block id the user reached. */
    currentBlock: text('current_block'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.stationId] }), index('station_progress_user_idx').on(t.userId)],
);

/* ------------------------------------------------------- chapter_progress (TASK-LEARNING-01) */
/**
 * Chapter (unit) A→D aggregate per user (island architecture §۹):
 * started → stations_complete → mastery_attempted → understood | remediate.
 * `understood` is ONLY set from a passed mastery attempt (DD-048) — the gate the
 * island map's 「فهمیدم」 seal displays. Remediation loops are capped (max 3 per
 * session, then "rest + FSRS tomorrow" — station-design §۸).
 */
export const chapterProgress = app.table(
  'chapter_progress',
  {
    /** Logical ref → app."user" (better-auth) — FK lands with the auth tables (M1). */
    userId: text('user_id').notNull(),
    /** FK → content.units (the chapter row). */
    unitId: uuid('unit_id')
      .notNull()
      .references(() => units.id),
    /** 'started' | 'stations_complete' | 'mastery_attempted' | 'understood' | 'remediate'. */
    status: text('status').notNull().default('started'),
    /** Best weighted gate score 0..1 across attempts (display: qualitative only — AC-947). */
    bestWeighted: real('best_weighted'),
    /** Best per-measure fractions { M1..M5: 0..1 | null }. */
    bestMeasures: jsonb('best_measures'),
    /** Logical ref → app.dialogue_mastery_attempts (the passing attempt, when understood). */
    masteryAttemptId: uuid('mastery_attempt_id'),
    /** Remediation loop counter within the current session (reset on pass / new session). */
    remediationCount: integer('remediation_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.unitId] }), index('chapter_progress_user_idx').on(t.userId)],
);

/* ------------------------------------------------------- lesson_progress (§۳ extension — PoC unit record) */
/**
 * The A→D cycle record for a dialogue-anchored unit (PoC flow keyed by its anchor
 * lesson). `status='understood'` is ONLY set from a stage-D mastery attempt with
 * outcome='passed' (DD-048: understood, never "completed"). The chapter flow
 * (TASK-LEARNING-01) writes chapter_progress instead; this table stays untouched.
 */
export const lessonProgress = app.table(
  'lesson_progress',
  {
    /** Logical ref → app."user" (better-auth) — FK lands with the auth tables (M1). */
    userId: text('user_id').notNull(),
    /** Cross-schema FK per KB §۴-۱ (composite PK with user_id — resume «گام درس جاری»). */
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    /** Unit anchor for dialogue-keyed lookups (null for non-dialogue support lessons). */
    dialogueId: uuid('dialogue_id').references(() => dialogues.id),
    currentStep: text('current_step'),
    /** 'A_selfcheck' | 'B_lesson' | 'C_practice' | 'D_mastery' (KB dialogue-based-learning §۲). */
    unitStage: text('unit_stage').notNull().default('A_selfcheck'),
    /** 'active' | 'understood' — understood ONLY from a passed stage-D attempt (DD-048). */
    status: text('status').notNull().default('active'),
    /** Logical ref → app.dialogue_mastery_attempts (the passing attempt, when understood). */
    masteryAttemptId: uuid('mastery_attempt_id'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId] }),
    index('lesson_progress_user_dialogue_idx').on(t.userId, t.dialogueId),
  ],
);
