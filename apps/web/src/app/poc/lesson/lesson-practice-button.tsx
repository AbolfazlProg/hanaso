'use client';
/**
 * HANASO — Lesson → Practice CTA (TASK-SLICE-01): records the B→C transition
 * (lesson studied → practice unlocked) and moves the learner to /poc/practice.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent, postProgressEvent } from '@/lib/poc/client';

export function LessonPracticeButton({ dialogueId }: { dialogueId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  async function goPractice(): Promise<void> {
    setBusy(true);
    const res = await postProgressEvent(dialogueId, { type: 'lesson_studied' });
    logEvent('lesson_studied', { dialogue_id: dialogueId, recorded: res.ok });
    if (!res.ok && res.code === 'progress/invalid_transition') {
      setWarning('برای ثبت رسمی این مرحله، اول مکالمه را تا انتها ببین (از /learn ادامه بده).');
    }
    router.push('/poc/practice');
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void goPractice()}
        disabled={busy}
        className="rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
      >
        {busy ? 'در حال ثبت…' : 'تمرین‌ها (مرحلهٔ C)'}
      </button>
      {warning && (
        <p role="alert" className="text-caption text-warning">
          {warning}
        </p>
      )}
    </div>
  );
}
