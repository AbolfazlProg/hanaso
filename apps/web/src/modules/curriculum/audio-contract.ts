/**
 * HANASO — the audio-unit contract layer (AUDIO-UNIT 2026-11-23 §۱).
 *
 * PURE module over the Exercise audio bindings: the classification helpers
 * every side of the contract shares (content, the EQA-13 gate, the payload
 * builders), so they can never drift apart:
 *
 *  - `resolveExerciseAudioBinding` — the EFFECTIVE binding of an exercise
 *    (the structured `audio` field, else the legacy `audioLineRef` as a line
 *    binding, else none). One resolver, no interpretation forks.
 *  - `requiredAudioUnit` — the unit an audio-bearing exercise's TARGET demands
 *    (a vocab-target audio-meaning / minimal-pair MUST be word-unit — the
 *    owner's rule «سؤال درباره معنی/تلفظ یک کلمه → فقط همان کلمه»).
 *  - `spokenTextOfBinding` — the exact text the committed file must say
 *    (the word's reading for word units; the binding text otherwise).
 *  - `wordFormIsRelated` — whether a word-form text belongs to the target
 *    word's family (the «متن نامرتبط» rejection).
 *
 * Content-ID DERIVATION for word-form/sentence assets (the sha256 stems) and
 * manifest access live in the SERVER-SIDE audio module (`@/modules/audio/word-audio`)
 * next to node:fs/node:crypto — this module stays pure and browser-safe.
 * No parallel source of truth: everything derives from the chapter's own
 * words and the binding the exercise declares.
 */
import type { Exercise, ExerciseAudioBinding, VocabItem } from './types';

/**
 * The effective audio binding of an exercise. The legacy `audioLineRef` is the
 * line-unit binding — kept equivalent so every existing sentence/gist/speaker
 * item stays valid without reauthoring.
 */
export type EffectiveAudioBinding = (ExerciseAudioBinding & { legacy?: 'audioLineRef' }) | null;

export function resolveExerciseAudioBinding(ex: Exercise): EffectiveAudioBinding {
  if (ex.audio) return ex.audio;
  if (ex.audioLineRef) return { unit: 'line', lineRef: ex.audioLineRef, legacy: 'audioLineRef' };
  return null;
}

/**
 * The unit an audio-bearing exercise's assessment target REQUIRES.
 *  - `word`: audio-meaning / listen-minimal-pair whose targetConcept is a
 *    chapter word (a question about one word's meaning/pronunciation — the
 *    sound must be that word alone, never the whole dialogue line).
 *  - `word-anchor`: audio-meaning whose targetConcept is a KANJI (a
 *    sound→kanji recognition item) — the sound must be one of the kanji's
 *    anchor words (still a standalone word asset, never a dialogue cut).
 *  - null: no unit constraint (sentence/gist/speaker comprehension — the line
 *    binding is the correct unit there).
 */
export type RequiredAudioUnit = 'word' | 'word-anchor' | null;

export function requiredAudioUnit(
  ex: Exercise,
  wordsById: ReadonlyMap<string, VocabItem>,
  kanjiIds?: ReadonlySet<string>,
): RequiredAudioUnit {
  const isWordTargeted = ex.type === 'audio-meaning' || ex.type === 'listen-minimal-pair';
  if (!isWordTargeted) return null;
  if (wordsById.has(ex.targetConcept)) return 'word';
  if (kanjiIds?.has(ex.targetConcept)) return 'word-anchor';
  return null;
}

/** The exact text the committed file must speak for a binding. */
export function spokenTextOfBinding(
  binding: ExerciseAudioBinding,
  wordsById: ReadonlyMap<string, VocabItem>,
): string | null {
  switch (binding.unit) {
    case 'word': {
      const word = wordsById.get(binding.wordId);
      /* 〜 is a notation marker (suffix particle), never a phonetic character —
       * the SPOKEN text of 〜さん is さん. The manifest registers exactly this. */
      return word ? word.readingKana.replace(/^[〜]/, '') : null;
    }
    case 'word-form':
    case 'sentence':
    case 'context':
      return binding.text;
    case 'line':
      return null; // the line's text lives in the dialogue bundle
  }
}

/**
 * Whether a binding's word relates to the target word's reading: the exact
 * reading, or a contiguous form of it (ちゅうごく inside ちゅうごくじん — the
 * minimal-pair form of the same word family). Unrelated text = a wrong-unit
 * binding («اتصال فایل صوتی با متن نامرتبط به آیتم آموزشی»).
 */
export function wordFormIsRelated(form: string, targetWord: VocabItem): boolean {
  if (form === targetWord.readingKana) return true;
  const reading = targetWord.readingKana.replace(/^[〜]/, '');
  const clean = form.replace(/^[〜]/, '');
  return clean.length > 0 && reading.includes(clean);
}
