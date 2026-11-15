/**
 * HANASO — kana writing-data builder (TASK-LEARNING-08 phase 2 / #117).
 *
 * Rebuilds `public/writing-data/*.json` from the vendored KanjiVG kana SVG
 * sources (vendor/kanjivg-kana, CC BY-SA 3.0) — replacing the earlier
 * AnimCJK-derived data whose audit found 16/92 glyphs with non-standard
 * stroke counts and 12/92 with out-of-bounds medians (the root cause of the
 * engine rejecting correct drawings and of the broken あ last-stroke render).
 *
 * Why KanjiVG: it is the canonical Japanese stroke database — the 92 basic
 * kana all match the standard stroke counts, every stroke is ONE continuous
 * centerline path drawn in the writing direction, and the coordinates are
 * clean. Centerlines (not outlines) mean the same `d` serves three purposes:
 *   1. rendering — drawn as a thick round stroke (brush look, ink animation
 *      via stroke-dashoffset),
 *   2. the geometric reference for evaluation,
 *   3. the writing-direction truth (start point = path start).
 *
 * Output per character (same JSON shape as the old format, new semantics):
 *   { strokes: [centerline path d in 1024×1024, y-down],
 *     medians: [arc-length-sampled points per stroke] }
 * Plus index.json with provenance and a licenses/ dir (CC BY-SA 3.0).
 *
 * DETERMINISTIC: fixed input order, fixed rounding, no timestamps — the
 * committed assets stay byte-stable across rebuilds.
 *
 * Run: node scripts/build-kana-writing-data.mjs   (chained into `pnpm build`)
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorDir = path.join(webRoot, 'vendor', 'kanjivg-kana');
const outDir = path.join(webRoot, 'public', 'writing-data');

/** KanjiVG viewBox is 109×109; the writing engine's char space is 1024×1024 (y down). */
const KVG_SIZE = 109;
const CHAR_SPACE = 1024;
const SCALE = CHAR_SPACE / KVG_SIZE;

/** Which characters the shipped content actually practices (from kana-items.ts). */
function requiredChars() {
  const src = readFileSync(path.join(webRoot, 'src/modules/curriculum/content/kana-items.ts'), 'utf8');
  const glyphs = [...src.matchAll(/glyph: '([^']+)'/g)].map((m) => m[1]);
  const confusables = [...src.matchAll(/confusableWith: \[([^\]]*)\]/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
  );
  const all = [...new Set([...glyphs, ...confusables])].sort();
  if (all.length === 0) throw new Error('kana-items.ts yielded no glyphs — refusing to empty the data set');
  return all;
}

/**
 * Parse an SVG path that uses only `M x,y` and `c dx1 dy1 dx2 dy2 dx dy`
 * (KanjiVG kana use exactly these) into cubic segments in absolute 109-space.
 */
function parsePath(d) {
  const tokens = d.match(/[Mc]|-?(?:\d+\.\d+|\.\d+|\d+)/g) ?? [];
  const segs = [];
  let cx = 0;
  let cy = 0;
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    i += 1;
    if (cmd === 'M') {
      cx = Number(tokens[i]);
      cy = Number(tokens[i + 1]);
      i += 2;
      // KanjiVG kana strokes have exactly one M; anything else is a bug we
      // must refuse to ship (a stroke must be one continuous pen move).
      if (i < tokens.length && tokens[i] !== 'c') {
        throw new Error(`unexpected command after M: ${tokens[i]} in ${d.slice(0, 40)}`);
      }
    } else if (cmd === 'c') {
      while (i + 5 < tokens.length + 1 && tokens[i] !== 'M' && tokens[i] !== 'c') {
        const nums = tokens.slice(i, i + 6).map(Number);
        if (nums.some((n) => Number.isNaN(n)) || nums.length < 6) break;
        segs.push([
          { x: cx, y: cy },
          { x: cx + nums[0], y: cy + nums[1] },
          { x: cx + nums[2], y: cy + nums[3] },
          { x: cx + nums[4], y: cy + nums[5] },
        ]);
        cx += nums[4];
        cy += nums[5];
        i += 6;
      }
    } else {
      throw new Error(`unsupported path command: ${cmd}`);
    }
  }
  return segs;
}

/** Flatten cubic segments to a dense polyline (adaptive per-curve sampling). */
function flatten(segs) {
  const pts = [];
  for (const [p0, p1, p2, p3] of segs) {
    const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const n = Math.max(4, Math.ceil(chord * 1.5)); // ~0.67 units per sample in 109-space
    for (let k = pts.length === 0 ? 0 : 1; k <= n; k += 1) {
      const t = k / n;
      const mt = 1 - t;
      pts.push({
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      });
    }
  }
  return pts;
}

/** Arc-length resample of a polyline to n points (endpoints preserved). */
function resamplePoints(pts, n) {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const lens = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    lens.push(total);
  }
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const out = [pts[0]];
  let seg = 0;
  for (let k = 1; k < n - 1; k += 1) {
    const target = (k / (n - 1)) * total;
    while (seg < lens.length - 2 && lens[seg + 1] < target) seg += 1;
    const segLen = lens[seg + 1] - lens[seg] || 1;
    const t = (target - lens[seg]) / segLen;
    out.push({
      x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
      y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * t,
    });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const r2 = (v) => Math.round(v * 100) / 100;

/** Scale + re-emit the path as `M x,y c …` in 1024-space. */
function scalePath(segs) {
  if (segs.length === 0) throw new Error('empty stroke');
  const start = segs[0][0];
  let d = `M${r2(start.x * SCALE)},${r2(start.y * SCALE)}`;
  let cx = start.x;
  let cy = start.y;
  for (const [p0, p1, p2, p3] of segs) {
    if (p0.x !== cx || p0.y !== cy) throw new Error('discontinuous stroke segment');
    d += `c${r2((p1.x - p0.x) * SCALE)},${r2((p1.y - p0.y) * SCALE)} ${r2((p2.x - p0.x) * SCALE)},${r2((p2.y - p0.y) * SCALE)} ${r2((p3.x - p0.x) * SCALE)},${r2((p3.y - p0.y) * SCALE)}`;
    cx = p3.x;
    cy = p3.y;
  }
  return d;
}

/** Extract ordered centerline stroke paths from a vendored KanjiVG SVG. */
function strokePathsOf(svg) {
  const body = svg.slice(svg.indexOf('StrokePaths'));
  const found = [];
  for (const m of body.matchAll(/<path\b[^>]*>/g)) {
    const tag = m[0];
    const id = tag.match(/id="kvg:[^"]*-s(\d+)"/);
    const d = tag.match(/ d="([^"]+)"/);
    if (id && d) found.push({ n: Number(id[1]), d: d[1] });
  }
  found.sort((a, b) => a.n - b.n);
  // stroke numbers must be exactly 1..N (order integrity)
  if (found.some((f, i) => f.n !== i + 1)) throw new Error('non-sequential stroke ids');
  return found.map((f) => f.d);
}

// ---------------------------------------------------------------- pipeline
const chars = requiredChars();
const missing = chars.filter((ch) => !existsInVendor(ch));
function existsInVendor(ch) {
  try {
    readFileSync(path.join(vendorDir, `${ch}.svg`));
    return true;
  } catch {
    return false;
  }
}
if (missing.length > 0) {
  throw new Error(`KanjiVG source missing for: ${missing.join(' ')} — do not ship`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, 'licenses'), { recursive: true });

const index = {
  source: 'KanjiVG r20260714 (CC BY-SA 3.0) — kanjivg.tagaini.net',
  format: 'centerline-v2 (strokes = writing-direction centerlines in 1024×1024, y-down)',
  chars: {},
};

for (const ch of [...chars].sort()) {
  const svg = readFileSync(path.join(vendorDir, `${ch}.svg`), 'utf8');
  const dPaths = strokePathsOf(svg);
  const strokes = [];
  const medians = [];
  for (const d of dPaths) {
    const segs = parsePath(d);
    strokes.push(scalePath(segs));
    const flat = flatten(segs).map((p) => ({ x: p.x * SCALE, y: p.y * SCALE }));
    const totalLen = flat.reduce(
      (s, p, i) => (i === 0 ? 0 : s + Math.hypot(p.x - flat[i - 1].x, p.y - flat[i - 1].y)),
      0,
    );
    const n = Math.min(32, Math.max(8, Math.ceil(totalLen / 40)));
    medians.push(resamplePoints(flat, n).map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]));
  }
  if (strokes.length === 0) throw new Error(`no strokes parsed for ${ch}`);
  // bounds integrity — nothing outside the char space (a margin of one pen
  // width is tolerated; KanjiVG coordinates are clean, this pins that).
  for (const m of medians) {
    for (const [x, y] of m) {
      if (x < -30 || x > CHAR_SPACE + 30 || y < -30 || y > CHAR_SPACE + 30) {
        throw new Error(`${ch}: median out of bounds (${x},${y}) — refusing to ship`);
      }
    }
  }
  writeFileSync(path.join(outDir, `${ch}.json`), `${JSON.stringify({ strokes, medians })}\n`);
  index.chars[ch] = { strokes: strokes.length };
}

writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

// license obligations travel with the derived data (CC BY-SA 3.0 ShareAlike)
copyFileSync(
  path.join(vendorDir, 'LICENSE-CC-BY-SA-3.0.txt'),
  path.join(outDir, 'licenses', 'LICENSE-CC-BY-SA-3.0.txt'),
);
copyFileSync(path.join(vendorDir, 'README.md'), path.join(outDir, 'licenses', 'README-KanjiVG.md'));

console.log(`writing-data: ${Object.keys(index.chars).length} chars rebuilt from KanjiVG (centerline-v2)`);
