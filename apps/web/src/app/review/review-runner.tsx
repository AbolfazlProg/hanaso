'use client';
/**
 * ReviewRunner — Part-2 ج: the client island of the /review page.
 *
 * One card at a time: the learner recalls from the FRONT (glyph for kn cards,
 * meaning for word cards), reveals, then rates the retrieval honestly —
 * again/hard/good/easy map 1:1 to the FSRS grades the submission API expects.
 * Ratings are SCHEDULING DATA (they move the next due date), never a score:
 * the UI shows no points, no percentages, no rank — only the remaining count.
 */
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ear, Loader2, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { FuriganaText } from '@/components/patterns/furigana-text';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { getCachedAudio, reportPlaybackError } from '@/modules/audio/client-cache';

export interface ReviewCard {
  itemId: string;
  kind: string;
  /** kn cards: the glyph is the FRONT (recall the sound). */
  glyph?: string;
  romaji?: string;
  /** w/gr/chrk cards: the term (recall its meaning — or the term for s-cards). */
  term?: string;
  termFurigana?: string;
  readingKana?: string;
  meaningFa?: string;
  audio?: { opus: string; m4a: string } | null;
  note?: string;
  /** The bundled content could not resolve this item — honest unknown card. */
  unknown?: boolean;
}

type Phase = 'recall' | 'revealed' | 'done';

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export function ReviewRunner({
  cards,
  dueCount,
  loadFailed,
}: {
  cards: ReviewCard[];
  dueCount: number;
  loadFailed: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('recall');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Items the learner chose to skip (stay due — an honest no-op). */
  const [skipped, setSkipped] = useState(0);

  const card = cards[index];
  const remaining = useMemo(() => Math.max(cards.length - index, 0), [cards.length, index]);

  const play = useCallback((audio: { opus: string; m4a: string } | null | undefined) => {
    if (!audio) return;
    const el = getCachedAudio(audio.opus);
    if (!el) return;
    try {
      el.playbackRate = 1;
      el.preservesPitch = true;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
    } catch {
      reportPlaybackError(audio.opus);
    }
  }, []);

  const rate = useCallback(
    async (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!card || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        // uuidv7 via crypto (the API idempotency key — one review = one id)
        const id =
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
        const res = await fetch('/api/review', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reviews: [{ itemId: card.itemId, rating, clientReviewId: id }] }),
        });
        const json = (await res.json()) as { ok?: boolean; data?: { applied?: number } };
        if (!res.ok || !json.ok) {
          setError(fa.review.submitFailed);
          return;
        }
        if (index + 1 >= cards.length) setPhase('done');
        else {
          setIndex((i) => i + 1);
          setPhase('recall');
        }
      } catch {
        setError(fa.review.submitFailed);
      } finally {
        setSubmitting(false);
      }
    },
    [card, cards.length, index, submitting],
  );

  if (loadFailed) {
    return (
      <div role="alert" className="rounded-md border border-error bg-card p-5 text-body text-ink">
        {fa.review.loadFailed}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="rounded-md border border-success/50 bg-card px-4 py-3 text-small text-ink-soft">
        {fa.home.reviewEmpty}
      </p>
    );
  }

  if (phase === 'done') {
    return (
      <div role="status" className="flex flex-col gap-4 rounded-md border-2 border-success bg-card p-6 text-center">
        <p className="text-h3 font-black text-success">{fa.review.doneTitle}</p>
        <p className="text-body text-ink-soft">
          {fa.review.doneBody}
          {skipped > 0 ? ` (${faNum(skipped)} ${fa.review.skip})` : ''}
        </p>
        <Link
          href="/"
          className="mx-auto flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
        >
          {fa.review.backHome}
          <ArrowLeft aria-hidden className="size-4" />
        </Link>
      </div>
    );
  }

  if (!card) return null;
  const progressLine = `${faNum(dueCount - remaining + 1)} / ${faNum(dueCount)}`;

  return (
    <section className="flex flex-col gap-5">
      <p className="text-caption text-ink-soft" aria-live="polite">
        {fa.review.dueCount(dueCount)} — {progressLine}
      </p>

      <article className="flex flex-col items-center gap-4 rounded-md border-2 border-indigo bg-card p-6 text-center">
        {card.unknown ? (
          <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.review.unknownCard}</p>
        ) : card.glyph ? (
          <>
            <JaBlock className="text-h1 font-black text-hero-ja">{card.glyph}</JaBlock>
            {card.audio ? (
              <button
                type="button"
                onClick={() => play(card.audio)}
                className="flex items-center gap-1.5 text-small text-ai underline underline-offset-4"
              >
                <Ear aria-hidden className="size-4" />
                {fa.review.playSound}
              </button>
            ) : null}
          </>
        ) : card.term ? (
          <>
            {card.termFurigana ? (
              <JaBlock className="text-h2 font-black">
                <FuriganaText>{card.termFurigana}</FuriganaText>
              </JaBlock>
            ) : (
              <JaBlock className="text-h2 font-black">{card.term}</JaBlock>
            )}
            <p className="text-lead font-bold text-ink">{card.meaningFa}</p>
            {card.readingKana ? (
              <p className="text-small text-ink-soft" dir="ltr" lang="ja">
                {card.readingKana}
              </p>
            ) : null}
            {card.audio ? (
              <button
                type="button"
                onClick={() => play(card.audio)}
                className="flex items-center gap-1.5 text-small text-ai underline underline-offset-4"
              >
                <Volume2 aria-hidden className="size-4" />
                {fa.review.playSound}
              </button>
            ) : null}
          </>
        ) : null}

        {card.note ? (
          <p className="text-small text-ink-soft">
            <MixedFaJaText text={card.note} />
          </p>
        ) : null}

        {phase === 'recall' ? (
          <button
            type="button"
            onClick={() => setPhase('revealed')}
            className="mt-2 flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.review.revealHint}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        ) : null}

        {phase === 'revealed' && card.glyph ? (
          <p className="text-lead font-bold text-ink" dir="ltr">
            {card.romaji}
          </p>
        ) : null}

        {phase === 'revealed' ? (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {(
              [
                ['again', fa.review.again],
                ['hard', fa.review.hard],
                ['good', fa.review.good],
                ['easy', fa.review.easy],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={submitting}
                onClick={() => void rate(value)}
                className="flex h-11 min-w-20 items-center justify-center gap-2 rounded-md border border-ink bg-paper px-4 text-body font-bold text-ink transition-colors hover:bg-indigo-wash disabled:opacity-50"
              >
                {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-small text-error">
            {error}
          </p>
        ) : null}
      </article>

      <button
        type="button"
        onClick={() => {
          setSkipped((n) => n + 1);
          if (index + 1 >= cards.length) setPhase('done');
          else {
            setIndex((i) => i + 1);
            setPhase('recall');
          }
        }}
        className="w-fit text-small text-ink-soft underline underline-offset-4"
      >
        {fa.review.skip}
      </button>
    </section>
  );
}
