'use client';
/**
 * HANASO — LearnerJaProvider (SMART-RUBY 2026-11-23 §۲) — the client context
 * of the furigana law.
 *
 * Mounts ONCE in the root layout with the compact ruby transport (RSC prop —
 * the ruby-relevant subset of the course reading model: kanji-bearing words
 * + kanji facts), fetches the PER-LEARNER view from
 * /api/curriculum/learner-ja once per session (sessionStorage cache, 5-min
 * revalidate) and hands both to every SmartJaText in the tree.
 *
 * While the view is loading (or on fetch failure) the provider serves the
 * ALL-UNTAUGHT default — furigana SHOWS (the beginner-safe direction: never
 * hide a reading the learner may not know yet).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LearnerJaView, ReadingModel } from '@/modules/curriculum/knowledge/reading-model';
import { buildLearnerJaView } from '@/modules/curriculum/knowledge/reading-model';

const CACHE_KEY = 'hanaso.learner-ja.v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface LearnerJaContextValue {
  /** The compact ruby transport (static course data — the RSC prop). */
  model: ReadingModel;
  /** The per-learner view — always defined (loading = the all-untaught default). */
  view: LearnerJaView;
  /** True while the real view is being fetched (first paint of a session). */
  loading: boolean;
}

const LearnerJaContext = createContext<LearnerJaContextValue | null>(null);

/** The beginner-safe default: NO completed stations — every ruby shows. */
const EMPTY_VIEW: LearnerJaView = {
  schemaVersion: 1,
  completedStations: [],
  kanji: [],
  words: [],
};

export function LearnerJaProvider({ model, children }: { model: ReadingModel; children: ReactNode }) {
  const [view, setView] = useState<LearnerJaView>(EMPTY_VIEW);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return; // strict-mode double-run guard
    fetchedRef.current = true;
    let cancelled = false;

    const cached = readCache();
    if (cached) {
      setView(cached);
      setLoading(false);
      if (Date.now() - cachedAt() < CACHE_TTL_MS) return; // fresh enough
    }

    fetch('/api/curriculum/learner-ja')
      .then(async (res) => {
        const json = (await res.json()) as { ok?: boolean; data?: LearnerJaView };
        if (!res.ok || !json.ok || !json.data) throw new Error('learner-ja fetch failed');
        writeCache(json.data);
        if (!cancelled) setView(json.data);
      })
      .catch(() => undefined) // honest default stays: all-untaught (ruby shows)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<LearnerJaContextValue>(() => ({ model, view, loading }), [model, view, loading]);
  return <LearnerJaContext.Provider value={value}>{children}</LearnerJaContext.Provider>;
}

export function useLearnerJa(): LearnerJaContextValue {
  const ctx = useContext(LearnerJaContext);
  if (ctx) return ctx;
  // no provider (a stray island in a test or a PoC page): the safe default
  return { model: EMPTY_MODEL, view: EMPTY_VIEW, loading: false };
}

/** A no-op model for the providerless fallback (everything renders plain). */
const EMPTY_MODEL: ReadingModel = {
  wordsBySurface: new Map(),
  surfacesByFirst: new Map(),
  kanjiByLiteral: new Map(),
  chapterSlugs: [],
};

/* sessionStorage cache (best-effort — private browsing failures are ignored) */
function readCache(): LearnerJaView | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LearnerJaView;
    if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.kanji)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function cachedAt(): number {
  // the payload carries no clock — the timestamp lives in a sidecar slot
  try {
    const t = sessionStorage.getItem(`${CACHE_KEY}.at`);
    return t ? Number(t) : 0;
  } catch {
    return 0;
  }
}
function writeCache(view: LearnerJaView) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(view));
    sessionStorage.setItem(`${CACHE_KEY}.at`, String(Date.now()));
  } catch {
    /* best-effort only */
  }
}

/** Re-export for sites that build a view inline (tests). */
export { buildLearnerJaView };
