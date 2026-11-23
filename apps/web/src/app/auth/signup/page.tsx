/**
 * HANASO — /auth/signup (M1 · AUTH-ACCOUNTS — mission §۱-الف).
 *
 * The mnemonic signup wizard:
 *   intro (what a phrase IS, the exact warnings) → phrase display (once, with
 *   the confirm-saved checkbox) → random-position quiz (3 words — free-text,
 *   datalist of the full BIP39 list, so it is a REAL memory check) → done
 *   (account created, session set, guest progress merged).
 *
 * The phrase is re-displayable while the 15-minute window lives (the honest
 * second look), and any failure returns the user to a clean restart.
 */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fa } from '@/messages/fa';
import { getWordlist } from '@/modules/auth/wordlist';
import { SignupWizard } from './signup-wizard';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 pb-16 pt-10 md:pt-16">
      <header className="flex flex-col gap-3">
        <Link
          href="/auth/login"
          hrefLang="fa"
          className="inline-flex items-center gap-1.5 text-body font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {fa.auth.loginTitle}
        </Link>
        <h1 className="text-h1 font-black text-indigo">{fa.auth.signupTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.auth.signupLead}</p>
      </header>
      <SignupWizard wordlist={getWordlist()} />
    </main>
  );
}
