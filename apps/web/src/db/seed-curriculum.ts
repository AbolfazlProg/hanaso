/**
 * HANASO — curriculum content seed (TASK-LEARNING-01).
 *
 * Seeds the FK-critical curriculum rows for every bundled chapter:
 * `content.levels` (band policies), `content.units` (the chapter), and one
 * `content.lessons` row per STATION (lesson≡station — DD-090) carrying the
 * station extension columns (core/lineRefs/objective/estLoad/criteria).
 *
 * Follows the M0-10 seed contract: deterministic uuidv5 ids (db/ids.ts) +
 * upserts on natural keys → re-running after a content change updates the same
 * rows. `app` schema rows are NEVER touched (user data).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Pool } from 'pg';
import { parse as parseYaml } from 'yaml';
import { listChapters } from '@/modules/curriculum/content';
import { LEVEL_POLICIES } from '@/modules/curriculum/content/levels';
import type { Chapter } from '@/modules/curriculum/types';
import { compileEngineChapter, engineChapterSchema } from '@/modules/lesson-engine';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import * as schema from '../../db/schema';
import { dialogueContentId, dialogueLineContentId, lessonContentId, levelContentId, unitContentId } from './ids';
import { runSeed as seedDialogueBase, clearSeededContent as clearDialogueBase } from './seed';

export interface CurriculumSeedResult {
  levels: number;
  units: number;
  stations: number;
}

/** Seed level bands (idempotent by code). */
export async function seedLevels(db: ReturnType<typeof drizzle>): Promise<number> {
  let count = 0;
  for (const level of LEVEL_POLICIES) {
    await db
      .insert(schema.levels)
      .values({
        id: levelContentId(level.code),
        code: level.code,
        titleFa: level.titleFa,
        jlptLabel: level.jlptLabel,
        cefrLabel: level.cefrLabel,
        canDoFa: level.canDoFa,
        orderInCourse: level.orderInCourse,
        policy: level.caps,
      })
      .onConflictDoUpdate({
        target: schema.levels.code,
        set: {
          titleFa: sql`excluded.title_fa`,
          jlptLabel: sql`excluded.jlpt_label`,
          cefrLabel: sql`excluded.cefr_label`,
          canDoFa: sql`excluded.can_do_fa`,
          orderInCourse: sql`excluded.order_in_course`,
          policy: sql`excluded.policy`,
          updatedAt: sql`now()`,
        },
      });
    count += 1;
  }
  return count;
}

/** Seed one chapter's unit row + station rows (idempotent) — from a compiled Chapter. */
async function seedChapterObject(
  db: ReturnType<typeof drizzle>,
  chapter: Chapter,
  opts: { withUnitRow?: boolean } = {},
): Promise<{ unitId: string; stations: number }> {
  const dialogueUuid = dialogueContentId(chapter.dialogueSlug);
  const unitUuid = unitContentId(chapter.slug);
  const levelUuid = levelContentId(chapter.levelCode);

  /*
   * FINALIZATION FIX (2026-11-20): Lesson-Engine DRAFT chapters skip the units row.
   * `content.units.dialogue_id` is NOT NULL + UNIQUE (units_dialogue_id_key — DD-090
   * one dialogue anchors one unit), and the chapter-02 rebuild draft legitimately
   * shares the `first-meeting-01` dialogue with the published chapter → a draft
   * units row is impossible without breaking that contract. Draft lesson rows only
   * exist so `app.station_progress.station_id` (FK → content.lessons.id) can record
   * preview progress; `lessons.unit_id` is a LOGICAL ref (no FK), so pointing the
   * draft stations at the draft's deterministic unit uuid with no units row is safe.
   */
  if (opts.withUnitRow !== false) {
    await db
      .insert(schema.units)
      .values({
        id: unitUuid,
        slug: chapter.slug,
        levelId: levelUuid,
        titleFa: chapter.titleFa,
        canDoFa: chapter.canDoFa,
        summaryFa: chapter.summaryFa,
        dialogueId: dialogueUuid,
        orderInLevel: chapter.orderInLevel,
        estMinutes: chapter.estMinutes,
        estLoad: chapter.estLoad,
        bandArc: chapter.bandArc ?? null,
      })
      .onConflictDoUpdate({
        target: schema.units.slug,
        set: {
          levelId: sql`excluded.level_id`,
          titleFa: sql`excluded.title_fa`,
          canDoFa: sql`excluded.can_do_fa`,
          summaryFa: sql`excluded.summary_fa`,
          dialogueId: sql`excluded.dialogue_id`,
          orderInLevel: sql`excluded.order_in_level`,
          estMinutes: sql`excluded.est_minutes`,
          estLoad: sql`excluded.est_load`,
          bandArc: sql`excluded.band_arc`,
          updatedAt: sql`now()`,
        },
      });
  }

  let stationCount = 0;
  for (const station of chapter.stations) {
    const stationUuid = lessonContentId(station.slug);
    const lineRefs = station.lineRefs.map((ref) => dialogueLineContentId(ref));
    await db
      .insert(schema.lessons)
      .values({
        id: stationUuid,
        unitId: unitUuid,
        slug: station.slug,
        titleFa: station.titleFa,
        type: station.type,
        stage: 2,
        jlpt: 'Pre-N5',
        estMinutes: station.estMinutes,
        prerequisiteIds: station.prerequisites.map((ref) => lessonContentId(ref)),
        order: station.order,
        dialogueId: dialogueUuid,
        unitStage: station.core ? 'station' : 'station_optional',
        core: station.core,
        lineRefs,
        objectiveCode: station.objectiveCode,
        estLoad: station.estLoad,
        completionCriteria: station.completion,
        masteryCriteria: station.mastery ?? null,
      })
      .onConflictDoUpdate({
        target: schema.lessons.id,
        set: {
          unitId: sql`excluded.unit_id`,
          titleFa: sql`excluded.title_fa`,
          type: sql`excluded.type`,
          estMinutes: sql`excluded.est_minutes`,
          prerequisiteIds: sql`excluded.prerequisite_ids`,
          order: sql`excluded.order`,
          dialogueId: sql`excluded.dialogue_id`,
          unitStage: sql`excluded.unit_stage`,
          core: sql`excluded.core`,
          lineRefs: sql`excluded.line_refs`,
          objectiveCode: sql`excluded.objective_code`,
          estLoad: sql`excluded.est_load`,
          completionCriteria: sql`excluded.completion_criteria`,
          masteryCriteria: sql`excluded.mastery_criteria`,
          updatedAt: sql`now()`,
        },
      });
    stationCount += 1;
  }

  return { unitId: unitUuid, stations: stationCount };
}

/** Seed one chapter by registry slug (idempotent) — published chapters only. */
export async function seedChapter(
  db: ReturnType<typeof drizzle>,
  chapterSlug: string,
): Promise<{ unitId: string; stations: number }> {
  const chapter = listChapters().find((c) => c.slug === chapterSlug);
  if (!chapter) throw new Error(`unknown chapter for seed: ${chapterSlug}`);
  return seedChapterObject(db, chapter);
}

/**
 * FINALIZATION FIX — load the Lesson-Engine draft chapters (content/lesson-engine/*.yaml)
 * and lower them through the SAME compile path the runtime uses. Their station rows
 * must exist in `content.lessons` before a preview-mode progress write, because
 * `app.station_progress.station_id` carries an FK into `content.lessons` — without
 * the rows every draft-station answer 500s (FK 23503), which broke the owner's
 * chapter-02 preview walkthrough on production (2026-11-20).
 *
 * Same relative path convention as modules/curriculum/server.ts getDraftChapter.
 * Skips unreadable/invalid drafts — a broken draft must never break the seed.
 */
export function loadDraftChapters(): Chapter[] {
  // cwd differs per entrypoint: the Next server resolves the repo from apps/web,
  // the db-cli (migrate container) runs with cwd /app — try both anchors.
  const dir = ['content/lesson-engine', 'apps/web/content/lesson-engine'].find((p) => existsSync(p));
  if (!dir) return [];
  const chapters: Chapter[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.yaml')) continue;
    try {
      const parsed = engineChapterSchema.safeParse(parseYaml(readFileSync(`${dir}/${file}`, 'utf8')));
      if (!parsed.success) continue;
      const { chapter, findings } = compileEngineChapter(parsed.data);
      if (findings.some((f) => f.severity === 'hard')) continue;
      // the draft's dialogue bundle must exist: the lessons rows FK into
      // content.dialogues, and a stub draft (no runtimeDialogueSlug, no bundle
      // yet — e.g. the n5-lesson-02 skeleton) would fail both the base seed and
      // the station insert. Skip it — the runtime preview index still lists it.
      loadDialogueBundle(chapter.dialogueSlug);
      chapters.push(chapter);
    } catch {
      // unreadable draft / missing bundle — skip, never break the seed
    }
  }
  return chapters;
}

/**
 * Opt-in draft seeding: set SEED_LESSON_ENGINE_DRAFTS=1 in the deploy env so the
 * migrate step creates the draft stations' rows. Default OFF — CI/integration
 * counts and every normal deployment stay exactly as before.
 */
export function draftSeedingEnabled(): boolean {
  return process.env.SEED_LESSON_ENGINE_DRAFTS === '1';
}

/** Full curriculum seed (levels + every bundled chapter). */
export async function runCurriculumSeed(options: {
  url: string;
}): Promise<CurriculumSeedResult & { dialogueSlug: string }> {
  const pool = new Pool({
    connectionString: options.url,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'hanaso-seed-curriculum',
  });
  try {
    const db = drizzle(pool);
    // dialogue base rows (characters/dialogues/lines) for every chapter — the
    // B_lesson anchor is skipped for them (stations are the chapter's lessons)
    const drafts = draftSeedingEnabled() ? loadDraftChapters() : [];
    const dialogueSlugs = [...listChapters().map((c) => c.dialogueSlug), ...drafts.map((c) => c.dialogueSlug)];
    await seedDialogueBase({
      url: options.url,
      extraDialogueSlugs: dialogueSlugs,
      noAnchorLessonForSlugs: dialogueSlugs,
    });

    const levels = await seedLevels(db);
    let units = 0;
    let stations = 0;
    for (const chapter of listChapters()) {
      const result = await seedChapter(db, chapter.slug);
      units += 1;
      stations += result.stations;
    }
    // draft chapters seed AFTER the published ones (same idempotent lesson upserts);
    // NO units row for drafts — units_dialogue_id_key (DD-090) forbids a second unit
    // on the shared dialogue, and drafts only need lesson rows for the progress FK.
    for (const chapter of drafts) {
      const result = await seedChapterObject(db, chapter, { withUnitRow: false });
      stations += result.stations;
    }
    return { levels, units, stations, dialogueSlug: dialogueSlugs[0] ?? '' };
  } finally {
    await pool.end();
  }
}

/** TEST-ONLY: remove seeded curriculum rows (stations → units → levels). */
export async function clearCurriculumSeed(options: { url: string }): Promise<void> {
  const pool = new Pool({ connectionString: options.url, max: 1 });
  try {
    const db = drizzle(pool);
    const chapterSlugs = listChapters().map((c) => c.slug);
    const stationIds = chapterSlugs.flatMap((slug) => {
      const chapter = listChapters().find((c) => c.slug === slug)!;
      return chapter.stations.map((s) => lessonContentId(s.slug));
    });
    // station lessons + the anchor lesson rows of the chapter dialogues
    await db.delete(schema.lessons).where(sql`${schema.lessons.id} = ANY(${stationIds}::uuid[])`);
    await db
      .delete(schema.units)
      .where(
        sql`${schema.units.slug} = ANY(${sql.raw(`ARRAY[${chapterSlugs.map((s) => `'${s}'`).join(',')}]::text[]`)})`,
      );
    await clearDialogueBase(
      options,
      listChapters().map((c) => c.dialogueSlug),
    );
  } finally {
    await pool.end();
  }
}
