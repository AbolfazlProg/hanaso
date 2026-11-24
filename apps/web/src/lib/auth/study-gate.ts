/**
 * HANASO — the STUDY GATE (owner revision 2026-11-25).
 *
 * «یوزرها باید بتونن وارد سایت بشن طبق معمول بدون لاگین و درس‌ها و لیستشو
 * اینارو همشون بتونن ببینن، اما یوزرهایی که لاگین نکردن نباید بتونن شروع
 * کنن خوندن درس‌ها رو» — browsing (home, chapter maps, lesson LISTS) is open
 * to every visitor; STARTING a lesson (the station/dialogue/assessment/
 * review reading surfaces) requires an account, because progress only
 * exists on an account.
 *
 * Who passes:
 *  - 'account' — a live HANASO session;
 *  - 'owner'   — the owner's preview cookie (QA must walk lessons logged-out);
 *  - 'guest'   — everyone else → the study pages render the login door.
 *
 * The page gate IS the reading gate: lesson content is composed server-side
 * in RSC and never shipped for a guest; the walk/progress APIs keep the M1
 * signed-learner contract (per-browser private rows that merge at signup —
 * no content flows through them, so no bypass of the reading surface).
 */
import { cookies } from 'next/headers';
import { previewCookieValid } from '@/lib/preview';
import { resolveAccount } from '@/lib/auth/server';

export type StudyAccess = { mode: 'account' | 'owner' | 'guest' };

/** Pure classifier (unit-tested): the cookie/session facts → the gate verdict. */
export function classifyStudyAccess(input: { previewCookie: string | null; account: unknown }): StudyAccess {
  if (previewCookieValid(input.previewCookie)) return { mode: 'owner' };
  if (input.account) return { mode: 'account' };
  return { mode: 'guest' };
}

/** The gate verdict for an RSC render (cookies via next/headers). */
export async function resolveStudyAccess(): Promise<StudyAccess> {
  const jar = await cookies();
  let account: unknown = null;
  try {
    account = await resolveAccount();
  } catch {
    account = null; // store hiccup — fail CLOSED on the reading surface
  }
  return classifyStudyAccess({ previewCookie: jar.get('hanaso_preview')?.value ?? null, account });
}
