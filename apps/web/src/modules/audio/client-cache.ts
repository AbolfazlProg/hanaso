/**
 * HANASO — browser audio asset cache (TASK-LEARNING-08 Addendum-3 §10).
 *
 * ONE small, bounded LRU of HTMLAudioElements shared by every player control:
 *  - the SAME asset is never downloaded twice for playback (the old flow built
 *    a new Audio() per click → two parallel media requests for one file);
 *  - concurrent preloads of the same URL dedupe to one in-flight promise;
 *  - `preloadAudio()` warms an element without playing (targeted prefetch of
 *    the NEXT kana in the walk — never a bulk preload);
 *  - missing assets / playback failures are logged once per URL (honest
 *    telemetry, silent for the learner);
 *  - the cache is bounded (LRU) — no unbounded memory growth.
 *
 * Server-side (RSC/tests) this module is only imported inside client islands;
 * the guards keep it inert in jsdom-like environments without real audio.
 */

const MAX_ELEMENTS = 24;

interface CacheEntry {
  el: HTMLAudioElement;
  /** in-flight preload promise (dedup) — null once settled */
  loading: Promise<HTMLAudioElement | null> | null;
  lastUsed: number;
  failed: boolean;
}

const cache = new Map<string, CacheEntry>();
const reported = new Set<string>();
let clock = 0;

function warnOnce(url: string, kind: string, err?: unknown): void {
  if (reported.has(url)) return;
  reported.add(url);
  console.warn(`[audio:${kind}] ${url}`, err ?? '');
}

function createElement(url: string): HTMLAudioElement {
  const el = typeof Audio !== 'undefined' ? new Audio(url) : (null as unknown as HTMLAudioElement);
  if (!el) return el;
  el.preload = 'auto';
  // keep pitch when a slow playback rate is used (Addendum-3 §9)
  try {
    el.preservesPitch = true;
  } catch {
    /* older engines without the property — rate change may shift pitch */
  }
  return el;
}

function evictIfNeeded(): void {
  while (cache.size > MAX_ELEMENTS) {
    // Map preserves insertion order → the front is the least-recently-touched
    // (entries are re-inserted on access to maintain LRU order)
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Get (or lazily create) the cached element for a URL. */
export function getCachedAudio(url: string): HTMLAudioElement | null {
  const hit = cache.get(url);
  if (hit) {
    // refresh LRU order
    cache.delete(url);
    cache.set(url, hit);
    hit.lastUsed = ++clock;
    return hit.el;
  }
  const el = createElement(url);
  if (!el) return null;
  const entry: CacheEntry = { el, loading: null, lastUsed: ++clock, failed: false };
  cache.set(url, entry);
  evictIfNeeded();
  return el;
}

/**
 * Warm the cache for a URL without playing (Addendum-3 §10: targeted preload).
 * Concurrent calls for the same URL share one in-flight promise. Resolves to
 * the element (or null when audio is unavailable/failed — never throws).
 */
export function preloadAudio(url: string): Promise<HTMLAudioElement | null> {
  const existing = cache.get(url);
  if (existing?.loading) return existing.loading.then((el) => el ?? null);
  if (existing) return Promise.resolve(existing.failed ? null : existing.el);
  const el = getCachedAudio(url);
  if (!el) return Promise.resolve(null);
  const entry = cache.get(url)!;
  const loading = new Promise<HTMLAudioElement | null>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      entry.loading = null;
      if (!ok) {
        entry.failed = true;
        warnOnce(url, 'missing');
      }
      resolve(ok ? el : null);
    };
    el.addEventListener('canplaythrough', () => done(true), { once: true });
    el.addEventListener('loadeddata', () => done(true), { once: true });
    el.addEventListener('error', () => done(false), { once: true });
    // jsdom and friends: load() may be a no-op — settle quickly so callers
    // never hang (play() remains the source of truth for real playback)
    try {
      el.load();
    } catch {
      done(false);
    }
    setTimeout(() => done(!entry.failed), 4000);
  });
  entry.loading = loading;
  return loading;
}

/** Report a playback failure (already-failed assets stay quiet afterwards). */
export function reportPlaybackError(url: string): void {
  warnOnce(url, 'playback');
}

/** Test hook — drop everything. */
export function resetAudioCacheForTests(): void {
  cache.clear();
  reported.clear();
}

/** Test hook — cache size. */
export function audioCacheSize(): number {
  return cache.size;
}
