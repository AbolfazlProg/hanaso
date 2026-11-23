/**
 * HANASO — /settings/security (M1 · AUTH-ACCOUNTS — mission §۲/§۴).
 *
 * The account's security surface: the active login methods (link/unlink),
 * the mnemonic-activation prompt when the anchor is missing (never
 * mandatory), the devices list (revoke one/all), and the google/email
 * linking entry points. Requires a session — an anonymous visitor is sent
 * to the login hub.
 */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fa } from '@/messages/fa';
import { resolveAccount } from '@/lib/auth/server';
import { SecurityView } from './security-view';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const account = await resolveAccount();
  if (!account) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 pb-16 pt-10">
        <h1 className="text-h1 font-black text-indigo">{fa.auth.securityTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.auth.loginRequired}</p>
        <Link
          href="/auth/login"
          hrefLang="fa"
          className="text-body font-black text-indigo underline decoration-2 underline-offset-4"
        >
          {fa.auth.loginTitle}
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pb-28 pt-10 md:pb-12">
      <header className="flex flex-col gap-3">
        <Link
          href="/settings"
          hrefLang="fa"
          className="inline-flex items-center gap-1.5 text-body font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {fa.settings.title}
        </Link>
        <h1 className="text-h1 font-black text-indigo">{fa.auth.securityTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.auth.securityLead}</p>
      </header>
      <SecurityView />
    </main>
  );
}
