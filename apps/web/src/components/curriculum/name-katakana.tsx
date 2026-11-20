'use client';
/**
 * NameKatakana — Part-2 و: the k13 name-writing experience (the chapter's
 * capstone). The SEVEN owner requirements live in this component:
 *
 *   ۱. input accepts Persian OR Latin/Finglish; the copy explains WHY the
 *      Latin input suggests more precisely (short vowels present).
 *   ۲. the engine (kana-name.ts — pure, LOCAL, no external API) detects the
 *      pronunciation and suggests katakana mora-by-mora, each shown with the
 *      letters that produced it.
 *   ۳. every suggested mora is editable (tap = remove, then rebuild).
 *   ۴. the tray = the REQUIRED morae (duplicates included) + extra distractor
 *      cards sampled from the taught katakana pool.
 *   ۵. the learner ARRANGES the cards; repeated morae mean repeated cards.
 *   ۶. wrong builds get the progressive hint ladder (count → first mismatch →
 *      reveal after three tries) — the answer is never printed up front.
 *   ۷. disagreement is never blamed: the tolerated-variant check accepts the
 *      known valid alternatives, and the reveal message states that name
 *      transliteration has no single correct answer.
 */
import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, CircleCheck, Eraser, RotateCcw, Shuffle } from 'lucide-react';
import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import {
  checkArrangement,
  pickTrayExtras,
  suggestNameKatakana,
  type NameMora,
  type NameSuggestion,
} from '@/modules/curriculum/kana-name';

type Phase = 'input' | 'suggest' | 'build' | 'done';

export function NameKatakana({
  blockId,
  titleFa,
  bodyFa,
  extrasCount,
  onNameDone,
}: {
  blockId: string;
  titleFa: string;
  bodyFa: string;
  extrasCount: number;
  /** The required interaction completed — the walk continues. */
  onNameDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('input');
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState<NameSuggestion | null>(null);
  /** The tray: required morae (editable suggestion) + extras. */
  const [tray, setTray] = useState<NameMora[]>([]);
  /** The learner's build (the arranged card sequence). */
  const [built, setBuilt] = useState<string[]>([]);
  /** Tray cards already used (required cards are single-instance). */
  const [usedIdx, setUsedIdx] = useState<Set<number>>(new Set());
  const [hints, setHints] = useState(0);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const detect = useCallback(() => {
    const s = suggestNameKatakana(input);
    setSuggestion(s);
    setPhase('suggest');
    setBuilt([]);
    setUsedIdx(new Set());
    setHints(0);
    setVerdict(null);
    setReveal(false);
  }, [input]);

  /** Suggest → build: assemble the tray from the (possibly corrected) morae. */
  const startBuild = useCallback(
    (morae: NameMora[]) => {
      const required = morae.map((m, i) => ({ kana: m.kana, from: m.from, idx: i }));
      const exclude = new Set(required.map((r) => r.kana));
      const extras = pickTrayExtras(extrasCount, exclude).map((kana, i) => ({
        kana,
        from: '',
        idx: -1 - i,
      }));
      // interleave-shuffle: the tray never shows the answer order up front
      const all = [...required, ...extras];
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j]!, all[i]!];
      }
      setTray(all);
      setPhase('build');
      setBuilt([]);
      setUsedIdx(new Set());
      setHints(0);
      setVerdict(null);
      setReveal(false);
    },
    [extrasCount],
  );

  const check = useCallback(() => {
    if (!suggestion) return;
    const v = checkArrangement(built, suggestion);
    if (v.correct) {
      setVerdict('correct');
      setPhase('done');
      return;
    }
    const n = hints + 1;
    setHints(n);
    if (n === 1) {
      setVerdict(
        v.countMatches ? fa.curriculum.nameHintCount(suggestion.morae.length) : fa.curriculum.nameHintCount(suggestion.morae.length),
      );
    } else if (n === 2) {
      setVerdict(v.firstMismatch !== null ? fa.curriculum.nameHintFirst(v.firstMismatch + 1) : fa.curriculum.nameHintCount(suggestion.morae.length));
    } else {
      setReveal(true);
      setVerdict(fa.curriculum.nameReveal);
    }
  }, [built, hints, suggestion]);

  const surface = useMemo(() => built.join(''), [built]);

  return (
    <section className="flex flex-col gap-4 rounded-md border-2 border-indigo bg-card p-5" data-name-katakana={blockId}>
      <header className="flex flex-col gap-1">
        <h3 className="text-h3 font-bold text-indigo">{titleFa}</h3>
        <p className="text-body leading-[var(--leading-fa)] text-ink-soft">{bodyFa}</p>
      </header>

      {phase === 'input' ? (
        <div className="flex flex-col gap-3">
          <label className="text-small font-bold text-ink" htmlFor={`${blockId}-input`}>
            {fa.curriculum.nameInputFa}
          </label>
          <input
            id={`${blockId}-input`}
            data-name-input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={fa.curriculum.nameInputPh}
            className="h-12 rounded-md border border-ink-faint bg-paper px-4 text-body text-ink outline-none focus-visible:outline-2 focus-visible:outline-indigo"
            dir="auto"
          />
          <button
            type="button"
            data-name-suggest
            disabled={input.trim().length < 2}
            onClick={detect}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep disabled:opacity-45"
          >
            {fa.curriculum.nameSuggest}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        </div>
      ) : null}

      {phase === 'suggest' && suggestion ? (
        <div className="flex flex-col gap-3" data-name-suggestion>
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-warm p-4">
            {suggestion.morae.map((m, i) => (
              <span key={i} className="flex flex-col items-center gap-1">
                <JaBlock className="text-h3 font-black">{m.kana}</JaBlock>
                <span className="text-caption text-ink-faint" dir="auto">
                  {m.from || '—'}
                </span>
              </span>
            ))}
          </div>
          <p className="text-small leading-[var(--leading-fa)] text-ink-soft">
            <MixedFaJaText text={fa.curriculum.nameSuggestNote} />
          </p>
          <p className="text-small leading-[var(--leading-fa)] text-ink-faint">
            <MixedFaJaText text={suggestion.noteFa} />
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-name-start-build
              onClick={() => startBuild(suggestion.morae)}
              className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
            >
              {fa.curriculum.nameBuildHint}
              <ArrowLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPhase('input')}
              className="flex items-center gap-1 text-small text-ink-soft underline underline-offset-4"
            >
              <Eraser aria-hidden className="size-3.5" />
              {fa.curriculum.nameEdit}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'build' || phase === 'done' ? (
        <div className="flex flex-col gap-3">
          {/* the build area — the arranged sequence */}
          <div className="min-h-16 rounded-md border-2 border-dashed border-indigo bg-surface-warm p-3" data-name-build>
            {built.length === 0 ? (
              <p className="text-small text-ink-faint">{fa.curriculum.nameBuildHint}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {built.map((k, i) => (
                  <JaBlock key={`${k}-${i}`} className="text-h3 font-black">
                    {k}
                  </JaBlock>
                ))}
              </div>
            )}
          </div>
          <p className="text-caption text-ink-faint">
            <span dir="ltr">{surface}</span>
          </p>

          {/* the tray */}
          <div className="flex flex-wrap gap-2" data-name-tray>
            {tray.map((card, i) => {
              const used = usedIdx.has(i);
              return (
                <button
                  key={`${card.kana}-${i}`}
                  type="button"
                  data-tray-card={card.kana}
                  disabled={used || phase === 'done'}
                  onClick={() => {
                    setBuilt((b) => [...b, card.kana]);
                    setUsedIdx((s) => new Set(s).add(i));
                  }}
                  className={`flex size-14 items-center justify-center rounded-md border-2 text-h3 font-black transition-colors ${
                    used ? 'border-ink-faint bg-surface-sunken text-ink-faint' : 'border-ink bg-paper text-ink hover:border-indigo hover:bg-indigo-wash'
                  }`}
                >
                  {card.kana}
                </button>
              );
            })}
          </div>
          <p className="text-caption text-ink-faint">
            <Shuffle aria-hidden className="me-1 inline size-3" />
            {fa.curriculum.nameExtras}
          </p>

          {phase === 'build' ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-name-check
                disabled={built.length === 0}
                onClick={check}
                className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep disabled:opacity-45"
              >
                {fa.curriculum.nameCheck}
                <ArrowLeft aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuilt([]);
                  setUsedIdx(new Set());
                  setVerdict(null);
                }}
                className="flex items-center gap-1 text-small text-ink-soft underline underline-offset-4"
              >
                <RotateCcw aria-hidden className="size-3.5" />
                {fa.curriculum.nameReset}
              </button>
            </div>
          ) : null}

          {verdict ? (
            <p
              role={verdict === 'correct' ? 'status' : undefined}
              data-name-verdict={verdict === 'correct' ? 'correct' : 'hint'}
              className="text-small leading-[var(--leading-fa)] text-ink-soft"
            >
              <MixedFaJaText text={verdict} />
            </p>
          ) : null}

          {reveal ? (
            <div className="rounded-md bg-surface-warm p-4">
              <p className="text-caption text-ink-faint">{fa.curriculum.nameSuggestNote}</p>
              <JaBlock className="mt-2 text-h3 font-black">{suggestion ? suggestion.morae.map((m) => m.kana).join('') : ''}</JaBlock>
            </div>
          ) : null}

          {phase === 'done' ? (
            <div className="flex flex-wrap items-center gap-3">
              <CircleCheck aria-hidden className="size-5 text-success" />
              <span className="text-body font-bold text-success">{fa.curriculum.nameDone}</span>
              <button type="button" onClick={onNameDone} className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep">
                {fa.curriculum.nameContinueCta}
                <ArrowLeft aria-hidden className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
