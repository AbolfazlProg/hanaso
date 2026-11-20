/**
 * Part-2 الف — the ONE Persian transliteration standard of chapter 01
 * (content/translit-standard.ts is the spec; this suite enforces it).
 *
 * Pins the three drift classes the owner flagged, plus the y-row singleton
 * contract across the whole recognition bank:
 *   1. ル/ロ — never both rendered «رو» in one line (the k3 summary bug);
 *   2. ヲ/を — every wo card bridges romaji wo ↔ reading «اُ» (the card gap);
 *   3. «یُ/یُو» — yo = «یُ» and yu = «یو» EVERYWHERE (singletons and the
 *      きょう/きゅう/きよう/びょういん compound family — the h6 reversal).
 */
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getChapter } from '@/modules/curriculum/content';
import { KANA_TEACHING } from '@/modules/curriculum/content/kana-teaching';
import { BANNED_TRANSLIT_STRINGS, Y_ROW_FA, R_ROW_FA } from '@/modules/curriculum/content/translit-standard';

const ch1 = getChapter('kana-foundation-01')!;
const stationsFile = readFileSync(
  join(process.cwd(), 'src/modules/curriculum/content/chapter-kana01.stations.ts'),
  'utf8',
);
const exercisesFile = readFileSync(
  join(process.cwd(), 'src/modules/curriculum/content/chapter-kana01.exercises.ts'),
  'utf8',
);
const practiceFile = readFileSync(
  join(process.cwd(), 'src/modules/curriculum/content/chapter-kana01.practice.exercises.ts'),
  'utf8',
);

test('banned drift strings never return to any content surface', () => {
  const surfaces = [stationsFile, exercisesFile, practiceFile];
  for (const banned of BANNED_TRANSLIT_STRINGS) {
    for (const [i, s] of surfaces.entries()) {
      expect(s.includes(banned), `file #${i} contains banned translit string: ${banned}`).toBe(false);
    }
  }
});

test('ル/ロ — the r-row summary keeps the registry distinction (ル=«رو» vs ロ=«رُ»)', () => {
  // the k3 wrap-up line must carry BOTH forms DISTINCTLY (Part-2 الف fix #1)
  expect(stationsFile).toContain('ル(رو)، レ(ره)، ロ(رُ)');
  // and no line may render the two glyphs with the same label anymore
  expect(stationsFile).not.toMatch(/ル\(رو\)[^\n]*ロ\(رو\)/);
});

test('ヲ/を — both wo cards BRIDGE romaji wo ↔ reading «اُ» (the card gap)', () => {
  const woCards = KANA_TEACHING.filter((t) => t.kanaId === 'hira-wo' || t.kanaId === 'kata-wo');
  expect(woCards.length).toBe(2);
  for (const card of woCards) {
    // the note must mention the romaji spelling AND the actual reading together
    expect(card.pronunciationNoteFa).toContain('wo');
    expect(card.pronunciationNoteFa).toContain('اُ');
  }
});

test('y-row singletons — every よ/ヨ recognition item keys «یُ», every ゆ/ユ keys «یو»', () => {
  let yoChecked = 0;
  let yuChecked = 0;
  for (const ex of Object.values(ch1.exercises)) {
    if (ex.type !== 'kana-recognition' || !ex.correctOptionId) continue;
    const key = ex.options?.find((o) => o.id === ex.correctOptionId)?.label.trim();
    if (!key) continue;
    if (ex.targetConcept === 'hira-yo' || ex.targetConcept === 'kata-yo') {
      expect(key, `${ex.id}: yo must key «یُ» (got ${key})`).toBe('«یُ»');
      yoChecked++;
    }
    if (ex.targetConcept === 'hira-yu' || ex.targetConcept === 'kata-yu') {
      expect(key, `${ex.id}: yu must key «یو» (got ${key})`).toBe('«یو»');
      yuChecked++;
    }
  }
  expect(yoChecked).toBeGreaterThanOrEqual(2); // h14 + k10 (+ drill variants)
  expect(yuChecked).toBeGreaterThanOrEqual(2);
});

test('compound family — きょう renders «کیُو», きゅう renders «کیوو», きよう renders «کی‌یُو»', () => {
  // Part-2 الف fix #3: the compounds follow the singleton standard (yo=«یُ»,
  // yu=«یو») — きょう = کیُ + و (long-u), きゅう = کیو + و.
  expect(stationsFile).toContain("readingFa: 'کیُو'");
  expect(stationsFile).toContain("'きよう = کی‌یُو'");
  expect(exercisesFile).toContain("promptJaReading: 'کیوو', // Part-2 الف"); // きゅう
  expect(exercisesFile).toContain("promptJaReading: 'کیُو', // Part-2 الف"); // きょう
  // the famous h6 minimal pair decodes distinctly
  expect(stationsFile).toContain("readingFa: 'بیُوین'"); // びょういん (hospital)
  // きゅ must NEVER render with the yo-damma anymore (the reversed outlier)
  expect(practiceFile).not.toContain('«کیُو» است');
});

test('the standard module exports the locked tables (single source of truth)', () => {
  expect(Y_ROW_FA).toEqual({ ya: 'یا', yu: 'یو', yo: 'یُ' });
  expect(R_ROW_FA.ro).toBe('رُ');
  expect(R_ROW_FA.ru).toBe('رو');
});
