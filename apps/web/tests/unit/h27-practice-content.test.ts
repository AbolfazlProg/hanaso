/**
 * TASK-HANASO-27 — practice-station content gates.
 *
 * Gates:
 *  - PR-1 placement: p1..p4 sit at the designed breakpoints in the Hiragana
 *    unit's stationSlugs (after h5 / h9 / h12 / h15-before-m1) — the
 *    Learn → Practice → … → Review rhythm (CL-16 extended to the new slugs).
 *  - PR-2 drop-proof: removing any practice station from stationSlugs fails
 *    (negative fixture, same shape as the CL-16 negative).
 *  - PR-3 untaught-content ban: every glyph in every practice item's prompt,
 *    options, readings and hints is TAUGHT by that point (uses the same
 *    glyph-budget legality computation as TL-14; plus the guardrails the
 *    design §8 lists: ゜ before h15 forbidden, ゃゅょ before h6, っ before h13,
 *    katakana glyphs and chōonpu never).
 *  - PR-4 coverage: every taught hiragana glyph appears in ≥1 practice item
 *    across p1..p4 (coverage matrix from the design §7).
 *  - PR-5 no duplicates: no two practice items share the same (type, prompt,
 *    correct answer) triple — reordering options is not a new exercise.
 *  - PR-6 hint/feedback quality: every practice exercise carries the full
 *    F1/F2/F3 ladder + per-option distractorRationaleFa + referenceBlockId.
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { glyphsIntroducedByStation } from '@/modules/practice/kana/items';
import type { Exercise } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const exercises = chapter.exercises as Record<string, Exercise>;

const P_SLUGS = ['stn-kana-p1', 'stn-kana-p2', 'stn-kana-p3', 'stn-kana-p4'] as const;

/** The Hiragana unit's stationSlugs (source of the visible journey list). */
const hiraUnit = chapter.units!.find((u) => u.slug === 'section-a-hiragana')!;
const hiraSlugs = hiraUnit.stationSlugs;

/** All practice-exercise ids referenced by the four practice stations. */
function practiceExerciseIds(): string[] {
  const ids: string[] = [];
  for (const slug of P_SLUGS) {
    const station = chapter.stations.find((s) => s.slug === slug)!;
    for (const block of station.blocks) {
      if (block.kind === 'exercise') ids.push(...block.exerciseIds);
    }
  }
  return ids;
}

/** Glyphs taught up to (excluding) a station, in stationSlugs order — the
 *  same legality source the TL-14 glyph budget uses (introducesGlyphs). */
/** Rule stations that DISPLAY derived forms (glyph-budget DERIVED-GLYPH-SHOWN):
 *  h5 shows が/ぎ/ご/ざ/じ/ぜ, h12 shows ば/び/ぶ, h15 shows ぱ/ぴ/ぽ/ぼ, h6 shows
 *  the yōon smalls, h13 the sokuon — the same rule-mark stations the content
 *  validation uses. A derived form is legal once its rule station was passed. */
/* derived-form unlock stations (mirrors glyph-budget DAKUTEN_BASE/HANDAKUTEN_BASE):
 * か-row + さ-row dakuten shown at h5; は-row dakuten (ば/び/ぶ) at h12;
 * handakuten (ぱ/ぴ/ぽ/ぼ) at h15. */
const DERIVED_FORM_STATION: Record<string, string> = {
  が: 'stn-kana-h5', ぎ: 'stn-kana-h5', ぐ: 'stn-kana-h5', げ: 'stn-kana-h5', ご: 'stn-kana-h5',
  ざ: 'stn-kana-h5', じ: 'stn-kana-h5', ず: 'stn-kana-h5', ぜ: 'stn-kana-h5', ぞ: 'stn-kana-h5',
  だ: 'stn-kana-h9', ぢ: 'stn-kana-h9', づ: 'stn-kana-h9', で: 'stn-kana-h9', ど: 'stn-kana-h9',
  ば: 'stn-kana-h12', び: 'stn-kana-h12', ぶ: 'stn-kana-h12', べ: 'stn-kana-h12', ぼ: 'stn-kana-h12',
  ぱ: 'stn-kana-h15', ぴ: 'stn-kana-h15', ぷ: 'stn-kana-h15', ぺ: 'stn-kana-h15', ぽ: 'stn-kana-h15',
};

function glyphsTaughtBefore(slug: string): Set<string> {
  const idx = hiraSlugs.indexOf(slug);
  const taught = new Set<string>();
  for (const before of hiraSlugs.slice(0, idx)) {
    for (const item of glyphsIntroducedByStation(before)) taught.add(item.glyph);
    const ruleChars: Record<string, string[]> = {
      'stn-kana-h6': ['ゃ', 'ゅ', 'ょ'],
      'stn-kana-h13': ['っ'],
    };
    for (const ch of ruleChars[before] ?? []) taught.add(ch);
    for (const [form, by] of Object.entries(DERIVED_FORM_STATION)) {
      if (by === before) taught.add(form);
    }
  }
  return taught;
}

const HIRA = /[ぁ-ゖ]/;

describe('TASK-HANASO-27 — practice stations in the journey (PR-1/PR-2)', () => {
  it('PR-1: p1..p4 sit at the designed breakpoints (Learn→Practice rhythm)', () => {
    const at = (slug: string) => hiraSlugs.indexOf(slug);
    expect(at('stn-kana-p1')).toBe(at('stn-kana-h5') + 1);
    expect(at('stn-kana-p7' as never)).toBe(-1); // no p5+ exists
    expect(hiraSlugs[at('stn-kana-p1') + 1]).toBe('stn-kana-h7');
    expect(at('stn-kana-p2')).toBe(at('stn-kana-h9') + 1);
    expect(hiraSlugs[at('stn-kana-p2') + 1]).toBe('stn-kana-h10');
    expect(at('stn-kana-p3')).toBe(at('stn-kana-h12') + 1);
    expect(hiraSlugs[at('stn-kana-p3') + 1]).toBe('stn-kana-h14');
    expect(at('stn-kana-p4')).toBe(at('stn-kana-h15') + 1);
    expect(hiraSlugs[at('stn-kana-p4') + 1]).toBe('stn-kana-m1-reading');
    // the four stations are typed practice, core, task_completed — same
    // shape as the m1 reading milestone (no mastery claim)
    for (const slug of P_SLUGS) {
      const st = chapter.stations.find((s) => s.slug === slug)!;
      expect(st.type).toBe('practice');
      expect(st.core).toBe(true);
      expect(st.completion.kind).toBe('task_completed');
      expect(st.fsrsItems).toEqual([]); // no FSRS scheduling claim
    }
  });

  it('PR-2 (negative fixture): removing a practice station from stationSlugs FAILS the journey consistency', () => {
    const before = [...hiraUnit.stationSlugs];
    (hiraUnit as { stationSlugs: string[] }).stationSlugs = before.filter((s) => s !== 'stn-kana-p2');
    try {
      const okNow = hiraUnit.stationSlugs.every((s, i) => {
        const st = chapter.stations.find((x) => x.slug === s);
        return st !== undefined;
      }) && new Set(hiraUnit.stationSlugs).size === hiraUnit.stationSlugs.length;
      // the CL-16 gate (h25-content-lint) is the real assertion; here we pin
      // the invariant it builds on: every station has a UNIQUE order and the
      // unit list length must match the station count for section A.
      const aStations = chapter.stations.filter((s) =>
        ['stn-kana-h0', 'stn-kana-h1', 'stn-kana-h2', 'stn-kana-h3', 'stn-kana-h4', 'stn-kana-h5', 'stn-kana-h7', 'stn-kana-h8', 'stn-kana-h9', 'stn-kana-h10', 'stn-kana-h11', 'stn-kana-h12', 'stn-kana-h14', 'stn-kana-h6', 'stn-kana-h13', 'stn-kana-h15', 'stn-kana-m1-reading', 'stn-kana-opt-r-h9', ...P_SLUGS].includes(s.slug),
      );
      expect(okNow && hiraUnit.stationSlugs.length === aStations.length).toBe(false);
    } finally {
      (hiraUnit as { stationSlugs: string[] }).stationSlugs = before;
    }
  });
});

describe('TASK-HANASO-27 — untaught-content ban per station (PR-3)', () => {
  const cases: [slug: string, forbidden: string, why: string][] = [
    ['stn-kana-p1', 'んぬねのたちつてとまみむめもらりるれろはひふへほやゆよわを', 'all later-row glyphs + ん are untaught at p1'],
    ['stn-kana-p1', 'ぱぴぽぼ', 'handakuten is untaught until h15'],
    ['stn-kana-p2', 'まみむめもらりるれろはひふへほやゆよわをばびぶ', 'rows ま/ら/は + ば and later are untaught at p2'],
    ['stn-kana-p3', 'ゃゅょっやゆよわをぱぴぽぼ', 'yōon/sokuon/わ-row/handakuten untaught at p3'],
    ['stn-kana-p4', 'ーァィゥェォカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴ', 'katakana glyphs and the chōonpu never appear in hiragana practice'],
  ];

  it.each(cases)('%s: no forbidden glyph anywhere in its items (%s)', (slug, forbidden) => {
    const station = chapter.stations.find((s) => s.slug === slug)!;
    const ids = station.blocks.flatMap((b) => (b.kind === 'exercise' ? b.exerciseIds : []));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const ex = exercises[id]!;
      const surfaces = [
        ex.promptJa ?? '',
        ex.promptJaReading ?? '',
        ex.promptFa,
        ...Object.values(ex.distractorRationaleFa ?? {}),
        ex.feedback?.f1Fa ?? '',
        ex.feedback?.f2HintFa ?? '',
        ex.feedback?.f3ExplainFa ?? '',
      ];
      for (const s of surfaces) {
        for (const ch of forbidden) {
          expect(s.includes(ch), `${id}: surface contains untaught glyph ${ch} → ${s}`).toBe(false);
        }
      }
    }
  });

  it('every glyph used in p-items was introduced by an earlier station (introducesGlyphs truth)', () => {
    for (const slug of P_SLUGS) {
      const taught = glyphsTaughtBefore(slug);
      const station = chapter.stations.find((s) => s.slug === slug)!;
      for (const block of station.blocks) {
        if (block.kind !== 'exercise') continue;
        for (const id of block.exerciseIds) {
          const ex = exercises[id]!;
          const kanaText = [ex.promptJa ?? '', ...(ex.options ?? []).map((o) => o.label)].join('');
          for (const ch of kanaText) {
            if (HIRA.test(ch)) {
              expect(taught.has(ch), `${slug}/${id}: glyph ${ch} not introduced before this station`).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('TASK-HANASO-27 — coverage + quality (PR-4..PR-6)', () => {
  const ids = practiceExerciseIds();
  const items = ids.map((id) => exercises[id]!);

  it('PR-4: every taught hiragana base glyph is covered by ≥2 practice items', () => {
    const baseGlyphs = new Set(
      hiraSlugs
        .filter((s) => s !== 'stn-kana-m1-reading' && s !== 'stn-kana-opt-r-h9')
        .flatMap((s) => glyphsIntroducedByStation(s).map((k) => k.glyph)),
    );
    expect(baseGlyphs.size).toBeGreaterThanOrEqual(46);
    const counts = new Map<string, number>();
    for (const ex of items) {
      const text = [ex.promptJa ?? '', ...(ex.options ?? []).map((o) => o.label)].join('');
      for (const ch of text) if (HIRA.test(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    const missing = [...baseGlyphs].filter((g) => (counts.get(g) ?? 0) < 2);
    expect(missing, `glyphs with <2 practice items: ${missing.join(' ')}`).toEqual([]);
  });

  it('PR-5: no duplicate items (same type + prompt + correct label is NOT a new exercise)', () => {
    const seen = new Set<string>();
    for (const ex of items) {
      const correct = (ex.options ?? []).find((o) => o.id === ex.correctOptionId)?.label ?? '';
      const key = `${ex.type}::${ex.promptJa ?? ''}::${ex.promptFa}::${correct}`;
      expect(seen.has(key), `duplicate practice item: ${ex.id}`).toBe(false);
      seen.add(key);
    }
  });

  it('PR-6: every practice item carries the full ladder + per-option rationale + F4 pointer', () => {
    for (const ex of items) {
      expect(ex.feedback?.f1Fa, `${ex.id}: f1 missing`).toBeTruthy();
      expect(ex.feedback?.f2HintFa, `${ex.id}: f2 missing`).toBeTruthy();
      expect(ex.feedback?.f3ExplainFa, `${ex.id}: f3 missing`).toBeTruthy();
      const opts = ex.options ?? [];
      expect(Object.keys(ex.distractorRationaleFa ?? {}).length, `${ex.id}: rationales missing`).toBe(opts.length - 1);
      expect(ex.referenceBlockId, `${ex.id}: referenceBlockId missing`).toBeTruthy();
      expect(ex.assessmentRole).toBe('practice');
    }
  });
});
