/**
 * TASK-M0-10 — Postgres repositories against REAL PostgreSQL 18 (Issue #11).
 *
 * Exercises PgAttemptRepository + PgProgressRepository through the same seeded content
 * the routes use: engine-id ↔ uuid resolution, attempt_no sequencing, upsert semantics,
 * the unique-index backstop and the ContentNotSeededError contract.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { resetDbClientForTests, getDbClient } from '@/db/client';
import { refreshContentMap, resolveDialogue, ContentNotSeededError } from '@/db/content-map';
import { PgAttemptRepository } from '@/db/repositories/attempts';
import { PgProgressRepository } from '@/db/repositories/progress';
import type { AttemptInput, DialogueMasteryAttempt } from '@/modules/mastery/types';
import type { UnitProgress } from '@/modules/progress/types';
import { ensureTestDatabase } from './helpers';

const DLG = 'dlg-cafe-morning-01';
const USER = 'repo-user';

const INPUT: AttemptInput = {
  dialogueId: DLG,
  userId: USER,
  scores: { M1: 1, M2: 0.5, M3: null, M4: 1, M5: 0 },
  weakPoints: [{ lineId: 's-cafe-morning-01-l3', objective: 'voc-shoushou', severity: 'medium' }],
};

let attempts: PgAttemptRepository;
let progress: PgProgressRepository;
let pool: Pool;

beforeAll(async () => {
  const url = await ensureTestDatabase();
  resetDbClientForTests();
  await refreshContentMap();
  const client = getDbClient();
  attempts = new PgAttemptRepository(client);
  progress = new PgProgressRepository(client);
  pool = new Pool({ connectionString: url, max: 2 });
});

afterAll(async () => {
  await pool.end();
  resetDbClientForTests();
});

describe('PgAttemptRepository (app.dialogue_mastery_attempts)', () => {
  it('resolves the engine dialogue id to the seeded uuid', async () => {
    const ref = await resolveDialogue(DLG);
    expect(ref.slug).toBe('cafe-morning-01');
    expect(ref.dialogueUuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(ref.lessonUuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('creates attempts with sequential attempt_no and maps rows back to engine ids', async () => {
    const first = await attempts.create(INPUT, 'passed');
    const second = await attempts.create(INPUT, 'remediate');

    expect(first.attemptNo).toBe(1);
    expect(second.attemptNo).toBe(2);
    expect(first.dialogueId).toBe(DLG); // engine id, not the raw uuid
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // persisted row points at the seeded dialogue uuid
    const { rows } = await pool.query<{ dialogue_id: string; outcome: string }>(
      'SELECT dialogue_id, outcome FROM app.dialogue_mastery_attempts ORDER BY attempt_no',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]!.dialogue_id).toBe((await resolveDialogue(DLG)).dialogueUuid);
    expect(rows.map((r) => r.outcome)).toEqual(['passed', 'remediate']);
  });

  it('lists per dialogue and keeps the user separation', async () => {
    const mine = await attempts.list(DLG);
    expect(mine).toHaveLength(2);

    const otherUser: AttemptInput = { ...INPUT, userId: 'someone-else' };
    await attempts.create(otherUser, 'incomplete');
    expect(await attempts.list(DLG)).toHaveLength(3);

    const all = await attempts.list();
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const a of all) expect(a.dialogueId).toBe(DLG);
  });

  it('rejects an unseeded dialogue with ContentNotSeededError', async () => {
    await expect(attempts.create({ ...INPUT, dialogueId: 'dlg-not-seeded' }, 'passed')).rejects.toBeInstanceOf(
      ContentNotSeededError,
    );
  });

  it('keeps the (user, dialogue, attempt_no) unique index as the concurrency backstop', async () => {
    // simulate the race the retry loop handles: insert the same attempt_no directly
    const ref = await resolveDialogue(DLG);
    await expect(
      pool.query(
        `INSERT INTO app.dialogue_mastery_attempts (user_id, dialogue_id, attempt_no, scores, weak_points, outcome)
         VALUES ($1, $2, 1, '{}', '[]', 'passed')`,
        [USER, ref.dialogueUuid],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });
});

describe('PgProgressRepository (app.lesson_progress)', () => {
  const unit = (stage: UnitProgress['stage'], status: UnitProgress['status'] = 'active'): UnitProgress => ({
    userId: USER,
    dialogueId: DLG,
    stage,
    status,
    updatedAt: new Date().toISOString(),
  });

  it('get returns null before any write (stage A, not started)', async () => {
    expect(await progress.get(USER, DLG)).toBeNull();
  });

  it('upserts through the A→D stages on the (user_id, lesson_id) PK', async () => {
    await progress.upsert(unit('A_selfcheck'));
    let current = await progress.get(USER, DLG);
    expect(current?.stage).toBe('A_selfcheck');
    expect(current?.status).toBe('active');
    expect(current?.dialogueId).toBe(DLG);

    await progress.upsert(unit('B_lesson'));
    await progress.upsert(unit('C_practice'));
    current = await progress.get(USER, DLG);
    expect(current?.stage).toBe('C_practice');

    // understood carries the passing attempt id (logical ref, DD-048)
    const latest = (await attempts.list(DLG)).find((a: DialogueMasteryAttempt) => a.userId === USER)!;
    await progress.upsert({ ...unit('D_mastery', 'understood'), masteryAttemptId: latest.id });
    current = await progress.get(USER, DLG);
    expect(current?.status).toBe('understood');
    expect(current?.masteryAttemptId).toBe(latest.id);

    // exactly ONE row per (user, lesson) — upsert, never insert-dup
    const { rows } = await pool.query<{ count: string }>('SELECT count(*) AS count FROM app.lesson_progress');
    expect(Number(rows[0]!.count)).toBe(1);
  });

  it('lists dialogue-keyed and survives unknown users', async () => {
    const listed = await progress.list(DLG);
    expect(listed).toHaveLength(1);
    expect(await progress.get('nobody', DLG)).toBeNull();
  });
});
