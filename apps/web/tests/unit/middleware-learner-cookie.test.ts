/**
 * HANASO — Learner-identity middleware tests (TASK-HANASO-20 — BUG-001;
 * TASK-HANASO-24 — signed tokens + GET-only minting + httpOnly/Secure).
 *
 * The 24 contract under test:
 *  1. a cookie-less SAFE request (GET) leaves the FIRST response carrying a
 *     freshly minted SIGNED token on the request (same RSC render resolves it)
 *     and on the response (Set-Cookie, httpOnly, lax);
 *  2. a request with a VALID SIGNATURE passes through untouched (no re-mint);
 *  3. a legacy RAW uuid is re-issued SIGNED with the SAME uuid (transition —
 *     no fresh identity, no orphaned progress);
 *  4. a STATE-CHANGING request (POST) without identity gets NO mint — the
 *     route guards answer 401 (the pre-24 mint-and-proceed hole, BUG-039);
 *  5. a garbage/tampered value is never trusted as an identity.
 */
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/identity';
import { parseSessionToken } from '@/lib/learner/session';
import { signSessionTokenSync, verifySessionTokenSync } from '@/lib/learner/session-node';

const VALID = '11111111-2222-3333-4444-555555555555';

function req(url = 'http://localhost/', cookie?: string, method = 'GET'): NextRequest {
  return new NextRequest(url, { method, headers: cookie ? { cookie } : {} });
}

function signed(value: string): string {
  return signSessionTokenSync(value);
}

describe('middleware — first-visit session token minting (HANASO-20 + HANASO-24)', () => {
  it('mints a SIGNED token on a cookie-less GET: request + response both carry it', async () => {
    const request = req();
    const response = await middleware(request);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${LEARNER_COOKIE_NAME}=`);
    // the token is signed and verifiable — the client cannot invent this shape
    const token = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
    expect(verifySessionTokenSync(token)).toBeTruthy();
    // hardening flags
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    // and the Set-Cookie value equals the request-side token (one identity)
    const m = setCookie.match(new RegExp(`${LEARNER_COOKIE_NAME}=([^;]+)`));
    expect(m?.[1]).toBe(token);
  });

  it('re-mints (replaces) a MALFORMED cookie value on GET — never trusts it as an identity', async () => {
    const request = req('http://localhost/learn', `${LEARNER_COOKIE_NAME}=not-a-uuid`);
    const response = await middleware(request);
    const minted = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
    expect(minted).not.toBe('not-a-uuid');
    expect(verifySessionTokenSync(minted)).toBeTruthy();
    expect(response.headers.get('set-cookie') ?? '').toContain(minted);
  });

  it('re-mints a TAMPERED signature (valid uuid, wrong signature) — forged values die', async () => {
    const tampered = `${VALID}.${'A'.repeat(43)}`;
    const request = req('http://localhost/learn', `${LEARNER_COOKIE_NAME}=${tampered}`);
    await middleware(request);
    const minted = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
    expect(minted).not.toBe(tampered);
    // the forged uuid must NOT survive into the fresh mint either
    expect(verifySessionTokenSync(minted)).not.toBe(VALID);
  });

  it('passes a VALID SIGNED token through untouched (no re-mint — identity stability)', async () => {
    const token = signed(VALID);
    const request = req('http://localhost/learn/kana-foundation-01/journey', `${LEARNER_COOKIE_NAME}=${token}`);
    const response = await middleware(request);
    expect(request.cookies.get(LEARNER_COOKIE_NAME)?.value).toBe(token);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('re-issues a legacy RAW uuid SIGNED with the SAME uuid (one-time transition, no re-keying)', async () => {
    const request = req('http://localhost/learn', `${LEARNER_COOKIE_NAME}=${VALID}`);
    const response = await middleware(request);
    const token = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
    const parts = parseSessionToken(token);
    expect(parts?.uuid).toBe(VALID); // SAME learner id — progress rows stay reachable
    expect(verifySessionTokenSync(token)).toBe(VALID);
    expect((response.headers.get('set-cookie') ?? '').toLowerCase()).toContain('httponly');
  });

  it('does NOT mint on a state-changing request without identity (BUG-039 — route guards answer 401)', async () => {
    const post = req('http://localhost/api/curriculum/station', undefined, 'POST');
    const response = await middleware(post);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(post.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '').toBe('');
  });

  it('does NOT mint on a POST carrying only a legacy RAW uuid (forged-value neutral path)', async () => {
    const post = req('http://localhost/api/progress', `${LEARNER_COOKIE_NAME}=not-a-uuid`, 'POST');
    const response = await middleware(post);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('two cookie-less GETs mint two DIFFERENT identities (per-browser, not shared)', async () => {
    const a = req();
    await middleware(a);
    const b = req();
    await middleware(b);
    const idA = verifySessionTokenSync(a.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '');
    const idB = verifySessionTokenSync(b.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '');
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });
});
