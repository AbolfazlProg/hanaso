/**
 * HANASO — Learner-identity middleware tests (TASK-HANASO-20 — BUG-001).
 *
 * The middleware is the first-visit fix: a cookie-less request must leave the
 * FIRST server response with a freshly minted per-browser id BOTH on the
 * request (so the same RSC render resolves it — no stale shared-account HTML)
 * and on the response (Set-Cookie). A request that already carries a VALID id
 * must pass through untouched (no re-mint — a re-mint on every request would
 * create a new identity per render and lose all progress).
 */
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/identity';

const VALID = '11111111-2222-3333-4444-555555555555';

function req(url = 'http://localhost/', cookie?: string): NextRequest {
  return new NextRequest(url, {
    headers: cookie ? { cookie } : {},
  });
}

describe('middleware — first-visit learner id minting (TASK-HANASO-20 / BUG-001)', () => {
  it('mints a fresh id on a cookie-less request: request + response both carry it', () => {
    const request = req();
    const response = middleware(request);
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${LEARNER_COOKIE_NAME}=`);
    // the SAME response's downstream render must see the id (request side)
    expect(request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '').toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    // and the Set-Cookie value must equal the request-side id (one identity)
    const m = setCookie.match(new RegExp(`${LEARNER_COOKIE_NAME}=([^;]+)`));
    expect(m?.[1]).toBe(request.cookies.get(LEARNER_COOKIE_NAME)?.value);
  });

  it('re-mints (replaces) a MALFORMED cookie value — never trusts it as an identity', () => {
    const request = req('http://localhost/learn', `${LEARNER_COOKIE_NAME}=not-a-uuid`);
    const response = middleware(request);
    const minted = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
    expect(minted).not.toBe('not-a-uuid');
    expect(minted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect((response.headers.get('set-cookie') ?? '')).toContain(minted);
  });

  it('passes a VALID existing id through untouched (no re-mint — identity stability)', () => {
    const request = req('http://localhost/learn/kana-foundation-01/journey', `${LEARNER_COOKIE_NAME}=${VALID}`);
    const response = middleware(request);
    expect(request.cookies.get(LEARNER_COOKIE_NAME)?.value).toBe(VALID);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('two cookie-less requests mint two DIFFERENT ids (per-browser, not shared)', () => {
    const a = req();
    middleware(a);
    const b = req();
    middleware(b);
    const idA = a.cookies.get(LEARNER_COOKIE_NAME)?.value;
    const idB = b.cookies.get(LEARNER_COOKIE_NAME)?.value;
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });
});
