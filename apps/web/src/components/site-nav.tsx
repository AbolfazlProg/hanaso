/**
 * HANASO — SiteNav (TASK-HANASO-17 §۴) — server component (links + badge).
 *
 * UX-AUDIT #135/#144 — the product shell is complete now that every
 * destination EXISTS:
 *   خانه (/) · مسیر یادگیری (/learn) · مرور (/review — the REAL FSRS runner)
 * plus the settings gear (/settings) on the top bar. The old rule stands: a
 * link to a non-existent page is a DEAD CONTROL — so the nav only grew when
 * the surfaces became real (the review runner went live in Part-2 ج; the
 * settings/profile page ships with this audit repair).
 *
 * The review badge is the learner's TRUE due count (server-computed, best
 * effort — a store failure renders the badge-less link, never a fake number).
 *
 * Placement (nav-blueprint v3 §۲ — immersion):
 *   desktop ≥md: slim top bar;   mobile: fixed bottom tab bar with
 *   safe-area padding (three tabs — the audited empty third slot is the
 *   review tab now). Rendered ONLY on top-level pages (home / /learn /
 *   chapter map / review / settings) — immersive sessions never show it.
 *
 * AIZEN (DD-084): paper surface, indigo structural border, lucide icons
 * (no emoji), state = weight + underline (never color alone).
 */
import Link from 'next/link';
import { Home, LogIn, Map, Repeat2, Settings, UserRound } from 'lucide-react';
import { fa } from '@/messages/fa';
import { resolveLearnerId } from '@/lib/learner/server';
import { resolveAccount } from '@/lib/auth/server';
import { getFsrsReviewStore } from '@/lib/poc/stores';

export type NavDestination = 'home' | 'learn' | 'review';

export interface SiteNavProps {
  active: NavDestination;
  /**
   * The learner's REAL due count (server-resolved). Undefined → the badge-less
   * link (404 pages / surfaces without an identity). The NAV never resolves
   * data itself — it is presentational, so jsdom unit tests render it as-is.
   */
  reviewDueCount?: number | null;
}

const DESTINATIONS: { key: NavDestination; href: string; label: string; Icon: typeof Home }[] = [
  { key: 'home', href: '/', label: fa.nav.home, Icon: Home },
  { key: 'learn', href: '/learn', label: fa.nav.journey, Icon: Map },
  { key: 'review', href: '/review', label: fa.nav.review, Icon: Repeat2 },
];

/** Best-effort due count for the review badge (never throws, never fakes). */
export async function resolveReviewDueCount(): Promise<number | null> {
  try {
    const learnerId = await resolveLearnerId();
    return await getFsrsReviewStore().countDue(learnerId, new Date());
  } catch {
    return null; // no identity / store unavailable → badge-less link
  }
}

export function SiteNav({
  active,
  reviewDueCount,
  accountHref,
  accountLabel,
}: SiteNavProps & { accountHref?: string; accountLabel?: string }) {
  const dueCount = reviewDueCount ?? null;

  const reviewLabel = (label: string) =>
    dueCount !== null && dueCount > 0 ? (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span
          className="grid min-w-6 place-items-center rounded-full bg-shu px-1.5 py-0.5 text-micro font-black text-paper"
          data-review-badge
        >
          {new Intl.NumberFormat('fa-IR').format(dueCount)}
        </span>
      </span>
    ) : (
      label
    );

  return (
    <>
      {/* ---- desktop / tablet: slim top bar ---- */}
      <header className="sticky top-0 z-30 border-b-2 border-indigo bg-paper/95 backdrop-blur">
        <nav aria-label={fa.nav.ariaLabel} className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-4">
          <span className="me-auto flex items-center gap-2 text-body font-black text-indigo">
            <span aria-hidden className="inline-block size-2.5 rounded-full bg-shu" />
            هاناسو
          </span>
          {/* the destination links live on the TOP bar only ≥md — on phones the
           * bottom tab bar is the navigation (never two competing menus). */}
          {DESTINATIONS.map(({ key, href, label }) => (
            <Link
              key={key}
              href={href}
              hrefLang="fa"
              aria-current={active === key ? 'page' : undefined}
              aria-label={
                key === 'review' && dueCount !== null && dueCount > 0 ? fa.nav.reviewAriaDue(dueCount) : undefined
              }
              className={[
                'hidden h-11 items-center rounded-md px-4 text-body font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai md:flex',
                active === key
                  ? 'bg-indigo-wash text-indigo underline decoration-2 underline-offset-8'
                  : 'text-ink-soft hover:bg-surface-warm hover:text-ink',
              ].join(' ')}
            >
              {key === 'review' ? reviewLabel(label) : label}
            </Link>
          ))}
          {/* M1 · AUTH-ACCOUNTS: the account door — logged-in users manage
           * their security methods, anonymous visitors reach the login hub. */}
          <AuthNavLink accountHref={accountHref} accountLabel={accountLabel} />
          {/* settings gear — the shell's control surface (#144; was a 404) */}
          <Link
            href="/settings"
            hrefLang="fa"
            aria-label={fa.nav.settings}
            aria-current={false}
            className="hidden h-11 w-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-surface-warm hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai md:flex"
          >
            <Settings aria-hidden className="size-5" />
          </Link>
        </nav>
      </header>

      {/* ---- mobile: fixed bottom tab bar (immersive pages never render it) ---- */}
      <nav
        aria-label={fa.nav.ariaLabel}
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-indigo bg-paper/97 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {DESTINATIONS.map(({ key, href, label, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                hrefLang="fa"
                aria-current={active === key ? 'page' : undefined}
                aria-label={
                  key === 'review' && dueCount !== null && dueCount > 0 ? fa.nav.reviewAriaDue(dueCount) : undefined
                }
                className={[
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ai',
                  active === key ? 'text-indigo' : 'text-ink-soft',
                ].join(' ')}
              >
                <span className="relative">
                  <Icon aria-hidden className="size-5" />
                  {key === 'review' && dueCount !== null && dueCount > 0 ? (
                    <span
                      className="absolute -end-2.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-shu px-1 text-micro font-black text-paper"
                      data-review-badge
                    >
                      {new Intl.NumberFormat('fa-IR').format(dueCount)}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/** M1 · AUTH-ACCOUNTS — the account door on the top bar (all sizes). */
function AuthNavLink({ accountHref, accountLabel }: { accountHref?: string; accountLabel?: string }) {
  const href = accountHref ?? '/auth/login';
  const label = accountLabel ?? fa.auth.navLogin;
  const AuthIcon = accountHref ? UserRound : LogIn;
  return (
    <Link
      href={href}
      hrefLang="fa"
      aria-label={label}
      className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-small font-bold text-ink-soft transition-colors hover:bg-surface-warm hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
    >
      <AuthIcon aria-hidden className="size-5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

/** M1: where should the account door point? (server-resolved per render) */
export async function resolveAccountDoor(): Promise<{ href: string; label: string }> {
  try {
    const account = await resolveAccount();
    if (account) return { href: '/settings/security', label: fa.auth.navAccount };
  } catch {
    /* store unavailable — anonymous door */
  }
  return { href: '/auth/login', label: fa.auth.navLogin };
}
