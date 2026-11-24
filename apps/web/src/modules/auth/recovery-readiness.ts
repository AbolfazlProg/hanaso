/**
 * HANASO — recovery readiness (owner revision 2026-11-25), the pure rule.
 *
 * «اگر رمز یادشون بره اکانت میپره» — a password alone cannot survive its own
 * forgetting. An account is recovery-ready when at least one of the three
 * real recovery doors is active: phrase (mnemonic), verified email, google.
 * (SMS is «به‌زودی» — it does not count until it exists.)
 */
export type RecoveryProvider = 'password' | 'mnemonic' | 'email' | 'google' | 'sms';

/** true when the account can survive a forgotten password. */
export function hasRecoveryMethod(providers: readonly string[]): boolean {
  return providers.includes('mnemonic') || providers.includes('email') || providers.includes('google');
}
