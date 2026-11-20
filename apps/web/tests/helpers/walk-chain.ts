/**
 * UX-AUDIT #137 — test helper: plant the honest prerequisite chain for a
 * station BEFORE the walk under test. The station API now enforces the
 * prereq gate at ENTRY (enter/progress/grade/hint/writing-practice) —
 * mechanics tests that target a DEEP station (anchor/resume/hint/grade)
 * plant the chain as completed rows in the in-memory store so the mechanics
 * under test can run. Planting = the same store rows an honest walk would
 * leave behind (never a bypass of the gate itself).
 */
import { getChapter } from '@/modules/curriculum/content';
import { orderedStations } from '@/modules/curriculum/journey';
import { getStationProgressStore } from '@/lib/poc/stores';

const ch1 = getChapter('kana-foundation-01')!;

/** Plant `status: completed` for every station BEFORE `targetSlug` in walk order. */
export async function plantPrereqChain(
  learnerId: string,
  targetSlug: string,
  chapterSlug = 'kana-foundation-01',
): Promise<void> {
  void chapterSlug;
  const store = getStationProgressStore();
  const walk = orderedStations(ch1);
  const idx = walk.findIndex((s) => s.slug === targetSlug);
  if (idx <= 0) return; // no prerequisites before it
  const now = new Date().toISOString();
  for (const s of walk.slice(0, idx)) {
    await store.upsert(learnerId, s.slug, {
      stationSlug: s.slug,
      status: 'completed',
      bestScore: 1,
      attemptCount: 1,
      currentBlock: null,
      lastActivityAt: now,
    });
  }
}
