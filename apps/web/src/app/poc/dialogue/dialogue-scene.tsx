'use client';
/**
 * HANASO — PoC dialogue scene (TASK-DLG-POC-01; overhauled in TASK-LEARNING-07 Wave 2) — the player island.
 *
 * Client island wiring three layers together (all behind their public contracts):
 * - PlaybackEngine (modules/dialogue) with BrowserAudioBackend wrapped in
 *   JointTurnBackend (modules/audio) — joint lines load the primary asset AND the
 *   co-speaker's `${lineId}-co` asset and play them simultaneously (05B §6).
 * - AnimationController + 3× SvgPlaceholderRenderer (modules/character, ADR-018)
 * - /api/events analytics sink (object_action names)
 *
 * The React tree only renders STATE derived from engine events — the engine owns timing.
 *
 * TASK-LEARNING-07 Wave 2 (Issues #98..#101):
 * - #98: fixed character stage + transport; the transcript is an inner scroll region
 *   (poc-scene-transcript) and the active bubble is scrolled into view WITHIN it —
 *   the page itself never scrolls (prefers-reduced-motion aware).
 * - #99-adjacent: joint turns mark BOTH speakers (label «فلانی و بهمانی (با هم)»,
 *   both faces highlighted, both mouths animated via coSpeakerId).
 * - #100: last-line eligibility is tracked from lineStart/lineEnd/stateChange AND
 *   the next button — quick skipping can no longer miss it; the finish CTA routes
 *   through `onFinish` when the host provides one.
 * - #101: `embedded` hides every PoC navigation surface (nav, /poc/lesson token and
 *   teaches links, finish CTA without onFinish) — the PoC routes stay dev-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { BrowserAudioBackend, JointTurnBackend } from '@/modules/audio';
import { AnimationController, SvgPlaceholderRenderer, listCharacters } from '@/modules/character';
import type { CharacterAssetManifest } from '@/modules/character';
import {
  PlaybackEngine,
  type AudioAssetRef,
  type CharacterRef,
  type Dialogue,
  type DialogueLine,
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
  /** Content id for analytics — defaults to the PoC slug (parameterized in TASK-LEARNING-01). */
  dialogueSlug?: string;
  /**
   * TASK-LEARNING-07 / Issue #101: the scene is embedded in the PRODUCT chapter flow
   * (AnchorDialogueExperience). Every PoC navigation surface is then hidden: the
   * bottom nav, the /poc/lesson token-chunk and teaches links, and the finish CTA
   * (unless `onFinish` is provided) — the station owns completion.
   */
  embedded?: boolean;
  /**
   * Issue #100: host-owned finish routing for embedded scenes. When provided, the
   * finish CTA calls this instead of posting to the PoC progress store and routing
   * to /poc/lesson. When absent in embedded mode the CTA is hidden entirely.
   */
  onFinish?: () => void | Promise<void>;
}

function makeSceneLogger(slug: string) {
  return (name: string, props: Record<string, unknown>): void => {
    logEvent(name, { dialogue_id: slug, ...props });
  };
}

type BannerError = { code: string; message: string; lineId?: string; lineFa?: string };

/**
 * TASK-LEARNING-07 joint turns: the bubble label shows BOTH names —
 * «سورا و یامادا (با هم)» — resolved from the cast (characters array), never hardcoded.
 */
function speakerLabel(line: DialogueLine, characters: CharacterRef[]): string {
  const nameOf = (id: string): string => characters.find((c) => c.id === id)?.nameFa ?? id;
  return line.coSpeaker ? `${nameOf(line.speaker)} و ${nameOf(line.coSpeaker)} (با هم)` : nameOf(line.speaker);
}

export function DialogueScene({
  bundle,
  initialLineId,
  dialogueSlug = 'cafe-morning-01',
  embedded = false,
  onFinish,
}: DialogueSceneProps) {
  const logSceneEvent = makeSceneLogger(dialogueSlug);
  const { dialogue, characters, audio } = bundle;
  const router = useRouter();
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [activeIndex, setActiveIndex] = useState(-1);
  // KB dialogue-based-learning-model §۲/§۴: translation toggle DEFAULTS OFF (comprehension-first).
  const [showFa, setShowFa] = useState(false);
  const [speed, setSpeed] = useState<0.75 | 1>(1);
  const [banner, setBanner] = useState<BannerError | null>(null);
  const [lastLineSeen, setLastLineSeen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const transcriptRef = useRef<HTMLOListElement | null>(null);
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

  const lastLineIndex = dialogue.lines.length - 1;

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

    // TASK-LEARNING-07 joint turns: JointTurnBackend composes the primary asset with
    // the co-speaker's `${lineId}-co` manifest entry (played simultaneously). A missing
    // co asset degrades to primary-only playback — the engine contract is untouched.
    const backend = new JointTurnBackend({
      backend: new BrowserAudioBackend(),
      coRefFor: (ref) => audioByLine.get(`${ref.lineId}-co`) ?? null,
    });
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
        // Issue #100: reaching the last line by ANY path (natural chain or jump) marks it seen.
        if (ev.index === lastLineIndex) setLastLineSeen(true);
        controller.handleLineStart({
          lineId: ev.line.id,
          speakerId: ev.line.speaker,
          coSpeakerId: ev.line.coSpeaker,
          emotionTag: ev.line.emotionTag,
          atMs: ev.atMs,
        });
      }),
    );
    offs.push(
      engine.on('lineEnd', (ev) => {
        if (ev.index === lastLineIndex) setLastLineSeen(true);
        controller.handleLineEnd({ lineId: ev.line.id, speakerId: ev.line.speaker, atMs: ev.atMs });
      }),
    );
    offs.push(
      engine.on('stateChange', (ev) => {
        setStatus(ev.status);
        // Issue #100: a transport jump while paused/idle emits NO lineStart — the
        // stateChange carries the new lineIndex, so track the active line here too.
        if (typeof ev.lineIndex === 'number' && ev.lineIndex >= 0) {
          setActiveIndex(ev.lineIndex);
          if (ev.lineIndex === lastLineIndex) setLastLineSeen(true);
        }
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
  }, [dialogue, characters, audio, manifestsById, lastLineIndex]);

  const initialPlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !initialLineId) return;
    engine.seekToLine(initialLineId);
    engine.play(); // arriving from a click on «در مکالمه ببین» — user-gesture chain
    logSceneEvent('dialogue_entered_at_line', { line_id: initialLineId });
  }, [initialLineId]);

  // deep link ?line=<id> (T6 «در مکالمه ببین» target).
  // S1 fix (visual review #3): key on an engine-generation counter instead of a
  // one-shot ref — React StrictMode mounts→destroys→remounts the effect chain, and
  // the ref guard left the SECOND (live) engine without the seek while the UI kept
  // the stale "playing" status. Re-running per engine instance is idempotent.
  const [engineGeneration, setEngineGeneration] = useState(0);
  useEffect(() => {
    setEngineGeneration((g) => g + 1);
  }, [engineRef.current]);
  useEffect(() => {
    if (!initialLineId || !engineRef.current) return;
    if (dialogue.lines.some((l) => l.id === initialLineId)) initialPlay();
  }, [initialLineId, dialogue, initialPlay, engineGeneration]);

  // Issue #98 (T3 «خط فعال همیشه در دید»): keep the active bubble in view WITHIN the
  // transcript region — manual container math via scrollBy, so the PAGE never scrolls
  // (the stage + transport stay fixed). prefers-reduced-motion → instant, not smooth.
  useEffect(() => {
    if (activeIndex < 0) return;
    const container = transcriptRef.current;
    const el = lineRefs.current[activeIndex];
    if (!container || !el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    const cBox = container.getBoundingClientRect();
    const eBox = el.getBoundingClientRect();
    const pad = 8;
    if (eBox.top < cBox.top + pad) {
      container.scrollBy({ top: eBox.top - cBox.top - pad, behavior });
    } else if (eBox.bottom > cBox.bottom - pad) {
      container.scrollBy({ top: eBox.bottom - cBox.bottom + pad, behavior });
    }
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

  const jump = useCallback(
    (direction: 1 | -1) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (direction === 1) engine.next();
      else engine.prev();
      // Issue #100: pressing next ON/INTO the last line must activate the finish CTA
      // even when the engine emits no lineStart (paused/idle jumps emit stateChange only).
      if (engine.getCurrentIndex() === dialogue.lines.length - 1) setLastLineSeen(true);
      logSceneEvent('dialogue_line_skipped', { direction: direction === 1 ? 'next' : 'prev' });
    },
    [dialogue.lines.length],
  );

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

  // stage A→B: only after the last line was seen. Issue #100/#101: in embedded mode
  // the HOST owns routing/recording (onFinish); without onFinish the CTA is hidden —
  // the PoC progress store + /poc/lesson are only used in the standalone PoC scene.
  const finishWatching = useCallback(async () => {
    setFinishing(true);
    try {
      if (onFinish) {
        await onFinish();
      } else {
        const res = await postProgressEvent(bundle.dialogue.id, { type: 'dialogue_watched' });
        logSceneEvent('dialogue_watched', { recorded: res.ok });
        router.push('/poc/lesson');
      }
    } finally {
      setFinishing(false);
    }
  }, [bundle.dialogue.id, router, onFinish]);

  // ------------------------------------------------------------------ render
  const activeLine = activeIndex >= 0 ? (dialogue.lines[activeIndex] ?? null) : null;
  const isPlaying = status === 'playing';
  const started = status !== 'idle';
  // Issue #101: embedded + no host callback → the station owns completion; hide the CTA.
  const showFinishCta = !embedded || onFinish != null;

  return (
    <section className="flex flex-col gap-4" aria-label="صحنهٔ مکالمهٔ کافه">
      <style dangerouslySetInnerHTML={{ __html: POC_SCENE_CSS }} />

      {!audio.available && (
        <p className="rounded-md border border-ink-faint bg-surface-sunken px-4 py-2 text-small text-ink-soft">
          {audio.note} — پخش بی‌صوت ادامه می‌یابد و مسیر خطا قابل آزمایش است.
        </p>
      )}

      {/* --- character stage (3 placeholder faces, ADR-018 §۲-۴) — قاب newspaper-grid Aizen --- */}
      <div
        data-hnsp-scene-order={characters.map((c) => c.id).join(',')}
        className="frame-ink grid grid-cols-3 gap-3 rounded-lg bg-card p-4 shadow-card"
      >
        {characters.map((c, i) => {
          // TASK-LEARNING-07: a joint turn highlights BOTH speakers (speaker + coSpeaker).
          const speaking =
            activeLine !== null && isPlaying && (activeLine.speaker === c.id || activeLine.coSpeaker === c.id);
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

      {/* --- transport controls (Persian labels + lucide icons — no glyph emoji) --- */}
      <div className="frame-ink flex flex-wrap items-center gap-2 rounded-lg bg-card p-3 shadow-card">
        <button
          type="button"
          onClick={togglePlay}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-indigo px-4 py-2 text-small font-bold text-paper shadow-offset-indigo transition-[background-color,box-shadow,translate] hover:bg-indigo-deep hover:shadow-offset-indigo-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-offset-indigo-active"
          aria-label={isPlaying ? 'توقف موقت' : 'پخش'}
        >
          {isPlaying ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          {isPlaying ? 'توقف' : 'پخش'}
        </button>
        <button
          type="button"
          onClick={() => jump(-1)}
          disabled={!started}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash disabled:pointer-events-none disabled:opacity-45"
          aria-label="خط قبلی"
        >
          <SkipBack aria-hidden className="size-4" />
          قبلی
        </button>
        <button
          type="button"
          onClick={replay}
          disabled={activeIndex < 0}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash disabled:pointer-events-none disabled:opacity-45"
          aria-label="پخش دوبارهٔ همین جمله"
        >
          <RotateCcw aria-hidden className="size-4" />
          دوباره
        </button>
        <button
          type="button"
          onClick={() => jump(1)}
          disabled={!started}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash disabled:pointer-events-none disabled:opacity-45"
          aria-label="خط بعدی"
        >
          بعدی
          <SkipForward aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={toggleSpeed}
          aria-pressed={speed === 0.75}
          className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
        >
          سرعت: {speed === 1 ? '۱×' : '۰٫۷۵×'}
        </button>
        <button
          type="button"
          onClick={toggleFa}
          aria-pressed={showFa}
          className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
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
        <div role="alert" className="frame-ink flex flex-col gap-2 rounded-md bg-card px-4 py-3 text-small">
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
              className="min-h-11 rounded-md bg-indigo px-3 py-2 text-small font-bold text-paper shadow-offset-indigo transition-[background-color,box-shadow] hover:bg-indigo-deep"
            >
              تلاش دوباره
            </button>
            <button
              type="button"
              onClick={() => recover('skip')}
              className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
            >
              رد کردن این خط
            </button>
            <button
              type="button"
              onClick={() => recover('silent')}
              className="min-h-11 rounded-md border-2 border-indigo px-3 py-2 text-small font-bold text-indigo hover:bg-indigo-wash"
            >
              ادامه بدون صوت
            </button>
          </div>
        </div>
      )}

      {/* --- conversation transcript — Issue #98: inner scroll region (page never grows) --- */}
      <ol
        ref={(el) => {
          transcriptRef.current = el;
        }}
        tabIndex={0}
        className="poc-scene-transcript flex flex-col gap-2"
        aria-label="خطوط مکالمه"
      >
        {dialogue.lines.map((line, i) => {
          const active = i === activeIndex;
          return (
            <li
              key={line.id}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className={`flex flex-col gap-1 rounded-lg border-2 p-3 transition-colors ${
                active ? 'border-shu bg-card' : 'border-ink-faint bg-paper'
              } ${active ? 'outline-2 outline-offset-2 outline-shu outline-dashed' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => playFrom(line.id)}
                  /* min 44×44 touch target (WCAG 2.5.5 — Reviewer-B S2 mobile) */
                  className="mt-1 grid size-11 place-items-center rounded-md border-2 border-indigo px-2 py-1 text-caption font-bold text-indigo hover:bg-indigo-wash"
                  aria-label={`پخش از این خط: ${speakerLabel(line, characters)} — ${line.fa}`}
                >
                  <Play aria-hidden className="size-4" />
                </button>
                <div className="flex flex-1 flex-col items-start gap-1">
                  <span
                    className="text-caption"
                    style={{ color: `var(--color-speaker-${speakerNo.get(line.speaker) ?? 1})` }}
                  >
                    {speakerLabel(line, characters)}
                  </span>
                  <JpLine
                    tokens={line.tokens}
                    className={`text-ja ${active ? 'font-bold' : ''}`}
                    /* Issue #101: embedded scenes never link into the PoC lesson pages. */
                    getHref={(t) => (!embedded && t.chunk ? `/poc/lesson#item-${t.chunk}` : null)}
                  />
                  {showFa && <span className="text-body text-ink-soft">{line.fa}</span>}
                </div>
              </div>
              {(line.teaches?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 ps-8">
                  {line.teaches?.map((id) =>
                    embedded ? (
                      /* Issue #101: plain chip — no PoC lesson link in the product flow. */
                      <span key={id} className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption text-ink-soft">
                        {id}
                      </span>
                    ) : (
                      <a
                        key={id}
                        href={`/poc/lesson#item-${id}`}
                        className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-caption text-ink-soft"
                      >
                        {id}
                      </a>
                    ),
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* --- stage A→B: finish-watching CTA (only after the LAST line was seen) --- */}
      {showFinishCta && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => void finishWatching()}
            disabled={!lastLineSeen || finishing}
            className="min-h-11 self-start rounded-md bg-indigo px-4 py-2 text-small font-bold text-paper shadow-offset-indigo transition-[background-color,box-shadow] hover:bg-indigo-deep disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none"
          >
            {finishing ? 'در حال ثبت…' : onFinish ? 'پایان مشاهده' : 'پایان مشاهده — رفتن به درس (B)'}
          </button>
          <p className="text-caption text-ink-soft">
            {lastLineSeen
              ? onFinish
                ? 'کل مکالمه را دیدی.'
                : 'کل مکالمه را دیدی — مشاهدهٔ مرحلهٔ A ثبت و به درس می‌روی.'
              : 'برای فعال‌شدن این دکمه، مکالمه را تا خط آخر ببین.'}
          </p>
        </div>
      )}

      {/* --- PoC-only bottom nav (Issue #101: hidden when embedded in the product flow) --- */}
      {!embedded && (
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
      )}
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
