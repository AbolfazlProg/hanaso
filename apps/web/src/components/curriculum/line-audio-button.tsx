'use client';
/**
 * HANASO — LineAudioButton (TASK-LEARNING-01) — plays ONE audio asset on demand.
 *
 * Station islands (vocab cards / listening tasks / exercises) play the SOURCE LINE
 * audio (the word's context — station-design §۱ گام ۱..۲) unless the word has a
 * committed INDEPENDENT asset (wordAudio registry, DD-119 — Issue #103) — the
 * caller decides which URL pair to pass; the honest fallback is the caller's.
 * The line text is NOT shown for listening-only usages (prop `hideText`).
 *
 * Issue #103-bug (TASK-LEARNING-07): the Audio element is cached per instance —
 * when the `audioUrl` prop changes (the runner reuses this component across cards)
 * the stale element is discarded and rebuilt, so the FIRST card's audio can never
 * replay on later cards.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSentenceButton } from '@/components/patterns/audio-button';
import { fa } from '@/messages/fa';

export interface LineAudioButtonProps {
  lineId: string;
  audioUrl: string;
  /** TASK-LEARNING-02 (Reviewer-C S2): m4a fallback for browsers without Opus (Safari). */
  audioUrlFallback?: string;
  audioAvailable: boolean;
  /** Aria label prefix (e.g. fa.curriculum.playLine). */
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Slow replay (0.9×) for the listening station (L2 default speed — LEVEL_MATRIX). */
  rate?: number;
  onPlayed?: () => void;
}

export function LineAudioButton({
  lineId,
  audioUrl,
  audioUrlFallback,
  audioAvailable,
  label,
  disabled,
  className,
  rate = 1,
  onPlayed,
}: LineAudioButtonProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');

  // Issue #103-bug: reset the cached element whenever the target asset changes —
  // otherwise the first card's Audio (old url) keeps playing on later cards.
  useEffect(() => {
    ref.current?.pause();
    ref.current = null;
    setState('idle');
  }, [audioUrl, audioUrlFallback]);

  // unmount: halt whatever is playing.
  useEffect(() => {
    return () => {
      ref.current?.pause();
      ref.current = null;
    };
  }, []);

  const play = useCallback(() => {
    if (!audioAvailable) return;
    if (!ref.current) {
      const el = new Audio(audioUrl);
      el.playbackRate = rate;
      el.addEventListener('loadstart', () => setState('loading'));
      el.addEventListener('canplay', () => setState('playing'));
      el.addEventListener('ended', () => {
        setState('idle');
        onPlayed?.();
      });
      // dual-format fallback (ADR-009): if the primary (Opus) source can't load/decode,
      // retry once with the m4a twin (Safari ≤ 18.3 has no Opus — Reviewer-C S2).
      el.addEventListener('error', () => {
        if (audioUrlFallback && !el.src.endsWith(audioUrlFallback)) {
          el.src = audioUrlFallback;
          void el.play().catch(() => setState('idle'));
        } else {
          setState('idle');
        }
      });
      ref.current = el;
    }
    void ref.current.play().catch(() => setState('idle'));
  }, [audioAvailable, audioUrl, audioUrlFallback, onPlayed, rate]);

  return (
    <AudioSentenceButton
      aria-label={`${label ?? fa.curriculum.playLine} (${lineId})`}
      state={state}
      disabled={disabled || !audioAvailable}
      onClick={play}
      className={className}
    />
  );
}
