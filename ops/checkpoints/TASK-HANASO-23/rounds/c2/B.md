# TASK-HANASO-23 — Round C2, Subagent B — Adversarial re-audit of C1-B (assessment/psychometrics)

Mandate: re-derive C1-B's mechanical results independently, attack its positive list, and hunt
what its structural passes cannot see (semantic two-correct, runtime behavior, gate audio).
Method: 14 Node scripts (Node 24 native TS loading of the content modules; scripts in
/tmp/audit_c2b, outside the worktree) + engine source reads + a runtime check against the local
standalone build (`PORT=3123`, same product commit). No product files touched.

## §1 HEADLINE

1. **The chapter-1 mastery gate never plays the question sound for its five kana-listening
   items** (all of M2, plus M5) — runtime-confirmed. With L1 thresholds (weighted ≥0.9, no
   measure <0.8) the gate is effectively unpassable by honest listening (C2-B-01, Critical).
2. C1-B-01's 60-item list re-derives **exactly** (60/60, 0 added, 0 removed) — but its blast
   radius is larger than reported: a "pick the katakana glyph" heuristic answers **126/129**
   mixed-script items (C2-B-02, High).
3. Two chapter-2 decode items have **two options that read identically** (`chuugokujin` vs
   `chuugokujin؟`) — a two-correct item C1-B-09 mis-filed as a mere distractor-policy nit (C2-B-03).
4. C1-B-05 (key-position bias) is **largely refuted at runtime**: `toClientExercise` applies a
   deterministic seeded shuffle (grading.ts:318-359) — the learner never sees authored positions;
   served positions are 184/182/167 across 1st/2nd/3rd. C1-B never noticed this engine feature.
5. C1-B-04 undercounted gate recycling: **7** gate items recycle practice content (3 more
   near-verbatim cases than reported), and 12 optional-drill items are byte-identical clones —
   C1-B's "rotated key positions" parenthetical is false at the data level (C2-B-05, C2-B-08).

## §2 RE-VERIFICATION OF C1-B MECHANICAL CLAIMS (my scripts)

- Option counts: 533 option-based items (473 kana + 60 FM) — **0** with ≠3 options; **0**
  duplicate labels within an item; **0** missing `correctOptionId`; **0** keys outside options. ✔ matches C1-B.
- Type census ch1: recognition 126, recall 92, decode 50, listening 173, rule-listening 14,
  cloze 6, produce 2, meaning-select 12 = 475. FM: 82. ✔
- Authored key positions: kana a/b/c = **136/189/148**, FM **24/19/17**. ✔ matches C1-B exactly.
- Answer keys vs registry: 173/173 kana-listening keys == registry glyph of `targetConcept`
  (0 audio/key mismatches); decode keys == `promptJaReading` modulo «» quotes (0 real
  mismatches); recognition key labels map 1:1 to promptJa romaji with one global exception
  («اُ» → both お and を, C2-B-09). **P1 "keys flawless" UPHELD.**
- Station map rebuilt from both stations files: 34 + 22 stations; 532 exercise references;
  **25 unreferenced items = exactly the 13 kana + 12 FM gate items**; zero non-gate items
  unreferenced. ✔ P6 upheld (see §5 for the runtime extension).
- Difficulty ch1: d1 67 / d2 394 / d3 14 → **d2 = 82.9%**, not "~90%" (C1-B-10 NARROWED).
  h11 18/18 d2 and h4/h5 15/15 d2 ✔; d3 is systematic (6 disc + 4 gate-M4/M5 + 2 produce + 2
  milestones), not random.

## §3 FINDINGS

### C2-B-01 — Mastery gate plays NO sound for its 5 kana-listening items; M2 measure unpassable by listening  [SEVERITY: Critical] [STATUS: CONFIRMED]
- Location: `apps/web/src/app/learn/[chapter]/assessment/page.tsx:40-42` (plain
  `toClientExercise`, never attaches `promptAudio`); `components/curriculum/mastery-gate.tsx:216-231`
  (only audio path is `ex.audioLineRef` → LineAudioButton); items ex-kana-gate-m2-1/-m2-2/-m2-3
  (the entire M2 pool), ex-kana-gate-m5-1/-m5-2.
- Problem: kana-listening items ask «به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟» —
  the sound IS the question — but the gate page ships them without `promptAudio` (declared in
  `ClientExercise` grading.ts:304 and attached by the *station* page at
  `journey/[station]/page.tsx:117-119`, never by the assessment page), and MasteryGate has no
  kana-audio code path. The 5 items render as text + 3 glyph options with nothing to hear.
- Actual (runtime, local standalone build, RSC payload of `/learn/kana-foundation-01/assessment`):
  `{"id":"ex-kana-gate-m2-1","type":"kana-listening","promptFa":"به صدای پخش‌شده گوش کن — کدام کانا
  این صدا را دارد؟","audioLineRef":"$undefined",…}` — and `rg -c "audio/kana"` over the page
  HTML = **0** (the station pages carry 30 such refs).
- Evidence: source reads above; runtime HTML/RSC inspection; kana manifest contains all 5 assets
  (`kn-hira-e`, `kn-hira-he`, `kn-kata-me`, `kn-hira-n`, `kn-hira-wo`) — the assets exist, the
  wiring is missing. E2E scripts never exercise the assessment route (grep of scripts/h21,h22).
- Learner impact: L1 gate thresholds are `weighted: 0.9, minMeasure: 0.8` (levels.ts:35) and
  kana weights `{M1:.3, M2:.25, M3:.2, M4:.15, M5:.1}` (chapter-kana01.ts:106). M2 = 3 items →
  0.8 requires **3/3**; M5 = 2 items → requires **2/2**. With no sound, each is a 1-in-3 guess
  (P(M2 perfect)=3.7%, P(M5 perfect)=11%). The chapter-completion gate is a lottery for
  learners who don't exploit item memory (m2-1/m2-2 are byte-duplicates of station items — the
  only realistic way through is remembering the glyph). This also converts C1-C-08's
  "unanswerable by sound" for gate-m5-1 into "unanswerable, period".
- Suggested fix: in assessment/page.tsx attach `ce.promptAudio = kanaAudioUrls('kn-'+e.targetConcept)`
  for `type==='kana-listening'` (mirror journey/[station]/page.tsx:117-119), or render a
  promptAudio player in MasteryGate.
- Regression test: RSC/E2E test asserting every `kana-listening`/`rule-listening` item served on
  /assessment carries a non-null promptAudio (or audioLineRef) that exists in its manifest.

### C2-B-02 — "Pick the katakana" meta-strategy answers 126/129 mixed-script items  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts — all 129 items whose option set mixes hiragana and
  katakana glyphs (k1..k13 recall/listening/warm + gate-m2-3/gate-m5-1/gate-m5-2, k1-warm-2).
- Problem: in mixed-script option sets under script-agnostic prompts, the key is a katakana
  glyph in **126/129 (97.7%)** cases (hiragana keys: gate-m5-1 ん, k1-warm-2 を, +1). A learner
  who notices "when both scripts appear, the katakana one is correct" passes the 60 C1-B-01
  collision items **and** the 69 non-collision mixed items without knowing any sound.
- Evidence: script-of-key census over the whole 475-item bank (mixed = option labels containing
  both script ranges). Full id list generated by /tmp/audit_c2b/mixed.mjs.
- Learner impact: the M-K1/M-K2 measurement for the entire katakana half is circumventable by a
  one-rule heuristic; worse, the 3 exceptions (incl. gate item m5-1) then punish the heuristic
  user who was trained into it by the other 126.
- Suggested fix: alongside C1-B-01's script-explicit prompts, balance key-script in mixed sets
  (some hiragana-keyed mixed items) or stop mixing scripts in single-answer items.
- Regression test: lint — over all mixed-script option items, |katakana-keyed share − 50%| < 15%.

### C2-B-03 — Two ch2 decode items have two identically-reading options (`chuugokujin` vs `chuugokujin؟`)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `chapter-fm01.exercises.ts` — ex-fm01-p1-c3-decode-2 (options
  `chugokujin | chuugokujin | chuugokujin؟`, key b) and ex-fm01-v2-dec-1 (options
  `chuugokujin | chugokujin | chuugokujin؟`, key a).
- Problem: option «chuugokujin؟» is the correct reading plus a stray Persian question mark —
  under the item's own task («این واژه را کانا‌به‌کانا بخوان») it reads exactly like the key.
  Two defensible answers; picking it is graded wrong with rationale «پرسشی نیست!» which tests
  punctuation etiquette, not reading.
- Expected: distractors that read differently (chugokujin/chuugokjin), as v2-dec-2 does correctly.
- Evidence: full item dumps; romaji-collision scan over all FM option sets found exactly these
  two items (all other FM options are pairwise distinct readings; the sensee/sensei case is
  C1-B-08). This upgrades C1-B-09.2 from "arbitrary distractor" to two-correct (High).
- Learner impact: same class as C1-B-01: a correct reader marked wrong; scoring contradiction.
- Suggested fix: replace «chuugokujin؟» with a true mis-reading (e.g. `chuugokun`/`chugokjin`).
- Regression test: lint — no option label may equal another option's label after stripping
  non-phonetic punctuation (؟, !, spaces).

### C2-B-04 — 13 ch1 rationales make factually false claims (wrong row / wrong confusable)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts — listening + recall items; verified against the
  registry's `row`/`confusableWith` fields.
- Problem: template rationales mis-describe the picked option:
  - «کانای دیگری با همین ردیف» ("another kana of the SAME ROW") said of a different-row glyph:
    h7-lis-hira-n (お, あ), h8-warm-1 (あ, ね), h7-rcl-hira-n (お, あ), gate-m5-1 (あ),
    h15-lis-hira-wo (ね), k1-warm-2 (ア), h15-rcl-hira-wo (ね) — 10 labels.
  - «جفت اشتباه‌پذیر» ("confusable pair") for non-confusables: h2-lis-hira-ki (い),
    k3-warm-1 (ラ for タ), kf-warm-1 (ラ for ヲ) — 3 labels.
- Evidence: registry cross-reference script (row + confusableWith) over all 173 listening +
  184 rec/recall rationales. (Extends C1-C-10 "useless" to "sometimes false".)
- Learner impact: a learner who believes お is "in the same row" as ん has been taught a false
  fact at the moment of error — the highest-retention moment.
- Suggested fix: derive these two template strings from the registry (same row? documented
  confusable?) instead of hardcoding; ん/を items need their own copy.
- Regression test: content test — rationale «همین ردیف» ⇒ distractor.row == key.row; «جفت
  اشتباه‌پذیر» ⇒ pair in confusableWith (either direction).

### C2-B-05 — Gate recycling is bigger than C1-B-04 reported: 7 gate items (not 4)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: gate bank, both chapters.
- Problem/Actual (same options+same key as a practice item the learner already answered):
  - exact: gate-m1-1≡h2-rec-hira-ko; gate-m2-1≡h1-lis-hira-e; gate-m2-2≡h12-lis-hira-he;
    fm gate-m3-3≡g5-order-1 (chunks identical) — the 4 C1-B listed.
  - **new near-verbatim** (C1-B missed): gate-m1-2 (promptJa つ vs ツ — same sound, same options
    «تسو»/«شی»/«تا», same key a); gate-m4-1 (し vs シ, same options+key a); gate-m4-2 (same ソ,
    same options+key c, prompt merely extended); gate-m2-3 (same target/key position as
    k9-lis-kata-me, one distractor swapped モ→ヌ).
  ⇒ 7 of 13 kana gate items (+ fm gate-m3-3) recycle practice content; the kana pool's fresh
  items are m1-3, m3-1..3, m5-1..2 (6 of 13).
- Evidence: systematic same-options+key scan over all 25 gate items vs the practice pools.
  Note: at runtime the seeded shuffle re-orders options per item id, so the *position* doesn't
  transfer — but the answer GLYPH does; C1-B-04's "(incl. key position)" is accurate only for
  the authored data, not the served payload.
- Learner impact: M1/M2/M4 gate scores partly measure item memory, not mastery (C1-B-04 core
  claim UPHELD and enlarged).
- Suggested fix: refresh surface for the 8 (different glyph trio / example), as gate-m2-3
  half-does.
- Regression test: lint — no gate item may share (options labels + key) with any practice item.

### C2-B-06 — Key-is-the-longest-option giveaway in 42 items (7.9%)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: 42/533 option items where the key is strictly the longest option (83/533 where its
  length is unique). Concentrated in FM gist/meaning/audio items (e.g. ex-fm01-l2-gist-1 key 40
  chars vs 17/27; a1-gist-3 41 vs 25/30; a2-gist-3 37 vs 25/26; gate-m1-1 38 vs 22/19;
  v2-txt-1 20 vs 14/9; v2-aud-2 21 vs 10/11) and in the «(؟)» mp items where only the KEY
  carries a Persian gloss (l1-mp-1 «せんせい (استاد)» 12 vs 7/8; l1-mp-2; l2-mp-1).
- Problem: C1-B positive-4 claimed "no length giveaways … in both chapters — verified item by
  item". The authored data contradicts this: the elaborate-option heuristic ("pick the most
  detailed one") scores 42 free items; combined with the (؟)-gloss it makes the three
  listen-minimal-pair items answerable without listening even after removing «(؟)».
- Evidence: length-census script over all 533 option items (counts by type in /tmp/audit_c2b).
- Suggested fix: equalize option verbosity within items; strip glosses from keys in listening
  items (move to rationale).
- Regression test: lint — no item where key length > both distractor lengths (allow list for
  mora-count decode items where length IS the construct).

### C2-B-07 — k13 disc family: the کانجی option is never correct (0/6)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: ex-kana-k13-disc-1..6 (options هیراگانا/کاتاکانا/کانجی in all six).
- Problem: keys are only a/b (ひ→a, シ→b, そ→a, ネ→b, ヌ→b, は→a); «کانجی» is never keyed —
  and is never the answer anywhere else in the bank. A learner can eliminate one option in
  every disc item; combined with alternation, the 6-item set is low-information.
- Evidence: dump of all six items; never-keyed-label scan.
- Learner impact: station k13's script-discrimination measure is partly guessable.
- Suggested fix: key کانجی in at least one disc item (a kanji glyph from h0's three-scripts
  scene) or drop the option.
- Regression test: lint — within any repeated option-label family, every label keyed ≥ once.

### C2-B-08 — Optional-drill "clones" are byte-identical, not key-rotated; warm rotation is 46/77  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: ex-kana-optrev-rec-1..12, ex-kana-optdrill-rec-1..10 (stations opt-r-h9, opt-drill);
  77 warm items.
- Problem: C1-B's mechanical-notes claim "optrev/optdrill clone 20 h1–h9 recognition items with
  rotated key positions" and positive-5 "warm blocks … with rotated keys". Actual data:
  - 12 of the 22 optrev/optdrill items are **exact duplicates (same prompt+ja+options+key)** of
    station items (optrev-1..5,7,11,12 ≡ h1/h2/h3 items; optdrill-6..8 ≡ optrev-8/h3 items);
    the other 10 are fresh items, and none of the clones rotated anything.
  - Warm blocks: 46/77 rotated, **23/77 keep the source's key position** (e.g. h4-warm-1 ≡
    h3-lis-hira-sa both key b; the h3 sa-trio reappears at h4/h5/h6/h7 with positions b,c,b,a —
    «さ|b» recurs at h4 AND h6), 8/77 have refreshed distractors (good).
- Mitigation found in the engine (and missed by C1-B): `toClientExercise` re-shuffles options
  per item id, so served positions differ from authored ones; the position-level learnability
  largely evaporates at runtime. What remains is content repetition — for warm items that is
  the documented EV-232 spaced-retrieval design; for the 12 opt-drill exact clones it means the
  optional stations partly re-serve already-answered items verbatim (acceptable as review, but
  "rotated" is simply wrong).
- Evidence: exact-duplicate signature scan (type+prompt+promptJa+options+key) over the whole
  bank; warm-source matching script.
- Suggested fix: none required for warm (design); correct the header/comment claims; optionally
  refresh opt-drill surfaces.
- Regression test: none (documentation accuracy); keep dup scan for gate-vs-practice only.

### C2-B-09 — «اُ» is the label for BOTH お (h1) and を (h15) — P7's "internally coherent" is only locally true  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: ex-kana-h1-rec-hira-o (key «اُ» = お/o) vs ex-kana-h15-rec-hira-wo &
  ex-kana-k12-rec-kata-wo (key «اُ» = を/wo); recall prompts «کانای «اُ» کدام است؟» at both h1
  (answer お) and h15 (answer を).
- Problem: two different glyphs share one Persian reading label; the recall prompt is globally
  ambiguous between them. No option set ever contains both お and を (verified — 0 label-level
  same-sound collisions in 533 items), so no item is currently two-correct, but the learner is
  taught «اُ»→お in h1 and «اُ»→を in h15 with no note that they are homophones (h15 wrap-up
  only says `を(اُ)`).
- Evidence: label→sound map built from all recognition keys (47 distinct labels, one conflict);
  お/を co-occurrence scan (0 items).
- Suggested fix: one teaching line in h15 («を like お sounds /o/; writing differs»), or label
  を as «اُ (وای آخر)»-style distinct string.
- Regression test: lint — Persian reading labels must map 1:1 to romaji across the bank
  (allowing the deliberate お/を merger only if documented in the teaching copy).

### C2-B-10 — Residual served-position bias after the shuffle (3 stations, 10 runs)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: served-order stats per station (exact re-implementation of `shuffleSeeded`).
- Problem: served positions are globally uniform (184/182/167) but locally lumpy: k1 5/9/3
  (53%), opt-r-h9 4/7/1 (58%), opt-drill 2/6/2 (60%); and 10 deterministic runs of 4 identical
  served positions (h2, h3, h6 ×2, h8, h10, k1, k3, k5 ×2). Because the shuffle is seeded by
  item id, these are stable across sessions — a repeat learner could in principle learn them.
- Evidence: served.mjs (algorithm copied verbatim from grading.ts:318-343).
- Suggested fix: seed with id+session, or accept (impact small: max share 60% in a 10-item
  optional station).
- Regression test: none needed beyond awareness.

## §4 C1-B VERDICTS (touched findings)

| C1-B | Verdict | Evidence |
| --- | --- | --- |
| B-01 (60 two-correct) | **UPHELD exactly** — my independent derivation: 60/60 ids match, 0 added, 0 removed (19 recall + 41 listening). Extended by C2-B-02 (meta-strategy) | derive60.mjs |
| B-02 (g2-cloze-1 double blank) | **UPHELD** — engine fills every null with the same label (exercise-session.tsx:705-709 re-read); dialogue L5 confirms the two tokens differ | source |
| B-03 (p2-c2-prod-1 contradiction) | **UPHELD** — chips/acceptedChipOrder re-verified; 3 agents in C1 | dump |
| B-04 (4 gate dups) | **NARROWED (undercounted)** — 7 gate items recycle practice content + 1 refreshed (C2-B-05); "incl. key position" is authored-data-only (runtime shuffle re-orders) | gates.mjs |
| B-05 (position bias) | **REFUTED at runtime** — seeded shuffle (grading.ts:344-359) serves options in per-item deterministic order; served positions 184/182/167; FM anchor gist 6/6 authored-a → served 3,3,2,1,3,1. Residuals: C2-B-10 | served.mjs + runtime HTML (station payload shows shuffled order) |
| B-06 (92 doubled f1 tails) | NOT re-verified (C-04/A-10 double-confirmed in C1) | — |
| B-07 («(؟)» labels) | **UPHELD + aggravated** — the KEY also carries the gloss («せんせい (استاد)»), adding a length/gloss giveaway (C2-B-06) | dumps |
| B-08 (sensei marked wrong) | **UPHELD** — options `sensei/sensen/sensee` key c confirmed; note its rationale map is also mis-keyed (b carries the sensei explanation, a has none — C1-C-01 family) | dump |
| B-09 (distractor policy) | **UPHELD; case 2 UPGRADED to High two-correct** (C2-B-03) | — |
| B-10 (flat ~90% d2) | **NARROWED** — 82.9% d2; d1/d3 usage is systematic (d1 = non-confusable recognition; d3 = disc/gate-M4/M5/produce/milestones); monotony sub-claim stands | diff.mjs |
| B-11 (damma-ُ = /u/) | **UPHELD** (design observation); related new label collision «اُ» (C2-B-09) | — |

## §5 POSITIVE LIST ATTACKED (C1-B's 10) + NEW POSITIVES

1. Keys flawless — **HELD** (§2; 173/173 listening key==audio glyph, decode==reading, 0 defects).
2. Confusable distractors excellent — **HELD** with the 3 known outliers + 3 new mislabeled
   confusable rationales (C2-B-04).
3. Decode error families authentic — **HELD** (spot-verified h4/h5/h13/k8 decode sets).
4. "No mechanical option defects" — mechanics **HELD** (0/0/0/0); "no length giveaways"
   **REFUTED** (C2-B-06: 42 strictly-longest keys).
5. Warm recycling rotated keys — **PARTLY REFUTED** at data level (C2-B-08); HELD as design
   (spaced retrieval) since runtime shuffle + content repetition are both intended.
6. Gate pool isolation — **HELD and EXTENDED**: beyond the zero-reference map, isolation is
   *enforced* by validation.ts:221-229 (station block referencing a mastery item = error) and
   :321 (practice item not referenced = error); runtime pages serve mastery-only (assessment
   page filter; mastery route grades mastery bank only). Ironically the isolated pool itself
   carries the C2-B-01 defect — isolation ≠ validity.
7. u/o + を consistency — **NARROWED** (C2-B-09: «اُ» maps to both お and を; within-item
   consistency still 0 violations).
8. Ch2 cloze contrasts accurate — **HELD** (p2-c3-cloze-1/2 compound options re-verified
   correct; g1-cloze-1 rationales accurate).
9. Anchor gist EQA-1 — **HELD**: all six a1/a2 gist items + l1/l2/p1-c2/gate-m4-1 gist items
   re-checked against the dialogue YAML (13/13 lines read): every distractor is false of the
   cited line (no "arguably also true" case found; e.g. nobody orders coffee anywhere, so
   l1-gist-1's «سفارش قهوه» is safely false).
10. Prerequisite hygiene — **HELD**: 0 glyph-concept assessed before its `introducedInUnit`;
    0 rule-mark usage (small-kana/ッ/ー) outside rule stations; ch1 `assessesConcepts` contains
    ONLY glyph concepts (the lead's suspected 'long-vowel before K8' / 'sokuon before H13' /
    'yōon before H6' classes do not exist — ch1 never declares rule concepts at all); FM
    concepts all resolve to FM01_WORDS/GRAMMAR/EXPRESSIONS, no early assessment found.

**New positives (C1 missed):**
- **NP-1 — The EQA-4 seeded shuffle is real and effective** (grading.ts:318-359): authored
  a/b/c bias (136/189/148) never reaches the learner; served 184/182/167. Verified by exact
  algorithm re-implementation AND by the served RSC payload (station page options arrive
  shuffled; gate-m2-1 payload order [b,a,c]).
- **NP-2 — Station-side listening audio plumbing is complete**: all 92 kana have manifest
  assets; all 173 listening + 92 recall `targetConcept`s resolve (0 nulls); key glyph ==
  audio glyph 100% (the audio can never contradict the key in stations).
- **NP-3 — Gate isolation is enforced by validation code**, not just authoring convention
  (validation.ts:221-229, :321).
- **NP-4 — FM audio anchors are truthful**: every audio-meaning/minimal-pair/speaker item I
  checked (8/8) points at a dialogue line that actually contains the target word (e.g.
  v1-p1-aud-1 わたし→L3 mid-line ✓, l2-mp-1 かんこく→L10 ✓, g2-aud-1 ですか→L7 ✓).

## §6 COVERAGE (exact)

- **Mechanical re-verification: 475/475 ch1 + 82/82 ch2 (100%)** — option counts, dup labels,
  key presence/membership, authored+served key positions, difficulty, type census,
  duplicates (exact + near), gate-twin scan, mixed-script census, length census,
  label→sound map, rule-mark budget scan, concept-taught scan.
- **Full-text reads this round**: 44/173 kana-listening (25.4% deterministic sample, every 4th
  item) — options, rationales, f1/f2/f3; 12/12 meaning-select; all 60 FM option-based items
  compact re-read + ~20 FM items full text (decode/mp/gist/cloze/order); 8 gate items full
  dump; dialogue YAML 13/13 lines; h15 station teaching block.
- **Engine code read**: mastery-gate.tsx (364/364), assessment/page.tsx (62/62),
  grading.ts §toClientExercise/shuffle/computeMastery/gradeMasterySubmission, station route
  §persianReading/correctAudio/promptAudio, journey/[station]/page.tsx §transport,
  exercise-session.tsx §cloze-fill/listening-player, validation.ts §gate rules, levels.ts
  §gate caps.
- **Runtime**: local standalone build (product commit) — gate page RSC payload (kana chapter)
  + station page payload (h1) inspected; audio-manifest cross-checks (kana 92, hostwords for
  rule-listening items per C1-A-04 not re-run).
- **Not covered / deferred**: C1-B-06 f1-tail duplication re-check; practice-module generated
  sessions; kana-decode full re-read (keys re-verified mechanically); production site (not
  touched — local build is the same commit).

— Subagent B, Round C2. Only this report file added; working tree otherwise clean.
