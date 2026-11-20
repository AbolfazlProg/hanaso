// @vitest-environment node
/**
 * HANASO — Lesson Engine CI gates (owner-pass 2026-11-19, mission phase 5).
 *
 * The pedagogical validator as a CI gate: the committed draft chapter must
 * parse against the engine schema, PASS the framework validator (zero hard
 * findings), and COMPILE to the existing runtime Chapter shape (D-0011 — no
 * parallel engine). Plus the anti-invention contract: booklet-derived items
 * keep needs_review flags until the owner confirms them, and the booklet
 * parser keeps provenance pages on everything it extracts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  compileEngineChapter,
  engineChapterSchema,
  formatValidatorReport,
  validateEngineChapter,
  type EngineChapter,
} from '@/modules/lesson-engine/index';
import { parseBooklet } from '../../scripts/lesson-engine/parse-booklet';

const DRAFT_PATH = resolve(__dirname, '../../content/lesson-engine/n5-lesson-02.yaml');

function loadDraft(): EngineChapter {
  const parsed = engineChapterSchema.safeParse(parse(readFileSync(DRAFT_PATH, 'utf8')));
  if (!parsed.success) throw new Error(`draft schema invalid: ${JSON.stringify(parsed.error.flatten())}`);
  return parsed.data;
}

describe('lesson-engine: draft schema + pedagogical validation (CI gate)', () => {
  it('the committed draft parses against the engine schema', () => {
    const draft = loadDraft();
    expect(draft.engineVersion).toBe(1);
    expect(draft.published).toBe(false); // drafts are NEVER published by the engine
    expect(draft.bookletLesson).toBe(2);
    expect(draft.dialogue.length).toBeGreaterThan(0);
  });

  it('passes the pedagogical validator with ZERO hard findings', () => {
    const report = validateEngineChapter(loadDraft(), { mode: 'draft' });
    const hard = report.findings.filter((f) => f.severity === 'hard');
    expect(hard, formatValidatorReport(report)).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it('keeps the anti-invention contract: booklet items carry sourceRefs + review flags', () => {
    const draft = loadDraft();
    for (const line of draft.dialogue) expect(line.sourceRef?.artifact).toBe('n5-booklet');
    for (const v of draft.vocabulary) {
      expect(v.sourceRef?.page).toBeGreaterThan(0);
      expect(v.meaningFa).toContain('TODO'); // booklet has NO Persian — never invented
    }
    const flagged = [...draft.vocabulary, ...draft.grammar].filter((i) => i.flags.includes('needs_review'));
    expect(flagged.length).toBeGreaterThan(0);
  });
});

describe('lesson-engine: compile → existing runtime (D-0011 compatibility)', () => {
  it('compiles the draft into the runtime Chapter shape', () => {
    const { chapter, findings } = compileEngineChapter(loadDraft());
    expect(chapter.slug).toBe('n5-lesson-02');
    expect(chapter.stations.length).toBe(loadDraft().stations.length);
    expect(Object.keys(chapter.exercises).length).toBeGreaterThan(0);
    expect(chapter.dialogueSlug).toBe('n5-lesson-02');
    // compile-level notes are soft only — EXCEPT the audited hard gates: the
    // n5-lesson-02 skeleton (TODO placeholders) is flagged C-ORDER-TILES
    // (order interactions with no tiles = unanswerable content, UX-AUDIT #142).
    // The hard gate keeps the skeleton out of the registry/index/walk until it
    // is actually authored; the compiled SHAPE remains inspectable here.
    const hard = findings.filter((f) => f.severity === 'hard');
    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every((f) => f.rule === 'C-ORDER-TILES')).toBe(true);
  });

  it('compiled output satisfies the product content invariants (unique slugs, resolved prereqs, ordered walk)', () => {
    const { chapter } = compileEngineChapter(loadDraft());
    const slugs = new Set<string>();
    chapter.stations.forEach((s) => {
      expect(slugs.has(s.slug)).toBe(false);
      slugs.add(s.slug);
      s.prerequisites.forEach((p) => expect(slugs.has(p) || chapter.stations.some((x) => x.slug === p)).toBe(true));
    });
    for (let i = 1; i < chapter.stations.length; i += 1) {
      expect(chapter.stations[i]!.order).toBeGreaterThan(chapter.stations[i - 1]!.order);
    }
    // every exercise referenced by a block resolves (t29-m1 invariant analogue)
    chapter.stations.forEach((s) => {
      s.blocks.forEach((b) => {
        if (b.kind === 'exercise') b.exerciseIds.forEach((id) => expect(chapter.exercises[id]).toBeTruthy());
      });
    });
  });
});

describe('lesson-engine: booklet parser provenance (phase 4 contract)', () => {
  const SAMPLE = `## درس ۹۹ — テストです
> Lesson 99 Test.
> منبع: \`N5-99.pdf\` — تست

Ⅰ．レッスンもくひょう
1.テストの つかいかた test usage

Ⅱ．かいわ kaiwa

たなか ：こんにちは。
Tanaka ：konnichiwa
〔ص 7〕
ワン ：はじめまして。
Wang ：hajimemashite

Ⅲ．ごい goi
1.がくせい 学生 gakusee student

Ⅴ．ぶんぽう bumpoo
1.N1 は N2 です。
1.わたしは がくせいです。
2.N1 は N2 じゃ ありません。
`;

  it('extracts items with booklet pages, sections and the grammar numbering-restart rule', () => {
    const draft = parseBooklet(SAMPLE, 'test-artifact');
    expect(draft.lessons).toHaveLength(1);
    const l = draft.lessons[0]!;
    expect(l.no).toBe(99);
    expect(l.sourceFile).toBe('N5-99.pdf');
    expect(l.goals).toHaveLength(1);
    expect(l.conversation).toHaveLength(2);
    expect(l.conversation[0]).toMatchObject({ speaker: 'たなか', ja: 'こんにちは。', romaji: 'konnichiwa' });
    expect(l.conversation[1]!.page).toBe(7); // the 〔ص 7〕 marker attaches to following lines
    expect(l.vocabulary[0]).toMatchObject({ ja: 'がくせい 学生', meaningEn: 'student', meaningFa: null });
    expect(l.vocabulary[0]!.flags).toContain('needs_review');
    // pattern 1 → example (number restart) → pattern 2
    expect(l.grammar).toHaveLength(2);
    expect(l.grammar[0]).toMatchObject({ patternJa: 'N1 は N2 です。', examplesJa: ['わたしは がくせいです。'] });
    expect(l.grammar[1]!.patternJa).toContain('じゃ ありません');
  });
});
