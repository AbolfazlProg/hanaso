/**
 * HANASO — the dismissible recovery-nudge card (client twin).
 *
 * The server resolved the danger; this shell only owns the per-browser
 * dismissal (localStorage) so the warning is a nudge, not a wall.
 */
'use client';

import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { fa } from '@/messages/fa';

const DISMISS_KEY = 'hanaso_recovery_nudge_dismissed_v1';

export function RecoveryNudgeCard() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false); // storage denied — always show the warning
    }
  }, []);

  if (dismissed !== false) return null;

  return (
    /* AUTH-M4 FIX 2026-11-25 (owner): the nudge is a VERTICAL card at every
     * width — title on top → body under it → the two buttons in their place
     * below. The previous sm:flex-row squeezed title/body/buttons into one
     * horizontal band on desktop, which broke the reading order the owner
     * specified. Same stack shape as the settings-security warning block
     * (security-view.tsx) so both warnings read identically. */
    <aside role="alert" className="flex flex-col gap-2 rounded-md border-2 border-shu/60 bg-shu/5 px-4 py-3.5">
      <h2 className="flex items-center gap-2 text-body font-black text-shu-deep">
        <TriangleAlert aria-hidden className="size-5 shrink-0" />
        {fa.auth.recoveryNudgeTitle}
      </h2>
      <p className="text-small leading-[var(--leading-fa)] text-ink">{fa.auth.recoveryNudgeBody}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href="/settings/security"
          hrefLang="fa"
          className="rounded-md bg-shu px-4 py-2 text-small font-extrabold text-card transition-colors hover:bg-shu-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu"
        >
          {fa.auth.recoveryNudgeCta}
        </a>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* storage denied — hide for this render only */
            }
            setDismissed(true);
          }}
          className="cursor-pointer rounded-sm text-caption font-bold text-ink-soft underline decoration-2 underline-offset-4 transition-colors hover:text-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu"
        >
          {fa.auth.recoveryNudgeDismiss}
        </button>
      </div>
    </aside>
  );
}
