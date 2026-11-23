import Link from 'next/link';
import { ArrowLeft, CircleCheck, Repeat2, ShieldCheck } from 'lucide-react';
import { SiteNav, resolveReviewDueCount, resolveAccountDoor } from '@/components/site-nav';
import { fa } from '@/messages/fa';
import { LearnerSettingsForm } from './settings-form';
import { hasPreviewAccess } from '@/lib/preview';
import { resolveLearnerId } from '@/lib/learner/server';

/**
 * /settings — UX-AUDIT #144: the minimal product shell page (previously a
 * 404). Honest minimal scope:
 *  - PROFILE: the optional learner name (#143) — the grammar exercise's name
 *    chip reads it; stored device-locally (identity is the signed cookie; a
 *    real account system is #109's task — nothing here pretends otherwise).
 *  - DISPLAY defaults for THIS device (subtitle on/off, audio speed) — the
 *    dialogue player and kana audio read them as their initial state.
 *  - the review shortcut + the owner-preview exit when that mode is active.
 * No fake account, no fake numbers, no server-side preference store — the
 * page renders real identity facts (the local learner id) or says nothing.
 */
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const reviewDueCount = await resolveReviewDueCount();
  const accountDoor = await resolveAccountDoor();
  const learnerId = await resolveLearnerId();
  let previewActive = false;
  try {
    previewActive = await hasPreviewAccess();
  } catch {
    previewActive = false;
  }

  return (
    <>
      <SiteNav
        accountHref={accountDoor.href}
        accountLabel={accountDoor.label}
        active="home"
        reviewDueCount={reviewDueCount}
      />
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pb-28 pt-10 md:pb-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 font-black text-indigo">{fa.settings.title}</h1>
          <p className="text-lead text-ink-soft">{fa.settings.lead}</p>
        </header>

        {/* ---- profile (#143): the optional name the exercises use ---- */}
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo bg-card p-5" data-settings-profile>
          <h2 className="text-h3 font-bold text-indigo">{fa.settings.profileTitle}</h2>
          <LearnerSettingsForm />
        </section>

        {/* ---- the review shortcut (#135: the surface is always reachable) ---- */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink-faint bg-card p-5">
          <div className="flex items-start gap-3">
            <Repeat2 aria-hidden className="mt-0.5 size-5 text-ink-soft" />
            <div>
              <h2 className="text-h3 font-bold text-ink">{fa.settings.reviewTitle}</h2>
              <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">{fa.settings.reviewBody}</p>
            </div>
          </div>
          <Link
            href="/review"
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.settings.reviewCta}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </section>

        {/* ---- M1 · AUTH-ACCOUNTS: the security door ---- */}
        <section className="flex flex-col gap-2 rounded-md border-2 border-indigo/30 bg-card p-5">
          <h2 className="text-h3 font-bold text-ink">{fa.settings.securityLink}</h2>
          <p className="text-small text-ink-soft">{fa.settings.securityHint}</p>
          <Link
            href="/settings/security"
            hrefLang="fa"
            className="flex h-11 items-center gap-2 rounded-md border-2 border-indigo px-5 text-small font-bold text-indigo transition-colors hover:bg-indigo-wash"
          >
            <ShieldCheck aria-hidden className="size-4" />
            {fa.settings.securityLink}
          </Link>
        </section>

        {/* ---- honest device facts ---- */}
        <section className="flex flex-col gap-2 rounded-md border border-ink-faint bg-card p-5 text-small text-ink-soft">
          <h2 className="text-h3 font-bold text-ink">{fa.settings.learnerIdTitle}</h2>
          {learnerId ? (
            <p className="font-mono text-caption text-ink-soft" dir="ltr">
              {learnerId}
            </p>
          ) : null}
          <p className="leading-[var(--leading-fa)]">{fa.settings.learnerIdHint}</p>
        </section>

        {previewActive ? (
          <Link
            href="/preview/exit"
            className="flex h-11 w-fit items-center gap-2 rounded-md border border-warning px-4 text-small font-bold text-ink transition-colors hover:bg-surface-warm"
          >
            <CircleCheck aria-hidden className="size-4" />
            {fa.settings.exitPreview}
          </Link>
        ) : null}

        <Link href="/" className="w-fit text-small text-ink-soft underline underline-offset-4">
          {fa.settings.backHome}
        </Link>
      </main>
    </>
  );
}
