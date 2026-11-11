/**
 * HANASO — Learner identity tests (TASK-LEARNING-08 / WP-5 — #109).
 *
 * The identity seam must be strict: a malformed cookie value must NEVER become
 * a progress key (all visitors collapsing into one store is exactly the bug
 * being fixed) — it degrades to the documented poc-user fallback instead.
 */
import { describe, expect, it, vi } from 'vitest';

import { isLearnerId } from '@/lib/learner/identity';
import { LEARNER_COOKIE_NAME, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';

const VALID = '11111111-2222-3333-4444-555555555555';

function reqWithCookie(cookie: string | null): Request {
  return new Request('http://localhost/x', {
    headers: cookie === null ? {} : { cookie },
  });
}

describe('isLearnerId', () => {
  it('accepts a canonical UUID v4 shape', () => {
    expect(isLearnerId(VALID)).toBe(true);
    expect(isLearnerId(VALID.toUpperCase())).toBe(true);
  });

  it('rejects everything else — shared-store collapse is the bug being fixed', () => {
    for (const bad of [
      '',
      'poc-user',
      'x'.repeat(40),
      '11111111-2222-3333-4444',
      '../../etc/passwd',
      '11111111_2222_3333_4444_555555555555',
    ]) {
      expect(isLearnerId(bad)).toBe(false);
    }
  });
});

describe('resolveLearnerIdFromRequest', () => {
  it('reads the learner cookie from a raw Request', () => {
    const id = resolveLearnerIdFromRequest(reqWithCookie(`${LEARNER_COOKIE_NAME}=${VALID}`));
    expect(id).toBe(VALID);
  });

  it('parses among other cookies and tolerates URI encoding', () => {
    const id = resolveLearnerIdFromRequest(
      reqWithCookie(`a=1; ${LEARNER_COOKIE_NAME}=${encodeURIComponent(VALID)}; b=2`),
    );
    expect(id).toBe(VALID);
  });

  it('falls back to the documented poc-user when the cookie is absent', () => {
    expect(resolveLearnerIdFromRequest(reqWithCookie(null))).toBe(POC_DEFAULT_USER_ID);
    expect(resolveLearnerIdFromRequest(reqWithCookie('other=thing'))).toBe(POC_DEFAULT_USER_ID);
  });

  it('falls back on a MALFORMED learner cookie (never trusts it as a key)', () => {
    expect(resolveLearnerIdFromRequest(reqWithCookie(`${LEARNER_COOKIE_NAME}=not-a-uuid`))).toBe(POC_DEFAULT_USER_ID);
    expect(resolveLearnerIdFromRequest(reqWithCookie(`${LEARNER_COOKIE_NAME}=`))).toBe(POC_DEFAULT_USER_ID);
  });
});

/*
 * TASK-HANASO-16 — regression: the RSC seam (resolveLearnerId via next/headers
 * cookies) used to feed the cookie VALUE into the header-string regex helper,
 * silently collapsing every server-rendered page onto POC_DEFAULT_USER_ID
 * while the API routes resolved the real per-browser learner (server HTML ≠
 * client refresh). The next/headers jar is mocked (unit-level — no request
 * scope in vitest); vi.hoisted keeps the mutable jar available to the factory.
 */
const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'hanaso_lid' && jar.value !== undefined ? { name, value: jar.value } : undefined),
  }),
}));

describe('resolveLearnerId (RSC seam — next/headers jar)', () => {
  it('resolves the REAL cookie value, not the poc-user fallback (HANASO-16 regression)', async () => {
    jar.value = VALID;
    const { resolveLearnerId } = await import('@/lib/learner/server');
    const id = await resolveLearnerId();
    expect(id).toBe(VALID);
    expect(id).not.toBe(POC_DEFAULT_USER_ID);
    jar.value = undefined;
  });

  it('falls back to poc-user only when the cookie is absent', async () => {
    jar.value = undefined;
    const { resolveLearnerId } = await import('@/lib/learner/server');
    expect(await resolveLearnerId()).toBe(POC_DEFAULT_USER_ID);
  });

  it('falls back to poc-user on a malformed cookie value (never trusts it as a key)', async () => {
    jar.value = 'not-a-uuid';
    const { resolveLearnerId } = await import('@/lib/learner/server');
    expect(await resolveLearnerId()).toBe(POC_DEFAULT_USER_ID);
    jar.value = undefined;
  });
});
