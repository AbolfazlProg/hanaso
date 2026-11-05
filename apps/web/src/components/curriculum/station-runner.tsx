'use client';
/**
 * HANASO — StationRunner (TASK-LEARNING-01) — the LESSON ENGINE island.
 *
 * Walks a station's teaching blocks IN AUTHORED ORDER (order lives in data —
 * DATA-CONTRACT §۲). The station arrives PRE-STRIPPED from the RSC shell
 * (client-transport.ts — no answer keys cross the boundary); EVERY interaction
 * grades through /api/curriculum/station (bank exercises AND block interactions:
 * discovery / prediction / integrate replies — SKL-013).
 */
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpenText, CheckCircle2, Ear, MessageCircleQuestion, PlayCircle, Sparkles } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { ClientStation, ClientTeachingBlock } from '@/modules/curriculum/client-transport';
import type { Chapter, Station } from '@/modules/curriculum/types';
import { JaBlock } from '@/components/patterns/ja-block';
import { FuriganaText } from '@/components/patterns/furigana-text';
import { MixedFaJaText } from './mixed-fa-ja-text';
import { LineAudioButton } from './line-audio-button';
import { ExerciseSession } from './exercise-session';
import { KANA_ITEMS_BY_ID } from '@/modules/curriculum/content/kana-items';

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

interface Line {
  id: string;
  tokens: { surface: string }[];
  fa: string;
  speaker: string;
}

export interface StationRunnerProps {
  chapterSlug: string;
  /** The stripped station (no answer material — server grades everything). */
  station: ClientStation;
  chapter: Pick<Chapter, 'words' | 'expressions'>;
  clientExercises: Record<string, ClientExercise>;
  dialogue: {
    lines: Line[];
    speakers: Record<string, string>;
  };
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
}

/** Grading round-trip for one block interaction. */
async function gradeBlock(payload: {
  chapterSlug: string;
  stationSlug: string;
  blockId: string;
  stepIndex?: number;
  answer: { kind: string; optionId?: string; orderedIds?: string[]; chipOrder?: string[]; nameValue?: string };
}): Promise<{ correct: boolean; feedbackFa: string } | null> {
  try {
    const res = await fetch('/api/curriculum/station', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'grade-block', ...payload }),
    });
    const json = (await res.json()) as { data?: { outcome: { correct: boolean; feedbackFa: string } } };
    return json.data?.outcome ?? null;
  } catch {
    return null;
  }
}

export function StationRunner(props: StationRunnerProps) {
  const { station, chapter, clientExercises, dialogue, audioByLine, audioFallbackByLine, audioAvailable, chapterSlug } =
    props;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const blocks = station.blocks;
  const block = blocks[step];
  const lineById = useMemo(() => new Map(dialogue.lines.map((l) => [l.id, l])), [dialogue.lines]);

  const finishSession = useCallback(
    async (score: number | null, taskCompleted = false) => {
      setSessionScore(score);
      setCompleting(true);
      try {
        const res = await fetch('/api/curriculum/station', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            chapterSlug,
            stationSlug: station.slug,
            score,
            taskCompleted,
          }),
        });
        setCompleted(res.ok);
      } finally {
        setCompleting(false);
      }
    },
    [chapterSlug, station.slug],
  );

  const next = useCallback(() => {
    if (step < blocks.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (station.completion.kind === 'viewed') {
      void finishSession(null);
    } else if (station.completion.kind === 'task_completed') {
      void finishSession(null, true);
    } else {
      void finishSession(sessionScore ?? 0);
    }
  }, [blocks.length, finishSession, sessionScore, station.completion.kind, step]);

  const doneHref = `/learn/${chapterSlug}/journey`;

  return (
    <div className="flex flex-col gap-6">
      {/* progress rail + step counter */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1" aria-hidden>
          {blocks.map((b, i) => (
            <span
              key={b.id}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors',
                i < step ? 'bg-ai' : i === step ? 'bg-shu' : 'bg-surface-sunken',
              ].join(' ')}
            />
          ))}
        </div>
        <p className="shrink-0 text-caption text-ink-soft" aria-live="polite">
          {faNum(step + 1)} / {faNum(blocks.length)}
        </p>
      </div>

      {block && (
        <BlockView
          block={block}
          stationSlug={station.slug}
          chapterSlug={chapterSlug}
          chapter={chapter}
          clientExercises={clientExercises}
          lineById={lineById}
          speakers={dialogue.speakers}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
          onExerciseDone={(score) => {
            setSessionScore(score);
            if (step < blocks.length - 1) setStep((s) => s + 1);
            else void finishSession(score);
          }}
          onSceneDone={() => {
            // INTEGRATE: the communicative task finished → complete the station
            if (step < blocks.length - 1) setStep((s) => s + 1);
            else void finishSession(null, true);
          }}
        />
      )}

      {block && block.kind !== 'exercise' && block.kind !== 'character-scene' && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={next}
            disabled={completing}
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
          >
            {step === blocks.length - 1 ? fa.curriculum.stationDone : fa.curriculum.continueBlock}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        </div>
      )}

      {completed && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-md border border-success bg-card p-5"
        >
          <p className="flex items-center gap-2 text-body font-bold text-success">
            <CheckCircle2 aria-hidden className="size-5" />
            {fa.curriculum.stationDone}
          </p>
          <button
            type="button"
            onClick={() => router.push(doneHref)}
            className="flex h-11 w-fit items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep"
          >
            {fa.curriculum.backToJourney}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        </div>
      )}
      {completing && !completed && <p className="text-small text-ink-soft">{fa.common.loading}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ block renderers */

function BlockView({
  block,
  stationSlug,
  chapterSlug,
  chapter,
  clientExercises,
  lineById,
  speakers,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
  onExerciseDone,
  onSceneDone,
}: {
  block: ClientTeachingBlock;
  stationSlug: string;
  chapterSlug: string;
  chapter: Pick<Chapter, 'words' | 'expressions'>;
  clientExercises: Record<string, ClientExercise>;
  lineById: Map<string, Line>;
  speakers: Record<string, string>;
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
  onExerciseDone: (score: number) => void;
  onSceneDone: () => void;
}) {
  switch (block.kind) {
    case 'scene':
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <h2 className="flex items-center gap-2 text-h3 font-bold text-indigo">
            <Sparkles aria-hidden className="size-5" />
            {block.titleFa}
          </h2>
          <p className="mt-3 text-body leading-[var(--leading-fa)] text-ink">
            <MixedFaJaText text={block.bodyFa} />
          </p>
        </section>
      );

    case 'vocab-card': {
      const word = chapter.words.find((w) => w.id === block.wordId)!;
      const line = lineById.get(word.lineRef);
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {word.termFurigana ? (
                <JaBlock className="text-h2 font-bold">
                  <FuriganaText>{word.termFurigana}</FuriganaText>
                </JaBlock>
              ) : (
                <JaBlock className="text-h2 font-bold">{word.term}</JaBlock>
              )}
              <p className="mt-1 text-small text-ink-soft" dir="ltr" lang="ja">
                {word.readingKana} · {word.romaji}
              </p>
            </div>
            {line && (
              <LineAudioButton
                lineId={line.id}
                audioUrl={audioByLine[line.id] ?? ''}
                audioUrlFallback={audioFallbackByLine?.[line.id]}
                audioAvailable={audioAvailable}
                label={fa.curriculum.playLine}
              />
            )}
          </div>
          <p className="mt-3 text-lead font-bold text-ai">{word.meaningFa}</p>
          {word.noteFa && (
            <p className="mt-2 flex items-start gap-2 text-small text-ink-soft">
              <BookOpenText aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <b>{fa.curriculum.wordCardNote}: </b>
                {word.noteFa}
              </span>
            </p>
          )}
          {line && (
            <div className="mt-4 rounded-md bg-surface-warm p-4">
              <p className="text-caption text-ink-soft">{fa.curriculum.inDialogue}:</p>
              <JaBlock className="mt-2 text-body">
                {line.tokens.map((t, i) => (
                  <span
                    key={i}
                    className={
                      word.surfaceInLine && t.surface.includes(word.surfaceInLine.slice(0, 2))
                        ? 'rounded-sm bg-indigo-wash px-0.5 font-bold text-indigo'
                        : undefined
                    }
                  >
                    {t.surface}
                  </span>
                ))}
              </JaBlock>
              <p className="mt-2 text-small text-ink-soft">{line.fa}</p>
            </div>
          )}
        </section>
      );
    }

    case 'kana-card': {
      // TASK-LEARNING-06 (DD-122 / TB-KanaCard — Issue #94): glyph card from the
      // KanaItem registry. Romaji follows the unit-level fading policy (block data);
      // mnemonics carry their HONEST review status (pilot_draft = human review
      // pending — OQ-051) and are never presented as final content.
      const kana = KANA_ITEMS_BY_ID[block.kanaId];
      if (!kana) {
        return (
          <section className="rounded-md border border-danger/40 bg-card p-5">
            <p className="text-body text-ink">{fa.curriculum.kanaCardMissing(block.kanaId)}</p>
          </section>
        );
      }
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5" aria-label={kana.romaji}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <JaBlock className="font-jp text-[clamp(3.5rem,12vw,6rem)] font-bold leading-none text-ink">
              {kana.glyph}
            </JaBlock>
            <div className="min-w-[8rem] flex-1 space-y-2 text-left" dir="ltr">
              {block.showRomaji ? (
                <p className="font-mono text-h3 font-bold text-indigo">{kana.romaji}</p>
              ) : (
                <p className="text-small text-ink-faint">{fa.curriculum.kanaRomajiHidden}</p>
              )}
              {kana.romajiNoteFa ? <p className="text-small text-ink-faint">{kana.romajiNoteFa}</p> : null}
              {kana.hostWord ? (
                <p className="text-body text-ink">
                  <JaBlock className="font-jp">{kana.hostWord.word}</JaBlock>
                  <span className="mx-1 text-ink-faint">—</span>
                  {kana.hostWord.meaningFa}
                </p>
              ) : null}
            </div>
          </div>
          {kana.mnemonic ? (
            <div className="mt-4 rounded-md bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-small font-bold text-ink">{kana.mnemonic.coreImageFa}</span>
                <span className="rounded-full bg-ink-faint/30 px-2 py-0.5 text-micro text-ink-faint">
                  {kana.mnemonic.honestLabelFa}
                </span>
                {kana.mnemonic.status === 'draft' ? (
                  <span className="rounded-full border border-amber-600/50 px-2 py-0.5 text-micro text-amber-700">
                    {fa.curriculum.kanaMnemonicDraft}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
                <MixedFaJaText text={kana.mnemonic.storyFa} />
              </p>
              {kana.mnemonic.pairGlyphs && kana.mnemonic.pairGlyphs.length > 0 ? (
                <p className="mt-2 flex flex-wrap items-center gap-1 text-small text-ink-faint">
                  {fa.curriculum.kanaConfusablePre}
                  <JaBlock className="font-jp text-h3 font-bold text-ink">
                    {kana.mnemonic.pairGlyphs.join('، ')}
                  </JaBlock>
                </p>
              ) : null}
            </div>
          ) : null}
          {block.confusableNoteFa ? <p className="mt-3 text-small text-ink-faint">{block.confusableNoteFa}</p> : null}
        </section>
      );
    }

    case 'expression-card': {
      const expr = chapter.expressions.find((e) => e.id === block.expressionId)!;
      const line = lineById.get(expr.lineRef);
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <JaBlock className="text-h3 font-bold">{expr.ja}</JaBlock>
            {line && (
              <LineAudioButton
                lineId={line.id}
                audioUrl={audioByLine[line.id] ?? ''}
                audioUrlFallback={audioFallbackByLine?.[line.id]}
                audioAvailable={audioAvailable}
              />
            )}
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">کارکرد</dt>
              <dd className="mt-1 text-body">{expr.functionFa}</dd>
            </div>
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">رسمیت</dt>
              <dd className="mt-1 text-body">{expr.formalityFa}</dd>
            </div>
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">پاسخ متقابل</dt>
              <dd className="mt-1 text-body">{expr.replyFa}</dd>
            </div>
            {expr.taarofNoteFa && (
              <div className="rounded-md border border-warning/40 bg-surface-warm p-3">
                <dt className="text-caption text-ink-soft">نکتهٔ تعارف</dt>
                <dd className="mt-1 text-small">{expr.taarofNoteFa}</dd>
              </div>
            )}
          </dl>
        </section>
      );
    }

    case 'guided-discovery':
      return (
        <DiscoveryBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          lineById={lineById}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
        />
      );

    case 'structured-input':
      return (
        <DiscoveryBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          lineById={lineById}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
        />
      );

    case 'rule-card':
      return (
        <section className="rounded-md border-2 border-indigo bg-card p-5">
          <JaBlock className="text-h3 font-bold text-indigo">{block.patternJa}</JaBlock>
          <h3 className="mt-2 text-body font-bold">
            <MixedFaJaText text={block.titleFa} />
          </h3>
          <p className="mt-3 text-body leading-[var(--leading-fa)]">
            <MixedFaJaText text={block.bodyFa} />
          </p>
          {block.structureTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-small">
                <thead>
                  <tr className="border-b border-ink-faint text-ink-soft">
                    {block.structureTable.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-start font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.structureTable.rows.map((row, i) => (
                    <tr key={i} className="border-b border-ink-faint/50">
                      {row.map((cell, j) => (
                        <td key={j} dir="auto" className="px-3 py-2">
                          <MixedFaJaText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {block.persianBridgeFa && (
            <p className="mt-4 rounded-md border-s-2 border-s-ai bg-surface-warm p-3 text-body">
              <MixedFaJaText text={`🌉 ${block.persianBridgeFa}`} />
            </p>
          )}
          {block.honestyLabelFa && <p className="mt-2 text-caption text-ink-faint">{block.honestyLabelFa}</p>}
        </section>
      );

    case 'example-set':
      return (
        <section className="flex flex-col gap-3">
          <h3 className="text-h3 font-bold">{fa.curriculum.examplesTitle}</h3>
          {block.examples.map((example) => (
            <article key={example.id} className="rounded-md border border-ink-faint bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
                  {roleLabel(example.role)}
                </span>
                {example.lineRef && <span className="text-caption text-ink-soft">{fa.curriculum.inDialogue}</span>}
              </div>
              <JaBlock className="mt-3 text-lead font-bold">{example.ja}</JaBlock>
              <p className="mt-1 text-caption text-ink-soft" dir="ltr" lang="ja">
                {example.reading}
              </p>
              <p className="mt-2 text-body">{example.fa}</p>
              <p className="mt-1 text-small text-ink-soft">
                <MixedFaJaText text={example.whyFa} />
              </p>
              {example.selfExplainFa && (
                <p className="mt-3 rounded-md bg-surface-warm p-3 text-small">
                  <MixedFaJaText text={`💭 ${example.selfExplainFa}`} />
                </p>
              )}
            </article>
          ))}
        </section>
      );

    case 'exercise': {
      const items = block.exerciseIds
        .map((id) => clientExercises[id])
        .filter((e): e is ClientExercise => e !== undefined);
      if (items.length === 0) return null;
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <ExerciseSession
            chapterSlug={chapterSlug}
            stationSlug={stationSlug}
            exercises={items}
            audioByLine={audioByLine}
            audioFallbackByLine={audioFallbackByLine}
            audioAvailable={audioAvailable}
            onSessionDone={(score) => onExerciseDone(score)}
          />
        </section>
      );
    }

    case 'listening-task':
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <h3 className="flex items-center gap-2 text-h3 font-bold text-indigo">
            <Ear aria-hidden className="size-5" />
            {fa.curriculum.listeningTaskTitle}
          </h3>
          <p className="mt-3 text-body text-ink-soft">{fa.curriculum.listeningTaskBody}</p>
        </section>
      );

    case 'character-scene':
      return (
        <CharacterSceneBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          speakers={speakers}
          onSceneDone={onSceneDone}
        />
      );

    case 'wrap-up':
      return (
        <section className="rounded-md border-2 border-shu/60 bg-card p-5">
          <h3 className="text-h3 font-bold text-shu">{block.titleFa}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {block.itemsFa.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-body">
                <CheckCircle2 aria-hidden className="mt-1 size-4 shrink-0 text-success" />
                <MixedFaJaText text={item} />
              </li>
            ))}
          </ul>
          {block.fsrsNoteFa && <p className="mt-3 text-caption text-ink-soft">{block.fsrsNoteFa}</p>}
        </section>
      );

    case 'dialogue-player':
      return (
        <section className="flex flex-col gap-3 rounded-md border-2 border-ai bg-card p-5">
          <h3 className="flex items-center gap-2 text-h3 font-bold text-ai">
            <PlayCircle aria-hidden className="size-5" />
            {fa.curriculum.replayDialogue}
          </h3>
          <p className="text-body text-ink-soft">{fa.curriculum.dialogueGoToListen}</p>
          <Link
            href={`/learn/${chapterSlug}/dialogue`}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.curriculum.replayDialogue}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </section>
      );
  }
}

/* ---- guided discovery + structured input (server-graded choice) ---- */
function DiscoveryBlock({
  block,
  stationSlug,
  chapterSlug,
  lineById,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
}: {
  block:
    | Extract<ClientTeachingBlock, { kind: 'guided-discovery' }>
    | Extract<ClientTeachingBlock, { kind: 'structured-input' }>;
  stationSlug: string;
  chapterSlug: string;
  lineById: Map<string, Line>;
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ correct: boolean; feedbackFa: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = async (optionId: string) => {
    setPicked(optionId);
    setBusy(true);
    const result = await gradeBlock({
      chapterSlug,
      stationSlug,
      blockId: block.id,
      answer: { kind: 'option', optionId },
    });
    setOutcome(result ?? { correct: false, feedbackFa: '' });
    setBusy(false);
  };

  const displayLine = 'displayLineRef' in block ? lineById.get(block.displayLineRef) : undefined;
  const compareLine =
    'compareLineRef' in block && block.compareLineRef ? lineById.get(block.compareLineRef) : undefined;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5">
      {(displayLine || compareLine) && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-caption text-ink-soft">
            <MessageCircleQuestion aria-hidden className="size-4" />
            به این خط‌ها نگاه کن:
          </p>
          {[displayLine, compareLine].filter(Boolean).map((l) => (
            <div key={l!.id} className="flex items-center gap-3 rounded-md bg-surface-warm p-3">
              <LineAudioButton
                lineId={l!.id}
                audioUrl={audioByLine[l!.id] ?? ''}
                audioUrlFallback={audioFallbackByLine?.[l!.id]}
                audioAvailable={audioAvailable}
              />
              <JaBlock className="text-body">
                {l!.tokens.map((t, i) => {
                  const hl =
                    'highlightSurfaces' in block && block.highlightSurfaces?.some((h) => t.surface.endsWith(h));
                  return (
                    <span key={i} className={hl ? 'rounded-sm bg-indigo-wash px-0.5 font-bold text-shu' : undefined}>
                      {t.surface}
                    </span>
                  );
                })}
              </JaBlock>
            </div>
          ))}
        </div>
      )}
      {'lineRef' in block && block.lineRef && !displayLine && (
        <p className="text-caption text-ink-soft">{fa.curriculum.inDialogue}</p>
      )}
      <p className="text-body font-bold">
        <MixedFaJaText text={block.questionFa} />
      </p>
      <div role="radiogroup" className="flex flex-col gap-2">
        {block.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={picked === opt.id}
            disabled={outcome !== null || busy}
            onClick={() => void answer(opt.id)}
            className={[
              'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
              picked === opt.id ? 'border-ai bg-indigo-wash font-bold' : 'border-ink-faint bg-card hover:border-ai',
            ].join(' ')}
          >
            <span dir="auto">{opt.label}</span>
          </button>
        ))}
      </div>
      {outcome && (
        <div role="status" aria-live="polite" className="rounded-md bg-surface-warm p-3 text-body">
          {outcome.correct && <p className="font-bold text-success">{fa.curriculum.correct}</p>}
          {outcome.feedbackFa && <p className="mt-1">{outcome.feedbackFa}</p>}
        </div>
      )}
    </section>
  );
}

/* ---- character scene (INTEGRATE — server-graded replies) ---- */
function CharacterSceneBlock({
  block,
  stationSlug,
  chapterSlug,
  speakers,
  onSceneDone,
}: {
  block: Extract<ClientTeachingBlock, { kind: 'character-scene' }>;
  stationSlug: string;
  chapterSlug: string;
  speakers: Record<string, string>;
  onSceneDone: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reply, setReply] = useState<Record<number, { ok: boolean }>>({});
  const [built, setBuilt] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = block.steps.slice(0, stepIndex + 1);
  const current = block.steps[stepIndex];
  const replySpec = current?.userReply;
  const finished = stepIndex === block.steps.length - 1 && reply[stepIndex];

  const advance = () => {
    if (stepIndex < block.steps.length - 1) setStepIndex(stepIndex + 1);
    else onSceneDone();
  };

  const submitReply = async () => {
    if (!replySpec) return;
    setBusy(true);
    let answer: { kind: string; optionId?: string; chipOrder?: string[]; nameValue?: string };
    if (replySpec.kind === 'choice') {
      answer = { kind: 'option', optionId: choice ?? '' };
    } else {
      answer = { kind: 'build', chipOrder: built, nameValue };
    }
    const result = await gradeBlock({
      chapterSlug,
      stationSlug,
      blockId: block.id,
      stepIndex,
      answer,
    });
    setReply((r) => ({ ...r, [stepIndex]: { ok: result?.correct ?? false } }));
    setBusy(false);
  };

  return (
    <section className="flex flex-col gap-4" aria-label={fa.curriculum.yourTurn}>
      {visible.map((s, i) => {
        const isUser = s.speaker === 'user';
        const answered = reply[i];
        return (
          <article
            key={i}
            className={[
              'rounded-md border p-4',
              isUser ? 'border-ai bg-indigo-wash/40' : 'border-ink-faint bg-card',
            ].join(' ')}
          >
            <p className="text-caption font-bold text-ink-soft">
              {isUser ? fa.curriculum.yourTurn : (speakers[s.speaker] ?? s.speaker)}
            </p>
            <JaBlock className="mt-2 text-lead font-bold">
              {s.ja.split('___NAME___').map((part, j, arr) => (
                <span key={j}>
                  {part}
                  {j < arr.length - 1 && (
                    <span className="rounded-sm bg-shu/15 px-1 text-shu">{nameValue || '___'}</span>
                  )}
                </span>
              ))}
            </JaBlock>
            <p className="mt-2 text-small text-ink-soft" dir="auto">
              {s.fa.replace('___NAME___', nameValue || '…')}
            </p>

            {s.userReply && i === stepIndex && !answered && (
              <div className="mt-4 flex flex-col gap-3 border-t border-ink-faint pt-4">
                <p className="text-body font-bold">{s.userReply.promptFa}</p>
                {s.userReply.kind === 'choice' ? (
                  <div role="radiogroup" className="flex flex-col gap-2">
                    {(s.userReply.options ?? []).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={choice === opt.id}
                        onClick={() => setChoice(opt.id)}
                        className={[
                          'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                          choice === opt.id
                            ? 'border-ai bg-indigo-wash font-bold'
                            : 'border-ink-faint bg-card hover:border-ai',
                        ].join(' ')}
                      >
                        <span dir="auto">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3"
                      dir="ltr"
                      lang="ja"
                    >
                      {built.map((id) => {
                        const chip = (s.userReply!.chips ?? []).find((c) => c.id === id)!;
                        return chip.ja === '___NAME___' ? (
                          <input
                            key={id}
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            placeholder={fa.curriculum.typeYourName}
                            aria-label={fa.curriculum.typeYourName}
                            className="h-11 w-28 rounded-sm border border-ai bg-paper px-2 text-center text-body"
                            dir="auto"
                          />
                        ) : (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setBuilt((b) => b.filter((x) => x !== id))}
                            className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                          >
                            {chip.ja}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
                      {(s.userReply.chips ?? [])
                        .filter((c) => !built.includes(c.id))
                        .map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setBuilt((b) => [...b, chip.id])}
                            className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
                          >
                            {chip.ja}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={
                    busy ||
                    (s.userReply.kind === 'choice' ? !choice : built.length !== (s.userReply.chips?.length ?? 0))
                  }
                  className="h-11 w-fit rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep disabled:opacity-45"
                >
                  {fa.curriculum.checkAnswer}
                </button>
              </div>
            )}
            {answered && (
              <p role="status" aria-live="polite" className="mt-3 text-body text-success">
                ✓ {fa.curriculum.correct}
              </p>
            )}
          </article>
        );
      })}

      {reply[stepIndex] && !finished && (
        <button
          type="button"
          onClick={advance}
          className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
        >
          {fa.curriculum.continueBlock}
        </button>
      )}
      {finished && (
        <button
          type="button"
          onClick={onSceneDone}
          className="flex h-11 w-fit items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep"
        >
          {fa.curriculum.stationDone}
        </button>
      )}
    </section>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'anchor':
      return 'لنگر از مکالمه';
    case 'near':
      return 'هم‌قاب';
    case 'varied':
      return 'بافت جدید';
    case 'faded':
      return 'جای‌خالی';
    case 'reading':
      // TASK-LEARNING-06: reading-moment item (05A §۴) — a real word the learner
      // can now decode; label communicates the «حالا می‌توانی بخوانی» moment.
      return 'حالا می‌توانی بخوانی';
    default:
      return role;
  }
}

export type { Station };
