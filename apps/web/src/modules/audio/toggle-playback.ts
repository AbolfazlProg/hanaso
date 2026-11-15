'use client';
/**
 * HANASO — normal/slow audio toggle (TASK-LEARNING-08 Addendum-3 §9).
 *
 * The playback control cycles: normal 1.0× → slow 0.7× → normal … The FIRST
 * click always plays normal speed; the CURRENT speed is visible to the learner
 * (عادی / آهسته). The slow pass keeps pitch (preservesPitch) so the voice
 * never turns unnatural. One shared cached Audio element per URL
 * (Addendum-3 §10 — no re-download per click).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedAudio, preloadAudio, reportPlaybackError } from './client-cache';

export type AudioSpeedMode = 'normal' | 'slow';

/** Slow replay rate — calm but not dragging (Addendum-3 §9). */
export const SLOW_RATE = 0.7;

export interface UseAudioToggleResult {
  /** Click: plays (alternating normal → slow → normal …) from the top. */
  toggle: () => void;
  /**
   * Automatic teaching moments (the intro sound, …): play at NORMAL speed and
   * do NOT consume the user's click cycle — the learner's first CLICK is
   * still normal (Addendum-3 §9: «اولین کلیک: پخش با سرعت عادی»).
   */
  playNormal: () => void;
  /** The speed of the audio that is/was last playing — shown to the learner. */
  mode: AudioSpeedMode;
  /** Whether an asset exists at all (null props → false, control hidden). */
  available: boolean;
}

/**
 * @param urls the dual-format pair (opus + m4a fallback) or null.
 * @param keyPart changes reset the cycle (e.g. a new character/word).
 */
export function useAudioToggle(urls: { opus: string; m4a: string } | null, keyPart?: string): UseAudioToggleResult {
  /** speed of the most recent playback (the visible state) */
  const [mode, setMode] = useState<AudioSpeedMode>('normal');
  /** speed the NEXT click will use */
  const nextRef = useRef<AudioSpeedMode>('normal');

  // reset the cycle when the target ASSET changes + warm the cache (§10).
  // Keyed by the URL STRING — a parent re-render passing an equal-value object
  // must never reset the learner's speed cycle mid-use.
  const urlKey = urls?.opus ?? null;
  useEffect(() => {
    nextRef.current = 'normal';
    setMode('normal');
    if (urlKey) void preloadAudio(urlKey);
  }, [urlKey, keyPart]);

  const playAt = useCallback(
    (speed: AudioSpeedMode, advance: boolean) => {
      if (!urls) return;
      const el = getCachedAudio(urls.opus);
      if (!el) return;
      try {
        el.pause();
        el.playbackRate = speed === 'slow' ? SLOW_RATE : 1;
        try {
          el.preservesPitch = true; // slow ≠ deep voice (Addendum-3 §9)
        } catch {
          /* engines without the property */
        }
        el.currentTime = 0;
        // dual-format fallback (ADR-009): Safari without Opus retries on m4a
        el.onerror = () => {
          if (urls.m4a && !el.src.endsWith(urls.m4a)) {
            el.src = urls.m4a;
            el.playbackRate = speed === 'slow' ? SLOW_RATE : 1;
            void el.play().catch(() => reportPlaybackError(el.src));
          } else {
            reportPlaybackError(el.src);
          }
        };
        const p = el.play();
        if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
        setMode(speed);
        if (advance) nextRef.current = speed === 'normal' ? 'slow' : 'normal';
      } catch {
        reportPlaybackError(urls.opus);
      }
    },
    [urls],
  );

  const toggle = useCallback(() => playAt(nextRef.current, true), [playAt]);
  const playNormal = useCallback(() => playAt('normal', false), [playAt]);

  return { toggle, playNormal, mode, available: !!urls };
}
