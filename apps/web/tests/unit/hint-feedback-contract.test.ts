/**
 * ENGINE-NEXTGEN W-E — the self-contained exercise hint/feedback contract.
 *
 * The mission's complaint: hints and feedback that REDIRECT the learner
 * («برگرد به خط ۱۳», «کارتش را دیدی», «یادت هست؟») instead of carrying the
 * teaching inline. The exercise card is the surface — anything it wants the
 * learner to use must be in-card (the audio player, the drawn kana, the
 * displayed sentence), and the feedback ladder must teach from that surface.
 *
 * Five gates over the WHOLE chapter bank (all chapters, all exercises):
 *  W-E1  no redirect/recall/pointer class inside f1/f2/f3 or any distractor
 *        rationale — go-back imperatives, bare recall, memory reliance,
 *        cross-surface «کارت» pointers, scene pointers, prediction pointers,
 *        dialogue-line/turn pointers («خط ۸»/«نوبت ۱۳»), bare listen-again
 *        (in-card audio is a stated AVAILABILITY, never «دوباره گوش کن»),
 *        and prior-question pointers («پرسش شد»/«همان پرسش»). The grammatical
 *        use of «پرسش» (questions are built with か) is legitimate and stays.
 *  W-E2  prompts never redirect either (go-back / bare recall / memory /
 *        prediction) — a prompt anchors inside the card it shows.
 *  W-E3  every distractor option carries its own rationale — why *this*
 *        pick is wrong, straight under the ladder line (TASK-HANASO-20
 *        BUG-007 surface; a blank rationale is a dead hint).
 *  W-E4  rationale keys are real distractor ids — never the correct option
 *        (dead data), never a stale id (the 23 shifted-key repairs).
 *  W-E5  the feedback ladder never duplicates a rung (f1 ≠ f2 ≠ f3).
 */
import { test, expect } from 'vitest';
import { listChapters } from '@/modules/curriculum/content';
import type { Exercise } from '@/modules/curriculum/types';

const chapters = listChapters();
const allExercises: [string, Exercise][] = chapters.flatMap((ch) =>
  Object.values(ch.exercises).map((ex) => [`${ch.slug}/${ex.id}`, ex] as [string, Exercise]),
);

/** The banned classes — each sends the learner ELSEWHERE instead of teaching. */
const BANNED_IN_COPY: [string, RegExp][] = [
  ['go-back imperative «برگرد»', /برگرد/],
  ['bare recall «به یاد بیاور»', /به یاد بیاور/],
  ['memory reliance «یادت هست»', /یادت هست/],
  ['cross-surface card pointer «کارت»', /کارت/],
  ['scene pointer «صحنهٔ»', /صحنهٔ/],
  ['prediction pointer «پیش‌بینی»', /پیش‌بینی/],
  ['dialogue-line/turn pointer «خط ۸»/«نوبت ۱۳»', /خط [۰-۹0-9]|خطِ [۰-۹0-9]|نوبت [۰-۹0-9]/],
  ['bare listen-again «دوباره گوش»', /دوباره گوش/],
  ['prior-question pointer «پرسش شد»/«همان پرسش»', /پرسش شد|همان پرسش|پرسشِ? خط/],
];

/** The classes banned in prompts too (line refs are legitimate prompt anchors
 *  for the in-card audio; listen-again is a feedback-ladder phrasing). */
const PROMPT_BANNED = BANNED_IN_COPY.filter(([name]) =>
  [
    'go-back imperative «برگرد»',
    'bare recall «به یاد بیاور»',
    'memory reliance «یادت هست»',
    'cross-surface card pointer «کارت»',
    'scene pointer «صحنهٔ»',
    'prediction pointer «پیش‌بینی»',
    'prior-question pointer «پرسش شد»/«همان پرسش»',
  ].includes(name),
);

function copyFields(ex: Exercise): [string, string][] {
  return [
    ['f1', ex.feedback.f1Fa],
    ['f2', ex.feedback.f2HintFa],
    ['f3', ex.feedback.f3ExplainFa],
    ...Object.entries(ex.distractorRationaleFa ?? {}).map(([k, v]) => [`rat-${k}`, v] as [string, string]),
  ];
}

test('W-E1 — every feedback/rationale string is self-contained (no redirect classes)', () => {
  expect(allExercises.length).toBeGreaterThan(700);
  const offenders: string[] = [];
  for (const [where, ex] of allExercises) {
    for (const [tag, text] of copyFields(ex)) {
      for (const [name, re] of BANNED_IN_COPY) {
        if (re.test(text)) offenders.push(`${where}/${tag}: [${name}] ${text.slice(0, 90)}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});

test('W-E2 — prompts never redirect (go-back / recall / memory / prediction / card)', () => {
  const offenders: string[] = [];
  for (const [where, ex] of allExercises) {
    const p = ex.promptFa ?? '';
    for (const [name, re] of PROMPT_BANNED) {
      if (re.test(p)) offenders.push(`${where}/prompt: [${name}] ${p.slice(0, 90)}`);
    }
  }
  expect(offenders).toEqual([]);
});

test('W-E3 — every distractor option carries its own rationale', () => {
  const missing: string[] = [];
  let optionExercises = 0;
  for (const [where, ex] of allExercises) {
    if (!ex.options || !ex.correctOptionId) continue;
    optionExercises += 1;
    for (const o of ex.options) {
      if (o.id === ex.correctOptionId) continue;
      const rationale = ex.distractorRationaleFa?.[o.id];
      if (typeof rationale !== 'string' || rationale.trim().length === 0) {
        missing.push(`${where}→${o.id}`);
      }
    }
  }
  expect(optionExercises).toBeGreaterThan(700);
  expect(missing).toEqual([]);
});

test('W-E4 — rationale keys are real distractor ids (never the correct option, never stale)', () => {
  const offenders: string[] = [];
  for (const [where, ex] of allExercises) {
    if (!ex.options || !ex.correctOptionId) continue;
    const ids = new Set(ex.options.map((o) => o.id));
    for (const key of Object.keys(ex.distractorRationaleFa ?? {})) {
      if (key === ex.correctOptionId) offenders.push(`${where}: key=${key} sits on the CORRECT option`);
      else if (!ids.has(key)) offenders.push(`${where}: key=${key} is not an option id`);
    }
  }
  expect(offenders).toEqual([]);
});

test('W-E5 — the feedback ladder never duplicates a rung', () => {
  const offenders: string[] = [];
  for (const [where, ex] of allExercises) {
    const { f1Fa, f2HintFa, f3ExplainFa } = ex.feedback;
    if (f1Fa === f2HintFa || f2HintFa === f3ExplainFa || f1Fa === f3ExplainFa) offenders.push(where);
  }
  expect(offenders).toEqual([]);
});
