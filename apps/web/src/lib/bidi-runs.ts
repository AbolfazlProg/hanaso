/**
 * HANASO — Bidirectional mixed-text run engine (ENGINE-NEXTGEN W-A).
 *
 * THE shared solution for every line that mixes Persian (RTL) with Japanese,
 * Latin romaji, or numbers — one engine for titles, sentences, feedback copy,
 * table cells, options, hints: no per-component CSS, no scattered fixes.
 *
 * It does exactly two jobs, both SEMANTIC:
 *
 * 1. RUN ISOLATION — segment the text into direction runs (bidi UAX#9 rules
 *    N1/N2/W7 applied to strong classes R/L/J with paragraph dir RTL). Every
 *    LTR run (Japanese / Latin / number) is emitted as its own isolate so the
 *    surrounding Persian flow, punctuation, brackets and colons can never
 *    scramble it — and a Japanese run can never leak its direction into the
 *    Persian sentence around it.
 *
 * 2. SEMANTIC ARROWS — an arrow points wherever its MEANING moves:
 *    - In Persian prose (RTL reading) a progression arrow must VISUALLY point
 *      LEFT at the next-read item. Browsers never mirror the → glyph, so the
 *      engine flips right-pointing glyphs inside RTL flow.
 *    - A Japanese derivation chain (は → ば (゛) → ぱ) or an all-Latin code
 *      sequence (L1-L2 → L3-L4) is ONE left-to-right notation island — its
 *      arrows stay verbatim.
 *    - The decision is made at CHAIN level: items connected by arrows form a
 *      chain; a chain whose items are all pure-Japanese (or all pure-Latin)
 *      is a notation island; a chain containing any Persian item is a Persian
 *      prose sequence — ALL its arrows flip (so «موضوع+も → هویت → です → か»
 *      reads coherently right-to-left with every arrow pointing forward).
 *    Direction is decided per-chain from real script content — never a blind
 *    global mirror (stroke-order arrows, media icons and physical writing
 *    hints live outside this engine and stay untouched).
 *
 * PURE + client-safe (no React, no DOM) — unit-tested in
 * tests/unit/bidi-runs.test.ts and rendered by MixedFaJaText.
 */

/* ------------------------------------------------------------------ exports */

export type SegmentDir = 'rtl' | 'ltr';

/** One display segment produced by {@link segmentForDisplay}. */
export interface DisplaySegment {
  /** Segment text (arrows already direction-corrected when dir === 'rtl'). */
  text: string;
  dir: SegmentDir;
  /** Japanese runs carry lang for font + a11y (WCAG 3.1.2). */
  lang?: 'ja';
}

/* ---------------------------------------------------------------- character */

/* Persian/Arabic block (+ presentation forms, Hebrew) — strong RTL. */
const R_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
/* Kana, CJK ideographs, CJK punctuation, halfwidth katakana — strong LTR. */
const J_RE =
  /[\u3040-\u30FF\u3100-\u312F\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005\u3006\u3000-\u303F\uFF66-\uFF9F]/;
/* Latin letters (+ Cyrillic/Greek for safety) — strong LTR. */
const L_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;

/** Right-pointing directional arrows → their left-pointing counterparts. */
const ARROW_FLIP: Record<string, string> = {
  '\u2192': '\u2190', // → → ←
  '\u21D2': '\u21D0', // ⇒ → ⇐
  '\u279C': '\u2190', // ➜ → ←
  '\u2794': '\u2190', // ➔ → ←
  '\u27A1': '\u2190', // ➡ → ←
  '\u27F6': '\u27F5', // ⟶ → ⟵
};

/** All directional arrows (separators for chain analysis; symmetric ones are not). */
const RIGHT_ARROWS = new Set(Object.keys(ARROW_FLIP));
const LEFT_ARROWS = new Set(['\u2190', '\u21D0', '\u27F5']);
const isDirectionalArrow = (ch: string) => RIGHT_ARROWS.has(ch) || LEFT_ARROWS.has(ch);

/** Flip right-pointing arrows to left-pointing (RTL-context display). */
export function flipArrowsRtl(text: string): string {
  let out = '';
  for (const ch of text) out += ARROW_FLIP[ch] ?? ch;
  return out;
}

/** The right-pointing arrows this engine knows (content lint + tests). */
export const DIRECTIONAL_ARROWS = Object.keys(ARROW_FLIP);

/* -------------------------------------------------------------- base engine */

type Atom = { cls: 'R' | 'L' | 'J' | 'N' | 'NUM'; start: number; len: number };

/**
 * Base run segmentation (no arrow-chain logic — call via segmentForDisplay).
 * Applies bidi N1/N2 with paragraph RTL: neutrals between same-direction
 * strongs take that direction; mixed sides take RTL; number groups isolate.
 */
function baseSegment(text: string): DisplaySegment[] {
  if (!text) return [];

  const atoms: Atom[] = [];
  let i = 0;
  while (i < text.length) {
    if (/[0-9]/.test(text[i]!)) {
      const m = /^(?:[0-9]+[.:/\-]?)+/.exec(text.slice(i));
      const len = m ? m[0].length : 1;
      atoms.push({ cls: 'NUM', start: i, len });
      i += len;
      continue;
    }
    const ch = text[i]!;
    const cls: Atom['cls'] = R_RE.test(ch) ? 'R' : J_RE.test(ch) ? 'J' : L_RE.test(ch) ? 'L' : 'N';
    atoms.push({ cls, start: i, len: 1 });
    i += 1;
  }

  const strongs = atoms
    .filter((a) => a.cls !== 'N')
    .map((a) => ({ at: a.start, ltr: a.cls !== 'R' }));
  const prevStrongBefore = (idx: number): boolean | null => {
    let out: boolean | null = null;
    for (const s of strongs) {
      if (s.at < atoms[idx]!.start) out = s.ltr;
      else break;
    }
    return out;
  };
  const nextStrongAfter = (idx: number): boolean | null => {
    for (const s of strongs) {
      if (s.at > atoms[idx]!.start) return s.ltr;
    }
    return null;
  };

  const resolved: Array<'rtl' | 'ltr' | 'num'> = atoms.map((a, idx) => {
    if (a.cls === 'R') return 'rtl';
    if (a.cls === 'L' || a.cls === 'J') return 'ltr';
    if (a.cls === 'NUM') return 'num';
    const prev = prevStrongBefore(idx);
    const next = nextStrongAfter(idx);
    if (prev === null && next === null) return 'rtl';
    if (prev !== null && next !== null) return prev === next ? (prev ? 'ltr' : 'rtl') : 'rtl';
    return 'rtl'; // one-sided neutrals take the paragraph direction (N2)
  });

  const segs: DisplaySegment[] = [];
  const push = (dir: SegmentDir, lang: boolean, start: number, end: number) => {
    const raw = text.slice(start, end);
    segs.push({
      text: dir === 'rtl' ? flipArrowsRtl(raw) : raw,
      dir,
      ...(lang && dir === 'ltr' ? { lang: 'ja' as const } : {}),
    });
  };
  let cursor = 0;
  let curDir: SegmentDir | null = null;
  let curJa = false;
  const flushTo = (end: number) => {
    if (curDir !== null) push(curDir, curJa, cursor, end);
    cursor = end;
  };

  for (let a = 0; a < atoms.length; a++) {
    if (resolved[a] === 'num') {
      const prevAtom = atoms[a - 1];
      const adjacentLeft = prevAtom !== undefined && prevAtom.start + prevAtom.len === atoms[a]!.start && curDir === 'ltr';
      const nextAtom = atoms[a + 1];
      const adjacentRight = nextAtom !== undefined && atoms[a]!.start + atoms[a]!.len === nextAtom.start && resolved[a + 1] === 'ltr';
      if (adjacentLeft) continue; // flows into the current ltr run (L1-L2, v1.2)
      if (adjacentRight) {
        flushTo(atoms[a]!.start);
        curDir = 'ltr';
        curJa = false;
        continue;
      }
      flushTo(atoms[a]!.start);
      push('ltr', false, atoms[a]!.start, atoms[a]!.start + atoms[a]!.len);
      cursor = atoms[a]!.start + atoms[a]!.len;
      curDir = null;
      curJa = false;
      continue;
    }
    const r = resolved[a]!;
    const dir: SegmentDir = r === 'num' ? 'ltr' : r;
    if (curDir === null) {
      flushTo(atoms[a]!.start);
      curDir = dir;
      curJa = atoms[a]!.cls === 'J';
      continue;
    }
    if (dir === curDir) {
      if (atoms[a]!.cls === 'J') curJa = true;
      continue;
    }
    flushTo(atoms[a]!.start);
    curDir = dir;
    curJa = atoms[a]!.cls === 'J';
  }
  if (curDir !== null) push(curDir, curJa, cursor, text.length);

  const clean = segs.filter((s) => s.text.length > 0);
  const merged: DisplaySegment[] = [];
  for (const s of clean) {
    const last = merged[merged.length - 1];
    if (last && last.dir === s.dir && last.lang === s.lang) last.text += s.text;
    else merged.push({ ...s });
  }
  return merged;
}

/* ---------------------------------------------------------- arrow chains */

interface Tok {
  text: string;
  start: number;
  end: number;
  cls: 'J' | 'L' | 'R' | 'M';
}

function tokenClass(tok: string): Tok['cls'] {
  let hasJ = false,
    hasL = false,
    hasR = false;
  for (const ch of tok) {
    if (J_RE.test(ch)) hasJ = true;
    else if (L_RE.test(ch)) hasL = true;
    else if (R_RE.test(ch)) hasR = true;
  }
  if (hasJ && !hasR && !hasL) return 'J';
  if (hasL && !hasR && !hasJ) return 'L';
  if (hasR && !hasJ && !hasL) return 'R';
  return 'M';
}

function tokensOf(text: string, from: number, to: number): Tok[] {
  const out: Tok[] = [];
  let i = from;
  while (i < to) {
    while (i < to && /\s/.test(text[i]!)) i++;
    if (i >= to) break;
    const start = i;
    while (i < to && !/\s/.test(text[i]!)) i++;
    const t = text.slice(start, i);
    out.push({ text: t, start, end: i, cls: tokenClass(t) });
  }
  return out;
}

interface Chain {
  type: 'J' | 'L' | 'M';
  /** Verbatim island span (J/L chains only). */
  spanStart: number;
  spanEnd: number;
}

/** Classify arrow chains: notation islands vs Persian prose sequences. */
function analyzeChains(text: string): Chain[] {
  const arrowAt: number[] = [];
  for (let i = 0; i < text.length; i++) if (isDirectionalArrow(text[i]!)) arrowAt.push(i);
  if (arrowAt.length === 0) return [];

  const partCount = arrowAt.length + 1;
  const partStart = (p: number) => (p === 0 ? 0 : arrowAt[p - 1]! + 1);
  const partEnd = (p: number) => (p === partCount - 1 ? text.length : arrowAt[p]!);
  const parts: Tok[][] = [];
  for (let p = 0; p < partCount; p++) parts.push(tokensOf(text, partStart(p), partEnd(p)));

  /* Edge classification by the tokens touching each arrow. */
  const edges: Array<{ type: 'J' | 'L' | 'M'; leftTok?: Tok; rightTok?: Tok }> = [];
  for (let e = 0; e < arrowAt.length; e++) {
    const left = parts[e]!.filter((t) => t.cls !== 'M' || /[A-Za-z\u3040-\u30ff\u4e00-\u9fff\u0600-\u06ff]/.test(t.text)).at(-1);
    const right = parts[e + 1]!.find((t) => t.cls !== 'M' || /[A-Za-z\u3040-\u30ff\u4e00-\u9fff\u0600-\u06ff]/.test(t.text));
    let type: 'J' | 'L' | 'M';
    if (left && right && left.cls === right.cls && (left.cls === 'J' || left.cls === 'L')) type = left.cls;
    else type = 'M';
    edges.push({ type, leftTok: left, rightTok: right });
  }

  /* Chain grouping: consecutive edges merge iff the shared part between them
   * is ONE clean item (all its tokens belong to a single script class) — the
   * two arrows then operate on the same sequence. Impure shared parts
   * (containing Persian words like «و» between two Japanese items) BREAK the
   * chain. The chain TYPE is decided afterwards: any mixed edge makes the
   * whole connected sequence mixed (mixedness propagates — «موضوع+も → هویت
   * → です → か» flips ALL its arrows, including the locally J-J isteren → か). */
  const chains: Chain[] = [];
  let e = 0;
  while (e < edges.length) {
    const startEdge = e;
    let endEdge = e;
    while (endEdge + 1 < edges.length) {
      const shared = parts[endEdge + 1]!; // part between edge endEdge and endEdge+1
      const cleanItem = shared.length > 0 && shared.every((tok) => tok.cls === shared[0]!.cls);
      if (!cleanItem) break;
      endEdge++;
    }
    const edgeTypes = edges.slice(startEdge, endEdge + 1).map((x) => x.type);
    const type: Chain['type'] = edgeTypes.includes('M')
      ? 'M'
      : edgeTypes.every((t) => t === 'J')
        ? 'J'
        : edgeTypes.every((t) => t === 'L')
          ? 'L'
          : 'M'; // J+L mixture — treat as prose (safety)

    /* Span: trailing same-class run of the first boundary part → leading
     * same-class run of the last boundary part (the Persian sentence prefix
     * «القاعده:» stays OUTSIDE a notation island). */
    const firstPart = parts[startEdge]!;
    const lastPart = parts[endEdge + 1]!;
    let spanStart: number | undefined;
    if (type === 'J' || type === 'L') {
      for (let k = firstPart.length - 1; k >= 0; k--) {
        if (firstPart[k]!.cls === type) spanStart = firstPart[k]!.start;
        else break;
      }
      let spanEnd: number | undefined;
      for (const tok of lastPart) {
        if (tok.cls === type) spanEnd = tok.end;
        else break;
      }
      if (spanStart === undefined || spanEnd === undefined || spanEnd <= spanStart) {
        // no clean notation island — degrade to mixed prose
        const leftTok = edges[startEdge]!.leftTok;
        const rightTok = edges[endEdge]!.rightTok;
        chains.push({
          type: 'M',
          spanStart: leftTok ? leftTok.start : partStart(startEdge),
          spanEnd: rightTok ? rightTok.end : partEnd(endEdge + 1),
        });
      } else {
        chains.push({ type, spanStart: spanStart!, spanEnd: spanEnd! });
      }
    } else {
      const leftTok = edges[startEdge]!.leftTok;
      const rightTok = edges[endEdge]!.rightTok;
      chains.push({
        type: 'M',
        spanStart: leftTok ? leftTok.start : partStart(startEdge),
        spanEnd: rightTok ? rightTok.end : partEnd(endEdge + 1),
      });
    }
    e = endEdge + 1;
  }
  return chains;
}

/* -------------------------------------------------------------- entrypoint */

/**
 * Segment mixed text into display runs. Pure: same input → same output.
 * Arrows inside RTL prose flip to point in the reading direction; notation
 * chains (all-Japanese / all-Latin) stay one verbatim LTR island.
 */
export function segmentForDisplay(text: string): DisplaySegment[] {
  if (!text) return [];
  const chains = analyzeChains(text);
  if (chains.length === 0) return baseSegment(text);

  const out: DisplaySegment[] = [];
  let cursor = 0;
  for (const chain of chains) {
    if (chain.spanStart > cursor) out.push(...baseSegment(text.slice(cursor, chain.spanStart)));
    const raw = text.slice(chain.spanStart, chain.spanEnd);
    if (chain.type === 'M') out.push(...baseSegment(flipArrowsRtl(raw)));
    else out.push({ text: raw, dir: 'ltr', ...(chain.type === 'J' ? { lang: 'ja' as const } : {}) });
    cursor = chain.spanEnd;
  }
  if (cursor < text.length) out.push(...baseSegment(text.slice(cursor)));

  const merged: DisplaySegment[] = [];
  for (const s of out) {
    if (s.text.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && last.dir === s.dir && last.lang === s.lang) last.text += s.text;
    else merged.push({ ...s });
  }
  return merged;
}
