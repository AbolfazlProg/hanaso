/**
 * HANASO — the CONTENT-CONTRACT suite (UX-AUDIT repair, mission §4).
 *
 * THE anti-recurrence gate: every rule below runs for EVERY shipped chapter
 * in the registry AND every Lesson-Engine draft YAML — a future chapter is
 * automatically covered the moment its data lands in the repo. These are the
 * rules the 2026-11-21 UX audit found broken in production (#133–#144);
 * violating any of them blocks the PR in CI.
 *
 * Root → rule map:
 *  A (منبع حقیقت محتوا) → R5 readability-claims, R6 stroke text ↔ geometry,
 *                          R7 translit standard
 *  B (Registry/Resolver) → R8 fsrs item registry, R9 link integrity,
 *                          R10 draft/published lifecycle
 *  C (Journey Engine)   → R11 journey invariants (+ the 0/1/N regression)
 *  D (پیام‌رسانی)        → R3 feedback no-leak, R12 wrap-up honesty
 *  data hygiene         → R1 Japanese charset, R2 option/chunk uniqueness
 *
 * The suite is deliberately CHAPTER-AGNOSTIC: nothing here may hardcode
 * chapter 01 — if a rule needs a per-chapter fact, it reads it from the
 * chapter's own data.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { listChapters } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { requiredKanaOf, readabilityLabel } from '@/modules/curriculum/content/readability';
import { BANNED_TRANSLIT_STRINGS } from '@/modules/curriculum/content/translit-standard';
import { resolveReviewCard } from '@/modules/fsrs/item-registry';
import { nextStation, orderedStations, resolveJourney } from '@/modules/curriculum/journey';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { compileEngineChapter, engineChapterSchema } from '@/modules/lesson-engine';
import { gradeExerciseAnswer, type ExerciseAnswerPayload } from '@/modules/curriculum/grading';
import type { Chapter, Exercise } from '@/modules/curriculum/types';

/* ------------------------------------------------------------------ corpus */

/** Every published chapter + every compiled draft chapter (the full corpus). */
function corpus(): { chapter: Chapter; kind: 'published' | 'draft' }[] {
  const out: { chapter: Chapter; kind: 'published' | 'draft' }[] = listChapters().map((chapter) => ({
    chapter,
    kind: 'published' as const,
  }));
  const dir = join(process.cwd(), 'content/lesson-engine');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.yaml')) continue;
      try {
        const parsed = parseYaml(readFileSync(join(dir, f), 'utf8'));
        const safe = engineChapterSchema.safeParse(parsed);
        if (!safe.success) continue; // a schema-invalid draft is the lesson-engine's own gate
        const compiled = compileEngineChapter(safe.data);
        if (compiled.findings.some((f2) => f2.severity === 'hard')) continue; // hard-gated at compile
        out.push({ chapter: compiled.chapter, kind: 'draft' });
      } catch {
        // unreadable draft — the draft listing gate (server.ts) skips it too
      }
    }
  }
  return out;
}

const allExercises = (ch: Chapter): Exercise[] => Object.values(ch.exercises);

/** All learner-facing feedback strings of an exercise (F1/F2 + rationales). */
function preRevealStrings(ex: Exercise): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [
    { field: 'f1Fa', text: ex.feedback.f1Fa },
    { field: 'f2HintFa', text: ex.feedback.f2HintFa },
  ];
  for (const [k, v] of Object.entries(ex.distractorRationaleFa ?? {})) {
    if (typeof v === 'string' && v) out.push({ field: `distractor[${k}]`, text: v });
  }
  return out;
}

/** The correct answer's display texts (what must NOT appear pre-reveal). */
function keyTexts(ex: Exercise): string[] {
  const texts: string[] = [];
  const opt = ex.options?.find((o) => o.id === ex.correctOptionId);
  if (opt) texts.push(opt.label);
  if (ex.correctOrder) {
    for (const id of ex.correctOrder) {
      const c = ex.chunks?.find((c2) => c2.id === id);
      if (c) texts.push(c.ja);
    }
  }
  if (ex.acceptedChipOrder) {
    for (const id of ex.acceptedChipOrder) {
      const c = ex.chips?.find((c2) => c2.id === id);
      if (c) texts.push(c.ja);
    }
  }
  return texts.filter((t) => t && t !== '___NAME___' && !t.startsWith('[نام]'));
}

const syntheticState = (slug: string) => ({
  stationSlug: slug,
  status: 'completed' as const,
  bestScore: null,
  attemptCount: 1,
  currentBlock: null,
  lastActivityAt: new Date().toISOString(),
});

/* ------------------------------------------------------------------ rules */

describe('R1 — Japanese charset (the ちゅうごک class of typos, #138)', () => {
  /** Arabic/Persian LETTERS (never punctuation — «،» legitimately follows kana) */
  const ARABIC_LETTER = /[\u0620-\u063A\u0641-\u064A\u0672-\u06D3]/;
  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  /** A kana character DIRECTLY attached to an Arabic/Persian LETTER (no space,
   *  punct or bracket between them) is exactly how the Persian «ک» smuggled
   *  itself into ちゅうごく. */
  const ADJACENCY = new RegExp(
    `[\\u3040-\\u30FF]${ARABIC_LETTER.source.slice(1, -1)}|${ARABIC_LETTER.source.slice(1, -1)}[\\u3040-\\u30FF]`,
  );

  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      for (const ex of allExercises(chapter)) {
        const strings: [string, string][] = [
          ['f1Fa', ex.feedback.f1Fa],
          ['f2HintFa', ex.feedback.f2HintFa],
          ['f3ExplainFa', ex.feedback.f3ExplainFa],
          ['promptFa', ex.promptFa],
        ];
        for (const r of Object.values(ex.distractorRationaleFa ?? {})) {
          if (typeof r === 'string') strings.push(['rationale', r]);
        }
        for (const [field, text] of strings) {
          expect(
            ADJACENCY.test(text),
            `${chapter.slug}/${ex.id} ${field}: a kana character is glued to a Persian letter (the #138 typo class): «${text}»`,
          ).toBe(false);
        }
        // pure-Japanese fields carry no Persian script (kana-recall's promptJa
        // is the Persian recall prompt BY DESIGN; name placeholders allowed)
        if (ex.type !== 'kana-recall') {
          const jaText = ex.promptJa;
          if (jaText && ARABIC.test(jaText) && !jaText.includes('[نام]')) {
            expect.fail(`${chapter.slug}/${ex.id} promptJa carries Persian script: «${jaText}»`);
          }
        }
        for (const c of ex.chunks ?? []) {
          if (ARABIC.test(c.ja) && !c.ja.includes('[نام]')) {
            // dialogue-order chunks may be Persian story-event labels (the ch2
            // comprehension gate); word-order/produce chunks must be Japanese
            if (ex.type !== 'dialogue-order') {
              expect.fail(`${chapter.slug}/${ex.id} chunk ja carries Persian script: «${c.ja}»`);
            }
          }
        }
        for (const c of ex.chips ?? []) {
          if (ARABIC.test(c.ja) && c.ja !== '___NAME___' && !c.ja.includes('[نام]')) {
            expect.fail(`${chapter.slug}/${ex.id} chip ja carries Persian script: «${c.ja}»`);
          }
        }
      }
    });
  }
});

describe('R2 — option/chunk/chip uniqueness (the duplicate-option report, #138)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      for (const ex of allExercises(chapter)) {
        if (ex.options) {
          const ids = ex.options.map((o) => o.id);
          const labels = ex.options.map((o) => o.label);
          expect(new Set(ids).size, `${chapter.slug}/${ex.id}: duplicate option ids`).toBe(ids.length);
          expect(new Set(labels).size, `${chapter.slug}/${ex.id}: duplicate option labels`).toBe(labels.length);
        }
        if (ex.chunks) {
          const ids = ex.chunks.map((c) => c.id);
          const jas = ex.chunks.map((c) => c.ja);
          expect(new Set(ids).size, `${chapter.slug}/${ex.id}: duplicate chunk ids`).toBe(ids.length);
          expect(new Set(jas).size, `${chapter.slug}/${ex.id}: duplicate chunk texts`).toBe(jas.length);
        }
        if (ex.chips) {
          const ids = ex.chips.map((c) => c.id);
          const jas = ex.chips.map((c) => c.ja);
          expect(new Set(ids).size, `${chapter.slug}/${ex.id}: duplicate chip ids`).toBe(ids.length);
          expect(new Set(jas).size, `${chapter.slug}/${ex.id}: duplicate chip texts`).toBe(jas.length);
        }
      }
    });
  }
});

describe('R3 — feedback no-leak at F1/F2 (#139: the answer must not precede the retry)', () => {
  /** A WRONG answer payload for any exercise (the first wrong option / a broken order). */
  function wrongAnswer(ex: Exercise): ExerciseAnswerPayload | null {
    const wrongOption = ex.options?.find((o) => o.id !== ex.correctOptionId);
    if (wrongOption) return { kind: 'option', optionId: wrongOption.id };
    if (ex.correctOrder) {
      const rotated = [...ex.correctOrder.slice(1), ex.correctOrder[0]!];
      return { kind: 'order', orderedIds: rotated };
    }
    if (ex.acceptedChipOrder) {
      const rotated = [...ex.acceptedChipOrder.slice(1), ex.acceptedChipOrder[0]!];
      return { kind: 'build', chipOrder: rotated };
    }
    return null;
  }

  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind}): grading REAL wrong answers never returns the key pre-reveal`, () => {
      for (const ex of allExercises(chapter)) {
        const answer = wrongAnswer(ex);
        if (!answer) continue;
        const keys = keyTexts(ex);
        // F1 + F2 — the two beats BEFORE the reveal
        for (const attempt of [1, 2] as const) {
          const outcome = gradeExerciseAnswer(ex, answer, attempt);
          expect(outcome.correct).toBe(false);
          for (const key of keys) {
            expect(
              outcome.feedbackFa.includes(key),
              `${chapter.slug}/${ex.id} F${attempt} feedback carries the answer («${key}»): «${outcome.feedbackFa}»`,
            ).toBe(false);
            expect(
              outcome.distractorRationaleFa?.includes(key) ?? false,
              `${chapter.slug}/${ex.id} F${attempt} rationale carries the answer («${key}»): «${outcome.distractorRationaleFa}»`,
            ).toBe(false);
            expect(
              outcome.reveal,
              `${chapter.slug}/${ex.id} F${attempt} leaks the reveal field pre-reveal`,
            ).toBeUndefined();
          }
        }
        // F3 IS the reveal — the answer arrives only here
        const f3 = gradeExerciseAnswer(ex, answer, 3);
        expect(f3.correct).toBe(false);
        expect(f3.reveal, `${chapter.slug}/${ex.id}: F3 must carry the reveal`).toBeTruthy();
        // the wrong-path feedback never opens with the success verdict (template class)
        expect(f3.feedbackFa.trim().startsWith('درست!')).toBe(false);
      }
    });
  }
});

describe('R4 — the broken success template is gone (#139 «درست! بود»)', () => {
  it('the success hint is motion-only (one verdict source — the status row)', () => {
    const faSrc = readFileSync(join(process.cwd(), 'src/messages/fa.ts'), 'utf8');
    const match = /autoNextHint:\s*'([^']*)'/.exec(faSrc);
    expect(match).toBeTruthy();
    expect(match![1]!.includes('درست')).toBe(false);
  });
});

describe('R5 — readability claims are computed, never authored (#141)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      for (const st of chapter.stations) {
        for (const b of st.blocks) {
          if (b.kind !== 'example-set') continue;
          for (const ex of b.examples) {
            for (const glyph of requiredKanaOf(ex.ja)) {
              const kanaId = KANA_ITEMS.find((k) => k.glyph === glyph)?.kanaId;
              expect(
                kanaId,
                `${chapter.slug}/${st.slug} example «${ex.ja}» requires kana «${glyph}» that is not in the registry`,
              ).toBeDefined();
            }
            expect(
              /خواندنی است/.test(ex.whyFa ?? ''),
              `${chapter.slug}/${st.slug} example «${ex.ja}» carries an AUTHORED readability claim — remove it; the engine computes the label (content/readability.ts)`,
            ).toBe(false);
          }
        }
      }
    });
  }

  it('the label engine: readable / station-end / preview', () => {
    expect(readabilityLabel('あおい', ['あ', 'お', 'い'], ['あ', 'お', 'い']).kind).toBe('readable');
    expect(readabilityLabel('あおい', ['あ'], ['あ', 'お', 'い']).kind).toBe('station-end');
    expect(readabilityLabel('あおい', ['あ'], ['あ']).kind).toBe('preview');
  });

  it('requiredKanaOf ignores kanji, punctuation and the long-vowel mark', () => {
    expect(requiredKanaOf('日本人')).toEqual([]);
    expect(requiredKanaOf('～かい')).toEqual(['か', 'い']);
    expect(requiredKanaOf('あー')).toEqual(['あ']);
  });
});

describe('R6 — stroke-guide text is generated from geometry (#133)', () => {
  const publicDir = join(process.cwd(), 'public/writing-data');
  it('strokeInfoFa direction matches the validator motion for every shipped glyph', async () => {
    if (!existsSync(publicDir)) return; // writing data not shipped in this checkout
    const index = JSON.parse(readFileSync(join(publicDir, 'index.json'), 'utf8')) as {
      chars: Record<string, { strokes: number }>;
    };
    const { strokeInfoFa } = await import('@/modules/writing/render');
    const { motionHintFa } = await import('@/modules/writing/engine');
    for (const glyph of Object.keys(index.chars)) {
      // the shipped asset files are named by the RAW glyph (あ.json)
      const data = JSON.parse(readFileSync(join(publicDir, `${glyph}.json`), 'utf8'));
      for (let i = 0; i < data.medians.length; i += 1) {
        const info = strokeInfoFa(data, i);
        const median = data.medians[i].map((p: number[]) => ({ x: p[0], y: p[1] }));
        // THE contract: the rendered direction phrase IS the validator's motion
        expect(info.directionFa).toBe(`به سمت ${motionHintFa(median)} بکش`);
        // fa-IR digits in the label (no Latin digits)
        expect(/\d/.test(info.label)).toBe(false);
        expect(info.label).toContain('ضربهٔ');
      }
    }
  });
});

describe('R7 — the translit standard (#140: one standard everywhere)', () => {
  const ROMAJI_SYLLABLE_RUN = /[a-z]+(?:-[a-z]+){2,}/;
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      for (const ex of allExercises(chapter)) {
        for (const { field, text } of preRevealStrings(ex)) {
          for (const banned of BANNED_TRANSLIT_STRINGS) {
            expect(
              text.includes(banned),
              `${chapter.slug}/${ex.id} ${field} contains a banned translit string: «${banned}»`,
            ).toBe(false);
          }
          expect(
            ROMAJI_SYLLABLE_RUN.test(text),
            `${chapter.slug}/${ex.id} ${field} carries a Latin syllable-run translit («ni-ho-n-ji-n» style): «${text}»`,
          ).toBe(false);
        }
      }
    });
  }
});

describe('R8 — the FSRS item registry resolves EVERY declared card (#134)', () => {
  it('every itemId in every PUBLISHED chapter resolves to real content', () => {
    for (const chapter of listChapters()) {
      const declared = new Set<string>();
      for (const w of chapter.words) {
        declared.add(w.fsrs.w);
        declared.add(w.fsrs.s);
      }
      for (const g of chapter.grammar) declared.add(g.fsrs.gr);
      for (const e of chapter.expressions) declared.add(e.fsrs.chrk);
      for (const st of chapter.stations) for (const id of st.fsrsItems) declared.add(id);

      for (const itemId of declared) {
        const card = resolveReviewCard(itemId, 'test');
        expect(
          card.unknown === true,
          `chapter ${chapter.slug}: fsrs item «${itemId}» does NOT resolve through the registry — /review would render an empty card`,
        ).toBe(false);
        if (!card.unknown) {
          expect(
            Boolean(card.glyph || card.term),
            `chapter ${chapter.slug}: item «${itemId}» resolves but has no front face`,
          ).toBe(true);
          expect(
            Boolean(card.meaningFa || card.romaji || card.note),
            `chapter ${chapter.slug}: item «${itemId}» resolves but carries no meaning/back`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('R9 — link integrity (#142: no internal-id copy, refs are line ids)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      const LINE_ID = /^s-[a-z0-9-]+-l\d+$/;
      for (const st of chapter.stations) {
        for (const b of st.blocks) {
          if (b.kind === 'example-set') {
            for (const ex of b.examples) {
              if (ex.lineRef) {
                expect(
                  LINE_ID.test(ex.lineRef),
                  `${chapter.slug}/${st.slug}: example lineRef «${ex.lineRef}» is not a dialogue-line id`,
                ).toBe(true);
              }
            }
          }
          if (b.kind === 'scene') {
            const ref = b.conversationRef;
            if (ref) {
              expect(
                LINE_ID.test(ref),
                `${chapter.slug}/${st.slug}: scene conversationRef «${ref}» is not a dialogue-line id (refs resolve at render; an unresolvable ref renders NOTHING)`,
              ).toBe(true);
            }
          }
        }
      }
    });
  }
});

describe('R10 — draft/published lifecycle (#142)', () => {
  it('draft slugs never collide with published registry slugs', () => {
    const published = new Set(listChapters().map((c) => c.slug));
    for (const { chapter, kind } of corpus()) {
      if (kind === 'draft') {
        expect(published.has(chapter.slug), `draft ${chapter.slug} collides with a published chapter`).toBe(false);
      }
    }
  });
});

describe('R11 — journey invariants (#136/#137: one frontier, prereqs first)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind}): 0 / 1 / N completed → the frontier follows the REAL walk`, () => {
      const level = LEVELS_BY_CODE[chapter.levelCode]!;
      const ordered = orderedStations(chapter);
      const coreOrdered = ordered.filter((s) => s.core);
      const firstCore = coreOrdered[0]!;

      const journeyWith = (completedCount: number) =>
        resolveJourney(
          chapter,
          level,
          coreOrdered.slice(0, completedCount).map((s) => syntheticState(s.slug)),
          null,
          { unlockAll: true },
        );

      // 0 complete → the frontier is the FIRST core station (even with unlockAll)
      expect(nextStation(journeyWith(0))?.slug).toBe(firstCore.slug);

      // 1 complete → the frontier moved OFF the completed station (the audited bug)
      expect(nextStation(journeyWith(1))?.slug, '#136: the frontier froze on the completed station').not.toBe(
        firstCore.slug,
      );

      // N complete (all core) → no frontier left (null)
      expect(nextStation(journeyWith(coreOrdered.length))).toBeNull();
    });

    it(`chapter ${chapter.slug} (${kind}): prerequisites are acyclic and walk-ordered`, () => {
      const ordered = orderedStations(chapter);
      const orderOf = new Map(ordered.map((s, i) => [s.slug, i]));
      for (const st of chapter.stations) {
        for (const pre of st.prerequisites) {
          expect(orderOf.get(pre), `${chapter.slug}: ${st.slug} prereq «${pre}» is unknown`).toBeDefined();
          expect(
            orderOf.get(pre)! < orderOf.get(st.slug)!,
            `${chapter.slug}: ${st.slug} prereq «${pre}» comes AFTER it in walk order`,
          ).toBe(true);
        }
      }
    });
  }
});

describe('R12 — wrap-up honesty (root D: no static enrollment claims in data)', () => {
  it('no wrap-up block claims FSRS enrollment statically', () => {
    for (const { chapter, kind } of corpus()) {
      void kind;
      for (const st of chapter.stations) {
        for (const b of st.blocks) {
          if (b.kind !== 'wrap-up') continue;
          for (const item of b.itemsFa) {
            expect(
              /صف مرور ثبت شدند/.test(item),
              `${chapter.slug}/${st.slug}: wrap-up statically claims FSRS enrollment — the completion panel states the REAL count from the API`,
            ).toBe(false);
          }
        }
      }
    }
  });
});

describe('R13 — station data sanity (guards the audited render paths)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      for (const st of chapter.stations) {
        for (const b of st.blocks) {
          if (b.kind === 'kana-card') {
            expect(
              KANA_ITEMS.some((k) => k.kanaId === b.kanaId),
              `${chapter.slug}/${st.slug}: kana-card «${b.kanaId}» is not in the registry`,
            ).toBe(true);
          }
          if (b.kind === 'exercise') {
            for (const id of b.exerciseIds) {
              expect(
                chapter.exercises[id],
                `${chapter.slug}/${st.slug}: exercise block references unknown exercise «${id}»`,
              ).toBeDefined();
            }
          }
        }
      }
    });
  }
});

/* ------------------------------------------------------------------ R14 */

/**
 * B2-REBUILD 2026-11-27 — the «خط N» consistency law.
 *
 * The focused-line card displays a line's REAL 1-based dialogue position
 * (B1 §۱), and the teaching copy around it cross-references those numbers
 * («جملهٔ خط ۶ را با خط ۹ مقایسه کن», «از مکالمه (خط ۹)», «گوش بده (خط ۳)»).
 * The unit-02-2 authoring had a systematic off-by-one (the も question cited
 * as «خط ۱۰» while the card itself displayed خط ۹) — the learner read two
 * contradictory numbers for the same line. This law pins EVERY learner-facing
 * «خط N» mention to an actually-anchored line of the same station:
 *
 *  - a station-block string may cite only lines in the station's lineRefs
 *    (or a lineRef/audioLineRef of one of the station's own exercises);
 *  - an exercise OUTSIDE the station walk (the gate bank) may cite only its
 *    own lineRef/audioLineRef anchors.
 *
 * Chapter-agnostic: reads the mention out of the chapter's own data. Persian
 * and ASCII digits both accepted.
 */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function parseLineMention(raw: string): number {
  return Number(
    raw
      .split('')
      .map((d) => (FA_DIGITS.includes(d) ? String(FA_DIGITS.indexOf(d)) : d))
      .join(''),
  );
}

function lineMentions(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/خط\s*[۰-۹0-9]+/g)) {
    out.push(parseLineMention(m[0].replace(/^خط\s*/, '')));
  }
  return out;
}

describe('R14 — «خط N» mentions are anchored (B2: the off-by-one line citations)', () => {
  for (const { chapter, kind } of corpus()) {
    it(`chapter ${chapter.slug} (${kind})`, () => {
      const exById = new Map(Object.entries(chapter.exercises));
      for (const st of chapter.stations) {
        /* the station's anchored line numbers */
        const anchored = new Set(st.lineRefs.map((r) => Number(r.split('-l').pop())));
        const blockTexts: { where: string; text: string }[] = [];
        for (const b of st.blocks) {
          const w = `${st.slug}/${b.id}`;
          for (const key of [
            'titleFa',
            'bodyFa',
            'questionFa',
            'promptFa',
            'explainFa',
            'revealFa',
            'persianBridgeFa',
            'listenNoteFa',
          ] as const) {
            const v = (b as Record<string, unknown>)[key];
            if (typeof v === 'string') blockTexts.push({ where: w, text: v });
          }
          if (b.kind === 'example-set') {
            for (const ex of (b as { examples: { fa?: string; whyFa?: string }[] }).examples) {
              if (ex.fa) blockTexts.push({ where: `${w}/example`, text: ex.fa });
              if (ex.whyFa) blockTexts.push({ where: `${w}/why`, text: ex.whyFa });
            }
          }
          if (b.kind === 'exercise') {
            for (const id of (b as { exerciseIds: string[] }).exerciseIds) {
              const ex = exById.get(id);
              if (!ex) continue;
              /* the exercise's own anchors extend the allowed set */
              for (const ref of [ex.lineRef, ex.audioLineRef]) {
                if (ref) anchored.add(Number(ref.split('-l').pop()));
              }
              for (const s of [
                ex.promptFa,
                ex.feedback?.f1Fa,
                ex.feedback?.f2HintFa,
                ex.feedback?.f3ExplainFa,
                ...(ex.distractorRationaleFa ? Object.values(ex.distractorRationaleFa) : []),
              ]) {
                if (s) blockTexts.push({ where: `${st.slug}/${id}`, text: s });
              }
            }
          }
        }
        for (const { where, text } of blockTexts) {
          for (const n of lineMentions(text)) {
            expect(
              anchored.has(n),
              `${chapter.slug}/${where}: cites «خط ${n}» but L${n} is not anchored to this station (anchors: {${[...anchored].sort((a, b) => a - b).join(', ')}})`,
            ).toBe(true);
          }
        }
      }
      /* the gate bank: every non-station exercise cites only its own anchors */
      const stationExIds = new Set(
        chapter.stations.flatMap((s) =>
          s.blocks.flatMap((b) => (b.kind === 'exercise' ? (b as { exerciseIds: string[] }).exerciseIds : [])),
        ),
      );
      for (const ex of allExercises(chapter)) {
        if (stationExIds.has(ex.id)) continue;
        const own = new Set([ex.lineRef, ex.audioLineRef].filter(Boolean).map((r) => Number(r!.split('-l').pop())));
        for (const s of [ex.promptFa, ex.feedback?.f1Fa, ex.feedback?.f2HintFa, ex.feedback?.f3ExplainFa]) {
          if (!s) continue;
          for (const n of lineMentions(s)) {
            expect(
              own.has(n),
              `${chapter.slug}/${ex.id} (gate bank): cites «خط ${n}» but its own anchors are {${[...own].join(', ')}}`,
            ).toBe(true);
          }
        }
      }
    });
  }
});
