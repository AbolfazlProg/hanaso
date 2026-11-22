#!/usr/bin/env node
/**
 * HANASO — Pronunciation inventory (ENGINE-NEXTGEN W-D).
 *
 * The mission mandate: «须盘点现有数据标注缺失/不一致项» — inventory the
 * existing pronunciation data and MARK the missing/inconsistent items.
 *
 * What this script walks, against the ONE locked word-level standard
 * (content/translit-standard.ts — card-truth mora labels, both romaji and
 * Persian from one mora walk):
 *
 *  1. EVERY registered word (all chapters' VocabItem):
 *       authored romaji vs DERIVED romaji (double-vowel style) →
 *         status: consistent | romaji-mismatch | uncovered
 *       derived translitFa (the registry carries it) — missing = uncovered.
 *
 *  2. Every HAND-AUTHORED Persian rendering in the content:
 *       kana-decode answer keys (promptJa ↔ promptJaReading) and rule-deck
 *       pair labels (glyph ↔ readingFa) → derived translit compared to the
 *       authored string → consistent | inconsistent | uncovered.
 *       NO hand rendering found for a kana string that appears in a reading
 *       context → missing-hand.
 *
 * Nothing is auto-fixed: the report is the owner's worklist. Output:
 * ops/reports/pronunciation-inventory.json (committed per release).
 *
 * Run: cd apps/web && npx tsx scripts/pronunciation-inventory.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listChapters } from '@/modules/curriculum/content';
import {
  transliterateKanaToFa,
  transliterateKanaToRomaji,
  uncoveredKanaBank,
} from '@/modules/curriculum/content/translit-standard';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..'); // apps/web/scripts → repo root
const contentDir = join(here, '..', 'src', 'modules', 'curriculum', 'content');

/* ---------------------------------------------------------- the words */

const words = [];
for (const ch of listChapters()) {
  for (const w of ch.words) {
    const fa = transliterateKanaToFa(w.readingKana);
    const rm = transliterateKanaToRomaji(w.readingKana);
    words.push({
      chapter: ch.slug,
      wordId: w.id,
      term: w.term,
      readingKana: w.readingKana,
      authoredRomaji: w.romaji,
      derivedRomaji: rm.errors.length === 0 ? rm.romaji : null,
      derivedTranslitFa: fa.errors.length === 0 ? fa.fa : null,
      romajiMatch: rm.errors.length === 0 && rm.romaji === w.romaji,
      status:
        fa.errors.length > 0 || rm.errors.length > 0
          ? 'uncovered'
          : rm.romaji === w.romaji
            ? 'consistent'
            : 'romaji-mismatch',
      derivationErrors: [...new Set([...fa.errors, ...rm.errors])],
    });
  }
}

/* ------------------------------------------- hand-authored renderings */

const contentFiles = readdirSync(contentDir).filter((f) => f.endsWith('.ts'));
const handRenderings = new Map(); // ja string → {ja, authored, derived, status, where[]}
const seenStrings = new Set(); // every kana string seen in a pronunciation context

function recordHand(ja, authored, where) {
  if (!ja || !authored) return;
  seenStrings.add(ja);
  // split-form teaching displays («کی + یا» — the 2-mora contrast grids)
  // are mora-separator TEACHING, not word transliteration: reported, never
  // counted as drift.
  const surfaceClass = authored.includes(' + ') ? 'split-form-display' : ja.length <= 2 ? 'glyph' : 'word';
  const fa = transliterateKanaToFa(ja);
  const derived = fa.errors.length === 0 ? fa.fa : null;
  const entry = handRenderings.get(ja) ?? { ja, authored, derived, where: [], surfaceClass };
  if (entry.authored !== authored) entry.authored = `${entry.authored} ⊕ ${authored}`;
  entry.derived = derived;
  entry.where.push(where);
  entry.status =
    surfaceClass === 'split-form-display'
      ? 'split-form-display'
      : fa.errors.length > 0
        ? 'uncovered'
        : derived === authored
          ? 'consistent'
          : 'inconsistent';
  handRenderings.set(ja, entry);
}

for (const file of contentFiles) {
  const src = readFileSync(join(contentDir, file), 'utf8');
  // kana-decode answer keys: promptJa: '…' … promptJaReading: '…'
  for (const m of src.matchAll(/promptJa: '([^']+)'[\s\S]{0,600}?promptJaReading: '([^']+)'(?<!\n)/g)) {
    recordHand(m[1], m[2], `${file} (promptJaReading)`);
  }
  // rule-deck pair labels: glyph: '…' … readingFa: '…'
  for (const m of src.matchAll(/glyph: '([^']+)'[\s\S]{0,200}?readingFa: '([^']+)'(?<!\n)/g)) {
    recordHand(m[1], m[2], `${file} (readingFa)`);
  }
  // reading-moment example readings (a real kana string in a pronunciation
  // context — no hand translit exists there: the missing-hand class)
  for (const m of src.matchAll(/role: 'reading',[\s\S]{0,300}?ja: '([^']+)',[\s\S]{0,200}?\n\s*reading: '([^']+)',/g)) {
    seenStrings.add(m[2]);
    if (!handRenderings.has(m[2])) handRenderings.set(m[2], null);
  }
}

/* ------------------------------------------------------- the report */

const handList = [...handRenderings.entries()]
  .map(([ja, entry]) => {
    if (entry) return { ...entry, where: [...new Set(entry.where)] };
    // reading-moment kana string with NO hand translit — the missing class
    const fa = transliterateKanaToFa(ja);
    return {
      ja,
      authored: null,
      derived: fa.errors.length === 0 ? fa.fa : null,
      where: ['(reading-moment — no hand rendering exists)'],
      surfaceClass: 'word',
      status: 'missing-hand',
    };
  })
  .sort((a, b) => a.ja.localeCompare(b.ja));

const summarize = (items) =>
  items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

const coverage = uncoveredKanaBank();

const report = {
  generatedAt: new Date().toISOString(),
  standard: 'translit-standard.ts — ENGINE-NEXTGEN W-D (card-truth mora walk; romaji double-vowel style)',
  kanaBankCoverage: {
    totalKanaItems: 184,
    missingFa: coverage.missingFa,
    missingRomaji: coverage.missingRomaji,
  },
  words: {
    total: words.length,
    summary: summarize(words),
    items: words,
  },
  handRenderings: {
    total: handList.length,
    summary: summarize(handList),
    items: handList,
  },
};

const outDir = join(repoRoot, 'ops', 'reports');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'pronunciation-inventory.json');
writeFileSync(outPath, JSON.stringify(report, null, 1) + '\n');

console.log('════ Pronunciation inventory (ENGINE-NEXTGEN W-D) ════');
console.log(
  `kana bank coverage : fa missing ${coverage.missingFa.length}, romaji missing ${coverage.missingRomaji.length}`,
);
console.log(`words              : ${words.length} → ${JSON.stringify(summarize(words))}`);
console.log(`hand renderings    : ${handList.length} → ${JSON.stringify(summarize(handList))}`);
const wordClass = handList.filter((h) => h.surfaceClass === 'word');
console.log(`  · word-class     : ${wordClass.length} → ${JSON.stringify(summarize(wordClass))}`);
const glyphClass = handList.filter((h) => h.surfaceClass === 'glyph');
console.log(`  · glyph-class    : ${glyphClass.length} → ${JSON.stringify(summarize(glyphClass))}`);
const inconsistent = handList.filter((h) => h.status === 'inconsistent');
console.log('');
console.log('— inconsistent hand renderings (the owner worklist — NOT auto-fixed) —');
for (const h of inconsistent) {
  console.log(`  ${h.ja}: authored «${h.authored}» vs standard «${h.derived}» @ ${h.where.join(', ')}`);
}
console.log('');
console.log(`report written: ${outPath}`);
