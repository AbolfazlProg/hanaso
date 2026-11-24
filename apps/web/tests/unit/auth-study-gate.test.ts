/**
 * HANASO — unit tests: the STUDY GATE + the login return path (2026-11-25).
 *
 * The owner's rule: browsing and lesson LISTS are open to every visitor;
 * STARTING a lesson (the reading surfaces) requires an account. The pure
 * classifier and the path sanitizer are tested here; the RSC wiring is
 * verified in the live visual pass.
 */
import { describe, expect, it } from 'vitest';
import { classifyStudyAccess } from '@/lib/auth/study-gate';
import { sanitizeNextPath } from '@/lib/auth/next-path';
import { hasRecoveryMethod } from '@/modules/auth/recovery-readiness';
import { previewCookieValid, previewCookieValue } from '@/lib/preview';

describe('classifyStudyAccess — who may read lessons', () => {
  it('a live account passes', () => {
    expect(classifyStudyAccess({ previewCookie: null, account: { userId: 'u1' } })).toEqual({ mode: 'account' });
  });

  it('a signed guest cookie is STILL a guest — only an account studies', () => {
    expect(classifyStudyAccess({ previewCookie: null, account: null })).toEqual({ mode: 'guest' });
  });

  it('the owner preview cookie outranks everything (QA walks logged-out)', () => {
    process.env.PREVIEW_MODE_KEY = 'test-preview-key';
    try {
      const valid = previewCookieValue('test-preview-key');
      expect(previewCookieValid(valid)).toBe(true);
      expect(classifyStudyAccess({ previewCookie: valid, account: null })).toEqual({ mode: 'owner' });
      expect(classifyStudyAccess({ previewCookie: valid, account: { userId: 'u1' } })).toEqual({ mode: 'owner' });
    } finally {
      delete process.env.PREVIEW_MODE_KEY;
    }
  });

  it('a garbage preview cookie is just a guest', () => {
    expect(classifyStudyAccess({ previewCookie: 'garbage', account: null })).toEqual({ mode: 'guest' });
  });
});

describe('sanitizeNextPath — the login return path', () => {
  it('accepts same-origin paths with queries', () => {
    expect(sanitizeNextPath('/learn/kana-foundation-01/journey/stn-kana-h1?mode=review')).toBe(
      '/learn/kana-foundation-01/journey/stn-kana-h1?mode=review',
    );
    expect(sanitizeNextPath('/review')).toBe('/review');
    expect(sanitizeNextPath('/')).toBe('/');
  });

  it('rejects protocol-relative and absolute URLs (open-redirect guard)', () => {
    expect(sanitizeNextPath('//evil.example')).toBe('/');
    expect(sanitizeNextPath('https://evil.example')).toBe('/');
    expect(sanitizeNextPath('/\\evil.example')).toBe('/');
    expect(sanitizeNextPath('\\\\evil.example')).toBe('/');
  });

  it('rejects header-smuggling whitespace and oversized values', () => {
    expect(sanitizeNextPath('/a b')).toBe('/');
    expect(sanitizeNextPath('/a\nb')).toBe('/');
    expect(sanitizeNextPath('/a\rb')).toBe('/');
    expect(sanitizeNextPath(`/${'a'.repeat(600)}`)).toBe('/');
  });

  it('degrades undefined/null to the home path', () => {
    expect(sanitizeNextPath(undefined)).toBe('/');
    expect(sanitizeNextPath(null)).toBe('/');
    expect(sanitizeNextPath('')).toBe('/');
  });
});

describe('hasRecoveryMethod — the account-loss warning rule', () => {
  it('password alone is NOT recovery readiness', () => {
    expect(hasRecoveryMethod(['password'])).toBe(false);
    expect(hasRecoveryMethod(['password', 'sms'])).toBe(false);
  });

  it('any recovery door counts', () => {
    expect(hasRecoveryMethod(['password', 'mnemonic'])).toBe(true);
    expect(hasRecoveryMethod(['password', 'email'])).toBe(true);
    expect(hasRecoveryMethod(['google'])).toBe(true);
  });

  it('an empty method list is not ready', () => {
    expect(hasRecoveryMethod([])).toBe(false);
  });
});
