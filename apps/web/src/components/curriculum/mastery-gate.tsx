'use client';
/**
 * HANASO — MasteryGate (TASK-LEARNING-01) — stage D client island.
 *
 * Flow (DD-048): replay the anchor dialogue with LESS support (subtitles hidden
 * until tapped — the anchor player page handles replay; here we offer the audio
 * re-listen) → answer the 10-question gate bank (server-graded — answers NEVER
 * in the client) → qualitative verdict (AC-947: no raw % — the 「理解」 seal)
 * → point-return remediation map on failure (max 3 loops per session).
 */
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, RotateCcw } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { JaBlock } from '@/components/patterns/ja-block';
import { LineAudioButton } from './line-audio-button';

export interface MasteryGateProps {
  chapterSlug: string;
  exercises: ClientExercise[];
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
  remediationHrefs: Record<string, string>;
}

type Phase = 'intro' | 'questions' | 'result';
type GateResult = {
  outcome: 'passed' | 'remediate' | 'incomplete';
  remediationStations: string[];
  wrongByMeasure: Record<string, string[]>;
};

export function MasteryGate({ chapterSlug, exercises, audioByLine, audioAvailable }: MasteryGateProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { kind: string; optionId?: string; orderedIds?: string[]; chipOrder?: string[] }>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GateResult | null>(null);

  const ex = exercises[index];
  const isLast = index === exercises.length - 1;
  const answeredCount = Object.keys(answers).length;

  const record = useCallback(() => {
    if (!ex) return;
    if (ex.options) {
      if (selected) setAnswers((a) => ({ ...a, [ex.id]: { kind: 'option', optionId: selected } }));
    } else if (ex.chunks) {
      if (ordered.length) setAnswers((a) => ({ ...a, [ex.id]: { kind: 'order', orderedIds: ordered } }));
    }
  }, [ex, ordered, selected]);

  const submit = useCallback(async () => {
    record();
    setSubmitting(true);
    try {
      const payload = { ...answers };
      if (ex) {
        if (ex.options && selected) payload[ex.id] = { kind: 'option', optionId: selected };
        if (ex.chunks) payload[ex.id] = { kind: 'order', orderedIds: ordered };
      }
      const res = await fetch('/api/curriculum/mastery', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chapterSlug, answers: payload }),
      });
      const json = (await res.json()) as { data?: GateResult };
      if (json.data) {
        setResult(json.data);
        setPhase('result');
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, chapterSlug, ex, ordered, record, selected]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col gap-5 rounded-md border-2 border-shu bg-card p-6">
        <h2 className="text-h2 font-bold">{fa.curriculum.gateTitle}</h2>
        <p className="text-body leading-[var(--leading-fa)] text-ink">{fa.curriculum.gateLead}</p>
        <div className="flex flex-col gap-2 rounded-md bg-surface-warm p-4">
          <p className="text-body font-bold">{fa.curriculum.gateReplay}</p>
          <p className="text-small text-ink-soft">
            زیرنویس این بار نمایش داده نمی‌شود — فقط با لمس هر خط باز می‌شود. در پرسش‌های شنیداری هم فقط صدا داری.
          </p>
          <Link
            href={`/learn/${chapterSlug}/dialogue`}
            className="flex h-11 w-fit items-center gap-2 rounded-md border border-ai px-5 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.gateReplay}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setPhase('questions')}
          className="flex h-12 w-fit items-center gap-2 rounded-md bg-shu px-6 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          {fa.curriculum.gateStart}
          <ArrowLeft aria-hidden className="size-4" />
        </button>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const passed = result.outcome === 'passed';
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'flex flex-col gap-5 rounded-md border-2 p-6',
          passed ? 'border-success bg-card' : 'border-warning bg-card',
        ].join(' ')}
      >
        {passed ? (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden className="grid size-16 place-items-center rounded-full border-2 border-success text-h2 font-black text-success">
                理解
              </span>
              <div>
                <h2 className="text-h2 font-bold text-success">{fa.curriculum.gatePassedTitle}</h2>
                <p className="mt-1 text-body text-ink-soft">{fa.curriculum.gatePassedBody}</p>
              </div>
            </div>
            <Link
              href={`/learn/${chapterSlug}/complete`}
              className="flex h-12 w-fit items-center gap-2 rounded-md bg-shu px-6 text-body font-bold text-paper transition-colors hover:bg-shu-deep"
            >
              {fa.curriculum.viewResult}
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span aria-hidden className="grid size-16 place-items-center rounded-full border-2 border-warning text-h2 font-black text-warning">
                もう一度
              </span>
              <div>
                <h2 className="text-h2 font-bold text-warning">{fa.curriculum.gateFailedTitle}</h2>
                <p className="mt-1 text-body text-ink-soft">{fa.curriculum.gateFailedBody}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {(result.remediationStations ?? []).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/learn/${chapterSlug}/journey/${slug}`}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-ai bg-indigo-wash/40 px-4 text-body transition-colors hover:bg-indigo-wash"
                  >
                    <CircleCheck aria-hidden className="size-4 text-ai" />
                    {stationTitle(slug)}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/learn/${chapterSlug}/journey`}
              className="flex h-11 w-fit items-center gap-2 rounded-md border border-ink-faint px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm"
            >
              {fa.curriculum.backToJourney}
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!ex) return null;

  const remaining = ex.chunks?.filter((c) => !ordered.includes(c.id)) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-soft">
          {fa.curriculum.gateQuestion} {index + 1} {fa.curriculum.gateOf} {exercises.length}
        </p>
        <p className="text-caption text-ink-faint">
          {faNum(answeredCount)}/{faNum(exercises.length)}
        </p>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-ai transition-[width] duration-300"
          style={{ width: `${((index + 1) / exercises.length) * 100}%` }}
        />
      </div>

      <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5">
        <p className="text-body font-medium">{ex.promptFa}</p>

        {ex.audioLineRef && (
          <div className="flex items-center gap-3 rounded-md bg-surface-warm p-3">
            <LineAudioButton lineId={ex.audioLineRef} audioUrl={audioByLine[ex.audioLineRef] ?? ''} audioAvailable={audioAvailable} rate={0.9} />
            <span className="text-small text-ink-soft">🎧 فقط گوش کن</span>
          </div>
        )}

        {(ex.promptJa || ex.clozeTokens) && (
          <div className="rounded-md bg-surface-warm p-4">
            {ex.clozeTokens ? (
              <JaBlock className="text-lead">
                {ex.clozeTokens.map((tok, i) => (tok === null ? <span key={i}>＿＿</span> : <span key={i}>{tok}</span>))}
              </JaBlock>
            ) : (
              <JaBlock className="text-lead">{ex.promptJa}</JaBlock>
            )}
          </div>
        )}

        {ex.options ? (
          <div role="radiogroup" className="flex flex-col gap-2">
            {ex.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected === opt.id}
                onClick={() => setSelected(opt.id)}
                className={[
                  'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                  selected === opt.id ? 'border-ai bg-indigo-wash font-bold' : 'border-ink-faint bg-card hover:border-ai',
                ].join(' ')}
              >
                <span dir="auto">{opt.label}</span>
              </button>
            ))}
          </div>
        ) : ex.chunks ? (
          <div className="flex flex-col gap-3">
            <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3" dir="ltr" lang="ja">
              {ordered.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrdered((o) => o.filter((x) => x !== id))}
                  className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                >
                  {ex.chunks!.find((c) => c.id === id)?.ja}
                </button>
              ))}
              {ordered.length === 0 && <span className="text-small text-ink-faint">…</span>}
            </div>
            <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
              {remaining.map((chunk) => (
                <button
                  key={chunk.id}
                  type="button"
                  onClick={() => setOrdered((o) => [...o, chunk.id])}
                  className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
                >
                  {chunk.ja}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => {
              record();
              const prev = exercises[index - 1]!;
              setIndex(index - 1);
              setSelected(prev.options ? (answers[prev.id]?.optionId ?? null) : null);
              setOrdered(prev.chunks ? (answers[prev.id]?.orderedIds as string[] | undefined) ?? [] : []);
            }}
            className="h-11 rounded-md border border-ink-faint px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm"
          >
            قبلی
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={() => {
              record();
              const nxt = exercises[index + 1]!;
              setIndex(index + 1);
              setSelected(nxt.options ? (answers[nxt.id]?.optionId ?? null) : null);
              setOrdered(nxt.chunks ? (answers[nxt.id]?.orderedIds as string[] | undefined) ?? [] : []);
            }}
            disabled={ex.options ? !selected : ex.chunks ? ordered.length !== ex.chunks.length : true}
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep disabled:opacity-45"
          >
            {fa.curriculum.continueBlock}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={
              submitting ||
              (ex.options ? !selected : ex.chunks ? ordered.length !== ex.chunks.length : true)
            }
            className="flex h-11 items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep disabled:opacity-45"
          >
            {fa.curriculum.gateSubmit}
          </button>
        )}
      </div>
    </div>
  );
}

function stationTitle(slug: string): string {
  const titles: Record<string, string> = {
    'stn-fm01-02-vocab': 'واژه‌های هویت',
    'stn-fm01-03-grammar-desu': 'الگوی هویت: AはBです',
    'stn-fm01-05-grammar-qa': 'پرسش و تأیید: ですか / ですね',
    'stn-fm01-06-expression': 'عبارت‌های اولین دیدار',
    'stn-fm01-07-listen': 'گوشِ اول: کشش و آهنگ',
  };
  return titles[slug] ?? slug;
}

function faNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
