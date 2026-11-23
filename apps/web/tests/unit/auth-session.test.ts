/**
 * HANASO — auth session pure-part unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The cookie-side contract (DB parts live in the integration suite):
 *  - token minting is 43-char base64url and never repeats;
 *  - tokenHashOf is the plain sha256 hex (the stored form is NOT the token);
 *  - the cookie contract constants (name, TTL);
 *  - device labels are coarse and Persian-readable; IP prefixes are truncated
 *    (privacy floor — never a full address at rest).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  deviceLabelFromUserAgent,
  ipPrefixOf,
  mintSessionToken,
  tokenHashOf,
} from '@/modules/auth/session';

describe('session token minting', () => {
  it('tokens are 43-char base64url, 32 bytes of entropy, never repeated', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const token = mintSessionToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      seen.add(token);
    }
    expect(seen.size).toBe(50);
  });
  it('tokenHashOf is sha256-hex of the token (never the raw token form)', () => {
    const token = mintSessionToken();
    expect(tokenHashOf(token)).toBe(createHash('sha256').update(token, 'utf8').digest('hex'));
    expect(tokenHashOf(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHashOf(token)).not.toContain(token);
  });
  it('the cookie name and TTL follow the mission contract', () => {
    expect(SESSION_COOKIE_NAME).toBe('hanaso_session');
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('device + IP privacy', () => {
  it('device labels are coarse (browser · OS) and fall back to Persian unknowns', () => {
    expect(deviceLabelFromUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0')).toBe('Chrome · Windows');
    expect(deviceLabelFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari · iOS');
    expect(deviceLabelFromUserAgent('Mozilla/5.0 (Linux; Android 14) Firefox/121.0')).toBe('Firefox · Android');
    expect(deviceLabelFromUserAgent('')).toBe('دستگاه ناشناخته');
    expect(deviceLabelFromUserAgent(null)).toBe('دستگاه ناشناخته');
  });
  it('IPv4 → first two octets; IPv6 → first two hextets; garbage/null → null', () => {
    expect(ipPrefixOf('91.99.103.21')).toBe('91.99.*.*');
    expect(ipPrefixOf('2001:db8::1')).toBe('2001:db8:*');
    expect(ipPrefixOf(null)).toBeNull();
    expect(ipPrefixOf('')).toBeNull();
  });
});
