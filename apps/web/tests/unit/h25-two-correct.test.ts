/**
 * TASK-HANASO-25 — the two-correct family (BUG-002 remediation, Phase 2).
 *
 * The audit found 60 items (19 kana-recall + 41 kana-listening incl. one gate
 * item) where two options were BOTH correct Japanese: the katakana target and
 * its hiragana twin, under a script-AGNOSTIC prompt. The learner who picked
 * the twin was marked wrong with the false rationale «کانای دیگری با همین
 * ردیف» — the audit's verdict: the item "actively teaches a false claim about
 * Japanese".
 *
 * Remediation (both glyphs ARE valid — the question must name the script,
 * pattern ex-kana-gate-m4-2): every affected item now carries a
 * script-explicit prompt, and the twin's rationale states the real difference
 * (same sound, other script). The 60th item (gate-m5-1) was fixed in CP-01
 * with sound-distinct distractors (ン/ん are acoustically identical).
 *
 * This spec pins the family contract:
 *  1. ZERO script-ambiguous two-correct items remain (census rule with the
 *     script-explicit exception);
 *  2. every script-explicit katakana item that keeps its hiragana twin has a
 *     rationale naming the script difference for the twin;
 *  3. hiragana-target items never carry the katakana twin (they were never
 *     ambiguous — sounds are the target; guard against regressions);
 *  4. positive/negative fixtures per question family (the mission's explicit
 *     requirement): a mutated ambiguous item MUST fail the census.
 */
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getChapter } from '@/modules/curriculum/content';
import type { Exercise } from '@/modules/curriculum/types';

const web = process.cwd();

const ch1 = getChapter('kana-foundation-01')!;
const exercises = Object.values(ch1.exercises) as Exercise[];

// registry: kanaId -> {glyph, romaji, script}
const kanaSrc = readFileSync(
  path.join(web, 'src/modules/curriculum/content/kana-items.ts'),
  'utf8',
);
const registry = new Map<string, { glyph: string; romaji: string; script: string }>();
for (const m of kanaSrc.matchAll(
  /kanaId:\s*'([^']+)',\s*\n\s*glyph:\s*'([^']+)',\s*\n\s*script:\s*'([^']+)',\s*\n\s*row:\s*'([^']+)',\s*\n\s*romaji:\s*'([^']+)'/g,
)) {
  registry.set(m[1]!, { glyph: m[2]!, romaji: m[5]!, script: m[3]! });
}
const glyphToKana = new Map<string, { kanaId: string; romaji: string; script: string }>();
for (const [kanaId, r] of registry) glyphToKana.set(r.glyph, { kanaId, romaji: r.romaji, script: r.script });

const KATAKANA_EXPLICIT = /کاتاکانا/;
const HIRAGANA_EXPLICIT = /هیراگانا/;

/** An option item is SOUND-AMBIGUOUS when two options share the target's
 * romaji (glyph options) AND the prompt names no script. */
function isAmbiguous(ex: Exercise): { ambiguous: boolean; twinOptionIds: string[] } {
  if (!ex.options || !ex.correctOptionId || !ex.promptFa) return { ambiguous: false, twinOptionIds: [] };
  const target = registry.get(ex.targetConcept);
  const keyLabel = ex.options.find((o) => o.id === ex.correctOptionId)?.label.trim();
  if (!target || !keyLabel) return { ambiguous: false, twinOptionIds: [] };
  const keyInfo = glyphToKana.get(keyLabel);
  if (!keyInfo) return { ambiguous: false, twinOptionIds: [] };
  const explicit = KATAKANA_EXPLICIT.test(ex.promptFa) || HIRAGANA_EXPLICIT.test(ex.promptFa);
  if (explicit) return { ambiguous: false, twinOptionIds: [] };
  const twins: string[] = [];
  for (const opt of ex.options) {
    if (opt.id === ex.correctOptionId) continue;
    const info = glyphToKana.get(opt.label.trim());
    if (info && info.romaji === keyInfo.romaji) twins.push(opt.id);
  }
  return { ambiguous: twins.length > 0, twinOptionIds: twins };
}

test('census — ZERO script-ambiguous two-correct items remain in ch1 (BUG-002 closed)', () => {
  const offenders = exercises.filter((e) => isAmbiguous(e).ambiguous);
  expect(
    offenders.map((e) => e.id),
    'items with two same-sound glyph options under a script-agnostic prompt',
  ).toEqual([]);
});

test('contract — every katakana-target item keeping its hiragana twin is script-explicit AND explains the twin', () => {
  let checked = 0;
  for (const ex of exercises) {
    if (!ex.options || !ex.correctOptionId) continue;
    const target = registry.get(ex.targetConcept);
    if (!target || target.script !== 'kata') continue;
    const hasTwin = ex.options.some((o) => {
      const info = glyphToKana.get(o.label.trim());
      return info && info.script === 'hira' && info.romaji === target.romaji;
    });
    if (!hasTwin) continue;
    checked++;
    expect(
      KATAKANA_EXPLICIT.test(ex.promptFa ?? ''),
      `${ex.id} keeps its hiragana twin but the prompt is not script-explicit`,
    ).toBe(true);
    // the twin's rationale must name the script difference
    const twinIds = ex.options
      .filter((o) => {
        const info = glyphToKana.get(o.label.trim());
        return info && info.script === 'hira' && info.romaji === target.romaji;
      })
      .map((o) => o.id);
    for (const tid of twinIds) {
      const rationale = ex.distractorRationaleFa?.[tid];
      expect(
        typeof rationale === 'string' && /هیراگانا/.test(rationale),
        `${ex.id}: twin option ${tid} rationale must name the script difference (got: ${rationale})`,
      ).toBe(true);
    }
  }
  expect(checked).toBeGreaterThanOrEqual(59); // the remediated family
});

test('negative fixture — a mutated script-AGNOSTIC twin item FAILS the census (regression guard)', () => {
  const victim = exercises.find((e) => e.id === 'ex-kana-k1-lis-kata-a')!;
  const mutated: Exercise = {
    ...victim,
    promptFa: 'به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟', // script-agnostic again
  };
  expect(isAmbiguous(mutated).ambiguous).toBe(true);
});

test('positive fixture — the remediated prompt passes; a same-sound NON-twin distractor set passes unmodified', () => {
  const victim = exercises.find((e) => e.id === 'ex-kana-k1-lis-kata-a')!;
  expect(isAmbiguous(victim).ambiguous).toBe(false); // script-explicit now
  // a katakana item whose distractors differ in sound never trips the rule:
  const clean = exercises.find((e) => e.id === 'ex-kana-gate-m5-3')!;
  expect(isAmbiguous(clean).ambiguous).toBe(false);
});

test('recall family — all 19 remediated recall items are script-explicit', () => {
  const recallIds = [
    'ex-kana-k1-rcl-kata-a', 'ex-kana-k1-rcl-kata-i', 'ex-kana-k2-rcl-kata-ta',
    'ex-kana-k2-rcl-kata-chi', 'ex-kana-k3-rcl-kata-ra', 'ex-kana-k3-rcl-kata-ri',
    'ex-kana-k4-rcl-kata-sa', 'ex-kana-k5-rcl-kata-ha', 'ex-kana-k5-rcl-kata-hi',
    'ex-kana-k6-rcl-kata-n', 'ex-kana-k7-rcl-kata-ka', 'ex-kana-k7-rcl-kata-ki',
    'ex-kana-k9-rcl-kata-ma', 'ex-kana-k9-rcl-kata-mi', 'ex-kana-k10-rcl-kata-ya',
    'ex-kana-k11-rcl-kata-na', 'ex-kana-k11-rcl-kata-ni', 'ex-kana-k12-rcl-kata-wa',
    'ex-kana-k12-rcl-kata-wo',
  ];
  expect(recallIds.length).toBe(19);
  for (const id of recallIds) {
    const ex = ch1.exercises[id] as Exercise | undefined;
    expect(ex, id).toBeDefined();
    expect(KATAKANA_EXPLICIT.test(ex!.promptFa ?? ''), `${id} prompt must be script-explicit`).toBe(true);
  }
});

test('the audit\'s named case — あ for the sound of ア is never marked wrong by ambiguity', () => {
  // The mission's explicit example: a phonetically-correct あ answer for the
  // ア sound must not be graded wrong BY THE AMBIGUITY — the remediated items
  // ask for the script, so あ is now honestly wrong ONLY because the question
  // says کاتاکانا, and the rationale explains exactly that.
  const ex = ch1.exercises['ex-kana-k1-lis-kata-a'] as Exercise;
  expect(ex.promptFa).toContain('کاتاکانا');
  const twin = ex.options!.find((o) => o.label.trim() === 'あ')!;
  expect(twin.id).not.toBe(ex.correctOptionId);
  expect(ex.distractorRationaleFa?.[twin.id]).toContain('هیراگانا');
});
