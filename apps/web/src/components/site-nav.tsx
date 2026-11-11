/**
 * HANASO — SiteNav (TASK-HANASO-17 §۴) — server component (links only).
 *
 * The main navigation, built from INTENTS that exist in the product TODAY:
 *   خانه (/) · مسیر یادگیری (/learn)
 * The blueprint's five destinations (خانه · یادگیری · مرور · کتابخانه · پیشرفت
 * — KB navigation-blueprint v3) render only what is REAL: review/library/
 * progress/accounts do not exist yet, and a link to a non-existent page is a
 * DEAD CONTROL (the blueprint's own rule — same reason the search icon waits
 * for phase 1.5). Growing the nav is a data-driven future change, documented
 * in DESIGN_DECISIONS N1.
 *
 * Placement (nav-blueprint v3 §۲ — immersion):
 *   desktop ≥md: slim top bar;   mobile: fixed bottom tab bar with
 *   safe-area padding. Rendered ONLY on top-level pages (home / /learn /
 *   chapter map) — immersive sessions (station / assessment / complete) never
 *   show it.
 *
 * AIZEN (DD-084): paper surface, indigo structural border, lucide icons
 * (no emoji), state = weight + underline (never color alone).
 */
import Link from 'next/link';
import { Home, Map } from 'lucide-react';
import { fa } from '@/messages/fa';

export type NavDestination = 'home' | 'learn';

export interface SiteNavProps {
  active: NavDestination;
}

const DESTINATIONS: { key: NavDestination; href: string; label: string; Icon: typeof Home }[] = [
  { key: 'home', href: '/', label: fa.nav.home, Icon: Home },
  { key: 'learn', href: '/learn', label: fa.nav.journey, Icon: Map },
];

export function SiteNav({ active }: SiteNavProps) {
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
              className={[
                'hidden h-11 items-center rounded-md px-4 text-body font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai md:flex',
                active === key
                  ? 'bg-indigo-wash text-indigo underline decoration-2 underline-offset-8'
                  : 'text-ink-soft hover:bg-surface-warm hover:text-ink',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ---- mobile: fixed bottom tab bar (immersive pages never render it) ---- */}
      <nav
        aria-label={fa.nav.ariaLabel}
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-indigo bg-paper/97 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto grid max-w-md grid-cols-2">
          {DESTINATIONS.map(({ key, href, label, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                hrefLang="fa"
                aria-current={active === key ? 'page' : undefined}
                className={[
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ai',
                  active === key ? 'text-indigo' : 'text-ink-soft',
                ].join(' ')}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
