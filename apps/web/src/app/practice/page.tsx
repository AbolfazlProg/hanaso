/**
 * HANASO — /practice (TASK-HANASO-27 redesign) — the practice hub, integrated.
 *
 * TASK-HANASO-22 shipped this page with its OWN practice engine (server
 * generate → client answer → complete — a second grading/completion system
 * parallel to the lesson engine). TASK-HANASO-27 integrates practice INTO the
 * learning journey: practice now lives in real stations (stn-kana-p1..p4)
 * executed by the ONE StationRunner + /api/curriculum/station engine. This
 * page keeps its useful hub job — an honest RSC snapshot + DEEP LINKS into
 * the journey stations (locked/unlocked by the real prerequisite walk) — and
 * no longer runs any parallel session engine.
 *
 * Data preservation: practice_sessions / learning_object_states history is
 * append-only evidence and stays readable here (recent sessions + weak
 * objects lines). Nothing is migrated or dropped.
 */
import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { resolveLearnerId } from '@/lib/learner/server';
import { fa } from '@/messages/fa';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { stationAvailability } from '@/modules/curriculum/journey';
import { getLearningObjectStore, getPracticeSessionStore, getStationProgressStore } from '@/lib/poc/stores';
import { isWeakObject } from '@/modules/practice/evidence';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';

export const dynamic = 'force-dynamic';

const PRACTICE_STATION_SLUGS = ['stn-kana-p1', 'stn-kana-p2', 'stn-kana-p3', 'stn-kana-p4'] as const;

export default async function PracticePage() {
  const learnerId = await resolveLearnerId();
  const chapter = loadChapterBundle('kana-foundation-01').chapter;

  const states = await getStationProgressStore().listForUnit(
    learnerId,
    chapter.stations.map((s) => s.slug),
  );
  const completedSlugs = new Set(states.filter((s) => s.status === 'completed').map((s) => s.stationSlug));
  const stateMap = new Map(states.map((s) => [s.stationSlug, s]));

  const records = await getLearningObjectStore().listForUser(learnerId, 'kana');
  const sessions = await getPracticeSessionStore().listForUser(learnerId, 5);

  const practiceStations = PRACTICE_STATION_SLUGS.map((slug) => {
    const station = chapter.stations.find((s) => s.slug === slug)!;
    const state = stateMap.get(slug);
    const { availability } = stationAvailability(station, stateMap, chapter.stations);
    return {
      slug,
      titleFa: station.titleFa,
      objectiveFa: station.objectiveFa,
      estMinutes: station.estMinutes,
      href: `/learn/kana-foundation-01/journey/${slug}`,
      locked: availability === 'locked',
      completed: completedSlugs.has(slug),
      bestScore: state?.bestScore ?? null,
    };
  });

  const weakObjects = records
    .filter(isWeakObject)
    .slice(0, 3)
    .map((r) => ({
      objectId: r.objectId,
      labelFa: r.objectId.startsWith('word-')
        ? r.objectId.slice(5)
        : (() => {
            const kanaId = r.objectId.replace(/^kn-(rec-|recall-)?/, '');
            const item = KANA_ITEMS.find((k) => k.kanaId === kanaId || k.fsrsCardId === r.objectId);
            return item ? `${item.glyph} (${item.romaji})` : r.objectId;
          })(),
    }));

  const recentSessions = sessions.map((s) => ({
    id: s.id,
    kind: s.kind,
    items: s.itemResults.length,
    firstTryCorrect: s.itemResults.filter((r) => r.firstTryCorrect).length,
    completedAt: s.completedAt,
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav active="practice" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-28 pt-8 md:pb-12 md:pt-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 font-black text-indigo">{fa.practice.title}</h1>
          <p className="text-body text-ink-soft">{fa.practice.lead}</p>
        </header>

        {/* the integrated practice stations — deep links into the journey */}
        <section className="flex flex-col gap-3">
          {practiceStations.map((s) =>
            s.locked ? (
              <div
                key={s.slug}
                aria-disabled="true"
                className="flex flex-col gap-1 rounded-2xl border border-dashed border-line p-4 opacity-70"
              >
                <span className="text-body font-bold text-ink-soft"><MixedFaJaText text={s.titleFa} /></span>
                <span className="text-small text-ink-soft">{fa.practice.lockedHint}</span>
              </div>
            ) : (
              <Link
                key={s.slug}
                href={s.href}
                className="group flex flex-col gap-1 rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-indigo"
              >
                <span className="flex items-center gap-2">
                  <span className="text-body font-bold text-indigo group-hover:underline"><MixedFaJaText text={s.titleFa} /></span>
                  {s.completed && <span className="text-small text-sky">{fa.practice.doneLabel}</span>}
                </span>
                <span className="text-small text-ink-soft">{s.objectiveFa}</span>
                <span className="text-caption text-ink-soft">~{s.estMinutes} دقیقه</span>
              </Link>
            ),
          )}
        </section>

        <p className="text-caption text-ink-soft">{fa.practice.reviewNote}</p>

        {weakObjects.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="text-small font-bold text-ink">{fa.practice.weakTitle}</h2>
            <p className="text-small text-ink-soft">{fa.practice.weakBody} {weakObjects.map((w) => w.labelFa).join(' · ')}</p>
          </section>
        )}

        {recentSessions.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="text-small font-bold text-ink">{fa.practice.recentTitle}</h2>
            <ul className="flex flex-col gap-1">
              {recentSessions.map((s) => (
                <li key={s.id} className="text-small text-ink-soft">
                  {s.kind} — {s.firstTryCorrect}/{s.items} {fa.practice.firstTryLabel}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
