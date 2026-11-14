/**
 * TASK-HANASO-25 — feedback-quality gates (Phase 3 / BUG-020 + BUG-029 + the
 * 172/173 listening-rationale finding).
 *
 * Pins three contracts over the WHOLE ch1 bank:
 *  1. recall f1Fa never carries the doubled template tail; recall f2 always
 *     names a concrete anchor (the confusable glyph or the standalone-nasal
 *     fact) — no more «روی همین خط از ردیفِ…» cryptic rows;
 *  2. every kana-listening item's distractor rationale names the PICKED
 *     option's sound and the heard sound (shapes-for-a-sound is gone);
 *  3. recognition F1/F2 never contain the CORRECT option's reading label
 *     (the first-miss answer leak — 120 items at audit; k13-disc script
 *     items legitimately describe both scripts: their options are script
 *     names, not readings — excluded by keying on the reading label).
 */
import { test, expect } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import type { Exercise } from '@/modules/curriculum/types';

const ch1 = getChapter('kana-foundation-01')!;
const exercises = Object.values(ch1.exercises) as Exercise[];

test('recall feedback — no doubled tails, no cryptic row hints (BUG-020)', () => {
  const recalls = exercises.filter((e) => e.type === 'kana-recall');
  expect(recalls.length).toBe(92);
  for (const ex of recalls) {
    expect(
      ex.feedback.f1Fa.includes('— به شکل درست نگاه کن. — به شکل درست نگاه کن.'),
      `${ex.id}: f1Fa still carries the doubled tail`,
    ).toBe(false);
    expect(
      ex.feedback.f2HintFa.includes('روی همین خط از ردیفِ'),
      `${ex.id}: f2HintFa still the cryptic row hint`,
    ).toBe(false);
    // the f2 must carry a concrete anchor: a named confusable, the nasal fact,
    // a mnemonic — OR (TASK-26) a concrete shape description that lets the
    // learner compare strokes without any not-yet-taught glyph (CL-13-legal)
    const anchored =
      /قاطی نکن|هجا نیست|یادسپار/.test(ex.feedback.f2HintFa) ||
      /[ぁ-ゖ゠-ヿ]/.test(ex.feedback.f2HintFa) ||
      /خط|قوس|حلقه|ضربه|نقطه|دُم|مورب|افقی|عمودی/.test(ex.feedback.f2HintFa);
    expect(anchored, `${ex.id}: f2 must name a concrete anchor (got: ${ex.feedback.f2HintFa})`).toBe(true);
  }
});

test('recall feedback — ん items teach the standalone-nasal fact (the audit\'s no-row case)', () => {
  for (const ex of exercises) {
    if (ex.type !== 'kana-recall') continue;
    if (ex.targetConcept === 'hira-n' || ex.targetConcept === 'kata-n') {
      expect(ex.feedback.f2HintFa).toContain('هجا نیست');
    }
  }
});

test('listening rationales — every option\'s rationale names sounds, not shapes (the 172/173 finding)', () => {
  const listening = exercises.filter((e) => e.type === 'kana-listening');
  expect(listening.length).toBeGreaterThanOrEqual(170);
  for (const ex of listening) {
    for (const [optId, rationale] of Object.entries(ex.distractorRationaleFa ?? {})) {
      expect(
        typeof rationale === 'string' && /شنیده‌شده|صدای|همان صدا/.test(rationale),
        `${ex.id} [${optId}]: rationale must speak about the heard sound (got: ${rationale})`,
      ).toBe(true);
    }
    // f3 must NAME the kana (the old template never did)
    expect(
      /خوانده می‌شود|خوانش|بدون واکه/.test(ex.feedback.f3ExplainFa),
      `${ex.id}: f3 must name the kana and its reading`,
    ).toBe(true);
  }
});

test('recognition F1 — never embeds the correct reading (BUG-029 closed)', () => {
  const recognition = exercises.filter((e) => e.type === 'kana-recognition');
  let checked = 0;
  for (const ex of recognition) {
    if (!ex.options || !ex.correctOptionId) continue;
    const key = ex.options.find((o) => o.id === ex.correctOptionId)!;
    const label = key.label.trim();
    // script-discrimination items (k13-disc): options are script names, the
    // hint describing both scripts is the designed teaching — skip
    if (['هیراگانا', 'کاتاکانا', 'کانجی'].includes(label)) continue;
    checked++;
    expect(
      ex.feedback.f1Fa.includes(label),
      `${ex.id}: f1Fa leaks the correct reading «${label}» (f1: ${ex.feedback.f1Fa})`,
    ).toBe(false);
    expect(
      ex.feedback.f2HintFa.includes(label),
      `${ex.id}: f2HintFa leaks the correct reading «${label}»`,
    ).toBe(false);
  }
  expect(checked).toBeGreaterThanOrEqual(120); // the full leak census size
});

test('negative fixture — a mutated F1 with the reading embedded FAILS the leak check', () => {
  const victim = exercises.find((e) => e.id === 'ex-kana-h1-rec-hira-a')!;
  const key = victim.options!.find((o) => o.id === victim.correctOptionId)!;
  const mutated: Exercise = {
    ...victim,
    feedback: { ...victim.feedback, f1Fa: `«あ» صدای ${key.label} دارد — نگاه کن.` },
  };
  expect(mutated.feedback.f1Fa.includes(key.label.trim())).toBe(true); // the mutation leaks
});
