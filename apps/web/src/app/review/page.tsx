import { resolveLearnerId } from '@/lib/learner/server';
import { getFsrsReviewStore } from '@/lib/poc/stores';
import { resolveReviewCard } from '@/modules/fsrs/item-registry';
import { ReviewRunner } from '@/app/review/review-runner';
import { SiteNav, resolveAccountDoor } from '@/components/site-nav';
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
 * Honesty rules kept intact (UX-AUDIT #134 — the RESOLVER IS THE CONTRACT):
 *  - ratings are SCHEDULING data (again/hard/good/easy → FSRS grades) — never
 *    a score, never a rank (the no-score principle);
 *  - an item the content registry cannot resolve renders an honest unknown
 *    card that CANNOT BE RATED (skip only — the learner never rates an
 *    invisible card again);
 *  - the empty queue is the honest «nothing due today» state.
 */
export const dynamic = 'force-dynamic';

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

  const cards = queue.map((q) => resolveReviewCard(q.itemId, q.kind));
  const accountDoor = await resolveAccountDoor();

  return (
    <>
      <SiteNav
        accountHref={accountDoor.href}
        accountLabel={accountDoor.label}
        active="learn"
        reviewDueCount={dueCount}
      />
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
