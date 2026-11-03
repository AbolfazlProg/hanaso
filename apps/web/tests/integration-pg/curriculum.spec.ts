/**
 * TASK-LEARNING-01 — REAL-PostgreSQL integration: the chapter seed + the island
 * walk + the mastery gate, end to end on the app schema (Issue #11 pattern).
 *
 * Covers what the unit suite cannot:
 * - the curriculum seed lands levels/units/stations with FK-correct ids
 *   (station_progress FK → content.lessons);
 * - the station/chapter repositories round-trip through the Pg stores;
 * - the full walk (10 stations → stations_complete) + a passed gate →
 *   `understood` — the DD-048 invariant against the real database.
 */
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureTestDatabase } from './helpers';
import { getChapterProgressStore, getStationProgressStore, resetStoresForTests } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { getChapter } from '@/modules/curriculum/content';
import { resolveJourney, nextStation, orderedStations, gradeMasterySubmission } from '@/modules/curriculum';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { applyStationEvent, applyChapterEvent } from '@/modules/curriculum/progress-machine';
import { lessonContentId, unitContentId } from '@/db/ids';

let url = '';
let pool: Pool | null = null;

beforeAll(async () => {
  url = await ensureTestDatabase();
  pool = new Pool({ connectionString: url, max: 2 });
  resetStoresForTests();
});

afterAll(async () => {
  await pool?.end();
});

describe('curriculum seed (content rows)', () => {
  it('seeds L2 + the chapter unit + all 12 station lesson rows idempotently', async () => {
    const { rows: levelRows } = await pool!.query("select code from content.levels where code = 'L2'");
    expect(levelRows).toHaveLength(1);

    const { rows: unitRows } = await pool!.query(
      'select id, slug, title_fa, est_minutes from content.units where slug = $1',
      ['first-meeting-01'],
    );
    expect(unitRows).toHaveLength(1);
    const unit = unitRows[0]!;
    expect(unit.id).toBe(unitContentId('first-meeting-01'));
    expect(unit.est_minutes).toBe(25);

    const { rows: stationRows } = await pool!.query(
      'select slug, type, core, "order" from content.lessons where unit_id = $1 order by "order"',
      [unit.id],
    );
    expect(stationRows).toHaveLength(12);
    expect(stationRows.filter((r: { core: boolean }) => r.core)).toHaveLength(10);
    expect(stationRows[0]).toMatchObject({ slug: 'stn-fm01-01-anchor', type: 'anchor' });
    expect(stationRows[9]).toMatchObject({ slug: 'stn-fm01-10-mastery', type: 'mastery' });
  });

  it('deterministic station ids match the repository resolver (FK target)', async () => {
    const { rows } = await pool!.query('select id, slug from content.lessons where unit_id = (select id from content.units where slug = $1)', [
      'first-meeting-01',
    ]);
    const byslug = new Map(rows.map((r: { slug: string; id: string }) => [r.slug, r.id]));
    expect(byslug.get('stn-fm01-02-vocab')).toBe(lessonContentId('stn-fm01-02-vocab'));
  });
});

describe('island walk through the Postgres stores', () => {
  it('walks all core stations → stations_complete, then a passed gate → understood', async () => {
    const chapter = getChapter('first-meeting-01')!;
    const level = LEVELS_BY_CODE['L2']!;
    const stationStore = getStationProgressStore();
    const chapterStore = getChapterProgressStore();

    // enter + complete every core station in data order
    for (const station of orderedStations(chapter).filter((s) => s.core)) {
      await stationStore.incrementAttempts(POC_DEFAULT_USER_ID, station.slug);
      const current = await stationStore.get(POC_DEFAULT_USER_ID, station.slug);
      const next = applyStationEvent(current ?? undefined, {
        type: 'station_completed',
        stationSlug: station.slug,
        score: 0.9,
      });
      await stationStore.upsert(POC_DEFAULT_USER_ID, station.slug, next!);
    }

    const states = await stationStore.listForUnit(
      POC_DEFAULT_USER_ID,
      chapter.stations.map((s) => s.slug),
    );
    expect(states).toHaveLength(10);
    expect(states.every((s) => s.status === 'completed')).toBe(true);

    const journey = resolveJourney(
      chapter,
      level,
      states,
      (await chapterStore.get(POC_DEFAULT_USER_ID, chapter.slug)) ?? null,
    );
    expect(journey.coreCompleted).toBe(10);
    expect(nextStation(journey)).toBeNull(); // nothing left to unlock

    // the station route's aggregate logic: all core done → stations_complete
    const storedAggregate = await chapterStore.get(POC_DEFAULT_USER_ID, chapter.slug);
    let chapterState = applyChapterEvent(storedAggregate ?? undefined, { type: 'chapter_started' });
    chapterState = applyChapterEvent(chapterState ?? undefined, { type: 'stations_completed' });
    await chapterStore.upsert(POC_DEFAULT_USER_ID, chapter.slug, chapterState!);
    expect(chapterState!.status).toBe('stations_complete');

    // a perfect gate submission → understood (DD-048: only from a passed attempt)
    const answers: Record<string, { kind: string; optionId?: string; orderedIds?: string[]; chipOrder?: string[] }> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      if (ex.correctOptionId) answers[ex.id] = { kind: 'option', optionId: ex.correctOptionId };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder };
      else if (ex.acceptedChipOrder) answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder };
    }
    const graded = gradeMasterySubmission(chapter, answers as never);
    expect(graded.outcome).toBe('passed');

    const afterGate = applyChapterEvent(chapterState ?? undefined, {
      type: 'gate_attempted',
      passed: true,
      weighted: graded.weightedScore,
      measures: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 },
    });
    const finalState = await chapterStore.upsert(POC_DEFAULT_USER_ID, chapter.slug, afterGate!, 'attempt-1');
    expect(finalState.status).toBe('understood');

    // persisted: re-read from a FRESH store (proves it is the database, not memory)
    resetStoresForTests();
    const reread = await getChapterProgressStore().get(POC_DEFAULT_USER_ID, chapter.slug);
    expect(reread?.status).toBe('understood');
    const stationReread = await getStationProgressStore().get(POC_DEFAULT_USER_ID, 'stn-fm01-05-grammar-qa');
    expect(stationReread?.status).toBe('completed');
  });

  it('refreshing the walk leaves progress intact (no data loss)', async () => {
    const before = await getStationProgressStore().listForUnit(
      POC_DEFAULT_USER_ID,
      getChapter('first-meeting-01')!.stations.map((s) => s.slug),
    );
    expect(before.filter((s) => s.status === 'completed')).toHaveLength(10);
  });
});
