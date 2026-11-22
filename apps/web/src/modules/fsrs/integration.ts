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

/** Card kinds of the v3.1 enum + the kn prefix added for kana (DD-119) and the
 *  kj-rec/kj-wri pair added for kanji (KANJI-TWO-PHASE §۳ — kanji recognition
 *  and writing/recall are DISTINCT review tasks, never equated with vocab
 *  review: different front, different practice structure, different template). */
export type FsrsCardKind = 'w' | 's' | 'w-p' | 's-line' | 'gr' | 'chrk' | 'kn' | 'kj-rec' | 'kj-wri';

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

/*
 * Owner-pass 2026-11-19 — the port WENT LIVE (mission «تکمیل APIهای بخش یادگیری»):
 * the persistence layer is app.fsrs_cards + app.fsrs_revlogs
 * (./review-store.ts), enrollment is station-completion-driven, and the review
 * API routes (GET /api/review/queue · POST /api/review — the contract table in
 * docs/architecture/API-AND-EVENTS.md) serve it. The store getter is imported
 * lazily-safe via a static import (no runtime cycle: review-store only uses
 * TYPE imports from this file) and resolves the DATABASE_URL-switched store at
 * CALL time — RSC bundles and unit tests never touch a database unless a
 * review operation actually runs.
 */
import { getFsrsReviewStore } from '@/lib/poc/stores';

/** The LIVE port — real persistence, same surface as the contract promised. */
export const PG_FSRS_PORT: FsrsReviewPort = {
  engine: 'FSRS-6',
  status: 'integrated',
  async getReviewQueue(userId: string) {
    const items = await getFsrsReviewStore().listDue(userId, new Date(), 20);
    return items.map((it) => ({ itemId: it.itemId, dueAt: it.dueAt }));
  },
  async recordRetrieval(userId: string, itemId: string, rating: FsrsRating) {
    // One retrieval per lesson/gate answer — a fresh uuidv7 idempotency key per
    // call (the API submission path uses the client's explicit clientReviewId).
    await getFsrsReviewStore().submit(userId, { itemId, rating, clientReviewId: crypto.randomUUID() }, new Date());
  },
};

/** The active port — swapped to the real engine in M2 WITHOUT touching content (done). */
export const fsrsPort: FsrsReviewPort = PG_FSRS_PORT;

/**
 * Aggregate a chapter's full card inventory from its shipped data (pure — works
 * today). Wave-1 cards come from words (w/s), grammar (gr), expressions (chrk),
 * stations' fsrsItems (s-line + extras) and the kana registry (kn); wave-2
 * productive cards (w-p + chrk-productive) are declared alongside.
 */
export function listChapterCards(chapter: Chapter): FsrsCardDescriptor[] {
  const cards: FsrsCardDescriptor[] = [];
  const stationBySlug = new Map(chapter.stations.map((s) => [s.slug, s]));

  /*
   * KANJI-TWO-PHASE §۳ (the honest admission rule): a card enrolls at the
   * station that REALLY TEACHES its content — the station carrying its
   * teaching card (vocab-card / expression-card / the anchored grammar
   * station). A word/grammar/expression with NO teaching home enrolls
   * NOWHERE ('__unassigned__' matches no real station slug): «فقط محتوایی
   * وارد مرور شود که واقعاً تدریس شده است» — meeting the content in the
   * conversation (exposureAt) enrolls nothing. Shipped chapters carry cards
   * for every word/grammar/expression (audited 2026-11-22), so this changes
   * no live behavior — it only closes the hole where an authoring mistake
   * (a list entry without its teaching card) would have enrolled at the
   * chapter's first station by default.
   */
  const UNASSIGNED = '__unassigned__';
  const vocabCardStationOf = (wordId: string): string =>
    chapter.stations.find((s) => s.blocks.some((b) => b.kind === 'vocab-card' && b.wordId === wordId))?.slug ??
    UNASSIGNED;
  const grammarHostOf = (clusterId: string): string => {
    const g = chapter.grammar.find((x) => x.id === clusterId);
    if (!g || g.lineRefs.length === 0) return UNASSIGNED;
    const host = chapter.stations.find(
      (s) => (s.type === 'grammar' || s.type === 'structure') && g.lineRefs.every((l) => s.lineRefs.includes(l)),
    );
    return host?.slug ?? UNASSIGNED;
  };
  const expressionCardStationOf = (expressionId: string): string =>
    chapter.stations.find((s) => s.blocks.some((b) => b.kind === 'expression-card' && b.expressionId === expressionId))
      ?.slug ?? UNASSIGNED;

  for (const w of chapter.words) {
    const enrollStationSlug = vocabCardStationOf(w.id);
    cards.push({
      itemId: w.fsrs.w,
      kind: 'w',
      wave: 1,
      enrollStationSlug,
      contentRef: w.id,
      sourceDialogueLineId: w.lineRef,
    });
    cards.push({
      itemId: w.fsrs.s,
      kind: 's',
      wave: 1,
      enrollStationSlug,
      contentRef: w.id,
      sourceDialogueLineId: w.lineRef,
    });
  }
  for (const g of chapter.grammar) {
    cards.push({
      itemId: g.fsrs.gr,
      kind: 'gr',
      wave: 1,
      enrollStationSlug: grammarHostOf(g.id),
      contentRef: g.id,
      sourceDialogueLineId: g.lineRefs[0],
    });
  }
  for (const e of chapter.expressions) {
    cards.push({
      itemId: e.fsrs.chrk,
      kind: 'chrk',
      wave: 1,
      enrollStationSlug: expressionCardStationOf(e.id),
      contentRef: e.id,
      sourceDialogueLineId: e.lineRef,
    });
  }
  /*
   * KANJI-TWO-PHASE §۳ — the kanji card pair. Admission rule: a kj card is
   * enrolled by completing the DEDICATED kanji station that teaches it (the
   * station carrying its kanji-card) — never by a vocab station, never by an
   * encounter. `enrollStationSlug` is derived from the deck itself (the
   * station whose blocks contain the card for this kanji id), so a kanji
   * that no station teaches enrolls NOWHERE (honest absence — the registry
   * files kanji-declared-not-taught and EQA-12 fails the chapter). Recognition
   * is wave 1 (station end); writing/recall is wave 2 (productive direction).
   */
  for (const item of chapter.kanji ?? []) {
    const host = chapter.stations.find(
      (s) => s.type === 'kanji' && s.blocks.some((b) => b.kind === 'kanji-card' && b.kanjiId === item.kanjiId),
    );
    const enrollStationSlug = host?.slug ?? '__no-kanji-station__';
    cards.push({
      itemId: item.fsrs.rec,
      kind: 'kj-rec',
      wave: 1,
      enrollStationSlug,
      contentRef: item.kanjiId,
    });
    cards.push({
      itemId: item.fsrs.wri,
      kind: 'kj-wri',
      wave: 2,
      enrollStationSlug,
      contentRef: item.kanjiId,
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
