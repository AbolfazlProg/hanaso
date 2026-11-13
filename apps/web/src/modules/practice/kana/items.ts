/**
 * HANASO — Kana practice item bank (TASK-HANASO-22) — SERVER-side builders.
 *
 * Pure functions over the shipped content registries (KANA_ITEMS,
 * KANA_TEACHING, audio assets). Nothing here touches a network or store; the
 * generator composes these into sessions, and the API strips the keys before
 * anything reaches the client.
 *
 * Prerequisite safety (mission rule — no untaught material, ever): an item is
 * only offered for a scope whose TAUGHT set satisfies `wordIsDecodable` /
 * `glyphIsTaught`. The taught set derives from completed station slugs via
 * `unitOfStation` — the same station-keyed data the walk engine uses.
 */
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import type { KanaItem } from '@/modules/curriculum/types';
import { KANA_TEACHING } from '@/modules/curriculum/content/kana-teaching';
import { hostWordAudioUrls } from '@/modules/audio/hostword-audio';
import { kanaAudioUrls } from '@/modules/audio/kana-audio';

/** Unit → station slug (H1 → stn-kana-h1; the walk ids the registry uses). */
export function stationOfUnit(unit: string): string {
  return `stn-kana-${unit.toLowerCase()}`;
}

/** Reverse map (station slug → unit). */
export function unitOfStation(stationSlug: string): string | null {
  const m = /^stn-kana-([a-z0-9]+)$/.exec(stationSlug);
  return m ? m[1]!.toUpperCase() : null;
}

/** The glyph set a station's unit introduces (empty for rule stations). */
export function glyphsIntroducedByStation(stationSlug: string): KanaItem[] {
  const unit = unitOfStation(stationSlug);
  if (!unit) return [];
  return KANA_ITEMS.filter((k) => k.introducedInUnit === unit);
}

/**
 * The special rule characters that unlock with their rule station — they are
 * NOT registry glyphs (no card of their own), but words containing them are
 * decodable once the rule is taught.
 */
const RULE_CHAR_STATIONS: Record<string, string> = {
  'ゃ': 'stn-kana-h6',
  'ゅ': 'stn-kana-h6',
  'ょ': 'stn-kana-h6',
  'っ': 'stn-kana-h13',
  'ー': 'stn-kana-k8',
  // katakana small yoon shares the h6 rule but only appears in katakana words
  'ャ': 'stn-kana-h6',
  'ュ': 'stn-kana-h6',
  'ョ': 'stn-kana-h6',
};

export interface TaughtScope {
  /** Completed station slugs (the walk's honest completed set). */
  completedStations: ReadonlySet<string>;
  /** Derived glyph characters taught (from the registry). */
  glyphChars: ReadonlySet<string>;
  /** KanaItem records taught. */
  items: readonly KanaItem[];
}

/** Derive the taught scope from completed station slugs. */
export function taughtScope(completedStations: Iterable<string>): TaughtScope {
  const completed = new Set(completedStations);
  const items = KANA_ITEMS.filter((k) => completed.has(stationOfUnit(k.introducedInUnit)));
  return {
    completedStations: completed,
    glyphChars: new Set(items.map((k) => k.glyph)),
    items,
  };
}

/** A glyph is usable when its registry item is taught. */
export function glyphIsTaught(glyph: string, scope: TaughtScope): boolean {
  return scope.glyphChars.has(glyph);
}

/** Every character of a word must be a taught glyph or an unlocked rule char. */
export function wordIsDecodable(word: string, scope: TaughtScope): boolean {
  for (const ch of word) {
    if (scope.glyphChars.has(ch)) continue;
    const ruleStation = RULE_CHAR_STATIONS[ch];
    if (ruleStation && scope.completedStations.has(ruleStation)) continue;
    return false;
  }
  return true;
}

/** Mora count of a kana word (small yoon merge; っ and ー count as moras). */
export function moraCount(word: string): number {
  let n = 0;
  for (const ch of word) {
    if ('ゃゅょャュョ'.includes(ch)) continue; // small yoon merges with the previous mora
    n += 1;
  }
  return n;
}

/** Teaching layer joined by kanaId (audioRef + Persian pronunciation). */
const TEACHING_BY_ID = new Map(KANA_TEACHING.map((t) => [t.kanaId, t]));

/** Persian reading label for options/reveals (teaching layer first). */
export function persianReading(item: KanaItem): string {
  return TEACHING_BY_ID.get(item.kanaId)?.pronunciationFa ?? item.romaji;
}

/** The glyph's own committed audio pair (null → the item degrades honestly). */
export function glyphAudio(item: KanaItem): { opus: string; m4a: string } | null {
  const ref = TEACHING_BY_ID.get(item.kanaId)?.audioRef;
  return ref ? kanaAudioUrls(ref) : null;
}

/** One decodable real word (registry hostwords only — the reading vessels). */
export interface KanaWord {
  word: string;
  meaningFa: string;
  /** Registry item that introduced the word (its objectId). */
  fromKanaId: string;
}

/** All registry hostwords decodable in the scope (deduped by word). */
export function decodableWords(scope: TaughtScope): KanaWord[] {
  const seen = new Set<string>();
  const out: KanaWord[] = [];
  for (const item of scope.items) {
    const host = item.hostWord;
    if (!host || seen.has(host.word)) continue;
    if (!wordIsDecodable(host.word, scope)) continue;
    seen.add(host.word);
    out.push({ word: host.word, meaningFa: host.meaningFa, fromKanaId: item.kanaId });
  }
  return out;
}

/** A word's committed audio (hostword registry — null → degrade honestly). */
export function wordAudio(word: string): { opus: string; m4a: string } | null {
  return hostWordAudioUrls(word);
}

/**
 * The documented confusable partner of a glyph, RESOLVED to a taught registry
 * item when available (confusableWith stores the raw glyph char).
 */
export function taughtConfusables(item: KanaItem, scope: TaughtScope): KanaItem[] {
  const out: KanaItem[] = [];
  for (const glyph of item.confusableWith ?? []) {
    const partner = scope.items.find((k) => k.glyph === glyph);
    if (partner) out.push(partner);
  }
  return out;
}

/** All katakana-scope words (loanword reading practice K8). */
export function katakanaWords(scope: TaughtScope): KanaWord[] {
  return decodableWords(scope).filter((w) => /^[\u30a0-\u30ffー]+$/.test(w.word));
}
