/**
 * HANASO — the Memory Station admission + template regression suite
 * (KANJI-TWO-PHASE §۳/§۶ — 2026-11-22).
 *
 * Permanent gates on the MAIN path (listChapterCards — the same descriptor
 * list the enrollment route consumes; resolveReviewCard — the same resolver
 * the /review page consumes; the review-contract — the ONE template table).
 * The mission's rejection cases:
 *
 *   [M-3] «ورود کانجی آموزش‌نداده‌شده به صف Memory» — a kj card exists ONLY
 *         when its DEDICATED kanji station exists; without it, enrollment
 *         matches no station (never enrolls).
 *   [M-4] «ورود گرامر یا واژهٔ آموزش‌نداده‌شده به مرور» — a word/grammar/
 *         expression whose teaching card is absent enrolls NOWHERE (the
 *         honest-admission rule closed the first-station default).
 *   [M-5] «تلقی مواجههٔ اولیه با مکالمه به‌عنوان تدریس» — dialogue exposure
 *         registers NOTHING: the registry's exposureAt never becomes
 *         firstTaught; enrollment of the kj pair waits for the kanji station.
 *   [M-8] «استفاده از قالب نامناسب Memory برای نوع محتوا» — the template
 *         contract rejects a kind without a template / a card missing its
 *         template-required fields (honest unknown, never ratable).
 *   plus: kanji review ≠ vocab review (distinct card kinds, fronts, structures).
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { listChapterCards, type FsrsCardDescriptor } from '@/modules/fsrs/integration';
import { resolveReviewCard, resetFsrsItemRegistry } from '@/modules/fsrs/item-registry';
import { cardSatisfiesTemplate, REVIEW_TEMPLATES, validateReviewContract } from '@/modules/fsrs/review-contract';
import { buildKnowledgeRegistry } from '@/modules/curriculum/knowledge/registry';
import type { Chapter } from '@/modules/curriculum/types';
import {
  KANJI_PILOT_KANJI_ITEMS,
  KANJI_PILOT_STATION,
} from '../../content/lesson-engine/specimens/station-kanji-hito.specimen';

function chapterWithKanjiPilot(): Chapter {
  const base = structuredClone(getChapter('first-meeting-01')!);
  return {
    ...base,
    kanji: KANJI_PILOT_KANJI_ITEMS,
    stations: [...base.stations.filter((s) => s.slug !== KANJI_PILOT_STATION.slug), KANJI_PILOT_STATION],
    exercises: base.exercises,
  };
}

function cardsOf(chapter: Chapter): FsrsCardDescriptor[] {
  return listChapterCards(chapter);
}

/* ================================================================ POSITIVE */

describe('the Memory review-contract (the per-kind template table)', () => {
  it('is complete and injective: every shipped card kind has exactly ONE template', () => {
    expect(validateReviewContract()).toEqual([]);
    const kinds = Object.keys(REVIEW_TEMPLATES);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('covers ALL content types the mission named (vocab, grammar, kanji, reading, expressions, sentences, kana, production)', () => {
    expect(REVIEW_TEMPLATES.w.structure).toBe('recall-word');
    expect(REVIEW_TEMPLATES.s.structure).toBe('recall-from-sound'); // خوانش و تلفظ — from audio
    expect(REVIEW_TEMPLATES['w-p'].structure).toBe('recall-form'); // production direction
    expect(REVIEW_TEMPLATES.gr.structure).toBe('recall-pattern'); // گرامر
    expect(REVIEW_TEMPLATES.chrk.structure).toBe('recall-chunk'); // اصطلاحات و عبارت‌ها
    expect(REVIEW_TEMPLATES['s-line'].structure).toBe('recall-line'); // جملهٔ مکالمه
    expect(REVIEW_TEMPLATES.kn.structure).toBe('recognize-sound'); // کانا
    expect(REVIEW_TEMPLATES['kj-rec'].structure).toBe('recognize-kanji'); // کانجی — تشخیص
    expect(REVIEW_TEMPLATES['kj-wri'].structure).toBe('produce-kanji'); // کانجی — نوشتن
  });

  it('kanji review is NOT vocab review: distinct kinds, fronts and structures', () => {
    expect(REVIEW_TEMPLATES['kj-rec'].kind).not.toBe(REVIEW_TEMPLATES.w.kind);
    expect(REVIEW_TEMPLATES['kj-rec'].front).toBe('glyph');
    expect(REVIEW_TEMPLATES['kj-rec'].requiredFields).toContain('strokeCount');
    expect(REVIEW_TEMPLATES.w.requiredFields).not.toContain('strokeCount');
    expect(REVIEW_TEMPLATES['kj-wri'].front).toBe('meaning'); // reversed direction
    expect(REVIEW_TEMPLATES['kj-wri'].reveal).toBe('glyph+strokes');
  });

  it('the shipped chapters + specimen resolve through their templates (no unknowns)', () => {
    resetFsrsItemRegistry();
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    for (const ch of chapters) {
      for (const card of cardsOf(ch)) {
        // kj cards resolve against the specimen context (kind + reference)
        if (card.kind === 'kj-rec' || card.kind === 'kj-wri') {
          const resolved = resolveReviewCard(card.itemId, card.kind);
          expect(resolved.unknown, `${card.itemId} must resolve`).toBeFalsy();
          expect(cardSatisfiesTemplate(resolved).ok, `${card.itemId} must satisfy its template`).toBe(true);
        }
      }
    }
    // a real word card and a kana card still resolve (existing types unchanged)
    const fm = getChapter('first-meeting-01')!;
    const wCard = cardsOf(fm).find((c) => c.kind === 'w')!;
    const resolved = resolveReviewCard(wCard.itemId, 'w');
    expect(resolved.unknown).toBeFalsy();
    expect(resolved.term).toBeTruthy();
  });
});

/* ================================================================ NEGATIVE */

describe('the mission rejection cases (memory admission)', () => {
  it('[M-3] a kanji with NO dedicated station enrolls NOWHERE (its cards match no station)', () => {
    // MUTATION: the kanji declarations exist but the dedicated station is gone
    // (the real chapter now SHIPS stn-fm01-23-kanji — the mutation removes it).
    const base = structuredClone(getChapter('first-meeting-01')!);
    const mutated: Chapter = {
      ...base,
      kanji: KANJI_PILOT_KANJI_ITEMS,
      stations: base.stations.filter((s) => s.type !== 'kanji'),
    };
    const cards = cardsOf(mutated);
    const kj = cards.filter((c) => c.kind === 'kj-rec' || c.kind === 'kj-wri');
    expect(kj.length).toBe(4);
    for (const c of kj) {
      expect(c.enrollStationSlug).toBe('__no-kanji-station__');
      // no real station carries that slug → completion of ANY station never enrolls these cards
      expect(mutated.stations.some((s) => s.slug === c.enrollStationSlug)).toBe(false);
    }
    // the registry files the teaching claim as dead and EQA-12 fails it (cross-checked in kanji-contract.test.ts)
    const registry = buildKnowledgeRegistry(listChapters().map((c) => (c.slug === mutated.slug ? mutated : c)));
    expect(registry.notes.map((n) => n.rule)).toContain('kanji-declared-not-taught');
  });

  it('[M-3b] a kanji-card shoved into a vocab station does NOT enroll its kj cards either (word-card teaching ≠ kanji teaching)', () => {
    // MUTATION: the real dedicated station is removed and the card is shoved
    // into a VOCAB station — only the type-kanji host may enroll kanji cards.
    const base = structuredClone(getChapter('first-meeting-01')!);
    const kanjiCard = structuredClone(KANJI_PILOT_STATION.blocks.find((b) => b.id === 'kcard-jin')!);
    const vocabStation = base.stations.find((s) => s.slug === 'stn-fm01-02-vocab')!;
    vocabStation.blocks.push(kanjiCard);
    const mutated: Chapter = {
      ...base,
      kanji: KANJI_PILOT_KANJI_ITEMS,
      stations: base.stations.filter((s) => s.type !== 'kanji'),
    };
    const cards = cardsOf(mutated).filter((c) => c.kind === 'kj-rec' || c.kind === 'kj-wri');
    // the host lookup requires type === 'kanji' — the vocab station does not enroll kanji
    for (const c of cards)
      expect(mutated.stations.some((s) => s.slug === c.enrollStationSlug && s.type === 'kanji')).toBe(false);
  });

  it('[M-4] a word WITHOUT its vocab-card enrolls NOWHERE (not at the first station, not anywhere)', () => {
    // MUTATION: rip the vocab-card of 私 out of the vocab station (the word list keeps it)
    const base = structuredClone(getChapter('first-meeting-01')!);
    for (const s of base.stations) {
      s.blocks = s.blocks.filter((b) => !(b.kind === 'vocab-card' && b.wordId === 'voc-watashi'));
    }
    const cards = cardsOf(base).filter((c) => c.contentRef === 'voc-watashi');
    expect(cards.length).toBe(2); // w + s cards exist in the inventory…
    for (const c of cards) {
      expect(c.enrollStationSlug).toBe('__unassigned__'); // …but enroll NOWHERE
      expect(base.stations.some((s) => s.slug === c.enrollStationSlug)).toBe(false);
    }
    // grammar without its anchored host — same rule
    const base2 = structuredClone(getChapter('first-meeting-01')!);
    const gr = base2.grammar[0]!;
    gr.lineRefs = ['s-first-meeting-01-l99']; // no station anchors this line anymore
    const grCard = cardsOf(base2).find((c) => c.itemId === gr.fsrs.gr)!;
    expect(grCard.enrollStationSlug).toBe('__unassigned__');
  });

  it('[M-5] dialogue exposure is NEVER teaching: exposureAt stays separate from firstTaught and enrolls nothing', () => {
    const chapters = [
      structuredClone(getChapter('kana-foundation-01')!),
      structuredClone(getChapter('kana-expansion-01')!),
      chapterWithKanjiPilot(),
    ];
    const registry = buildKnowledgeRegistry(chapters);
    const fm = registry.byId.get('voc-nihonjin')!;
    // the word met the learner FIRST in the anchor dialogue — recorded as exposure…
    expect(fm.exposureAt?.length).toBeGreaterThan(0);
    // …but its TEACHING point is the vocab station's card, and that is the enrollment home:
    expect(fm.firstTaught.stationSlug).toBe('stn-fm01-02-vocab');
    const card = cardsOf(chapters[2]!).find((c) => c.contentRef === 'voc-nihonjin' && c.kind === 'w')!;
    expect(card.enrollStationSlug).toBe(fm.firstTaught.stationSlug);
    // and the kanji (whose 人 glyph appears in the SAME dialogue lines) does NOT
    // enroll from any exposure — only from its dedicated station:
    const kj = cardsOf(chapters[2]!).filter((c) => c.kind === 'kj-rec' && c.contentRef === 'kj-4eba');
    expect(kj[0]!.enrollStationSlug).toBe(KANJI_PILOT_STATION.slug);
    expect(registry.taughtAt.get('kj-4eba')!.stationSlug).toBe(KANJI_PILOT_STATION.slug);
  });

  it('[M-8] a wrong template for the content type is REJECTED (honest unknown, never ratable)', () => {
    // a kind with no template at all
    const bogus = { kind: 'kj-listening', unknown: false };
    expect(cardSatisfiesTemplate(bogus).ok).toBe(false);
    expect(cardSatisfiesTemplate(bogus).template).toBeUndefined();
    // a template-keyed card missing its required fields
    const brokenKanji = { kind: 'kj-rec', glyph: '人' } as { kind: string; glyph?: string; unknown?: boolean };
    const check = cardSatisfiesTemplate(brokenKanji);
    expect(check.ok).toBe(false);
    expect(check.missing.sort()).toEqual(['meaningFa', 'strokeCount']);
    // the resolver ACTS on it: a kj card missing reference data renders unknown
    resetFsrsItemRegistry();
    const resolved = resolveReviewCard('kj-rec-kj-doesnotexist', 'kj-rec');
    expect(resolved.unknown).toBe(true);
    // and a vocab card never leaks into the kanji template
    const vocabCard = { kind: 'w', term: '日本人', meaningFa: 'ژاپنی', unknown: false } as Record<string, unknown> & {
      kind: string;
    };
    const vocabCheck = cardSatisfiesTemplate(vocabCard);
    expect(vocabCheck.ok).toBe(true);
    expect(vocabCheck.template!.structure).toBe('recall-word'); // not the kanji template
  });
});
