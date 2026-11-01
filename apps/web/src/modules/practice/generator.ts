/**
 * HANASO — Practice exercise generator (TASK-SLICE-01 / Issue #40) — stage C.
 *
 * Deterministic: one seeded PRNG per dialogue (FNV-1a seed → mulberry32) drives every
 * shuffle, so the same dialogue always yields the byte-identical exercise set across
 * processes and reloads (no Math.random anywhere). Material selection is index-based;
 * only option/sentence ORDER is shuffled.
 *
 * Session shape honors KB dialogue-exercise-design §۳: 8–15 items, kind rotated every
 * ≤3 items (here: strict round-robin), everything recalled from the dialogue itself.
 */
import type { CharacterRef, Dialogue, DialogueLine } from '@/modules/dialogue';
import { EXERCISE_KINDS, type Exercise, type ExerciseOption, type FillTokenItem, type ListenNoTextItem, type OrderReconstructItem, type SpeakerIdentifyItem, type TokenOption } from './types';

/* ------------------------------------------------------------ deterministic randomness */

/** FNV-1a 32-bit string hash — stable across processes (unlike string hashCode). */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG (enough entropy for shuffling 3–4 options). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/* ------------------------------------------------------------------ prompt labels */

const PROMPTS = {
  speakerIdentify: 'به جملهٔ پخش‌شده گوش بده — متن پنهان است. چه کسی آن را گفت؟',
  orderReconstruct: 'جمله‌های این بخش از مکالمه به‌هم ریخته‌اند؛ به ترتیب درست مکالمه کلیک کن.',
  listenNoText: 'گوش بده (بدون متن) و ترجمهٔ فارسی درست را انتخاب کن.',
  fillToken: 'توکن جاافتادهٔ جمله را از گزینه‌ها انتخاب کن.',
} as const;

/** Default weak-point objectives when no lesson-catalog id resolves (kind-stable). */
export const KIND_OBJECTIVES = {
  'speaker-identify': 'speaker-attribution',
  'order-reconstruct': 'discourse-ordering',
  'listen-no-text': 'listening-comprehension',
  'fill-token': 'grammar-particle',
} as const;

/* ------------------------------------------------------------------ selection */

/** FEAT-096 material: the first line each speaker says (one question per speaker). */
function speakerLines(dialogue: Dialogue): DialogueLine[] {
  const first = new Map<string, DialogueLine>();
  for (const line of dialogue.lines) {
    if (!first.has(line.speaker)) first.set(line.speaker, line);
  }
  return [...first.values()];
}

/** FEAT-097 material: contiguous windows of the dialogue (first 4 + last 4 lines). */
function orderWindows(dialogue: Dialogue): DialogueLine[][] {
  const n = dialogue.lines.length;
  if (n < 2) return [];
  const size = Math.min(4, n);
  if (n >= size * 2) {
    return [dialogue.lines.slice(0, size), dialogue.lines.slice(n - size)];
  }
  return [dialogue.lines.slice(0, size)];
}

/** FEAT-098 material: three lines spread across the dialogue (deterministic stride). */
function listenLines(dialogue: Dialogue): DialogueLine[] {
  const n = dialogue.lines.length;
  if (n < 3) return dialogue.lines.filter((_, i) => i % 3 === 1);
  const stride = Math.floor(n / 3);
  return [stride, 2 * stride, n - 1].map((i) => dialogue.lines[i]!);
}

/** Distractor translation sources: two OTHER lines, picked circularly far from `index`. */
function faDistractorIndices(index: number, n: number): number[] {
  const picked: number[] = [];
  const candidates = [(index + Math.floor(n / 2)) % n, (index + Math.floor(n / 3) + 1) % n];
  for (let probe = 0; picked.length < 2 && probe < n; probe++) {
    const i = (candidates[picked.length] ?? 0) + probe;
    const wrapped = ((i % n) + n) % n;
    if (wrapped !== index && !picked.includes(wrapped)) picked.push(wrapped);
  }
  return picked;
}

/** FEAT-044/047 material: lines containing a particle token (first/middle/last). */
function particleLines(dialogue: Dialogue): { line: DialogueLine; blankIndex: number }[] {
  const found: { line: DialogueLine; blankIndex: number }[] = [];
  for (const line of dialogue.lines) {
    const idx = line.tokens.findIndex((t) => t.pos === 'particle');
    if (idx >= 0) found.push({ line, blankIndex: idx });
  }
  if (found.length <= 3) return found;
  return [found[0]!, found[Math.floor(found.length / 2)]!, found[found.length - 1]!];
}

/* ------------------------------------------------------------------ exercise builders */

function buildSpeakerIdentify(
  line: DialogueLine,
  characters: CharacterRef[],
  rand: () => number,
): Exercise {
  const options: ExerciseOption[] = seededShuffle(
    characters.map((c) => ({ id: c.id, labelFa: c.nameFa })),
    rand,
  );
  const item: SpeakerIdentifyItem = {
    kind: 'speaker-identify',
    lineId: line.id,
    options,
    correctOptionId: line.speaker,
  };
  return {
    id: `ex-speaker-${line.id}`,
    kind: 'speaker-identify',
    prompt: PROMPTS.speakerIdentify,
    items: [item],
    sourceLineIds: [line.id],
    objective: KIND_OBJECTIVES['speaker-identify'],
  };
}

function buildOrderReconstruct(window: DialogueLine[], rand: () => number): Exercise {
  const sentences = seededShuffle(
    window.map((l) => ({ lineId: l.id, tokens: l.tokens, fa: l.fa })),
    rand,
  );
  const item: OrderReconstructItem = {
    kind: 'order-reconstruct',
    sentences,
    correctOrder: window.map((l) => l.id),
  };
  return {
    id: `ex-order-${window[0]!.id}`,
    kind: 'order-reconstruct',
    prompt: PROMPTS.orderReconstruct,
    items: [item],
    sourceLineIds: window.map((l) => l.id),
    objective: KIND_OBJECTIVES['order-reconstruct'],
  };
}

function buildListenNoText(
  line: DialogueLine,
  dialogue: Dialogue,
  lineIndex: number,
  rand: () => number,
): Exercise {
  const n = dialogue.lines.length;
  const distractors = faDistractorIndices(lineIndex, n)
    .map((i) => dialogue.lines[i]!)
    .filter((l) => l.id !== line.id);
  const options: ExerciseOption[] = seededShuffle(
    [
      { id: line.id, labelFa: line.fa },
      ...distractors.map((l) => ({ id: l.id, labelFa: l.fa })),
    ],
    rand,
  );
  const item: ListenNoTextItem = {
    kind: 'listen-no-text',
    lineId: line.id,
    options,
    correctOptionId: line.id,
  };
  return {
    id: `ex-listen-${line.id}`,
    kind: 'listen-no-text',
    prompt: PROMPTS.listenNoText,
    items: [item],
    sourceLineIds: [line.id],
    objective: KIND_OBJECTIVES['listen-no-text'],
  };
}

function buildFillToken(
  line: DialogueLine,
  blankIndex: number,
  dialogue: Dialogue,
  rand: () => number,
): Exercise {
  const correct = line.tokens[blankIndex]!;
  // distractors: other particle surfaces from the same dialogue, first-appearance order
  const surfaces: string[] = [];
  for (const l of dialogue.lines) {
    for (const t of l.tokens) {
      if (t.pos === 'particle' && t.surface !== correct.surface && !surfaces.includes(t.surface)) {
        surfaces.push(t.surface);
      }
    }
  }
  const distractors = surfaces.slice(0, 2);
  const toOption = (t: { surface: string; reading: string }): TokenOption => ({
    id: `token:${t.surface}`,
    surface: t.surface,
    reading: t.reading,
  });
  const options = seededShuffle(
    [toOption(correct), ...distractors.map((s) => ({ surface: s, reading: s }))].map(toOption),
    rand,
  );
  const maskedTokens = line.tokens.map((t, i) => (i === blankIndex ? null : t));
  const item: FillTokenItem = {
    kind: 'fill-token',
    lineId: line.id,
    blankIndex,
    maskedTokens,
    options,
    correctOptionId: `token:${correct.surface}`,
  };
  // resolve a lesson-catalog objective when the line teaches one (grammar first → weak
  // points link straight to the lesson card /poc/lesson#item-<objective>)
  const objective = line.teaches?.find((id) => id.startsWith('gr-')) ?? KIND_OBJECTIVES['fill-token'];
  return {
    id: `ex-fill-${line.id}`,
    kind: 'fill-token',
    prompt: PROMPTS.fillToken,
    items: [item],
    sourceLineIds: [line.id],
    objective,
  };
}

/* ------------------------------------------------------------------ public API */

/**
 * Generate the stage-C practice session from a dialogue. Deterministic; throws when a
 * line's speaker is missing from `characters` (defensive — the bundle always resolves).
 */
export function generateExercises(dialogue: Dialogue, characters: CharacterRef[]): Exercise[] {
  if (dialogue.lines.length < 2) return [];
  const characterIds = new Set(characters.map((c) => c.id));
  for (const line of dialogue.lines) {
    if (!characterIds.has(line.speaker)) {
      throw new Error(`practice generator: speaker ${line.speaker} not in characters`);
    }
  }

  const rand = mulberry32(hashSeed(`${dialogue.id}:practice:v1`));

  const byKind = {
    'speaker-identify': speakerLines(dialogue).map((l) => buildSpeakerIdentify(l, characters, rand)),
    'order-reconstruct': orderWindows(dialogue).map((w) => buildOrderReconstruct(w, rand)),
    'listen-no-text': listenLines(dialogue).map((l, i) => {
      const lineIndex = dialogue.lines.indexOf(l);
      return buildListenNoText(l, dialogue, lineIndex >= 0 ? lineIndex : i, rand);
    }),
    'fill-token': particleLines(dialogue).map(({ line, blankIndex }) =>
      buildFillToken(line, blankIndex, dialogue, rand),
    ),
  } satisfies Record<(typeof EXERCISE_KINDS)[number], Exercise[]>;

  // interleave kinds (anti-fatigue: no two same-kind questions back to back — §۳)
  const queues = EXERCISE_KINDS.map((k) => [...byKind[k]]);
  const exercises: Exercise[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) exercises.push(next);
    }
  }
  return exercises;
}
