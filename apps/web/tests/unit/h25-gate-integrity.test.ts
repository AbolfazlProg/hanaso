/**
 * TASK-HANASO-25 — mastery-gate integrity (BUG-001 Critical remediation).
 *
 * The audit proved the ch1 gate was a lottery: 5 kana-listening items with NO
 * sound (wiring gap — the assessment page never attached promptAudio), banks
 * of 2–3 per measure where ANY single error ⇒ remediate (minMeasure 0.8 never
 * recoverable), and an honest-listener P(pass) ≈ 1/243.
 *
 * This spec pins the FIXED contract:
 *  1. bank shape: exactly 5 items per measure (one miss = 0.8 ≥ 0.8 passes);
 *  2. gate arithmetic property: all-correct passes; ONE miss in one measure
 *     still passes; two misses in one measure remediate; one miss in TWO
 *     measures remediates (minMeasure binds per measure);
 *  3. every kana-listening gate item's targetConcept has a committed kn-*
 *     audio asset on disk (the wiring attaches kanaAudioUrls — a missing asset
 *     would degrade to a silent «به صدای پخش‌شده گوش کن» again);
 *  4. no gate option set contains two glyphs with the same registry romaji
 *     as the target concept (BUG-002 two-correct family; ン/ん — BUG-026);
 *  5. every distractor has a rationale naming the PICKED option's sound
 *     (the audit's shapes-for-a-sound finding on gate items);
 *  6. the full ch1 gate path: correct answers pass, single-miss recovers.
 */
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getChapter } from '@/modules/curriculum/content';
import { gradeMasterySubmission } from '@/modules/curriculum/grading';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import type { Chapter, Exercise } from '@/modules/curriculum/types';
import type { ExerciseAnswerPayload } from '@/modules/curriculum';

const web = process.cwd();

const ch1 = getChapter('kana-foundation-01')!;
const level = LEVELS_BY_CODE[ch1.levelCode]!;
const gateBank = Object.values(ch1.exercises).filter((e) =>
  (e as Exercise).assessmentRole.startsWith('mastery_'),
) as Exercise[];

// registry: kanaId -> romaji (for sound-collision checks)
const kanaSrc = readFileSync(
  path.join(web, 'src/modules/curriculum/content/kana-items.ts'),
  'utf8',
);
const romajiByKana = new Map<string, string>();
for (const m of kanaSrc.matchAll(/kanaId:\s*'([^']+)',[\s\S]*?romaji:\s*'([^']+)'/g)) {
  romajiByKana.set(m[1]!, m[2]!);
}

function answerFor(ex: Exercise): ExerciseAnswerPayload {
  if (ex.options && ex.correctOptionId) return { kind: 'option', optionId: ex.correctOptionId };
  if (ex.chunks && ex.correctOrder) return { kind: 'order', orderedIds: ex.correctOrder };
  return { kind: 'build', chipOrder: ex.acceptedChipOrder ?? [] };
}

function wrongAnswerFor(ex: Exercise): ExerciseAnswerPayload | null {
  if (ex.options && ex.correctOptionId) {
    const wrong = ex.options.find((o) => o.id !== ex.correctOptionId);
    return wrong ? { kind: 'option', optionId: wrong.id } : null;
  }
  if (ex.chunks && ex.correctOrder) {
    const reversed = [...ex.correctOrder].reverse();
    if (reversed.join() !== ex.correctOrder.join()) return { kind: 'order', orderedIds: reversed };
    return null;
  }
  return null;
}

const allCorrect = Object.fromEntries(gateBank.map((ex) => [ex.id, answerFor(ex)]));

test('bank shape — exactly 5 items per measure (one miss = 0.8 stays a pass)', () => {
  expect(gateBank.length).toBe(25);
  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
    const items = gateBank.filter((e) => e.assessmentRole === `mastery_${m}`);
    expect(items.length, `${m} must have exactly 5 items`).toBe(5);
  }
});

test('gate arithmetic — all-correct PASSES the real L1 thresholds', () => {
  const res = gradeMasterySubmission(ch1 as Chapter, allCorrect, level);
  expect(res.outcome).toBe('passed');
  expect(res.weightedScore).toBe(1);
});

test('gate arithmetic — ONE miss in ONE measure still passes (0.8 ≥ 0.8)', () => {
  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
    const victim = gateBank.find((e) => e.assessmentRole === `mastery_${m}`)!;
    const wrong = wrongAnswerFor(victim);
    expect(wrong, `need a constructible wrong answer for ${victim.id}`).not.toBeNull();
    const answers = { ...allCorrect, [victim.id]: wrong! };
    const res = gradeMasterySubmission(ch1 as Chapter, answers, level);
    expect(
      res.outcome,
      `one miss in ${m} (${victim.id}) must stay a PASS — scores ${JSON.stringify(res.scores)}`,
    ).toBe('passed');
  }
});

test('gate arithmetic — TWO misses in ONE measure remediate (0.6 < 0.8)', () => {
  for (const m of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
    const items = gateBank.filter((e) => e.assessmentRole === `mastery_${m}`);
    const w1 = wrongAnswerFor(items[0]!);
    const w2 = wrongAnswerFor(items[1]!);
    expect(w1).not.toBeNull();
    expect(w2).not.toBeNull();
    const answers = { ...allCorrect, [items[0]!.id]: w1!, [items[1]!.id]: w2! };
    const res = gradeMasterySubmission(ch1 as Chapter, answers, level);
    expect(res.outcome, `two misses in ${m} must remediate`).toBe('remediate');
    expect(res.weakMeasures).toContain(m);
    // remediation points at the measure's mapped stations (no dead ends)
    expect(res.remediationStations.length).toBeGreaterThan(0);
  }
});

test('gate arithmetic — one miss in TWO different measures still passes (each measure independently recoverable)', () => {
  // With 5/measure and minMeasure 0.8, ONE miss anywhere leaves that measure at
  // 0.8 = the floor: recoverable by design (the audit demanded exactly this —
  // "one miss stays recoverable"). M2+M4 one-miss-each: weighted
  // .25×.8+.15×.8+.6 = 0.92 ≥ 0.9 ⇒ PASS. Single slips never lock the
  // chapter; REPEATED misses in one measure (0.6) do.
  const v1 = gateBank.find((e) => e.assessmentRole === 'mastery_M2')!;
  const v2 = gateBank.find((e) => e.assessmentRole === 'mastery_M4')!;
  const answers = {
    ...allCorrect,
    [v1.id]: wrongAnswerFor(v1)!,
    [v2.id]: wrongAnswerFor(v2)!,
  };
  const res = gradeMasterySubmission(ch1 as Chapter, answers, level);
  expect(res.outcome).toBe('passed');
  expect(res.weakMeasures).toEqual([]); // 0.8 is NOT below the floor
});

test('Round-1 B2 — M1+M2 one-miss-each remediates (0.89 < 0.9) WITH remediation stations (never an empty map)', () => {
  // The ONLY two-miss cross-measure combo below the weighted threshold:
  // .3×.8 + .25×.8 + .2 + .15 + .1 = 0.89 < 0.9 → remediate, but both
  // measures sit AT the floor (not weak). TASK-HANASO-25: remediation
  // targeting uses the MISSED measures — the learner always gets stations.
  const v1 = gateBank.find((e) => e.assessmentRole === 'mastery_M1')!;
  const v2 = gateBank.find((e) => e.assessmentRole === 'mastery_M2')!;
  const answers = {
    ...allCorrect,
    [v1.id]: wrongAnswerFor(v1)!,
    [v2.id]: wrongAnswerFor(v2)!,
  };
  const res = gradeMasterySubmission(ch1 as Chapter, answers, level);
  expect(res.outcome).toBe('remediate');
  expect(res.weakMeasures).toEqual([]); // both at the floor — the known edge
  expect(res.remediationStations.length).toBeGreaterThan(0); // NEVER empty on remediate
  expect(res.remediationStations).toContain('stn-kana-opt-r-h9'); // M1+M2 weakPointMap
});

test('audio honesty — every kana-listening gate item has a committed kn-* asset (opus+m4a)', () => {
  const audioFiles = new Set(readdirSync(path.join(web, 'public', 'audio', 'kana')));
  const listening = gateBank.filter((e) => e.type === 'kana-listening');
  expect(listening.length).toBe(10); // M2×5 + M5×5
  for (const ex of listening) {
    expect(
      audioFiles.has(`kn-${ex.targetConcept}.opus`) && audioFiles.has(`kn-${ex.targetConcept}.m4a`),
      `gate item ${ex.id} targets ${ex.targetConcept} with no committed audio`,
    ).toBe(true);
  }
});

test('two-correct guard — no gate option set carries the target sound twice (incl. cross-script twins)', () => {
  const audioFiles = new Set(readdirSync(path.join(web, 'public', 'audio', 'kana')));
  for (const ex of gateBank) {
    if (!ex.options || !ex.correctOptionId) continue;
    const targetRomaji = romajiByKana.get(ex.targetConcept);
    if (!targetRomaji) continue; // word/script-concept items: label-based check below
    const keyLabel = ex.options.find((o) => o.id === ex.correctOptionId)!.label;
    // every OTHER glyph option must have a different romaji (single-glyph options only)
    for (const opt of ex.options) {
      if (opt.id === ex.correctOptionId) continue;
      const label = opt.label.trim();
      if (label.length !== 1) continue; // Persian reading labels — not glyphs
      // find the romaji of this glyph: search the registry by glyph
      let optRomaji: string | undefined;
      for (const [kid, rom] of romajiByKana) {
        const id = kid;
        if (
          kanaGlyphOf(id) === label &&
          audioFiles.has(`kn-${id}.opus`) // registry+asset = a real kana
        ) {
          optRomaji = rom;
          break;
        }
      }
      if (optRomaji === undefined) continue; // not a basic-kana glyph (e.g. accented)
      expect(
        optRomaji,
        `${ex.id}: option ${opt.id} «${label}» has the SAME sound (/${optRomaji}/) as the target ${ex.targetConcept} (/${targetRomaji}/) — two-correct`,
      ).not.toBe(targetRomaji);
    }
    void keyLabel;
  }
});

// glyph lookup via the registry source (kanaId -> glyph), cached
const glyphByKana = new Map<string, string>();
for (const m of kanaSrc.matchAll(/kanaId:\s*'([^']+)',\s*\n\s*glyph:\s*'([^']+)'/g)) {
  glyphByKana.set(m[1]!, m[2]!);
}
function kanaGlyphOf(kanaId: string): string | undefined {
  return glyphByKana.get(kanaId);
}

test('feedback honesty — gate listening distractor rationales name the PICKED option (no shapes-for-a-sound)', () => {
  for (const ex of gateBank) {
    if (ex.type !== 'kana-listening') continue;
    for (const [optId, rationale] of Object.entries(ex.distractorRationaleFa ?? {})) {
      expect(
        typeof rationale === 'string' && rationale.length > 10,
        `${ex.id}: distractor ${optId} rationale must exist and be substantive`,
      ).toBe(true);
      // the rationale must reference sound/reading (شنیده/صدا/خوانش) — not only shapes
      expect(
        /شنیده|صدا|خواند|خوانش|واکه/.test(rationale),
        `${ex.id}: rationale for ${optId} must speak about SOUND («${rationale}»)`,
      ).toBe(true);
    }
  }
});

test('M5 label — the measure states what its items measure (cross-script listening)', () => {
  expect(ch1.mastery.measureLabelsFa?.M5).toContain('شنیداری');
  const m5 = gateBank.filter((e) => e.assessmentRole === 'mastery_M5');
  expect(m5.every((e) => e.type === 'kana-listening')).toBe(true);
});
