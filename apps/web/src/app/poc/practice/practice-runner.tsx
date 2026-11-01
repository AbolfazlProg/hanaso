'use client';
/**
 * HANASO — Practice runner (TASK-SLICE-01 / Issue #40) — the stage-C island.
 *
 * Renders the deterministic exercise set ONE question at a time (kind rotation is
 * baked into the generated order — §۳ anti-fatigue), collects answers, checks them
 * with the practice module (pure, shared with the server) and shows the result +
 * weak points, then hands over to the stage-D assessment (C→D transition).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAnswers, isAnswerCorrect } from '@/modules/practice';
import type { Exercise, ExerciseAnswer, PracticeCheckResult } from '@/modules/practice';
import { logEvent, postProgressEvent } from '@/lib/poc/client';
import { JpLine, POC_SCENE_CSS } from '../jp-text';

export interface PracticeRunnerProps {
  dialogueId: string;
  exercises: Exercise[];
  /** lineId → playable audio URL (placeholder WAVs in the PoC, VOICEVOX in production). */
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
  audioNote?: string;
  /** speaker id → Persian name (speaker-identify choices). */
  speakerNames: Record<string, string>;
  /** lineId → `teaches` ids (severity escalation on taught lines). */
  teachesByLine: Record<string, string[]>;
}

const KIND_LABELS_FA: Record<Exercise['kind'], string> = {
  'speaker-identify': 'تشخیص گوینده',
  'order-reconstruct': 'بازسازی ترتیب',
  'listen-no-text': 'شنیداری بدون متن',
  'fill-token': 'جای توکن خالی',
};

export function PracticeRunner({
  dialogueId,
  exercises,
  audioByLine,
  audioAvailable,
  audioNote,
  speakerNames,
  teachesByLine,
}: PracticeRunnerProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExerciseAnswer>>({});
  const [orderDraft, setOrderDraft] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<PracticeCheckResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    logEvent('practice_started', { dialogue_id: dialogueId, exercises: exercises.length });
  }, [dialogueId, exercises.length]);

  const teaches = useMemo(() => new Map(Object.entries(teachesByLine)), [teachesByLine]);

  const exercise = exercises[index]!;
  const answered = Object.keys(answers).length;
  const allAnswered = answered === exercises.length;

  const playLine = useCallback(
    (lineId: string) => {
      const url = audioByLine[lineId];
      if (!url) return;
      void new Audio(url).play().catch(() => {
        /* browser gesture policy — the click IS the gesture; ignore transient failures */
      });
    },
    [audioByLine],
  );

  function chooseOption(ex: Exercise, optionId: string): void {
    setAnswers((a) => ({ ...a, [ex.id]: { optionId } }));
  }

  function appendOrder(ex: Exercise, lineId: string): void {
    setOrderDraft((d) => {
      const current = d[ex.id] ?? [];
      if (current.includes(lineId)) return d;
      const next = [...current, lineId];
      setAnswers((a) => ({ ...a, [ex.id]: { orderedLineIds: next } }));
      return { ...d, [ex.id]: next };
    });
  }

  function resetOrder(ex: Exercise): void {
    setOrderDraft((d) => ({ ...d, [ex.id]: [] }));
    setAnswers((a) => {
      const rest: Record<string, ExerciseAnswer> = { ...a };
      delete rest[ex.id];
      return rest;
    });
  }

  function submit(): void {
    setResult(checkAnswers(exercises, answers, teaches));
    logEvent('practice_submitted', {
      dialogue_id: dialogueId,
      correct: checkAnswers(exercises, answers, teaches).correctCount,
      total: exercises.length,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function goToAssessment(): Promise<void> {
    const res = await postProgressEvent(dialogueId, { type: 'practice_done' });
    if (!res.ok) {
      setWarning(
        res.code === 'progress/invalid_transition'
          ? 'برای ثبت رسمی این مرحله، اول مکالمه و درس را از /learn کامل کن — ولی ارزیابی آزاد است.'
          : (res.message ?? 'ثبت پیشرفت ناموفق بود.'),
      );
    }
    router.push('/poc/assessment');
  }

  return (
    <div className="flex flex-col gap-4">
      <style dangerouslySetInnerHTML={{ __html: POC_SCENE_CSS }} />

      {!audioAvailable && (
        <p className="rounded-md border border-ink-faint bg-surface-sunken px-4 py-2 text-small text-ink-soft">
          {audioNote} — تمرین‌های شنیداری بعد از تولید صداها معنادارند؛ بقیه کار می‌کنند.
        </p>
      )}

      {result ? (
        <ResultPanel
          result={result}
          onRetry={() => {
            setResult(null);
            setAnswers({});
            setOrderDraft({});
            setIndex(0);
          }}
          onGoAssess={() => void goToAssessment()}
          warning={warning}
        />
      ) : (
        <section className="flex flex-col gap-3 rounded-lg border border-ink-faint bg-paper p-4" aria-label="تمرین">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-small text-ink-soft">
              تمرین {index + 1} از {exercises.length} · پاسخ‌داده: {answered}
            </p>
            <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption">
              {KIND_LABELS_FA[exercise.kind]}
            </span>
          </div>
          <p className="text-body font-bold">{exercise.prompt}</p>

          <ExerciseBody
            exercise={exercise}
            answers={answers}
            orderDraft={orderDraft}
            audioAvailable={audioAvailable}
            speakerNames={speakerNames}
            onPlay={playLine}
            onChoose={chooseOption}
            onAppendOrder={appendOrder}
            onResetOrder={resetOrder}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded-md border border-ink-faint px-3 py-2 text-small disabled:opacity-40"
            >
              قبلی
            </button>
            {allAnswered ? (
              <button type="button" onClick={submit} className="rounded-md bg-ai px-4 py-2 text-small text-paper">
                ثبت پاسخ‌ها و دیدن نتیجه
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(exercises.length - 1, i + 1))}
                disabled={!answers[exercise.id] || index === exercises.length - 1}
                className="rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
              >
                بعدی
              </button>
            )}
          </div>
          <p className="text-caption text-ink-soft">
            {answers[exercise.id]
              ? isAnswerCorrect(exercise, answers[exercise.id])
                ? '✓ درست است — می‌توانی بروی بعدی'
                : 'پاسخ ثبت شد؛ بازخورد کامل بعد از ثبت نهایی'
              : 'برای رفتن به بعدی، این تمرین را پاسخ بده'}
          </p>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ exercise bodies */

function ExerciseBody({
  exercise,
  answers,
  orderDraft,
  audioAvailable,
  speakerNames,
  onPlay,
  onChoose,
  onAppendOrder,
  onResetOrder,
}: {
  exercise: Exercise;
  answers: Record<string, ExerciseAnswer>;
  orderDraft: Record<string, string[]>;
  audioAvailable: boolean;
  speakerNames: Record<string, string>;
  onPlay: (lineId: string) => void;
  onChoose: (ex: Exercise, optionId: string) => void;
  onAppendOrder: (ex: Exercise, lineId: string) => void;
  onResetOrder: (ex: Exercise) => void;
}) {
  const item = exercise.items[0]!;
  const answer = answers[exercise.id];

  if (item.kind === 'speaker-identify' || item.kind === 'listen-no-text') {
    const isSpeaker = item.kind === 'speaker-identify';
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onPlay(item.lineId)}
          disabled={!audioAvailable}
          className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
        >
          ▶ پخش جمله
        </button>
        <div className="flex flex-col gap-2">
          {item.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChoose(exercise, opt.id)}
              className={`rounded-md border px-3 py-2 text-start text-body ${
                answer && 'optionId' in answer && answer.optionId === opt.id
                  ? 'border-ai bg-surface-warm'
                  : 'border-ink-faint'
              }`}
            >
              {isSpeaker ? (speakerNames[opt.id] ?? opt.labelFa) : opt.labelFa}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.kind === 'fill-token') {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-md bg-surface-warm px-3 py-2">
          <p className="mb-1 text-caption text-ink-soft">جملهٔ مکالمه (یک توکن حذف شده):</p>
          <bdi lang="ja" dir="ltr" className="poc-ja-line flex flex-wrap items-center gap-1 text-ja">
            {item.maskedTokens.map((t, i) =>
              t ? (
                <span key={i}>
                  {t.reading !== t.surface ? (
                    <ruby>
                      {t.surface}
                      <rt>{t.reading}</rt>
                    </ruby>
                  ) : (
                    t.surface
                  )}
                </span>
              ) : (
                <span
                  key={i}
                  aria-label="توکن جاافتاده"
                  className="inline-block min-w-16 rounded-sm border-2 border-dashed border-ink-faint px-2 text-center text-ink-faint"
                >
                  ？
                </span>
              ),
            )}
          </bdi>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChoose(exercise, opt.id)}
              className={`rounded-md border px-4 py-2 text-ja ${
                answer && 'optionId' in answer && answer.optionId === opt.id
                  ? 'border-ai bg-surface-warm'
                  : 'border-ink-faint'
              }`}
            >
              <bdi lang="ja" dir="ltr">
                {opt.surface}
              </bdi>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // order-reconstruct — click-to-order (drag not needed per slice spec)
  const picked = orderDraft[exercise.id] ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {item.sentences.map((s) => {
          const position = picked.indexOf(s.lineId);
          return (
            <button
              key={s.lineId}
              type="button"
              onClick={() => onAppendOrder(exercise, s.lineId)}
              disabled={position >= 0}
              className={`flex flex-col items-start gap-1 rounded-md border p-3 text-start ${
                position >= 0 ? 'border-ai bg-surface-warm opacity-80' : 'border-ink-faint'
              }`}
            >
              <span className="text-caption text-ink-soft">
                {position >= 0 ? `#${position + 1} انتخاب شد` : 'برای افزودن به ترتیب کلیک کن'}
              </span>
              <JpLine tokens={s.tokens} className="text-ja" />
              <span className="text-small text-ink-soft">{s.fa}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small text-ink-soft">ترتیب انتخابی:</span>
        <ol className="flex flex-wrap gap-1 text-caption">
          {picked.map((lineId, i) => (
            <li key={lineId} className="rounded-sm bg-surface-muted px-1.5 py-0.5">
              {i + 1}◦ خط {lineId.replace('s-cafe-morning-01-l', '')}
            </li>
          ))}
          {picked.length === 0 && <li className="text-ink-soft">—</li>}
        </ol>
        {picked.length > 0 && (
          <button type="button" onClick={() => onResetOrder(exercise)} className="text-caption text-ai underline">
            بازنشانی
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ result panel */

function ResultPanel({
  result,
  onRetry,
  onGoAssess,
  warning,
}: {
  result: PracticeCheckResult;
  onRetry: () => void;
  onGoAssess: () => void;
  warning: string | null;
}) {
  const perfect = result.correctCount === result.total;
  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <div
        className={`flex flex-col gap-2 rounded-lg border-2 p-4 ${
          perfect ? 'border-success bg-paper' : 'border-ai bg-paper'
        }`}
      >
        <h3 className={`text-h3 font-bold ${perfect ? 'text-success' : 'text-ai'}`}>
          {perfect ? 'همه را درست جواب دادی ✓' : `${result.correctCount} از ${result.total} درست`}
        </h3>
        <p className="text-small text-ink-soft">
          تمرین‌ها همه از خودِ همین مکالمه ساخته شده‌اند؛ اشتباه‌ها نقاط تمرکز مرحلهٔ D تو مشخص می‌کنند.
        </p>
        {result.weakPoints.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-body font-bold">نقاط ضعف (خط ↔ هدف):</p>
            <ul className="flex flex-col gap-1 text-small">
              {result.weakPoints.map((wp, i) => (
                <li key={`${wp.lineId}-${wp.objective}-${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption">{wp.objective}</span>
                  <span>خط {wp.lineId.replace('s-cafe-morning-01-l', '')}</span>
                  <span className="text-ink-soft">شدت: {wp.severity}</span>
                  <a className="text-ai underline" href={`/poc/dialogue?line=${wp.lineId}`}>
                    در مکالمه ببین ↗
                  </a>
                  <a className="text-ai underline" href={`/poc/lesson#item-${wp.objective}`}>
                    کارت مرتبط ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-body">نقطهٔ ضعفی ثبت نشد.</p>
        )}
      </div>

      {warning && (
        <p role="alert" className="rounded-md border-2 border-warning bg-surface-warm px-4 py-3 text-small">
          {warning}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onGoAssess} className="rounded-md bg-ai px-4 py-2 text-small text-paper">
          برای ارزیابی نهایی آماده‌ام ← مرحلهٔ D
        </button>
        <button type="button" onClick={onRetry} className="rounded-md border border-ink-faint px-4 py-2 text-small">
          تمرین دوباره
        </button>
        <a href="/learn" className="self-center text-small text-ai underline">
          بازگشت به مسیر یادگیری
        </a>
      </div>
    </section>
  );
}
