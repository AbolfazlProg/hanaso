/**
 * HANASO — /practice (TASK-HANASO-22) — the independent-practice hub.
 *
 * A REAL second surface of the product (mission: «تمرین مستقل»), honest by
 * construction:
 *  - server-rendered initial status (RSC first — no client spinner);
 *  - Focused targets = ONLY completed stations that introduced glyphs
 *    (prerequisite truth from the walk store — nothing untaught is offered);
 *  - Mixed unlocks after PRACTICE_POLICY.mixedMinStations completed stations;
 *  - the review line stays the honest «هنوز فعال نیست» (no fake dates/counts);
 *  - the page stays LIGHT: two primary cards + one quiet weak-suggestion line
 *    (mission §Home: no charts, no stats wall).
 */
import { SiteNav } from '@/components/site-nav';
import { resolveLearnerId } from '@/lib/learner/server';
import { fa } from '@/messages/fa';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { getLearningObjectStore, getPracticeSessionStore, getStationProgressStore } from '@/lib/poc/stores';
import { glyphsIntroducedByStation } from '@/modules/practice/kana/items';
import { PRACTICE_POLICY } from '@/modules/practice/kana/policy';
import { isWeakObject } from '@/modules/practice/evidence';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { PracticeHub, type PracticeStatusView } from '@/components/practice/practice-hub';

export const dynamic = 'force-dynamic';

export default async function PracticePage() {
  const learnerId = await resolveLearnerId();
  const chapter = loadChapterBundle('kana-foundation-01').chapter;

  const states = await getStationProgressStore().listForUnit(
    learnerId,
    chapter.stations.map((s) => s.slug),
  );
  const completed = new Set(states.filter((s) => s.status === 'completed').map((s) => s.stationSlug));
  const records = await getLearningObjectStore().listForUser(learnerId, 'kana');
  const sessions = await getPracticeSessionStore().listForUser(learnerId, 5);

  const status: PracticeStatusView = {
    completedStations: completed.size,
    focusTargets: chapter.stations
      .filter((s) => completed.has(s.slug) && glyphsIntroducedByStation(s.slug).length > 0)
      .map((s) => ({ stationSlug: s.slug, titleFa: s.titleFa })),
    mixedUnlocked: completed.size >= PRACTICE_POLICY.mixedMinStations,
    mixedMinStations: PRACTICE_POLICY.mixedMinStations,
    eligibleForReview: records.filter((r) => r.state === 'eligible_for_review').length,
    weakObjects: records
      .filter(isWeakObject)
      .slice(0, PRACTICE_POLICY.weakMaxSuggestions)
      .map((r) => ({
        objectId: r.objectId,
        labelFa: r.objectId.startsWith('word-')
          ? r.objectId.slice(5)
          : (() => {
              const kanaId = r.objectId.replace(/^kn-(rec-|recall-)?/, '');
              const item = KANA_ITEMS.find((k) => k.kanaId === kanaId || k.fsrsCardId === r.objectId);
              return item ? `${item.glyph} (${item.romaji})` : r.objectId;
            })(),
      })),
    recentSessions: sessions.map((s) => ({
      id: s.id,
      kind: s.kind,
      items: s.itemResults.length,
      firstTryCorrect: s.itemResults.filter((r) => r.firstTryCorrect).length,
      completedAt: s.completedAt,
    })),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav active="practice" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-28 pt-8 md:pb-12 md:pt-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 font-black text-indigo">{fa.practice.title}</h1>
          <p className="text-body text-ink-soft">{fa.practice.lead}</p>
        </header>
        <PracticeHub status={status} />
      </main>
    </div>
  );
}
