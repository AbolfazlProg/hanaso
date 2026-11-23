/**
 * HANASO — oauth transaction cookie unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The PKCE-verifier carrier: signed (domain-separated HMAC), state-bound,
 * tamper-dead, length-capped.
 */
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OAUTH_COOKIE_NAME, signOauthCookie, verifyOauthCookie } from '@/lib/auth/oauth-cookie';
import { randomUrlToken } from '@/modules/auth/google';

describe('signOauthCookie / verifyOauthCookie', () => {
  it('roundtrips (state, verifier) pairs', () => {
    const state = randomUrlToken();
    const verifier = randomUrlToken(48);
    const parsed = verifyOauthCookie(signOauthCookie(state, verifier));
    expect(parsed).toEqual({ state, verifier });
  });
  it('the cookie name is the documented one', () => {
    expect(OAUTH_COOKIE_NAME).toBe('hanaso_oauth_tx');
  });
  it('any tamper (state, verifier, signature) → null', () => {
    const state = randomUrlToken();
    const verifier = randomUrlToken(48);
    const value = signOauthCookie(state, verifier);
    expect(verifyOauthCookie(`${randomUrlToken()}.${verifier}.${value.split('.')[2]}`)).toBeNull();
    expect(verifyOauthCookie(`${state}.another-verifier-value.${value.split('.')[2]}`)).toBeNull();
    const flipped = String.fromCharCode(value.charCodeAt(0) ^ 1) + value.slice(1);
    expect(verifyOauthCookie(flipped)).toBeNull();
  });
  it('garbage / absent values never throw', () => {
    expect(verifyOauthCookie(null)).toBeNull();
    expect(verifyOauthCookie('')).toBeNull();
    expect(verifyOauthCookie('a.b.c')).toBeNull();
    expect(verifyOauthCookie('.'.repeat(3))).toBeNull();
  });
  it('a FORGED signature (same message, attacker key) never passes', () => {
    const state = randomUrlToken();
    const verifier = randomUrlToken(48);
    const forged = createHmac('sha256', 'attacker-secret')
      .update(`hanaso:oauth:v1:${state}:${verifier}`)
      .digest('base64url');
    expect(verifyOauthCookie(`${state}.${verifier}.${forged}`)).toBeNull();
  });
  it('absurd lengths are rejected before any crypto', () => {
    const long = 'a'.repeat(200);
    expect(verifyOauthCookie(`${long}.${long}.${'x'.repeat(43)}`)).toBeNull();
  });
});
