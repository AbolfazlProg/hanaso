/**
 * HANASO — Knowledge Reference Registry builder (ENGINE-REFORM 2026-11-22).
 *
 * PURE + DETERMINISTIC: `buildKnowledgeRegistry(chapters)` walks the course in
 * course order, station by station, deck block by deck block, and registers
 * every taught item at its FIRST defining home. Two consecutive builds over
 * the same content are byte-identical (digest-proven); any content change
 * moves the digest (regression-proven) — the registry can never silently rot.
 *
 * What registers, in deck order (the automatic «ثبت دانش جدید»):
 *   kana-card       → kana entry (glyph; prereqs = base glyph + mark rules)
 *   vocab-card      → word entry (term/reading/meaning; prereqs = its glyphs+marks)
 *   expression-card → expression entry
 *   rule decks      → rule-mark entries (their rule unit) + derived-glyph entries
 *                     (every derived form DISPLAYED by a teaching surface)
 *   grammar         → cluster entries anchored via lineRefs (the eqa/model rule)
 *   every station   → objectiveCode + teachesConcepts → concept entries
 *
 * Chapter-chain inheritance: a station's cumulative taught set includes the
 * FULL taught sets of its chapter's prerequisiteChapterSlug chain (recursive),
 * because the soft lock guarantees those chapters are understood first.
 *
 * Exposure points (anchor dialogue, word.lineRef) are recorded SEPARATELY
 * (exposureAt) — first encounter is not teaching (mission §۳); the gates
 * enforce that nothing assesses an item before its real teaching point.
 */
import type { Chapter, Station, TeachingBlock } from '../types';
import { KANA_ITEMS, KANA_ITEMS_BY_ID } from '../content/kana-items';
import { transliterateKanaToFa } from '../content/translit-standard';
import { RULE_MARK_STATION, decomposeJa, derivedFormsIn, type RuleMark } from '../glyph-budget';
import { stationsInWalkOrder } from '../eqa/model';
import { KANJI_ITEMS_BY_ID } from '../kanji';
import type {
  KnowledgeEntry,
  KnowledgePoint,
  KnowledgeRegistry,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  RegistryIntegrityIssue,
  RegistrySource,
  RuleMarkId,
} from './types';

export const KNOWLEDGE_REGISTRY_SCHEMA_VERSION = 1;

/** Persian label of each rule mark (report copy). */
export const RULE_MARK_FA: Record<RuleMark, string> = {
  dakuten: 'قاعدهٔ داکوتن (゛)',
  handakuten: 'قاعدهٔ هان‌داکوتن (゜)',
  'yoon-small': 'قاعدهٔ کانای کوچک یُوئون',
  sokuon: 'قاعدهٔ سُکوئون (っ)',
  choonpu: 'قاعدهٔ خط کشیدهٔ کاتاکانا (ー)',
  'foreign-small': 'قاعدهٔ واج‌های کوچک خارجی (ファ/ティ/ヴ)',
};

/* ------------------------------------------------------------------ helpers */

const KANA_RE = /[\u3040-\u30ff]/;
const KANJI_RE = /[\u4e00-\u9fff]/;

/** Hiragana↔katakana fold (search convenience only — never used for matching truth). */
const KATA_TO_HIRA: Record<string, string> = {};
for (let c = 0x30a1; c <= 0x30f6; c++) KATA_TO_HIRA[String.fromCharCode(c)] = String.fromCharCode(c - 0x60);

export function foldScript(text: string): string {
  let out = '';
  for (const ch of text) out += KATA_TO_HIRA[ch] ?? ch;
  return out;
}

function normalizeQuery(text: string): string {
  return text.trim().toLowerCase();
}

function markIdOf(mark: RuleMark): RuleMarkId {
  return `mark-${mark}` as RuleMarkId;
}

/** glyph → kanaId (registry ids of base glyphs). */
const KANA_ID_BY_GLYPH = new Map(KANA_ITEMS.map((k) => [k.glyph, k.kanaId] as const));

/** FNV-1a 32-bit over a string — small, stable, dependency-free. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function entryKey(e: KnowledgeEntry): string {
  const t = e.firstTaught;
  return [
    e.id,
    e.kind,
    e.surface,
    e.reading ?? '',
    e.romaji ?? '',
    e.meaningFa ?? '',
    t.chapterSlug,
    t.stationSlug,
    String(t.stationOrder),
    t.blockId ?? '',
    ...e.prerequisites.slice().sort(),
  ].join('|');
}

/** Japanese text of a teaching display surface (the fold set of DERIVED-GLYPH-SHOWN). */
export function teachingDisplaySurfaces(block: TeachingBlock): string[] {
  const out: string[] = [];
  if (block.kind === 'kana-card') {
    const item = KANA_ITEMS_BY_ID[block.kanaId];
    if (item) out.push(item.glyph);
  }
  if (block.kind === 'rule-card') {
    out.push(block.patternJa);
    if (block.structureTable) block.structureTable.rows.forEach((r) => r.forEach((c) => out.push(c)));
  }
  if (block.kind === 'rule-prereq') {
    for (const item of block.items) {
      if (item.glyph) out.push(item.glyph);
      if (item.word) out.push(item.word);
    }
  }
  if (block.kind === 'rule-contrast') {
    out.push(block.a.ja);
    out.push(block.b.ja);
  }
  if (block.kind === 'rule-step') {
    if (block.word) out.push(block.word.ja);
    if (block.miniTable) block.miniTable.rows.forEach((r) => r.forEach((c) => out.push(c)));
  }
  return out.filter((s) => s.length > 0);
}

/* ------------------------------------------------------------------ builder */

/**
 * Build the course-wide knowledge registry. Deterministic: same input → same
 * digest. `dialogueLineHost` (optional, server/test side) maps a chapter's
 * dialogue line id → the station slug that first PLAYS it (for exposure
 * points); without it, exposure falls back to the chapter's anchor station.
 */
export function buildKnowledgeRegistry(
  chapters: RegistrySource,
  opts?: { dialogueLineHost?: (chapterSlug: string, lineRef: string) => string | undefined },
): KnowledgeRegistry {
  const entries: KnowledgeEntry[] = [];
  const byId = new Map<string, KnowledgeEntry>();
  const notes: RegistryIntegrityIssue[] = [];

  const taughtAt = new Map<string, KnowledgePoint>();
  const cumulativeByStation = new Map<string, Set<string>>();
  const cumulativeBeforeStation = new Map<string, Set<string>>();
  const stationsByChapter = new Map<string, string[]>();

  const course = chapters.map((c) => c.slug);
  const chapterIndex = new Map(chapters.map((c, i) => [c.slug, i] as const));

  /** The FULL prerequisite chain of a chapter (its entry knowledge), recursive. */
  const chainOf = (chapter: Chapter, seen = new Set<string>()): Chapter[] => {
    if (seen.has(chapter.slug)) return [];
    seen.add(chapter.slug);
    const prereqSlug = chapter.prerequisiteChapterSlug;
    if (!prereqSlug) return [];
    const prereq = chapters.find((c) => c.slug === prereqSlug);
    if (!prereq) {
      notes.push({
        rule: 'chain-unknown',
        message: `فصل ${chapter.slug} به فصل پیش‌نیاز ${prereqSlug} ارجاع می‌دهد که در ورودی‌های رجیستری نیست.`,
      });
      return [];
    }
    return [prereq, ...chainOf(prereq, seen)];
  };

  /** Entry knowledge = union of the prereq chapters' full taught sets. */
  const entryKnowledge = (chapter: Chapter): Set<string> => {
    const out = new Set<string>();
    for (const c of chainOf(chapter)) {
      const last = stationsInWalkOrder(c).at(-1);
      if (last) for (const id of cumulativeByStation.get(`${c.slug}/${last.slug}`) ?? []) out.add(id);
    }
    return out;
  };

  const register = (
    entry: Omit<KnowledgeEntry, 'prerequisites'> & { prerequisites?: string[] },
    allowDuplicate: 'error' | 'merge-exposure' = 'error',
  ) => {
    const existing = byId.get(entry.id);
    if (existing) {
      if (allowDuplicate === 'merge-exposure' && entry.exposureAt?.length) {
        existing.exposureAt = [...(existing.exposureAt ?? []), ...entry.exposureAt];
      }
      return; // anti-duplication: FIRST defining home wins; later uses are references
    }
    const full: KnowledgeEntry = { prerequisites: [], ...entry };
    entries.push(full);
    byId.set(full.id, full);
    taughtAt.set(full.id, full.firstTaught);
  };

  for (const chapter of chapters) {
    const chIdx = chapterIndex.get(chapter.slug) ?? 0;
    const running = entryKnowledge(chapter);
    const ordered = stationsInWalkOrder(chapter);

    /* --- grammar clusters: anchored to the earliest GRAMMAR/STRUCTURE station
     *     carrying ALL of the cluster's lines (the eqa/model.ts rule — the
     *     anchor/exposure station is NOT a grammar host: mission §۳/§۴ «مواجهه
     *     در مکالمه با تدریس واقعی اشتباه گرفته نشود» — the anchor plays the
     *     conversation for the FIRST time; it teaches nothing. Before this fix
     *     the earliest host was the anchor station itself, so every gr-* entry
     *     registered at order 1 — a dishonestly EARLY taught-point that let
     *     graded pre-teaching questions pass the timing gates. Ambiguity is
     *     reported, never guessed. */
    const grammarHost = new Map<string, Station>();
    const grammarStations = ordered.filter((s) => s.type === 'grammar' || s.type === 'structure');
    for (const cluster of chapter.grammar) {
      const hosts = grammarStations.filter(
        (s) => cluster.lineRefs.length > 0 && cluster.lineRefs.every((l) => s.lineRefs.includes(l)),
      );
      if (hosts.length === 0) {
        notes.push({
          rule: 'grammar-anchor-missing',
          message: `خوشهٔ گرامری ${cluster.id} (${cluster.pattern}) به هیچ ایستگاه لنگر نیست — تدریس‌شده ثبت نمی‌شود.`,
        });
        continue;
      }
      grammarHost.set(cluster.id, hosts[0]!);
      if (hosts.length > 1) {
        notes.push({
          rule: 'grammar-anchor-ambiguous',
          message: `خوشهٔ گرامری ${cluster.id} به ${hosts.length} ایستگاه لنگر است — earliest ثبت شد.`,
        });
      }
    }

    /* --- exposure host: the station that plays the anchor dialogue. */
    const dialogueStations = ordered.filter((s) => s.blocks.some((b) => b.kind === 'dialogue-player'));
    const anchorStation = dialogueStations[0] ?? ordered[0];

    const wordById = new Map(chapter.words.map((w) => [w.id, w]));
    const expressionById = new Map(chapter.expressions.map((x) => [x.id, x]));

    for (const station of ordered) {
      /* entry knowledge of THIS station (exclusive snapshot — the deck builds on it). */
      cumulativeBeforeStation.set(`${chapter.slug}/${station.slug}`, new Set(running));

      const pointOf = (blockId?: string): KnowledgePoint => ({
        chapterSlug: chapter.slug,
        stationSlug: station.slug,
        stationOrder: station.order,
        blockId,
        globalIndex: (chIdx + 1) * 10000 + station.order,
      });

      for (const [blockIndex, block] of station.blocks.entries()) {
        const p = pointOf(block.id);
        if (block.kind === 'kana-card') {
          const item = KANA_ITEMS_BY_ID[block.kanaId];
          if (!item) {
            notes.push({ rule: 'kana-unknown-id', message: `kana-card با شناسهٔ ناشناخته ${block.kanaId}.` });
            continue;
          }
          register({
            id: item.kanaId,
            kind: 'kana',
            surface: item.glyph,
            reading: item.romaji,
            romaji: item.romaji,
            prerequisites: [...glyphPrereqs(item.glyph)],
            firstTaught: p,
            script: item.script,
            row: item.row,
          });
        }
        if (block.kind === 'vocab-card') {
          const w = wordById.get(block.wordId);
          if (!w) {
            notes.push({ rule: 'word-unknown-id', message: `vocab-card با شناسهٔ ناشناخته ${block.wordId}.` });
            continue;
          }
          /* ENGINE-NEXTGEN W-D: the word's Persian transliteration is DERIVED
           * by the locked word-level standard — never authored per word (the
           * drift source the audit found). An uncovered glyph files a note and
           * leaves translitFa undefined rather than guessing. */
          const { fa: translitFa, errors: translitErrors } = transliterateKanaToFa(w.readingKana);
          if (translitErrors.length > 0) {
            notes.push({
              rule: 'word-translit-uncovered',
              message: `واژهٔ ${w.id} (${w.readingKana}): مورای پوشش‌نشده در استاندارد آوانویسی — ${translitErrors.join('؛ ')}.`,
            });
          }
          const exposureStation =
            (w.lineRef && opts?.dialogueLineHost?.(chapter.slug, w.lineRef)) || anchorStation?.slug;
          register({
            id: w.id,
            kind: 'word',
            surface: w.term,
            reading: w.readingKana,
            romaji: w.romaji,
            translitFa: translitErrors.length === 0 ? translitFa : undefined,
            meaningFa: w.meaningFa,
            prerequisites: [...glyphPrereqs(w.readingKana)],
            firstTaught: p,
            exposureAt:
              w.lineRef && exposureStation && anchorStation
                ? [
                    {
                      chapterSlug: chapter.slug,
                      stationSlug: exposureStation,
                      stationOrder: anchorStation.order,
                      globalIndex: (chIdx + 1) * 10000 + anchorStation.order,
                    },
                  ]
                : undefined,
          });
        }
        if (block.kind === 'expression-card') {
          const x = expressionById.get(block.expressionId);
          if (!x) {
            notes.push({
              rule: 'expression-unknown-id',
              message: `expression-card با شناسهٔ ناشناخته ${block.expressionId}.`,
            });
            continue;
          }
          register({
            id: x.id,
            kind: 'expression',
            surface: x.ja,
            reading: x.reading,
            meaningFa: x.functionFa,
            prerequisites: [...glyphPrereqs(x.reading)],
            firstTaught: p,
          });
        }
        /*
         * KANJI-TWO-PHASE §۲ — the dedicated kanji teaching card. The KANJI
         * CONTRACT folds into the registry here:
         *   K1  only a station of type 'kanji' may register a kanji (a kanji-card
         *       anywhere else is a contract breach — noted, never silently
         *       accepted; EQA-12 turns it into an error);
         *   K3  every anchor word must be a REGISTERED word taught strictly
         *       BEFORE this kanji point (global order; deck order inside the
         *       same station) — readings ride inside anchor words (D-0006);
         *   the kanji's reading glyphs join the prerequisites (the readings are
         *       displayed on the card in kana — those glyphs must be known).
         */
        if (block.kind === 'kanji-card') {
          if (station.type !== 'kanji') {
            notes.push({
              rule: 'kanji-card-outside-kanji-station',
              message: `کانجی‌کارت ${block.id} در ایستگاه ${station.slug} از نوع ${station.type} است — تدریس کانجی فقط در ایستگاه اختصاصی kanji مجاز است (معرفی در کارت واژه = تدریس نیست).`,
            });
            continue;
          }
          const ref = KANJI_ITEMS_BY_ID.get(block.kanjiId);
          if (!ref) {
            notes.push({
              rule: 'kanji-unknown-id',
              message: `kanji-card با شناسهٔ ناشناخته ${block.kanjiId} — در مرجع N5 موجود نیست.`,
            });
            continue;
          }
          const declared = chapter.kanji?.find((k) => k.kanjiId === block.kanjiId);
          if (!declared) {
            notes.push({
              rule: 'kanji-card-undeclared',
              message: `کانجی ${ref.literal} (${block.kanjiId}) در ایستگاه ${station.slug} تدریس می‌شود اما در فهرست kanji فصل ${chapter.slug} اعلام نشده است.`,
            });
          }
          const anchorIds: string[] = [];
          for (const wid of block.anchorWordIds) {
            const w = wordById.get(wid);
            if (!w) {
              notes.push({
                rule: 'kanji-anchor-unknown-word',
                message: `کانجی ${ref.literal}: واژهٔ anchor ناشناخته ${wid}.`,
              });
              continue;
            }
            const wEntry = byId.get(wid);
            const wIdx = wEntry
              ? wEntry.firstTaught.stationSlug === station.slug
                ? station.blocks.findIndex((b) => b.id === wEntry.firstTaught.blockId)
                : -2
              : -1;
            const before =
              wEntry !== undefined &&
              (wEntry.firstTaught.globalIndex < p.globalIndex || (wIdx >= 0 && wIdx < blockIndex));
            if (!before) {
              notes.push({
                rule: 'kanji-anchor-not-before',
                message: `کانجی ${ref.literal} (${block.kanjiId}): واژهٔ anchor «${w.term}» (${wid}) پیش از ایستگاه ${station.slug} تدریس نشده است — خوانش کانجی باید داخل واژهٔ آموزش‌دیده قبلی باشد (D-0006).`,
              });
            }
            anchorIds.push(wid);
          }
          if (anchorIds.length === 0) {
            notes.push({
              rule: 'kanji-anchor-empty',
              message: `کانجی ${ref.literal} (${block.kanjiId}) هیچ واژهٔ anchor معتبری ندارد — حداقل ۲ واژهٔ آموزش‌دیده قبلی لازم است (kanji-interaction-blueprint).`,
            });
          }
          const readingPrereqs = [...ref.on, ...ref.kun].flatMap((r) => glyphPrereqs(r.replace(/[-.]/g, '')));
          register({
            id: block.kanjiId,
            kind: 'kanji',
            surface: ref.literal,
            romaji: ref.meaningsEn[0],
            meaningFa: ref.meaningFa,
            prerequisites: [...new Set([...anchorIds, ...readingPrereqs])],
            firstTaught: p,
            kanjiId: block.kanjiId,
            strokeCount: ref.strokeCount,
          });
        }
        /* rule decks: every derived form DISPLAYED by a teaching surface is
         * taught at that display (the DERIVED-GLYPH-SHOWN fold set). */
        for (const surface of teachingDisplaySurfaces(block)) {
          for (const form of derivedFormsIn(surface)) {
            register({
              id: `glyph-${form}`,
              kind: 'derived-glyph',
              surface: form,
              prerequisites: [...glyphPrereqs(form)],
              firstTaught: p,
            });
          }
        }
      }

      /* rule marks: registered at their authored rule unit (RULE_MARK_STATION). */
      for (const mark of Object.keys(RULE_MARK_STATION) as RuleMark[]) {
        if (RULE_MARK_STATION[mark] === station.slug) {
          const ruleBlock = station.blocks.find(
            (b) => b.kind === 'rule-card' || b.kind === 'rule-step' || b.kind === 'rule-prereq',
          );
          register({
            id: markIdOf(mark),
            kind: 'rule-mark',
            surface: mark,
            meaningFa: RULE_MARK_FA[mark],
            prerequisites: [],
            firstTaught: pointOf(ruleBlock?.id),
          });
        }
      }

      /* grammar clusters anchored to this station. */
      for (const [clusterId, host] of grammarHost) {
        if (host.slug !== station.slug) continue;
        const cluster = chapter.grammar.find((g) => g.id === clusterId)!;
        register({
          id: cluster.id,
          kind: 'grammar',
          surface: cluster.pattern,
          meaningFa: cluster.titleFa,
          prerequisites: [...glyphPrereqs(cluster.pattern)],
          firstTaught: pointOf(station.blocks.find((b) => b.kind === 'rule-card' || b.kind === 'guided-discovery')?.id),
        });
      }

      /* station-declared concepts (objectiveCode + teachesConcepts). */
      const declared = new Set<string>([station.objectiveCode, ...(station.teachesConcepts ?? [])]);
      for (const c of declared) {
        if (!c) continue;
        register({
          id: c,
          kind: 'concept',
          surface: c,
          meaningFa: station.objectiveFa,
          firstTaught: pointOf(),
        });
      }

      /* cumulative taught set at this station (entry knowledge + own stations so far). */
      for (const b of station.blocks) {
        if (b.kind === 'kana-card' && KANA_ITEMS_BY_ID[b.kanaId]) running.add(b.kanaId);
        if (b.kind === 'vocab-card') running.add(b.wordId);
        if (b.kind === 'expression-card') running.add(b.expressionId);
        if (b.kind === 'kanji-card') running.add(b.kanjiId);
        for (const s of teachingDisplaySurfaces(b)) for (const f of derivedFormsIn(s)) running.add(`glyph-${f}`);
      }
      for (const mark of Object.keys(RULE_MARK_STATION) as RuleMark[]) {
        if (RULE_MARK_STATION[mark] === station.slug) running.add(markIdOf(mark));
      }
      for (const [clusterId, host] of grammarHost) if (host.slug === station.slug) running.add(clusterId);
      for (const c of declared) if (c) running.add(c);
      cumulativeByStation.set(`${chapter.slug}/${station.slug}`, new Set(running));
    }

    stationsByChapter.set(
      chapter.slug,
      ordered.map((s) => s.slug),
    );

    /* KANJI-TWO-PHASE §۲: every DECLARED kanji target must actually have a
     * dedicated teaching card in this chapter's walk (a declaration without
     * its kanji-card is a dead teaching claim — noted, surfaced by EQA-12). */
    for (const item of chapter.kanji ?? []) {
      if (!byId.has(item.kanjiId)) {
        notes.push({
          rule: 'kanji-declared-not-taught',
          message: `فصل ${chapter.slug}: کانجی ${item.kanjiId} در فهرست kanji اعلام شده اما هیچ kanji-card اختصاصی در ایستگاه‌های فصل ندارد.`,
        });
      }
    }
  }

  /* --- indexes --- */
  const bySurface = new Map<string, KnowledgeEntry[]>();
  const bySurfaceFolded = new Map<string, KnowledgeEntry[]>();
  const byReading = new Map<string, KnowledgeEntry[]>();
  for (const e of entries) {
    if (KANA_RE.test(e.surface) || (e.kind === 'kanji' && e.surface.length === 1)) {
      const list = bySurface.get(e.surface) ?? [];
      list.push(e);
      bySurface.set(e.surface, list);
      const folded = foldScript(e.surface);
      const flist = bySurfaceFolded.get(folded) ?? [];
      flist.push(e);
      bySurfaceFolded.set(folded, flist);
    }
    if (e.reading && KANA_RE.test(e.reading)) {
      const list = byReading.get(e.reading) ?? [];
      list.push(e);
      byReading.set(e.reading, list);
    }
    /* kanji: the on/kun readings are searchable surfaces too (reference lookup). */
    if (e.kind === 'kanji') {
      const ref = KANJI_ITEMS_BY_ID.get(e.kanjiId ?? '');
      if (ref) {
        for (const r of [...ref.on, ...ref.kun]) {
          const list = byReading.get(r) ?? [];
          list.push(e);
          byReading.set(r, list);
        }
      }
    }
  }

  const digest = fnv1a(entries.map(entryKey).sort().join('\n'));

  return {
    schemaVersion: KNOWLEDGE_REGISTRY_SCHEMA_VERSION,
    digest,
    course,
    entries,
    byId,
    bySurface,
    bySurfaceFolded,
    byReading,
    taughtAt,
    cumulativeByStation,
    cumulativeBeforeStation,
    stationsByChapter,
    notes,
  };
}

/* ------------------------------------------------------------------ helpers for prereqs */

/** Registry ids a Japanese form presupposes: its base glyphs + its rule marks. */
function glyphPrereqs(text: string): string[] {
  const req = decomposeJa(text);
  const ids: string[] = [];
  for (const g of req.base) {
    const id = KANA_ID_BY_GLYPH.get(g);
    if (id) ids.push(id);
  }
  for (const mark of req.marks) ids.push(markIdOf(mark));
  return ids;
}

/* ------------------------------------------------------------------ queries */

/** Cumulative taught ids at a station (prereq-chain knowledge included). */
export function taughtSetAt(registry: KnowledgeRegistry, chapterSlug: string, stationSlug: string): Set<string> {
  return registry.cumulativeByStation.get(`${chapterSlug}/${stationSlug}`) ?? new Set<string>();
}

/** Is the item taught at or before the given station (inclusive)? */
export function isTaughtAtOrBefore(
  registry: KnowledgeRegistry,
  id: string,
  chapterSlug: string,
  stationSlug: string,
): boolean {
  return taughtSetAt(registry, chapterSlug, stationSlug).has(id);
}

/** First-teaching point of an item (undefined = never taught in this course). */
export function taughtAtPoint(registry: KnowledgeRegistry, id: string): KnowledgePoint | undefined {
  return registry.taughtAt.get(id);
}

/** Fast search over the registry (surface/reading/romaji/id; script-folding optional). */
export function searchKnowledge(registry: KnowledgeRegistry, query: KnowledgeSearchQuery): KnowledgeSearchResult[] {
  const q = query.query !== undefined ? normalizeQuery(query.query) : undefined;
  const results: KnowledgeSearchResult[] = [];
  for (const e of registry.entries) {
    if (query.kinds && !query.kinds.includes(e.kind)) continue;
    if (query.chapter && e.firstTaught.chapterSlug !== query.chapter) continue;
    if (query.taughtBy) {
      const set = taughtSetAt(registry, query.taughtBy.chapterSlug, query.taughtBy.stationSlug);
      if (!set.has(e.id)) continue;
    }
    if (q === undefined) {
      results.push({ entry: e, matchedOn: 'id' });
    } else {
      const candidates: Array<{ text: string; on: KnowledgeSearchResult['matchedOn'] }> = [
        { text: e.surface, on: 'surface' },
        ...(e.reading ? [{ text: e.reading, on: 'reading' as const }] : []),
        ...(e.romaji ? [{ text: e.romaji, on: 'romaji' as const }] : []),
      ];
      let matched: KnowledgeSearchResult['matchedOn'] | undefined;
      for (const c of candidates) {
        const norm = normalizeQuery(c.text);
        if (query.exact ? norm === q : norm.includes(q)) {
          matched = c.on;
          break;
        }
        if (query.foldScript && KANA_RE.test(norm) && foldScript(norm).includes(foldScript(q))) {
          matched = c.on;
          break;
        }
      }
      if (!matched && e.id.toLowerCase().includes(q)) matched = 'id';
      if (matched) results.push({ entry: e, matchedOn: matched });
    }
    if (query.limit && results.length >= query.limit) break;
  }
  return results;
}

/**
 * KANJI-TWO-PHASE §۲ — the per-level kanji tracking surface: the course's
 * taught kanji, in course order (globalIndex), joined to their chapter and
 * level. «کانجی‌های موردنیاز هر سطح و ترتیب آموزش آن‌ها قابل رهگیری باشد» —
 * this query is the engine-side answer (reports/EQA-12 render from it).
 */
export function kanjiTaughtSequence(
  registry: KnowledgeRegistry,
  chapters?: RegistrySource,
): {
  entry: KnowledgeEntry;
  chapterSlug: string;
  levelCode: string;
}[] {
  const levelByChapter = new Map((chapters ?? []).map((c) => [c.slug, c.levelCode] as const));
  return registry.entries
    .filter((e) => e.kind === 'kanji')
    .sort((a, b) => a.firstTaught.globalIndex - b.firstTaught.globalIndex)
    .map((entry) => ({
      entry,
      chapterSlug: entry.firstTaught.chapterSlug,
      levelCode: levelByChapter.get(entry.firstTaught.chapterSlug) ?? '',
    }));
}

/** All kanji registry entries first-taught in a given chapter. */
export function kanjiTaughtInChapter(registry: KnowledgeRegistry, chapterSlug: string): KnowledgeEntry[] {
  return registry.entries.filter((e) => e.kind === 'kanji' && e.firstTaught.chapterSlug === chapterSlug);
}

/** Is the kanji taught at or before the given station (dedicated station's card)? */
export function isKanjiTaughtAtOrBefore(
  registry: KnowledgeRegistry,
  kanjiId: string,
  chapterSlug: string,
  stationSlug: string,
): boolean {
  return isTaughtAtOrBefore(registry, kanjiId, chapterSlug, stationSlug);
}

/**
 * Find the registered words CONTAINED in a Japanese surface (the word-level
 * prerequisite probe). Longest surfaces first so a longer registered term is
 * preferred over overlapping shorter ones; a match fully covered by a longer
 * DIFFERENT word is dropped. Words match by term AND by reading (both are
 * learner-visible surfaces of the same item).
 */
export function wordsInSurface(
  registry: KnowledgeRegistry,
  surface: string,
): { entry: KnowledgeEntry; start: number; length: number }[] {
  const words = registry.entries
    .filter((e) => e.kind === 'word' && e.surface.length >= 2 && (KANA_RE.test(e.surface) || KANJI_RE.test(e.surface)))
    .sort((a, b) => b.surface.length - a.surface.length);
  const found: { entry: KnowledgeEntry; start: number; length: number }[] = [];
  for (const w of words) {
    const forms = [w.surface, ...(w.reading && w.reading !== w.surface ? [w.reading] : [])];
    for (const form of forms) {
      let from = 0;
      for (;;) {
        const at = surface.indexOf(form, from);
        if (at < 0) break;
        found.push({ entry: w, start: at, length: form.length });
        from = at + 1;
      }
    }
  }
  return found.filter(
    (f) =>
      !found.some(
        (g) =>
          g !== f &&
          g.entry.id !== f.entry.id &&
          g.start <= f.start &&
          g.start + g.length >= f.start + f.length &&
          g.length > f.length,
      ),
  );
}
