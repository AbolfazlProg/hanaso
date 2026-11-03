/**
 * HANASO — content seed (TASK-M0-10 DB-layer / Issue #11).
 *
 * Seeds the FK-critical content rows the DB-backed repositories need:
 * `content.characters`, `content.dialogues`, `content.dialogue_lines` and the anchor
 * `content.lessons` row for each dialogue-anchored unit (KB dialogue-content-schema §۲-۳).
 *
 * Scope honesty (KB ADR-008): the FULL content pipeline (lesson_sections, lesson_items,
 * vocab_items, grammar_points, comprehension_banks, audio_assets, …) is rebuilt from the
 * content repo by the publish pipeline — not by this seed. The runtime engine keeps
 * reading those from the bundled YAML/code; only the rows with hard FKs from the `app`
 * schema (attempts → dialogues, lesson_progress → lessons) must exist in SQL. Seed NEVER
 * touches `app` schema rows (user data).
 *
 * Idempotency: deterministic uuidv5 ids (db/ids.ts) + upserts on natural keys —
 * re-running after a content change updates the same rows (content schema is
 * pipeline-owned and rebuildable, KB database-architecture §۱).
 */
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { listCharacters } from '../modules/character/registry';
import { loadVoices } from '../modules/audio/server';
import { loadDialogue } from '../modules/dialogue/content/loader';
import * as schema from '../../db/schema';
import { characterContentId, dialogueContentId, dialogueLineContentId, lessonContentId, unitContentId } from './ids';

/** Dialogue units to seed (slug → Persian title; the slice's PoC unit + chapter dialogues). */
export const SEED_DIALOGUE_SLUGS = ['cafe-morning-01', 'first-meeting-01'] as const;

const SEED_TITLES_FA: Record<string, string> = {
  'cafe-morning-01': 'صبح در کافه — گفت‌وگوی نمونه',
  'first-meeting-01': 'اولین دیدار — معرفی خود در کافه (فصل ۱)',
};

export interface SeedResult {
  characters: number;
  dialogues: number;
  dialogueLines: number;
  lessons: number;
}

/** Persian description per character (placeholder art era — ADR-018; final lore = art track). */
const CHARACTER_DESCRIPTIONS_FA: Record<string, string> = {
  'chr-miki': 'میکی — شخصیت مرکزی؛ دانش‌آموز پرانرژی ژاپنی‌آموز.',
  'chr-yamada': 'یامادا — همدم اول؛ پیشخدمت کافه با لحن مؤدبانه.',
  'chr-sora': 'سورا — همدم دوم؛ همکار و دوست صمیمی.',
};

export async function runSeed(
  options: { url: string; extraDialogueSlugs?: readonly string[] } = { url: '' },
): Promise<SeedResult> {
  const pool = new Pool({
    connectionString: options.url,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'hanaso-seed',
  });
  try {
    const db = drizzle(pool);
    const voices = loadVoices();

    /* ---------------- characters (upsert by slug) ---------------- */
    let characters = 0;
    for (const manifest of listCharacters()) {
      const voice = voices.get(manifest.voiceId);
      await db
        .insert(schema.characters)
        .values({
          id: characterContentId(manifest.id),
          slug: manifest.id,
          nameJa: manifest.nameJa,
          nameFa: manifest.nameFa,
          descriptionFa: CHARACTER_DESCRIPTIONS_FA[manifest.id] ?? `${manifest.nameFa} (${manifest.role})`,
          voiceProfile: manifest.voiceId,
          voiceFamily: voice?.family ?? null,
          colorToken: manifest.colorToken,
          illustrationRef: null, // placeholder art (ADR-018) — final refs arrive with the art track
        })
        .onConflictDoUpdate({
          target: schema.characters.slug,
          set: {
            nameJa: manifest.nameJa,
            nameFa: manifest.nameFa,
            descriptionFa: sql`excluded.description_fa`,
            voiceProfile: manifest.voiceId,
            voiceFamily: sql`excluded.voice_family`,
            colorToken: manifest.colorToken,
            updatedAt: sql`now()`,
          },
        });
      characters += 1;
    }

    /* ---------------- dialogues + lines + anchor lesson ---------------- */
    let dialogues = 0;
    let dialogueLines = 0;
    let lessons = 0;

    const slugs = options.extraDialogueSlugs?.length
      ? [...new Set([...SEED_DIALOGUE_SLUGS, ...options.extraDialogueSlugs])]
      : [...SEED_DIALOGUE_SLUGS];
    for (const slug of slugs) {
      const dialogue = loadDialogue(slug);
      const dialogueUuid = dialogueContentId(slug);

      await db
        .insert(schema.dialogues)
        .values({
          id: dialogueUuid,
          slug,
          titleFa: SEED_TITLES_FA[slug] ?? slug,
          situationFa: dialogue.scene,
          jlpt: 'Pre-N5',
          unitOrder: 1,
          turnGapDefaultMs: dialogue.turnGapDefaultMs,
        })
        .onConflictDoUpdate({
          target: schema.dialogues.slug,
          set: {
            titleFa: sql`excluded.title_fa`,
            situationFa: sql`excluded.situation_fa`,
            unitOrder: sql`excluded.unit_order`,
            turnGapDefaultMs: sql`excluded.turn_gap_default_ms`,
            updatedAt: sql`now()`,
          },
        });
      dialogues += 1;

      for (const [index, line] of dialogue.lines.entries()) {
        await db
          .insert(schema.dialogueLines)
          .values({
            id: dialogueLineContentId(line.id),
            dialogueId: dialogueUuid,
            order: index + 1,
            speakerCharacterId: characterContentId(line.speaker),
            // Logical ref → content.sentences (table lands with the full content schema, M3)
            sentenceId: dialogueLineContentId(line.id),
            gapAfterMs: line.gapAfterMs ?? null,
            voiceOverride: line.voiceOverride ?? null,
            emotionTag: line.emotionTag ?? null,
          })
          .onConflictDoUpdate({
            target: [schema.dialogueLines.dialogueId, schema.dialogueLines.order],
            set: {
              speakerCharacterId: sql`excluded.speaker_character_id`,
              sentenceId: sql`excluded.sentence_id`,
              gapAfterMs: sql`excluded.gap_after_ms`,
              voiceOverride: sql`excluded.voice_override`,
              emotionTag: sql`excluded.emotion_tag`,
            },
          });
        dialogueLines += 1;
      }

      // Anchor lesson (unitStage='B_lesson') — the lesson_progress FK target (KB §۳).
      await db
        .insert(schema.lessons)
        .values({
          id: lessonContentId(slug),
          unitId: unitContentId(slug), // logical ref — units table lands in M3
          slug,
          titleFa: SEED_TITLES_FA[slug] ?? slug,
          type: 'conversation',
          stage: 2,
          jlpt: 'Pre-N5',
          estMinutes: 10,
          order: 1,
          dialogueId: dialogueUuid,
          unitStage: 'B_lesson',
        })
        .onConflictDoUpdate({
          target: schema.lessons.id,
          set: {
            titleFa: sql`excluded.title_fa`,
            dialogueId: sql`excluded.dialogue_id`,
            unitStage: sql`excluded.unit_stage`,
            updatedAt: sql`now()`,
          },
        });
      lessons += 1;
    }

    return { characters, dialogues, dialogueLines, lessons };
  } finally {
    await pool.end();
  }
}

/** Drop all seeded content rows (TEST-ONLY — never runs against production). */
export async function clearSeededContent(
  options: { url: string },
  extraDialogueSlugs: readonly string[] = [],
): Promise<void> {
  const pool = new Pool({ connectionString: options.url, max: 1 });
  try {
    const db = drizzle(pool);
    const slugs = [...new Set([...SEED_DIALOGUE_SLUGS, ...extraDialogueSlugs])];
    const dialogueUuids = slugs.map((slug) => dialogueContentId(slug));
    await db.delete(schema.dialogueLines).where(sql`${schema.dialogueLines.dialogueId} = ANY(${dialogueUuids}::uuid[])`);
    await db.delete(schema.lessons).where(eq(schema.lessons.unitStage, 'B_lesson'));
    await db.delete(schema.dialogues).where(sql`${schema.dialogues.slug} = ANY(${sql.raw(`ARRAY[${slugs.map((s) => `'${s}'`).join(',')}]::text[]`)})`);
    await db.delete(schema.characters);
  } finally {
    await pool.end();
  }
}
