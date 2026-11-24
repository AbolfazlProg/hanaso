/**
 * HANASO — M2 · AUTH-PASSWORD unit suite: the PURE policy module.
 * Username normalization/validation, password scoring/gates, the
 * anti-enumeration login identifier parser.
 */
import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  normalizeUsername,
  scorePassword,
  validatePassword,
  validateUsername,
} from '@/modules/auth/password-policy';
import { parseLoginIdentifier } from '@/modules/auth/login';

describe('normalizeUsername', () => {
  it('NFKC-normalizes, lowercases, trims, strips one @', () => {
    expect(normalizeUsername('  Ｐarisa_Test ')).toBe('parisa_test');
    expect(normalizeUsername('@Ali_1384')).toBe('ali_1384');
  });
  it('empty/garbage → empty string', () => {
    expect(normalizeUsername('')).toBe('');
    expect(normalizeUsername('   ')).toBe('');
  });
});

describe('validateUsername', () => {
  it('accepts a proper handle', () => {
    expect(validateUsername('Parisa_1384')).toEqual({ ok: true, username: 'parisa_1384' });
  });
  it('rejects: empty, short, long, malformed, bad shape, reserved', () => {
    const why = (raw: string): string => {
      const check = validateUsername(raw);
      return check.ok ? 'ACCEPTED' : check.reason;
    };
    expect(why('')).toBe('empty');
    expect(why('ab')).toBe('too_short');
    expect(why('a'.repeat(31))).toBe('too_long');
    expect(why('has space')).toBe('malformed');
    expect(why('has.dots')).toBe('malformed');
    expect(why('فارسی')).toBe('malformed');
    expect(why('_leading')).toBe('bad_shape');
    expect(why('trailing_')).toBe('bad_shape');
    expect(why('double__underscore')).toBe('bad_shape');
    expect(why('admin')).toBe('reserved');
    expect(why('Hanaso')).toBe('reserved'); // case-insensitive
  });
});

describe('scorePassword + validatePassword', () => {
  it('blocked entries score 0 and refuse with too_common', () => {
    const why = (pw: string): string => {
      const check = validatePassword(pw);
      return check.ok ? 'ACCEPTED' : check.reason;
    };
    for (const pw of ['password', '12345678', 'qwerty123', 'P@ssw0rd']) {
      expect(scorePassword(pw).score).toBe(0);
      expect(why(pw)).toBe('too_common');
    }
    // sub-floor entries report too_short first (the shorter, clearer message)
    expect(why('123456')).toBe('too_short');
  });
  it('too_short under the floor', () => {
    expect(validatePassword('Ab1!x')).toMatchObject({ ok: false, reason: 'too_short' });
    expect(PASSWORD_MIN).toBe(8);
    expect(PASSWORD_MAX).toBe(128);
  });
  it('8 chars with 3+ classes passes; 8 chars with 1 class refuses (too_weak)', () => {
    expect(validatePassword('Ab1!efgh').ok).toBe(true);
    expect(validatePassword('onlylower')).toMatchObject({ ok: false, reason: 'too_weak' });
  });
  it('12+ chars with 2 classes passes (length beats variety)', () => {
    expect(validatePassword('onlylowercase12').ok).toBe(true);
  });
  it('the identifier-containment rule (username + email local-part)', () => {
    expect(validatePassword('parisa_test!A1', { username: 'parisa_test' })).toMatchObject({
      ok: false,
      reason: 'contains_identifier',
    });
    expect(validatePassword('myparisa!A1', { email: 'parisa@example.com' })).toMatchObject({
      ok: false,
      reason: 'contains_identifier',
    });
    expect(validatePassword('nothingrelated!A1', { username: 'parisa_test', email: 'parisa@example.com' }).ok).toBe(
      true,
    );
  });
  it('scores climb with length + classes', () => {
    expect(scorePassword('abcdefgh').score).toBe(1); // 8 chars, 1 class
    expect(scorePassword('Abcdefg1').score).toBe(2); // 8 chars, 3 classes
    expect(scorePassword('Abcdefg123').score).toBe(3); // 10 chars, 3 classes
    expect(scorePassword('Abcdefghijk1').score).toBe(3); // 12 chars, 3 classes
    expect(scorePassword('Abcdefghijk123!').score).toBe(4); // 15 chars, 4 classes
  });
});

describe('parseLoginIdentifier (the one-field login parser)', () => {
  it('emails lowercase and win; usernames normalize', () => {
    expect(parseLoginIdentifier('  Parisa@Example.COM ')).toEqual({ kind: 'email', value: 'parisa@example.com' });
    expect(parseLoginIdentifier('@Parisa_1384')).toEqual({ kind: 'username', value: 'parisa_1384' });
  });
  it('garbage is null (never a wildcard)', () => {
    expect(parseLoginIdentifier('')).toBeNull();
    expect(parseLoginIdentifier('a'.repeat(300))).toBeNull();
    expect(parseLoginIdentifier('no space allowed')).toBeNull(); // not a storable handle
    expect(parseLoginIdentifier('user@')).toBeNull(); // '@' but not email-shaped → not a storable handle either
  });
});
