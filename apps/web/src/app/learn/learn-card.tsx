'use client';
/**
 * HANASO — Learn hub island (TASK-SLICE-01 / Issue #40): the single unit card
 * «کافه — صبح» with its live A→D stage badge + «ادامه از همان مرحله» CTA.
 * Progress is read from /api/progress (the instruction's contract); the route hint
 * comes from the progress module's pure helper.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CYCLE_STAGES, nextRouteForStage } from '@/modules/progress';
import type { UnitProgress, UnitStage } from '@/modules/progress';
import { fetchProgress, logEvent, postProgressEvent } from '@/lib/poc/client';

const STAGE_LABELS_FA: Record<UnitStage, string> = {
  A_selfcheck: 'خودآزمایی با مکالمه',
  B_lesson: 'درس از دل مکالمه',
  C_practice: 'تمرین',
  D_mastery: 'ارزیابی فهم',
};

const STAGE_ROUTES: Record<UnitStage, string> = {
  A_selfcheck: '/poc/dialogue',
  B_lesson: '/poc/lesson',
  C_practice: '/poc/practice',
  D_mastery: '/poc/assessment',
};

export function LearnCard({
  dialogueId,
  titleFa,
  sceneFa,
  jlpt,
}: {
  dialogueId: string;
  titleFa: string;
  sceneFa: string;
  jlpt: string;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<UnitProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchProgress(dialogueId)
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialogueId]);

  const hint = nextRouteForStage(progress);
  const understood = progress?.status === 'understood';

  async function continueUnit(): Promise<void> {
    logEvent('unit_continued', {
      dialogue_id: dialogueId,
      stage: progress?.stage ?? 'none',
      route: hint.route,
    });
    if (!progress) {
      // first entry: record stage A, then go watch the dialogue
      await postProgressEvent(dialogueId, { type: 'unit_started' });
      logEvent('unit_started', { dialogue_id: dialogueId });
    }
    router.push(hint.route);
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-ink-faint bg-paper p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 font-bold">{titleFa}</h2>
          <p className="text-body text-ink-soft">{sceneFa}</p>
        </div>
        <span className="rounded-sm bg-surface-muted px-2 py-1 text-caption">{jlpt}</span>
      </div>

      {/* A→D stepper */}
      <ol className="flex flex-wrap items-center gap-2" aria-label="مراحل واحد">
        {CYCLE_STAGES.map((stage, i) => {
          const current = progress?.stage === stage;
          const passed = progress ? CYCLE_STAGES.indexOf(progress.stage) > i : false;
          return (
            <li key={stage} className="flex items-center gap-2">
              <a
                href={STAGE_ROUTES[stage]}
                className={`rounded-md border px-2.5 py-1 text-small ${
                  current && !understood
                    ? 'border-ai bg-ai text-paper'
                    : passed || understood
                      ? 'border-success text-success'
                      : 'border-ink-faint text-ink-soft'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {stage[0]} · {STAGE_LABELS_FA[stage]}
              </a>
              {i < CYCLE_STAGES.length - 1 && (
                <span aria-hidden className="text-ink-faint">
                  ←
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {understood && (
        <p className="rounded-md border-2 border-success bg-surface-warm px-4 py-3 text-body text-success">
          ✓ این مکالمه را <b>فهمیدی</b> (understood) — نه «تمام کردی»؛ هر وقت بخواهی دوباره گوش بده و بخوان.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md border-2 border-error bg-surface-warm px-4 py-2 text-small text-error">
          خواندن پیشرفت ناموفق بود: {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void continueUnit()}
          disabled={loading}
          className="rounded-md bg-ai px-5 py-2.5 text-body text-paper disabled:opacity-40"
        >
          {loading
            ? '…'
            : understood
              ? 'بازگشت به مکالمه'
              : progress
                ? `ادامه از همان مرحله (${hint.stage})`
                : 'شروع: اول مکالمه را ببین'}
        </button>
        <span className="text-caption text-ink-soft">
          {progress
            ? `مرحلهٔ فعلی: ${progress.stage} · وضعیت: ${progress.status}`
            : 'هنوز شروع نشده — مرحلهٔ A در انتظار توست'}
        </span>
      </div>
    </article>
  );
}
