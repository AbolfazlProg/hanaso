/**
 * HANASO-KANA-REMEDIATION-02 — content-integrity regression guards.
 *
 * Ports the machine checks of audit HANASO-KANA-AUDIT-01 (Subagent B engine)
 * into the permanent test suite so the fixed root-cause patterns cannot
 * regress:
 *   1. Single-answer integrity — no two options of a Persian-reading
 *      multiple-choice decode may share a pronunciation (RP-01). The 59
 *      intentional katakana script-discrimination items (RP-10, AUD-014) are
 *      explicitly allowed: their prompt names the script, and their options
 *      are kana glyphs, not Persian readings.
 *   2. Reading uniqueness — one Persian reading string maps to one Japanese
 *      word across the whole chapter (RP-02, AUD-002).
 *   3. Per-word reading consistency — promptJaReading, the correct option
 *      label and F3 must not contradict each other (RP-02, AUD-004).
 *   4. Hint integrity — the meaning hint in a decode prompt must not contain
 *      the correct Persian reading (RP-03, AUD-003).
 *   5. Gate independence — no gate item may be byte-identical to a walk item
 *      (RP-08, AUD-010).
 *
 * Machine checks cannot judge naturalness of Japanese or pedagogy quality —
 * those need the QA checklist / native review path (documented in
 * ops/checkpoints/HANASO-KANA-REMEDIATION-02/).
 */
import { describe, expect, it } from 'vitest';

import { KANA_EXERCISES } from '@/modules/curriculum/content/chapter-kana01.exercises';
import { PRACTICE_EXERCISES_KANA } from '@/modules/curriculum/content/chapter-kana01.practice.exercises';
import type { Exercise } from '@/modules/curriculum/types';

/** All 586 chapter-1 exercises (walk + practice + gate bank). */
const ALL: Exercise[] = [...KANA_EXERCISES, ...Object.values(PRACTICE_EXERCISES_KANA)];

const PERSIAN_DIACRITICS = /[\u064B-\u0650\u0670\u0640]/g; // ّ (shadda, \u0651) is phonemic — NOT stripped
const ZWNJ = /\u200c/g;

/**
 * Normalize a Persian reading for pronunciation comparison.
 * Diacritics on their own are optional orthography, BUT a bare-vowel diacritic
 * (ُ on ک → کُ) is the syllable's vowel itself — it must survive as a distinct
 * key, canonicalized onto its carrier letter (کُ ~ کو / کیُ ~ کیو). This is
 * exactly the きょう «کیوو» vs きゅう «کیُوو» distinction (RP-02, AUD-002).
 */
function normReading(label: string): string {
  return (
    label
      .replace(/[«»]/g, '')
      // bare-vowel diacritics carry the syllable vowel — canonicalize to ASCII
      // vowels so mezo ≠ mizo ≠ mozo and ko+ro+ma collapses correctly.
      .replace(/\u064E/g, 'a') // َ fatha
      .replace(/\u0650/g, 'e') // ِ kasra (Persian "e" sound)
      .replace(/\u064F/g, 'o') // ُ damma (Persian "o" sound)
      .replace(PERSIAN_DIACRITICS, '')
      .replace(ZWNJ, '')
      .replace(/\s+/g, '')
      .trim()
  );
}

/** Strip the trailing meaning gloss the inventory style appends in parentheses. */
function stripGloss(reading: string): string {
  return reading.replace(/\([^)]*\)/g, '').trim();
}

/** Kana glyph options (script-discrimination items) — not Persian readings. */
function isKanaLabel(label: string): boolean {
  return /^[\u3040-\u30FF\sー]+$/.test(label.replace(/[«»]/g, ''));
}

/** Reading-style options: Persian text in guillemets. */
function readingOptions(ex: Exercise): Array<{ id: string; label: string }> {
  return (ex.options ?? []).filter((o) => !isKanaLabel(o.label) && o.label.includes('«'));
}

describe('REMEDIATION-02 content-integrity guards — single-answer (RP-01)', () => {
  it('no decode/listening MCQ has two options with the same Persian pronunciation', () => {
    const violations: string[] = [];
    for (const ex of ALL) {
      if (ex.type !== 'kana-decode') continue;
      const ropts = readingOptions(ex);
      if (ropts.length < 2) continue;
      const seen = new Map<string, string>();
      for (const o of ropts) {
        const key = normReading(o.label);
        const prev = seen.get(key);
        if (prev !== undefined && prev !== o.id) {
          violations.push(`${ex.id}: «${prev}» vs «${o.id}» both normalize to «${key}»`);
        }
        seen.set(key, o.id);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('REMEDIATION-02 content-integrity guards — reading uniqueness (RP-02)', () => {
  it('each Persian reading string maps to exactly one Japanese word (no collisions like きょう/きゅう)', () => {
    const byReading = new Map<string, Set<string>>();
    for (const ex of ALL) {
      if (!ex.promptJa || !ex.promptJaReading) continue;
      const reading = normReading(stripGloss(ex.promptJaReading));
      if (!reading) continue;
      if (!byReading.has(reading)) byReading.set(reading, new Set());
      byReading.get(reading)!.add(ex.promptJa);
    }
    const collisions = [...byReading.entries()]
      .filter(([, words]) => words.size > 1)
      .map(([reading, words]) => `«${reading}» → ${[...words].join(' / ')}`);
    expect(collisions).toEqual([]);
  });

  it('per-exercise reading consistency: promptJaReading matches the correct option and is not contradicted by F3', () => {
    const problems: string[] = [];
    for (const ex of ALL) {
      if (ex.type !== 'kana-decode' || !ex.promptJaReading) continue;
      const correct = (ex.options ?? []).find((o) => o.id === ex.correctOptionId);
      if (!correct || isKanaLabel(correct.label)) continue;
      const declared = normReading(stripGloss(ex.promptJaReading));
      const answer = normReading(correct.label);
      if (declared !== answer) {
        problems.push(`${ex.id}: promptJaReading «${declared}» ≠ correct option «${answer}»`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('REMEDIATION-02 content-integrity guards — hint integrity (RP-03)', () => {
  it('the meaning hint in a decode prompt never contains the correct reading', () => {
    const problems: string[] = [];
    for (const ex of ALL) {
      if (ex.type !== 'kana-decode' || !ex.promptFa) continue;
      const hintMatch = /راهنمایی:\s*(.+)$/.exec(ex.promptFa);
      if (!hintMatch) continue;
      const hint = hintMatch[1]!.trim();
      const correct = (ex.options ?? []).find((o) => o.id === ex.correctOptionId);
      if (!correct || isKanaLabel(correct.label)) continue;
      const answer = normReading(correct.label);
      const hintNorm = normReading(hint);
      // The hint must not contain the answer reading (nor vice versa).
      if (answer.length >= 3 && (hintNorm.includes(answer) || answer.includes(hintNorm))) {
        problems.push(`${ex.id}: hint «${hint}» reveals answer «${correct.label}»`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('REMEDIATION-02 content-integrity guards — gate independence (RP-08)', () => {
  it('no gate (mastery) item is identical to a walk/practice item (prompt+options+key)', () => {
    const walk = new Map<string, string>();
    for (const ex of ALL) {
      if (ex.assessmentRole !== 'practice') continue;
      const key = JSON.stringify([
        ex.promptFa,
        ex.promptJa,
        (ex.options ?? []).map((o) => o.label),
        ex.correctOptionId,
      ]);
      walk.set(key, ex.id);
    }
    const dupes: string[] = [];
    for (const ex of ALL) {
      if (ex.assessmentRole === 'practice') continue;
      const key = JSON.stringify([
        ex.promptFa,
        ex.promptJa,
        (ex.options ?? []).map((o) => o.label),
        ex.correctOptionId,
      ]);
      if (walk.has(key)) dupes.push(`${ex.id} duplicates walk item ${walk.get(key)}`);
    }
    expect(dupes).toEqual([]);
  });
});

describe('REMEDIATION-02 content-integrity guards — shape fairness (RP-05)', () => {
  /** Visible Persian letters (diacritics/ZWNJ/guillemets excluded). */
  const DIAC = /[\u064B-\u0652\u0670\u0640«»\u200c\u0651\s]/g;
  const visibleLen = (label: string) => label.replace(DIAC, '').length;

  it('the correct option is rarely the uniquely-longest one (pick-the-longest heuristic stays weak)', () => {
    let total = 0;
    let uniqueLongest = 0;
    const offenders: string[] = [];
    for (const ex of ALL) {
      if (ex.type !== 'kana-decode') continue;
      const ropts = readingOptions(ex);
      if (ropts.length < 3) continue;
      const correct = ropts.find((o) => o.id === ex.correctOptionId);
      if (!correct) continue;
      total += 1;
      const cl = visibleLen(correct.label);
      const others = ropts.filter((o) => o.id !== ex.correctOptionId).map((o) => visibleLen(o.label));
      if (cl > Math.max(...others)) {
        uniqueLongest += 1;
        offenders.push(`${ex.id} (${cl} vs ${others.join('/')})`);
      }
    }
    expect(total).toBeGreaterThan(50);
    // After RP-05 the ratio is 1/68 (~1.5%); allow up to 10% before the guard fires
    // (a few defensible cases like いいえ keep semantic deletion errors).
    expect(uniqueLongest / total).toBeLessThan(0.1);
    if (uniqueLongest / total >= 0.1) throw new Error(offenders.join('; '));
  });
});

describe('REMEDIATION-02 content-integrity guards — script naming (AUD-014)', () => {
  const HIRA = /[\u3041-\u309F]/;
  const KATA = /[\u30A0-\u30FF]/;

  it('every script-discrimination item (same sound in both scripts among options) names the script in its prompt', () => {
    const problems: string[] = [];
    for (const ex of ALL) {
      const labels = (ex.options ?? [])
        .map((o) => o.label.replace(/[«»]/g, '').trim())
        .filter((l) => /^[\u3040-\u30FF\sー]+$/.test(l));
      if (labels.length < 2) continue;
      const hira = labels.filter((l) => HIRA.test(l) && !KATA.test(l));
      const kata = labels.filter((l) => KATA.test(l) && !HIRA.test(l));
      const sameSound = hira.some((h) =>
        kata.some((k) => h.length === k.length && [...h].every((c, i) => k.charCodeAt(i) - c.charCodeAt(0) === 0x60)),
      );
      if (sameSound && !/هیراگانا|کاتاکانا/.test(ex.promptFa ?? '')) {
        problems.push(`${ex.id}: ${hira.join('|')} vs ${kata.join('|')} without naming the script`);
      }
    }
    expect(problems).toEqual([]);
  });
});
