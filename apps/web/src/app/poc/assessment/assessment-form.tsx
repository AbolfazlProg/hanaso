'use client';
/**
 * HANASO — PoC assessment form (TASK-DLG-POC-01) — stage-D sample.
 * 3 comprehension questions (M1 meaning / M3 grammar cloze / M5 speaker & intent) from the
 * same dialogue → POST /api/attempts (server-side scoring) → qualitative result + weak points.
 *
 * Honesty notes (KB dialogue-mastery-model):
 * - the full stage-D bank covers all M1..M5 (8–12 items); this PoC form samples 3 measures,
 *   so M2/M4 are reported as null and the engine outcome is `incomplete` by design;
 * - the UI shows a QUALITATIVE verdict (AC-947: no raw % to the learner).
 */
import { useState } from 'react';
import { JpLine, POC_SCENE_CSS } from '../jp-text';

export interface AssessmentQuestion {
  id: string;
  measure: 'M1' | 'M3' | 'M5';
  measureLabelFa: string;
  promptFa: string;
  jpTokens?: { surface: string; reading: string }[];
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

export function AssessmentForm({ dialogueId, questions }: { dialogueId: string; questions: AssessmentQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = questions.every((q) => answers[q.id]);

  async function submit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    setResult(null);
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
      void fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'assessment_submitted',
          props: { dialogue_id: dialogueId, outcome: body.data.attempt.outcome },
        }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const correctCount = result ? questions.filter((q) => answers[q.id] === q.correctOptionId).length : 0;
  const verdict = result
    ? correctCount === questions.length
      ? 'مکالمه را فهمیدی ✓'
      : correctCount >= questions.length - 1
        ? 'تقریباً — این نقطه‌ها را دوباره ببین'
        : 'هنوز زود است؛ اول درس را مرور کن'
    : null;

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

      {result && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-ai bg-paper p-4" aria-live="polite">
          <h3 className="text-h3 font-bold text-ai">{verdict}</h3>
          <p className="text-small text-ink-soft">
            نتیجهٔ موتور: <code>{result.attempt.outcome}</code> (تلاش شمارهٔ {result.attempt.attemptNo}) — سنجه‌های
            سنجیده‌نشده: {result.scoring.unassessed.length > 0 ? result.scoring.unassessed.join('، ') : '—'}. آزمون کامل
            مرحلهٔ D هر ۵ سنجه را می‌پوشاند؛ این فرم نمونهٔ ۳سؤالی است.
          </p>
          {result.attempt.weakPoints.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-body font-bold">نقاط ضعف (خط ↔ هدف):</p>
              <ul className="flex flex-col gap-1 text-small">
                {result.attempt.weakPoints.map((wp, i) => (
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
        </section>
      )}
    </div>
  );
}
