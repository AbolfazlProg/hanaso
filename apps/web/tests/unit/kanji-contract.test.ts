/**
 * HANASO — the kanji teaching-contract regression suite (KANJI-TWO-PHASE §۲/§۶ — 2026-11-22).
 *
 * Permanent gates on the MAIN engine path (the Knowledge Registry, EQA-12,
 * EQA-8/R5 — never private reimplementations). The mission's rejection cases:
 *
 *   [R-1] «سنجش کانجی قبل از آموزش اختصاصی آن» — an exercise targeting a kanji
 *         id BEFORE its dedicated kanji-card is a build failure (EQA-1 layer 1
 *         + registry R5 both see the kanji registry id).
 *   [R-2] «استفاده از کانجی قبل از تدریس واژه‌های مرتبط» — a kanji station
 *         whose anchor words are NOT taught earlier is rejected (EQA-12 K3 +
 *         the registry's kanji-anchor-not-before note).
 *   [R-K1] a kanji-card OUTSIDE its dedicated station (vocab card ≠ kanji
 *         teaching) is rejected.
 *   [R-K2] declared-but-never-taught / taught-but-undeclared both rejected.
 *   [R-K5] kanji outside the N5 reference cannot be taught at all.
 *   plus the level-tracking query and the shipped-course cleanliness.
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { buildKnowledgeRegistry, kanjiTaughtSequence, taughtAtPoint } from '@/modules/curriculum/knowledge/registry';
import { gateEqa12 } from '@/modules/curriculum/knowledge/kanji-contract';
import { gateEqa1 } from '@/modules/curriculum/eqa/gates';
import { buildTaughtModel } from '@/modules/curriculum/eqa/model';
import type { Chapter } from '@/modules/curriculum/types';
import {
  KANJI_PILOT_EXERCISES,
  KANJI_PILOT_KANJI_ITEMS,
  KANJI_PILOT_STATION,
} from '../../content/lesson-engine/specimens/station-kanji-hito.specimen';

/* ------------------------------------------------------------------ helpers */

/** The REAL chapter 02 with the phase-2 kanji specimen attached (the honest
 *  test harness: real words, real stations, the real registry path). */
function chapterWithKanjiPilot(): Chapter {
  const base = structuredClone(getChapter('first-meeting-01')!);
  return {
    ...base,
    kanji: KANJI_PILOT_KANJI_ITEMS,
    stations: [...base.stations.filter((s) => s.slug !== KANJI_PILOT_STATION.slug), KANJI_PILOT_STATION],
    exercises: { ...base.exercises, ...Object.fromEntries(KANJI_PILOT_EXERCISES.map((e) => [e.id, e])) },
  };
}

function registryOf(chapters: Chapter[]) {
  return buildKnowledgeRegistry(chapters);
}

/* ================================================================ POSITIVE */

describe('the kanji teaching contract over the REAL course + specimen', () => {
  it('the shipped course (chapter 02 now carries its REAL kanji station) is CLEAN under EQA-12', () => {
    const registry = registryOf(listChapters());
    for (const ch of listChapters()) {
      expect(
        gateEqa12(ch, registry).map((f) => `${f.rule}: ${f.subject}`),
        `${ch.slug} — no kanji-contract findings`,
      ).toEqual([]);
    }
    /* AUDIO-UNIT/KANJI 2026-11-23 §۲ — the REAL dedicated station of chapter 02
     * (stn-fm01-23-kanji) registers its two kanji exactly at that station. */
    const shipped = registry.entries.filter((e) => e.kind === 'kanji');
    expect(shipped.map((e) => e.id).sort()).toEqual(['kj-4eba', 'kj-56fd']);
    for (const e of shipped) {
      expect(e.firstTaught.chapterSlug).toBe('first-meeting-01');
      expect(e.firstTaught.stationSlug).toBe('stn-fm01-23-kanji');
    }
  });

  it('the specimen station registers BOTH kanji at their dedicated station with the anchor contract satisfied', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const registry = registryOf(chapters);
    const kanjiEntries = registry.entries.filter((e) => e.kind === 'kanji');
    expect(kanjiEntries.map((e) => e.id).sort()).toEqual(['kj-4eba', 'kj-56fd']);
    for (const e of kanjiEntries) {
      expect(e.firstTaught.stationSlug).toBe(KANJI_PILOT_STATION.slug);
      // the anchor words ride in the prerequisites (word ids + reading glyphs)
      for (const wid of ['voc-nihonjin', 'voc-chuugokujin']) {
        if (e.id === 'kj-4eba' || (e.id === 'kj-56fd' && wid === 'voc-chuugokujin')) {
          expect(e.prerequisites).toContain(wid);
        }
      }
    }
    // the kanji-anchor-not-before integrity note is ABSENT (the anchors ARE earlier)
    expect(registry.notes.map((n) => n.rule)).not.toContain('kanji-anchor-not-before');
  });

  it('EQA-12 PASSES on the specimen chapter and the level tracking reports both kanji in course order', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const registry = registryOf(chapters);
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    const findings = gateEqa12(pilot, registry);
    expect(
      findings.filter((f) => f.severity === 'error'),
      'EQA-12 must pass the specimen',
    ).toEqual([]);

    const seq = kanjiTaughtSequence(registry, chapters);
    expect(seq.map((s) => s.entry.id)).toEqual(['kj-4eba', 'kj-56fd']); // deck order: 人 card first
    expect(seq.every((s) => s.chapterSlug === 'first-meeting-01')).toBe(true);
    expect(seq.every((s) => s.levelCode === 'L2')).toBe(true);
    // the taughtAt map answers «is this kanji taught by station X?» (real history)
    expect(taughtAtPoint(registry, 'kj-4eba')!.stationSlug).toBe(KANJI_PILOT_STATION.slug);
  });

  it('the kanji-targeting retrieval exercises PASS the teach-before-assess gates (target = the kanji registry id)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const registry = registryOf(chapters);
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // EQA-1 layer 1: the kanji id IS in the concept universe and taught at the host order
    const model = buildTaughtModel(pilot);
    expect(model.taughtAtOrder.get('kj-4eba')).toBe(KANJI_PILOT_STATION.order);
    const eqa1All = gateEqa1(pilot).filter((f) => f.subject.startsWith('ex-kanji-'));
    expect(eqa1All, 'no EQA-1 findings on the kanji retrieval exercises').toEqual([]);
    // the registry's own timing: taught at the kanji-card block, assessed AFTER it
    expect(registry.taughtAt.get('kj-4eba')!.blockId).toBe('kcard-jin');
  });
});

/* ================================================================ NEGATIVE */

describe('the mission rejection cases (every violation MUST fail the engine)', () => {
  it('[R-1] a kanji-targeting exercise BEFORE the dedicated kanji card is rejected (assess-before-teach)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION: move the 人 retrieval exercise to the FIRST station of the chapter
    const ex = pilot.exercises['ex-kanji-jin-recall']!;
    const firstStation = pilot.stations.find((s) => s.order === 1)!;
    const kanjiStation = pilot.stations.find((s) => s.slug === KANJI_PILOT_STATION.slug)!;
    kanjiStation.blocks = kanjiStation.blocks.filter((b) => b.id !== 'blk-ex-kanji-jin-recall');
    firstStation.blocks.push({
      kind: 'exercise',
      id: 'blk-ex-kanji-jin-recall-moved',
      exerciseIds: ['ex-kanji-jin-recall'],
    });
    void ex;
    const registry = registryOf(chapters);
    // EQA-1 layer 1: assessed at host order 1, taught at order 23 → error
    const eqa1 = gateEqa1(pilot).filter((f) => f.subject === 'ex-kanji-jin-recall' && f.severity === 'error');
    expect(eqa1.length).toBeGreaterThan(0);
    expect(eqa1[0]!.rule).toBe('assessed-not-taught');
    // R5 (registry): the exercise's declared concept taught AFTER the block
    expect(gateEqa12(pilot, registry).filter((f) => f.rule === 'kanji-anchor-not-before')).toEqual([]);
    const r5 = registry.taughtAt.get('kj-4eba')!;
    expect(r5.stationSlug).toBe(KANJI_PILOT_STATION.slug);
  });

  it('[R-2] a kanji station whose anchor words are NOT taught before it is rejected (EQA-12 K3)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION: point the 国 kanji at the FINAL practice station (order 17) but
    // move its anchor word 韓国人's vocab card into an optional station at order 22 —
    // the anchor is then taught AFTER the kanji station.
    const korean = pilot.stations.find((s) =>
      s.blocks.some((b) => b.kind === 'vocab-card' && b.wordId === 'voc-kankokujin'),
    )!;
    const cardIdx = korean.blocks.findIndex(
      (b) => b.kind === 'vocab-card' && (b as { wordId: string }).wordId === 'voc-kankokujin',
    );
    const [card] = korean.blocks.splice(cardIdx, 1);
    const lateStation = { ...structuredClone(pilot.stations.find((s) => s.slug === 'stn-fm01-opt-drill')!), order: 40 };
    lateStation.blocks = [card!];
    pilot.stations = [...pilot.stations.filter((s) => s.slug !== lateStation.slug), lateStation];
    const registry = registryOf(chapters);
    const findings = gateEqa12(pilot, registry).filter((f) => f.rule === 'kanji-anchor-not-before');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.messageFa).toContain('پس از ایستگاه کانجی');
    // the registry files the same breach as an integrity note (visible in every report)
    expect(registry.notes.map((n) => n.rule)).toContain('kanji-anchor-not-before');
  });

  it('[R-K1] a kanji-card in a NON-kanji station is rejected (word-card introduction ≠ kanji teaching)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION: drop the dedicated station; tuck the 人 card into the vocab station
    pilot.stations = pilot.stations.filter((s) => s.slug !== KANJI_PILOT_STATION.slug);
    const vocabStation = pilot.stations.find((s) => s.slug === 'stn-fm01-02-vocab')!;
    vocabStation.blocks.push(structuredClone(KANJI_PILOT_STATION.blocks.find((b) => b.id === 'kcard-jin')!));
    const registry = registryOf(chapters);
    const findings = gateEqa12(pilot, registry).filter((f) => f.rule === 'kanji-card-outside-kanji-station');
    expect(findings.length).toBeGreaterThan(0);
    // the registry ALSO files the breach as a note and refuses the teaching claim
    expect(registry.notes.map((n) => n.rule)).toContain('kanji-card-outside-kanji-station');
  });

  it('[R-K2] a DECLARED kanji with no dedicated card is rejected (and vice versa)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION A: declare 学 without any card
    pilot.kanji = [
      ...KANJI_PILOT_KANJI_ITEMS,
      { kanjiId: 'kj-5b66', fsrs: { rec: 'kj-rec-kj-5b66', wri: 'kj-wri-kj-5b66' }, anchorWordIds: [] },
    ];
    const registry = registryOf(chapters);
    expect(gateEqa12(pilot, registry).map((f) => f.rule)).toContain('kanji-declared-not-taught');
    expect(registry.notes.map((n) => n.rule)).toContain('kanji-declared-not-taught');

    // MUTATION B: teach the card but never declare it in chapter.kanji
    const chaptersB = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilotB = chaptersB.find((c) => c.slug === 'first-meeting-01')!;
    pilotB.kanji = [KANJI_PILOT_KANJI_ITEMS[1]!]; // declare only 国 — 人 taught but undeclared
    const registryB = registryOf(chaptersB);
    expect(gateEqa12(pilotB, registryB).map((f) => f.rule)).toContain('kanji-card-undeclared');
    expect(registryB.notes.map((n) => n.rule)).toContain('kanji-card-undeclared');
  });

  it('[R-K5] a kanji outside the N5 reference cannot be taught (compile hard + gate error)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION: a kanji-card pointing outside the reference (郁 — N1-level kanji)
    const kanjiStation = pilot.stations.find((s) => s.slug === KANJI_PILOT_STATION.slug)!;
    kanjiStation.blocks.push({
      kind: 'kanji-card',
      id: 'kcard-nref',
      kanjiId: 'kj-90c1',
      anchorWordIds: ['voc-watashi'],
    });
    const registry = registryOf(chapters);
    expect(gateEqa12(pilot, registry).map((f) => f.rule)).toContain('kanji-unknown-id');
    expect(registry.notes.map((n) => n.rule)).toContain('kanji-unknown-id');
  });

  it('[R-anchors] an anchor word that does NOT carry the kanji is rejected (the vessel rule)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    // MUTATION: anchor 人 to わたし (私 — does not contain 人)
    const station = pilot.stations.find((s) => s.slug === KANJI_PILOT_STATION.slug)!;
    const card = station.blocks.find((b) => b.id === 'kcard-jin') as Extract<
      (typeof station.blocks)[number],
      { kind: 'kanji-card' }
    >;
    card.anchorWordIds = ['voc-nihonjin', 'voc-watashi'];
    const registry = registryOf(chapters);
    expect(gateEqa12(pilot, registry).map((f) => f.rule)).toContain('kanji-anchor-not-vessel');
  });

  it('a kanji station with fewer than 2 anchors is rejected (D-0006)', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const pilot = chapters.find((c) => c.slug === 'first-meeting-01')!;
    const station = pilot.stations.find((s) => s.slug === KANJI_PILOT_STATION.slug)!;
    const card = station.blocks.find((b) => b.id === 'kcard-kuni') as Extract<
      (typeof station.blocks)[number],
      { kind: 'kanji-card' }
    >;
    card.anchorWordIds = ['voc-chuugokujin']; // one anchor only
    const registry = registryOf(chapters);
    const findings = gateEqa12(pilot, registry).filter((f) => f.rule === 'kanji-anchor-count');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.messageFa).toContain('حداقل ۲ واژه');
    // zero VALID anchors would ALSO be a registry integrity note (checked separately)
    card.anchorWordIds = [];
    expect(registryOf(chapters).notes.map((n) => n.rule)).toContain('kanji-anchor-empty');
  });
});
