'use client';
/**
 * HANASO — PoC assessment form (TASK-DLG-POC-01 + TASK-SLICE-01) — stage D.
 * 5 comprehension questions covering M1..M5 from the same dialogue → POST
 * /api/attempts (server-side scoring) → qualitative verdict + weak points.
 * outcome=passed → POST /api/progress (mastery_passed) → «فهمیدم / understood»
 * (never "completed" — DD-048). outcome=remediate → targeted return links to the
 * lesson card / practice session per the recorded weak points.
 */
import { useState } from 'react';
import { logEvent, postProgressEvent } from '@/lib/poc/client';
import { JpLine, POC_SCENE_CSS } from '../jp-text';

export interface AssessmentQuestion {
  id: string;
  measure: 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  measureLabelFa: string;
  promptFa: string;
  jpTokens?: { surface: string; reading: string }[];
  /** M4 blind listening: the line to play (no text shown). */
  audioLineId?: string;
  options: { id: string; labelFa: string; jp?: boolean }[];
  correctOptionId: string;
  weakPoint: { lineId: string; objective: string; severity: 'low' | 'medium' | 'high' };
}

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
  questions: AssessmentQuestion[];
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState<{ recorded: boolean; message?: string } | null>(null);

  const allAnswered = questions.every((q) => answers[q.id]);

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
    const scores: Record<string, number | null> = { M1: null, M2: null, M3: null, M4: null, M5: null };
    const weakPoints: AssessmentQuestion['weakPoint'][] = [];
    for (const q of questions) {
      const correct = answers[q.id] === q.correctOptionId;
      scores[q.measure] = correct ? 1 : 0;
      if (!correct) weakPoints.push(q.weakPoint);
    }
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dialogueId, scores, weakPoints }),
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

  const correctCount = result ? questions.filter((q) => answers[q.id] === q.correctOptionId).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <style dangerouslySetInnerHTML={{ __html: POC_SCENE_CSS }} />
      {questions.map((q, qi) => (
        <fieldset key={q.id} className="flex flex-col gap-2 rounded-lg border border-ink-faint bg-paper p-4">
          <legend className="px-1 text-small text-ink-soft">
            سؤال {qi + 1} از {questions.length} · {q.measureLabelFa} ({q.measure})
          </legend>
          <p className="text-body font-bold">{q.promptFa}</p>
          {q.jpTokens && <JpLine tokens={q.jpTokens} className="rounded-md bg-surface-warm px-3 py-2 text-ja" />}
          {q.audioLineId && (
            <button
              type="button"
              onClick={() => playAudio(q.audioLineId!)}
              disabled={!audioAvailable}
              className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
            >
              ▶ پخش جمله (بدون متن)
            </button>
          )}
          <div className="flex flex-col gap-2">
            {q.options.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-body ${
                  answers[q.id] === opt.id ? 'border-ai bg-surface-warm' : 'border-ink-faint'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.id}
                  checked={answers[q.id] === opt.id}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                />
                {opt.jp ? (
                  <JpLine tokens={[{ surface: opt.labelFa, reading: opt.labelFa }]} className="text-ja" />
                ) : (
                  <span>{opt.labelFa}</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!allAnswered || submitting}
        className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
      >
        {submitting ? 'در حال ثبت…' : 'ثبت پاسخ‌ها'}
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
            <a href="/learn" className="rounded-md bg-ai px-3 py-1.5 text-paper">
              بازگشت به مسیر یادگیری
            </a>
            <a href="/poc/dialogue" className="rounded-md border border-ink-faint px-3 py-1.5">
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
            نتیجهٔ موتور: <code>{result.attempt.outcome}</code> (تلاش شمارهٔ {result.attempt.attemptNo})
            {understood?.message ? ` — ${understood.message}` : ''}
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
              <a href="/poc/lesson" className="rounded-md border border-ink-faint px-3 py-1.5">
                بازگشت به درس (B)
              </a>
              <a href="/poc/practice" className="rounded-md border border-ink-faint px-3 py-1.5">
                بازگشت به تمرین (C)
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
