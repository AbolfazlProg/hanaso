/**
 * HANASO — Resume expiration policy tests (TASK-HANASO-17 §۸ / §13-E).
 *
 * The 7-day TTL with a CLOSED boundary, the meaningful-activity merge clock,
 * the unknown-legacy tolerance and the clock-injection discipline — all pure
 * (no production system time is ever changed; `nowMs` is a parameter).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { RESUME_TTL_MS, resumeTtlMs, resumeFreshness, parseActivityAt } from '@/modules/curriculum/resume-policy';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 12, 9, 0, 0); // fixed clock — 2026-11-12T09:00Z

describe('resume-policy — TTL constant', () => {
  it('is exactly 7×24h (one named policy, never a scattered number)', () => {
    expect(RESUME_TTL_MS).toBe(7 * DAY);
    expect(resumeTtlMs()).toBe(RESUME_TTL_MS);
  });
});

describe('resume-policy — boundary semantics (§13-E, closed boundary)', () => {
  it('activity < 7 days → fresh (resume restores)', () => {
    expect(resumeFreshness(NOW - 7 * DAY + 1, NOW)).toBe('fresh');
    expect(resumeFreshness(NOW - 1, NOW)).toBe('fresh');
  });

  it('exactly 7 days → EXPIRED (the closed edge)', () => {
    expect(resumeFreshness(NOW - 7 * DAY, NOW)).toBe('expired');
  });

  it('more than 7 days → expired', () => {
    expect(resumeFreshness(NOW - 8 * DAY, NOW)).toBe('expired');
    expect(resumeFreshness(NOW - 365 * DAY, NOW)).toBe('expired');
  });

  it('absent / unparseable timestamp → unknown (legacy rows are never punished)', () => {
    expect(resumeFreshness(null, NOW)).toBe('unknown');
    expect(resumeFreshness(undefined, NOW)).toBe('unknown');
    expect(resumeFreshness(Number.NaN, NOW)).toBe('unknown');
  });

  it('small clock skew (client ahead of server) is tolerated as fresh', () => {
    expect(resumeFreshness(NOW + 60_000, NOW)).toBe('fresh');
  });

  it('the math is timezone-free (epoch only — Tehran/Ottawa/UTC agree)', () => {
    const last = NOW - 3 * DAY;
    // the same instants expressed from different zone offsets land on the same verdict
    expect(resumeFreshness(last, NOW)).toBe('fresh');
    expect(resumeFreshness(last + 3.5 * 3600_000 - 3.5 * 3600_000, NOW)).toBe('fresh');
  });
});

describe('resume-policy — test-only TTL override (env)', () => {
  const KEY = 'HANASO_RESUME_TTL_MS';
  afterEach(() => {
    delete process.env[KEY];
  });

  it('a valid override changes the verdict (clock injection without touching system time)', () => {
    process.env[KEY] = String(10 * DAY);
    expect(resumeTtlMs()).toBe(10 * DAY);
    // 8 days: fresh under a 10-day TTL, expired under the default 7
    expect(resumeFreshness(NOW - 8 * DAY, NOW)).toBe('fresh');
    delete process.env[KEY];
    expect(resumeFreshness(NOW - 8 * DAY, NOW)).toBe('expired');
  });

  it('an invalid override falls back to the default (production never sets it)', () => {
    process.env[KEY] = 'not-a-number';
    expect(resumeTtlMs()).toBe(RESUME_TTL_MS);
    process.env[KEY] = '-5';
    expect(resumeTtlMs()).toBe(RESUME_TTL_MS);
  });
});

describe('resume-policy — parseActivityAt (ISO bridge)', () => {
  it('parses ISO strings to epoch ms', () => {
    expect(parseActivityAt('2026-11-12T09:00:00.000Z')).toBe(NOW);
  });

  it('null/undefined/garbage → null (honest unknown)', () => {
    expect(parseActivityAt(null)).toBeNull();
    expect(parseActivityAt(undefined)).toBeNull();
    expect(parseActivityAt('')).toBeNull();
    expect(parseActivityAt('yesterday-ish')).toBeNull();
  });
});
