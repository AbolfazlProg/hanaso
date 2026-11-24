/**
 * HANASO — the guest study notice (owner revision 2026-11-25).
 *
 * The open half of the study rule, said out loud where the lists render:
 * browse everything, but STARTING a lesson needs an account. Server-safe.
 */
import { BookOpenText, UserCircle2 } from 'lucide-react';
import { fa } from '@/messages/fa';

export function GuestStudyNotice() {
  return (
    <aside className="flex flex-col gap-2.5 rounded-md border-2 border-indigo/30 bg-indigo-wash px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card">
        <UserCircle2 className="size-5 text-indigo" />
      </span>
      <h2 className="flex items-center gap-2 text-small font-black text-indigo">
        <BookOpenText aria-hidden className="size-4 shrink-0" />
        {fa.auth.guestNoticeTitle}
      </h2>
      <p className="text-small leading-[var(--leading-fa)] text-ink sm:flex-1">{fa.auth.guestNoticeBody}</p>
      <a
        href="/auth/signup"
        hrefLang="fa"
        className="shrink-0 rounded-md bg-indigo px-4 py-2 text-small font-extrabold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu"
      >
        {fa.auth.guestNoticeCta}
      </a>
    </aside>
  );
}
