/**
 * HANASO — writing-data copy pipeline (TASK-LEARNING-07 / DD-105).
 *
 * Copies the per-character Hanzi-Writer-format stroke data actually referenced
 * by the product content from `@k1low/hanzi-writer-data-jp` (devDependency)
 * into `public/writing-data/` as cacheable static assets, together with the
 * package's license texts (APL / LGPL / Unicode) — the attribution obligations
 * DD-105 makes mandatory — and an `index.json` availability manifest.
 *
 * The pipeline is char-agnostic: kana today, kanji for future chapters — the
 * engine never fabricates data; a character missing from the manifest is
 * honestly reported `data_missing` at runtime.
 *
 * Run: node scripts/copy-writing-data.mjs   (chained into `pnpm build`)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const webRoot = path.resolve(process.cwd()); // apps/web when run via pnpm --filter web
const dataPkgDir = path.dirname(require.resolve('@k1low/hanzi-writer-data-jp/package.json'));
const outDir = path.join(webRoot, 'public', 'writing-data');

/** Characters the shipped content actually practices (92 kana glyphs, Ch01). */
function requiredChars() {
  const kanaItems = readFileSync(path.join(webRoot, 'src/modules/curriculum/content/kana-items.ts'), 'utf8');
  const glyphs = [...kanaItems.matchAll(/glyph: '([^']+)'/g)].map((m) => m[1]);
  if (glyphs.length === 0) throw new Error('kana-items.ts yielded no glyphs — refusing to empty the data set');
  // confusable targets must also be present (pair-discrimination drills)
  const confusables = [...kanaItems.matchAll(/confusableWith: \[([^\]]*)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
  );
  return { glyphs: [...new Set(glyphs)], confusables: [...new Set(confusables)] };
}

mkdirSync(outDir, { recursive: true });
const { glyphs, confusables } = requiredChars();
const allChars = [...new Set([...glyphs, ...confusables])].sort();

const missing = [];
// NOTE: no timestamp in the manifest — the committed asset must stay
// byte-stable across rebuilds (a churny diff would dirty every build).
const index = { chars: {} };
for (const ch of allChars) {
  const src = path.join(dataPkgDir, `${ch}.json`);
  if (!existsSync(src)) {
    missing.push(ch);
    continue;
  }
  const raw = JSON.parse(readFileSync(src, 'utf8'));
  if (!Array.isArray(raw.strokes) || !Array.isArray(raw.medians) || raw.strokes.length !== raw.medians.length) {
    throw new Error(`data integrity failure for ${ch}: strokes/medians mismatch`);
  }
  copyFileSync(src, path.join(outDir, `${ch}.json`));
  index.chars[ch] = { strokes: raw.strokes.length };
}
if (missing.length > 0) {
  throw new Error(`stroke data missing for: ${missing.join(' ')} (data package incomplete — do not ship)`);
}

// License texts — attribution obligations (APL for Arphic-derived kanji data,
// LGPL for animCJK-derived kana data, Unicode for Unihan). Served next to the data.
import { statSync } from 'node:fs';
const licensesSrc = path.join(dataPkgDir, 'licenses');
const licensesOut = path.join(outDir, 'licenses');
mkdirSync(licensesOut, { recursive: true });
const copyDirShallow = (from, to) => {
  for (const f of readdirSync(from)) {
    const p = path.join(from, f);
    if (statSync(p).isDirectory()) {
      const nested = path.join(to, f);
      mkdirSync(nested, { recursive: true });
      copyDirShallow(p, nested);
    } else {
      copyFileSync(p, path.join(to, f));
    }
  }
};
copyDirShallow(licensesSrc, licensesOut);

writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(
  `writing-data: ${allChars.length} chars copied (${glyphs.length} registry glyphs + ${confusables.length} confusable targets incl. overlap) + licenses → public/writing-data/`,
);
