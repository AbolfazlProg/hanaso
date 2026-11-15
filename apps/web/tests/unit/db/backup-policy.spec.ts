/**
 * HANASO — backup policy unit tests (TASK-M0-10 DB-layer; TR-030).
 * Pure logic: filenames, date parsing, KB retention (7 daily / 4 weekly / 6 monthly),
 * URL redaction and pg_dump version compatibility.
 */
import { describe, expect, it } from 'vitest';
import {
  backupFileName,
  parseBackupDate,
  selectKeptFiles,
  KB_RETENTION,
  redactUrl,
  dumpClientCompatible,
} from '@/worker/backup';

describe('backupFileName / parseBackupDate', () => {
  it('formats hanaso-<UTC-timestamp>.dump and round-trips', () => {
    const at = new Date('2026-11-02T03:30:00.250Z');
    const name = backupFileName(at);
    expect(name).toBe('hanaso-2026-11-02-03-30-00.dump');
    expect(parseBackupDate(name)?.toISOString()).toBe('2026-11-02T03:30:00.000Z');
  });

  it('rejects foreign filenames', () => {
    expect(parseBackupDate('random.txt')).toBeNull();
    expect(parseBackupDate('hanaso-not-a-date.dump')).toBeNull();
  });
});

describe('selectKeptFiles (KB retention: daily 7 / weekly 4 / monthly 6)', () => {
  it('keeps everything while under every bucket limit', () => {
    const files = [1, 2, 3].map((d) => `hanaso-2026-10-0${d}-03-30-00.dump`);
    expect(selectKeptFiles(files)).toHaveLength(3);
  });

  it('prunes to one per day beyond 7 distinct days', () => {
    const files = Array.from({ length: 14 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return `hanaso-2026-10-${day}-03-30-00.dump`; // 14 consecutive days
    });
    const kept = selectKeptFiles(files);
    // 7 daily + weekly/monthly buckets may keep extras — never fewer than 7
    expect(kept.length).toBeGreaterThanOrEqual(7);
    expect(kept.length).toBeLessThan(files.length);
  });

  it('keeps the NEWEST file first regardless of listing order', () => {
    const files = [
      'hanaso-2026-10-01-03-30-00.dump',
      'hanaso-2026-11-02-03-30-00.dump',
      'hanaso-2026-10-15-03-30-00.dump',
    ];
    expect(selectKeptFiles(files)[0]).toBe('hanaso-2026-11-02-03-30-00.dump');
  });

  it('ignores non-backup files entirely', () => {
    const kept = selectKeptFiles(['notes.txt', 'hanaso-2026-11-02-03-30-00.dump']);
    expect(kept).toEqual(['hanaso-2026-11-02-03-30-00.dump']);
  });

  it('exposes the KB policy numbers', () => {
    expect(KB_RETENTION).toEqual({ daily: 7, weekly: 4, monthly: 6 });
  });
});

describe('redactUrl', () => {
  it('masks the password but keeps host/port/db', () => {
    expect(redactUrl('postgresql://hanaso:sekret@postgres:5432/hanaso')).toBe(
      'postgresql://hanaso:***@postgres:5432/hanaso',
    );
  });

  it('survives invalid input without throwing', () => {
    expect(redactUrl('not a url')).toBe('<invalid-url>');
  });
});

describe('dumpClientCompatible', () => {
  it('requires the client major to be >= the server major', () => {
    expect(dumpClientCompatible('18.6', '18.6')).toBe(true);
    expect(dumpClientCompatible('17.4', '18.6')).toBe(false);
    expect(dumpClientCompatible('19.1', '18.6')).toBe(true);
  });
});
