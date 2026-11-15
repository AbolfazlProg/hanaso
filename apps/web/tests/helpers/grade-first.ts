/**
 * TASK-HANASO-29 (M1) — test helper: perform ONE honest server-graded answer
 * for a station before completing it. The M1 completion guard requires
 * attemptCount > 0 (a server-witnessed grade) for stations with exercise
 * blocks; existing tests that walked stations via bare `complete` payloads
 * now grade one real exercise first — exactly what the real runner does.
 */
import { getChapter } from '@/modules/curriculum/content';

const ch1 = getChapter('kana-foundation-01')!;

/** First practice exercise wired into a station's exercise blocks. */
export function firstExerciseOf(stationSlug: string): { exerciseId: string; correctOptionId: string } | null {
  const station = ch1.stations.find((s) => s.slug === stationSlug);
  if (!station) return null;
  for (const b of station.blocks) {
    if (b.kind !== 'exercise') continue;
    const ids = (b as { exerciseIds: string[] }).exerciseIds;
    for (const id of ids) {
      const ex = ch1.exercises[id];
      if (ex?.assessmentRole === 'practice' && ex.correctOptionId) {
        return { exerciseId: ex.id, correctOptionId: ex.correctOptionId };
      }
    }
  }
  return null;
}
