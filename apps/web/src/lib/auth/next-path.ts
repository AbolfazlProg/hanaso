/**
 * HANASO — the sanitized return path for login redirects (2026-11-25).
 *
 * The guest study door (and any protected surface) sends the visitor to
 * /auth/login?next=… — the value must be a SAME-ORIGIN path before the
 * client trusts it as a post-login destination. Pure + unit-tested; the
 * login page applies it server-side, the client never re-parses raw input.
 */

/** «/» + path/query, never «//» (protocol-relative = another origin). */
export function sanitizeNextPath(raw: string | undefined | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (raw.length > 512) return '/';
  // defense-in-depth: an embedded newline/space cannot smuggle a header
  if (/[\r\n\s]/.test(raw)) return '/';
  return raw;
}
