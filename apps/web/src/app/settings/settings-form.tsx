'use client';

/**
 * HANASO — learner display preferences (UX-AUDIT #144/#143, device-local).
 *
 * The minimal honest settings layer: the name the exercises address you by
 * and the two display defaults a beginner actually needs (subtitle default —
 * the audited «پیش‌فرض خاموش» complaint; audio speed default). Everything is
 * device-local localStorage — no fake account system (identity = the signed
 * cookie; #109's auth task owns the server-side profile).
 */
import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { fa } from '@/messages/fa';
import {
  readLearnerName,
  writeLearnerName,
  readSubtitleDefault,
  writeSubtitleDefault,
  readAudioSpeedDefault,
  writeAudioSpeedDefault,
  type AudioSpeedDefault,
} from '@/lib/learner/preferences';

/** The client form of /settings — profile + display defaults, saved locally. */
export function LearnerSettingsForm() {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState(false);
  const [speed, setSpeed] = useState<AudioSpeedDefault>('normal');
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setName(readLearnerName());
    setSubtitle(readSubtitleDefault());
    setSpeed(readAudioSpeedDefault());
    setReady(true);
  }, []);

  const save = (nextName: string, nextSubtitle: boolean, nextSpeed: AudioSpeedDefault) => {
    writeLearnerName(nextName);
    writeSubtitleDefault(nextSubtitle);
    writeAudioSpeedDefault(nextSpeed);
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ---- name (#143) ---- */}
      <label className="flex flex-col gap-1.5">
        <span className="text-body font-bold text-ink">{fa.settings.nameLabel}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder={fa.settings.namePlaceholder}
          maxLength={40}
          className="h-11 rounded-md border border-ink-faint bg-paper px-3 text-body text-ink focus:border-ai focus:outline-2 focus:outline-offset-2 focus:outline-ai"
        />
        <span className="text-caption text-ink-soft">{fa.settings.nameHint}</span>
      </label>

      {/* ---- subtitle default (#144: the audited bad default) ---- */}
      <div className="flex flex-col gap-1.5">
        <span className="text-body font-bold text-ink">{fa.settings.subtitleLabel}</span>
        <div role="radiogroup" aria-label={fa.settings.subtitleLabel} className="flex gap-2">
          {[true, false].map((on) => (
            <button
              key={String(on)}
              type="button"
              role="radio"
              aria-checked={ready && subtitle === on}
              onClick={() => {
                setSubtitle(on);
                setSaved(false);
              }}
              className={[
                'h-10 rounded-md border px-4 text-small font-bold transition-colors',
                ready && subtitle === on
                  ? 'border-ai bg-indigo-wash text-indigo'
                  : 'border-ink-faint bg-paper text-ink-soft hover:border-ai',
              ].join(' ')}
            >
              {on ? fa.settings.subtitleOn : fa.settings.subtitleOff}
            </button>
          ))}
        </div>
      </div>

      {/* ---- audio speed default ---- */}
      <div className="flex flex-col gap-1.5">
        <span className="text-body font-bold text-ink">{fa.settings.audioSpeedLabel}</span>
        <div role="radiogroup" aria-label={fa.settings.audioSpeedLabel} className="flex gap-2">
          {(['normal', 'slow'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={ready && speed === v}
              onClick={() => {
                setSpeed(v);
                setSaved(false);
              }}
              className={[
                'h-10 rounded-md border px-4 text-small font-bold transition-colors',
                ready && speed === v
                  ? 'border-ai bg-indigo-wash text-indigo'
                  : 'border-ink-faint bg-paper text-ink-soft hover:border-ai',
              ].join(' ')}
            >
              {v === 'normal' ? fa.settings.speedNormal : fa.settings.speedSlow}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => save(name, subtitle, speed)}
        className="h-11 w-fit rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
      >
        {saved ? fa.settings.nameSaved : fa.settings.savedNote}
      </button>
      {saved ? (
        <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-caption text-success">
          <CircleCheck aria-hidden className="size-3.5" />
          {fa.settings.savedNote}
        </p>
      ) : null}
    </div>
  );
}
