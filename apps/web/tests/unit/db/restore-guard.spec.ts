/**
 * TASK-M0-10 — restore-guard unit tests (PR #74 review round, r2/S2).
 *
 * The live-DB refusal must survive hostile inputs WITHOUT touching a server:
 * path traversal, identifier injection, and percent-encoding are all rejected by
 * pure validation before any SQL or subprocess runs. The integration drill
 * (backup-restore.spec.ts step 8) exercises the same guards end-to-end.
 */
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_DATABASES,
  databaseNameFromUrl,
  isValidDatabaseName,
  liveDatabaseNames,
  urlForDatabase,
} from '@/db/restore';

const GOOD = 'postgresql://hanaso:pw@postgres:5432/hanaso';

describe('isValidDatabaseName (strict identifier gate)', () => {
  it('accepts ordinary database names', () => {
    expect(isValidDatabaseName('hanaso')).toBe(true);
    expect(isValidDatabaseName('hanaso_restore_test')).toBe(true);
    expect(isValidDatabaseName('_private')).toBe(true);
  });

  it('rejects everything that could escape a quoted identifier or a URL path', () => {
    expect(isValidDatabaseName('../hanaso')).toBe(false); // path traversal
    expect(isValidDatabaseName('x"; DROP DATABASE hanaso; --')).toBe(false); // injection
    expect(isValidDatabaseName('hanaso%73')).toBe(false); // percent-encoding
    expect(isValidDatabaseName('hanaso test')).toBe(false); // spaces
    expect(isValidDatabaseName('pg boss')).toBe(false);
    expect(isValidDatabaseName('')).toBe(false);
    expect(isValidDatabaseName('has-dash')).toBe(false);
    expect(isValidDatabaseName('1starts-with-digit')).toBe(false);
  });
});

describe('databaseNameFromUrl (what libpq actually sees)', () => {
  it('decodes percent-encoding — a raw comparison would miss this', () => {
    expect(databaseNameFromUrl('postgresql://u:p@h:5432/hanaso%73')).toBe('hanasos');
  });

  it('normalizes dot-segments — URL parsing collapses them', () => {
    expect(databaseNameFromUrl('postgresql://u:p@h:5432/../hanaso')).toBe('hanaso');
  });

  it('falls back to the maintenance database for empty paths', () => {
    expect(databaseNameFromUrl('postgresql://u:p@h:5432/')).toBe('postgres');
    expect(databaseNameFromUrl('postgresql://u:p@h:5432')).toBe('postgres');
  });
});

describe('liveDatabaseNames (the refusal set)', () => {
  it('includes the direct URL name, the app URL name, and the system databases', () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://u:p@pgbouncer:6432/hanaso%5Fapp';
    try {
      const live = liveDatabaseNames(GOOD);
      expect(live.has('hanaso')).toBe(true); // direct URL
      expect(live.has('hanaso_app')).toBe(true); // app URL, percent-decoded
      for (const system of SYSTEM_DATABASES) expect(live.has(system)).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prev;
    }
  });
});

describe('urlForDatabase (never a traversal vehicle)', () => {
  it('builds the URL for a valid name', () => {
    expect(urlForDatabase(GOOD, 'hanaso_restore_test')).toBe(
      'postgresql://hanaso:pw@postgres:5432/hanaso_restore_test',
    );
  });

  it('refuses to build a URL for a hostile name', () => {
    expect(() => urlForDatabase(GOOD, '../hanaso')).toThrow(/invalid database name/);
    expect(() => urlForDatabase(GOOD, 'x"; DROP DATABASE hanaso; --')).toThrow(/invalid database name/);
  });
});
