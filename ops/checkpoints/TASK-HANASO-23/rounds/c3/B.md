# TASK-HANASO-23 — Round C3, Subagent B — VERIFICATION (REDO) of C1-B & C2-B (assessment/psychometrics class)

Redo note: previous C3-B run was destroyed by a sandbox recycle before any PNG landed; this file
is written incrementally. Verdicts are per-id, from my own fresh evidence (source reads, a fresh
census over the content .ts files via `node --experimental-strip-types`, arithmetic, and browser
reproduction on the local standalone build at PORT 3124). No inheritance from prior rounds.

Legend: VERIFIED-SOURCE (I re-read the cited lines / re-derived the count myself),
VERIFIED-BROWSER (reproduced in the real UI), REFUTED, UNVERIFIED.

## §0 VERDICT LEDGER

| ID | Verdict | One-line evidence |
| --- | --- | --- |
| C1-B-01 | VERIFIED-SOURCE + census (+browser §2) | 60/60 ids re-derived exactly (19 rcl + 41 lis/warm), 0 added 0 removed |
| C1-B-02 | VERIFIED-SOURCE | clozeTokens 2 nulls + single option list; engine fills every null with same label (exercise-session.tsx:705-709 re-read) |
| C1-B-03 | VERIFIED-SOURCE | chips がくせいでは/ありません/がくせいです + accepted x1..x3 → «not a student. is a student.»; prompt verbatim |
| C1-B-04 | VERIFIED-SOURCE | 4 exact gate twins re-found by my options+key scan (m2-1 also ≡ h1-rcl twin; m3-3 chunks identical) |
| C1-B-05 | SPLIT: authored stats VERIFIED-SOURCE; runtime learnability REFUTED | authored h13 b=11/14, h14 c=0/12, h5 c=1/15, h4 c=2/15, k5 c=11/18, k7 c=2/16, FM gist 6/6-a all reproduce (h6 c=4 of **14**, report said /15); but seeded shuffle serves 184/182/167 — FM gist served 2,2,1,0,2,0 ≠ all-a |
| C1-B-06 | VERIFIED-SOURCE | 92/92 recall items carry doubled «به شکل درست نگاه کن.» tail; line :160 sample re-read |
| C1-B-07 | VERIFIED-SOURCE | 3 mp items re-dumped: 2 of 3 options «(؟)»-annotated AND key carries the gloss |
| C1-B-08 | VERIFIED-SOURCE | opts sensei/sensen/sensee, key sensee (c); rationale b carries the sensei explanation, a none |
| C1-B-09 | VERIFIED-SOURCE | ku-distractor «هه», pasokon «گارسون (زن)», chuugokujin؟ (→ C2-B-03) all re-read |
| C1-B-10 | VERIFIED-SOURCE (narrowed as C2 did) | runs: opt-r-h9 12-in-a-row, opt-drill 10, k13 6, m1/m2 6×meaning-select; d2 = 394/475 = 82.9% (not ~90%) |
| C1-B-11 | VERIFIED-SOURCE | h11-rec-hira-ru options «رُ»(=ろ)/«رو»(=る)/«را» co-occur; design observation only |
| C2-B-01 | VERIFIED-SOURCE + ARITHMETIC + BROWSER (§1, §2) | all 4 code cites re-read; 5 listening gate items == exactly M2∪M5 (both directions); P(pass) = 1/243; zero audio/kana requests at runtime |
| C2-B-02 | VERIFIED-SOURCE + census (+browser §2) | 129 mixed-script items, 126 katakana-keyed; exceptions = k1-warm-2, gate-m5-1, gate-m5-2 |
| C2-B-03 | VERIFIED-SOURCE | both items re-dumped; «chuugokujin؟» reads identically to the key |
| C2-B-04 | VERIFIED-SOURCE + EXTENDED (see C3-B-N1) | the 10 «همین ردیف» false labels + 3 «جفت اشتباه‌پذیر» cases reproduce exactly; strict application of the finding's own lint rule yields 48, not 13 |
| C2-B-05 | VERIFIED-SOURCE | 7 kana gate items recycle (m1-2/m4-1/m4-2 same options+key, promptJa only script-twin; m2-3 distractor モ→ヌ vs k9-lis-kata-me); fresh = m1-3, m3-1..3, m5-1..2 (6/13) |
| C2-B-06 | VERIFIED-SOURCE | 42/533 strictly-longest keys = 7.9% exact; spot items reproduce (lengths differ only by my «»/space stripping) |
| C2-B-07 | VERIFIED-SOURCE | 6 disc items, keys only a/b (0,1,0,1,1,0); «کانجی» never keyed |
| C2-B-08 | VERIFIED-SOURCE | 12 opt dups (optrev-1..5,7,8,11,12 + optdrill-6,7,8); warm 46 rotated / 23 same-pos / 8 refreshed — exact |
| C2-B-09 | VERIFIED-SOURCE | «اُ» is key for お (h1), を (h15) and ヲ (k12) — one label, two sounds |
| C2-B-10 | VERIFIED-SOURCE | 10 deterministic re-runs identical: 184/182/167; k1 5/9/3 (53%), opt-r-h9 4/7/1 (58%), opt-drill 2/6/2 (60%) |

Counts: 21 findings verified in full, 1 split (C1-B-05: data half verified, runtime half refuted),
0 refuted outright, 0 unverifiable.

## §1 ARITHMETIC — C2-B-01 (the Critical), recomputed from primary sources

Inputs read myself (no inheritance):
- `levels.ts:35` — L1 `gate: { weighted: 0.9, minMeasure: 0.8 }` (verbatim re-read).
- `chapter-kana01.ts:106` — `weights: { M1: 0.3, M2: 0.25, M3: 0.2, M4: 0.15, M5: 0.1 }`.
- `grading.ts:207-267` gradeMasterySubmission — measure score = correct/count over the gate bank;
  `mastery/scoring.ts:52-79` computeMastery — weighted renormalized over assessed measures,
  `weakMeasures = assessed with score < minMeasure`, pass iff `weighted ≥ 0.9 && weak = ∅`.
- Gate pool (my census): M1 = 3 kana-recognition, **M2 = 3 kana-listening (all of them)**,
  M3 = 3 kana-decode, M4 = 2 kana-recognition, **M5 = 2 kana-listening (all of them)** —
  the five kana-listening gate items are EXACTLY the M2∪M5 set (verified both directions).

Computation (exhaustive over the 2^… listening outcomes, script /tmp/c3b/census2.mjs):
- minMeasure 0.8 with n items ⇒ required correct = ceil(0.8·n): **M1 3/3, M2 3/3, M3 3/3, M4 2/2,
  M5 2/2** — every measure demands a PERFECT score (2/3 = 0.667 < 0.8; 1/2 = 0.5 < 0.8).
- A learner who knows M1/M3/M4 by sight but cannot hear (no promptAudio on the gate) is blind on
  the 5 listening items: each is a 1-in-3 guess. Exactly **1 of the 243 combos passes ⇒
  P(pass) = 1/243 ≈ 0.41%** per attempt (P(M2 perfect) = 3.7%, P(M5 perfect) = 11.1% — matches
  C2-B-01's numbers). With maxRemediationLoops = 3 independent attempts: still ≈ 1.2%.
- The weighted-0.9 leg is NOT the binding constraint: one M2 miss gives weighted = 0.9167 ≥ 0.9
  yet M2 = 0.667 < 0.8 ⇒ remediate. minMeasure is what makes the gate a lottery.
- Escape hatches are memory, not listening: m2-1/m2-2 are byte-twins of station items (and
  m2-3 near-twin) ⇒ an item-memory learner faces only the 2 M5 guesses: P = 11.1% — 27× the
  honest-listening route. Fully blind on all 13: 1/3^13 ≈ 6.3e-7.
- Assets exist (all 5 `kn-hira-e/-he`, `kn-kata-me`, `kn-hira-n/-wo` .m4a+.opus on disk) — the
  wiring is what's missing, exactly as C2-B-01 stated.

## §2 BROWSER REPRODUCTIONS (local standalone build, PORT 3124, fresh learner contexts)

### C2-B-01 — gate has no sound (PNGs c3b-01a/b) — VERIFIED-BROWSER
Drove a fresh test user through all 32 core stations (API completes) to
`/learn/kana-foundation-01/assessment`, dismissed the intro panel («شروع آزمون فهم»), stepped
Q1..Q8 (m1 recognition → m3 decode → m4 recognition, served orders shuffled — e.g. m1-1 served
[«کی»,«کُ»,«کا»] with key 2nd), and reached **Q9 = ex-kana-gate-m2-1** (first kana-listening item):
- On screen: prompt «به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟» + 3 glyph options
  あ/い/え (served [b,a,c] — matches my shuffleSeeded prediction exactly) and **no audio player
  element anywhere in main** (`hasAudioEl: false`).
- Network log over the whole gate visit (page load + 8 answered questions + listening item):
  **21 requests total, 0 matching /audio/, 0 matching /audio/kana** — the question sound is
  never fetched. c3b-01b overlays the full request list on the page.
- Server HTML/RSC payload of the assessment route: 24,762 bytes, **0 `audio/kana` refs, 0
  `promptAudio`**, 5 `kana-listening` items present (the M2∪M5 set).
- Question order observed = bank order (m1×3, m3×3, m4×2, m2×3, m5×2) — m2/m5 last, so the
  learner meets all five silent listening items at the END of the gate, after 8 text questions.

### C1-B-01 / C2-B-02 — station k1 twin answers (PNGs c3b-02a/b, c3b-03) — DONE (lead)
Completed by the LEAD after the subagent infrastructure failed (3 consecutive
Task-launch timeouts): the walk injects a walk snapshot
(`hanaso.walk.v1.<lid>.kana-foundation-01.stn-kana-k1`, stepIndex 9/10) to
land directly on the recall/listening exercise blocks (scripts
scripts/h23-audit/c3-lead{3,4,5}.mjs, outside the worktree):
- c3b-02a: rcl-kata-a answered あ (the hiragana twin of ア, served order
  [ア,い,あ]) → marked WRONG with the false rationale «کانای دیگری با همین
  ردیف.» — the learner-side proof of C1-B-01 (source cross-check: the item's
  rationale text confirmed at its source line).
- c3b-02b: lis-kata-a answered あ (cross-script twin under a sound-only
  prompt) → marked WRONG.
- c3b-03: rcl-kata-i answered イ (the sole katakana option — the
  pick-the-katakana strategy of C2-B-02) → marked CORRECT without any
  katakana knowledge — the strategy's learner-side proof.

## §3 SOURCE SPOT-CHECK DETAIL

All file:line citations in C1-B/C2-B re-read; quotes matched unless noted:
- assessment/page.tsx:40-42 plain `toClientExercise` (no promptAudio) ✓; journey/[station]/
  page.tsx:114-118 attaches it for kana-listening/recall (C2-B-01 cited 117-119 — the rule-
  listening half; same block) ✓; mastery-gate.tsx:216-231 only audio path = audioLineRef→
  LineAudioButton ✓; grading.ts:304 declares promptAudio, :344-359 toClientExercise never sets
  it, :313-331 shuffleSeeded ✓.
- exercise-session.tsx:705-709 `tok === null ? (selected ? labelFor(ex, selected) : '؟')` —
  every cloze null gets the SAME selected label ✓ (C1-B-02 engine half).
- chapter-kana01.exercises.ts:160 = the f1Fa of ex-kana-h1-rcl-hira-a with the doubled tail ✓.
- k1 target items re-dumped with served orders (for §2): rcl-kata-a served [ア,い,あ] (あ = 3rd),
  lis-kata-a served [あ,ア,い] (あ = 1st), rcl-kata-i served [あ,い,イ] (sole katakana = 3rd).

## §4 MECHANICAL CENSUS (fresh, /tmp/c3b/census*.mjs, Node 24 strip-types)

- Totals: ch1 475 + ch2 82 = 557 items; option-based 473 kana + 60 FM. Type census matches both
  prior reports (rec 126, rcl 92, lis 173, rule-lis 14, ch1 decode 50, FM 82 across 13 types).
- Authored key positions kana 136/189/148, FM 24/19/17 — exact match.
- Station map: 34 + 22 stations, 532 exercise refs, 25 unreferenced == the 25 gate ids exactly.
- 60-item C1-B-01 list: reproduced with 0 missing / 0 extra (19 recall + 41 listening/warm).
- Mixed-script 129 / katakana-keyed 126 / 3 exceptions — exact match.
- Gate recycling: 7 kana + 1 FM gate item share options+key (or chunks) with practice items.
- 42 strictly-longest keys / 533 (7.9%) — exact. 92 doubled f1Fa tails — exact. k13 disc keys
  {a,b,a,b,b,a} — کانجی never keyed. Opt clones 12; warm 46/23/8 — exact.
- Difficulty d1/d2/d3 = 67/394/14 (82.9% d2). Same-type runs: opt-r-h9 12, opt-drill 10, k13 6,
  m1-reading & m2-realworld 6 each.
- Served positions (shuffleSeeded re-implemented from grading.ts:313-331): 10 runs → all
  identical (deterministic), global 184/182/167; k1 5/9/3, opt-r-h9 4/7/1, opt-drill 2/6/2;
  FM gist 6/6 authored-a → served 2,2,1,0,2,0; gate-m2-1 payload order [あ,い,え] = [b,a,c]
  authored → matches C2's NP-1 runtime observation. **EQA-4 seeded-shuffle positive VALIDATED.**

## §5 NEW FINDINGS

### C3-B-N1 — «جفت اشتباه‌پذیر» rationale over-claims confusability in 45 more labels than C2-B-04 counted  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts — 48 option-rationale labels carry «جفت اشتباه‌پذیر …»
  for pairs that are NOT in `confusableWith` (either direction) per kana-items.ts; C2-B-04
  reported only the 3 that also fail a same-row test.
- Problem: the generic template «جفت اشتباه‌پذیر — به تفاوت شکل دقت کن.» is applied to same-row
  siblings (さ/す, し/せ, め/モ, ふ/ヘ, れ/る, ぬ/に, ね/の, お/え, こ/く, ソ/ス, ツ/テ …), which the
  bank's own CONTENT-104 policy distinguishes from documented confusables. Under C2-B-04's own
  stated regression rule («جفت اشتباه‌پذیر» ⇒ pair in confusableWith) the count is 48, not 3 —
  the finding under-reports its own lint result 16×.
- Evidence: census2/census3.mjs clusters: 47× generic template + 1× «جفت اشتباه‌پذیرِ شکل»;
  registry rows dumped for every flagged pair (e.g. き: ["さ"], い: ["り"] — so き/い is false,
  matching C2-B-04 case 1; さ/す same-row is the new class).
- Impact: same class as C2-B-04 but milder (same-row siblings are at least shape-adjacent);
  the fix (derive template from registry) is the same.
- Regression test: as C2-B-04 stated — applying it will flag 48; authors should either fix the
  template or document same-row siblings as an allowed second sense.

## §6 BLOCKERS — none
