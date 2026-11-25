// @vitest-environment jsdom
/**
 * ISSUE #147 — character-scene multi-step walk regression (chapter 2, real content).
 *
 * THE BUG THIS FILE PINS (live production 78b1c9d, real browser): the scene's
 * forward button rendered ONLY when the CURRENT step had a recorded reply —
 * `reply[stepIndex] && !finished`. Steps WITHOUT a userReply (pure narration
 * beats) can never be answered, so a multi-step character-scene whose early
 * steps are narration-only locked at its FIRST step forever:
 * stn-fm01-09-integrate / blk-i1-scene showed «۱ / ۲» with zero interactive
 * controls — the name-chip reply (the #143 surface) and the wrap-up were
 * unreachable.
 *
 * THE FIX: a step without a userReply renders its «ادامه» immediately
 * (`reply[stepIndex] || !current?.userReply`); a reply-bearing step keeps the
 * answered-only gate (PART1-FIX-1: a reply step advances on a real
 * registration, never unregistered).
 *
 * This test drives the REAL StationRunner with the REAL chapter content
 * (first-meeting-01 → stn-fm01-09-integrate) end-to-end: narration steps
 * advance, the name sentence is built and graded, the wrap-up is reached and
 * the station completes.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import { toClientExercise } from '@/modules/curriculum/grading';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { Chapter } from '@/modules/curriculum/types';

// StationRunner navigates via the App Router on station completion — jsdom has
// no router context; count the pushes (the completion panel is asserted too).
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('first-meeting-01') as Chapter;
const station = chapter.stations.find((s) => s.slug === 'stn-fm01-09-integrate')!;

let gradeCalls: { action?: string; blockId: string; stepIndex: number; chipOrder?: string[]; nameValue?: string }[] =
  [];

beforeEach(() => {
  gradeCalls = [];
  pushMock.mockClear();
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('/api/curriculum/station?')) {
      // fresh learner — no server walk state to restore
      return new Response(JSON.stringify({ data: { state: null } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (u === '/api/curriculum/station' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {
        action: string;
        blockId?: string;
        stepIndex?: number;
        answer?: { chipOrder?: string[]; nameValue?: string };
      };
      if (body.action === 'grade-block') {
        gradeCalls.push({
          action: 'grade-block',
          blockId: body.blockId ?? '',
          stepIndex: body.stepIndex ?? -1,
          chipOrder: body.answer?.chipOrder,
          nameValue: body.answer?.nameValue,
        });
        return new Response(JSON.stringify({ data: { outcome: { correct: true, feedbackFa: 'درست!' } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (body.action === 'grade') {
        // the EXERCISE session's grading action (drill blocks walk through here)
        gradeCalls.push({
          action: 'grade',
          blockId: (body as { exerciseId?: string }).exerciseId ?? '',
          stepIndex: -1,
        });
        return new Response(JSON.stringify({ data: { outcome: { correct: true, level: 2, feedbackFa: 'درست!' } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      // enter / progress / complete — the walk bookkeeping
      return new Response(JSON.stringify({ data: { state: { status: 'in_progress', currentBlock: null } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderStation() {
  return render(
    <StationRunner
      chapterSlug="first-meeting-01"
      station={toClientStation(station)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      // the map deep-link the station page computes for stn-fm01-09-integrate (§۷ — ?s=)
      mapHref="/learn/first-meeting-01/journey?s=unit-02-1-saijo-no-aisatsu"
      clientExercises={{}}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

/** The scene's internal forward action («ادامه») — plain forward, one at a time. */
const forward = () => screen.queryByRole('button', { name: /^ادامه$/ });

describe('StationRunner — ISSUE #147: narration-only scene steps are advanceable', () => {
  it(
    'walks stn-fm01-09-integrate: narration steps advance, name reply grades, wrap-up + completion reached',
    { timeout: 30000 },
    async () => {
      renderStation();

      // The scene block is on screen — step ۱ narration (こんにちは！) is visible.
      await waitFor(() => {
        expect(screen.getByText('سلام!')).toBeTruthy();
      });

      // THE BUG PIN: step 1 has NO userReply — nothing to answer — so the
      // forward action must already be there. On the broken build this exact
      // query returns null and the scene sits at ۱ / ۲ forever.
      const firstForward = forward();
      expect(firstForward, 'a narration-only step renders its forward action').not.toBeNull();
      fireEvent.click(firstForward!);

      // Step ۲ narration visible, still advanceable (no reply on this step either).
      await waitFor(() => {
        expect(screen.getByText('از آشنایی‌تان خوشبختم؛ میکی هستم.')).toBeTruthy();
      });
      const secondForward = forward();
      expect(secondForward, 'the second narration step advances too').not.toBeNull();
      fireEvent.click(secondForward!);

      // Step ۳ — the name reply (the #143 surface): chips + name input.
      await waitFor(() => {
        expect(screen.getByText('معرفی کامل خودت را بچین (جای نام، چیپ نام را بگذار)')).toBeTruthy();
      });
      // Before answering the final reply step, no forward action (answered gate).
      expect(forward(), 'a reply step does not forward before a real registration').toBeNull();

      // Build the accepted order ic1 → ic2(name chip) → ic3 → ic4.
      // B1-REBUILD 2026-11-26 §۲: the unplaced name tile now renders the
      // Persian label «[نامت]» (fa.curriculum.nameChipLabel) — the internal
      // ___NAME___ convention never crosses to the learner.
      fireEvent.click(screen.getByRole('button', { name: 'はじめまして、' }));
      fireEvent.click(screen.getByRole('button', { name: '[نامت]' }));
      const nameInput = screen.getByPlaceholderText('نامت را بنویس') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'آرش' } });
      fireEvent.click(screen.getByRole('button', { name: 'です。' }));
      fireEvent.click(screen.getByRole('button', { name: 'よろしく おねがいします。' }));

      const check = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
      expect(check.disabled, 'check enables once every chip is placed').toBe(false);
      fireEvent.click(check);

      // A REAL registration happened with the ordered chips + the typed name.
      await waitFor(() => {
        expect(screen.getByText('درست!')).toBeTruthy();
      });
      expect(gradeCalls).toHaveLength(1);
      expect(gradeCalls[0]).toMatchObject({
        blockId: 'blk-i1-scene',
        stepIndex: 2,
        chipOrder: ['ic1', 'ic2', 'ic3', 'ic4'],
        nameValue: 'آرش',
      });

      // Answered final step → the forward action closes the scene → wrap-up.
      const finalForward = forward();
      expect(finalForward, 'the answered final step forwards to the wrap-up').not.toBeNull();
      fireEvent.click(finalForward!);

      await waitFor(() => {
        expect(screen.getByText('اولین معرفی ژاپنی‌ات!')).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /^ادامه$/ }));

      // The station completes — the completion panel, then the ONE map CTA.
      await waitFor(
        () => {
          expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
        },
        { timeout: 10000 },
      );
      const cta = screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' });
      fireEvent.click(cta);
      // TASK-HANASO-17 §۷: the destination is the map SECTION of this station.
      expect(pushMock).toHaveBeenCalledWith('/learn/first-meeting-01/journey?s=unit-02-1-saijo-no-aisatsu');
    },
  );

  it(
    'walks stn-fm01-18-integrate: narration → 5-chip polite-deny reply → closing narration → wrap-up',
    { timeout: 30000 },
    async () => {
      const fm18 = chapter.stations.find((s) => s.slug === 'stn-fm01-18-integrate')!;
      render(
        <StationRunner
          chapterSlug="first-meeting-01"
          station={toClientStation(fm18)}
          chapter={{ words: chapter.words, expressions: chapter.expressions }}
          mapHref="/learn/first-meeting-01/journey?s=unit-02-2-kimu-san-no-shookai"
          clientExercises={{}}
          dialogue={{ lines: [], speakers: {} }}
          audioByLine={{}}
          audioAvailable={false}
        />,
      );

      // step ۱ narration (こんにちは！) — forward available on the BROKEN build? NO.
      await waitFor(() => {
        expect(screen.getByText('سلام!')).toBeTruthy();
      });
      const f1 = forward();
      expect(f1, 'fm01-18 step ۱ (narration) is advanceable').not.toBeNull();
      fireEvent.click(f1!);

      // step ۲ — the polite-deny template-build (5 chips, two accepted orders).
      await waitFor(() => {
        expect(screen.getByText('ردّ مؤدبانه + معرفی کامل بساز: نه، ایرانی‌ام. از ایران آمده‌ام.')).toBeTruthy();
      });
      expect(forward(), 'reply step does not forward before answering').toBeNull();
      for (const chip of ['いいえ、', 'わたしは', 'イランじんです。', 'イランから', 'きました。']) {
        fireEvent.click(screen.getByRole('button', { name: chip }));
      }
      const check2 = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
      expect(check2.disabled).toBe(false);
      fireEvent.click(check2);
      await waitFor(() => {
        expect(gradeCalls).toHaveLength(1);
      });
      expect(gradeCalls[0]).toMatchObject({ blockId: 'blk-i2-scene', stepIndex: 1 });

      // answered → forward → step ۳ closing narration — advanceable too.
      fireEvent.click(screen.getByRole('button', { name: /^ادامه$/ }));
      await waitFor(() => {
        expect(screen.getByText('آه، می‌فهمم! فهمیدم.')).toBeTruthy();
      });
      const f3 = forward();
      expect(f3, 'fm01-18 closing narration step advances to the wrap-up').not.toBeNull();
      fireEvent.click(f3!);
      await waitFor(() => {
        expect(screen.getByText('کاربرد کامل شد!')).toBeTruthy();
      });
    },
  );

  it(
    'walks stn-kana-k13 scene (chapter 1 — the m2 prerequisite): narration → name-script choice',
    { timeout: 45000 },
    async () => {
      const kana = getChapter('kana-foundation-01') as Chapter;
      const k13 = kana.stations.find((s) => s.slug === 'stn-kana-k13')!;
      // the page resolves exerciseIds → chapter.exercises → toClientExercise,
      // keyed by EXERCISE id (the runner reads clientExercises[exerciseId])
      const clientExercises: Record<string, ClientExercise> = {};
      for (const block of k13.blocks) {
        if (block.kind !== 'exercise') continue;
        for (const id of block.exerciseIds) {
          const ex = (kana.exercises as Record<string, never>)[id];
          if (ex) clientExercises[id] = toClientExercise(ex);
        }
      }
      render(
        <StationRunner
          chapterSlug="kana-foundation-01"
          station={toClientStation(k13)}
          chapter={{ words: kana.words, expressions: kana.expressions }}
          mapHref="/learn/kana-foundation-01/journey?s=section-b-katakana"
          clientExercises={clientExercises}
          dialogue={{ lines: [], speakers: {} }}
          audioByLine={{}}
          audioAvailable={false}
        />,
      );

      /* k13 is a 9-block station (scene → rule-prereq → contrast → rule →
       * drill → rule → character-scene → name-katakana → wrap-up). Walk it
       * generically: forward actions when present, answer any radiogroup
       * (drill + the scene's own choice reply) — the mocked grade always
       * registers correct. The walk is pinned the moment the name-katakana
       * capstone renders: on the broken build the walk could never get past
       * the miki scene's narration step (block 7), so this text was
       * unreachable in the whole chapter-1 completion path. */
      const capstone = () => screen.queryByText('نامِ خودت را به کاتاکانا بساز');
      /** Wait until a forward action, an answerable radiogroup, or the
       *  capstone appears — the dialogue-player/async blocks need real ticks. */
      const nextAction = async () => {
        for (let k = 0; k < 40 && !capstone(); k += 1) {
          const next = forward();
          const radio = screen.queryAllByRole('radio')[0] ?? null;
          const check = screen.queryByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement | null;
          if (next || (radio && check)) return { next, radio, check };
          await act(async () => {
            await new Promise((r) => setTimeout(r, 250));
          });
        }
        return null;
      };

      for (let guard = 0; guard < 48 && !capstone(); guard += 1) {
        const action = await nextAction();
        if (!action) {
          throw new Error(`k13 walk stalled at guard=${guard}; scene-miki reply registered=${gradeCalls.length}`);
        }
        if (action.radio && action.check) {
          fireEvent.click(action.radio);
          await act(async () => {});
          const live = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
          if (!live.disabled) {
            const before = String(document.body.textContent || '');
            fireEvent.click(live);
            /* a correct answer auto-advances after a real beat (1500ms; the
             * audio fallback path may take up to 3200ms) — give it wall-clock
             * time or the loop re-clicks the same question forever. */
            for (let k = 0; k < 16 && String(document.body.textContent || '') === before; k += 1) {
              await act(async () => {
                await new Promise((r) => setTimeout(r, 250));
              });
            }
          }
          continue;
        }
        if (action.next) {
          fireEvent.click(action.next);
          await act(async () => {});
        }
      }
      expect(capstone(), 'k13 walk passed the miki character-scene to the capstone').not.toBeNull();
      // the miki scene reply really registered with the server grading
      const sceneGrade = gradeCalls.find((g) => g.blockId === 'blk-stn-kana-k13-scene-miki');
      expect(sceneGrade, 'the name-script choice was graded').toBeTruthy();
      expect(sceneGrade!.stepIndex).toBe(1);
    },
  );
});
