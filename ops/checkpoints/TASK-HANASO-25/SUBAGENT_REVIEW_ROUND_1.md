# TASK-HANASO-25 — SUBAGENT REVIEW ROUND 1

> Three independent reviewers (A: Japanese/Kana expert, B: Assessment &
> pedagogy, C: Engineering & QA) over the CP-00..CP-05 state (d594d79).
> Each reviewed independently; none saw the others' reports. Verdicts:
> **A: FAIL** (3 content defects), **B: PASS-qualified** (2 medium), **C:
> PASS-qualified** (2 low). All findings fixed in CP-06 before Round 2.

## Subagent A — Japanese Language & Kana Expert

Verdict: **FAIL** — glyph/reading/transliteration content of the 12 new gate
items is linguistically correct, and the two-correct remediation + m5-1 fix
are valid, but the rewritten listening rationales contain corrupted readings
in 3 gate items and ~20 practice items. Fix findings 1–3 and this becomes a
PASS.

1. **CRITICAL** — `chapter-kana01.exercises.ts`: `ex-kana-gate-m2-4`
   (~L9799), `ex-kana-gate-m2-5` (~L9821), `ex-kana-gate-m2-2` (~L9654),
   plus ~20 practice listening items (L7377–7601, L8573–8731). Wherever the
   reading of は/ひ/ほ/そ should appear in the template
   ««X» صدای «Y» است — شنیده‌شده «Z» بود.», Y is the literal word
   «هیراگانا». Evidence: `«そ» صدای «هیراگانا» است — شنیده‌شده «سو» بود.`
   reads "そ is the sound 'hiragana'" — nonsense to a learner; looks like a
   botched find-replace. Expected: そ=«سُ», は=«ها». m2-4/m2-5 are NEW items,
   so this ships in the gate bank.
2. **HIGH** — `ex-kana-gate-m5-4` (~L9997): rationale c
   `«コ» صدای «کُ» است — شنیده‌شده «کو» بود.` mislabels コ (ko) with «کُ»,
   which the same item's f3 reserves for ク (ku); rationales a and c both
   state the heard sound as «کو» while f1 says «کُ». Correct: コ=«کو»,
   شنیده‌شده «کُ». Internal contradiction within one gate item.
3. **MEDIUM** — `ex-kana-gate-m4-4` (~L9926): rationale c uses ヮ where モ
   is meant («ヮ دو خط موازی افقی دارد»). ヮ (small wa) is a different
   glyph; the shape claim itself is correct for モ.
4. **MINOR** — transliteration inconsistencies within single items: へ as
   «هه» (rationale) vs «هِ» (f1/f2) in m2-2; う/ウ as «او» (m5-3) vs «اُ»
   elsewhere; す as «سو» vs «سُ» in m2-4; く as «کو» vs «کُ». Same mora, two
   spellings.
5. **INFO** — m4-3 rationale «سه ضربهٔ افقی» (vs さ): さ has 3 strokes but
   only 2 horizontal ones; loose but acceptable as a mnemonic. No change
   required.

Verified correct (Q1): all 12 new items' mappings and distractors — m1-4
さ=سا (せ=سِ, そ=سُ), m1-5 ミ=می (ム=مُ, モ=مو), m2-4 す (せ/そ distinct),
m2-5 ほ (へ/は distinct), m3-4 ねこ=«نِکُ», m3-5 かさ=«کاسا», m4-3 つ with
さ/し distractors, m4-4 ヌ=نو (メ=مه), m4-5 ね with れ/わ, m5-3 イ=ای
(ウ/エ), m5-4 ク (ケ/コ), m5-5 リ (ル/レ). The M5 label
«تمایز شنیداری دو خط کانا» matches what M5's items measure. The
two-correct remediation (script-explicit prompts + twin rationale naming
the script difference) is linguistically valid and pedagogically fair; the
listening sound-naming template is the right design; gate-m5-1's ぬ/ん/あ
options are now discriminable by sound (ぬ = full mora «نو», ん = bare
nasal — the rationale explains exactly this).

## Subagent B — Assessment & Pedagogy Reviewer

Verdict: **PASS** (architecture sound; 2 medium content findings should be
fixed before release).

1. **[PASS-OK] Gate math is defensible, no impossible loop.**
   `scoring.ts:67` uses strict `<` minMeasure, so 4/5 = 0.8 sits AT the
   floor (not weak) — one miss per measure passes. Miss penalties by
   weight: M1 .06 / M2 .05 / M3 .04 / M4 .03 / M5 .02; weighted 0.9 binds
   only when total penalty > 0.10. Remediation is capped
   (`maxRemediationLoops: 3`, levels.ts:36) and targets weakPointMap
   stations — recoverable, not a lock. The audit's "one slip = permanent
   remediate" cliff is gone.
2. **[MEDIUM] M1+M2 single-miss pair remediates with NO weak measures.**
   One miss in M1 AND one in M2: both measures 0.8 (not weak), weighted =
   .3×.8 + .25×.8 + .45 = **0.89 < 0.9 → remediate with `weakMeasures:
   []`** — likely zero remediation stations (weakPointMap is measure-keyed,
   chapter-kana01.ts:118-124; needs a test to confirm). It is the ONLY
   two-miss-different-measures combo that fails (all other pairs ≤ 0.10
   pass). The property test (h25:115-131) covers only M2+M4 (actual 0.92)
   and its comment claims "weighted 0.96" — wrong; GATE_ROOT_CAUSE.md §3
   repeats the 0.96 figure. Fix: test the M1+M2 case; fall back to
   lowest-measure targeting when remediate has no weak measures.
3. **[PASS-OK, minor] Weights M1 .3/M2 .25/M3 .2/M4 .15/M5 .1** sum to 1.0
   and rank constructs correctly for kana (recognition > recall > decode >
   confusables > cross-script); honestly flagged as owner-tunable v1
   (OQ-052). Minor tensions: M5 is lowest-weighted yet its label names
   Section B's headline two-script competence; and the uniform 0.8 floor
   sits over all-difficulty-3 M4/M5 banks while M1 contains difficulty-1
   items.
4. **[MEDIUM] Three listening rationales state a falsehood — a
   distractor's sound is «هیراگانا»** ("hiragana", a script name, not a
   sound): m2-2 opt a, m2-4 opt c, m2-5 opt c (chapter-kana01.exercises.ts
   9654, 9799, 9821) — apparently a bad find-replace of «ها» (the reading
   of は). The h25 rationale test (188-203) only regex-matches sound
   vocabulary, so semantic nonsense passes it. Related nits: m4-4
   rationale c references ヮ where モ is meant, and its f2HintFa says «با メ
   و ノ مقایسه کن» but ノ is not among the options (the confusable is モ).
5. **[PASS-OK, minor] Bank measures what the chapter teaches, with
   gaps.** M1 shape→sound both scripts (こ/つ/ナ/さ/ミ); M2 sound→shape
   listening; M3 real-word decode testing chouon (とうきょう), ん/ー
   (らーめん), dakuten minimal pairs, order, vowel length; M4 true
   confusables (し/さ, ソ/ン, ね/れ/わ); M5 cross-script listening,
   sound-distinct (BUG-026 fixed: m5-1 now ぬ/ん/あ). The hints
   (f2HintFa fetched on wrong answer, cleared on retry, answering
   preserved) follow a sound scaffold-fade design; the F1-recognition
   shape/mnemonic redirect (no answer at first miss) is correct ladder
   design.

## Subagent C — Engineering & QA Reviewer

Provisional verdict: **PASS** (qualified — 2 Low findings; test-run and
`/poc` middleware re-check carried into Round 2).

1. **Answer-key discipline — mostly sound.**
   `apps/web/src/app/learn/[chapter]/assessment/page.tsx` (50–63):
   `promptAudio` attached only for `kana-listening`/`kana-recall` (own
   sound) and `rule-listening` (word recording, with `promptJa`/
   `promptJaReading` stripped so the audible word isn't also shown as
   text). Recognition/decode get nothing — correct, since the sound equals
   the answer there. Base payload goes through `toClientExercise`.
   `mastery-gate.tsx` (61): `listenPrompt` gates auto-play and the replay
   panel to `kana-listening`/`rule-listening` only; no key material exists
   in the client component.
2. **[Low] finding:** the page attaches `promptAudio` for `kana-recall`
   (54–55) but the gate never plays or renders it (`listenPrompt` excludes
   kana-recall). The URL rides unused in the RSC payload — either an
   asymmetry bug or dead weight; compare against `exercise-session.tsx`'s
   handling of recall before accepting.
3. **Hint action (`station/route.ts` 99–111, 258–278) — good.** GUEST
   scope → uniform 401 before any hint logic (179–187, unchanged
   TASK-HANASO-20 rule). Station scoping: exercise must be
   `assessmentRole === 'practice'` AND listed in that station's blocks'
   `exerciseIds`, else 404 — cross-station probes fail closed. Response is
   `ok({ hintFa })` only. Double-click: read-only/idempotent server-side;
   client guards `hintLoading || hintFa !== null` — worst case a duplicate
   identical fetch, no state corruption.
4. **mastery-gate auto-play `useEffect` (62–75) — no stale closures**
   (deps `[index, listenPrompt?.opus]` correct), **but no cleanup
   function**: on question change to a different audio URL the previous
   element is never paused — overlapping playback is possible (same-URL
   restart is handled by `currentTime = 0`). Low severity, UX only.
5. **TASK-24 security — partially verified.**
   `resolveLearnerIdFromRequest` present in attempts/events/progress/
   practice/station/mastery/journey routes; `toClientItem` applied at
   `practice/route.ts:232`. Not verified: `/poc` middleware gating —
   grep found no `middleware.ts` at the attempted paths; needs a re-check.
6. **Carried to Round 2:** run the four h25 unit specs + typecheck; read
   the new specs for tautology; verify `/poc` middleware gating and the
   hint fetch's `cache-control: no-store` on the success path.

## Remediation register (all fixed in CP-06)

| # | Source | Finding | Fix |
| --- | --- | --- | --- |
| R1 | A1/B4 (Critical) | «هیراگانا» leaked into listening rationales (m2-2, m2-4, m2-5 + ~20 practice items) | reading-map rewrite pass + regex guard in the lint |
| R2 | A2 (High) | m5-4 internal contradiction (コ labeled «کُ», heard sound «کو») | コ=«کو», heard=«کُ» everywhere in the item |
| R3 | A3/B4 (Medium) | m4-4 ヮ instead of モ; f2 names ノ (not an option) | モ fixed; f2 names メ/モ |
| R4 | B2 (Medium) | M1+M2 one-miss-each → remediate with weakMeasures [] (no stations) | remediation falls back to the two lowest measures; property test added; docs' 0.96 figure corrected |
| R5 | C2 (Low) | kana-recall promptAudio rides the gate payload unused | attach only where the gate plays it (listening/rule-listening) |
| R6 | C4 (Low) | auto-play effect has no cleanup (overlap on URL change) | cleanup pauses the outgoing element |
| R7 | A4 (Minor) | transliteration inconsistencies within items (へ «هه», う «او», す «سو», く «کو») | normalized to the registry readings in the touched items |
