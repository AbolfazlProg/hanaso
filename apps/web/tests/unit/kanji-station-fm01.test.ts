/**
 * HANASO — the REAL kanji station regression tests (AUDIO-UNIT/KANJI
 * 2026-11-23 §۲/§۳ — the permanent CI battery for the chapter-02 dedicated
 * kanji station: 人 kj-4eba / 国 kj-56fd).
 *
 * Each expectation maps to a mission rule («کانجی فقط پس از یادگیری واژه‌های
 * حاملش، در یک ایستگاه مستقل و با آموزش اصولی معرفی شود» — and the engine
 * must guarantee it, not the authoring agent's diligence):
 *   - the kanji lives in the N5 reference (K5);
 *   - the station is DEDICATED (type kanji) and carries kanji-cards (K1/K4);
 *   - every anchor word is TAUGHT BEFORE the station (order 2/11 < 23);
 *   - the kanji is taught ONLY by its dedicated card (presence in dialogue
 *     or examples is NOT teaching — the registry reflects that);
 *   - no kanji assessment precedes its dedicated teaching (R5 over the registry);
 *   - the deck honors the kanji station contract (C-type-structure) and the
 *     packet→d1-engage rule with kanji-cards as cards;
 *   - writing-practice carries stroke data for both kanji (KanjiVG files).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getChapter } from '@/modules/curriculum/content';
import { buildKnowledgeRegistry } from '@/modules/curriculum/knowledge/registry';
import { gateEqa12 } from '@/modules/curriculum/knowledge/kanji-contract';
import { KANJI_ITEMS_BY_ID } from '@/modules/curriculum/kanji';
import { stationsInWalkOrder } from '@/modules/curriculum/eqa/model';

function fm01() {
  return getChapter('first-meeting-01')!;
}

const STATION_SLUG = 'stn-fm01-23-kanji';

describe('KANJI §۲ — the dedicated station of chapter 02 (the real path)', () => {
  it('exists, is DEDICATED (type kanji), is core, and is placed AFTER both anchor-word vocab stations', () => {
    const chapter = fm01();
    const station = chapter.stations.find((s) => s.slug === STATION_SLUG);
    expect(station, 'the dedicated kanji station must exist in the real chapter').toBeTruthy();
    expect(station!.type).toBe('kanji');
    expect(station!.core).toBe(true);
    expect(station!.order).toBe(23); // the kanji-pilot plan's P1-green position
    expect(station!.prerequisites).toContain('stn-fm01-02-vocab');
    expect(station!.prerequisites).toContain('stn-fm01-11-vocab2');
    // every anchor word's TEACHING station sits strictly before the kanji station
    const vocab1 = chapter.stations.find((s) => s.slug === 'stn-fm01-02-vocab')!;
    const vocab2 = chapter.stations.find((s) => s.slug === 'stn-fm01-11-vocab2')!;
    expect(vocab1.order).toBeLessThan(station!.order);
    expect(vocab2.order).toBeLessThan(station!.order);
  });

  it('declares its kanji in chapter.kanji (kj-4eba 人 / kj-56fd 国) with anchor words', () => {
    const kanji = fm01().kanji ?? [];
    expect(kanji.map((k) => k.kanjiId).sort()).toEqual(['kj-4eba', 'kj-56fd']);
    const jin = kanji.find((k) => k.kanjiId === 'kj-4eba')!;
    expect(jin.anchorWordIds).toEqual(['voc-nihonjin', 'voc-chuugokujin', 'voc-iranjin', 'voc-kankokujin']);
    expect(jin.fsrs.rec).toBe('kj-rec-kj-4eba');
    expect(jin.fsrs.wri).toBe('kj-wri-kj-4eba');
    const kuni = kanji.find((k) => k.kanjiId === 'kj-56fd')!;
    expect(kuni.anchorWordIds).toEqual(['voc-chuugokujin', 'voc-kankokujin']);
  });

  it('the kanji are chosen from the N5 reference with ≥2 taught anchor words (the selection rule)', () => {
    const chapter = fm01();
    for (const k of chapter.kanji ?? []) {
      const ref = KANJI_ITEMS_BY_ID.get(k.kanjiId);
      expect(ref, `${k.kanjiId} in the N5 reference (K5)`).toBeTruthy();
      expect(ref!.literal.length).toBe(1);
      // ≥2 anchors (D-0006); every anchor is a chapter word CARRYING the kanji
      expect(k.anchorWordIds.length).toBeGreaterThanOrEqual(2);
      for (const wid of k.anchorWordIds) {
        const w = chapter.words.find((x) => x.id === wid);
        expect(w, `${wid} registered`).toBeTruthy();
        expect(w!.term.includes(ref!.literal), `${w!.term} carries ${ref!.literal}`).toBe(true);
      }
    }
  });

  it('EQA-12 passes CLEAN on the real chapter (declarations ↔ teaching in sync both ways)', () => {
    const chapter = fm01();
    const registry = buildKnowledgeRegistry([chapter]);
    const findings = gateEqa12(chapter, registry);
    expect(findings, findings.map((f) => f.messageFa).join('\n')).toEqual([]);
  });

  it('the registry marks the kanji taught ONLY at the dedicated station (in-dialogue presence ≠ teaching)', () => {
    const chapter = fm01();
    const registry = buildKnowledgeRegistry([chapter]);
    for (const kanjiId of ['kj-4eba', 'kj-56fd']) {
      const entry = registry.byId.get(kanjiId);
      expect(entry, `${kanjiId} registered`).toBeTruthy();
      expect(entry!.kind).toBe('kanji');
      expect(entry!.firstTaught.stationSlug).toBe(STATION_SLUG);
      expect(entry!.firstTaught.blockId).toBe(kanjiId === 'kj-4eba' ? 'kcard-jin' : 'kcard-kuni');
    }
  });

  it('no kanji assessment precedes its dedicated teaching (R5: teach-before-assess in deck order)', () => {
    const chapter = fm01();
    const station = chapter.stations.find((s) => s.slug === STATION_SLUG)!;
    const kanjiCardIndex = (cardId: string) => station.blocks.findIndex((b) => b.id === cardId);
    for (const block of station.blocks) {
      if (block.kind !== 'exercise') continue;
      const blockIdx = station.blocks.indexOf(block);
      for (const id of block.exerciseIds) {
        const ex = chapter.exercises[id]!;
        const assessed = [ex.targetConcept, ...(ex.assessesConcepts ?? [])].filter((c) => c.startsWith('kj-'));
        for (const c of assessed) {
          const cardId = c === 'kj-4eba' ? 'kcard-jin' : c === 'kj-56fd' ? 'kcard-kuni' : null;
          expect(cardId, `kanji concept ${c} must have its card in this station`).not.toBeNull();
          expect(kanjiCardIndex(cardId!), `${ex.id} assesses ${c} AFTER its kanji-card`).toBeLessThan(blockIdx);
        }
      }
    }
  });

  it('the station satisfies the kanji type contract (kanji-card present) and the packet→d1-engage rule', () => {
    const chapter = fm01();
    const station = chapter.stations.find((s) => s.slug === STATION_SLUG)!;
    expect(station.blocks.some((b) => b.kind === 'kanji-card')).toBe(true);
    // every maximal kanji-card run is followed by an exercise block with a difficulty-1 item
    const blocks = station.blocks;
    for (let i = 0; i < blocks.length; i += 1) {
      if (blocks[i]!.kind !== 'kanji-card') continue;
      const next = blocks[i + 1];
      expect(next?.kind, 'the card packet is followed by an exercise block').toBe('exercise');
      const firstId = (next as { exerciseIds: string[] }).exerciseIds[0]!;
      expect(chapter.exercises[firstId]!.difficulty, `${firstId} is the immediate d1 engage`).toBe(1);
    }
    // the station ends with the wrap-up and includes the writing practice (K5)
    expect(station.blocks.at(-1)!.kind).toBe('wrap-up');
    const writing = station.blocks.find((b) => b.kind === 'writing-practice') as
      { kind: 'writing-practice'; characters: string[] } | undefined;
    expect(writing, 'the stroke-order writing practice block').toBeTruthy();
    expect(writing!.characters).toEqual(['人', '国']);
  });

  it('the KanjiVG stroke data is committed for both kanji (writing-data files)', () => {
    const web = path.join(process.cwd(), 'apps', 'web');
    const roots = [path.join(web, 'public', 'writing-data'), path.join(process.cwd(), 'public', 'writing-data')];
    const dir = roots.find((p) => existsSync(path.join(p, 'index.json')))!;
    for (const literal of ['人', '国']) {
      const file = path.join(dir, `${literal}.json`);
      expect(existsSync(file), `${literal}.json stroke data committed`).toBe(true);
      const data = JSON.parse(readFileSync(file, 'utf8')) as { strokes?: unknown[] };
      expect(data.strokes?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('the kanji station enrolls kj-rec/kj-wri cards in the Memory Station (all-type FSRS)', () => {
    const chapter = fm01();
    const station = chapter.stations.find((s) => s.slug === STATION_SLUG)!;
    expect(station.fsrsItems).toEqual(['kj-rec-kj-4eba', 'kj-wri-kj-4eba', 'kj-rec-kj-56fd', 'kj-wri-kj-56fd']);
    // the chapter declaration mirrors the station enrollment exactly
    for (const k of chapter.kanji ?? []) {
      expect(station.fsrsItems).toContain(k.fsrs.rec);
      expect(station.fsrsItems).toContain(k.fsrs.wri);
    }
  });

  it("the walk order keeps the station AFTER every anchor word's teaching station", () => {
    const chapter = fm01();
    const ordered = stationsInWalkOrder(chapter);
    const stationPos = ordered.findIndex((s) => s.slug === STATION_SLUG);
    for (const k of chapter.kanji ?? []) {
      for (const wid of k.anchorWordIds) {
        const registry = buildKnowledgeRegistry([chapter]);
        const taughtAt = registry.taughtAt.get(wid);
        expect(taughtAt, `${wid} taught (registered)`).toBeTruthy();
        expect(
          ordered.findIndex((s) => s.slug === taughtAt!.stationSlug),
          `${wid} taught before the kanji station`,
        ).toBeLessThan(stationPos);
      }
    }
  });
});
