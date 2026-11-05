/**
 * TASK-M0-10 — migrations + seed against REAL PostgreSQL 18 (Issue #11).
 *
 * Covers: fresh apply, idempotent re-apply (the deploy re-run case), deterministic
 * seeded uuids (stable across re-runs) and the two-schema layout the KB requires.
 */
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '@/db/migrate';
import { runSeed } from '@/db/seed';
import { dialogueContentId, lessonContentId, characterContentId } from '@/db/ids';
import { ensureTestDatabase } from './helpers';

let pool: Pool | null = null;

beforeAll(async () => {
  const url = await ensureTestDatabase();
  pool = new Pool({ connectionString: url, max: 2 });
});

afterAll(async () => {
  await pool?.end();
});

describe('migrations (drizzle SQL, direct connection)', () => {
  it('created both schemas and the bookkeeping table', async () => {
    const { rows } = await pool!.query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name IN ('content', 'app', 'drizzle') ORDER BY schema_name`,
    );
    expect(rows.map((r) => r.schema_name)).toEqual(['app', 'content', 'drizzle']);
  });

  it('re-running the migrator is a no-op (idempotent deploy re-run)', async () => {
    const before = (await pool!.query<{ count: string }>('SELECT count(*) AS count FROM drizzle.__drizzle_migrations'))
      .rows[0]!.count;
    await runMigrations({ url: process.env.DIRECT_DATABASE_URL! });
    const after = (await pool!.query<{ count: string }>('SELECT count(*) AS count FROM drizzle.__drizzle_migrations'))
      .rows[0]!.count;
    expect(after).toBe(before);
  });
});

describe('seed (idempotent, deterministic ids)', () => {
  it('seeded characters, both dialogues with their lines, and the lesson rows', async () => {
    const counts = async (table: string) =>
      Number((await pool!.query<{ count: string }>(`SELECT count(*) AS count FROM ${table}`)).rows[0]!.count);

    // TASK-LEARNING-01: the seed carries the PoC unit + chapter dialogues; the
    // curriculum seed adds both chapters' station lesson rows (helpers run
    // both). Counts stay exact — determinism is the contract.
    // TASK-LEARNING-06/07: 4 characters (kim added) · 3 dialogues (PoC +
    // first-meeting-01 [13 lines] + kana-welcome-01 [3 lines]) · 54 lessons
    // (1 anchor B_lesson + 31 Ch01 stations + 22 Ch02 stations).
    expect(await counts('content.characters')).toBe(4);
    expect(await counts('content.dialogues')).toBe(3);
    expect(await counts('content.dialogue_lines')).toBe(26);
    expect(await counts('content.lessons')).toBe(54); // 1 anchor B_lesson + 53 stations
  });

  it('uses deterministic uuidv5 ids — re-seeding updates the same rows', async () => {
    const dialogueId = dialogueContentId('cafe-morning-01');
    const lessonId = lessonContentId('cafe-morning-01');
    const mikiId = characterContentId('chr-miki');

    const before = (
      await pool!.query<{ id: string }>(`SELECT id FROM content.dialogues WHERE slug = 'cafe-morning-01'`)
    ).rows[0]!;
    expect(before.id).toBe(dialogueId);

    await runSeed({ url: process.env.DIRECT_DATABASE_URL! }); // idempotent re-run

    const after = await pool!.query<{ count: string }>('SELECT count(*) AS count FROM content.dialogues');
    expect(Number(after.rows[0]!.count)).toBe(3); // no duplicates (PoC + fm01 + kana-welcome)

    const lesson = (
      await pool!.query<{ id: string; dialogue_id: string; unit_stage: string }>(
        "SELECT id, dialogue_id, unit_stage FROM content.lessons WHERE unit_stage = 'B_lesson'",
      )
    ).rows[0]!;
    expect(lesson.id).toBe(lessonId);
    expect(lesson.dialogue_id).toBe(dialogueId);
    expect(lesson.unit_stage).toBe('B_lesson');

    const miki = (
      await pool!.query<{ id: string; voice_family: string }>(
        `SELECT id, voice_family FROM content.characters WHERE slug = 'chr-miki'`,
      )
    ).rows[0]!;
    expect(miki.id).toBe(mikiId);
    expect(miki.voice_family).toBe('female-young'); // joined from voices.yaml
  });

  it('links every dialogue line to its seeded speaker', async () => {
    const { rows } = await pool!.query<{ speaker: string }>(
      `SELECT c.slug AS speaker FROM content.dialogue_lines l
       JOIN content.characters c ON c.id = l.speaker_character_id`,
    );
    expect(rows.length).toBe(26); // 10 (PoC) + 13 (fm01) + 3 (kana-welcome)
    for (const row of rows) expect(row.speaker).toMatch(/^chr-(miki|yamada|sora|kim)$/);
  });
});
