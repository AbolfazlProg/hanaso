/**
 * HANASO — the guest STUDY DOOR (server component).
 *
 * What a logged-out visitor sees instead of a lesson's reading surface:
 * the honest explanation (lists are open, reading needs an account) and
 * the two doors — login (returns to THIS lesson via ?next=) and signup.
 * Rendered by every study page when the study gate says 'guest'.
 */
import Link from 'next/link';
import { BookOpenText, LogIn, UserPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { fa } from '@/messages/fa';

export function StudyDoor({
  next,
  chapterTitleFa = null,
}: {
  /** the lesson path to return to after login (already sanitized by the caller). */
  next: string;
  /** the lesson's title, when the page knows it (better orientation). */
  chapterTitleFa?: string | null;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-md border-2 border-indigo/30 bg-card px-5 py-10 text-center shadow-raised sm:px-8">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-indigo-wash">
        <BookOpenText className="size-7 text-indigo" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-black text-indigo">
          {chapterTitleFa ? `${chapterTitleFa} — ` : ''}
          {fa.auth.guestDoorTitle}
        </h1>
        <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.auth.guestDoorBody}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          hrefLang="fa"
          className={`${buttonVariants({ variant: 'cta', size: 'main' })} w-full sm:w-auto`}
        >
          <LogIn aria-hidden className="size-4 shrink-0" />
          {fa.auth.guestDoorLoginCta}
        </Link>
        <Link
          href="/auth/signup"
          hrefLang="fa"
          className={`${buttonVariants({ variant: 'secondary', size: 'main' })} w-full sm:w-auto`}
        >
          <UserPlus aria-hidden className="size-4 shrink-0" />
          {fa.auth.guestDoorSignupCta}
        </Link>
      </div>
      <Link
        href="/learn"
        hrefLang="fa"
        className="text-caption font-bold text-ink-soft underline decoration-2 underline-offset-4 transition-colors hover:text-ink"
      >
        {fa.auth.guestDoorBack}
      </Link>
    </section>
  );
}
