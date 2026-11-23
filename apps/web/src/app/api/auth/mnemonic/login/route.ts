/**
 * HANASO — POST /api/auth/mnemonic/login (M1 · AUTH-ACCOUNTS — mission §۱-الف).
 *
 * Re-login with the saved phrase: normalize → deterministic lookup key (the
 * O(1) route) → scrypt possession proof → session. The guest progress of the
 * CURRENT browser migrates into the account on first login from this browser
 * (mission §۳, ledger-guarded, exactly once per guest id).
 *
 * Brute-force hardening (mission §۴): 5 failed attempts per phrase / 15 min
 * → 15-minute lockout for that phrase; 40 attempts/hour per IP prefix; every
 * attempt records a ledger row.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, clientContext, establishSession, sameOriginOk } from '@/lib/auth/api';
import { normalizeMnemonicInput, redactPhrase } from '@/modules/auth/mnemonic';
import { deriveLookupKey, verifySecret } from '@/modules/auth/credentials';
import { findIdentity, touchMethodUsage } from '@/modules/auth/identities';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({ phrase: z.string().min(1).max(600) });

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }));
  }
  const { ipPrefix } = clientContext(req);
  const ipBucket = `${RATE_BUCKETS.loginIp}:${ipPrefix ?? 'unknown'}`;
  if (await tooManyEvents(ipBucket, 60 * 60 * 1000, 40)) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/rate_limited', message: 'تلاش‌های ورود بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }), { status: 429 }));
  }
  await recordRateEvent(ipBucket);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return authNoStore(NextResponse.json(fail({ code: 'auth/invalid_json', message: 'body must be JSON' }), { status: 400 }));
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/validation_failed', message: 'عبارت واردشده خوانا نیست.' }), { status: 400 }));
  }
  const phrase = normalizeMnemonicInput(parsed.data.phrase);
  if (!phrase) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/phrase_malformed', message: 'عبارت باید ۱۲ کلمهٔ دقیق فهرست باشد — بررسی کن که همهٔ کلمات کامل نوشته شده باشند.' }),
        { status: 400 },
      ),
    );
  }

  const lookupKey = deriveLookupKey(phrase);
  const failBucket = `${RATE_BUCKETS.phraseLoginFail}:${lookupKey}`;
  if (await tooManyEvents(failBucket, 15 * 60 * 1000, 5)) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/locked', message: 'به‌دلیل تلاش‌های ناموفق، این مسیر ورود موقتاً قفل شده — ۱۵ دقیقه بعد دوباره تلاش کن.' }), { status: 429 }));
  }

  const identity = await findIdentity('mnemonic', lookupKey);
  const valid = identity && !identity.disabledAt ? verifySecret(phrase, identity.credentialHash) : false;
  if (!identity || !valid) {
    await recordRateEvent(failBucket);
    // ONE honest message for unknown phrase, wrong phrase, and disabled anchor —
    // no information about which check failed (mission: no sensitive leakage).
    return authNoStore(NextResponse.json(fail({ code: 'auth/phrase_rejected', message: 'عبارت واردشده با هیچ حسابی مطابقت ندارد.' }), { status: 401 }));
  }

  await touchMethodUsage('mnemonic', lookupKey);
  const response = NextResponse.json(ok({ userId: identity.userId, method: 'mnemonic' }));
  const { mergedGuest } = await establishSession(response, req, identity.userId, 'mnemonic');
  console.info(`[auth] mnemonic login user=${identity.userId} phrase=${redactPhrase(phrase)} mergedGuest=${mergedGuest}`);
  return authNoStore(response);
}
