/**
 * HANASO — FSRS integration contract (TASK-LEARNING-06 / WP-1 — Issue #103, DD-119/125).
 *
 * INTEGRATION BOUNDARY — HONEST STATUS: `not-integrated`.
 *
 * The FSRS *scheduler* (ts-fsrs v6, `DefaultScheduler('FSRS-6')` — pinned in
 * package.json, wrapped in ./index.ts) is a FUTURE task (roadmap M2): no review
 * queue, no revlog persistence, no per-user card state exist yet. This module is
 * the CONTRACT the lesson system codes against today so that activating the
 * engine later is a swap of the port implementation, never a content rewrite:
 *
 *  - Card inventory is DATA (already shipped per chapter: VocabItem.fsrs,
 *    GrammarCluster.fsrs, ExpressionItem.fsrs, Station.fsrsItems, KanaItem.fsrsCardId).
 *    A card id existing in content ≠ FSRS being active.
 *  - `listChapterCards()` — real, pure, works now (aggregates the inventory).
 *  - `FsrsReviewPort` — the future engine surface (queue + retrieval logging).
 *    The shipped implementation throws `FsrsNotIntegratedError` — it can never
 *    return a fake success (mission rule: no demo endpoints faking completion).
 *  - Enrollment events (`fsrs_cards_enrolled`) flow through the analytics
 *    contract (../curriculum/events) with the honest `engine: 'not-integrated'`
 *    marker, so the future engine can replay enrollments from the event log.
 *
 * Single-scheduler rule (FSRS_INTEGRATION_CONTRACT §۱): no content-side
 * scheduling, no alternative "content review path" — dialogue replay stays an
 * analytics event, never a revlog row.
 */
import type { Chapter } from '@/modules/curriculum/types';

/** Card kinds of the v3.1 enum + the kn prefix added for kana (DD-119). */
export type FsrsCardKind = 'w' | 's' | 'w-p' | 's-line' | 'gr' | 'chrk' | 'kn';

/** One card of a chapter's inventory — pure data, no scheduling state. */
export interface FsrsCardDescriptor {
  /** Stable content id — `w-watashi`, `gr-desu-identity`, `kn-rec-hira-a`… (never order-based). */
  itemId: string;
  kind: FsrsCardKind;
  /** 1 = enrolled at station end (first successful retrieval — DD-095 §۲); 2 = productive direction. */
  wave: 1 | 2;
  /** Station whose completion enrolls this card. */
  enrollStationSlug: string;
  /** Content registry reference (word id / cluster id / expression id / kana id). */
  contentRef: string;
  /** First-encounter dialogue line (context connection — FSRS contract §۴). */
  sourceDialogueLineId?: string;
}

/** A review the future engine will serve (candidate shape — NOT served today). */
export interface FsrsReviewCandidate {
  itemId: string;
  dueAt: string; // ISO — day boundary 4am Asia/Tehran (fsrs-architecture §۶)
}

/** Retrieval outcome ratings mapped from lesson/gate answers (AC-945). */
export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * The FUTURE engine surface. Everything the lesson system will ever need from
 * FSRS: the due queue + recording retrievals. Implemented honestly today by
 * {@link FSRS_NOT_INTEGRATED} which throws on every call.
 */
export interface FsrsReviewPort {
  readonly engine: 'FSRS-6';
  readonly status: 'integrated' | 'not-integrated';
  /** Daily review queue for a user (future: due_at ≤ now, caps from level_policy). */
  getReviewQueue(userId: string): Promise<FsrsReviewCandidate[]>;
  /** Record one retrieval (gate answers map: correct→good · hint→hard · wrong→again). */
  recordRetrieval(userId: string, itemId: string, rating: FsrsRating): Promise<void>;
}

/** Thrown by the not-integrated port — never swallowed into a fake success. */
export class FsrsNotIntegratedError extends Error {
  constructor(operation: string) {
    super(
      `FSRS engine is not integrated yet (roadmap M2) — operation «${operation}» is refused. ` +
        'Card inventory data is shipped; the scheduler lands in its own task per the TASK-LEARNING-06 scope.',
    );
    this.name = 'FsrsNotIntegratedError';
  }
}

/** The honest port: every operation refuses loudly instead of faking success. */
export const FSRS_NOT_INTEGRATED: FsrsReviewPort = {
  engine: 'FSRS-6',
  status: 'not-integrated',
  async getReviewQueue() {
    throw new FsrsNotIntegratedError('getReviewQueue');
  },
  async recordRetrieval() {
    throw new FsrsNotIntegratedError('recordRetrieval');
  },
};

/** The active port — swap to the real engine in M2 without touching content. */
export const fsrsPort: FsrsReviewPort = FSRS_NOT_INTEGRATED;

/**
 * Aggregate a chapter's full card inventory from its shipped data (pure — works
 * today). Wave-1 cards come from words (w/s), grammar (gr), expressions (chrk),
 * stations' fsrsItems (s-line + extras) and the kana registry (kn); wave-2
 * productive cards (w-p + chrk-productive) are declared alongside.
 */
export function listChapterCards(chapter: Chapter): FsrsCardDescriptor[] {
  const cards: FsrsCardDescriptor[] = [];
  const stationBySlug = new Map(chapter.stations.map((s) => [s.slug, s]));

  const enrollStationFor = (contentRef: string): string => {
    const st = chapter.stations.find((s) => {
      if (s.fsrsItems.some((id) => id.startsWith(contentRef))) return true;
      return false;
    });
    return st?.slug ?? chapter.stations[0]?.slug ?? '';
  };

  for (const w of chapter.words) {
    cards.push({
      itemId: w.fsrs.w,
      kind: 'w',
      wave: 1,
      enrollStationSlug: enrollStationFor(w.fsrs.w),
      contentRef: w.id,
      sourceDialogueLineId: w.lineRef,
    });
    cards.push({
      itemId: w.fsrs.s,
      kind: 's',
      wave: 1,
      enrollStationSlug: enrollStationFor(w.fsrs.s),
      contentRef: w.id,
      sourceDialogueLineId: w.lineRef,
    });
  }
  for (const g of chapter.grammar) {
    cards.push({
      itemId: g.fsrs.gr,
      kind: 'gr',
      wave: 1,
      enrollStationSlug: enrollStationFor(g.fsrs.gr),
      contentRef: g.id,
      sourceDialogueLineId: g.lineRefs[0],
    });
  }
  for (const e of chapter.expressions) {
    cards.push({
      itemId: e.fsrs.chrk,
      kind: 'chrk',
      wave: 1,
      enrollStationSlug: enrollStationFor(e.fsrs.chrk),
      contentRef: e.id,
      sourceDialogueLineId: e.lineRef,
    });
  }
  // Station-declared items not already covered (s-line cards, kn cards, extras).
  const known = new Set(cards.map((c) => c.itemId));
  for (const station of chapter.stations) {
    for (const itemId of station.fsrsItems) {
      if (known.has(itemId)) continue;
      known.add(itemId);
      const kind: FsrsCardKind = itemId.startsWith('kn')
        ? 'kn'
        : itemId.startsWith('s-line')
          ? 's-line'
          : itemId.startsWith('gr')
            ? 'gr'
            : itemId.startsWith('chrk')
              ? 'chrk'
              : itemId.startsWith('w-p')
                ? 'w-p'
                : 'w';
      cards.push({
        itemId,
        kind,
        wave: kind === 'w-p' ? 2 : 1,
        enrollStationSlug: station.slug,
        contentRef: itemId,
      });
    }
  }
  // Kana registry kn- cards (data-only) attach to their introducing station.
  const kanaCards = chapter.stations.flatMap((s) =>
    s.blocks.flatMap((b) => (b.kind === 'kana-card' ? [b.kanaId] : [])),
  );
  void kanaCards; // registry ids already arrive via Station.fsrsItems (kn-rec-*)
  void stationBySlug;
  return cards;
}
