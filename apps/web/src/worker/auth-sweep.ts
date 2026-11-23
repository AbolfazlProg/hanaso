/**
 * HANASO — worker auth-artifact sweep (M1 · AUTH-ACCOUNTS).
 *
 * The short-lived auth rows age out hourly in theory, but the honest floor is
 * a daily sweep: expired pending mnemonic registrations (their sealed phrases
 * are DESTROYED — nothing readable survives the 15-minute wizard window),
 * expired OTP codes, consumed/expired oauth_states, and rate-limit events
 * older than every window. Runs 04:20 Asia/Tehran (after backup/verify/
 * events-retention — never racing the nightly dump).
 */
import { sweepAuthArtifacts } from '@/modules/auth/sweep';

export async function runAuthSweep(): Promise<{
  expiredPendingRegistrations: number;
  expiredOtpCodes: number;
  expiredOauthStates: number;
  oldRateEvents: number;
}> {
  return sweepAuthArtifacts();
}
