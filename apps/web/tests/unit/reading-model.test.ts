/**
 * HANASO — Smart Ruby reading-model tests (SMART-RUBY 2026-11-23 §۱).
 *
 * The engine's ruby truth over the REAL course content: alignment (incl.
 * rendaku voicing 中国人→ちゅうごくじん where 国 reads ごく), annotation over
 * mixed text, unknown-kanji detection, and the per-learner ruby law with
 * two learners at different progress (the mission's two-learner check at
 * the engine level).
 */
import { describe, expect, it } from 'vitest';
import { CHAPTERS, getChapter } from '@/modules/curriculum/content';
import { buildKnowledgeRegistry } from '@/modules/curriculum/knowledge/registry';
import {
  alignBaseToReading,
  annotateJa,
  buildLearnerJaView,
  buildReadingModel,
  foldKana,
  isKanjiChar,
  kanjiInspect,
  rubyState,
  unknownKanjiIn,
} from '@/modules/curriculum/knowledge/reading-model';

const MODEL = buildReadingModel(CHAPTERS);
const REGISTRY = buildKnowledgeRegistry(CHAPTERS);

const STATION_TITLES = new Map<string, string>();
for (const chapter of CHAPTERS) {
  for (const station of chapter.stations) STATION_TITLES.set(station.slug, station.titleFa);
}

/** The chapter-02 kanji station — the one that teaches 人 and 国. */
const KANJI_STATION = 'stn-fm01-23-kanji';
/** A learner who completed everything the anchor words ride on but NOT the kanji station. */
const LEARNER_BEFORE: ReadonlySet<string> = new Set(['stn-fm01-02-vocab', 'stn-fm01-11-vocab2']);
/** A learner who ALSO completed the dedicated kanji station. */
const LEARNER_AFTER = new Set([...LEARNER_BEFORE, KANJI_STATION]);

const VIEW_BEFORE = buildLearnerJaView({
  chapters: CHAPTERS,
  taughtAt: REGISTRY.taughtAt,
  completedStationSlugs: LEARNER_BEFORE,
  stationTitleBySlug: STATION_TITLES,
  model: MODEL,
});
const VIEW_AFTER = buildLearnerJaView({
  chapters: CHAPTERS,
  taughtAt: REGISTRY.taughtAt,
  completedStationSlugs: LEARNER_AFTER,
  stationTitleBySlug: STATION_TITLES,
  model: MODEL,
});

describe('Smart Ruby §۱ — alignment over the real vocabulary', () => {
  /** 日本 (にほん) is the classic jukujiku word — its per-kanji split does not
   * decompose over KANJIDIC2 readings; everything else must align. */
  const JUKUJIKU = new Set(['日本人']);

  it('aligns every kanji-bearing word of chapter 02 (rendaku included)', () => {
    const chapter = getChapter('first-meeting-01')!;
    for (const w of chapter.words) {
      if (!w.term.split('').some(isKanjiChar)) continue;
      const seg = alignBaseToReading(w.term, w.readingKana, MODEL);
      if (JUKUJIKU.has(w.term)) {
        expect(seg, `${w.term} is the documented jukujiku exception`).toBeNull();
        continue;
      }
      expect(seg, `${w.term} [${w.readingKana}] must align`).not.toBeNull();
      expect(seg!.map((s) => s.ch).join('')).toBe(w.term);
      // segment readings are script-folded (hiragana-normalized) by design
      expect(seg!.map((s) => s.reading).join('')).toBe(foldKana(w.readingKana));
    }
  });

  it('国 in 中国人 consumes the RENDAKU segment ごく (voiced variant of こく)', () => {
    const seg = alignBaseToReading('中国人', 'ちゅうごくじん', MODEL)!;
    expect(seg.map((s) => `${s.ch}:${s.reading}`).join(' ')).toBe('中:ちゅう 国:ごく 人:じん');
  });

  it('人 at the tail of イラン人 consumes じん after the katakana run', () => {
    const seg = alignBaseToReading('イラン人', 'イランじん', MODEL)!;
    expect(seg.map((s) => `${s.ch}:${s.reading}`).join(' ')).toBe('イ:い ラ:ら ン:ん 人:じん');
  });

  it('rejects a reading that no known candidate decomposes to', () => {
    expect(alignBaseToReading('中国人', 'ちゅうこくじん', MODEL)).not.toBeNull();
    // ねこ is not a reading of 国 — the honest unaligned state
    expect(alignBaseToReading('国', 'ねこ', MODEL)).toBeNull();
  });
});

describe('Smart Ruby §۱ — annotation over mixed real text', () => {
  it('segments a kanji-bearing sentence into word / kana / other runs', () => {
    const segs = annotateJa('かんこくじん。', MODEL);
    expect(segs.map((s) => `${s.kind}:${s.surface}`).join('|')).toBe('kana:かんこくじん|other:。');
  });

  it('finds the registered word inside text and marks unknown kanji', () => {
    const segs = annotateJa('中国人。', MODEL);
    expect(segs[0]!.kind).toBe('word');
    expect(segs[0]!.surface).toBe('中国人');
    expect(segs[0]!.reading).toBe('ちゅうごくじん');
    // 韓 is a registered word surface via 韓国人 — annotate covers it by the word
    const korean = annotateJa('韓国人', MODEL);
    expect(korean[0]!.kind).toBe('word');
    expect(korean[0]!.surface).toBe('韓国人');
    // a stray kanji that neither the reference nor any word covers is unknown
    expect(unknownKanjiIn('鬱です', MODEL)).toEqual(['鬱']);
    expect(unknownKanjiIn('かんこくじん', MODEL)).toEqual([]);
  });
});

describe('Smart Ruby §۲ — the per-learner law (two learners, different progress)', () => {
  it('before the kanji station: EVERY kanji-bearing word shows furigana', () => {
    // the learner knows 中国人 as a taught WORD but not the KANJI 中/国/人 —
    // presence in content/registry is never teaching
    expect(rubyState('中国人', 'ちゅうごくじん', MODEL, VIEW_BEFORE)).toBe('untaught-kanji');
    expect(rubyState('イラン人', 'イランじん', MODEL, VIEW_BEFORE)).toBe('untaught-kanji');
    expect(rubyState('日本人', 'にほんじん', MODEL, VIEW_BEFORE)).toBe('untaught-kanji');
    // kana-only bases carry no ruby at all
    expect(rubyState('かんこくじん', 'かんこくじん', MODEL, VIEW_BEFORE)).toBe('no-kanji');
  });

  it('after the kanji station: the kanji the station taught hide their ruby', () => {
    // イラン人: イラン is katakana, 人 is taught with reading じん → hidden
    expect(rubyState('イラン人', 'イランじん', MODEL, VIEW_AFTER)).toBe('taught');
    // 中国人: 中 is NOT taught by the station → furigana STAYS
    expect(rubyState('中国人', 'ちゅうごくじん', MODEL, VIEW_AFTER)).toBe('untaught-kanji');
    // 日本人: 日 is not taught → stays
    expect(rubyState('日本人', 'にほんじん', MODEL, VIEW_AFTER)).toBe('untaught-kanji');
  });

  it('a kanji reading not yet taught keeps the ruby even when the kanji is taught', () => {
    // after the station 人 is taught with じん; にん (the counting reading)
    // was never taught in any completed word → the ruby stays
    expect(rubyState('人', 'にん', MODEL, VIEW_AFTER)).toBe('untaught-reading');
  });

  it('the inspect popover carries readings, meaning, strokes and provenance', () => {
    const before = kanjiInspect('国', MODEL, VIEW_BEFORE);
    expect(before.taught).toBe(false);
    expect(before.meaningFa).toContain('کشور');
    expect(before.strokeCount).toBe(8);
    // word-carried readings the learner MET in taught words (ごく from 中国人,
    // こく from 韓国人) — knowledge the learner has, while the KANJI itself is
    // still untaught (its dedicated station not completed)
    expect(before.readings.sort()).toEqual(['こく', 'ごく']);

    const after = kanjiInspect('国', MODEL, VIEW_AFTER);
    expect(after.taught).toBe(true);
    expect(after.readings.sort()).toEqual(['こく', 'ごく']);
    expect(after.taughtStationTitleFa).toContain('人 و 国');

    // 韓 rides in the taught word 韓国人 but is not a reference kanji and is
    // never TAUGHT as a kanji — the popover is honest about it
    const han = kanjiInspect('韓', MODEL, VIEW_AFTER);
    expect(han.inReference).toBe(false);
    expect(han.taught).toBe(false);
    expect(han.meaningFa).toBeNull();
  });

  it('the two learner views differ exactly at the kanji the station taught', () => {
    const taughtBefore = VIEW_BEFORE.kanji.filter((k) => k.taught).map((k) => k.literal);
    const taughtAfter = VIEW_AFTER.kanji.filter((k) => k.taught).map((k) => k.literal);
    expect(taughtBefore).toEqual([]);
    expect(taughtAfter.sort()).toEqual(['人', '国']);
    expect(VIEW_AFTER.completedStations).toContain(KANJI_STATION);
    expect(VIEW_BEFORE.completedStations).not.toContain(KANJI_STATION);
  });
});
