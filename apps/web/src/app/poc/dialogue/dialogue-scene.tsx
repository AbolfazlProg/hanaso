'use client';
/**
 * HANASO — PoC dialogue scene (TASK-DLG-POC-01) — the player island.
 *
 * Client island wiring three layers together (all behind their public contracts):
 * - PlaybackEngine (modules/dialogue) with BrowserAudioBackend (modules/audio)
 * - AnimationController + 3× SvgPlaceholderRenderer (modules/character, ADR-018)
 * - /api/events analytics sink (object_action names)
 *
 * The React tree only renders STATE derived from engine events — the engine owns timing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserAudioBackend } from '@/modules/audio';
import { AnimationController, SvgPlaceholderRenderer, listCharacters } from '@/modules/character';
import type { CharacterAssetManifest } from '@/modules/character';
import {
  PlaybackEngine,
  type AudioAssetRef,
  type CharacterRef,
  type Dialogue,
  type PlaybackStatus,
} from '@/modules/dialogue';
import { logEvent, postProgressEvent } from '@/lib/poc/client';
import { JpLine, POC_SCENE_CSS } from '../jp-text';

export interface DialogueSceneProps {
  bundle: {
    dialogue: Dialogue;
    characters: CharacterRef[];
    /** Structural mirror of DialogueAudioManifest (server type kept out of the client graph). */
    audio: {
      available: boolean;
      note?: string;
      entries: {
        lineId: string;
        voiceId: string;
        hash: string;
        files: { opus: string; m4a: string };
        bytes: number;
        durationMs?: number;
      }[];
    };
  };
  initialLineId?: string | null;
}

const DIALOGUE_SLUG = 'cafe-morning-01';

function logSceneEvent(name: string, props: Record<string, unknown>): void {
  logEvent(name, { dialogue_id: DIALOGUE_SLUG, ...props });
}

type BannerError = { code: string; message: string; lineId?: string; lineFa?: string };

export function DialogueScene({ bundle, initialLineId }: DialogueSceneProps) {
  const { dialogue, characters, audio } = bundle;
  const router = useRouter();
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showFa, setShowFa] = useState(true);
  const [speed, setSpeed] = useState<0.75 | 1>(1);
  const [banner, setBanner] = useState<BannerError | null>(null);
  const [lastLineSeen, setLastLineSeen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const initialLineHandled = useRef(false);
  const unitStartPosted = useRef(false);

  const manifestsById = useMemo(() => {
    const m = new Map<string, CharacterAssetManifest>();
    for (const c of listCharacters()) m.set(c.id, c);
    return m;
  }, []);

  const speakerNo = useMemo(() => {
    const m = new Map<string, number>();
    characters.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [characters]);

  // ------------------------------------------------------------------ engine + controller wiring
  useEffect(() => {
    const audioByLine = new Map<string, AudioAssetRef>();
    for (const e of audio.entries) {
      audioByLine.set(e.lineId, {
        lineId: e.lineId,
        voiceId: e.voiceId,
        hash: e.hash,
        files: e.files,
        bytes: e.bytes,
        durationMs: e.durationMs,
      });
    }

    const backend = new BrowserAudioBackend();
    const engine = new PlaybackEngine({
      dialogue,
      backend,
      getAudioRef: (line) => audioByLine.get(line.id) ?? null,
    });
    const controller = new AnimationController();
    engineRef.current = engine;
    controllerRef.current = controller;

    const offs: (() => void)[] = [];
    offs.push(
      engine.on('lineStart', (ev) => {
        setActiveIndex(ev.index);
        controller.handleLineStart({
          lineId: ev.line.id,
          speakerId: ev.line.speaker,
          emotionTag: ev.line.emotionTag,
          atMs: ev.atMs,
        });
      }),
    );
    offs.push(
      engine.on('lineEnd', (ev) => {
        controller.handleLineEnd({ lineId: ev.line.id, speakerId: ev.line.speaker, atMs: ev.atMs });
      }),
    );
    offs.push(
      engine.on('stateChange', (ev) => {
        setStatus(ev.status);
        controller.handlePlaybackStateChange(ev.status);
        if (ev.status !== 'error') setBanner(null);
      }),
    );
    offs.push(
      engine.on('error', (ev) => {
        setBanner({
          code: ev.error.code,
          message: ev.error.message,
          lineId: ev.error.lineId ?? ev.line.id,
          lineFa: ev.line.fa,
        });
      }),
    );

    // mount placeholder faces (ADR-018 — renderer injected; engine/UI never touch SVG directly)
    let disposed = false;
    const pending: SvgPlaceholderRenderer[] = [];
    for (const [i, c] of characters.entries()) {
      const el = faceRefs.current[i];
      const manifest = manifestsById.get(c.id);
      if (!el || !manifest) continue;
      const renderer = new SvgPlaceholderRenderer();
      pending.push(renderer);
      void renderer.mount(el, manifest).then(() => {
        if (disposed) {
          renderer.destroy();
          return;
        }
        controller.attach(c.id, renderer);
      });
    }
    controller.start();

    return () => {
      disposed = true;
      for (const off of offs) off();
      controller.stop();
      for (const c of characters) controller.detach(c.id); // detaches + destroys attached renderers
      for (const r of pending) r.destroy(); // no-op for already-destroyed
      engine.stop();
      engineRef.current = null;
      controllerRef.current = null;
    };
  }, [dialogue, characters, audio, manifestsById]);

  const initialPlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !initialLineId) return;
    engine.seekToLine(initialLineId);
    engine.play(); // arriving from a click on «در مکالمه ببین» — user-gesture chain
    logSceneEvent('dialogue_entered_at_line', { line_id: initialLineId });
  }, [initialLineId]);

  // deep link ?line=<id> (T6 «در مکالمه ببین» target)
  useEffect(() => {
    if (initialLineHandled.current || !initialLineId || !engineRef.current) return;
    initialLineHandled.current = true;
    if (dialogue.lines.some((l) => l.id === initialLineId)) initialPlay();
  }, [initialLineId, dialogue, initialPlay]);

  // keep the active bubble in view (T3: «خط فعال همیشه در دید»)
  useEffect(() => {
    if (activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  // stage A→B eligibility: the LAST line has been seen (playing it, or playback ended)
  useEffect(() => {
    if (activeIndex === dialogue.lines.length - 1 || status === 'ended') setLastLineSeen(true);
  }, [activeIndex, status, dialogue.lines.length]);

  // ------------------------------------------------------------------ controls
  const togglePlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.getStatus() === 'playing') {
      engine.pause();
      logSceneEvent('dialogue_playback_toggled', { to: 'paused', line_index: engine.getCurrentIndex() });
    } else {
      const to = engine.getCurrentIndex() >= 0 ? 'resumed' : 'started';
      engine.play();
      // first play = the unit has truly started (stage A) — record it once, best-effort
      if (!unitStartPosted.current) {
        unitStartPosted.current = true;
        void postProgressEvent(bundle.dialogue.id, { type: 'unit_started' });
        logSceneEvent('unit_started', {});
      }
      logSceneEvent('dialogue_playback_toggled', { to, line_index: engine.getCurrentIndex() });
    }
  }, [bundle.dialogue.id]);

  const jump = useCallback((direction: 1 | -1) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (direction === 1) engine.next();
    else engine.prev();
    logSceneEvent('dialogue_line_skipped', { direction: direction === 1 ? 'next' : 'prev' });
  }, []);

  const replay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.replayLine();
    logSceneEvent('dialogue_line_replayed', { line_index: engine.getCurrentIndex() });
  }, []);

  const toggleSpeed = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = engine.getSpeed() === 1 ? 0.75 : 1;
    engine.setSpeed(next);
    setSpeed(next);
    logSceneEvent('dialogue_speed_changed', { speed: next, applies_at: 'line_boundary' });
  }, []);

  const toggleFa = useCallback(() => {
    setShowFa((v) => {
      logSceneEvent('dialogue_subtitle_toggled', { fa_visible: !v });
      return !v;
    });
  }, []);

  const recover = useCallback((action: 'retry' | 'skip' | 'silent') => {
    const engine = engineRef.current;
    if (!engine) return;
    if (action === 'retry') engine.retryError();
    if (action === 'skip') engine.skipError();
    if (action === 'silent') engine.continueWithoutAudio();
    logSceneEvent('dialogue_error_recovered', { action });
  }, []);

  const playFrom = useCallback((lineId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.seekToLine(lineId);
    engine.play();
    logSceneEvent('dialogue_line_selected', { line_id: lineId });
  }, []);

  // stage A→B: only after the last line was seen — post the transition, then move on
  const finishWatching = useCallback(async () => {
    setFinishing(true);
    const res = await postProgressEvent(bundle.dialogue.id, { type: 'dialogue_watched' });
    logSceneEvent('dialogue_watched', { recorded: res.ok });
    router.push('/poc/lesson');
  }, [bundle.dialogue.id, router]);

  // ------------------------------------------------------------------ render
  const activeLine = activeIndex >= 0 ? (dialogue.lines[activeIndex] ?? null) : null;
  const isPlaying = status === 'playing';
  const started = status !== 'idle';

  return (
    <section className="flex flex-col gap-4" aria-label="صحنهٔ مکالمهٔ کافه">
      <style dangerouslySetInnerHTML={{ __html: POC_SCENE_CSS }} />

      {!audio.available && (
        <p className="rounded-md border border-ink-faint bg-surface-sunken px-4 py-2 text-small text-ink-soft">
          {audio.note} — پخش بی‌صوت ادامه می‌یابد و مسیر خطا قابل آزمایش است.
        </p>
      )}

      {/* --- character stage (3 placeholder faces, ADR-018 §۲-۴) --- */}
      <div
        data-hnsp-scene-order={characters.map((c) => c.id).join(',')}
        className="grid grid-cols-3 gap-3 rounded-lg border border-ink-faint bg-paper p-4"
      >
        {characters.map((c, i) => {
          const speaking = activeLine?.speaker === c.id && isPlaying;
          return (
            <figure
              key={c.id}
              className="flex flex-col items-center gap-1 rounded-md p-2"
              style={speaking ? { boxShadow: `inset 0 0 0 2px var(--color-speaker-${i + 1})` } : undefined}
            >
              <div
                ref={(el) => {
                  faceRefs.current[i] = el;
                }}
                className="w-24"
                aria-hidden="true"
              />
              <figcaption className="text-small" style={{ color: `var(--color-speaker-${i + 1})` }}>
                {c.nameFa}{' '}
                <span lang="ja" dir="ltr">
                  ({c.nameJa})
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {/* --- transport controls --- */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-faint bg-paper p-3">
        <button
          type="button"
          onClick={togglePlay}
          className="min-w-24 rounded-md bg-ai px-4 py-2 text-small text-paper"
          aria-label={isPlaying ? 'توقف موقت' : 'پخش'}
        >
          {isPlaying ? '⏸ توقف' : '▶ پخش'}
        </button>
        <button
          type="button"
          onClick={() => jump(-1)}
          disabled={!started}
          className="rounded-md border border-ink-faint px-3 py-2 text-small disabled:opacity-40"
          aria-label="خط قبلی"
        >
          ⏮ قبلی
        </button>
        <button
          type="button"
          onClick={replay}
          disabled={activeIndex < 0}
          className="rounded-md border border-ink-faint px-3 py-2 text-small disabled:opacity-40"
          aria-label="پخش دوبارهٔ همین جمله"
        >
          ↺ جمله
        </button>
        <button
          type="button"
          onClick={() => jump(1)}
          disabled={!started}
          className="rounded-md border border-ink-faint px-3 py-2 text-small disabled:opacity-40"
          aria-label="خط بعدی"
        >
          بعدی ⏭
        </button>
        <button
          type="button"
          onClick={toggleSpeed}
          aria-pressed={speed === 0.75}
          className="rounded-md border border-ink-faint px-3 py-2 text-small"
        >
          سرعت: {speed === 1 ? '۱×' : '۰٫۷۵×'}
        </button>
        <button
          type="button"
          onClick={toggleFa}
          aria-pressed={showFa}
          className="rounded-md border border-ink-faint px-3 py-2 text-small"
        >
          زیرنویس فارسی: {showFa ? 'روشن' : 'خاموش'}
        </button>
        <span className="ms-auto text-caption text-ink-soft" role="status">
          {activeIndex >= 0 ? `خط ${activeIndex + 1} از ${dialogue.lines.length}` : `${dialogue.lines.length} خط`}
          {' · '}
          {statusLabel(status)}
        </span>
      </div>

      {/* --- error banner (typed AudioError → user recovery, AC-957) --- */}
      {banner && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border-2 border-error bg-surface-warm px-4 py-3 text-small"
        >
          <p className="font-bold text-error">خطای صوت — {banner.code}</p>
          <p className="text-ink-soft">{banner.message}</p>
          {banner.lineFa && (
            <p>
              خط مربوط: <span className="text-ink-soft">{banner.lineFa}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => recover('retry')}
              className="rounded-md bg-ai px-3 py-1.5 text-small text-paper"
            >
              تلاش دوباره
            </button>
            <button
              type="button"
              onClick={() => recover('skip')}
              className="rounded-md border border-ink-faint px-3 py-1.5 text-small"
            >
              رد کردن این خط
            </button>
            <button
              type="button"
              onClick={() => recover('silent')}
              className="rounded-md border border-ink-faint px-3 py-1.5 text-small"
            >
              ادامه بدون صوت
            </button>
          </div>
        </div>
      )}

      {/* --- conversation bubbles --- */}
      <ol className="flex flex-col gap-2" aria-label="خطوط مکالمه">
        {dialogue.lines.map((line, i) => {
          const active = i === activeIndex;
          return (
            <li
              key={line.id}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={`flex flex-col gap-1 rounded-lg border p-3 transition-colors ${
                active ? 'border-ai bg-surface-warm' : 'border-ink-faint bg-paper'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => playFrom(line.id)}
                  className="mt-1 rounded-md border border-ink-faint px-2 py-1 text-caption"
                  aria-label={`پخش از این خط: ${line.fa}`}
                >
                  ▶
                </button>
                <div className="flex flex-1 flex-col items-start gap-1">
                  <span
                    className="text-caption"
                    style={{ color: `var(--color-speaker-${speakerNo.get(line.speaker) ?? 1})` }}
                  >
                    {characters.find((c) => c.id === line.speaker)?.nameFa ?? line.speaker}
                  </span>
                  <JpLine
                    tokens={line.tokens}
                    className={`text-ja ${active ? 'font-bold' : ''}`}
                    getHref={(t) => (t.chunk ? `/poc/lesson#item-${t.chunk}` : null)}
                  />
                  {showFa && <span className="text-body text-ink-soft">{line.fa}</span>}
                </div>
              </div>
              {(line.teaches?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 ps-8">
                  {line.teaches?.map((id) => (
                    <a
                      key={id}
                      href={`/poc/lesson#item-${id}`}
                      className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption text-ink-soft"
                    >
                      {id}
                    </a>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* --- stage A→B: finish-watching CTA (only after the LAST line was seen) --- */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void finishWatching()}
          disabled={!lastLineSeen || finishing}
          className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper disabled:opacity-40"
        >
          {finishing ? 'در حال ثبت…' : 'پایان مشاهده — رفتن به درس (B) ←'}
        </button>
        <p className="text-caption text-ink-soft">
          {lastLineSeen
            ? 'کل مکالمه را دیدی — مشاهدهٔ مرحلهٔ A ثبت و به درس می‌روی.'
            : 'برای فعال‌شدن این دکمه، مکالمه را تا خط آخر ببین.'}
        </p>
      </div>

      <nav className="flex flex-wrap gap-3 border-t border-ink-faint pt-3 text-small">
        <a href="/learn" className="text-ai underline">
          مسیر یادگیری (/learn)
        </a>
        <a href="/poc/lesson" className="text-ai underline">
          درس این مکالمه (واژه‌ها و گرامر)
        </a>
        <a href="/poc/assessment" className="text-ai underline">
          آزمون فهم (مرحلهٔ D)
        </a>
        <a href="/poc/t2-eval" className="text-ai underline">
          آزمون T2 (تشخیص گوینده)
        </a>
      </nav>
    </section>
  );
}

function statusLabel(status: PlaybackStatus): string {
  switch (status) {
    case 'idle':
      return 'آماده';
    case 'playing':
      return 'در حال پخش';
    case 'paused':
      return 'متوقف';
    case 'error':
      return 'خطا';
    case 'ended':
      return 'پایان';
  }
}
