/**
 * HANASO — Station walk persistence tests (TASK-LEARNING-08 / WP-5 — owner
 * feedback E).
 *
 * The localStorage snapshot is the primary resume source for refresh / back /
 * close-and-return. Contract under test:
 * - save → load round-trip keeps step, earned results, exercise positions;
 * - completed snapshots never resume (stale data is ignored, not trusted);
 * - corrupt / foreign-key data degrades to null (honest: no resume instead of
 *   a wrong position);
 * - clear() drops the snapshot (station completed);
 * - clampStepIndex keeps a snapshot from a content change from overflowing.
 *
 * The unit environment is `node` — a minimal window/localStorage stub stands in
 * (the module guards typeof window, so the stub is the whole browser contract
 * it needs).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  WALK_SNAPSHOT_VERSION,
  clampStepIndex,
  clearWalkSnapshot,
  loadWalkSnapshot,
  saveWalkSnapshot,
} from '@/modules/curriculum/walk-persistence';
import { LEARNER_ID_STORAGE_KEY } from '@/lib/learner/identity';

const LEARNER = '11111111-2222-3333-4444-555555555555';

class MemoryLocalStorage {
  private readonly map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

/** The stubbed browser globals (node env — no DOM lib collision). */
type StubWindow = { localStorage: MemoryLocalStorage };
type StubDocument = { cookie: string };
const g = globalThis as unknown as { window?: StubWindow; document?: StubDocument };

beforeEach(() => {
  // the browser contract the module needs: window.localStorage + document.cookie
  // (crypto.randomUUID comes from node's webcrypto — non-deterministic is fine,
  // the stored id carries the identity across calls).
  g.window = { localStorage: new MemoryLocalStorage() };
  g.document = { cookie: '' };
});

afterEach(() => {
  delete g.window;
  delete g.document;
});

describe('walk snapshot round-trip', () => {
  it('saves and loads the full walk position (step + earned results + exercise progress)', () => {
    saveWalkSnapshot({
      chapterSlug: 'kana-foundation-01',
      stationSlug: 'stn-kana-h1',
      stepIndex: 4,
      blockResults: { 'blk-ex-1': 0.8 },
      exerciseProgress: { 'blk-ex-2': { index: 2, firstTryCorrect: 1 } },
      sessionScore: 0.8,
    });
    const loaded = loadWalkSnapshot('kana-foundation-01', 'stn-kana-h1');
    expect(loaded).not.toBeNull();
    expect(loaded!.v).toBe(WALK_SNAPSHOT_VERSION);
    expect(loaded!.stepIndex).toBe(4);
    expect(loaded!.blockResults).toEqual({ 'blk-ex-1': 0.8 });
    expect(loaded!.exerciseProgress['blk-ex-2']).toEqual({ index: 2, firstTryCorrect: 1 });
    expect(loaded!.sessionScore).toBe(0.8);
    expect(typeof loaded!.updatedAt).toBe('number');
  });

  it('keys per station — a snapshot never leaks into another station', () => {
    saveWalkSnapshot({
      chapterSlug: 'kana-foundation-01',
      stationSlug: 'stn-kana-h1',
      stepIndex: 3,
      blockResults: {},
      exerciseProgress: {},
    });
    expect(loadWalkSnapshot('kana-foundation-01', 'stn-kana-h2')).toBeNull();
    expect(loadWalkSnapshot('conversation-first-01', 'stn-kana-h1')).toBeNull();
  });

  it('a completed snapshot never resumes (stale data is ignored)', () => {
    saveWalkSnapshot({
      chapterSlug: 'c',
      stationSlug: 's',
      stepIndex: 5,
      blockResults: {},
      exerciseProgress: {},
      completed: true,
    });
    expect(loadWalkSnapshot('c', 's')).toBeNull();
  });

  it('corrupt JSON degrades to null (no wrong-position resume)', () => {
    g.window!.localStorage.setItem(
      `${'hanaso.walk.v1'}.${LEARNER}.c.s`,
      '{not json',
    );
    expect(loadWalkSnapshot('c', 's')).toBeNull();
  });

  it('a snapshot from a different learner id is invisible (per-browser keys)', () => {
    saveWalkSnapshot({ chapterSlug: 'c', stationSlug: 's', stepIndex: 2, blockResults: {}, exerciseProgress: {} });
    // a NEW learner id (storage cleared + cookie-less) sees nothing — node's
    // crypto.randomUUID generates the fresh id, exactly like a cleared browser
    g.window!.localStorage.removeItem(LEARNER_ID_STORAGE_KEY);
    g.document!.cookie = '';
    expect(loadWalkSnapshot('c', 's')).toBeNull();
  });

  it('clearWalkSnapshot drops the snapshot (station finished)', () => {
    saveWalkSnapshot({ chapterSlug: 'c', stationSlug: 's', stepIndex: 1, blockResults: {}, exerciseProgress: {} });
    clearWalkSnapshot('c', 's');
    expect(loadWalkSnapshot('c', 's')).toBeNull();
  });
});

describe('clampStepIndex', () => {
  it('clamps an out-of-range snapshot (content changed between visits)', () => {
    expect(clampStepIndex(9, 5)).toBe(4);
    expect(clampStepIndex(2, 5)).toBe(2);
    expect(clampStepIndex(0, 5)).toBe(0);
    expect(clampStepIndex(3, 0)).toBe(0);
  });
});
