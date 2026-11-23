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
    // first-meeting-01 [13 lines] + kana-welcome-01 [3 lines]) · 61 lessons
    // TASK-HANASO-24 correction: the stale 55 predated the H22 curriculum restructure
    // (commit d940199 added the two real-world milestone stations); content truth:
    // 1 anchor B_lesson + 56 stations (34 kana-foundation-01 + 22 first-meeting-01).
    // (1 anchor B_lesson + 32 Ch01 stations [k12-foreign, TASK-HANASO-20]
    // + 22 Ch02 stations).
    // HANASO-PRODUCTION-REMEDIATION correction: the stale 57 predated TASK-27
    // (118c1d2, Nov 14) which added the 4 integrated practice stations p1..p4 to
    // the journey — its CI run was format-red, so the integration pin never re-ran.
    // Content truth now: 1 anchor B_lesson + 81 stations (38 kana-foundation-01
    // incl. 4 practice + 20 kana-expansion-01 [Issue #146] + 23 first-meeting-01).
    // AUDIO-UNIT/KANJI 2026-11-23 §۲: the dedicated kanji station
    // (stn-fm01-23-kanji) is Ch02's 23rd station → 82 rows total.
    expect(await counts('content.characters')).toBe(4);
    expect(await counts('content.dialogues')).toBe(4); // + kana-expansion-01 (Issue #146)
    expect(await counts('content.dialogue_lines')).toBe(29); // + the expansion anchor's 3 lines
    expect(await counts('content.lessons')).toBe(82); // 1 anchor B_lesson + 81 stations (38+20+23)
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
    expect(Number(after.rows[0]!.count)).toBe(4); // no duplicates (PoC + fm01 + kana-welcome + expansion)

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
    expect(rows.length).toBe(29); // 10 (PoC) + 13 (fm01) + 3 (kana-welcome) + 3 (kana-expansion — Issue #146)
    for (const row of rows) expect(row.speaker).toMatch(/^chr-(miki|yamada|sora|kim)$/);
  });
});
