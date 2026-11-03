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
import { Pool } from 'pg';
import { listChapters } from '@/modules/curriculum/content';
import { LEVEL_POLICIES } from '@/modules/curriculum/content/levels';
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

/** Seed one chapter's unit row + station rows (idempotent). */
export async function seedChapter(
  db: ReturnType<typeof drizzle>,
  chapterSlug: string,
): Promise<{ unitId: string; stations: number }> {
  const chapter = listChapters().find((c) => c.slug === chapterSlug);
  if (!chapter) throw new Error(`unknown chapter for seed: ${chapterSlug}`);

  const dialogueUuid = dialogueContentId(chapter.dialogueSlug);
  const unitUuid = unitContentId(chapter.slug);
  const levelUuid = levelContentId(chapter.levelCode);

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

/** Full curriculum seed (levels + every bundled chapter). */
export async function runCurriculumSeed(options: { url: string }): Promise<CurriculumSeedResult & { dialogueSlug: string }> {
  const pool = new Pool({
    connectionString: options.url,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'hanaso-seed-curriculum',
  });
  try {
    const db = drizzle(pool);
    // dialogue base rows (characters/dialogues/lines + anchor lesson) for every chapter
    const dialogueSlugs = listChapters().map((c) => c.dialogueSlug);
    await seedDialogueBase({ url: options.url, extraDialogueSlugs: dialogueSlugs });

    const levels = await seedLevels(db);
    let units = 0;
    let stations = 0;
    for (const chapter of listChapters()) {
      const result = await seedChapter(db, chapter.slug);
      units += 1;
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
    await db.delete(schema.units).where(sql`${schema.units.slug} = ANY(${sql.raw(`ARRAY[${chapterSlugs.map((s) => `'${s}'`).join(',')}]::text[]`)})`);
    await clearDialogueBase(options, listChapters().map((c) => c.dialogueSlug));
  } finally {
    await pool.end();
  }
}
