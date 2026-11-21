/**
 * HANASO — Knowledge Reference Registry tests (ENGINE-REFORM 2026-11-22).
 *
 * The permanent, content-agnostic CI gate for the registry itself:
 *  - derivation integrity (unique ids, single defining home — anti-duplication);
 *  - AUTOMATIC registration: committing teaching content updates the registry
 *    and moves the digest (the mission's «ثبت خودکار دانش جدید» — provable);
 *  - determinism + versioning (schema version + content digest);
 *  - course-wide chapter-chain inheritance (prerequisites carry knowledge);
 *  - exposure ≠ teaching (the anchor dialogue records first ENCOUNTER, never
 *    teaching — the three-origin carve-out stays honest);
 *  - fast, precise search (surface / reading / romaji / kind / taught-by).
 */
import { describe, expect, it } from 'vitest';
import { listChapters } from '@/modules/curriculum/content';
import {
  buildKnowledgeRegistry,
  isTaughtAtOrBefore,
  searchKnowledge,
  taughtAtPoint,
  taughtSetAt,
  wordsInSurface,
  KNOWLEDGE_REGISTRY_SCHEMA_VERSION,
} from '@/modules/curriculum/knowledge';
import { gateEqa8Course } from '@/modules/curriculum/knowledge';
import type { Chapter } from '@/modules/curriculum/types';

const COURSE = listChapters();

describe('Knowledge Registry — derivation integrity', () => {
  it('registers every teachable kind with a unique id and ONE defining home', () => {
    const registry = buildKnowledgeRegistry(COURSE);
    expect(registry.schemaVersion).toBe(KNOWLEDGE_REGISTRY_SCHEMA_VERSION);
    const ids = registry.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // anti-duplication: one home per datum
    const kinds = new Set(registry.entries.map((e) => e.kind));
    expect([...kinds].sort()).toEqual([
      'concept',
      'derived-glyph',
      'expression',
      'grammar',
      'kana',
      'rule-mark',
      'word',
    ]);
    // every entry carries the full first-teaching location (the search key of truth)
    for (const e of registry.entries)
      expect(e.firstTaught.chapterSlug.length + e.firstTaught.stationSlug.length).toBeGreaterThan(0);
  });

  it('is DETERMINISTIC: two builds are byte-identical (same digest)', () => {
    const a = buildKnowledgeRegistry(COURSE);
    const b = buildKnowledgeRegistry(structuredClone(COURSE));
    expect(a.digest).toBe(b.digest);
    expect(a.entries.length).toBe(b.entries.length);
  });

  it('is CONTENT-SENSITIVE: registering new teaching moves the digest', () => {
    // (a) a teaching card removed → the item is no longer taught → digest moves.
    const mutated = structuredClone(COURSE);
    const kxp = mutated.find((c) => c.slug === 'kana-expansion-01')!;
    const hd1 = kxp.stations.find((s) => s.slug === 'stn-kana-hd1')!;
    hd1.blocks = hd1.blocks.filter((b) => !(b.kind === 'kana-card' && b.kanaId === 'hira-ga'));
    const registryMutated = buildKnowledgeRegistry(mutated);
    const registryReal = buildKnowledgeRegistry(COURSE);
    expect(registryMutated.digest).not.toBe(registryReal.digest);
    expect(registryMutated.byId.has('hira-ga')).toBe(false); // unregistered → untaught
    // (b) the honest registry integrity gate reports nothing on the real course
    expect(gateEqa8Course(registryReal).filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('AUTO-REGISTERS a new teaching item with its exact location (the automatic §۳ contract)', () => {
    const mutated = structuredClone(COURSE);
    const kxp = mutated.find((c) => c.slug === 'kana-expansion-01')!;
    const kx1 = kxp.stations.find((s) => s.slug === 'stn-kana-kx1')!;
    // add a NEW vocab teaching card into kx1's deck (content registration)
    kx1.blocks.unshift({
      kind: 'vocab-card',
      id: 'blk-test-new-card',
      wordId: 'voc-watashi',
    } as never);
    const registry = buildKnowledgeRegistry(mutated);
    const watashi = registry.byId.get('voc-watashi')!;
    // the FIRST defining home wins (fm01 taught it earlier in course order)
    expect(watashi.firstTaught.chapterSlug).toBe('first-meeting-01');
    // and the card still counts as a REFERENCE: kx1's cumulative set now has it
    expect(taughtSetAt(registry, 'kana-expansion-01', 'stn-kana-kx1').has('voc-watashi')).toBe(true);
  });
});

describe('Knowledge Registry — chapter-chain inheritance', () => {
  const registry = buildKnowledgeRegistry(COURSE);

  it('kana-expansion-01 enters with the FULL kana-foundation knowledge (chain)', () => {
    const before = registry.cumulativeBeforeStation.get('kana-expansion-01/stn-kana-hd1')!;
    expect(before.has('hira-ka')).toBe(true); // base glyph from chapter 1
    expect(before.has('mark-dakuten')).toBe(true); // the rule mark from chapter 1
    expect(before.has('hira-ga')).toBe(false); // this chapter's own teaching is NOT entry knowledge
    const after = taughtSetAt(registry, 'kana-expansion-01', 'stn-kana-hd1');
    expect(after.has('hira-ga')).toBe(true); // the station's own teaching folds in
  });

  it('first-meeting-01 inherits its DECLARED chain (kana-foundation), not the sibling', () => {
    // fm01's prerequisiteChapterSlug is kana-foundation-01: the honest entry
    // knowledge of its FIRST station is chapter 1's full set.
    const before = taughtSetAt(registry, 'first-meeting-01', 'stn-fm01-01-anchor');
    expect(before.has('hira-a')).toBe(true);
    expect(before.has('mark-yoon-small')).toBe(true);
  });

  it('isTaughtAtOrBefore answers the question the engine asks everywhere', () => {
    expect(isTaughtAtOrBefore(registry, 'hira-ga', 'kana-expansion-01', 'stn-kana-hd1')).toBe(true);
    expect(isTaughtAtOrBefore(registry, 'hira-ga', 'kana-foundation-01', 'stn-kana-h15')).toBe(false);
    expect(taughtAtPoint(registry, 'voc-daigaku')?.stationSlug).toBe('stn-fm01-02-vocab');
  });
});

describe('Knowledge Registry — exposure ≠ teaching (the anchor carve-out)', () => {
  const registry = buildKnowledgeRegistry(COURSE);

  it('records the anchor-dialogue encounter SEPARATELY from the teaching point', () => {
    const watashi = registry.byId.get('voc-watashi')!;
    expect(watashi.exposureAt?.[0]?.stationSlug).toBe('stn-fm01-01-anchor'); // first ENCOUNTER
    expect(watashi.firstTaught.stationSlug).toBe('stn-fm01-02-vocab'); // the TEACHING
    expect(watashi.exposureAt![0]!.stationOrder).toBeLessThan(watashi.firstTaught.stationOrder);
  });
});

describe('Knowledge Registry — fast, precise search', () => {
  const registry = buildKnowledgeRegistry(COURSE);

  it('finds items by surface, reading, romaji and id', () => {
    expect(searchKnowledge(registry, { query: 'だいがく' }).map((r) => r.entry.id)).toContain('voc-daigaku');
    expect(searchKnowledge(registry, { query: 'daigaku' }).map((r) => r.entry.id)).toContain('voc-daigaku');
    expect(searchKnowledge(registry, { query: 'hira-kya', exact: true }).map((r) => r.entry.id)).toEqual(['hira-kya']);
    expect(searchKnowledge(registry, { query: 'せんせい' }).map((r) => r.entry.id)).toContain('voc-sensee');
  });

  it('folds scripts on demand (katakana↔hiragana) and filters by kind and taught-point', () => {
    const folded = searchKnowledge(registry, { query: 'キャ', foldScript: true });
    expect(folded.map((r) => r.entry.id)).toEqual(expect.arrayContaining(['hira-kya', 'kata-kya']));
    const words = searchKnowledge(registry, { kinds: ['word'] });
    expect(words.length).toBeGreaterThan(5);
    expect(new Set(words.map((w) => w.entry.kind))).toEqual(new Set(['word']));
    const taughtByHd1 = searchKnowledge(registry, {
      taughtBy: { chapterSlug: 'kana-expansion-01', stationSlug: 'stn-kana-hd1' },
    });
    expect(taughtByHd1.map((e) => e.entry.id)).toContain('hira-ga');
  });

  it('wordsInSurface finds the REGISTERED words inside surrounding text (the R3 probe)', () => {
    const hits = wordsInSurface(registry, 'キムさんは かんこくじん です。');
    expect(hits.map((h) => h.entry.id)).toContain('voc-kankokujin');
    const none = wordsInSurface(registry, 'これは ねこ です');
    expect(none.filter((h) => h.entry.kind === 'word')).toEqual([]);
  });
});

/* ------------------------------------------------------------ synthetic courses */

import type { Station } from '@/modules/curriculum/types';
import { gateEqa8 } from '@/modules/curriculum/knowledge';

function miniStation(partial: Partial<Station> & Pick<Station, 'slug' | 'type' | 'order' | 'blocks'>): Station {
  return {
    titleFa: 'تستی',
    objectiveFa: 'هدف تستی است.',
    core: true,
    prerequisites: [],
    lineRefs: [],
    objectiveCode: `obj-${partial.slug}`,
    estMinutes: 5,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    fsrsItems: [],
    ...partial,
  } as Station;
}

describe('Knowledge Registry — the gates over a SYNTHETIC course (no real content bias)', () => {
  it('registers synthetic teaching and REJECTS synthetic violations (the engine, not the data)', () => {
    const stationA = miniStation({
      slug: 'stn-syn-a',
      type: 'kana',
      order: 1,
      blocks: [
        { kind: 'kana-card', id: 'b1', kanaId: 'hira-ka', showRomaji: false },
        { kind: 'kana-card', id: 'b2', kanaId: 'hira-ga', showRomaji: false },
      ],
    });
    const stationB = miniStation({
      slug: 'stn-syn-b',
      type: 'practice',
      order: 2,
      blocks: [
        {
          kind: 'exercise',
          id: 'b3',
          exerciseIds: ['ex-syn-1'],
        },
      ],
    });
    const chapter: Chapter = {
      ...structuredClone(COURSE[0]!),
      slug: 'synthetic-01',
      prerequisiteChapterSlug: 'kana-foundation-01',
      words: [],
      grammar: [],
      expressions: [],
      stations: [stationA, stationB],
      exercises: {
        'ex-syn-1': {
          id: 'ex-syn-1',
          type: 'kana-recognition',
          targetSkill: 'vocab',
          targetConcept: 'hira-ga',
          difficulty: 1,
          promptFa: '؟',
          promptJa: 'が',
          options: [
            { id: 'a', label: '«گو»' },
            { id: 'b', label: '«み»' },
            { id: 'c', label: '«تو»' },
          ],
          correctOptionId: 'a',
          feedback: { f1Fa: 'x', f2HintFa: 'y', f3ExplainFa: 'z' },
          assessmentRole: 'practice',
        },
      },
      mastery: structuredClone(COURSE[0]!.mastery),
    };
    const registry = buildKnowledgeRegistry([COURSE[0]!, chapter]); // chain resolves through chapter 1
    // the synthetic teaching registered automatically
    expect(registry.byId.get('hira-ga')?.firstTaught.stationSlug).toBe('stn-syn-a');
    // the teaching card PRECEDES the exercise → clean
    expect(gateEqa8(chapter, registry).filter((f) => f.subject === 'stn-syn-b')).toEqual([]);
    // move the exercise BEFORE the teaching (block order violation) → rejected
    const chapterBad = structuredClone(chapter);
    chapterBad.stations = [
      miniStation({
        slug: 'stn-syn-b',
        type: 'practice',
        order: 0, // BEFORE the teaching station
        blocks: [{ kind: 'exercise', id: 'b3', exerciseIds: ['ex-syn-1'] }],
      }),
      structuredClone(stationA),
    ];
    const registryBad = buildKnowledgeRegistry([COURSE[0]!, chapterBad]);
    const findings = gateEqa8(chapterBad, registryBad);
    expect(
      findings.some((f) => f.subject === 'stn-syn-b' && f.rule === 'assess-before-teach' && f.severity === 'error'),
    ).toBe(true);
  });
});
