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
  boolean,
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
    /**
     * TASK-HANASO-17 (§۸ — resume expiration): time of the last MEANINGFUL
     * activity (block advanced / exercise answered / station completed /
     * writing practice / FIRST entry). NOT bumped by a plain re-enter of an
     * in-progress station — entering the page must not extend the 7-day resume
     * deadline. `updated_at` stays the plain row-write clock.
     */
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
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

/* ------------------------------------------------------- practice_sessions (TASK-HANASO-22) */
/**
 * Append-only log of completed independent-practice sessions (Learn↔Practice
 * separation: practice records EVIDENCE, never gates, never FSRS mutations).
 * One row per completed session; partial sessions are only logged when at
 * least one item was answered (the honest exit).
 */
export const practiceSessions = app.table(
  'practice_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    /** Logical ref → app."user" (same learner identity as the walk tables). */
    userId: text('user_id').notNull(),
    /** 'kana' today (registry-scope; future skills extend, never rename). */
    skill: text('skill').notNull(),
    /** 'focused' (one station's glyphs) | 'mixed' (taught scope, weak-weighted). */
    kind: text('kind').notNull(),
    /** Station slug (focused) or chapter scope key (mixed). */
    scopeKey: text('scope_key').notNull(),
    /** [{itemId, objectId, dimension, firstTryCorrect, attempts, ms}] — honest evidence. */
    itemResults: jsonb('item_results')
      .notNull()
      .default(sql`'[]'::jsonb`),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('practice_sessions_user_idx').on(t.userId, t.startedAt)],
);

/* -------------------------------------------------- learning_object_states (TASK-HANASO-22) */
/**
 * Per-user Learning Object practice state (PRACTICE_DESIGN_DECISIONS §4):
 * introduced → practiced → eligible_for_review. HONESTY: no review dates and
 * no `reviewed`/mastery states — the future FSRS engine (M2) consumes
 * eligible_for_review; it is never displayed as a scheduled review.
 */
export const learningObjectStates = app.table(
  'learning_object_states',
  {
    userId: text('user_id').notNull(),
    /** Stable content id — the SAME id the FSRS inventory uses (kn-rec-hira-a, word-あう…). */
    objectId: text('object_id').notNull(),
    skill: text('skill').notNull(),
    /** 'introduced' | 'practiced' | 'eligible_for_review' (evidence-backed only). */
    state: text('state').notNull(),
    /** { K2: {seen, firstTryCorrect}, … } — per-dimension honest counts. */
    dimensionStats: jsonb('dimension_stats')
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.objectId] }), index('learning_object_states_user_idx').on(t.userId)],
);

/* --------------------------------------------------------- fsrs_cards (M2 / OTD-001) */
/**
 * Per-user FSRS card state (fsrs-architecture §۱): ONE row per (user, item) —
 * the ts-fsrs `Card` lives as jsonb, with `due`/`state` lifted into indexed
 * columns for the queue scan. `item_id` is the STABLE content id the inventory
 * ships (`w-watashi`, `gr-desu-identity`, `kn-rec-hira-a`) — never order-based.
 * Enrollment is station-completion-driven (DD-095 §۲, wave 1) via ON CONFLICT
 * DO NOTHING — re-completing a station never resets a card's schedule.
 */
export const fsrsCards = app.table(
  'fsrs_cards',
  {
    userId: text('user_id').notNull(),
    /** Stable content id — same id space as fsrsItems / learning_object_states. */
    itemId: text('item_id').notNull(),
    /** 'w' | 's' | 'w-p' | 's-line' | 'gr' | 'chrk' | 'kn' (inventory enum). */
    kind: text('kind').notNull(),
    /** 1 = recognition (station end), 2 = productive direction (declared data). */
    wave: integer('wave').notNull().default(1),
    /** The station whose completion enrolled this card (traceability). */
    enrolledStation: text('enrolled_station'),
    /** First-encounter dialogue line (fsrs contract §۴ — context review). */
    contextLineId: text('context_line_id'),
    /** ts-fsrs v6 Card (due, stability, difficulty, reps, lapses, state, last_review). */
    card: jsonb('card').$type<import('ts-fsrs').Card>().notNull(),
    /** Lifted from card.due — the queue scan column (indexed, absolute UTC). */
    due: timestamp('due', { withTimezone: true }).notNull(),
    /** Lifted ts-fsrs state: 0=New 1=Learning 2=Review 3=Relearning. */
    cardState: integer('card_state').notNull().default(0),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    lastReviewAt: timestamp('last_review_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] }), index('fsrs_cards_due_idx').on(t.userId, t.due)],
);

/* --------------------------------------------------------- fsrs_revlogs (M2 / OTD-001) */
/**
 * Append-only FSRS review log (fsrs-architecture §۲ — the honest evidence, the
 * replay source and the analytics base for review behavior). `client_review_id`
 * (uuidv7 from the client) is UNIQUE across the table: a retried submit is an
 * ON CONFLICT DO NOTHING — the review is NEVER applied twice (mission rule:
 * جلوگیری از ثبت تکراری). Ratings map AC-945: again/hard/good/easy.
 */
export const fsrsRevlogs = app.table(
  'fsrs_revlogs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: text('user_id').notNull(),
    itemId: text('item_id').notNull(),
    /** Client-generated uuidv7 — the idempotency key (contract: clientReviewId). */
    clientReviewId: uuid('client_review_id').notNull(),
    /** 'again' | 'hard' | 'good' | 'easy' (AC-945 mapping). */
    rating: text('rating').notNull(),
    /** ts-fsrs numeric grade 1..4 (again=1 … easy=4). */
    grade: integer('grade').notNull(),
    /** Card state before / after the review (jsonb ts-fsrs Card). */
    cardBefore: jsonb('card_before').notNull(),
    cardAfter: jsonb('card_after').notNull(),
    /** Lifted from the post-review card — the next time this card is due. */
    dueAfter: timestamp('due_after', { withTimezone: true }).notNull(),
    /** Server clock of the accept (the schedule math uses the client ts-fsrs now). */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('fsrs_revlogs_client_review_id_key').on(t.clientReviewId),
    index('fsrs_revlogs_user_idx').on(t.userId, t.reviewedAt),
    index('fsrs_revlogs_item_idx').on(t.userId, t.itemId),
  ],
);

/* ----------------------------------------------------- learning_events (owner-pass 2026-11-19) */
/**
 * DURABLE learning-behavior event log (the owner's monitoring mandate: «نظارت
 * خیلی شدید بر روند دانش‌آموز» — where learners stall, how they practice).
 * Append-only; written BOTH by server-side emitters (critical events — grading,
 * gates, review results) and the client batch endpoint (behavioral signals),
 * always stamped with the caller's learner id. `quarantined` marks names outside
 * the frozen registry (ADR-016: unknown ⇒ quarantine, never dropped silently) so
 * the future admin panel can audit the taxonomy drift. Retention is swept daily
 * by the worker (HANASO_EVENTS_RETENTION_DAYS, default 180 — OQ-020/021 policy).
 * PRIVACY: no free text / PII — zod-bounded props only; analytics consumers must
 * aggregate with k≥10 before exposing counts (API-AND-EVENTS.md).
 */
export const learningEvents = app.table(
  'learning_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: text('user_id').notNull(),
    /** object_action snake_case — frozen registry names; unknown names quarantine. */
    name: text('name').notNull(),
    /** Flat, bounded props (≤16 keys / ≤4KB) — the event contract payload. */
    props: jsonb('props')
      .notNull()
      .default(sql`'{}'::jsonb`),
    /** 'server' (trust-boundary emitters) | 'client' (behavioral signals via POST /api/events). */
    source: text('source').notNull().default('client'),
    /** true = name outside the registry (kept, flagged — never silently dropped). */
    quarantined: boolean('quarantined').notNull().default(false),
    /** Client clock when provided (batch events carry their local timestamp); server stamp otherwise. */
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('learning_events_user_idx').on(t.userId, t.occurredAt),
    index('learning_events_name_idx').on(t.name, t.receivedAt),
    index('learning_events_received_idx').on(t.receivedAt),
  ],
);
