/**
 * HANASO — the FSRS itemId → content resolver (UX-AUDIT #134, root B).
 *
 * THE one reader-side contract between the card BUILDER and the card READER.
 * Before this module the /review page re-derived the content id by string
 * surgery on the itemId (`s-fm01-nihonjin` → word id `fm01-nihonjin`) while
 * the builder enrolls with the `fsrs` ids declared on the registry items and
 * a contentRef of `voc-nihonjin` — two conventions that never met, so every
 * queued card resolved to «این کارت در محتوای فعلی یافت نشد».
 *
 * The fix is architectural, not a patch: the descriptor list this registry
 * consumes IS the same `listChapterCards()` output the enrollment path uses
 * (station completion → enroll). itemId → contentRef → registry item. Builder
 * and reader share one contract; a new chapter cannot enroll a card the
 * reader cannot resolve (and the content-contract test suite proves it for
 * every shipped chapter + every draft YAML).
 *
 * SERVER module (dialogue + audio registries are node-only).
 */
import { listChapters } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { transliterateKanaToFa } from '@/modules/curriculum/content/translit-standard';
import { listChapterCards, type FsrsCardDescriptor } from './integration';
import { kanaAudioUrls } from '@/modules/audio/kana-audio';
import { hostWordAudioUrls } from '@/modules/audio/hostword-audio';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { KANJI_ITEMS_BY_ID } from '@/modules/curriculum/kanji';
import { cardSatisfiesTemplate } from './review-contract';

/** The display payload of one review card (the client DTO, server-resolved). */
export interface ResolvedReviewCard {
  itemId: string;
  kind: string;
  /** kn cards: the glyph is the FRONT (recall the sound). */
  glyph?: string;
  romaji?: string;
  /** w/gr/chrk cards: the term (recall its meaning — or the term for s-cards). */
  term?: string;
  termFurigana?: string;
  readingKana?: string;
  /** ENGINE-NEXTGEN W-D — the derived Persian transliteration (words only:
   * the locked word-level standard; expressions are skipped honestly —
   * particle readings like は=wa are not derivable from glyphs). */
  translitFa?: string;
  meaningFa?: string;
  /** KANJI-TWO-PHASE §۳ — kanji card extras: the reference facts the reveal
   * carries (readings in kana, stroke count) and the anchor words the kanji
   * rides inside (taught vocabulary of the same chapter). */
  on?: string[];
  kun?: string[];
  strokeCount?: number;
  anchorWords?: { term: string; readingKana: string; meaningFa: string }[];
  audio?: { opus: string; m4a: string } | null;
  note?: string;
  /** The registry could not resolve this item — honest unknown card. */
  unknown?: boolean;
}

interface IndexedCard extends FsrsCardDescriptor {
  chapterSlug: string;
}

let indexCache: Map<string, IndexedCard> | null = null;

/** itemId → descriptor index over ALL shipped chapters (pure data — no DB). */
function cardIndex(): Map<string, IndexedCard> {
  if (indexCache) return indexCache;
  const map = new Map<string, IndexedCard>();
  for (const ch of listChapters()) {
    for (const card of listChapterCards(ch)) {
      if (!map.has(card.itemId)) map.set(card.itemId, { ...card, chapterSlug: ch.slug });
    }
  }
  indexCache = map;
  return map;
}

/** Reset the index (content hot-reload in tests/dev). */
export function resetFsrsItemRegistry(): void {
  indexCache = null;
}

/** The discrimination-card ids carry a PAIR (base glyph + confusables). */
function resolveKanaCard(itemId: string): ResolvedReviewCard | null {
  const rest = itemId.startsWith('kn-disc-')
    ? itemId.slice('kn-disc-'.length)
    : itemId.startsWith('kn-rec-')
      ? itemId.slice('kn-rec-'.length)
      : null;
  if (rest === null) return null;
  // the first registry id that prefixes the remainder is the card's own glyph
  const candidates = KANA_ITEMS.map((k) => k.kanaId)
    .filter((id) => rest.startsWith(id))
    .sort((a, b) => b.length - a.length);
  const kana = candidates.length ? KANA_ITEMS.find((k) => k.kanaId === candidates[0]) : undefined;
  if (!kana) return null;
  return {
    itemId,
    kind: itemId.startsWith('kn-disc-') ? 'kn-disc' : 'kn',
    glyph: kana.glyph,
    romaji: kana.romaji,
    audio: kanaAudioUrls(kana.kanaId) ?? undefined,
    note: itemId.startsWith('kn-disc-') ? 'کارت تمایز جفت — شکل را از جفتِ شبیهش جدا کن.' : undefined,
  };
}

/**
 * Resolve ONE queued itemId to its display payload — from the SAME descriptor
 * list the enrollment path builds. Returns null (honest unknown) when the
 * content genuinely cannot resolve the item.
 */
export function resolveReviewCard(itemId: string, kind: string): ResolvedReviewCard {
  const unknown: ResolvedReviewCard = { itemId, kind, unknown: true };

  // kn- cards resolve straight from the kana registry (their ids are the data).
  const kana = resolveKanaCard(itemId);
  if (kana) return kana;

  /*
   * KANJI-TWO-PHASE §۳ — kj- cards resolve from the N5 reference + the
   * chapter's anchor words (the card's own teaching context). The template
   * contract decides servability: a card whose template-required fields are
   * missing (or whose kind has no template) is an honest unknown — never a
   * guessed card, never the vocab template.
   */
  if (itemId.startsWith('kj-rec-') || itemId.startsWith('kj-wri-')) {
    const kanjiId = itemId.slice(itemId.indexOf('-', 3) + 1); // strip kj-rec-/kj-wri-
    const ref = KANJI_ITEMS_BY_ID.get(kanjiId);
    if (!ref) return unknown;
    const descriptor = cardIndex().get(itemId);
    const chapter = descriptor ? listChapters().find((c) => c.slug === descriptor.chapterSlug) : undefined;
    const anchors = (chapter?.words ?? []).filter((w) => w.term.includes(ref.literal));
    const card: ResolvedReviewCard = {
      itemId,
      kind,
      glyph: ref.literal,
      meaningFa: ref.meaningFa,
      on: ref.on,
      kun: ref.kun,
      strokeCount: ref.strokeCount,
      anchorWords:
        anchors.length > 0
          ? anchors.map((w) => ({ term: w.term, readingKana: w.readingKana, meaningFa: w.meaningFa }))
          : undefined,
      note: itemId.startsWith('kj-rec-')
        ? 'کانجی را ببین و معنا و خوانش‌هایش را به یاد بیاور.'
        : 'معنی و خوانش را ببین و شکل کانجی (و ترتیب ضربه‌هایش) را به یاد بیاور.',
    };
    const check = cardSatisfiesTemplate(card);
    if (!check.ok) return unknown; // template breach → honest unknown (never ratable)
    return card;
  }

  const descriptor = cardIndex().get(itemId);
  if (!descriptor) return unknown;

  const chapter = listChapters().find((c) => c.slug === descriptor.chapterSlug);
  if (!chapter) return unknown;
  const ref = descriptor.contentRef;

  // THE AUTHORITATIVE match: the registry items DECLARE their own fsrs ids
  // (VocabItem.fsrs.w/s · GrammarCluster.fsrs.gr · ExpressionItem.fsrs.chrk).
  // The descriptor's contentRef is derived from the same declarations, so the
  // fsrs-id match is the contract itself; the contentRef lookup below is the
  // fast path for the same answer.
  const word =
    chapter.words.find((w) => w.id === ref) ?? chapter.words.find((w) => w.fsrs.w === itemId || w.fsrs.s === itemId);
  if (word) {
    /* ENGINE-NEXTGEN W-D: the review word card carries the same derived dual
     * pronunciation the teaching card shows (one standard, one component —
     * translit honestly omitted when a glyph is uncovered). */
    const { fa: translitFa, errors } = transliterateKanaToFa(word.readingKana);
    return {
      itemId,
      kind,
      term: word.term,
      termFurigana: word.termFurigana,
      meaningFa: word.meaningFa,
      readingKana: word.readingKana,
      romaji: word.romaji,
      translitFa: errors.length === 0 ? translitFa : undefined,
      audio: hostWordAudioUrls(word.term) ?? undefined,
    };
  }
  // grammar clusters — contentRef IS the cluster id (gr-desu-identity …)
  const grammar = chapter.grammar.find((g) => g.id === ref) ?? chapter.grammar.find((g) => g.fsrs.gr === itemId);
  if (grammar) {
    return { itemId, kind, term: grammar.pattern, meaningFa: grammar.titleFa };
  }
  // formulaic expressions — contentRef IS the expression id (chrk-*)
  const expression =
    chapter.expressions.find((e) => e.id === ref) ?? chapter.expressions.find((e) => e.fsrs.chrk === itemId);
  if (expression) {
    return {
      itemId,
      kind,
      term: expression.ja,
      readingKana: expression.reading,
      meaningFa: expression.functionFa,
    };
  }
  // s-line sentence cards — the card is the dialogue LINE it was heard in.
  // The descriptor's chapter + the item's trailing l<n> locate the line under
  // the chapter's OWN dialogue (s-<dialogueSlug>-l<n>) — no string surgery on
  // chapter slugs, no guessed registry ids.
  if (descriptor.kind === 's-line') {
    const m = /l(\d+)$/.exec(itemId);
    const lineId = m ? `s-${chapter.dialogueSlug}-l${m[1]}` : null;
    if (lineId) {
      try {
        const bundle = loadDialogueBundle(chapter.dialogueSlug);
        const line = bundle.dialogue.lines.find((l) => l.id === lineId);
        if (line) {
          const entry = bundle.audio.entries.find((e) => e.lineId === lineId);
          return {
            itemId,
            kind,
            term: line.tokens.map((t) => t.surface).join(''),
            meaningFa: line.fa,
            audio: entry ? { opus: entry.files.opus, m4a: entry.files.m4a } : undefined,
            note: 'جملهٔ مکالمه — همان خطی که واژه را در آن شنیدی.',
          };
        }
      } catch {
        // unreadable dialogue bundle → honest unknown below
      }
    }
  }
  return unknown;
}
