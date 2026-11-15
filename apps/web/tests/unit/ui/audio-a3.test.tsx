// @vitest-environment jsdom
/**
 * HANASO — Addendum-3 unit tests: the audio client cache (§10), the
 * normal⇄slow toggle (§9), the kana-word romaji (§8) and the host-word audio
 * registry contract (§9).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { audioCacheSize, getCachedAudio, preloadAudio, resetAudioCacheForTests } from '@/modules/audio/client-cache';
import { useAudioToggle, SLOW_RATE } from '@/modules/audio/toggle-playback';
import { kanaWordRomaji } from '@/modules/curriculum/kana-romaji';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  playbackRate = 1;
  preservesPitch = false;
  paused = true;
  currentTime = 0;
  preload = '';
  onerror: (() => void) | null = null;
  /** registered media-event listeners (mirrors the real element API). */
  private listeners = new Map<string, Array<() => void>>();
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  addEventListener(kind: string, cb: () => void) {
    const arr = this.listeners.get(kind) ?? [];
    arr.push(cb);
    this.listeners.set(kind, arr);
  }
  /** test hook — fire the listeners of one media event. */
  emit(kind: string) {
    for (const cb of this.listeners.get(kind) ?? []) cb();
  }
  load() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

beforeEach(() => {
  FakeAudio.instances = [];
  resetAudioCacheForTests();
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audio client cache — Addendum-3 §10', () => {
  it('reuses ONE element per URL (no re-download per click)', () => {
    const a = getCachedAudio('/x.opus');
    const b = getCachedAudio('/x.opus');
    expect(a).toBe(b);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('is bounded — LRU eviction keeps at most MAX entries', () => {
    for (let i = 0; i < 30; i += 1) getCachedAudio(`/f${i}.opus`);
    expect(audioCacheSize()).toBeLessThanOrEqual(24);
  });

  it('dedups concurrent preloads of the same URL to ONE element', async () => {
    const p1 = preloadAudio('/y.opus');
    const p2 = preloadAudio('/y.opus');
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b); // the SAME element resolves from both calls
    expect(FakeAudio.instances).toHaveLength(1); // ONE element, ONE download
  });

  it('an element that fails to load is reported once and never blocks', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // jsdom FakeAudio: force the error-listener path via a broken constructor
    class BrokenAudio extends FakeAudio {
      override addEventListener(kind: string, cb: () => void) {
        super.addEventListener(kind, cb);
        if (kind === 'error') cb(); // the asset fails to load immediately
      }
    }
    vi.stubGlobal('Audio', BrokenAudio);
    const el = await preloadAudio('/broken.opus');
    expect(el).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('useAudioToggle — Addendum-3 §9 (normal ⇄ slow, pitch preserved)', () => {
  it('first click plays NORMAL 1.0×; then slow; then normal again', () => {
    const { result } = renderHook(() => useAudioToggle({ opus: '/k.opus', m4a: '/k.m4a' }));
    expect(result.current.available).toBe(true);
    act(() => result.current.toggle());
    const el = FakeAudio.instances[0]!;
    expect(el.playbackRate).toBe(1);
    expect(el.preservesPitch).toBe(true);
    expect(result.current.mode).toBe('normal');
    act(() => result.current.toggle());
    expect(FakeAudio.instances).toHaveLength(1); // cached element reused (§10)
    expect(el.playbackRate).toBe(SLOW_RATE);
    expect(result.current.mode).toBe('slow');
    act(() => result.current.toggle());
    expect(el.playbackRate).toBe(1);
    expect(result.current.mode).toBe('normal');
  });

  it('playNormal plays 1.0× WITHOUT consuming the click cycle', () => {
    const { result } = renderHook(() => useAudioToggle({ opus: '/k.opus', m4a: '/k.m4a' }));
    act(() => result.current.playNormal());
    act(() => result.current.playNormal());
    const el = FakeAudio.instances[0]!;
    expect(el.playbackRate).toBe(1);
    // the next CLICK is still the first click → normal (owner §9)
    act(() => result.current.toggle());
    expect(el.playbackRate).toBe(1);
    act(() => result.current.toggle());
    expect(el.playbackRate).toBe(SLOW_RATE);
  });

  it('null urls → not available, toggle is a no-op', () => {
    const { result } = renderHook(() => useAudioToggle(null));
    expect(result.current.available).toBe(false);
    act(() => result.current.toggle());
    expect(FakeAudio.instances).toHaveLength(0);
  });
});

describe('kanaWordRomaji — Addendum-3 §8 (Latin complement, derived from the registry)', () => {
  it('maps every kana of the word through the registry', () => {
    expect(kanaWordRomaji('あう')).toBe('au');
    expect(kanaWordRomaji('うえ')).toBe('ue');
    expect(kanaWordRomaji('すし')).toBe('sushi');
  });

  it('lengthens chōonpu (ー) by repeating the trailing vowel', () => {
    expect(kanaWordRomaji('ノート')).toBe('nooto');
    expect(kanaWordRomaji('コーヒー')).toBe('koohii');
  });

  it('passes non-kana characters through untouched', () => {
    expect(kanaWordRomaji('～かい')).toBe('~kai');
  });
});

describe('host-word audio registry — Addendum-3 §9 (contract)', () => {
  it('the manifest ships an entry for EVERY kana host word (84 words → real assets)', () => {
    const webRoot = join(__dirname, '..', '..', '..');
    const manifest = JSON.parse(
      readFileSync(join(webRoot, 'public', 'audio', 'hostwords', 'manifest.json'), 'utf8'),
    ) as { entries: Record<string, { bytes: number; hash: string }> };
    // the words come from the kana registry source — parse it the cheap way
    const src = readFileSync(join(webRoot, 'src', 'modules', 'curriculum', 'content', 'kana-items.ts'), 'utf8');
    const words = [...src.matchAll(/word: '([^']+)'/g)].map((m) => m[1]!);
    const unique = [...new Set(words)];
    expect(unique.length).toBeGreaterThan(70);
    for (const w of unique) {
      expect(manifest.entries[w], `host word ${w} must have a committed audio entry`).toBeTruthy();
    }
  });
});
