/**
 * HANASO — Learner identity tests (TASK-LEARNING-08 / WP-5 — #109).
 *
 * The identity seam must be strict: a malformed cookie value must NEVER become
 * a progress key (all visitors collapsing into one store is exactly the bug
 * being fixed) — it degrades to the documented poc-user fallback instead.
 */
import { describe, expect, it } from 'vitest';

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
