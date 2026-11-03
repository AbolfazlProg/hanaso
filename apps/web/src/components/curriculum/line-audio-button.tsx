'use client';
/**
 * HANASO — LineAudioButton (TASK-LEARNING-01) — plays ONE dialogue line's audio.
 *
 * Station islands (vocab cards / listening tasks / exercises) play the SOURCE LINE
 * audio (the word's context — station-design §۱ گام ۱..۲) instead of shipping
 * per-word TTS assets (audio pipeline is per-line — ADR-009). The line text is
 * NOT shown for listening-only usages (prop `hideText`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSentenceButton } from '@/components/patterns/audio-button';
import { fa } from '@/messages/fa';

export interface LineAudioButtonProps {
  lineId: string;
  audioUrl: string;
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
  audioAvailable,
  label,
  disabled,
  className,
  rate = 1,
  onPlayed,
}: LineAudioButtonProps) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');

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
      el.addEventListener('error', () => setState('idle'));
      ref.current = el;
    }
    void ref.current.play().catch(() => setState('idle'));
  }, [audioAvailable, audioUrl, onPlayed, rate]);

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
