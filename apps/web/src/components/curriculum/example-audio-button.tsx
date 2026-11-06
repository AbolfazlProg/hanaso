'use client';
/**
 * HANASO — ExampleAudioButton (TASK-LEARNING-08 Addendum-4 §7).
 *
 * The playable control for ONE example word in an example-set block. Every
 * example gets its OWN pre-generated audio (bound to THIS word — never a
 * neighboring character's or another word's sound). The speed cycles
 * normal 1.0 → slow 0.7 → normal (the FIRST click is always normal — the
 * Addendum-3 §9 rule kept), the current state is labeled (عادی/آهسته) and
 * the slow pass keeps pitch. Null/absent asset → the control is NOT rendered
 * (honest: no dead buttons, no misbound sound).
 */
import { Volume2 } from 'lucide-react';
import { useAudioToggle } from '@/modules/audio/toggle-playback';
import { fa } from '@/messages/fa';

export function ExampleAudioButton({
  word,
  urls,
}: {
  word: string;
  urls: { opus: string; m4a: string } | null;
}) {
  const sound = useAudioToggle(urls, word);
  if (!urls) return null;
  const label = sound.mode === 'slow' ? fa.curriculum.kanaSpeedSlow : fa.curriculum.kanaSpeedNormal;
  return (
    <button
      type="button"
      onClick={sound.toggle}
      className="flex min-h-9 cursor-pointer items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
      aria-label={`${fa.curriculum.kanaExampleAudioLabel(word)} — ${fa.curriculum.kanaSpeedLabel}: ${label}`}
      data-example-audio
      data-example-word={word}
      data-audio-mode={sound.mode}
    >
      <Volume2 aria-hidden className="size-4" />
      {label}
    </button>
  );
}
