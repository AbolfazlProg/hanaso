'use client';
/**
 * HANASO — WritingCanvas v4 (TASK-LEARNING-08 v4 — owner final correction).
 *
 * ONE canvas is the heart of the whole lesson — the character LIVES here from
 * the first second (owner §1: one page, one environment, no stage-switching):
 *
 *   intro     — the glyph writes itself in one flowing ink motion (first
 *               encounter; the sound plays over it). No numbers yet — a clean
 *               first impression of the character as a whole.
 *   demo      — the teaching pass: each stroke drawn slowly with its Persian
 *               NUMBER badge on the canvas, the pulsing start dot and the
 *               direction arrow (owner §2: شماره، نقطهٔ شروع و جهت روی کادر).
 *   reference — the finished glyph rests in soft ink while the explanations
 *               unfold around the canvas (explain stage — the canvas never
 *               disappears).
 *   guided    — trace the dashed guide; the v2 engine judges fairly.
 *   free      — write from memory; the reference reveals under the ink.
 *
 * Repeatability contract (#117 §2/§10 + owner §4): demo/intro restarts, rapid
 * mode switches and mid-draw exits are cancelled by generation token — no
 * promise survives its mode, no button ever dies.
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
  DEMO_INTER_STROKE_MS,
  INTRO_INTER_STROKE_MS,
  STROKE_WIDTH,
  directionArrow,
  livePathD,
  pointAt,
  strokeDemoMs,
  strokeIntroMs,
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
  /** Fired once when the demo finishes all strokes. */
  onDemoDone?: () => void;
  /** Fired once when the intro (first-encounter ink-in) finishes. */
  onIntroDone?: () => void;
  /** Fired when a demo stroke begins — syncs the parent's narration panel. */
  onDemoStrokeStart?: (strokeIndex: number) => void;
  /** Bump to restart: demo/intro from stroke 0, practice as a fresh attempt. */
  restartSignal?: number;
  /** Bump to flash the current stroke's guide once (help escalation). */
  hintSignal?: number;
  /** free mode: overlay the reference after completion (default true). */
  revealOnDone?: boolean;
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

export function WritingCanvas({
  character,
  mode,
  onJudgement,
  onAttemptComplete,
  onDemoDone,
  onIntroDone,
  onDemoStrokeStart,
  restartSignal = 0,
  hintSignal = 0,
  revealOnDone = true,
  className,
}: WritingCanvasProps) {
  const [availability, setAvailability] = useState<'loading' | 'available' | 'data_missing'>('loading');
  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [attempt, setAttempt] = useState<WritingAttemptState>(() => createAttemptState(character));
  const [attemptDone, setAttemptDone] = useState(false);
  const [live, setLive] = useState<Point[]>([]);
  const [acceptedPaths, setAcceptedPaths] = useState<string[]>([]);
  const [fading, setFading] = useState<Array<{ d: string; key: number }>>([]);
  const [demo, setDemo] = useState<DemoProgress>({ stroke: -1, shown: [] });
  const [hintFlash, setHintFlash] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const liveRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const attemptRef = useRef(attempt);
  const fadeKeyRef = useRef(0);

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

  // fresh attempt whenever the character, mode (practice kind) or restart changes
  useEffect(() => {
    if (availability !== 'available') return;
    setAttempt(createAttemptState(character));
    setAttemptDone(false);
    setAcceptedPaths([]);
    setLive([]);
    liveRef.current = [];
    drawingRef.current = false;
    setFading([]);
    setDemo({ stroke: -1, shown: [] });
  }, [availability, character, mode, restartSignal]);

  // ------------------------------------------------- intro / demo show loop
  useEffect(() => {
    if ((mode !== 'demo' && mode !== 'intro') || !charData || availability !== 'available') return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, ms));
      });
    const isIntro = mode === 'intro';
    void (async () => {
      setDemo({ stroke: -1, shown: [] });
      await sleep(isIntro ? 420 : 350);
      for (let i = 0; i < charData.strokes.length && !cancelled; i += 1) {
        if (!isIntro) onDemoStrokeStart?.(i);
        setDemo({ stroke: i, shown: [...Array.from({ length: i }, (_, k) => k)] });
        const median = medians[i] ?? [];
        await sleep(isIntro ? strokeIntroMs(median) : strokeDemoMs(median));
        if (cancelled) return;
        await sleep(isIntro ? INTRO_INTER_STROKE_MS : DEMO_INTER_STROKE_MS);
      }
      if (!cancelled) {
        setDemo({ stroke: -2, shown: Array.from({ length: charData.strokes.length }, (_, k) => k) });
        if (isIntro) onIntroDone?.();
        else onDemoDone?.();
      }
    })();
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
    // deps limited on purpose: the show loop restarts on signal/mode/data
    // changes; narration callbacks are stable-ish and re-running on them
    // would restart the animation mid-stroke.
  }, [mode, charData, availability, restartSignal]);

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
    if (pts.length < 1 || !charData || attemptDone) return;
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
      setAcceptedPaths((p) => [...p, livePathD(pts)]);
    } else {
      fadeKeyRef.current += 1;
      const key = fadeKeyRef.current;
      setFading((f) => [...f, { d: livePathD(pts), key }]);
      setTimeout(() => setFading((f) => f.filter((x) => x.key !== key)), 650);
    }
    if (done) setAttemptDone(true);
    onJudgement?.(judgement, next);
    if (done) onAttemptComplete?.(next);
  }, [attemptDone, charData, onAttemptComplete, onJudgement, totalStrokes]);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent<SVGSVGElement>) => {
      if (mode !== 'guided' && mode !== 'free') return;
      if (attemptDone || !charData) return;
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
    [attemptDone, charData, mode, toCharSpace],
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
    return (
      <div className="rounded-md border border-ink-faint bg-card p-4 text-small text-ink-faint" dir="rtl">
        در حال بارگذاری دادهٔ نوشتار…
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

  const isShow = mode === 'demo' || mode === 'intro';
  const expected = Math.min(attempt.expectedIndex, totalStrokes - 1);
  const guideMedian = medians[expected] ?? [];
  const arrow = guideMedian.length >= 2 ? directionArrow(guideMedian) : null;
  const guided = mode === 'guided' && !attemptDone;
  const freeReveal = mode === 'free' && attemptDone && revealOnDone;

  // demo decorations (owner §2): badge number + start dot + direction arrow of
  // the stroke currently being drawn — the canvas itself carries the teaching.
  const demoMedian = isShow && demo.stroke >= 0 ? (medians[demo.stroke] ?? []) : [];
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
      style={{ width: '100%', maxWidth: '26rem', aspectRatio: '1 / 1' }}
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

      {/* reference mode: the finished glyph rests in soft ink while the
          explanations unfold — the canvas never disappears (owner §1) */}
      {mode === 'reference' &&
        charData.strokes.map((d, i) => (
          <path
            key={`ref-${i}`}
            d={d}
            fill="none"
            stroke="currentColor"
            className="text-ink"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.3}
          />
        ))}

      {/* completed strokes (show: revealed so far · practice: accepted) */}
      {isShow
        ? demo.shown.map((i) => (
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
          ))
        : acceptedPaths.map((d, i) => (
            <path
              key={`done-${i}`}
              d={d}
              fill="none"
              stroke="currentColor"
              className="text-ink"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
            />
          ))}

      {/* show: the stroke currently flowing in */}
      {isShow && demo.stroke >= 0 && (
        <DemoStrokePath
          key={`demo-live-${demo.stroke}`}
          d={charData.strokes[demo.stroke]!}
          ms={mode === 'intro' ? strokeIntroMs(medians[demo.stroke] ?? []) : strokeDemoMs(medians[demo.stroke] ?? [])}
        />
      )}

      {/* demo teaching decorations: number badge + start dot + direction arrow.
          intro stays clean — the first impression is the whole character. */}
      {mode === 'demo' && demo.stroke >= 0 && demoBadgeAt && (
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
      {mode === 'demo' && demo.stroke >= 0 && demoMedian.length >= 2 && (
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

      {/* free-mode reveal after completion: the reference under the user's ink */}
      {freeReveal &&
        charData.strokes.map((d, i) => (
          <path
            key={`reveal-${i}`}
            d={d}
            fill="none"
            stroke="currentColor"
            className="text-ai"
            strokeWidth={STROKE_WIDTH * 0.72}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.28}
          />
        ))}

      {/* guided: dashed guide for the expected stroke + start marker + arrow */}
      {(guided || (mode === 'free' && hintFlash > 0 && !attemptDone)) && guideMedian.length >= 2 && (
        <>
          <path
            d={charData.strokes[expected]!}
            fill="none"
            stroke="currentColor"
            className="text-ai"
            strokeWidth={STROKE_WIDTH * 0.66}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={mode === 'free' ? 0.5 : 0.55}
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
