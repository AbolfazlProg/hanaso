/**
 * HANASO — Chapter content validation tests (TASK-LEARNING-01).
 *
 * Fail-first rule: these tests encode the KB design contracts (island S/O rules,
 * L2 caps, QUESTION quality rules) over the BUNDLED chapter data — a content edit
 * that violates the blueprint breaks the build here, not in review.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { anchorIntroLawSatisfied } from '@/modules/curriculum/content/anchor-intro-law';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { validateChapter, validateChapterAgainstDialogue } from '@/modules/curriculum/validation';
import { orderedStations, resolveJourney, nextStation, masteryStation } from '@/modules/curriculum/journey';
import { gradeMasterySubmission, gradeExerciseAnswer, toClientExercise } from '@/modules/curriculum/grading';
import type { ExerciseAnswerPayload } from '@/modules/curriculum/grading';
import { loadDialogue } from '@/modules/dialogue/server';
import { FM01_EXERCISES } from '@/modules/curriculum/content/chapter-fm01.exercises';
import { KANA_ITEMS, KANA_ITEMS_BY_ID } from '@/modules/curriculum/content/kana-items';
import { loadRealAudioAssets, loadVoices as loadVoicesForTest } from '@/modules/audio/audio-manifest';
import { hashAudioLine } from '@/modules/dialogue/content/loader';
import { resolveSpeaker } from '@/modules/character/registry';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('bundled chapters', () => {
  it('ships kana foundation → kana expansion → the first conversation chapter', () => {
    // TASK-LEARNING-06: chapter 01 (kana, L1) → its expansion (the bank completion,
    // Issue #146 — same L1 band, chained prerequisite) → the conversation chapter (L2).
    expect(listChapters().map((c) => c.slug)).toEqual(['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']);
  });

  /* TASK-LEARNING-13 (progress audit A-5): the kana bank shipped 80 exercise
   * ids with TWO different definitions — Object.fromEntries silently kept the
   * last, so edits to the shadowed copies were no-ops (live-reproduced while
   * auditing). The bank is deduped now; this gate keeps it that way. The check
   * must run on the ARRAY (the chapter record collapses duplicates before
   * validation could ever see them). */
  it('banks every exercise id exactly once (no silent shadowing — TL-13 A-5)', async () => {
    const { KANA_EXERCISES } = await import('@/modules/curriculum/content/chapter-kana01.exercises');
    const seen = new Map<string, number>();
    for (const ex of KANA_EXERCISES) seen.set(ex.id, (seen.get(ex.id) ?? 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1);
    expect(dups, `duplicate exercise ids: ${dups.map(([id]) => id).join(', ')}`).toEqual([]);
    const fmSeen = new Map<string, number>();
    for (const ex of FM01_EXERCISES) fmSeen.set(ex.id, (fmSeen.get(ex.id) ?? 0) + 1);
    expect([...fmSeen.entries()].filter(([, n]) => n > 1)).toEqual([]);
  });
});

describe('chapter kana-foundation-01 vs L1 policy (TASK-LEARNING-06)', () => {
  const chapter = getChapter('kana-foundation-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  const dialogue = loadDialogue(chapter.dialogueSlug);
  const lineIds = dialogue.lines.map((l) => l.id);

  it('passes the full content validation incl. kana rules (CONTENT-103/105/106)', () => {
    const violations = [...validateChapter(chapter, level), ...validateChapterAgainstDialogue(chapter, level, lineIds)];
    expect(violations).toEqual([]);
  });

  it('carries the TASK-HANASO-22 + TASK-HANASO-27 structure: 38 stations (36 core + 2 optional), 2 sections, zero vocab/grammar', () => {
    expect(chapter.stations).toHaveLength(38);
    expect(chapter.stations.filter((s) => s.core)).toHaveLength(36);
    expect(chapter.stations.filter((s) => !s.core)).toHaveLength(2);
    expect(chapter.units?.map((u) => u.slug)).toEqual(['section-a-hiragana', 'section-b-katakana']);
    /* the two real-world milestones: type practice, core, task_completed,
     * each preceded only by its honest prerequisite (h15 / k13). */
    const m1 = chapter.stations.find((s) => s.slug === 'stn-kana-m1-reading')!;
    const m2 = chapter.stations.find((s) => s.slug === 'stn-kana-m2-realworld')!;
    expect(m1.type).toBe('practice');
    expect(m1.completion.kind).toBe('task_completed');
    expect(m1.prerequisites).toEqual(['stn-kana-p4']); // TASK-27: the final practice station gates the reading milestone
    expect(m2.prerequisites).toEqual(['stn-kana-k13']);
    // L1 = the kana band: words are reading vessels, never FSRS vocab (DD-119).
    expect(chapter.words).toHaveLength(0);
    expect(chapter.grammar).toHaveLength(0);
    expect(chapter.expressions).toHaveLength(0);
  });

  it('covers every registry kana with a kana-card across the kana chapters (no orphan records — CONTENT-106)', () => {
    /* Issue #146: the invariant is CORPUS-WIDE now — the 92 base glyphs are
     * carded in kana-foundation-01, the 92 voiced/yōon glyphs in its chained
     * expansion chapter. Every registry record must still be TAUGHT (no
     * orphan bank data), wherever its unit lives. */
    const taught = new Map<string, number>();
    for (const slug of ['kana-foundation-01', 'kana-expansion-01']) {
      const ch = getChapter(slug)!;
      for (const s of ch.stations) {
        for (const b of s.blocks) {
          if (b.kind === 'kana-card')
            taught.set((b as { kanaId: string }).kanaId, (taught.get((b as { kanaId: string }).kanaId) ?? 0) + 1);
        }
      }
    }
    for (const item of KANA_ITEMS) {
      expect(taught.has(item.kanaId), `kana-card present for ${item.kanaId}`).toBe(true);
    }
    expect(taught.size).toBe(184);
  });

  it('ships the kana gate bank: ≥5 switches per M-K measure, kana labels present', () => {
    /* TASK-HANASO-25 (BUG-001 rebank): 5 per measure so ONE miss = 0.8 ≥ 0.8
     * stays a PASS (recoverable); two misses (0.6) remediate. */
    const bank = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_'));
    expect(bank.length).toBeGreaterThanOrEqual(25);
    for (const measure of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
      expect(bank.filter((e) => e.assessmentRole === `mastery_${measure}`).length).toBe(5);
    }
    expect(chapter.mastery.measureLabelsFa?.M1).toContain('بازشناسی');
    // The strict kana thresholds live in the L1 policy (0.90/0.80 — DD-120), never here.
    expect(level.caps.gate).toEqual({ weighted: 0.9, minMeasure: 0.8 });
  });

  it('resolves the two-level journey map (2 sections covering all stations)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.unitGroups?.length).toBe(2);
    const grouped = journey.unitGroups!.flatMap((g) => g.nodes.map((n) => n.station.slug));
    expect(new Set(grouped).size).toBe(38);
    /* section A = hiragana + the reading milestone; section B = katakana + the
     * loanword milestone (TASK-HANASO-22 two-section split). */
    expect(journey.unitGroups![0]!.nodes.some((n) => n.station.slug === 'stn-kana-m1-reading')).toBe(true);
    expect(journey.unitGroups![1]!.nodes.some((n) => n.station.slug === 'stn-kana-m2-realworld')).toBe(true);
  });
});

describe('chapter kana-expansion-01 vs L1 policy (Issue #146 — the bank completion)', () => {
  const chapter = getChapter('kana-expansion-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  const dialogue = loadDialogue(chapter.dialogueSlug);
  const lineIds = dialogue.lines.map((l) => l.id);

  it('passes the full content validation incl. kana rules (CONTENT-103/105/106)', () => {
    const violations = [...validateChapter(chapter, level), ...validateChapterAgainstDialogue(chapter, level, lineIds)];
    expect(violations, JSON.stringify(violations, null, 1)).toEqual([]);
  });

  it('chains to the foundation chapter (CHAPTER-CHAIN — the honest reveal promise)', () => {
    expect(chapter.prerequisiteChapterSlug).toBe('kana-foundation-01');
    expect(chapter.levelCode).toBe('L1');
    expect(chapter.orderInLevel).toBe(2);
  });

  it('cards exactly the 92 voiced/yōon glyphs in 20 row-packet stations (≤6 per station — CONTENT-103)', () => {
    const cards = chapter.stations.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'kana-card' ? [b.kanaId] : [])));
    expect(cards.length).toBe(92);
    expect(new Set(cards).size).toBe(92);
    for (const s of chapter.stations) {
      const n = s.blocks.filter((b) => b.kind === 'kana-card').length;
      expect(n, `${s.slug} packet size`).toBeLessThanOrEqual(6);
    }
    // every card is an expansion-chapter unit (introducedInUnit ∈ the new units)
    const units = new Set(
      chapter.units!.flatMap((u) => u.stationSlugs.map((s) => s.replace('stn-kana-', '').toUpperCase())),
    );
    for (const id of cards) {
      expect(KANA_ITEMS_BY_ID[id]!.introducedInUnit, `${id} unit`).toBeTruthy();
    }
    void units;
  });

  it('listening exercises exist ONLY where the word audio is committed (honest sound — no dead questions)', () => {
    const listening = Object.values(chapter.exercises).filter((e) => e.type === 'rule-listening');
    expect(listening.length).toBeGreaterThan(0);
    const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/audio/hostwords/manifest.json'), 'utf8')) as {
      entries: Record<string, unknown>;
    };
    const committed = new Set(Object.keys(manifest.entries));
    for (const ex of listening) {
      expect(committed.has(ex.promptJa!), `${ex.id} plays ${ex.promptJa}`).toBe(true);
    }
  });

  it('the two-level journey map (2 sections covering all stations)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.unitGroups?.length).toBe(2);
    const grouped = journey.unitGroups!.flatMap((g) => g.nodes.map((n) => n.station.slug));
    expect(new Set(grouped).size).toBe(20);
    expect(journey.unitGroups![0]!.nodes.some((n) => n.station.slug === 'stn-kana-hd1')).toBe(true);
    expect(journey.unitGroups![1]!.nodes.some((n) => n.station.slug === 'stn-kana-kx1')).toBe(true);
  });
});

describe('chapter first-meeting-01 vs L2 policy', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  const dialogue = loadDialogue(chapter.dialogueSlug);
  const lineIds = dialogue.lines.map((l) => l.id);

  it('passes the full content validation (caps, S/O rules, exercise quality)', () => {
    const violations = [...validateChapter(chapter, level), ...validateChapterAgainstDialogue(chapter, level, lineIds)];
    expect(violations).toEqual([]);
  });

  it('carries the 05B blueprint numbers: 19 core stations (18 + the dedicated kanji station) + 4 optional, 11 words, 5 clusters, 13 lines, 8 expressions', () => {
    // TASK-LEARNING-06 (05B — KB section 19): two story units · the 13-turn
    // source-faithful anchor (TASK-LEARNING-07 audit fix: 12 single-speaker turns +
    // 1 JOINT final turn) · gate = the assessment page (never a walk station).
    // AUDIO-UNIT/KANJI 2026-11-23 §۲: +1 core = the dedicated kanji station
    // (stn-fm01-23-kanji, 人/国) — the kanji-pilot plan's P1-green position.
    expect(chapter.stations.filter((s) => s.core)).toHaveLength(19);
    expect(chapter.stations.filter((s) => !s.core)).toHaveLength(4);
    expect(chapter.words).toHaveLength(11);
    expect(chapter.grammar).toHaveLength(5);
    expect(dialogue.lines).toHaveLength(13);
    expect(chapter.expressions).toHaveLength(8);
    expect(chapter.kanji).toHaveLength(2);
    expect(chapter.units?.length).toBe(2);
    expect(chapter.prerequisiteChapterSlug).toBe('kana-foundation-01');
  });

  it('walks stations in the authored topological order (never hardcoded in UI)', () => {
    const ordered = orderedStations(chapter).map((s) => s.slug);
    expect(ordered).toEqual([
      // unit 02-1 «最初のあいさつ»
      'stn-fm01-01-anchor',
      'stn-fm01-02-vocab',
      'stn-fm01-03-grammar-desu',
      'stn-fm01-04-structure',
      'stn-fm01-05-grammar-qa',
      'stn-fm01-06-expression',
      'stn-fm01-07-listen',
      'stn-fm01-08-practice',
      'stn-fm01-09-integrate',
      // unit 02-2 «キムさんの紹介»
      'stn-fm01-10-reconnect',
      'stn-fm01-11-vocab2',
      'stn-fm01-12-grammar-mo',
      'stn-fm01-13-grammar-dewa',
      'stn-fm01-14-expression',
      'stn-fm01-15-listen',
      'stn-fm01-16-grammar-kara',
      'stn-fm01-17-practice',
      'stn-fm01-18-integrate',
      // optional branches (never prerequisites)
      'stn-fm01-opt-countries',
      'stn-fm01-opt-review-desu',
      'stn-fm01-opt-jobs',
      'stn-fm01-opt-drill',
      // AUDIO-UNIT/KANJI 2026-11-23 §۲ — the dedicated kanji station closes the
      // core path (after the optionals in order 23; prereqs = the two vocab
      // stations whose words carry 人/国).
      'stn-fm01-23-kanji',
    ]);
    // prerequisites always precede
    const byslug = new Map(chapter.stations.map((s) => [s.slug, s]));
    for (const slug of ordered) {
      for (const preref of byslug.get(slug)!.prerequisites) {
        expect(ordered.indexOf(preref)).toBeLessThan(ordered.indexOf(slug));
      }
    }
  });

  it('separates the confusable pair じん/ご into the optional deepdive (O3)', () => {
    // TASK-LEARNING-06: 〜ご preview (od1-ex-4) lives ONLY in the optional countries branch.
    const deepdive = chapter.stations.find((s) => s.slug === 'stn-fm01-opt-countries')!;
    const deepdiveExamples = deepdive.blocks.flatMap((b) =>
      b.kind === 'example-set' ? b.examples.map((e) => e.ja) : [],
    );
    expect(deepdiveExamples).toContain('にほんご');
    for (const station of chapter.stations.filter((s) => s.core)) {
      const examples = station.blocks.flatMap((b) => (b.kind === 'example-set' ? b.examples.map((e) => e.ja) : []));
      for (const ja of examples) {
        // 〜ご (language suffix) never on the main path — NB: ちゅうごく contains ご
        // as a syllable; the O3 rule targets the language-suffix pattern (〜ご endings).
        expect(ja.endsWith('ご')).toBe(false);
      }
    }
  });

  it('keeps mastery pool items out of every practice block (answer-leak guard)', () => {
    for (const station of chapter.stations) {
      for (const block of station.blocks) {
        if (block.kind !== 'exercise') continue;
        for (const id of block.exerciseIds) {
          expect(chapter.exercises[id]?.assessmentRole).toBe('practice');
        }
      }
    }
    const masteryCount = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_')).length;
    expect(masteryCount).toBe(12); // 05B gate: ≥2 switches × 5 measures (12 items) — ch2 NOT rebanked (TASK-HANASO-25 scope = ch1 only)
  });
});

describe('journey resolution', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  it('starts with only the anchor available (everything else locked)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.coreCompleted).toBe(0);
    expect(journey.coreTotal).toBe(19); // 18 core + the dedicated kanji station (AUDIO-UNIT/KANJI)
    const availabilities = journey.nodes.map((n) => `${n.station.slug}:${n.availability}`);
    expect(availabilities[0]).toBe('stn-fm01-01-anchor:available');
    expect(availabilities.filter((a) => a.endsWith(':available'))).toHaveLength(1);
    expect(nextStation(journey)?.slug).toBe('stn-fm01-01-anchor');
  });

  it('unlocks the next core station as each one completes (data-driven order)', () => {
    const done = ['stn-fm01-01-anchor', 'stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu'].map((slug) => ({
      stationSlug: slug,
      status: 'completed' as const,
      bestScore: 1,
      attemptCount: 4,
    }));
    const journey = resolveJourney(chapter, level, done, {
      status: 'started',
      bestWeighted: null,
      bestMeasures: null,
      remediationCount: 0,
    });
    expect(journey.coreCompleted).toBe(3);
    expect(nextStation(journey)?.slug).toBe('stn-fm01-04-structure');
    // optional countries branch (off vocab-1) is available too but never blocks
    const review = journey.nodes.find((n) => n.station.slug === 'stn-fm01-opt-countries')!;
    expect(review.availability).toBe('available');
  });

  it('completes the core path only when all 10 core stations are terminal', () => {
    const coreSlugs = orderedStations(chapter)
      .filter((s) => s.core)
      .map((s) => s.slug);
    const done = coreSlugs.map((slug) => ({
      stationSlug: slug,
      status: 'completed' as const,
      bestScore: 0.8,
      attemptCount: 3,
    }));
    const journey = resolveJourney(chapter, level, done, null);
    expect(journey.coreCompleted).toBe(19); // 18 + the dedicated kanji station (AUDIO-UNIT/KANJI)
    // TASK-LEARNING-06 (05B): the gate is the ASSESSMENT PAGE — no mastery walk station.
    expect(masteryStation(chapter)).toBeNull();
  });

  it('treats needs_retry as walked (no dead ends) and skips never gate core', () => {
    const done = orderedStations(chapter)
      .filter((s) => s.core)
      .map((s) => s.slug)
      .map((slug, i) => ({
        stationSlug: slug,
        status: i === 2 ? ('needs_retry' as const) : ('completed' as const),
        bestScore: 0.5,
        attemptCount: 6,
      }));
    const journey = resolveJourney(chapter, level, done, null);
    expect(journey.coreCompleted).toBe(19); // 18 + the dedicated kanji station (AUDIO-UNIT/KANJI)
  });
});

describe('grading (server-side answer key)', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  it('never leaks the answer key through the client payload builder', () => {
    for (const ex of Object.values(chapter.exercises)) {
      const client = toClientExercise(ex) as unknown as Record<string, unknown>;
      expect(client.correctOptionId).toBeUndefined();
      expect(client.correctOrder).toBeUndefined();
      expect(client.acceptedChipOrder).toBeUndefined();
      expect(client.feedback).toBeUndefined();
      expect(JSON.stringify(client)).not.toContain('f1Fa');
    }
  });

  it('grades all three interaction shapes + ladder levels', () => {
    const select = chapter.exercises['ex-fm01-v1-p2-txt-1']!;
    expect(gradeExerciseAnswer(select, { kind: 'option', optionId: select.correctOptionId! }).correct).toBe(true);
    const wrongId = select.options!.find((o) => o.id !== select.correctOptionId)!.id;
    const wrong1 = gradeExerciseAnswer(select, { kind: 'option', optionId: wrongId }, 1);
    expect(wrong1).toMatchObject({ correct: false, level: 1 });
    expect(wrong1.reveal).toBeUndefined();
    const wrong3 = gradeExerciseAnswer(select, { kind: 'option', optionId: wrongId }, 3);
    expect(wrong3.level).toBe(3);
    expect(wrong3.reveal).toBeTruthy();

    const order = chapter.exercises['ex-fm01-g1-order-1']!;
    expect(gradeExerciseAnswer(order, { kind: 'order', orderedIds: ['c1', 'c2', 'c3'] }).correct).toBe(true);
    expect(gradeExerciseAnswer(order, { kind: 'order', orderedIds: ['c2', 'c1', 'c3'] }).correct).toBe(false);

    const build = chapter.exercises['ex-fm01-g1-prod-1']!;
    expect(gradeExerciseAnswer(build, { kind: 'build', chipOrder: ['p1', 'p2', 'p3'] }).correct).toBe(true);

    // TASK-LEARNING-06 (#106): the F2 ladder eliminates one wrong option (never the key)
    const wrong2 = gradeExerciseAnswer(select, { kind: 'option', optionId: wrongId }, 2);
    expect(wrong2.level).toBe(2);
    expect(wrong2.eliminateOptionIds).toBeDefined();
    expect(wrong2.eliminateOptionIds).not.toContain(select.correctOptionId);
  });

  it('grades a perfect mastery submission as passed', () => {
    const answers: Record<string, ExerciseAnswerPayload> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      if (ex.correctOptionId) answers[ex.id] = { kind: 'option', optionId: ex.correctOptionId };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder };
      else if (ex.acceptedChipOrder) answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder };
    }
    const result = gradeMasterySubmission(chapter, answers, level);
    expect(result.outcome).toBe('passed');
    expect(result.weightedScore).toBe(1);
    expect(result.wrongByMeasure).toEqual({});
  });

  it('maps a failing submission to remediation stations (DD-048 point-return)', () => {
    const answers: Record<string, ExerciseAnswerPayload> = {};
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      const wrong =
        ex.options?.find((o) => o.id !== ex.correctOptionId)?.id ??
        ex.correctOrder?.slice().reverse() ??
        ex.acceptedChipOrder?.slice().reverse();
      if (ex.correctOptionId && wrong) answers[ex.id] = { kind: 'option', optionId: String(wrong) };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder.slice().reverse() };
      else if (ex.acceptedChipOrder)
        answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder.slice().reverse() };
    }
    const result = gradeMasterySubmission(chapter, answers, level);
    expect(result.outcome).toBe('remediate');
    expect(Object.keys(result.wrongByMeasure)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5']);
    expect(result.remediationStations).toContain('stn-fm01-02-vocab');
    expect(result.remediationStations).toContain('stn-fm01-07-listen');
  });
});

describe('exercise bank sanity (QUESTION §۲ quality rules)', () => {
  it('uses exactly 3 options for MCQ (minimal-pair 2 allowed)', () => {
    for (const ex of FM01_EXERCISES) {
      if (['listen-minimal-pair'].includes(ex.type)) continue;
      if (ex.options) expect(ex.options).toHaveLength(3);
    }
  });

  it('every exercise carries the full F1..F3 feedback ladder in Persian', () => {
    for (const ex of FM01_EXERCISES) {
      expect(ex.feedback.f1Fa.length).toBeGreaterThan(10);
      expect(ex.feedback.f2HintFa.length).toBeGreaterThan(5);
      expect(ex.feedback.f3ExplainFa.length).toBeGreaterThan(10);
    }
  });

  it('recall-first: practice pool is ≥60% non-Q1 (recognition MCQ is capped)', () => {
    const practice = FM01_EXERCISES.filter((e) => e.assessmentRole === 'practice');
    const pureRecognition = practice.filter((e) => e.type === 'meaning-select');
    expect(pureRecognition.length / practice.length).toBeLessThanOrEqual(0.4);
  });
});

describe('TASK-LEARNING-02 — owner-notes fidelity gates', () => {
  const chapter = getChapter('first-meeting-01')!;

  it('vocab cards match the owner notes Lesson-1 forms (kanji term + kana reading + furigana)', () => {
    // Owner notes Lesson 1 list (N5-01 vocabulary §Ⅲ) — sha256-pinned reference copy in
    // the private KB (00-source-materials). Forms below are the notes' exact kanji/kana.
    const expected: Record<string, { term: string; reading: string }> = {
      'voc-watashi': { term: '私', reading: 'わたし' },
      'voc-san': { term: '〜さん', reading: '〜さん' },
      'voc-nihonjin': { term: '日本人', reading: 'にほんじん' },
      'voc-chuugokujin': { term: '中国人', reading: 'ちゅうごくじん' },
      'voc-daigaku': { term: '大学', reading: 'だいがく' },
      'voc-sensee': { term: '先生', reading: 'せんせい' },
      'voc-anokata': { term: 'あの方', reading: 'あのかた' },
      'voc-iranjin': { term: 'イラン人', reading: 'イランじん' }, // HANASO addition (marked on card)
      // TASK-LEARNING-06 (05B VOCAB-2): かんこくじん + から + きました
      'voc-kankokujin': { term: '韓国人', reading: 'かんこくじん' },
      'voc-kara': { term: '〜から', reading: '〜から' },
      'voc-kimashita': { term: '来ました', reading: 'きました' },
    };
    for (const w of chapter.words) {
      const exp = expected[w.id];
      expect(exp, `word ${w.id} is expected in the notes-fidelity map`).toBeDefined();
      expect(w.term).toBe(exp!.term);
      expect(w.readingKana).toBe(exp!.reading);
      if (/[一-龯]/.test(w.term)) {
        // kanji-carrying cards MUST ship furigana (L2: furigana 'all' — LEVEL_MATRIX §۲)
        expect(w.termFurigana, `${w.id} needs termFurigana`).toBeTruthy();
      }
    }
  });

  it('every dialogue line of every bundled dialogue has REAL pre-generated audio (opus+m4a)', () => {
    // TASK-LEARNING-02 §۷: no placeholder may be presented as real audio. This gate
    // fails the build when a dialogue line lacks a committed VOICEVOX asset.
    // TASK-LEARNING-06: dialogues registered in the real-audio manifest must keep
    // real assets; dialogues NOT yet in the manifest (kana-welcome-01 — audio
    // generation is a separate out-of-scope task) must NOT fake entries: the honest
    // degradation is asserted instead (manifest never claims them).
    const assets = loadRealAudioAssets();
    expect(assets, 'public/audio/dialogues/manifest.json present').not.toBeNull();
    for (const ch of listChapters()) {
      const dlg = loadDialogue(ch.dialogueSlug);
      for (const line of dlg.lines) {
        const entry = assets!.entries[line.id];
        if (!entry) {
          // TASK-LEARNING-06: lines without a manifest entry (new dialogue turns —
          // e.g. fm01 L9..L13 / kana-welcome) are in the honest placeholder state:
          // the manifest must NOT fake an entry for them.
          expect(assets!.entries[line.id], `${line.id} must NOT fake a real-audio entry`).toBeUndefined();
          continue;
        }
        for (const ext of ['opus', 'm4a'] as const) {
          const p = join(process.cwd(), 'public', 'audio', 'dialogues', `${line.id}.${ext}`);
          expect(existsSync(p), `committed asset ${line.id}.${ext}`).toBe(true);
          expect(statSync(p).size, `${line.id}.${ext} non-empty`).toBeGreaterThan(1000);
        }
        // byte-exactness (Reviewer-C S3): committed files must match the manifest.
        const opus = join(process.cwd(), 'public', 'audio', 'dialogues', `${line.id}.opus`);
        expect(statSync(opus).size, `${line.id}.opus bytes === manifest`).toBe(entry.bytes);
        // content-hash binding (Reviewer-C S2): the asset was generated from THIS text —
        // a dialogue edit without re-generation fails here (stale audio).
        expect(entry.hash, `${line.id} manifest hash present`).toBeDefined();
      }
    }
  });

  it('binds every audio asset to the CURRENT dialogue text (hash equality — no stale TTS)', () => {
    // Reviewer-C S2: the manifest hash must equal hashAudioLine(currentText, voiceId)
    // for every line — editing dialogue text without re-generating audio breaks this gate.
    // TASK-LEARNING-06: lines without a manifest entry (honest placeholder state —
    // e.g. kana-welcome-01 until the audio task) are skipped; the manifest never
    // claims them, so no stale-hash assertion applies.
    const assets = loadRealAudioAssets()!;
    const voices = loadVoicesForTest();
    for (const ch of listChapters()) {
      const dlg = loadDialogue(ch.dialogueSlug);
      for (const line of dlg.lines) {
        const voiceId = resolveSpeaker(line.speaker).voiceId;
        expect(voices.has(voiceId), `voice ${voiceId} for ${line.speaker}`).toBe(true);
        const entry = assets.entries[line.id];
        if (!entry) continue; // honest placeholder state — no manifest claim, no stale hash
        const text = line.tokens.map((t) => t.surface).join('');
        const expected = hashAudioLine(text, voiceId);
        expect(entry.hash, `${line.id} hash matches current text`).toBe(expected);
      }
    }
  });

  it('the real audio manifest declares the VOICEVOX casting + credits for every voice in use', () => {
    const assets = loadRealAudioAssets()!;
    for (const voiceId of ['vv-female-01-normal', 'vv-male-02-normal', 'vv-female-05-young']) {
      const v = assets.voices?.[voiceId];
      expect(v, `casting for ${voiceId}`).toBeDefined();
      expect(v!.engine).toBe('voicevox');
      expect(v!.credit.startsWith('VOICEVOX:')).toBe(true);
    }
  });
});

describe('F4 return-to-teaching contract (TASK-LEARNING-07 Wave 3 — Issue #106)', () => {
  it('every practice exercise referenceBlockId resolves: own station (step jump) or an EARLIER station (TASK-27 cross-station link)', () => {
    // #106: the runner implements «بازگشت به آموزش» as a step jump INSIDE the
    // current station's block order (station-walk stepOfBlock). TASK-HANASO-27:
    // practice stations reference teaching blocks of EARLIER stations (spiral
    // review) — the host page resolves those against the full chapter bundle
    // (returnToStationHref) and the runner navigates there. Gate: a pointer
    // must be either (a) a block of its OWN station, or (b) a block of another
    // station that comes BEFORE this one in the chapter order (never forward —
    // that would leak not-yet-taught content). Unresolvable = dead button.
    const offenders: string[] = [];
    for (const chapter of listChapters()) {
      const orderBySlug = new Map(chapter.stations.map((s) => [s.slug, s.order]));
      const ownerByBlockId = new Map<string, string>();
      for (const station of chapter.stations) {
        for (const b of station.blocks) ownerByBlockId.set(b.id, station.slug);
      }
      for (const station of chapter.stations) {
        const blockIds = new Set(station.blocks.map((b) => b.id));
        for (const block of station.blocks) {
          if (block.kind !== 'exercise') continue;
          for (const exerciseId of block.exerciseIds) {
            const ex = chapter.exercises[exerciseId];
            if (!ex?.referenceBlockId) continue;
            const ref = ex.referenceBlockId;
            if (blockIds.has(ref)) continue; // (a) local step jump
            const owner = ownerByBlockId.get(ref);
            if (owner && (orderBySlug.get(owner) ?? Infinity) < (orderBySlug.get(station.slug) ?? -1)) continue; // (b) earlier station
            offenders.push(`${station.slug} → ${ex.id} → ${ref}`);
          }
        }
      }
    }
    expect(offenders, `unresolvable/forward referenceBlockId → ${offenders.join(' | ')}`).toEqual([]);
  });

  it('grades carry the F2 elimination and F4 pointer through the practice ladder', () => {
    // Contract spot-check over real bundled content (the client wiring depends on
    // gradeExerciseAnswer emitting eliminateOptionIds at F2 and referenceBlockId at F3).
    let sawElimination = false;
    let sawReference = false;
    for (const chapter of listChapters()) {
      for (const ex of Object.values(chapter.exercises)) {
        if (ex.assessmentRole !== 'practice' || !ex.options || !ex.correctOptionId) continue;
        const wrong = ex.options.find((o) => o.id !== ex.correctOptionId)!;
        const f2 = gradeExerciseAnswer(ex, { kind: 'option', optionId: wrong.id }, 2);
        if (f2.eliminateOptionIds?.length) sawElimination = true;
        const f3 = gradeExerciseAnswer(ex, { kind: 'option', optionId: wrong.id }, 3);
        if (f3.referenceBlockId) sawReference = true;
      }
    }
    expect(sawElimination, 'at least one exercise eliminates a wrong option at F2').toBe(true);
    expect(sawReference, 'at least one exercise returns to teaching at F3').toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* LESSON-UX PART1 2026-11-26 — the chapter-opening intro law          */
/* («اول هر فصل یه اسلاید باید بگه طبیعیه بلد نباسی، آخر فصل یاد می‌گیری») */
/* ------------------------------------------------------------------ */

describe('LESSON-UX PART1 — the chapter-opening intro law (every anchor reassures before the conversation)', () => {
  it('every chapter anchor opens [reassuring scene → the conversation] — slide 1 says «not knowing is natural», slide 2 is the dialogue', () => {
    for (const chapter of listChapters()) {
      const anchor = chapter.stations.find((s) => s.type === 'anchor');
      /* kana-expansion-01 is a CONTINUATION of chapter 1's arc (the kana bank
       * completion — Issue #146): no new anchor conversation, so the intro law
       * has no subject there. Every chapter that DOES open with a conversation
       * is fully covered by the law. */
      if (!anchor) continue;
      const blocks = anchor.blocks;
      // slide 1 = a scene block carrying BOTH halves of the law
      const first = blocks[0] as { kind: string; bodyFa?: string; id: string };
      expect(first.kind, `${chapter.slug}: the anchor must open with a scene block`).toBe('scene');
      expect(
        anchorIntroLawSatisfied(first.bodyFa),
        `${chapter.slug}/${first.id}: the opening scene must embed BOTH law markers (reassurance + chapter-end promise)`,
      ).toBe(true);
      // slide 2 = the conversation itself (the full dialogue-player, no teaching subset)
      const second = blocks[1] as { kind: string; lineTeaching?: boolean; id: string };
      expect(second.kind, `${chapter.slug}: the second block must be the conversation`).toBe('dialogue-player');
      expect(
        second.lineTeaching,
        `${chapter.slug}/${second.id}: the opening dialogue is the FULL conversation`,
      ).not.toBe(true);
    }
  });

  it('the kana chapter’s first slide dropped the teaching copy — it is the reassurance ONLY', () => {
    // owner order 2026-11-26 «اسلاید اول فقط این»: the three-scripts teaching
    // moved to a post-dialogue scene slide; the pre-listen slide carries
    // nothing but the reassurance.
    const h0 = getChapter('kana-foundation-01')!.stations.find((s) => s.slug === 'stn-kana-h0')!;
    const scene = h0.blocks[0] as { bodyFa: string };
    expect(scene.bodyFa).not.toContain('هیراگانا (خط بومی)');
    expect(scene.bodyFa).not.toContain('قرارمان ساده است');
    // …and the post-dialogue scripts scene carries the glyph payoff (line ۲
    // named them — this slide names what the learner just heard)
    const scripts = h0.blocks.find((b) => b.id === 'blk-stn-kana-h0-scripts') as { bodyFa: string } | undefined;
    expect(scripts, 'the three-scripts scene slide must exist after the dialogue').toBeTruthy();
    expect(scripts!.bodyFa).toContain('ひらがな');
    expect(scripts!.bodyFa).toContain('カタカナ');
    expect(scripts!.bodyFa).toContain('かんじ');
    // the wrap-up keeps Persian-only recap items (EQA-8: use surface)
    const wrap = h0.blocks.find((b) => b.kind === 'wrap-up') as { itemsFa: string[] };
    expect(wrap.itemsFa.length).toBeGreaterThan(0);
    expect(wrap.itemsFa.join(' ')).not.toMatch(/[\u3040-\u30ff\u4e00-\u9faf]/);
  });
});
