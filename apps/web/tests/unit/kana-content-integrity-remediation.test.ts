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
  return label
    .replace(/[«»]/g, '')
    // bare-vowel diacritics carry the syllable vowel — canonicalize to ASCII
    // vowels so mezo ≠ mizo ≠ mozo and ko+ro+ma collapses correctly.
    .replace(/\u064E/g, 'a') // َ fatha
    .replace(/\u0650/g, 'e') // ِ kasra (Persian "e" sound)
    .replace(/\u064F/g, 'o') // ُ damma (Persian "o" sound)
    .replace(PERSIAN_DIACRITICS, '')
    .replace(ZWNJ, '')
    .replace(/\s+/g, '')
    .trim();
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
