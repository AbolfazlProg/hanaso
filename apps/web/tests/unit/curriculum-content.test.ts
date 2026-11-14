/**
 * HANASO — Chapter content validation tests (TASK-LEARNING-01).
 *
 * Fail-first rule: these tests encode the KB design contracts (island S/O rules,
 * L2 caps, QUESTION quality rules) over the BUNDLED chapter data — a content edit
 * that violates the blueprint breaks the build here, not in review.
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { validateChapter, validateChapterAgainstDialogue } from '@/modules/curriculum/validation';
import { orderedStations, resolveJourney, nextStation, masteryStation } from '@/modules/curriculum/journey';
import { gradeMasterySubmission, gradeExerciseAnswer, toClientExercise } from '@/modules/curriculum/grading';
import type { ExerciseAnswerPayload } from '@/modules/curriculum/grading';
import { loadDialogue } from '@/modules/dialogue/server';
import { FM01_EXERCISES } from '@/modules/curriculum/content/chapter-fm01.exercises';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { loadRealAudioAssets, loadVoices as loadVoicesForTest } from '@/modules/audio/audio-manifest';
import { hashAudioLine } from '@/modules/dialogue/content/loader';
import { resolveSpeaker } from '@/modules/character/registry';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('bundled chapters', () => {
  it('ships the kana foundation chapter then the first conversation chapter', () => {
    // TASK-LEARNING-06: chapter 01 (kana, L1) precedes the conversation chapter (L2).
    expect(listChapters().map((c) => c.slug)).toEqual(['kana-foundation-01', 'first-meeting-01']);
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

  it('carries the 05A blueprint numbers: 31 stations (29 core + 2 optional), 4 islands, zero vocab/grammar', () => {
    expect(chapter.stations).toHaveLength(31);
    expect(chapter.stations.filter((s) => s.core)).toHaveLength(29);
    expect(chapter.stations.filter((s) => !s.core)).toHaveLength(2);
    expect(chapter.units?.map((u) => u.slug)).toEqual([
      'island-1-hira-voice',
      'island-2-hira-complete',
      'island-3-kata-loanwords',
      'island-4-two-scripts',
    ]);
    // L1 = the kana band: words are reading vessels, never FSRS vocab (DD-119).
    expect(chapter.words).toHaveLength(0);
    expect(chapter.grammar).toHaveLength(0);
    expect(chapter.expressions).toHaveLength(0);
  });

  it('covers every registry kana with a kana-card (no orphan records — CONTENT-106)', () => {
    const cardIds = new Set(
      chapter.stations.flatMap((s) => s.blocks.flatMap((b) => (b.kind === 'kana-card' ? [b.kanaId] : []))),
    );
    for (const item of KANA_ITEMS) {
      expect(cardIds.has(item.kanaId), `kana-card present for ${item.kanaId}`).toBe(true);
    }
    expect(cardIds.size).toBe(92);
  });

  it('ships the kana gate bank: ≥2 switches per M-K measure, kana labels present', () => {
    const bank = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_'));
    expect(bank.length).toBeGreaterThanOrEqual(10);
    for (const measure of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
      expect(bank.filter((e) => e.assessmentRole === `mastery_${measure}`).length).toBeGreaterThanOrEqual(2);
    }
    expect(chapter.mastery.measureLabelsFa?.M1).toContain('بازشناسی');
    // The strict kana thresholds live in the L1 policy (0.90/0.80 — DD-120), never here.
    expect(level.caps.gate).toEqual({ weighted: 0.9, minMeasure: 0.8 });
  });

  it('resolves the two-level journey map (4 island groups covering all stations)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.unitGroups?.length).toBe(4);
    const grouped = journey.unitGroups!.flatMap((g) => g.nodes.map((n) => n.station.slug));
    expect(new Set(grouped).size).toBe(31);
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

  it('carries the 05B blueprint numbers: 18 core stations + 4 optional, 11 words, 5 clusters, 13 lines, 8 expressions', () => {
    // TASK-LEARNING-06 (05B — KB section 19): two story units · the 13-turn
    // source-faithful anchor (TASK-LEARNING-07 audit fix: 12 single-speaker turns +
    // 1 JOINT final turn) · gate = the assessment page (never a walk station).
    expect(chapter.stations.filter((s) => s.core)).toHaveLength(18);
    expect(chapter.stations.filter((s) => !s.core)).toHaveLength(4);
    expect(chapter.words).toHaveLength(11);
    expect(chapter.grammar).toHaveLength(5);
    expect(dialogue.lines).toHaveLength(13);
    expect(chapter.expressions).toHaveLength(8);
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
    expect(masteryCount).toBe(12); // 05B gate: ≥2 switches × 5 measures (12 items)
  });
});

describe('journey resolution', () => {
  const chapter = getChapter('first-meeting-01')!;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  it('starts with only the anchor available (everything else locked)', () => {
    const journey = resolveJourney(chapter, level, [], null);
    expect(journey.coreCompleted).toBe(0);
    expect(journey.coreTotal).toBe(18);
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
    expect(journey.coreCompleted).toBe(18);
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
    expect(journey.coreCompleted).toBe(18);
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
    for (const voiceId of ['vv-female-01-normal', 'vv-male-02-normal', 'vv-neutral-03-normal']) {
      const v = assets.voices?.[voiceId];
      expect(v, `casting for ${voiceId}`).toBeDefined();
      expect(v!.engine).toBe('voicevox');
      expect(v!.credit.startsWith('VOICEVOX:')).toBe(true);
    }
  });
});

describe('F4 return-to-teaching contract (TASK-LEARNING-07 Wave 3 — Issue #106)', () => {
  it('every practice exercise referenceBlockId resolves to a block in its OWN station', () => {
    // The runner implements «بازگشت به آموزش» as a step jump INSIDE the current
    // station's block order (station-walk stepOfBlock). A referenceBlockId pointing
    // outside its own station would render a dead button — content must keep the
    // F4 pointer local (validated for every bundled chapter).
    const offenders: string[] = [];
    for (const chapter of listChapters()) {
      for (const station of chapter.stations) {
        const blockIds = new Set(station.blocks.map((b) => b.id));
        for (const block of station.blocks) {
          if (block.kind !== 'exercise') continue;
          for (const exerciseId of block.exerciseIds) {
            const ex = chapter.exercises[exerciseId];
            if (!ex?.referenceBlockId) continue;
            if (!blockIds.has(ex.referenceBlockId)) {
              offenders.push(`${station.slug} → ${ex.id} → ${ex.referenceBlockId}`);
            }
          }
        }
      }
    }
    expect(offenders, `non-local referenceBlockId → ${offenders.join(' | ')}`).toEqual([]);
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
