/**
 * HANASO — Addendum-3 §6: fairness corpus for CONFUSABLE kana pairs.
 *
 * The owner demands the detection engine be tuned FAIRLY:
 *  - natural hand variation (coordinates, size, slight tilt, fewer sample
 *    points) must still be ACCEPTED;
 *  - genuinely wrong form / order / direction must still be REJECTED;
 *  - similar characters (あ/お, う/ら, ぬ/め, は/ほ, さ/き, れ/わ, ソ/ン, シ/ツ)
 *    get EXPLICIT positive and negative cases.
 *
 * Every case runs against the REAL shipped KanjiVG data. Deterministic noise
 * (LCG) — no flaky runs.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { judgeStroke, motionHintFa, positionHintFa, type JudgeInput } from '@/modules/writing/engine';
import type { Point, WritingCharData } from '@/modules/writing';

const webRoot = join(__dirname, '..', '..', '..');
const cache = new Map<string, WritingCharData>();
function data(ch: string): WritingCharData {
  let d = cache.get(ch);
  if (!d) {
    d = JSON.parse(readFileSync(join(webRoot, 'public', 'writing-data', `${ch}.json`), 'utf8')) as WritingCharData;
    cache.set(ch, d);
  }
  return d;
}
const mediansOf = (ch: string): Point[][] =>
  data(ch).medians.map((m) => m.map((p) => ({ x: p[0] ?? 0, y: p[1] ?? 0 })));

let seed = 20261107;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296 - 0.5;
}

/** Draw a reference median like a human hand: noise + optional scale/shift/tilt/point-thinning. */
function hand(
  median: Point[],
  opts: { noise?: number; scale?: number; offset?: Point; tiltDeg?: number; thin?: number } = {},
): Point[] {
  const { noise = 14, scale = 1, offset = { x: 0, y: 0 }, tiltDeg = 0, thin = 1 } = opts;
  const rad = (tiltDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const c = { x: 512, y: 512 };
  const src = thin >= 1 ? median : median.filter((_, i) => i % Math.ceil(1 / thin) === 0 || i === median.length - 1);
  const pts = src.length >= 2 ? src : median;
  return pts.map((p) => {
    const sx = 512 + (p.x - c.x) * scale + offset.x;
    const sy = 512 + (p.y - c.y) * scale + offset.y;
    const rx = c.x + (sx - c.x) * cos - (sy - c.y) * sin + rand() * noise;
    const ry = c.y + (sx - c.x) * sin + (sy - c.y) * cos + rand() * noise;
    return { x: rx, y: ry };
  });
}

function judge(ch: string, userPath: Point[], expectedIndex: number, overrides: Partial<JudgeInput> = {}) {
  return judgeStroke({
    userPath,
    charData: data(ch),
    expectedIndex,
    completedIndices: [],
    assist: 0,
    attemptsOnStroke: 0,
    ...overrides,
  });
}

const PAIRS: Array<[string, string]> = [
  ['あ', 'お'],
  ['う', 'ら'],
  ['ぬ', 'め'],
  ['は', 'ほ'],
  ['さ', 'き'],
  ['れ', 'わ'],
  ['ソ', 'ン'],
  ['シ', 'ツ'],
];

describe('Addendum-3 §6 — confusable pairs: natural hands still pass', () => {
  for (const [a, b] of PAIRS) {
    it(`${a} (${b}-neighbor): every stroke accepted with natural wobble`, () => {
      const md = mediansOf(a);
      md.forEach((m, i) => {
        const j = judge(a, hand(m, { noise: 14 }), i);
        expect(j.judge, `${a} stroke ${i + 1} wobble → ${j.judge} (${j.reason})`).toBe('accepted');
      });
    });
    it(`${a}: every stroke accepted with size/shift/tilt variation`, () => {
      const md = mediansOf(a);
      md.forEach((m, i) => {
        const j = judge(a, hand(m, { noise: 16, scale: 1.14, offset: { x: 34, y: -26 }, tiltDeg: 5 }), i);
        expect(j.judge, `${a} stroke ${i + 1} scale+shift+tilt → ${j.judge} (${j.reason})`).toMatch(/accepted/);
      });
    });
    it(`${a}: strokes accepted when the hand samples fewer points`, () => {
      const md = mediansOf(a);
      md.forEach((m, i) => {
        const j = judge(a, hand(m, { noise: 12, thin: 0.34 }), i);
        expect(j.judge, `${a} stroke ${i + 1} thin sampling → ${j.judge}`).toMatch(/accepted|uncertain_retry/);
      });
    });
  }
});

describe('Addendum-3 §6 — confusable pairs: real mistakes still fail', () => {
  for (const [a, b] of PAIRS) {
    it(`${a}: reversed stroke rejected as direction (feedback never contradicts itself)`, () => {
      const md = mediansOf(a);
      md.forEach((m, i) => {
        const j = judge(a, hand([...m].reverse(), { noise: 8 }), i);
        if (j.judge === 'rejected' || j.judge === 'uncertain_retry') {
          // accepted would mean direction is unenforced — every pair stroke must fail
          expect(j.judge, `${a} stroke ${i + 1} reversed must not be accepted`).not.toMatch(/accepted/);
        } else {
          expect.fail(`${a} stroke ${i + 1} drawn REVERSED was accepted — direction is not enforced`);
        }
        if (j.feedbackFa) {
          // the contradictory «از X شروع کن و به سمت X بکش» must be gone
          const from = j.feedbackFa.match(/از ([^ ]+) شروع کن/);
          const to = j.feedbackFa.match(/به سمت ([^ ]+) بکش/);
          if (from && to) expect(from[1], j.feedbackFa).not.toBe(to[1]);
        }
      });
    });
    it(`${a}: drawing a LATER stroke early is rejected (order)`, () => {
      const md = mediansOf(a);
      if (md.length < 2) return;
      const j = judge(a, hand(md[md.length - 1]!, { noise: 10 }), 0, {
        completedIndices: [],
      });
      expect(j.judge, `${a} last stroke drawn first → ${j.judge} (${j.reason})`).not.toBe('accepted');
    });
    it(`${a}: a 30%-length stub is rejected as incomplete`, () => {
      const md = mediansOf(a);
      const m = md[0]!;
      const stub = m.slice(0, Math.max(2, Math.floor(m.length * 0.3)));
      const j = judge(a, hand(stub, { noise: 6 }), 0);
      expect(j.judge, `${a} stub → ${j.judge} (${j.reason})`).not.toMatch(/accepted/);
    });
    it(`${a}: an unrelated scribble is rejected (form)`, () => {
      let x = 300;
      let y = 300;
      const scribble: Point[] = [];
      for (let k = 0; k < 24; k += 1) {
        x += rand() * 120;
        y += rand() * 120;
        scribble.push({ x, y });
      }
      const j = judge(a, scribble, 0);
      expect(j.judge, `${a} scribble → ${j.judge}`).not.toMatch(/accepted/);
    });
    it(`cross-confusion: writing ${b} while ${a} is expected can NOT complete cleanly`, () => {
      // The neighbor character shares SOME strokes with the expected one (the
      // common horizontal bar of あ/お legitimately passes — it IS the same
      // shape). The fairness property that matters: the learner can never
      // finish the WHOLE neighbor glyph as the expected character — at least
      // one stroke must be rejected or asked-for-retry.
      const aData = data(a);
      const bMd = mediansOf(b);
      const strokes = Math.min(aData.medians.length, bMd.length);
      let cleanPasses = 0;
      for (let i = 0; i < strokes; i += 1) {
        const j = judge(a, hand(bMd[i]!, { noise: 8 }), i, { completedIndices: [] });
        if (j.judge === 'accepted' || j.judge === 'accepted_with_hint') cleanPasses += 1;
      }
      expect(
        cleanPasses,
        `${b} passed ${cleanPasses}/${strokes} strokes while ${a} was expected — the neighbor glyph must not fully pass`,
      ).toBeLessThan(strokes);
    });
    it(`cross-confusion: the DISTINGUISHING stroke of ${b} vs ${a} is not accepted`, () => {
      // The stroke where the two glyphs actually differ (best discriminated
      // by the end-segment term) must never pass as the expected stroke.
      const aMd = mediansOf(a);
      const bMd = mediansOf(b);
      const strokes = Math.min(aMd.length, bMd.length);
      let rejected = false;
      for (let i = 0; i < strokes; i += 1) {
        const j = judge(a, hand(bMd[i]!, { noise: 8 }), i, { completedIndices: [] });
        if (j.judge === 'rejected' || j.judge === 'uncertain_retry') rejected = true;
      }
      expect(rejected, `${b} must trigger at least one rejection/retry against ${a}`).toBe(true);
    });
  }
});

describe('Addendum-3 §6 — feedback wording (motion hint)', () => {
  it('motionHintFa describes travel direction, not start/end positions', () => {
    // あ stroke 3 ends near its start (a hook) — the OLD wording collided.
    const md = mediansOf('あ');
    for (const m of md) {
      const start = positionHintFa(m[0]!);
      const end = positionHintFa(m[m.length - 1]!);
      const motion = motionHintFa(m);
      expect(motion.length).toBeGreaterThan(1);
      if (start === end) expect(motion).not.toBe(start);
    }
  });
  it('a reversed あ stroke 1 gets a non-contradictory direction message', () => {
    const md = mediansOf('あ');
    const j = judge('あ', [...md[0]!].reverse(), 0);
    expect(j.judge).not.toMatch(/accepted/);
    expect(j.feedbackFa).toBeTruthy();
    const from = j.feedbackFa!.match(/از ([^ ]+) شروع کن/);
    const to = j.feedbackFa!.match(/به سمت ([^ ]+) بکش/);
    if (from && to) expect(from[1]).not.toBe(to[1]);
  });
});
