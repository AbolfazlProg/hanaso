/**
 * HANASO — the kanji reference lookup layer (KANJI-TWO-PHASE §۱ — 2026-11-22).
 *
 * PURE module over the generated N5 reference (`n5-reference.ts`): the fast
 * lookups + the DERIVED relations the rest of the engine answers from. The
 * reference is the single canonical home of kanji FACTS; this module adds:
 *
 *  - id/literal/ucs lookups (both directions);
 *  - `wordsContainingKanji` — the anchor-word derivation over ANY chapter's
 *    taught word list (a word is an anchor of a kanji when the kanji appears
 *    in the word's term — derived data, never hand-declared twice);
 *  - coverage helpers (which N5 kanji appear in a word inventory);
 *  - the level-tracking query surface (which reference kanji a course has
 *    taught, in what order — the registry owns teaching truth; this module
 *    only projects the reference side).
 *
 * No parallel source of truth: nothing here stores teaching position.
 */
import type { Chapter } from '../types';
import { KANJI_N5_ITEMS, KANJI_N5_SOURCE } from './n5-reference';
import type { KanjiItem, KanjiReferenceEntry } from '../types';

/** All 103 reference kanji, ordered as generated (grade, then frequency). */
export const KANJI_ITEMS: KanjiReferenceEntry[] = KANJI_N5_ITEMS;

/** id → entry. */
export const KANJI_ITEMS_BY_ID: Map<string, KanjiReferenceEntry> = new Map(
  KANJI_ITEMS.map((k) => [k.kanjiId, k] as const),
);

/** literal → entry. */
export const KANJI_ITEMS_BY_LITERAL: Map<string, KanjiReferenceEntry> = new Map(
  KANJI_ITEMS.map((k) => [k.literal, k] as const),
);

/** The honest provenance block re-exported (reports render it from here). */
export { KANJI_N5_SOURCE };

export function kanjiByLiteral(literal: string): KanjiReferenceEntry | undefined {
  return KANJI_ITEMS_BY_LITERAL.get(literal);
}

export function kanjiById(kanjiId: string): KanjiReferenceEntry | undefined {
  return KANJI_ITEMS_BY_ID.get(kanjiId);
}

const KANJI_RE = /[\u4e00-\u9fff]/;

/** Does the surface contain any kanji at all? */
export function containsKanji(surface: string): boolean {
  return KANJI_RE.test(surface);
}

/** The distinct kanji literals appearing in a surface (ordered, deduped). */
export function kanjiInSurface(surface: string): string[] {
  const out: string[] = [];
  for (const ch of surface) {
    if (KANJI_RE.test(ch) && !out.includes(ch)) out.push(ch);
  }
  return out;
}

/**
 * The anchor-word derivation: which of `words` carry `literal` inside their
 * term. A word anchors a kanji when the kanji is part of the word's written
 * surface — the D-0006 vessel rule (readings ride inside anchor words).
 */
export function wordsContainingKanji(
  literal: string,
  words: ReadonlyArray<{ id: string; term: string }>,
): { id: string; term: string }[] {
  return words.filter((w) => w.term.includes(literal)).map((w) => ({ id: w.id, term: w.term }));
}

/** The reference entries covered by a chapter's word inventory (any position). */
export function referenceKanjiInChapter(chapter: Chapter): KanjiReferenceEntry[] {
  const surfaces = chapter.words.map((w) => w.term).join('');
  const out: KanjiReferenceEntry[] = [];
  for (const k of KANJI_ITEMS) if (surfaces.includes(k.literal)) out.push(k);
  return out;
}

/**
 * Level-tracking projection: the kanji a chapter DECLARES to teach
 * (chapter.kanji), resolved to reference entries. Teaching POSITION truth
 * stays in the Knowledge Registry (taughtAt); this is the reference-side view
 * the per-level report joins against.
 */
export function declaredKanjiOf(chapter: Chapter): { item: KanjiItem; ref: KanjiReferenceEntry | undefined }[] {
  return (chapter.kanji ?? []).map((item) => ({ item, ref: kanjiById(item.kanjiId) }));
}

/**
 * FSRS card id builders — the ONE place the kanji card-id convention is
 * defined (mirrors the kn- kana convention):
 *   recognition  kj-rec-<kanjiId>   (see glyph → recall meaning/readings)
 *   writing      kj-wri-<kanjiId>   (see meaning+reading → produce the kanji)
 */
export function kanjiFsrsCardIds(kanjiId: string): { rec: string; wri: string } {
  return { rec: `kj-rec-${kanjiId}`, wri: `kj-wri-${kanjiId}` };
}
