import { resolveLearnerId } from '@/lib/learner/server';
import { getFsrsReviewStore } from '@/lib/poc/stores';
import { listChapters } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { kanaAudioUrls } from '@/modules/audio/kana-audio';
import { hostWordAudioUrls } from '@/modules/audio/hostword-audio';
import { ReviewRunner, type ReviewCard } from '@/app/review/review-runner';
import { SiteNav } from '@/components/site-nav';
import { fa } from '@/messages/fa';

/**
 * /review — Part-2 ج: the REAL FSRS daily review runner.
 *
 * The engine went live with the owner-pass (app.fsrs_cards + app.fsrs_revlogs,
 * GET /api/review/queue · POST /api/review) — but no UI ever served the queue,
 * so the honest home-badge branch rendered «the route does not exist yet».
 * This page is that route: the learner's actual due cards, rated through the
 * idempotent submission API.
 *
 * Honesty rules kept intact:
 *  - ratings are SCHEDULING data (again/hard/good/easy → FSRS grades) — never
 *    a score, never a rank (the no-score principle);
 *  - an item the bundled content cannot resolve renders an honest unknown-card
 *    (the learner may still rate it or skip) — never a fake glyph;
 *  - the empty queue is the honest «nothing due today» state.
 */
export const dynamic = 'force-dynamic';

/** Build the display payload for one queued item from the bundled content. */
function resolveCard(itemId: string, kind: string): ReviewCard {
  const unknown: ReviewCard = { itemId, kind, unknown: true };

  // kn-rec-hira-a / kn-disc-kata-wa-fu — the kana cards of chapter 01. The disc
  // ids carry a PAIR (base glyph + confusables) — the first registry id that is
  // a prefix of the remainder is the card's own glyph.
  if (itemId.startsWith('kn-rec-') || itemId.startsWith('kn-disc-')) {
    const rest = itemId.slice(itemId.startsWith('kn-disc-') ? 'kn-disc-'.length : 'kn-rec-'.length);
    const candidates = KANA_ITEMS.map((k) => k.kanaId)
      .filter((id) => rest.startsWith(id))
      .sort((a, b) => b.length - a.length);
    const kana = candidates.length ? KANA_ITEMS.find((k) => k.kanaId === candidates[0]) : undefined;
    if (!kana) return unknown;
    return {
      itemId,
      kind,
      glyph: kana.glyph,
      romaji: kana.romaji,
      audio: kanaAudioUrls(kana.kanaId) ?? undefined,
      note: itemId.startsWith('kn-disc-') ? 'کارت تمایز جفت — شکل را از جفتِ شبیهش جدا کن.' : undefined,
    };
  }
  // w-<wordId> / w-p-<wordId> / s-<wordId> — vocabulary cards
  if (/^(w|w-p|s)-/.test(itemId)) {
    const wordId = itemId.replace(/^(w-p|w|s)-/, '');
    for (const ch of listChapters()) {
      const w = ch.words.find((x) => x.id === wordId);
      if (!w) continue;
      return {
        itemId,
        kind,
        term: w.term,
        termFurigana: w.termFurigana,
        meaningFa: w.meaningFa,
        readingKana: w.readingKana,
        audio: hostWordAudioUrls(w.term) ?? undefined,
      };
    }
  }
  // gr-<clusterId> — grammar pattern card
  if (itemId.startsWith('gr-')) {
    for (const ch of listChapters()) {
      const g = ch.grammar.find((x) => `gr-${x.id}` === itemId);
      if (!g) continue;
      return { itemId, kind, term: g.pattern, meaningFa: g.titleFa };
    }
  }
  // chrk-<id> — the formulaic-expression card
  if (itemId.startsWith('chrk-')) {
    for (const ch of listChapters()) {
      const e = ch.expressions.find((x) => `chrk-${x.id}` === itemId);
      if (!e) continue;
      return {
        itemId,
        kind,
        term: e.ja,
        readingKana: e.reading,
        meaningFa: e.functionFa,
      };
    }
  }
  return unknown;
}

export default async function ReviewPage() {
  const learnerId = await resolveLearnerId();

  let queue: { itemId: string; kind: string; dueAt: string }[] = [];
  let dueCount = 0;
  let loadFailed = false;
  try {
    const store = getFsrsReviewStore();
    const [due, count] = await Promise.all([
      store.listDue(learnerId, new Date(), 50),
      store.countDue(learnerId, new Date()),
    ]);
    queue = due.map((d) => ({ itemId: d.itemId, kind: d.kind, dueAt: d.dueAt }));
    dueCount = count;
  } catch {
    loadFailed = true;
  }

  const cards = queue.map((q) => resolveCard(q.itemId, q.kind));

  return (
    <>
      <SiteNav active="learn" />
      <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-24 pt-10">
        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-h1 font-black text-indigo">{fa.review.title}</h1>
          <p className="text-lead text-ink-soft">{fa.review.lead}</p>
        </header>
        <ReviewRunner cards={cards} dueCount={dueCount} loadFailed={loadFailed} />
      </main>
    </>
  );
}
