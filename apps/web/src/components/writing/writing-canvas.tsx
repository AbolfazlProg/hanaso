'use client';
/**
 * HANASO — WritingCanvas v5 (TASK-LEARNING-08 Addendum-3).
 *
 * ONE canvas is the heart of the whole lesson — the character LIVES here from
 * the first second to the last (owner §1: one page, one environment):
 *
 *   intro     — the TEACHING pass runs HERE as the FIRST content the learner
 *               sees (Addendum-3 §5): each stroke flows in slowly with its
 *               Persian NUMBER badge, the pulsing start dot and the direction
 *               arrow — not a faint static template.
 *   reference — the finished glyph rests in soft ink (the ready beat after
 *               the teaching pass; the canvas never disappears).
 *   guided    — trace the dashed guide; the v2.1 engine judges fairly.
 *   free      — write from memory; the reference reveals under the ink.
 *
 * Addendum-3 §13 — PER-STROKE replacement: the moment a stroke is ACCEPTED,
 * its raw hand path cross-fades into the PRECISE standard stroke (same ink
 * width) right where the hand just was — stroke by stroke, NOT once at the
 * end of the whole character. A mistake never wipes previously accepted
 * standard strokes, and the accepted set survives «تکرار آموزش» replays.
 *
 * Addendum-3 §2 — «تکرار آموزش»: `replaySignal` re-runs the numbered teaching
 * animation IN PLACE (audio + narration synced by the parent) for ANY stage —
 * no page reset, no lesson reset, no state loss; rapid clicks are absorbed.
 * Addendum-4 §1 — when a replay (or the first pass) finishes, the finished form
 * rests at FULL ink strength in the same canvas: the strokes never fade away.
 *
 * Repeatability contract (#117 §2/§10): restarts, rapid mode switches and
 * mid-draw exits are cancelled by generation token — no promise survives its
 * mode, no button ever dies.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyJudgement,
  assistLevelOf,
  createAttemptState,
  judgeStroke,
  type StrokeJudgement,
  type WritingAttemptState,
} from '@/modules/writing/engine';
import {
  CLEAR_FADE_MS,
  DEMO_INTER_STROKE_MS,
  GUIDE_WIDTH,
  MORPH_SAMPLES,
  MORPH_STROKE_MS,
  STROKE_WIDTH,
  directionArrow,
  easeInOutCubic,
  flattenPathD,
  livePathD,
  morphPolylineD,
  pointAt,
  resamplePolyline,
  strokeDemoMs,
} from '@/modules/writing/render';
import { loadWritingCharData, writingAvailability, type Point, type WritingCharData } from '@/modules/writing';

export type WritingMode = 'intro' | 'demo' | 'guided' | 'free' | 'reference';

export interface WritingCanvasProps {
  character: string;
  mode: WritingMode;
  /** Fired for every judged stroke (accepted or not) with the live attempt state. */
  onJudgement?: (judgement: StrokeJudgement, state: WritingAttemptState) => void;
  /** Fired once when ALL strokes of the practice attempt are accepted. */
  onAttemptComplete?: (state: WritingAttemptState) => void;
  /** Fired once when the intro (teaching pass) finishes all strokes. */
  onIntroDone?: () => void;
  /** Fired once when a 'demo'-mode teaching pass finishes (drill contexts). */
  onDemoDone?: () => void;
  /** Fired when a teaching stroke begins — syncs the parent's narration panel. */
  onDemoStrokeStart?: (strokeIndex: number) => void;
  /**
   * Addendum-3 §2 — bump to replay the numbered teaching animation from the
   * first stroke, IN PLACE (any stage). The attempt state is NOT reset.
   */
  replaySignal?: number;
  /** Fires when a §2 replay finishes (the parent re-enables the button). */
  onReplayDone?: () => void;
  /** Bump to restart: intro from stroke 0, practice as a fresh attempt. */
  restartSignal?: number;
  /** Bump to flash the current stroke's guide once (help escalation). */
  hintSignal?: number;
  /** free mode: overlay the reference after completion (default true). */
  revealOnDone?: boolean;
  /**
   * Approved kana-introduction layout: the hero teaching canvas of a KanaCard
   * renders LARGER than the drill canvas. Optional — every context that does
   * not pass it keeps the historical 26rem square.
   */
  maxWidthRem?: number;
  className?: string;
}

interface DemoProgress {
  /** Stroke currently drawing (-1 = none yet, -2 = finished). */
  stroke: number;
  /** Strokes fully revealed so far. */
  shown: number[];
}

/**
 * One flowing stroke: mounts hidden (dashoffset 1) and flows in (→ 0) via a
 * double-rAF so the browser paints the hidden frame before transitioning —
 * the ink-flow reveal. Restart-safe: a remount (key change) replays cleanly.
 */
function DemoStrokePath({ d, ms }: { d: string; ms: number }) {
  const [offset, setOffset] = useState(1);
  useEffect(() => {
    setOffset(1);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOffset(0));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [d, ms]);
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      className="text-ink"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={offset}
      style={{ transition: `stroke-dashoffset ${ms}ms cubic-bezier(.4,0,.2,1)` }}
    />
  );
}

/** Persian digits for the on-canvas stroke badge. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}

/**
 * Addendum-5 §2 — the accepted stroke's MORPH: the learner's OWN line stays on
 * the paper and is gently CORRECTED into the precise standard path (never
 * erased and re-drawn from the start — the owner's explicit rule). Both paths
 * are flattened/resampled to the same arc-length grid, then interpolated
 * point-by-point with an ease-in-out curve; at t=1 the EXACT standard `d`
 * takes over (pixel-identical to the pre-morph era, so what rests on the paper
 * is still the precise KanjiVG form). Previously accepted strokes are other
 * instances of this component and are never touched by a later morph.
 */
function MorphStroke({ userPoints, standardD, index }: { userPoints: Point[]; standardD: string; index: number }) {
  // correspondence grid — computed once per mount (pure math, jsdom-safe)
  const { from, to, degenerate } = useMemo(() => {
    const std = flattenPathD(standardD);
    let userLen = 0;
    for (let i = 1; i < userPoints.length; i += 1) {
      userLen += Math.hypot(userPoints[i]!.x - userPoints[i - 1]!.x, userPoints[i]!.y - userPoints[i - 1]!.y);
    }
    if (std.length < 2 || userPoints.length < 2 || userLen < 8) {
      // degenerate geometry — the owner's fallback: a short in-place crossfade
      return { from: null, to: null, degenerate: true as const };
    }
    return {
      from: resamplePolyline(userPoints, MORPH_SAMPLES),
      to: resamplePolyline(std, MORPH_SAMPLES),
      degenerate: false as const,
    };
  }, [userPoints, standardD]);

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (degenerate) {
      // crossfade fallback: the standard form fades in over the (tiny) ink
      const r = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(r);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / MORPH_STROKE_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [degenerate]);

  const settled = progress >= 1;
  const d = settled || degenerate || !from || !to ? standardD : morphPolylineD(from, to, easeInOutCubic(progress));
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      className="text-ink"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.95}
      data-std-stroke={index}
      data-morphing={settled || degenerate ? undefined : 'true'}
    />
  );
}

/**
 * Addendum-4 §1 — the finished glyph resting after the teaching pass (and after
 * any replay): the FULL standard form stays on the paper — complete, clear,
 * same ink width as the animation — NEVER a faint ghost that fades out. Small
 * persistent stroke-number badges keep the stroke ORDER observable while the
 * learner inspects the final form.
 */
function ReferenceGlyph({
  charData,
  medians,
  opacity = 0.95,
}: {
  charData: WritingCharData;
  medians: Point[][];
  opacity?: number;
}) {
  return (
    <>
      {charData.strokes.map((d, i) => (
        <path
          key={`ref-${i}`}
          d={d}
          fill="none"
          stroke="currentColor"
          className="text-ink"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
          data-ref-stroke={i}
        />
      ))}
      {medians.map((median, i) => {
        if (median.length < 2) return null;
        const at = pointAt(median, 0.2);
        return (
          <g key={`ref-badge-${i}`} opacity={0.82} data-ref-badge={i}>
            <circle
              cx={at.x}
              cy={at.y}
              r={30}
              fill="var(--color-paper)"
              stroke="currentColor"
              className="text-shu"
              strokeWidth={4}
            />
            <text
              x={at.x}
              y={at.y + 11}
              textAnchor="middle"
              fontSize={34}
              fontWeight={800}
              fill="currentColor"
              className="text-shu"
            >
              {faNum(i + 1)}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function WritingCanvas({
  character,
  mode,
  onJudgement,
  onAttemptComplete,
  onIntroDone,
  onDemoDone,
  onDemoStrokeStart,
  replaySignal = 0,
  onReplayDone,
  restartSignal = 0,
  hintSignal = 0,
  revealOnDone = true,
  className,
  maxWidthRem,
}: WritingCanvasProps) {
  const [availability, setAvailability] = useState<'loading' | 'available' | 'data_missing'>('loading');
  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [attempt, setAttempt] = useState<WritingAttemptState>(() => createAttemptState(character));
  const [attemptDone, setAttemptDone] = useState(false);
  const [live, setLive] = useState<Point[]>([]);
  /** Addendum-5 §2 — each accepted stroke's live morph entry (user ink →
   * standard form, in place). Rendered by <MorphStroke>; settles to the exact
   * standard `d` and stays until the attempt resets. */
  const [morphInk, setMorphInk] = useState<Array<{ key: number; index: number; points: Point[] }>>([]);
  /** Accepted standard strokes fading OUT when a new attempt clears the paper (§3). */
  const [clearing, setClearing] = useState<Array<{ d: string; key: number }>>([]);
  /** Rejected strokes fading away. */
  const [fading, setFading] = useState<Array<{ d: string; key: number }>>([]);
  const [demo, setDemo] = useState<DemoProgress>({ stroke: -1, shown: [] });
  /** §2 — a numbered teaching replay is running (any stage). */
  const [replaying, setReplaying] = useState(false);
  const [hintFlash, setHintFlash] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const liveRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const attemptRef = useRef(attempt);
  const fadeKeyRef = useRef(0);
  const replayBusyRef = useRef(false);
  const replayStopRef = useRef<(() => void) | null>(null);
  /** Indices of accepted strokes — drives the soft-clear in the reset effect (§3). */
  const acceptedRef = useRef<number[]>([]);
  /** Latest callbacks (refs) so the teaching loop never restarts on identity changes. */
  const introDoneRef = useRef(onIntroDone);
  const demoDoneRef = useRef(onDemoDone);
  const replayDoneRef = useRef(onReplayDone);
  const demoStrokeStartRef = useRef(onDemoStrokeStart);
  introDoneRef.current = onIntroDone;
  demoDoneRef.current = onDemoDone;
  replayDoneRef.current = onReplayDone;
  demoStrokeStartRef.current = onDemoStrokeStart;

  attemptRef.current = attempt;
  const medians = useMemo(
    () => (charData ? charData.medians.map((m) => m.map((p) => ({ x: p[0] ?? 0, y: p[1] ?? 0 }))) : []),
    [charData],
  );
  const totalStrokes = medians.length;

  // ---------------------------------------------------------------- data load
  useEffect(() => {
    let cancelled = false;
    setAvailability('loading');
    setCharData(null);
    void writingAvailability(character).then((a) => {
      if (cancelled) return;
      if (a.status !== 'available') {
        setAvailability('data_missing');
        return;
      }
      loadWritingCharData(character)
        .then((d) => {
          if (!cancelled) {
            setCharData(d);
            setAvailability('available');
          }
        })
        .catch(() => {
          if (!cancelled) setAvailability('data_missing');
        });
    });
    return () => {
      cancelled = true;
    };
  }, [character]);

  // fresh attempt whenever the character, mode (practice kind) or restart changes.
  // Addendum-3 §3: previously-accepted standard strokes don't VANISH — they
  // cross-fade out softly (paper-stay transition), never a hard flash.
  useEffect(() => {
    if (availability !== 'available') return;
    const prev = acceptedRef.current;
    if (prev.length > 0 && charData) {
      prev.forEach((i) => {
        fadeKeyRef.current += 1;
        const key = fadeKeyRef.current;
        const d = charData.strokes[i]!;
        setClearing((c) => [...c, { d, key }]);
        setTimeout(() => setClearing((c) => c.filter((x) => x.key !== key)), CLEAR_FADE_MS + 120);
      });
    }
    acceptedRef.current = [];
    setAttempt(createAttemptState(character));
    setAttemptDone(false);
    setLive([]);
    liveRef.current = [];
    drawingRef.current = false;
    setDemo({ stroke: -1, shown: [] });
    setMorphInk([]);
    // charData intentionally not a dep — only read for the soft clear above
  }, [availability, character, mode, restartSignal]);

  // ------------------------------------------------- the numbered teaching loop
  // (intro mode — Addendum-3 §5: this IS the first content the learner sees,
  //  and the §2 «تکرار آموزش» replay runs the very same pass in place)
  const runTeachingLoop = useCallback(
    (opts: { isReplay: boolean; kind: 'intro' | 'demo' }) => {
      const { isReplay, kind } = opts;
      setDemo({ stroke: -1, shown: [] });
      const timers: ReturnType<typeof setTimeout>[] = [];
      let cancelled = false;
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
          timers.push(setTimeout(resolve, ms));
        });
      void (async () => {
        await sleep(350);
        for (let i = 0; i < charData!.strokes.length && !cancelled; i += 1) {
          demoStrokeStartRef.current?.(i);
          setDemo({ stroke: i, shown: [...Array.from({ length: i }, (_, k) => k)] });
          const median = medians[i] ?? [];
          await sleep(strokeDemoMs(median));
          if (cancelled) return;
          await sleep(DEMO_INTER_STROKE_MS);
        }
        if (!cancelled) {
          setDemo({ stroke: -2, shown: Array.from({ length: charData!.strokes.length }, (_, k) => k) });
          if (isReplay) {
            setReplaying(false);
            replayBusyRef.current = false;
            replayDoneRef.current?.();
          } else if (kind === 'demo') {
            demoDoneRef.current?.();
          } else {
            introDoneRef.current?.();
          }
        }
      })();
      return () => {
        cancelled = true;
        for (const t of timers) clearTimeout(t);
      };
    },
    // callbacks are deliberately NOT deps (they live in refs) — re-running the
    // loop on their identity changes would restart the animation mid-stroke
    [charData, medians],
  );

  useEffect(() => {
    if ((mode !== 'intro' && mode !== 'demo') || !charData || availability !== 'available') return;
    return runTeachingLoop({ isReplay: false, kind: mode });
  }, [mode, charData, availability, restartSignal, runTeachingLoop]);

  // ------------------------------------------------- §2 — «تکرار آموزش» replay
  useEffect(() => {
    if (replaySignal === 0) return;
    if (!charData || availability !== 'available') return;
    // The intro/demo stages restart their own loop via restartSignal — a §2
    // replay is only for the LATER stages (ready/guided/free/done).
    if (mode === 'intro' || mode === 'demo') return;
    // Rapid-click guard (§2): a signal bump while a replay is running is
    // absorbed — the running animation is NEVER cancelled, no double run.
    if (replayBusyRef.current) return;
    replayBusyRef.current = true;
    setReplaying(true);
    replayStopRef.current = runTeachingLoop({ isReplay: true, kind: 'demo' });
    // No cleanup-on-rerun: a later signal must not kill the in-flight replay.
  }, [replaySignal]);

  // unmount / character switch: halt any running replay
  useEffect(
    () => () => {
      replayStopRef.current?.();
      replayStopRef.current = null;
      replayBusyRef.current = false;
    },
    // unmount-only cleanup (also fires on a character switch)
    [character],
  );

  // ---------------------------------------------------------------- hint flash
  useEffect(() => {
    if (hintSignal === 0) return;
    setHintFlash((n) => n + 1);
    const t = setTimeout(() => setHintFlash(0), 1400);
    return () => clearTimeout(t);
  }, [hintSignal]);

  // ---------------------------------------------------------------- pointer input
  const toCharSpace = useCallback((clientX: number, clientY: number): Point | null => {
    const el = svgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 1024,
      y: ((clientY - rect.top) / rect.height) * 1024,
    };
  }, []);

  const finishStroke = useCallback(() => {
    const pts = liveRef.current;
    liveRef.current = [];
    setLive([]);
    if (pts.length < 1 || !charData || attemptDone || replaying) return;
    const state = attemptRef.current;
    const judgement = judgeStroke({
      userPath: pts,
      charData,
      expectedIndex: Math.min(state.expectedIndex, totalStrokes - 1),
      completedIndices: state.completed,
      assist: assistLevelOf(state.missesOnStroke),
      attemptsOnStroke: state.missesOnStroke,
    });
    const { state: next, done } = applyJudgement(state, judgement, totalStrokes);
    attemptRef.current = next;
    setAttempt(next);
    if (judgement.judge === 'accepted' || judgement.judge === 'accepted_with_hint') {
      // Addendum-5 §2 — per-stroke replacement as a MORPH: the raw hand ink is
      // NOT erased and re-drawn; it stays exactly where the hand left it and is
      // gently corrected into the precise standard stroke (see <MorphStroke>).
      // Previously accepted strokes are untouched.
      const acceptedIndex = Math.min(state.expectedIndex, totalStrokes - 1);
      fadeKeyRef.current += 1;
      const key = fadeKeyRef.current;
      setMorphInk((m) => [...m, { key, index: acceptedIndex, points: pts }]);
      acceptedRef.current = [...acceptedRef.current, acceptedIndex];
    } else {
      fadeKeyRef.current += 1;
      const key = fadeKeyRef.current;
      setFading((f) => [...f, { d: livePathD(pts), key }]);
      setTimeout(() => setFading((f) => f.filter((x) => x.key !== key)), 650);
    }
    if (done) setAttemptDone(true);
    onJudgement?.(judgement, next);
    if (done) onAttemptComplete?.(next);
  }, [attemptDone, charData, onAttemptComplete, onJudgement, replaying, totalStrokes]);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (mode !== 'guided' && mode !== 'free') return;
      if (attemptDone || !charData || replaying) return;
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch {
        /* older engines / test DOMs without pointer capture — drawing still works */
      }
      const p = toCharSpace(ev.clientX, ev.clientY);
      if (!p) return;
      drawingRef.current = true;
      liveRef.current = [p];
      setLive([p]);
    },
    [attemptDone, charData, mode, replaying, toCharSpace],
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      const p = toCharSpace(ev.clientX, ev.clientY);
      if (!p) return;
      const last = liveRef.current[liveRef.current.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 4) return;
      liveRef.current = [...liveRef.current, p];
      setLive(liveRef.current);
    },
    [toCharSpace],
  );

  const onPointerUp = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      try {
        if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        }
      } catch {
        /* ignore */
      }
      finishStroke();
    },
    [finishStroke],
  );

  // ---------------------------------------------------------------- render
  if (availability === 'loading') {
    // Addendum-3 §3 — a paper-stay skeleton: SAME frame, SAME square, a soft
    // ink shimmer — never a text box that reflows the layout or old content
    // that flashes. (With the §10 prefetch the real data is usually already
    // cached and this frame is never seen at all.)
    return (
      <div
        className={`frame-ink relative overflow-hidden rounded-lg bg-paper shadow-card ${className ?? ''}`}
        style={{ width: '100%', maxWidth: `${maxWidthRem ?? 26}rem`, aspectRatio: '1 / 1' }}
        role="img"
        aria-label="در حال آماده‌سازی دفتر نوشتن"
        data-canvas-skeleton
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-24 rounded-full border-2 border-dashed border-ink-faint/60 ink-shimmer" />
        </div>
      </div>
    );
  }
  if (availability === 'data_missing') {
    return (
      <div className="rounded-md border border-ink-faint bg-card p-4" dir="rtl">
        <p className="text-small font-bold text-ink">دادهٔ نوشتار برای این نویسه موجود نیست</p>
        <p className="mt-1 text-small text-ink-faint">
          برای «{character}» هنوز دادهٔ ترتیب ضربه‌ها فراهم نشده؛ تمرین ساختگی ساخته نمی‌شود.
        </p>
      </div>
    );
  }
  if (!charData) return null;

  const isTeaching = replaying || mode === 'intro' || mode === 'demo';
  const practiceMode = replaying ? 'none' : mode;
  const expected = Math.min(attempt.expectedIndex, totalStrokes - 1);
  const guideMedian = medians[expected] ?? [];
  const arrow = guideMedian.length >= 2 ? directionArrow(guideMedian) : null;
  const guided = practiceMode === 'guided' && !attemptDone;
  const freeReveal = practiceMode === 'free' && attemptDone && revealOnDone;

  // teaching decorations (owner §2): badge number + start dot + direction
  // arrow of the stroke currently being drawn — on the canvas itself.
  const demoMedian = isTeaching && demo.stroke >= 0 ? (medians[demo.stroke] ?? []) : [];
  const demoArrow = demoMedian.length >= 2 ? directionArrow(demoMedian) : null;
  const demoBadgeAt = demoMedian.length >= 2 ? pointAt(demoMedian, 0.62) : null;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={`محل نوشتن ${character} — ${totalStrokes} ضربه`}
      className={`frame-ink touch-none select-none rounded-lg bg-paper shadow-card ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ width: '100%', maxWidth: `${maxWidthRem ?? 26}rem`, aspectRatio: '1 / 1' }}
      data-replaying={replaying ? 'true' : undefined}
    >
      {/* faint character frame guides (paper feel) */}
      <line
        x1="512"
        y1="24"
        x2="512"
        y2="1000"
        stroke="currentColor"
        className="text-ink"
        opacity={0.06}
        strokeWidth={2}
      />
      <line
        x1="24"
        y1="512"
        x2="1000"
        y2="512"
        stroke="currentColor"
        className="text-ink"
        opacity={0.06}
        strokeWidth={2}
      />

      {/* reference: the finished glyph rests in FULL standard ink (Addendum-4
          §1 — what the teaching pass drew STAYS: complete and clear, with the
          small order badges; never a faint one-line ghost) */}
      {practiceMode === 'reference' && <ReferenceGlyph charData={charData} medians={medians} />}

      {/* teaching pass: strokes revealed so far + the one flowing in now */}
      {isTeaching &&
        demo.shown.map((i) => (
          <path
            key={`demo-${i}`}
            d={charData.strokes[i]!}
            fill="none"
            stroke="currentColor"
            className="text-ink"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
        ))}
      {isTeaching && demo.stroke >= 0 && (
        <DemoStrokePath
          key={`demo-live-${demo.stroke}`}
          d={charData.strokes[demo.stroke]!}
          ms={strokeDemoMs(medians[demo.stroke] ?? [])}
        />
      )}

      {/* teaching decorations: Persian number badge + start dot + direction arrow */}
      {isTeaching && demo.stroke >= 0 && demoBadgeAt && (
        <g>
          <circle
            cx={demoBadgeAt.x}
            cy={demoBadgeAt.y}
            r={52}
            fill="var(--color-paper)"
            stroke="currentColor"
            className="text-shu"
            strokeWidth={6}
            opacity={0.96}
          />
          <text
            x={demoBadgeAt.x}
            y={demoBadgeAt.y + 20}
            textAnchor="middle"
            fontSize={64}
            fontWeight={800}
            fill="currentColor"
            className="text-shu"
          >
            {faNum(demo.stroke + 1)}
          </text>
        </g>
      )}
      {isTeaching && demo.stroke >= 0 && demoMedian.length >= 2 && (
        <g>
          <circle
            cx={demoMedian[0]!.x}
            cy={demoMedian[0]!.y}
            r={30}
            fill="currentColor"
            className="text-shu"
            opacity={0.92}
          >
            <animate attributeName="r" values="26;34;26" dur="1.6s" repeatCount="indefinite" />
          </circle>
          {demoArrow && (
            <g
              transform={`translate(${demoArrow.tip.x} ${demoArrow.tip.y}) rotate(${demoArrow.angleDeg})`}
              opacity={0.85}
            >
              <path d="M0,0 L-38,-20 L-30,0 L-38,20 Z" fill="currentColor" className="text-shu" />
            </g>
          )}
        </g>
      )}

      {/* practice: the accepted strokes — the learner's ink MORPHED into the
          precise standard form, in place (Addendum-3 §13 per-stroke +
          Addendum-5 §2 morph — never a redraw from the start) */}
      {!isTeaching &&
        morphInk.map((m) => (
          <MorphStroke
            key={`morph-${m.key}`}
            userPoints={m.points}
            standardD={charData.strokes[m.index]!}
            index={m.index}
          />
        ))}

      {/* §3: accepted strokes softly fading when a new attempt clears the paper */}
      {clearing.map((c) => (
        <path
          key={`clear-${c.key}`}
          d={c.d}
          fill="none"
          stroke="currentColor"
          className="text-ink"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-ink-clearing
          opacity={0.85}
          style={{ transition: `opacity ${CLEAR_FADE_MS}ms ease-out`, opacity: 0 }}
        />
      ))}

      {/* free-mode reveal after completion (drill contexts — the reference
          under the user's ink) */}
      {freeReveal && (
        <g opacity={0.28}>
          {charData.strokes.map((d, i) => (
            <path
              key={`reveal-${i}`}
              d={d}
              fill="none"
              stroke="currentColor"
              className="text-ai"
              strokeWidth={STROKE_WIDTH * 0.72}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}

      {/* guided: dashed guide for the expected stroke + start marker + arrow */}
      {(guided || (practiceMode === 'free' && hintFlash > 0 && !attemptDone)) && guideMedian.length >= 2 && (
        <>
          <path
            d={charData.strokes[expected]!}
            fill="none"
            stroke="currentColor"
            className="text-ai"
            strokeWidth={GUIDE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={practiceMode === 'free' ? 0.5 : 0.55}
            pathLength={1}
            strokeDasharray="0.042 0.065"
          />
          <circle
            cx={guideMedian[0]!.x}
            cy={guideMedian[0]!.y}
            r={30}
            fill="currentColor"
            className="text-shu"
            opacity={0.92}
          >
            <animate attributeName="r" values="26;34;26" dur="1.6s" repeatCount="indefinite" />
          </circle>
          {arrow && (
            <g transform={`translate(${arrow.tip.x} ${arrow.tip.y}) rotate(${arrow.angleDeg})`} opacity={0.85}>
              <path d="M0,0 L-38,-20 L-30,0 L-38,20 Z" fill="currentColor" className="text-shu" />
            </g>
          )}
        </>
      )}

      {/* the learner's live pen stroke */}
      {live.length >= 1 && (
        <path
          d={livePathD(live)}
          fill="none"
          stroke="currentColor"
          className="text-ink"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* rejected strokes fade away */}
      {fading.map((f) => (
        <path
          key={`fade-${f.key}`}
          d={f.d}
          fill="none"
          stroke="currentColor"
          className="text-error opacity-60"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'opacity 600ms ease-out', opacity: 0.05 }}
        />
      ))}
    </svg>
  );
}
