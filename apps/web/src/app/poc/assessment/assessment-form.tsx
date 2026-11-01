'use client';
/**
 * HANASO — PoC assessment form (TASK-DLG-POC-01 + TASK-SLICE-01) — stage D.
 * 5 comprehension questions covering M1..M5 from the same dialogue. The client
 * holds NO answer key: it submits RAW ANSWERS to /api/attempts where grading
 * happens server-side (remediation of review F1/S1 — KB dialogue-mastery-model §۱).
 * outcome=passed → POST /api/progress (mastery_passed) → «فهمیدم / understood»
 * (never "completed" — DD-048). outcome=remediate → targeted return links to the
 * lesson card / practice session per the recorded weak points.
 */
import { useState } from 'react';
import { logEvent, postProgressEvent } from '@/lib/poc/client';
import { JpLine, POC_SCENE_CSS } from '../jp-text';
import type { AssessmentQuestionClient } from '@/lib/poc/assessment-bank';

interface AttemptResponse {
  ok: boolean;
  data?: {
    attempt: {
      id: string;
      attemptNo: number;
      outcome: 'passed' | 'remediate' | 'incomplete';
      weakPoints: { lineId: string; objective: string; severity: string }[];
    };
    scoring: {
      weightedScore: number | null;
      weakMeasures: string[];
      unassessed: string[];
      outcome: string;
    };
    /** revealed by the server AFTER grading — safe for feedback */
    perQuestion: { questionId: string; measure: string; correct: boolean; correctOptionId: string }[];
  };
  error?: { code: string; message: string };
}

export function AssessmentForm({
  dialogueId,
  questions,
  audioByLine,
  audioAvailable,
}: {
  dialogueId: string;
  questions: AssessmentQuestionClient[];
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<{ recorded: boolean; message?: string } | null>(null);

  const allAnswered = questions.every((q) => answers[q.id]);
  const graded = result ? new Map(result.perQuestion.map((p) => [p.questionId, p])) : null;

  function playAudio(lineId: string): void {
    const url = audioByLine[lineId];
    if (!url) return;
    void new Audio(url).play().catch(() => {
      /* gesture policy — click is the gesture; ignore transient failures */
    });
  }

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    setResult(null);
    setUnderstood(null);
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dialogueId, answers }),
      });
      const body = (await res.json()) as AttemptResponse;
      if (!res.ok || !body.ok || !body.data) {
        setError(body.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      setResult(body.data);
      logEvent('assessment_submitted', {
        dialogue_id: dialogueId,
        outcome: body.data.attempt.outcome,
        weak_points: body.data.attempt.weakPoints.length,
      });

      // D→understood: only a PASSED attempt opens the gate (server verifies it again)
      if (body.data.attempt.outcome === 'passed') {
        logEvent('mastery_passed', { dialogue_id: dialogueId, attempt_id: body.data.attempt.id });
        const progress = await postProgressEvent(dialogueId, {
          type: 'mastery_passed',
          attemptId: body.data.attempt.id,
        });
        if (progress.ok) {
          setUnderstood({ recorded: true });
          logEvent('unit_understood', { dialogue_id: dialogueId });
        } else {
          setUnderstood({
            recorded: false,
            message:
              progress.code === 'progress/invalid_transition'
                ? 'برای ثبت رسمی «فهمیدم»، چرخهٔ A→D را از /learn ادامه بده (مکالمه → درس → تمرین).'
                : (progress.message ?? 'ثبت وضعیت واحد ناموفق بود.'),
          });
        }
      } else if (body.data.attempt.outcome === 'remediate') {
        logEvent('mastery_remediated', {
          dialogue_id: dialogueId,
          weak_points: body.data.attempt.weakPoints.map((w) => w.objective),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const correctCount = result ? result.perQuestion.filter((p) => p.correct).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <style dangerouslySetInnerHTML={{ __html: POC_SCENE_CSS }} />
      {questions.map((q, qi) => {
        const g = graded?.get(q.id);
        return (
          <fieldset key={q.id} className="flex flex-col gap-2 rounded-lg border border-ink-faint bg-paper p-4">
            <legend className="px-1 text-small text-ink-soft">
              سؤال {qi + 1} از {questions.length} · {q.measureLabelFa} ({q.measure})
              {g ? (g.correct ? ' — درست ✓' : ' — نادرست ✗') : ''}
            </legend>
            <p className="text-body font-bold">{q.promptFa}</p>
            {q.jpTokens && <JpLine tokens={q.jpTokens} className="rounded-md bg-surface-warm px-3 py-2 text-ja" />}
            {q.audioLineId && (
              <button
                type="button"
                onClick={() => playAudio(q.audioLineId!)}
                disabled={!audioAvailable}
                className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper transition-colors hover:bg-ai-deep disabled:opacity-40"
              >
                ▶ پخش جمله (بدون متن)
                {audioAvailable && (
                  <span className="ms-2 rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption text-ink-soft">
                    صوت آزمایشی
                  </span>
                )}
              </button>
            )}
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const chosen = answers[q.id] === opt.id;
                const isCorrectReveal = g && g.correctOptionId === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body ${
                      g
                        ? isCorrectReveal
                          ? 'border-success bg-surface-warm font-bold'
                          : 'border-ink-faint opacity-70'
                        : chosen
                          ? 'border-ai bg-surface-warm'
                          : 'border-ink-faint hover:border-ai hover:bg-surface-warm'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={chosen}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                      disabled={Boolean(graded)}
                    />
                    {opt.jp ? (
                      <JpLine tokens={[{ surface: opt.labelFa, reading: opt.labelFa }]} className="text-ja" />
                    ) : (
                      <span>{opt.labelFa}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!allAnswered || submitting}
        className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper transition-colors hover:bg-ai-deep disabled:opacity-40"
      >
        {submitting ? 'در حال ثبت…' : 'ثبت پاسخ‌ها (نمره‌گذاری در سرور)'}
      </button>

      {error && (
        <p role="alert" className="rounded-md border-2 border-error bg-surface-warm px-4 py-3 text-small text-error">
          ثبت ناموفق بود: {error}
        </p>
      )}

      {result && understood?.recorded && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-success bg-paper p-4" aria-live="polite">
          <h3 className="text-h3 font-bold text-success">این مکالمه را فهمیدی ✓</h3>
          <p className="text-small text-ink-soft">
            وضعیت واحد: <b>understood (فهمیدم)</b> — نه «completed»؛ زبان «تمام» نمی‌شود (DD-048). تلاش شمارهٔ{' '}
            {result.attempt.attemptNo} با نتیجهٔ {result.attempt.outcome} ثبت شد و پیشرفت واحد از همان جا ادامه می‌یابد.
          </p>
          <div className="flex flex-wrap gap-3 text-small">
            <a href="/learn" className="rounded-md bg-ai px-3 py-1.5 text-paper transition-colors hover:bg-ai-deep">
              بازگشت به مسیر یادگیری
            </a>
            <a
              href="/poc/dialogue"
              className="rounded-md border border-ink-faint px-3 py-1.5 transition-colors hover:border-ai hover:bg-surface-warm"
            >
              شنیدن دوبارهٔ مکالمه
            </a>
          </div>
        </section>
      )}

      {result && !understood?.recorded && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-ai bg-paper p-4" aria-live="polite">
          <h3 className="text-h3 font-bold text-ai">
            {result.attempt.outcome === 'passed'
              ? 'پاسخ‌ها درست بود ✓'
              : correctCount >= questions.length - 1
                ? 'تقریباً — این نقطه‌ها را دوباره ببین'
                : 'هنوز زود است؛ اول درس و تمرین را مرور کن'}
          </h3>
          <p className="text-small text-ink-soft">
            {correctCount} از {questions.length} پاسخ درست · نتیجه: <b>{result.attempt.outcome}</b> (تلاش شمارهٔ{' '}
            {result.attempt.attemptNo}){understood?.message ? ` — ${understood.message}` : ''}
            {result.scoring.unassessed.length > 0
              ? ` · سنجه‌های سنجیده‌نشده: ${result.scoring.unassessed.join('، ')}`
              : ''}
          </p>
          {result.attempt.outcome === 'passed' && !understood?.message && (
            <p className="text-small text-ink-soft">
              برای ثبت رسمی «فهمیدم» چرخهٔ A→D را کامل کن — از /learn ادامه بده.
            </p>
          )}
          {result.attempt.weakPoints.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-body font-bold">نقاط ضعف (خط ↔ هدف) — دقیقاً به همان‌جا برگرد:</p>
              <ul className="flex flex-col gap-2 text-small">
                {result.attempt.weakPoints.map((wp, i) => (
                  <li key={`${wp.lineId}-${wp.objective}-${i}`} className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption">{wp.objective}</span>
                    <span>خط {wp.lineId.replace('s-cafe-morning-01-l', '')}</span>
                    <span className="text-ink-soft">شدت: {wp.severity}</span>
                    <a className="text-ai underline" href={`/poc/lesson#item-${wp.objective}`}>
                      بازگشت به درس ↗
                    </a>
                    <a className="text-ai underline" href="/poc/practice">
                      بازگشت به تمرین ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.attempt.outcome !== 'passed' && (
            <div className="flex flex-wrap gap-3 text-small">
              <a
                href="/poc/lesson"
                className="rounded-md border border-ink-faint px-3 py-1.5 transition-colors hover:border-ai hover:bg-surface-warm"
              >
                بازگشت به درس (B)
              </a>
              <a
                href="/poc/practice"
                className="rounded-md border border-ink-faint px-3 py-1.5 transition-colors hover:border-ai hover:bg-surface-warm"
              >
                بازگشت به تمرین (C)
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
