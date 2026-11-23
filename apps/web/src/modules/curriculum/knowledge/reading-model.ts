/**
 * HANASO — the Smart Ruby reading model (SMART-RUBY 2026-11-23 §۱) — PURE module.
 *
 * The engine's single source of truth for READING Japanese text: a derived,
 * deterministic index of (a) every course word's written surface → kana
 * reading, and (b) the N5 reference kanji facts (readings/meanings/strokes).
 * Everything the learner-facing ruby display needs is answered HERE — the
 * content agent never hand-decides furigana per word (mission §۲):
 *
 *   - `annotateJa(text, model)` — segments ANY Japanese string into word /
 *     kanji / kana / other runs (longest-match over the course vocabulary);
 *   - `alignBaseToReading(base, reading, model)` — the per-character reading
 *     alignment (kanji ↔ kana segments, rendaku-voicing aware) that decides
 *     WHICH reading of a kanji a word exhibits;
 *   - `buildLearnerJaView(...)` — the per-LEARNER taught state (kanji taught
 *     by a COMPLETED station; readings taught inside completed anchor
 *     words) — the only truth the ruby show/hide law may consult;
 *   - `rubyState(...)` — the display law itself: kanji+reading taught → ruby
 *     hidden by default (tap reveals); anything untaught → ruby shown.
 *
 * No parallel truth: the model is BUILT from the chapters' authored content
 * (ADR-008) and the N5 reference — never hand-authored, never persisted.
 * Importable from BOTH server and client (no node/browser deps).
 */
import type { Chapter } from '../types';
import { KANJI_ITEMS } from '../kanji';

/* ------------------------------------------------------------- primitives */

/** CJK unified ideographs (the kanji ranges KanjiVG/KANJIDIC2 cover here). */
const KANJI_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
/** Kana + chōonpu + prolonged marks. */
const KANA_RE = /[\u3041-\u30ff\uff66-\uff9f]/;

export function isKanjiChar(ch: string): boolean {
  return KANJI_RE.test(ch);
}
export function isKanaChar(ch: string): boolean {
  return KANA_RE.test(ch);
}

/** Katakana → hiragana fold (code-point arithmetic; marks untouched). */
export function foldKana(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // ァ..ミ (0x30a1..0x30f6 core katakana), ガ.. Voiced block included in range:
    if (cp >= 0x30a1 && cp <= 0x30f6) out += String.fromCodePoint(cp - 0x60);
    // ャ..ー small katakana + chōonpu (0x30fc..0x30ff) have no hiragana twin
    else out += ch;
  }
  return out;
}

/** Strip KANJIDIC2 kun punctuation ('-', '.', trailing okurigana markers). */
export function cleanReading(readings: string): string {
  return readings.replace(/[-.・]/g, '');
}

/**
 * The ROOT of a kun reading — the portion the kanji itself reads (before the
 * okurigana marker): 'き.る' → 'き', '-きた' → 'きた'. Verb/adjective kun
 * readings carry their okurigana in the WORD surface (来ました), so the root
 * is what the alignment consumes.
 */
export function kunRoot(readings: string): string {
  const head = readings.split('.')[0]!;
  return head.replace(/^-/, '');
}

/** Rendaku voicing tables (first-mora voicing of a candidate reading). */
const VOICE_MAP: Record<string, string[]> = {
  か: ['が'],
  き: ['ぎ'],
  く: ['ぐ'],
  け: ['げ'],
  こ: ['ご'],
  さ: ['ざ'],
  し: ['じ'],
  す: ['ず'],
  せ: ['ぜ'],
  そ: ['ぞ'],
  た: ['だ', 'た'],
  ち: ['ぢ'],
  つ: ['づ', 'っ'],
  て: ['で'],
  と: ['ど'],
  は: ['ば', 'ぱ'],
  ひ: ['び', 'ぴ'],
  ふ: ['ぶ', 'ぷ'],
  へ: ['べ', 'ぺ'],
  ほ: ['ぼ', 'ぽ'],
};
const VOICE_EXTRA: Record<string, string[]> = {
  た: ['だ'],
  ち: ['ぢ'],
  つ: ['づ'],
};

/** All rendaku-voiced variants of a kana reading (e.g. こく → ごく). */
export function voicedVariants(reading: string): string[] {
  if (!reading) return [];
  const first = reading[0]!;
  const rest = reading.slice(1);
  const variants = new Set<string>();
  const base = VOICE_MAP[first];
  if (base) {
    for (const v of base) variants.add(v + rest);
  }
  const extra = VOICE_EXTRA[first];
  if (extra) {
    for (const v of extra) variants.add(v + rest);
  }
  return [...variants];
}

/* ------------------------------------------------------------- model types */

export interface ReadingModelWord {
  surface: string;
  reading: string;
  wordId: string;
  meaningFa: string;
}

export interface ReadingModelKanji {
  literal: string;
  kanjiId: string | null;
  /** hiragana-normalized candidate readings (on+kun, cleaned). */
  candidates: string[];
  /** Raw reference readings for display (katakana on / hiragana kun, cleaned). */
  on: string[];
  kun: string[];
  meaningFa: string | null;
  strokeCount: number | null;
}

export interface ReadingModel {
  /** word surface → word (longest-match segmentation dictionary). */
  wordsBySurface: Map<string, ReadingModelWord>;
  /** surfaces bucketed by first char, longest first (matcher input). */
  surfacesByFirst: Map<string, ReadingModelWord[]>;
  kanjiByLiteral: Map<string, ReadingModelKanji>;
  chapterSlugs: string[];
}

/** Build the model from the course chapters — deterministic, derived. */
export function buildReadingModel(chapters: readonly Chapter[]): ReadingModel {
  const wordsBySurface = new Map<string, ReadingModelWord>();
  const kanjiByLiteral = new Map<string, ReadingModelKanji>();
  for (const chapter of chapters) {
    for (const w of chapter.words) {
      if (!w.term || /[\s]/.test(w.term)) continue;
      // first definition wins (anti-duplication — same surface = same reading
      // is the content contract; a conflicting duplicate is a validation
      // finding, not something this builder guesses about)
      if (!wordsBySurface.has(w.term)) {
        wordsBySurface.set(w.term, { surface: w.term, reading: w.readingKana, wordId: w.id, meaningFa: w.meaningFa });
      }
    }
    // kanji literals that appear in word surfaces but not (yet) in the N5
    // reference — registered with candidates from the words they appear in
    // (derived at align time; the reference-less entry stays honest: no
    // meaning, no stroke count, no reference id)
    for (const w of chapter.words) {
      for (const ch of w.term) {
        if (isKanjiChar(ch) && !kanjiByLiteral.has(ch)) {
          kanjiByLiteral.set(ch, {
            literal: ch,
            kanjiId: null,
            candidates: [],
            on: [],
            kun: [],
            meaningFa: null,
            strokeCount: null,
          });
        }
      }
    }
  }
  for (const ref of KANJI_ITEMS) {
    const candidates = dedupeStable([
      ...ref.on.map((r) => cleanReading(foldKana(r))),
      ...ref.kun.map((r) => kunRoot(r)),
      ...ref.kun.map((r) => cleanReading(r)),
    ]);
    kanjiByLiteral.set(ref.literal, {
      literal: ref.literal,
      kanjiId: ref.kanjiId,
      candidates,
      on: ref.on.map((r) => cleanReading(r)),
      kun: ref.kun.map((r) => cleanReading(r)),
      meaningFa: ref.meaningFa,
      strokeCount: ref.strokeCount,
    });
  }
  const surfacesByFirst = new Map<string, ReadingModelWord[]>();
  for (const w of wordsBySurface.values()) {
    const key = w.surface[0]!;
    const list = surfacesByFirst.get(key) ?? [];
    list.push(w);
    surfacesByFirst.set(key, list);
  }
  for (const list of surfacesByFirst.values()) {
    list.sort((a, b) => b.surface.length - a.surface.length || a.surface.localeCompare(b.surface));
  }
  bootstrapUnknownReadings(wordsBySurface, kanjiByLiteral);
  return {
    wordsBySurface,
    surfacesByFirst,
    kanjiByLiteral,
    chapterSlugs: chapters.map((c) => c.slug),
  };
}

/**
 * Kanji literals that appear in word surfaces but NOT in the N5 reference
 * (e.g. 韓 in 韓国人) have no KANJIDIC2 candidates — derive them by bootstrapping:
 * a word whose OTHER kanji all resolve pins the unknown's kana segment. Runs to
 * a fixpoint (a derived literal can unblock another word), deterministic.
 */
function bootstrapUnknownReadings(
  wordsBySurface: Map<string, ReadingModelWord>,
  kanjiByLiteral: Map<string, ReadingModelKanji>,
): void {
  const words = [...wordsBySurface.values()];
  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (const w of words) {
      if (!w.surface.split('').some(isKanjiChar)) continue;
      if (
        alignBaseToReading(w.surface, w.reading, {
          wordsBySurface,
          surfacesByFirst: new Map(),
          kanjiByLiteral,
          chapterSlugs: [],
        })
      ) {
        continue; // already strict-alignable
      }
      const segs = alignWild(w.surface, foldKana(w.reading), kanjiByLiteral, []);
      if (!segs) continue;
      for (const s of segs) {
        if (!s.wild) continue;
        const entry = kanjiByLiteral.get(s.ch)!;
        if (!entry.candidates.includes(s.reading)) {
          entry.candidates.push(s.reading);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

/** Alignment where candidate-less (reference-less) kanji may consume any run. */
function alignWild(
  base: string,
  reading: string,
  kanjiByLiteral: Map<string, ReadingModelKanji>,
  acc: { ch: string; reading: string; wild: boolean }[],
): { ch: string; reading: string; wild: boolean }[] | null {
  if (base.length === 0) return reading.length === 0 ? acc : null;
  const ch = base[0]!;
  if (isKanjiChar(ch)) {
    const entry = kanjiByLiteral.get(ch);
    const candidates = entry ? [...entry.candidates, ...entry.candidates.flatMap((c) => voicedVariants(c))] : [];
    candidates.sort((a, b) => b.length - a.length || a.localeCompare(b));
    for (const cand of candidates) {
      if (reading.startsWith(cand)) {
        const next = alignWild(base.slice(1), reading.slice(cand.length), kanjiByLiteral, [
          ...acc,
          { ch, reading: cand, wild: false },
        ]);
        if (next) return next;
      }
    }
    if (entry && entry.kanjiId === null && candidates.length === 0) {
      // reference-less literal: try every bounded consumption (wild)
      for (let len = 1; len <= Math.min(6, reading.length); len += 1) {
        const seg = reading.slice(0, len);
        const next = alignWild(base.slice(1), reading.slice(len), kanjiByLiteral, [
          ...acc,
          { ch, reading: seg, wild: true },
        ]);
        if (next) return next;
      }
    }
    return null;
  }
  if (isKanaChar(ch)) {
    const folded = foldKana(ch);
    if (reading.startsWith(folded)) {
      return alignWild(base.slice(1), reading.slice(folded.length), kanjiByLiteral, [
        ...acc,
        { ch, reading: folded, wild: false },
      ]);
    }
    return null;
  }
  if (reading.startsWith(ch)) {
    return alignWild(base.slice(1), reading.slice(ch.length), kanjiByLiteral, [
      ...acc,
      { ch, reading: ch, wild: false },
    ]);
  }
  return null;
}

function dedupeStable(items: string[]): string[] {
  const seen = new Set<string>();
  for (const item of items) if (item && !seen.has(item)) seen.add(item);
  return [...seen];
}

/* ------------------------------------------------------------- alignment */

export interface AlignedSegment {
  /** The base character (one base char per segment — kana or kanji). */
  ch: string;
  /** The kana reading this char consumes (kanji: its segment; kana: itself folded). */
  reading: string;
  isKanji: boolean;
}

/**
 * Align a kanji-bearing base to its kana reading, per character: each kanji
 * consumes a candidate reading segment (rendaku variants included); each
 * kana consumes itself (script-folded). Returns null when the reading does
 * not decompose over the base with KNOWN readings — the honest "unaligned"
 * state (validation flags it; the ruby law then shows furigana).
 */
export function alignBaseToReading(base: string, reading: string, model: ReadingModel): AlignedSegment[] | null {
  const target = foldKana(reading);
  const result = alignFrom(base, 0, target, 0, model, []);
  return result;
}

function alignFrom(
  base: string,
  bi: number,
  reading: string,
  ri: number,
  model: ReadingModel,
  acc: AlignedSegment[],
): AlignedSegment[] | null {
  if (bi >= base.length) return ri >= reading.length ? acc : null;
  const ch = base[bi]!;
  if (isKanjiChar(ch)) {
    const entry = model.kanjiByLiteral.get(ch);
    const candidates = entry ? [...entry.candidates, ...entry.candidates.flatMap((c) => voicedVariants(c))] : [];
    // deterministic preference: longest candidate first, then lexicographic
    candidates.sort((a, b) => b.length - a.length || a.localeCompare(b));
    for (const cand of candidates) {
      if (reading.startsWith(cand, ri)) {
        const next = alignFrom(base, bi + 1, reading, ri + cand.length, model, [
          ...acc,
          { ch, reading: cand, isKanji: true },
        ]);
        if (next) return next;
      }
    }
    return null;
  }
  if (isKanaChar(ch)) {
    const folded = foldKana(ch);
    if (reading.startsWith(folded, ri)) {
      return alignFrom(base, bi + 1, reading, ri + folded.length, model, [
        ...acc,
        { ch, reading: folded, isKanji: false },
      ]);
    }
    return null;
  }
  // punctuation / latin / wave: must appear on both sides verbatim
  if (reading.startsWith(ch, ri)) {
    return alignFrom(base, bi + 1, reading, ri + ch.length, model, [...acc, { ch, reading: ch, isKanji: false }]);
  }
  return null;
}

/* ------------------------------------------------------------- annotation */

export type JaSegmentKind = 'word' | 'kanji' | 'kana' | 'other';

export interface JaSegment {
  kind: JaSegmentKind;
  surface: string;
  /** word segments: the word's kana reading (ruby rt). */
  reading?: string;
  wordId?: string;
  /** kanji segments: the standalone literal (inspect popover data). */
  kanjiLiteral?: string;
}

/** Kanji literals in `text` that the model cannot resolve at all. */
export function unknownKanjiIn(text: string, model: ReadingModel): string[] {
  const out: string[] = [];
  for (const seg of annotateJa(text, model)) {
    if (seg.kind !== 'other') continue;
    for (const ch of seg.surface) if (isKanjiChar(ch) && !out.includes(ch)) out.push(ch);
  }
  return out;
}

/**
 * Segment ANY Japanese string: longest-match over the course vocabulary
 * (word segments carry the ruby reading), then runs of kanji literals
 * (inspect-only), kana, and other characters.
 */
export function annotateJa(text: string, model: ReadingModel): JaSegment[] {
  const out: JaSegment[] = [];
  let i = 0;
  while (i < text.length) {
    const bucket = model.surfacesByFirst.get(text[i]!);
    if (bucket) {
      let matched: ReadingModelWord | null = null;
      for (const w of bucket) {
        if (text.startsWith(w.surface, i)) {
          matched = w;
          break; // bucket is longest-first
        }
      }
      if (matched) {
        out.push({ kind: 'word', surface: matched.surface, reading: matched.reading, wordId: matched.wordId });
        i += matched.surface.length;
        continue;
      }
    }
    // no word match: consume a homogeneous run
    const ch = text[i]!;
    if (isKanjiChar(ch)) {
      let j = i + 1;
      while (j < text.length && isKanjiChar(text[j]!)) j += 1;
      const run = text.slice(i, j);
      if (model.kanjiByLiteral.has(ch)) {
        // inspect-only kanji run (each char known to the reference/words)
        out.push({ kind: 'kanji', surface: run, kanjiLiteral: ch });
      } else {
        out.push({ kind: 'other', surface: run });
      }
      i = j;
      continue;
    }
    if (isKanaChar(ch)) {
      let j = i + 1;
      while (j < text.length && isKanaChar(text[j]!)) j += 1;
      out.push({ kind: 'kana', surface: text.slice(i, j) });
      i = j;
      continue;
    }
    let j = i + 1;
    while (j < text.length && !isKanjiChar(text[j]!) && !isKanaChar(text[j]!) && !model.surfacesByFirst.has(text[j]!)) {
      j += 1;
    }
    out.push({ kind: 'other', surface: text.slice(i, j) });
    i = j;
  }
  return out;
}

/* ------------------------------------------------------- learner view */

export interface LearnerKanjiState {
  literal: string;
  kanjiId: string | null;
  /** Teaching completed by THIS learner at the kanji's dedicated station. */
  taught: boolean;
  /** Kana readings taught to this learner inside COMPLETED anchor words. */
  readings: string[];
  meaningFa: string | null;
  strokeCount: number | null;
  /** Station title (Persian) where the kanji is taught — popover provenance. */
  taughtStationTitleFa: string | null;
}

export interface LearnerWordState {
  surface: string;
  reading: string;
  taught: boolean;
}

export interface LearnerJaView {
  schemaVersion: number;
  completedStations: string[];
  kanji: LearnerKanjiState[];
  words: LearnerWordState[];
}

/**
 * The per-learner ruby truth (mission §۲): kanji is taught iff ITS station is
 * completed by this learner; a reading is taught iff it is exhibited by an
 * anchor word of that kanji whose TEACHING station this learner completed.
 * Presence in content/dialogue/registry is NEVER teaching — only completed
 * stations count.
 */
export function buildLearnerJaView(input: {
  chapters: readonly Chapter[];
  /** firstTaught per registry id — the course-level teaching truth. */
  taughtAt: Map<string, { chapterSlug: string; stationSlug: string }>;
  /** Station slugs COMPLETED by this learner (all chapters). */
  completedStationSlugs: ReadonlySet<string>;
  /** Station slug → Persian title (popover provenance). */
  stationTitleBySlug: Map<string, string>;
  model: ReadingModel;
}): LearnerJaView {
  const { chapters, taughtAt, completedStationSlugs, stationTitleBySlug, model } = input;
  const kanjiByLiteral = new Map<string, LearnerKanjiState>();
  const words: LearnerWordState[] = [];
  const seenWordIds = new Set<string>();

  const registerKanji = (literal: string): LearnerKanjiState => {
    let state = kanjiByLiteral.get(literal);
    if (!state) {
      const ref = model.kanjiByLiteral.get(literal);
      state = {
        literal,
        kanjiId: ref?.kanjiId ?? null,
        taught: false,
        readings: [],
        meaningFa: ref?.meaningFa ?? null,
        strokeCount: ref?.strokeCount ?? null,
        taughtStationTitleFa: null,
      };
      kanjiByLiteral.set(literal, state);
    }
    return state;
  };

  for (const chapter of chapters) {
    // 1) declared kanji (chapter.kanji) — the taught-by-station truth
    for (const k of chapter.kanji ?? []) {
      const literal = literalOf(k.kanjiId, model);
      if (!literal) continue;
      const state = registerKanji(literal);
      const taughtPoint = taughtAt.get(k.kanjiId);
      if (taughtPoint && completedStationSlugs.has(taughtPoint.stationSlug)) {
        state.taught = true;
        state.taughtStationTitleFa = stationTitleBySlug.get(taughtPoint.stationSlug) ?? null;
      }
      // readings from the anchor words this learner has been TAUGHT
      for (const wid of k.anchorWordIds) {
        const w = chapter.words.find((x) => x.id === wid);
        if (!w) continue;
        const wordTaught = taughtAt.has(w.id) && completedStationSlugs.has(taughtAt.get(w.id)!.stationSlug);
        if (!wordTaught) continue;
        const seg = alignBaseToReading(w.term, w.readingKana, model);
        if (!seg) continue;
        for (const s of seg) {
          if (s.isKanji && s.ch === literal && !state.readings.includes(s.reading)) state.readings.push(s.reading);
        }
      }
    }
    // 2) every kanji-bearing word — the learner word-taught state
    for (const w of chapter.words) {
      if (!w.term.split('').some(isKanjiChar)) continue;
      if (seenWordIds.has(w.id)) continue;
      seenWordIds.add(w.id);
      const taughtPoint = taughtAt.get(w.id);
      const taught = Boolean(taughtPoint && completedStationSlugs.has(taughtPoint.stationSlug));
      words.push({ surface: w.term, reading: w.readingKana, taught });
      // populate inspect states for kanji the words carry (incl. non-N5)
      const seg = alignBaseToReading(w.term, w.readingKana, model);
      if (!seg) continue;
      for (const s of seg) {
        if (!s.isKanji) continue;
        const state = registerKanji(s.ch);
        if (taught && !state.readings.includes(s.reading)) {
          // word-taught readings: visible through any completed word that
          // carries the kanji (broader than anchors, still completion-gated)
          state.readings.push(s.reading);
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    completedStations: [...completedStationSlugs],
    kanji: [...kanjiByLiteral.values()].sort((a, b) => (a.literal < b.literal ? -1 : 1)),
    words,
  };
}

function literalOf(kanjiId: string, model: ReadingModel): string | null {
  for (const k of model.kanjiByLiteral.values()) if (k.kanjiId === kanjiId) return k.literal;
  return null;
}

/* ------------------------------------------------------------- the law */

export type RubyDecision = 'no-kanji' | 'taught' | 'untaught-kanji' | 'untaught-reading' | 'unaligned';

/**
 * THE ruby law (mission §۲): furigana is hidden by default ONLY when every
 * kanji in the base is taught (its dedicated station completed by THIS
 * learner) AND the reading the base exhibits is a taught reading of that
 * kanji. Anything else — untaught kanji, untaught reading, unalignable
 * data — shows the furigana. The tap-to-inspect affordance is available in
 * both states.
 */
export function rubyState(base: string, reading: string, model: ReadingModel, view: LearnerJaView): RubyDecision {
  const kanjiChars = base.split('').filter(isKanjiChar);
  if (kanjiChars.length === 0) return 'no-kanji';
  // untaught kanji first (a word's reading may be jukujiku-unalignable — the
  // kanji-level truth still decides the ruby without the alignment)
  for (const ch of kanjiChars) {
    const state = view.kanji.find((k) => k.literal === ch);
    if (!state || !state.taught) return 'untaught-kanji';
  }
  const aligned = alignBaseToReading(base, reading, model);
  if (!aligned) return 'unaligned';
  for (const seg of aligned) {
    if (!seg.isKanji) continue;
    const state = view.kanji.find((k) => k.literal === seg.ch)!;
    if (!state.readings.includes(seg.reading)) return 'untaught-reading';
  }
  return 'taught';
}

/** The popover payload for a tapped kanji literal. */
export interface KanjiInspect {
  literal: string;
  kanjiId: string | null;
  taught: boolean;
  readings: string[];
  on: string[];
  kun: string[];
  meaningFa: string | null;
  strokeCount: number | null;
  taughtStationTitleFa: string | null;
  inReference: boolean;
}

export function kanjiInspect(literal: string, model: ReadingModel, view: LearnerJaView): KanjiInspect {
  const ref = model.kanjiByLiteral.get(literal);
  const state = view.kanji.find((k) => k.literal === literal);
  return {
    literal,
    kanjiId: ref?.kanjiId ?? state?.kanjiId ?? null,
    taught: state?.taught ?? false,
    readings: state?.readings ?? [],
    on: ref?.on ?? [],
    kun: ref?.kun ?? [],
    meaningFa: ref?.meaningFa ?? null,
    strokeCount: ref?.strokeCount ?? null,
    taughtStationTitleFa: state?.taughtStationTitleFa ?? null,
    inReference: Boolean(ref?.kanjiId),
  };
}
