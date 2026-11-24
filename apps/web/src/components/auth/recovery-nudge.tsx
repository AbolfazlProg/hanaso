/**
 * HANASO — the recovery-readiness nudge (owner revision 2026-11-25:
 * «یوزرها باید تشویق شن حداقل یکی از روش‌های بازیابی رو فعال کنن و بهشون
 * هشدار داده بشه مگرنه اگر رمز یادشون بره اکانت میپره»).
 *
 * A server component: resolves the session + the account's active methods,
 * and when NO recovery door exists (no phrase, no verified email, no google)
 * renders the honest warning card. Dismissal is per-browser (localStorage —
 * the nudge returns on a new device, which is exactly when it should).
 */
import { resolveAccount } from '@/lib/auth/server';
import { listActiveMethods } from '@/modules/auth/identities';
import { hasRecoveryMethod } from '@/modules/auth/recovery-readiness';
import { RecoveryNudgeCard } from './recovery-nudge-card';

export async function RecoveryNudge() {
  let providers: string[] = [];
  try {
    const account = await resolveAccount();
    if (!account) return null; // guests get the study door, not this nudge
    providers = (await listActiveMethods(account.userId)).map((m) => m.provider);
  } catch {
    return null; // store hiccup — never break the page for a nudge
  }
  if (hasRecoveryMethod(providers)) return null;
  return <RecoveryNudgeCard />;
}
