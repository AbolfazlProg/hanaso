/**
 * HANASO — Kana practice generator (TASK-HANASO-22) — pure + deterministic.
 *
 * Builds a session's keyed items from the taught scope:
 *  - FOCUSED: the glyphs of ONE completed station (+ its confusable pairs)
 *    — block practice for fresh items (PRACTICE_SCHEDULING §1, EV-065).
 *  - MIXED: the whole taught scope, weak-object weighted, all core dimensions
 *    (interleaving for discrimination — never untaught material).
 *
 * Deterministic RNG (seeded mulberry32) → reproducible sessions for tests.
 * The output is SERVER material: every item carries its answer key
 * (`toClientItem` in ../session.ts is the only door to the client).
 */
import type { KeyedPracticeItem, PracticeKind } from '../session';
import { CORE_DIMENSIONS, type KanaPracticeDimension } from './dimensions';
import {
  decodableWords,
  glyphAudio,
  glyphsIntroducedByStation,
  katakanaWords,
  moraCount,
  persianReading,
  taughtConfusables,
  taughtScope,
  wordAudio,
  type KanaWord,
  type TaughtScope,
} from './items';
import type { KanaItem } from '@/modules/curriculum/types';
import { PRACTICE_POLICY } from './policy';

/* ------------------------------------------------------------------ rng */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  return shuffle(arr, rng).slice(0, n);
}

/* ------------------------------------------------------------------ option ids */

/** Session-scoped option ids (opaque — the client must not infer the key). */
let optionSeq = 0;
function freshOptionId(): string {
  optionSeq += 1;
  return `o${optionSeq.toString(36)}`;
}

/** Word → romaji reading using only the taught registry (+ rule markers). */
function romajiOf(word: string, scope: TaughtScope): string {
  return word
    .split('')
    .map((ch) => {
      const item = scope.items.find((k) => k.glyph === ch);
      if (item) return item.romaji;
      if ('ゃゅょャュョ'.includes(ch)) return ''; // small yoon merges
      if (ch === 'っ') return 't-'; // sokuon doubling
      if (ch === 'ー') return '-'; // long vowel
      return ch;
    })
    .join('');
}

/* ------------------------------------------------------------------ item builders (K1..K8, K7 via the write ladder) */

/** K2 — glyph → reading (recognition). */
function buildGlyphToReading(item: KanaItem, scope: TaughtScope, rng: () => number): KeyedPracticeItem | null {
  const distractors = pick(
    scope.items.filter((k) => k.kanaId !== item.kanaId),
    PRACTICE_POLICY.choicesPerItem - 1,
    rng,
  );
  if (distractors.length < PRACTICE_POLICY.choicesPerItem - 1) return null;
  const correct = { id: freshOptionId(), label: `${persianReading(item)} | ${item.romaji}` };
  const options = shuffle(
    [correct, ...distractors.map((d) => ({ id: freshOptionId(), label: `${persianReading(d)} | ${d.romaji}` }))],
    rng,
  );
  return {
    id: `k2-${item.kanaId}`,
    skill: 'kana',
    dimension: 'K2',
    objectId: item.fsrsCardId ?? `kn-${item.kanaId}`,
    interaction: {
      kind: 'choice',
      promptFa: 'این نشانه چه صدایی دارد؟',
      promptJa: item.glyph,
      options,
      correctOptionId: correct.id,
      revealFa: `${item.glyph} = ${persianReading(item)} (${item.romaji})`,
    },
  };
}

/** K3 — sound → glyph (recall; the glyph's own audio IS the question). */
function buildSoundToGlyph(item: KanaItem, scope: TaughtScope, rng: () => number): KeyedPracticeItem | null {
  const audio = glyphAudio(item);
  if (!audio) return null; // degrade honestly — no audio, no sound item
  const partners = taughtConfusables(item, scope);
  const pool = scope.items.filter((k) => k.kanaId !== item.kanaId && k.glyph !== item.glyph);
  const distractorPool = [...partners, ...shuffle(pool, rng)].filter(
    (k, i, arr) => arr.findIndex((x) => x.kanaId === k.kanaId) === i,
  );
  const chosen = pick(distractorPool, PRACTICE_POLICY.choicesPerItem - 1, rng);
  if (chosen.length < PRACTICE_POLICY.choicesPerItem - 1) return null;
  const correct = { id: freshOptionId(), label: item.glyph };
  const options = shuffle([correct, ...chosen.map((d) => ({ id: freshOptionId(), label: d.glyph }))], rng);
  return {
    id: `k3-${item.kanaId}`,
    skill: 'kana',
    dimension: 'K3',
    objectId: item.fsrsCardId ?? `kn-${item.kanaId}`,
    interaction: {
      kind: 'choice',
      promptFa: 'به صدا گوش بده؛ کدام نشانه است؟',
      promptAudio: audio,
      options,
      correctOptionId: correct.id,
      revealFa: `${item.glyph} = ${persianReading(item)} (${item.romaji})`,
    },
  };
}

/** K1 — confusable-pair discrimination (shape identity under pressure). */
function buildDiscriminate(item: KanaItem, scope: TaughtScope, rng: () => number): KeyedPracticeItem | null {
  const partners = taughtConfusables(item, scope);
  if (partners.length === 0) return null; // no documented confusable → skip honestly
  const target = partners[0]!;
  const fillers = pick(
    scope.items.filter((k) => k.kanaId !== item.kanaId && k.kanaId !== target.kanaId),
    PRACTICE_POLICY.choicesPerItem - 2,
    rng,
  );
  const correct = { id: freshOptionId(), label: item.glyph };
  const options = shuffle(
    [
      correct,
      { id: freshOptionId(), label: target.glyph },
      ...fillers.map((f) => ({ id: freshOptionId(), label: f.glyph })),
    ],
    rng,
  );
  return {
    id: `k1-${item.kanaId}-${target.kanaId}`,
    skill: 'kana',
    dimension: 'K1',
    objectId: item.fsrsCardId ?? `kn-${item.kanaId}`,
    interaction: {
      kind: 'choice',
      promptFa: `کدام نشانه «${item.romaji}» است؟ (${persianReading(item)})`,
      options,
      correctOptionId: correct.id,
      revealFa: `${item.glyph} است؛ ${target.glyph} صدای «${target.romaji}» دارد — جفت‌های شبیه را از هم جدا کن.`,
    },
  };
}

/** K4 — decode a real taught word → its romaji reading. */
function buildWordToReading(word: KanaWord, scope: TaughtScope, rng: () => number): KeyedPracticeItem | null {
  const reading = romajiOf(word.word, scope);
  const distractorWords = pick(
    decodableWords(scope).filter((w) => w.word !== word.word),
    PRACTICE_POLICY.choicesPerItem - 1,
    rng,
  );
  if (distractorWords.length < PRACTICE_POLICY.choicesPerItem - 1) return null;
  const correct = { id: freshOptionId(), label: reading };
  const options = shuffle(
    [correct, ...distractorWords.map((w) => ({ id: freshOptionId(), label: romajiOf(w.word, scope) }))],
    rng,
  );
  const audio = wordAudio(word.word) ?? undefined;
  return {
    id: `k4-${word.word}`,
    skill: 'kana',
    dimension: 'K4',
    objectId: `word-${word.word}`,
    interaction: {
      kind: 'choice',
      promptFa: 'این واژه را بخوان؛ خوانش درست کدام است؟',
      promptJa: word.word,
      promptAudio: audio,
      options,
      correctOptionId: correct.id,
      revealFa: `${word.word} = ${reading} — یعنی «${word.meaningFa}».`,
    },
  };
}

/** K5 — mora awareness: count the moras of a taught word. */
function buildMoraCount(word: KanaWord, rng: () => number): KeyedPracticeItem | null {
  const correct = moraCount(word.word);
  if (correct < 2) return null;
  const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
  const optionValues = new Set<number>([correct]);
  let drift = 1;
  while (optionValues.size < PRACTICE_POLICY.choicesPerItem && drift <= 3) {
    optionValues.add(correct + drift);
    if (optionValues.size < PRACTICE_POLICY.choicesPerItem && correct - drift >= 2) optionValues.add(correct - drift);
    drift += 1;
  }
  const options = shuffle([...optionValues].map((n) => ({ id: freshOptionId(), label: `${faNum(n)} مورا` })), rng);
  const correctOption = options.find((o) => o.label.startsWith(faNum(correct)))!;
  const audio = wordAudio(word.word) ?? undefined;
  return {
    id: `k5-${word.word}`,
    skill: 'kana',
    dimension: 'K5',
    objectId: `word-${word.word}`,
    interaction: {
      kind: 'choice',
      promptFa: 'این واژه چند مورا (ضربهٔ صوتی) دارد؟',
      promptJa: word.word,
      promptAudio: audio,
      options,
      correctOptionId: correctOption.id,
      revealFa: `${word.word} = ${faNum(correct)} مورا: هر نشانهٔ کامل یک ضربه؛ ゃゅょ کوچک ضربهٔ جدا نیست.`,
    },
  };
}

/** K8 — katakana loanword → Persian meaning (real-world vessel). */
function buildLoanwordMeaning(word: KanaWord, scope: TaughtScope, rng: () => number): KeyedPracticeItem | null {
  const distractors = pick(
    katakanaWords(scope).filter((w) => w.word !== word.word),
    PRACTICE_POLICY.choicesPerItem - 1,
    rng,
  );
  if (distractors.length < PRACTICE_POLICY.choicesPerItem - 1) return null;
  const correct = { id: freshOptionId(), label: word.meaningFa };
  const options = shuffle(
    [correct, ...distractors.map((w) => ({ id: freshOptionId(), label: w.meaningFa }))],
    rng,
  );
  const audio = wordAudio(word.word) ?? undefined;
  return {
    id: `k8-${word.word}`,
    skill: 'kana',
    dimension: 'K8',
    objectId: `word-${word.word}`,
    interaction: {
      kind: 'choice',
      promptFa: 'این واژهٔ خارجی (کاتاکانا) یعنی چه؟',
      promptJa: word.word,
      promptAudio: audio,
      options,
      correctOptionId: correct.id,
      revealFa: `${word.word} = «${word.meaningFa}».`,
    },
  };
}

/** K6 — writing recall (glyph from memory, judged by the writing canvas). */
function buildWriteRecall(item: KanaItem): KeyedPracticeItem | null {
  const audio = glyphAudio(item);
  if (!audio) return null;
  return {
    id: `k6-${item.kanaId}`,
    skill: 'kana',
    dimension: 'K6',
    objectId: item.fsrsCardId ?? `kn-${item.kanaId}`,
    interaction: {
      kind: 'write',
      promptFa: `به صدا گوش بده و «${item.romaji}» را از حافظه بنویس.`,
      promptAudio: audio,
      character: item.glyph,
      revealFa: `${item.glyph} = ${persianReading(item)} (${item.romaji})`,
    },
  };
}

/* ------------------------------------------------------------------ session assembly */

export interface GenerateKanaSessionInput {
  kind: PracticeKind;
  /** Focused: the completed station slug to drill. Mixed: the chapter scope key. */
  scopeKey: string;
  /** Completed station slugs (prerequisite truth from the walk store). */
  completedStations: ReadonlySet<string>;
  /** Weak object ids (weak-point weighting; from the evidence store). */
  weakObjectIds?: ReadonlySet<string>;
  /** Opt into writing-recall items (default off — never required). */
  includeWriting?: boolean;
  /** Deterministic seed (tests); default time-based. */
  seed?: number;
}

export interface GeneratedKanaSession {
  items: KeyedPracticeItem[];
  /** Honest note when the scope was too small to fill the target. */
  noteFa: string | null;
}

type BuildableDimension = Exclude<KanaPracticeDimension, 'K7'>;

/**
 * Generate one practice session. Deterministic given the same inputs + seed.
 * Focused drills one station's glyphs; mixed spreads across the taught scope.
 * GUARANTEE (mission rule): only taught material leaves this function — every
 * builder checks the scope before composing an item.
 */
export function generateKanaSession(input: GenerateKanaSessionInput): GeneratedKanaSession {
  const rng = mulberry32(input.seed ?? 1);
  const scope = taughtScope(input.completedStations);
  const target = input.kind === 'focused' ? PRACTICE_POLICY.focusedItems : PRACTICE_POLICY.mixedItems;

  const glyphs =
    input.kind === 'focused'
      ? glyphsIntroducedByStation(input.scopeKey).filter((g) => scope.items.some((s) => s.kanaId === g.kanaId))
      : weakFirst(scope.items, input.weakObjectIds ?? new Set(), rng);
  const words = shuffle(decodableWords(scope), rng);

  const items: KeyedPracticeItem[] = [];
  const perDimension = new Map<BuildableDimension, number>();
  const maxPerDimension = input.kind === 'focused' ? Math.ceil(target / 2) : Math.ceil(target / 3);
  const cycle: BuildableDimension[] = input.includeWriting
    ? ([...CORE_DIMENSIONS, 'K1', 'K5', 'K6', 'K8'] as BuildableDimension[])
    : ([...CORE_DIMENSIONS, 'K1', 'K5', 'K8'] as BuildableDimension[]);

  let glyphCursor = 0;
  let wordCursor = 0;
  let dimCursor = 0;
  let guard = 0;
  while (items.length < target && guard < target * 16) {
    guard += 1;
    const dim = cycle[dimCursor % cycle.length]!;
    dimCursor += 1;
    if ((perDimension.get(dim) ?? 0) >= maxPerDimension) continue; // saturated → next dimension
    let built: KeyedPracticeItem | null = null;
    if (dim === 'K4' || dim === 'K5' || dim === 'K8') {
      const word = words[wordCursor % Math.max(1, words.length)];
      wordCursor += 1;
      if (!word) break;
      built =
        dim === 'K4'
          ? buildWordToReading(word, scope, rng)
          : dim === 'K5'
            ? buildMoraCount(word, rng)
            : buildLoanwordMeaning(word, scope, rng);
    } else {
      const item = glyphs[glyphCursor % Math.max(1, glyphs.length)];
      glyphCursor += 1;
      if (!item) break;
      built =
        dim === 'K2'
          ? buildGlyphToReading(item, scope, rng)
          : dim === 'K3'
            ? buildSoundToGlyph(item, scope, rng)
            : dim === 'K1'
              ? buildDiscriminate(item, scope, rng)
              : buildWriteRecall(item);
    }
    if (built) {
      // dedupe by id (same word/glyph may cycle) — a session never repeats an item
      if (items.some((i) => i.id === built!.id)) continue;
      items.push(built);
      perDimension.set(dim, (perDimension.get(dim) ?? 0) + 1);
    }
  }

  const noteFa =
    items.length === 0
      ? 'برای این محدوده هنوز مادهٔ تمرینی کافی نیست — ابتدا درس مربوط را کامل کن.'
      : items.length < target
        ? 'محدودهٔ تمرین کوچک است؛ همهٔ آیتم‌های ممکن ساخته شد.'
        : null;
  return { items, noteFa };
}

/** Weak objects first (their share), then the rest — the mixed weighting. */
function weakFirst(pool: readonly KanaItem[], weak: ReadonlySet<string>, rng: () => number): KanaItem[] {
  const id = (k: KanaItem) => k.fsrsCardId ?? `kn-${k.kanaId}`;
  const weakItems = pool.filter((k) => weak.has(id(k)));
  const rest = pool.filter((k) => !weak.has(id(k)));
  return [...shuffle(weakItems, rng), ...shuffle(rest, rng)];
}
