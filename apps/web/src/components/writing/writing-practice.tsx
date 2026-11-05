'use client';
/**
 * HANASO — Writing practice panel (TASK-LEARNING-07 / DD-105/DD-106 — owner-ordered
 * capability: real drawing with correctness evaluation, kana + kanji, one engine).
 *
 * Modes (mission §4.1):
 *   guided — stroke-order animation for SEEING the structure (05A §۱ presentation)
 *   trace  — quiz over the visible guide outline (leniency ladder: teaching)
 *   free   — quiz from memory, guide hidden, reveal after completion
 *
 * Evaluation: Hanzi Writer (MIT) validates each stroke (count/order/geometry);
 * the HANASO analysis layer (modules/writing/analysis.ts) explains rejected
 * strokes — direction / form / position / uncertain — and produces the DD-106
 * six-dimension summary. Raw pen paths NEVER leave the browser (DD-111) — only
 * the structured summary is reported via onAttempt.
 *
 * Honest states: a character without shipped stroke data renders `data_missing`
 * (never a fake exercise). Attribution (DD-105 license obligations) renders in
 * the panel footer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type HanziWriterClass from 'hanzi-writer';
import {
  CHAR_SPACE,
  evaluateStroke,
  hanziWriterLeniency,
  dimensionsFrom,
  verdictFrom,
  type Point,
  type StrokeEvaluation,
  type WritingAttemptSummary,
  type WritingCharData,
  type WritingMode,
  type WritingVerdict,
} from '@/modules/writing';
import { loadWritingCharData, writingAvailability } from '@/modules/writing';
import { Eye, EyeOff, Hand, Pencil, Play, RotateCcw, Sparkles } from 'lucide-react';

export interface WritingPracticeProps {
  /** Character to practice (kana today, kanji-ready for future chapters). */
  character: string;
  /** Initial mode. */
  initialMode?: WritingMode;
  /** Leniency ladder stage (teaching default — DD-106). */
  leniency?: 'teaching' | 'standard' | 'strict';
  /** Fired once per completed/abandoned attempt with the structured summary. */
  onAttempt?: (summary: WritingAttemptSummary) => void;
  /** Compact layout (per-glyph card embed) vs full (station block). */
  variant?: 'card' | 'block';
}

const MODE_LABEL: Record<WritingMode, string> = {
  guided: 'نمایش ترتیب',
  trace: 'نوشتن روی الگو',
  free: 'نوشتن از حافظه',
};

const VERDICT_FA: Record<WritingVerdict, { label: string; tone: 'ok' | 'hint' | 'warn' }> = {
  correct: { label: 'درست نوشتی', tone: 'ok' },
  correct_with_hints: { label: 'درست شد — با کمی کمک', tone: 'ok' },
  order_error: { label: 'جهت یا ترتیب ضربه‌ها را دوباره ببین', tone: 'warn' },
  form_error: { label: 'شکل ضربه‌ها نیاز به تمرین دارد', tone: 'warn' },
  position_error: { label: 'جای ضربه‌ها را دقیق‌تر بزن', tone: 'warn' },
  uncertain_retry: { label: 'مطمئن نیستیم — یک بار دیگر بنویس', tone: 'hint' },
};

const ERROR_FA: Record<string, string> = {
  direction: 'جهت حرکت این ضربه درست نیست',
  form: 'شکل این ضربه با الگو نمی‌خواند',
  position: 'این ضربه را در جای درستش نگذاشتی',
  uncertain: 'این ضربه را کمی واضح‌تر بنویس',
};

export function WritingPractice({
  character,
  initialMode = 'guided',
  leniency = 'teaching',
  onAttempt,
  variant = 'block',
}: WritingPracticeProps) {
  const [mode, setMode] = useState<WritingMode>(initialMode);
  const [availability, setAvailability] = useState<'loading' | 'available' | 'data_missing'>('loading');
  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [guideOn, setGuideOn] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [activeStroke, setActiveStroke] = useState(-1);
  const [strokeEvals, setStrokeEvals] = useState<StrokeEvaluation[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [verdict, setVerdict] = useState<WritingVerdict | null>(null);
  const [feedbackFa, setFeedbackFa] = useState<string | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  /** Bumped when the async Hanzi Writer instance is mounted — the mode effect
   *  depends on it, otherwise quiz()/animate() would run BEFORE the writer
   *  exists and the canvas would never accept input (found in the W4 browser
   *  walkthrough — the quiz silently never started). */
  const [writerReady, setWriterReady] = useState(0);

  const targetRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<InstanceType<typeof HanziWriterClass> | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const attemptReportedRef = useRef(false);
  const strokeMistakeCountRef = useRef(0);

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

  // ---------------------------------------------------------------- my analysis capture (parallel to the quiz)
  const analyzeCurrentStroke = useCallback(
    (strokeIndex: number): StrokeEvaluation | null => {
      const data = charData;
      if (!data) return null;
      const pts = currentPointsRef.current;
      currentPointsRef.current = [];
      const median = data.medians[strokeIndex];
      if (!median || pts.length < 2) return null;
      const medianPts: Point[] = median.map((m) => ({ x: m[0] ?? 0, y: m[1] ?? 0 }));
      return evaluateStroke(pts, medianPts, leniency);
    },
    [charData, leniency],
  );

  // ---------------------------------------------------------------- writer lifecycle
  useEffect(() => {
    if (availability !== 'available' || !charData || !targetRef.current) return;
    let disposed = false;
    let writer: InstanceType<typeof HanziWriterClass> | null = null;

    void (async () => {
      try {
        const mod = await import('hanzi-writer');
        const HanziWriter = mod.default;
        if (disposed || !targetRef.current) return;
        const size = variant === 'card' ? 280 : 320;
        writer = HanziWriter.create(targetRef.current, character, {
          width: size,
          height: size,
          padding: 8,
          showOutline: true,
          showCharacter: mode === 'guided',
          strokeColor: '#1D4E70',
          outlineColor: '#C9D4DC',
          highlightColor: '#B3822E',
          drawingColor: '#B3261E',
          charDataLoader: (ch: string) => loadWritingCharData(ch),
        });
        writerRef.current = writer;
        setWriterReady((n) => n + 1);
      } catch (err: unknown) {
        if (!disposed) setEngineError((err as Error).message ?? 'نمایشگر نوشتار بارگذاری نشد');
      }
    })();

    return () => {
      disposed = true;
      writerRef.current = null;
      setWriterReady(0);
    };
    // mode intentionally NOT a dep: the writer instance is per-character; mode
    // changes re-run quiz/animate on the SAME writer (see effect below).
  }, [availability, charData, character, variant]);

  // pointer capture for the analysis layer (passive — Hanzi Writer keeps its own)
  useEffect(() => {
    const el = targetRef.current;
    if (!el || availability !== 'available') return;

    const toCharSpace = (ev: PointerEvent): Point | null => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((ev.clientX - rect.left) / rect.width) * CHAR_SPACE,
        y: ((ev.clientY - rect.top) / rect.height) * CHAR_SPACE,
      };
    };
    const down = (ev: PointerEvent) => {
      const p = toCharSpace(ev);
      if (p) currentPointsRef.current = [p];
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      setStartedAt((s) => s ?? Date.now());
    };
    const move = (ev: PointerEvent) => {
      if (currentPointsRef.current.length === 0) return;
      const p = toCharSpace(ev);
      if (p) currentPointsRef.current.push(p);
    };
    const up = () => {
      // analysis result is reconciled when the quiz reports the stroke outcome
      const ev = analyzeCurrentStroke(Math.max(activeStroke, 0));
      if (ev && !ev.accepted) {
        setFeedbackFa(ERROR_FA[ev.errorKind ?? 'uncertain'] ?? ERROR_FA.uncertain!);
      }
    };
    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerup', up, { passive: true });
    el.addEventListener('pointercancel', up, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [availability, activeStroke, analyzeCurrentStroke]);

  // ---------------------------------------------------------------- mode application
  const resetAttempt = useCallback(() => {
    setStrokeEvals([]);
    setMistakes(0);
    setHintsShown(0);
    setFirstTryCorrect(0);
    setCompleted(false);
    setVerdict(null);
    setFeedbackFa(null);
    setActiveStroke(-1);
    startedAtRef.current = null;
    setStartedAt(null);
    attemptReportedRef.current = false;
    strokeMistakeCountRef.current = 0;
  }, []);

  useEffect(() => {
    const writer = writerRef.current;
    if (!writer || availability !== 'available' || writerReady === 0) return;
    resetAttempt();
    if (mode === 'guided') {
      writer.showCharacter();
      void writer.animateCharacter({});
    } else {
      writer.hideCharacter();
      if (mode === 'trace') writer.showOutline();
      else writer.hideOutline();
      writer.quiz({
        leniency: hanziWriterLeniency(mode === 'trace' ? 'teaching' : leniency),
        showHintAfterMisses: 2,
        markStrokeCorrectAfterMisses: 4,
        onCorrectStroke: (data: { strokeNum: number; totalMistakes: number }) => {
          setActiveStroke(data.strokeNum);
          const ev = analyzeCurrentStroke(data.strokeNum);
          setStrokeEvals((prev) => [
            ...prev,
            ev ?? { accepted: true, metrics: { overall: 1, direction: 1, shape: 1, position: 1 }, errorKind: null },
          ]);
          if (strokeMistakeCountRef.current === 0) setFirstTryCorrect((n) => n + 1);
          strokeMistakeCountRef.current = 0;
          setFeedbackFa(null);
        },
        onMistake: (data: { strokeNum: number; mistakesOnStroke: number; totalMistakes: number }) => {
          setActiveStroke(data.strokeNum);
          setMistakes(data.totalMistakes);
          if (data.mistakesOnStroke >= 2) setHintsShown((h) => (data.mistakesOnStroke === 2 ? h + 1 : h));
          strokeMistakeCountRef.current = data.mistakesOnStroke;
        },
        onComplete: (data: { totalMistakes: number }) => {
          setMistakes(data.totalMistakes);
          setCompleted(true);
          if (mode === 'free') writer.showCharacter();
          setFeedbackFa(null);
        },
      });
    }
  }, [mode, availability, writerReady, resetAttempt, analyzeCurrentStroke, leniency]);

  // ---------------------------------------------------------------- verdict + summary
  useEffect(() => {
    if (!completed || !charData || verdict !== null || attemptReportedRef.current) return;
    attemptReportedRef.current = true;
    const summary: WritingAttemptSummary = {
      character,
      mode,
      strokesTotal: charData.medians.length,
      strokesFirstTry: firstTryCorrect,
      totalMistakes: mistakes,
      hintsShown,
      completed: true,
      verdict: verdictFrom({ completed: true, totalMistakes: mistakes, hintsShown, evaluations: strokeEvals }),
      dimensions: dimensionsFrom(strokeEvals, charData.medians.length, firstTryCorrect),
      durationMs:
        (startedAtRef.current ?? startedAt ?? Date.now()) !== 0
          ? Date.now() - (startedAtRef.current ?? startedAt ?? Date.now())
          : 0,
    };
    setVerdict(summary.verdict);
    onAttempt?.(summary);
  }, [completed]);

  const replayAnimation = useCallback(() => {
    const writer = writerRef.current;
    if (!writer) return;
    setMode('guided');
  }, []);

  const toggleGuide = useCallback(() => {
    const writer = writerRef.current;
    if (!writer) return;
    setGuideOn((g) => {
      if (g) writer.hideOutline();
      else writer.showOutline();
      return !g;
    });
  }, []);

  const strokes = charData?.medians.length ?? 0;

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
          برای «{character}» هنوز دادهٔ ترتیب ضربه‌ها فراهم نشده؛ تمرین ساختگی ساخته نمی‌شود. این نویسه پس از تأمین داده
          در نسخه‌های بعدی قابل تمرین خواهد بود.
        </p>
      </div>
    );
  }
  if (engineError) {
    return (
      <div className="rounded-md border border-danger/40 bg-card p-4 text-small text-ink" dir="rtl">
        نمایشگر نوشتار بارگذاری نشد — {engineError}
      </div>
    );
  }

  const tone = verdict ? VERDICT_FA[verdict].tone : null;
  return (
    <div
      className={`rounded-md border bg-card ${variant === 'block' ? 'p-5' : 'p-3'} border-ink-faint`}
      dir="rtl"
      aria-label={`تمرین نوشتن ${character}`}
    >
      {/* mode tabs */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="حالت‌های تمرین نوشتن">
        {(Object.keys(MODE_LABEL) as WritingMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-md px-3 py-2 text-small font-bold transition-colors ${
              mode === m ? 'bg-indigo text-paper' : 'border-2 border-indigo text-indigo hover:bg-indigo-wash'
            }`}
          >
            {m === 'guided' ? <Play className="ms-1 inline size-4" aria-hidden /> : null}
            {m === 'trace' ? <Pencil className="ms-1 inline size-4" aria-hidden /> : null}
            {m === 'free' ? <Hand className="ms-1 inline size-4" aria-hidden /> : null}
            {MODE_LABEL[m]}
          </button>
        ))}
        {mode !== 'guided' ? (
          <button
            type="button"
            onClick={toggleGuide}
            aria-pressed={guideOn}
            className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
          >
            {guideOn ? (
              <EyeOff className="ms-1 inline size-4" aria-hidden />
            ) : (
              <Eye className="ms-1 inline size-4" aria-hidden />
            )}
            {guideOn ? 'پنهان‌کردن الگو' : 'نمایش الگو'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={replayAnimation}
          className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
        >
          <Play className="ms-1 inline size-4" aria-hidden />
          ترتیب ضربه‌ها
        </button>
        {mode !== 'guided' ? (
          <button
            type="button"
            onClick={() => {
              resetAttempt();
              const writer = writerRef.current;
              if (writer) {
                writer.hideCharacter();
                if (mode === 'trace') writer.showOutline();
                else writer.hideOutline();
                writer.quiz({
                  leniency: hanziWriterLeniency(mode === 'trace' ? 'teaching' : leniency),
                  showHintAfterMisses: 2,
                  markStrokeCorrectAfterMisses: 4,
                });
              }
            }}
            className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
          >
            <RotateCcw className="ms-1 inline size-4" aria-hidden />
            از نو
          </button>
        ) : null}
      </div>

      {/* canvas + side info */}
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <div
          ref={targetRef}
          className="frame-ink touch-none select-none rounded-lg bg-paper shadow-card"
          style={{ width: variant === 'card' ? 280 : 320, height: variant === 'card' ? 280 : 320 }}
          aria-label={`محل رسم ${character}`}
          role="img"
        />
        <div className="min-w-[12rem] flex-1 space-y-3">
          <p className="text-small text-ink-faint">
            {mode === 'guided'
              ? 'به ترتیب ضربه‌ها نگاه کن؛ سپس در حالت «نوشتن روی الگو» خودت بنویس.'
              : mode === 'trace'
                ? 'روی الگوی کم‌رنگ، هر ضربه را در جهت و ترتیب درست بکش.'
                : 'بدون دیدن الگو، نویسه را از حافظه بنویس — در پایان شکل درست را می‌بینی.'}
          </p>
          <p className="text-body text-ink">
            <span className="font-jp text-h3 font-bold">{character}</span>
            <span className="mx-2 text-ink-faint">·</span>
            {strokes} ضربه
          </p>
          {/* per-stroke progress dots */}
          <div className="flex flex-wrap gap-1" aria-label="پیشرفت ضربه‌ها">
            {Array.from({ length: strokes }, (_, i) => (
              <span
                key={i}
                className={`size-3 rounded-full border ${
                  i < firstTryCorrect
                    ? 'border-ok bg-ok/60'
                    : i <= activeStroke
                      ? 'border-shu bg-shu/40'
                      : 'border-ink-faint bg-surface-2'
                }`}
              />
            ))}
          </div>
          {feedbackFa ? (
            <p className="rounded-md bg-surface-2 px-3 py-2 text-small text-ink" role="status">
              {feedbackFa}
            </p>
          ) : null}
          {verdict ? (
            <div
              className={`rounded-md border px-3 py-2 ${
                tone === 'ok'
                  ? 'border-ok/50 bg-ok/10'
                  : tone === 'warn'
                    ? 'border-shu/50 bg-shu/10'
                    : 'border-ink-faint bg-surface-2'
              }`}
              role="status"
            >
              <p className="text-small font-bold text-ink">{VERDICT_FA[verdict]!.label}</p>
              <p className="mt-1 text-micro text-ink-faint" dir="rtl">
                ضربه‌های درست در همان تلاش اول: {firstTryCorrect} از {strokes}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* DD-105 attribution — license obligations are part of the design, not an afterthought */}
      <p className="mt-4 border-t border-ink-faint pt-2 text-micro text-ink-faint">
        <Sparkles className="me-1 inline size-3" aria-hidden />
        موتور رسم: Hanzi Writer (MIT) · دادهٔ ضربه‌ها: hanzi-writer-data-jp —
        <a href="/writing-data/licenses/COPYING.txt" className="text-ai underline" target="_blank" rel="noreferrer">
          مجوزها
        </a>
        · پردازش کاملاً در مرورگر شماست؛ مسیر قلم شما هرگز ارسال نمی‌شود.
      </p>
    </div>
  );
}
