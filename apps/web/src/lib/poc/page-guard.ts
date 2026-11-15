/**
 * HANASO — /poc page guard (TASK-HANASO-24 / CP-03 — audit BUG-032).
 *
 * The `/poc/*` pages are legacy engineering demos from the TASK-SLICE-01 era.
 * The product never links into them (invariant asserted by app/learn/page.tsx),
 * and the real H22 surfaces (/practice + /api/practice + curriculum) replaced
 * their function — with server-side grading and key stripping, which /poc
 * pages never had (the /poc/practice RSC payload shipped the full answer key
 * to ANY visitor — confirmed on production with one GET).
 *
 * Per the TASK-HANASO-24 remediation decision these pages are DEV/TEST-ONLY:
 * in production this guard renders 404 via notFound() — the page body never
 * runs, its props never reach a client island, and NOTHING of it exists in the
 * RSC flight payload, the HTML, the API responses or the JS bundles.
 * In development and under vitest (NODE_ENV=development|test) the pages keep
 * working exactly as before for demos and the integration flows.
 */
import { notFound } from 'next/navigation';

/** In production /poc pages do not exist (see module docs). */
export function guardPocPage(): void {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
}
