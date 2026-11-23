/**
 * HANASO — EQA-12: the kanji teaching contract gate (KANJI-TWO-PHASE §۲ — 2026-11-22).
 *
 * «کانجی باید بخشی رسمی از معماری آموزشی باشد» — the engine-enforced rules
 * (each maps to a mission line):
 *
 *   K1 (error)  a kanji-card lives ONLY in a station of type 'kanji' — the
 *               DEDICATED station. A card anywhere else (vocab station…) is a
 *               contract breach: «معرفی کانجی در کارت واژه به معنی تدریس کانجی
 *               محسوب نمی‌شود».
 *   K2 (error)  every taught kanji-card must be DECLARED in chapter.kanji, and
 *               every declared kanji must actually have its dedicated card —
 *               declarations and teaching stay in sync both ways.
 *   K3 (error)  every anchor word must be a REGISTERED word TAUGHT strictly
 *               before the kanji station (global order; deck order inside the
 *               same station) — «آموزش کانجی بر پایه واژه‌هایی باشد که
 *               زبان‌آموز قبلاً یاد گرفته است» + the word's surface must carry
 *               the kanji (the vessel — D-0006).
 *   K4 (error/warning)  a kanji station carries ≥1 kanji-card; >4 per station
 *               is a budget warning (framework design number ۲–۴ — calibrable
 *               via EQA-9, never a hard cliff mid-chapter).
 *   K5 (error)  kanji-card ids must resolve in the N5 reference; a dedicated
 *               station exists for every kanji the chapter declares.
 *   K6 (error)  KANJI-SCOPE (SMART-RUBY §۳ 2026-11-23): every question of a
 *               kanji station teaches/assesses ONLY the station's own target
 *               kanji — every kanji literal in any ASSESS surface of the
 *               station (prompt, options incl. distractors, cloze context,
 *               chunks/chips, hints, feedback, rationales) must be one of
 *               the literals the station's kanji-cards teach. A kanji-station
 *               question may never presuppose knowledge of another kanji —
 *               taught or not. (Teaching surfaces — the kanji-cards and the
 *               wrap-up recap — stay exempt: carriers/lookalike notes are
 *               teaching material, K3-gated.)
 *   K7 (error)  KANJI-WRITE-SCOPE (KANJI-WRITE-FIX 2026-11-23 §۳): the writing
 *               practice of a kanji station may only carry the station's OWN
 *               target kanji — every kanji literal of a `writing-practice`
 *               deck must be one of the literals the station's kanji-cards
 *               teach, and a deck carrying kanji lives ONLY in a type-'kanji'
 *               station (writing a kanji IS teaching it — K1's law for decks).
 *               The transport splits every deck into one slide per kanji
 *               (§۱ — «هر کانجی اسلاید مخصوص خودش، از موتور»), so a future
 *               agent-authored station can never smuggle an off-target or
 *               untaught kanji into the writing experience.
 *
 * The number of kanji stations per chapter is NOT fixed — one or more as
 * content needs («تعداد ثابت و تصنعی تعیین نکن»); nothing here imposes one.
 *
 * Assessment-side rules need no new gate: an exercise targeting a kanji id is
 * governed generically by EQA-1 layer 1 (taughtAtOrder) and EQA-8 R5
 * (assess-before-teach over the registry) — both see the kanji registry ids.
 */
import type { Chapter } from '../types';
import type { EqaFinding } from '../eqa/policy';
import { stationsInWalkOrder } from '../eqa/model';
import type { KnowledgeRegistry } from './types';
import { KANJI_ITEMS_BY_ID, kanjiInSurface } from '../kanji';
import { collectChapterSurfaces } from './surfaces';
import { isKanjiChar } from './reading-model';

const KANJI_STATION_BUDGET_MAX = 4; // kanji-interaction-blueprint «۲–۴ کانجی/ایستگاه»

export function gateEqa12(chapter: Chapter, registry: KnowledgeRegistry): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const push = (rule: string, severity: 'error' | 'warning', subject: string, messageFa: string) => {
    findings.push({
      gate: 'EQA-12',
      severity,
      subject,
      rule,
      messageFa,
      ruleRef: 'KANJI-TWO-PHASE §۲ · kanji-interaction-blueprint (D-0006) · Knowledge Registry',
    });
  };

  /* SMART-RUBY §۳ — the ASSESS-surface inventory of the chapter, computed once
   * (K6 walks exactly the surfaces the prerequisite engine already audits). */
  const chapterSurfaces = collectChapterSurfaces(chapter);

  const declared = new Set((chapter.kanji ?? []).map((k) => k.kanjiId));
  const taughtHere = new Set<string>();
  const chIdx = registry.course.indexOf(chapter.slug);
  const stationGlobal = (order: number): number => (chIdx >= 0 ? chIdx + 1 : 1) * 10000 + order;

  for (const station of stationsInWalkOrder(chapter)) {
    const kanjiCards = station.blocks.filter((b) => b.kind === 'kanji-card');

    /* K1 — dedicated station only. */
    if (station.type !== 'kanji') {
      for (const b of kanjiCards) {
        const card = b as Extract<(typeof station.blocks)[number], { kind: 'kanji-card' }>;
        push(
          'kanji-card-outside-kanji-station',
          'error',
          station.slug,
          `کانجی‌کارت ${card.id} در ایستگاه ${station.slug} از نوع ${station.type} است — تدریس کانجی فقط در ایستگاه اختصاصی kanji مجاز است؛ معرفی در کارت واژه/ایستگاه دیگر به معنی تدریس کانجی نیست (K1).`,
        );
      }
      /* K7 (the other half) — a writing deck carrying kanji lives ONLY in a
       * type-'kanji' station: writing a kanji IS teaching it (K1's law). */
      for (const b of station.blocks) {
        if (b.kind !== 'writing-practice') continue;
        const deck = b as Extract<(typeof station.blocks)[number], { kind: 'writing-practice' }>;
        const deckKanji = deck.characters.flatMap((ch) => ch.split('').filter(isKanjiChar));
        if (deckKanji.length === 0) continue;
        push(
          'kanji-writing-outside-kanji-station',
          'error',
          deck.id,
          `بخش تمرین نوشتن ${deck.id} در ایستگاه ${station.slug} از نوع ${station.type} کانجی دارد (${deckKanji.join('، ')}) — تمرین نوشتنِ کانجی فقط در ایستگاه اختصاصی kanji مجاز است؛ نوشتن کانجی یعنی تدریس آن (K7).`,
        );
      }
      continue;
    }

    /* A dedicated kanji station with no kanji cards is an empty contract. */
    if (kanjiCards.length === 0) {
      push(
        'kanji-station-empty',
        'error',
        station.slug,
        `ایستگاه ${station.slug} از نوع kanji است اما هیچ کانجی‌کارت ندارد — ایستگاه اختصاصی بدون تدریس اختصاصی (K4).`,
      );
      continue;
    }
    if (kanjiCards.length > KANJI_STATION_BUDGET_MAX) {
      push(
        'kanji-station-budget',
        'warning',
        station.slug,
        `ایستگاه ${station.slug} ${kanjiCards.length} کانجی‌کارت دارد — سقف طراحی ${KANJI_STATION_BUDGET_MAX} کانجی/ایستگاه (۲–۴؛ عدد کالیبرهٔ فریم‌ورک — بازبینی EQA-9).`,
      );
    }

    /* K6 — the kanji-station question scope (SMART-RUBY §۳): the station's
     * target literals are exactly what its kanji-cards teach; every kanji in
     * any assess surface of THIS station must be one of them. */
    const targetLiterals = new Set<string>();
    for (const b of kanjiCards) {
      const card = b as Extract<(typeof station.blocks)[number], { kind: 'kanji-card' }>;
      const ref = KANJI_ITEMS_BY_ID.get(card.kanjiId);
      if (ref) targetLiterals.add(ref.literal);
    }

    /* K7 — the kanji-station WRITING scope (KANJI-WRITE-FIX §۳): every kanji
     * literal of the station's writing decks must be one of the station's own
     * target literals — the writing slides are per-target-kanji (the transport
     * splits every deck — «هر کانجی اسلاید مخصوص خودش، از موتور»), so a deck
     * may never carry a kanji this station does not teach. */
    for (const b of station.blocks) {
      if (b.kind !== 'writing-practice') continue;
      const deck = b as Extract<(typeof station.blocks)[number], { kind: 'writing-practice' }>;
      for (const ch of deck.characters) {
        for (const literal of ch.split('').filter(isKanjiChar)) {
          if (targetLiterals.has(literal)) continue;
          push(
            'kanji-writing-outside-target',
            'error',
            deck.id,
            `بخش تمرین نوشتن ${deck.id} در ایستگاه کانجیِ ${station.slug} کانجیِ «${literal}» را دارد که از کانجی‌های هدف همین ایستگاه نیست — اسلایدهای تمرین نوشتن فقط باید همان کانجی‌های هدف ایستگاه را (هر کانجی یک اسلاید، از موتور) تمرین بدهند (K7).`,
          );
        }
      }
    }
    for (const surface of chapterSurfaces) {
      if (surface.stationSlug !== station.slug || surface.role !== 'assess') continue;
      for (const literal of kanjiInSurface(surface.text)) {
        if (targetLiterals.has(literal)) continue;
        push(
          'kanji-exercise-outside-target',
          'error',
          surface.exerciseId ?? surface.blockId,
          `پرسش ${surface.exerciseId ?? surface.blockId} (فیلد ${surface.field}) در ایستگاه کانجیِ ${station.slug} کانجیِ «${literal}» را دارد که از کانجی‌های هدف همین ایستگاه نیست — پرسش‌های ایستگاه کانجی فقط باید همان کانجی هدف را بیاموزند و بسنجند و نباید شناخت کانجی دیگری را پیش‌فرض بگیرند (K6).`,
        );
      }
    }

    for (const b of kanjiCards) {
      const card = b as Extract<(typeof station.blocks)[number], { kind: 'kanji-card' }>;
      const ref = KANJI_ITEMS_BY_ID.get(card.kanjiId);
      taughtHere.add(card.kanjiId);

      /* K5 — reference resolvable. */
      if (!ref) {
        push(
          'kanji-unknown-id',
          'error',
          station.slug,
          `کانجی‌کارت ${card.id}: شناسهٔ ${card.kanjiId} در مرجع N5 موجود نیست (K5).`,
        );
        continue;
      }

      /* K2 — declared in the chapter's kanji list. */
      if (!declared.has(card.kanjiId)) {
        push(
          'kanji-card-undeclared',
          'error',
          station.slug,
          `کانجی ${ref.literal} در ایستگاه ${station.slug} تدریس می‌شود اما در فهرست kanji فصل ${chapter.slug} اعلام نشده است — رهگیری سطح کانجی ناقص می‌شود (K2).`,
        );
      }

      /* K3 — anchors: count, vessel, registration and TIMING. */
      if (card.anchorWordIds.length < 2) {
        push(
          'kanji-anchor-count',
          'error',
          station.slug,
          `کانجی ${ref.literal} (${card.kanjiId}) فقط ${card.anchorWordIds.length} واژهٔ anchor دارد — هر کانجی حداقل ۲ واژهٔ آموزش‌دیدهٔ قبلی لازم دارد (D-0006؛ K3).`,
        );
      }
      for (const wid of card.anchorWordIds) {
        const word = chapter.words.find((w) => w.id === wid);
        if (!word) {
          push(
            'kanji-anchor-unknown-word',
            'error',
            station.slug,
            `کانجی ${ref.literal}: واژهٔ anchor «${wid}» در واژگان فصل ${chapter.slug} نیست (K3).`,
          );
          continue;
        }
        if (!word.term.includes(ref.literal)) {
          push(
            'kanji-anchor-not-vessel',
            'error',
            station.slug,
            `کانجی ${ref.literal}: واژهٔ anchor «${word.term}» (${wid}) این کانجی را در بر ندارد — واژهٔ anchor باید حامل خودِ کانجی باشد (D-0006؛ K3).`,
          );
        }
        const taught = registry.taughtAt.get(wid);
        if (!taught) {
          push(
            'kanji-anchor-unregistered',
            'error',
            station.slug,
            `کانجی ${ref.literal}: واژهٔ anchor «${word.term}» (${wid}) در رجیستری دانش ثبت نشده — تدریس واقعی آن قابل ردیابی نیست (K3).`,
          );
          continue;
        }
        const sameStation = taught.stationSlug === station.slug && taught.chapterSlug === chapter.slug;
        const ok = sameStation
          ? station.blocks.findIndex((x) => x.id === taught.blockId) < station.blocks.findIndex((x) => x.id === card.id)
          : taught.globalIndex < stationGlobal(station.order);
        if (!ok) {
          push(
            'kanji-anchor-not-before',
            'error',
            station.slug,
            `کانجی ${ref.literal} (${card.kanjiId}): واژهٔ anchor «${word.term}» (${wid}) در ${taught.chapterSlug}/${taught.stationSlug} تدریس می‌شود — پس از ایستگاه کانجی؛ خوانش کانجی باید داخل واژهٔ آموزش‌دیدهٔ قبلی بیاید (K3/D-0006).`,
          );
        }
      }
    }
  }

  /* K2 (the other direction) — declared kanji without a dedicated card. */
  for (const id of declared) {
    if (!taughtHere.has(id)) {
      push(
        'kanji-declared-not-taught',
        'error',
        chapter.slug,
        `فصل ${chapter.slug}: کانجی ${id} در فهرست kanji اعلام شده اما هیچ کانجی‌کارت اختصاصی در ایستگاه‌های فصل ندارد — اعلامِ تدریسِ بدون تدریس (K2).`,
      );
    }
    if (!KANJI_ITEMS_BY_ID.has(id)) {
      push(
        'kanji-unknown-id',
        'error',
        chapter.slug,
        `فصل ${chapter.slug}: کانجی اعلام‌شدهٔ ${id} در مرجع N5 موجود نیست (K5).`,
      );
    }
  }

  return findings;
}
