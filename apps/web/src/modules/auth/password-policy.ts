/**
 * HANASO — username & password policy (M2 · AUTH-PASSWORD — owner revision
 * 2026-11-24: «کاربر یه رمز خوب بزاره و هر بار با رمز و نام کاربریش وارد بشه»).
 *
 * PURE module — no node:*, no DB — so the signup/login client twins run the
 * SAME rules live (strength meter, inline validation) that the API enforces
 * server-side. One source of truth, zero drift.
 *
 * Username (the login handle):
 *  - NFKC-normalized, lowercased, `@`-stripped (people paste handles);
 *  - shape: ^[a-z0-9_]+$ , 3..30 chars, no leading/trailing `_`, no `__`;
 *  - reserved-word blocklist (admin/api/hanaso/login/… — impersonation guard).
 *
 * Password (the primary credential):
 *  - 8..128 chars (scrypt-friendly; the cap guards absurd inputs);
 *  - rejected when it appears in the common-password blocklist (lowercased,
 *    ≤ ~350 entries — the top leaked lists' head, no dependency needed);
 *  - rejected when it contains the username or the email local-part;
 *  - strength gate (OWASP-aligned): length ≥ 12 alone, OR ≥ 8 with at least
 *    3 of the 4 character classes → accepted. The meter shows 0..4 either way.
 */
/* ------------------------------------------------------------ username */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export type UsernameRejection = 'malformed' | 'too_short' | 'too_long' | 'bad_shape' | 'reserved' | 'empty';

/**
 * Normalize raw input into the canonical stored form: NFKC (full-width →
 * ASCII etc.), lowercase, trimmed, one leading `@` removed. Returns '' for
 * empty/garbage.
 */
export function normalizeUsername(raw: string): string {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFKC').trim().toLowerCase();
  if (s.startsWith('@')) s = s.slice(1);
  return s.trim();
}

/** Shape + length + reserved checks → the canonical username, or why not. */
export function validateUsername(
  raw: string,
): { ok: true; username: string } | { ok: false; reason: UsernameRejection } {
  const username = normalizeUsername(raw);
  if (username.length === 0) return { ok: false, reason: 'empty' };
  if (username.length < USERNAME_MIN) return { ok: false, reason: 'too_short' };
  if (username.length > USERNAME_MAX) return { ok: false, reason: 'too_long' };
  if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, reason: 'malformed' };
  if (username.startsWith('_') || username.endsWith('_') || username.includes('__')) {
    return { ok: false, reason: 'bad_shape' };
  }
  if (RESERVED_USERNAMES.has(username)) return { ok: false, reason: 'reserved' };
  return { ok: true, username };
}

/** Reserved handles — impersonation/platform-name squatting guard. */
const RESERVED_USERNAMES = new Set<string>([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'blog',
  'help',
  'helpdesk',
  'hanaso',
  'hanaso_ir',
  'info',
  'login',
  'logout',
  'mail',
  'mod',
  'moderator',
  'noreply',
  'no_reply',
  'null',
  'official',
  'ops',
  'owner',
  'profile',
  'root',
  'settings',
  'signup',
  'staff',
  'support',
  'system',
  'test',
  'undefined',
  'user',
  'users',
  'web',
  'www',
  'security',
  'account',
  'accounts',
  'billing',
  'careers',
  'dev',
  'developer',
  'ftp',
  'guest',
  'abuse',
  'postmaster',
  'hostmaster',
  'webmaster',
  'security_team',
  'securityteam',
]);

/* ------------------------------------------------------------ password */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type PasswordRejection = 'too_short' | 'too_long' | 'too_common' | 'contains_identifier' | 'too_weak' | 'empty';

export interface PasswordStrength {
  /** 0 (خیلی ضعیف) .. 4 (قوی) — the meter segments. */
  readonly score: 0 | 1 | 2 | 3 | 4;
  /** Character classes present (l/u/d/s). */
  readonly classes: number;
  /** Length in UTF-16 units — what the user experiences. */
  readonly length: number;
}

/** The 4-class breakdown (client hint chips + the gate input). */
export function passwordClasses(pw: string): { lower: boolean; upper: boolean; digit: boolean; symbol: boolean } {
  return {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

/**
 * Score 0..4 — a transparent heuristic (not a black box):
 *   length ≥ 16 and 3+ classes, or length ≥ 12 and 4 classes → 4
 *   length ≥ 12 and 2+ classes, or length ≥ 10 and 3+ classes → 3
 *   length ≥ 10 and 2 classes, or length ≥ 8 and 3 classes  → 2
 *   length ≥ 8 (anything else)                               → 1
 *   shorter / blocklisted                                     → 0
 */
export function scorePassword(pw: string): PasswordStrength {
  if (typeof pw !== 'string' || pw.length === 0) return { score: 0, classes: 0, length: 0 };
  const { lower, upper, digit, symbol } = passwordClasses(pw);
  const classes = [lower, upper, digit, symbol].filter(Boolean).length;
  const len = pw.length;
  if (len < PASSWORD_MIN || COMMON_PASSWORDS.has(pw.toLowerCase())) {
    return { score: 0, classes, length: len };
  }
  if ((len >= 16 && classes >= 3) || (len >= 12 && classes === 4)) return { score: 4, classes, length: len };
  if ((len >= 12 && classes >= 2) || (len >= 10 && classes >= 3)) return { score: 3, classes, length: len };
  if ((len >= 10 && classes >= 2) || (len >= 8 && classes >= 3)) return { score: 2, classes, length: len };
  return { score: 1, classes, length: len };
}

/**
 * The server-side acceptance gate (and the client's submit guard):
 *  - 8..128 chars;
 *  - not in the common-password blocklist;
 *  - must not contain the username / email local-part (and vice versa);
 *  - strength: length ≥ 12, OR ≥ 8 with ≥ 3 character classes.
 */
export function validatePassword(
  pw: string,
  context: { username?: string | null; email?: string | null } = {},
): { ok: true; strength: PasswordStrength } | { ok: false; reason: PasswordRejection; strength: PasswordStrength } {
  if (typeof pw !== 'string' || pw.length === 0) {
    return { ok: false, reason: 'empty', strength: { score: 0, classes: 0, length: 0 } };
  }
  const strength = scorePassword(pw);
  if (pw.length < PASSWORD_MIN) return { ok: false, reason: 'too_short', strength };
  if (pw.length > PASSWORD_MAX) return { ok: false, reason: 'too_long', strength };
  if (COMMON_PASSWORDS.has(pw.toLowerCase())) return { ok: false, reason: 'too_common', strength };
  const username = context.username ? normalizeUsername(context.username) : '';
  const localPart = context.email ? (context.email.split('@')[0]?.toLowerCase() ?? '') : '';
  if (username.length >= 3 && (pw.toLowerCase().includes(username) || username.includes(pw.toLowerCase()))) {
    return { ok: false, reason: 'contains_identifier', strength };
  }
  if (localPart.length >= 3 && pw.toLowerCase().includes(localPart)) {
    return { ok: false, reason: 'contains_identifier', strength };
  }
  const passes = pw.length >= 12 || strength.classes >= 3;
  if (!passes) return { ok: false, reason: 'too_weak', strength };
  return { ok: true, strength };
}

/**
 * The head of the leaked-password lists — the entries a Persian/English
 * typist actually reaches for. Kept inline (no dependency, no fetch).
 */
const COMMON_PASSWORDS = new Set<string>([
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  'qwerty',
  '1234567',
  '111111',
  '1234567890',
  '123123',
  'abc123',
  '1234',
  'password1',
  'iloveyou',
  '000000',
  'qwerty123',
  '1q2w3e4r',
  'admin',
  'qwertyuiop',
  '654321',
  '555555',
  'lovely',
  '7777777',
  '888888',
  'princess',
  'dragon',
  'sunshine',
  'master',
  'monkey',
  'shadow',
  'football',
  'letmein',
  'welcome',
  'login',
  'solo',
  'flower',
  'hottie',
  'loveme',
  'zaq12wsx',
  'password123',
  'trustno1',
  'batman',
  'superman',
  'michael',
  'jordan',
  'hunter',
  'ranger',
  'buster',
  'soccer',
  'harley',
  'andrew',
  'tigger',
  'charlie',
  'robert',
  'thomas',
  'hockey',
  'killer',
  'george',
  'asshole',
  'computer',
  'michelle',
  'jessica',
  'pepper',
  '1111',
  'zxcvbn',
  '555555',
  '11111111',
  '131313',
  'freedom',
  '777777',
  'pass',
  'maggie',
  '159753',
  'aaaaaa',
  'ginger',
  'princess1',
  'joshua',
  'cheese',
  'amanda',
  'summer',
  'ashley',
  'nicole',
  'chelsea',
  'biteme',
  'matthew',
  'access',
  'yankees',
  '987654321',
  'dallas',
  'austin',
  'thunder',
  'taylor',
  'matrix',
  'mustang',
  'internet',
  'service',
  'canada',
  'hello',
  'ranger1',
  'purple',
  'angels',
  'pepper1',
  'hkmaster',
  'fuckyou',
  'orange',
  'metal',
  'test1',
  'patriots',
  'killer1',
  'aliens',
  'marina',
  'eminem',
  'slipknot',
  'system',
  'gunner',
  'sanjay',
  'qazwsx',
  'ncc1701',
  'airport',
  'chicken',
  'tigger1',
  'redsox',
  'yellow',
  'tigers',
  'monster',
  'silver',
  'richard',
  'chris',
  'cool',
  'blue',
  'winner',
  'star',
  'titanic',
  'raiders',
  'marlboro',
  'gandalf',
  'bigdog',
  'secret',
  'lakers',
  'iceman',
  'ginger1',
  'house',
  'snoopy2',
  'love',
  'sexy',
  'babe1',
  'paris',
  'newyork',
  'yahoo',
  'gmail',
  'hotmail',
  'google',
  'asdfgh',
  'qwerty1',
  'zxcvbnm',
  'asdf',
  '123321',
  '121212',
  '666666',
  '654321a',
  'abcdef',
  'abcdefg',
  'qwe123',
  'asd123',
  '1qaz2wsx',
  'q1w2e3r4',
  'q1w2e3',
  'letmein1',
  'test',
  'test123',
  'abc',
  'abcd',
  'abc12345',
  'a123456',
  'aa123456',
  '123qwe',
  '121314',
  '112233',
  '102030',
  '147258369',
  '159357',
  '789456',
  '987654',
  'azerty',
  'samsung',
  'nokia',
  'apple',
  'asdasd',
  'qweqwe',
  'zxczxc',
  'iloveyou1',
  'password!',
  'password12',
  'p@ssw0rd',
  'p@ssword',
  'passw0rd',
  'passwort',
  'qwerty12',
  'secret123',
  'admin123',
  'admin1234',
  'root123',
  'toor',
  'administrator',
  'letmein123',
  'welcome1',
  'welcome123',
  'monkey123',
]);
