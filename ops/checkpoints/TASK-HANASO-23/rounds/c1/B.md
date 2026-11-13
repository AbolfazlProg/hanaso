# TASK-HANASO-23 — Round C1, Subagent B — Assessment & Psychometrics Audit (Ch.1 + Ch.2 exercise banks)

Auditor role: assessment/psychometrics researcher (test validity, distractor design, JLPT-style
item writing). READ-ONLY audit: no product/content files touched. All numbers below were
produced by mechanical scripts over the live content (Node `require()` of the TS content files)
plus 100% eyes-on review of every one of the 475 + 82 items (compact dump per item:
id/station/difficulty/type/prompt/options/key) and full verbatim reads of the mandated stations.

## SCOPE & COVERAGE (exact counts)

- Chapter 1 (`chapter-kana01.exercises.ts`, 475 items): **475/475 = 100%** passed through
  mechanical key/option checks and compact eyes-on review — this exceeds the ≥40% per-station
  requirement for every station. Verbatim deep source reads for the mandated 100% set:
  - h0: station read — **0 exercise items** (scene/dialogue/wrap-up only; nothing to audit).
  - h15: 14/14 read in source. k13: 8/8 (incl. 6 `disc` script-discrimination items).
    m1-reading: 6/6. m2-realworld: 6/6. k12-foreign: 4/4 (ancillary).
  - Listening: all **173 kana-listening** and **14 rule-listening** items checked + flagged ones
    read in source. Recall: all **92 kana-recall** items. Recognition: all **126** (incl. k13
    `disc`). Decode: all **50 kana-decode** (key vs `promptJaReading`). Meaning-select 12,
    cloze 6, produce-template 2 — all read.
- Chapter 2 (`chapter-fm01.exercises.ts`, 82 items): **82/82 = 100%** full source read (all
  2007 lines) + compact re-review; all 60 option-based items mechanically checked.
- Station mapping: built from the stations files via `require()`; verified 34 kana stations
  (0–18 items each) and 22 FM stations; 13 kana + 12 FM gate items referenced by zero station
  blocks (matches the documented non-overlapping gate pool).

## MECHANICAL CHECK NUMBERS (scripts in /tmp/audit_b, outside the worktree)

- Option count: 473 kana + 60 FM option-based items — **all exactly 3 options**; 0 violations.
- Keys: 0 missing `correctOptionId`, 0 keys outside their options array, 0 duplicate option
  labels within any item, 0 `KEY_NOT_IN_OPTIONS`.
- Answer-key correctness vs ground truth (`kana-items.ts` registry): recognition 126/126,
  recall 92/92, listening 173/173, rule-listening 14/14, decode 50/50 (key label ==
  `promptJaReading` in every decode item). **Every registered key matches Japanese truth.**
  The defects found are *additional* valid answers / item design, not wrong keys.
- Key-position distribution: kana a/b/c = **136/189/148** (b = 40.0%); FM = **24/19/17**.
- Untaught-glyph usage scan: 7 hits, **all inside rule stations** (h6 yōon items show full-size
  よ/や as the very contrast being taught; h13-asm-4) — no "never untaught content" violation.
- Exact-duplicate scan (type+prompt+options+key): warm-up listening items are deliberate
  content clones of the previous station's trio (EV-232 structured recycling, documented);
  optrev/optdrill clone 20 h1–h9 recognition items with rotated key positions; gate pool has
  4 verbatim duplicates of practice items (C1-B-04).

## FINDINGS

### C1-B-01 — 60 items have TWO correct answers (same sound in both scripts under a script-agnostic prompt)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `chapter-kana01.exercises.ts` (ids below); stations k1..k13 + 1 gate item.
- Problem: katakana recall/listening items include the **hiragana twin of the target sound**
  as a keyed-wrong option, while the prompt never names the script. For a recall item the
  prompt is e.g. `کانای «آ» کدام است؟` with options `あ | ア | い`, key `ア` — under the prompt
  as worded, **あ is equally "the kana for آ"**; the learner who picks あ is marked wrong and
  told `«کانای دیگری با همین ردیف.»` ("another kana of the same row") — factually false: it is
  the same sound in the other script. Listening items are worse: the audio is the only cue, so
  both scripts match the heard sound exactly.
- Expected: exactly one option correct under Japanese usage; either the prompt names the
  script (`کاتاکانا`) or the same-sound twin must not appear.
- Actual: verbatim (ex-kana-k1-lis-kata-a): prompt `به صدای پخش‌شده گوش کن — کدام کانا این صدا
  را دارد؟` options `あ/ア/い` key `ア`, rationale for `あ`: `کانای دیگری با همین ردیف.`
- Evidence: sound-collision script over all 475 items (glyph→romaji from the registry);
  60 items where two options share the target sound: 19 `kana-recall` + 41 `kana-listening`.
  Per station: k1:4 k2:6 k3:6 k4:4 k5:5 k6:4 k7:5 k8:2 k9:6 k10:4 k11:5 k12:6 k13:2 gate:1.
  Recall ids (19): ex-kana-k1-rcl-kata-a, -k1-rcl-kata-i, -k2-rcl-kata-ta, -k2-rcl-kata-chi,
  -k3-rcl-kata-ra, -k3-rcl-kata-ri, -k4-rcl-kata-sa, -k5-rcl-kata-ha, -k5-rcl-kata-hi,
  -k6-rcl-kata-n, -k7-rcl-kata-ka, -k7-rcl-kata-ki, -k9-rcl-kata-ma, -k9-rcl-kata-mi,
  -k10-rcl-kata-ya, -k11-rcl-kata-na, -k11-rcl-kata-ni, -k12-rcl-kata-wa, -k12-rcl-kata-wo.
  Listening/warm ids (41): ex-kana-k1-lis-kata-a, -k1-lis-kata-i, -k2-warm-1, -k2-warm-2,
  -k2-lis-kata-ta, -k2-lis-kata-chi, -k3-warm-1, -k3-warm-2, -k3-lis-kata-ra, -k3-lis-kata-ri,
  -k4-warm-1, -k4-warm-2, -k4-lis-kata-sa, -k5-warm-1, -k5-lis-kata-ha, -k5-lis-kata-hi,
  -k6-warm-1, -k6-warm-2, -k6-lis-kata-n, -k7-warm-1, -k7-lis-kata-ka, -k7-lis-kata-ki,
  -k8-warm-1, -k8-warm-2, -k9-warm-1, -k9-warm-2, -k9-lis-kata-ma, -k9-lis-kata-mi,
  -k10-warm-1, -k10-warm-2, -k10-lis-kata-ya, -k11-warm-1, -k11-lis-kata-na, -k11-lis-kata-ni,
  -k12-warm-1, -k12-warm-2, -k12-lis-kata-wa, -k12-lis-kata-wo, -k13-warm-1, -k13-warm-2,
  ex-kana-gate-m5-1.
- Learner impact: correct answers graded wrong; misleading feedback teaches a false claim;
  measurement validity of M-K2/M-K4 (and the listening construct) is degraded for ~13% of the
  chapter-1 bank.
- Suggested fix (minimal): make katakana items script-explicit — the bank already contains the
  fix pattern in `ex-kana-gate-m4-2`: `این کانای کاتاکانا چه صدایی دارد؟…`; or drop the
  hiragana twin from those option sets.
- Regression test: content-lint asserting "no option set may contain two glyphs whose registry
  romaji equals the target concept's romaji" (rule + exception for script-explicit prompts).

### C1-B-02 — ex-fm01-g2-cloze-1: two different blanks, one option list, key matches only the second blank  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `chapter-fm01.exercises.ts:280-303` (ex-fm01-g2-cloze-1, station stn-fm01-05).
- Problem: `clozeTokens: ['ソラさん', null, '。', 'ちゅうごくじん', null, 'か', '。']` — two nulls
  needing **different** tokens (dialogue line 5: `ソラさんですね。ちゅうごくじんですか。`), but a single
  3-option list `です/ですか/ですね` with key `です` (valid for blank 2 only). The rationale even
  admits it: `دو جای خالی داری — اولی تأیید (ですね)، دومی پرسش (です).` No single selection can
  be correct for both blanks; choosing `ですね` (correct for blank 1) is graded wrong.
- Expected: compound options covering both slots (the pattern the same file uses correctly in
  ex-fm01-p2-c3-cloze-1/-2: `も + ですか` etc.), or two separate items.
- Actual: engine fills **every** null with the same selected label
  (`components/curriculum/exercise-session.tsx:705-709`: `tok === null ? … labelFor(ex, selected)`),
  so the "correct" rendering becomes `ソラさんです。…` — dropping the taught ね-form and
  contradicting the item's own F3 (`ソラさんですね (تأیید) + ちゅうごくじんですか (پرسش).`).
- Evidence: source read + engine code read (exercise-session.tsx; mastery-gate.tsx:237 same).
- Learner impact: the marked-correct answer renders a sentence that differs from the dialogue
  and from the feedback; a learner who understood the ね/か contrast can be marked wrong.
- Suggested fix: replace options with compounds `ですね+です / です+ですか / ですね+ですか`, key 1.
- Regression test: content-lint "items with >1 null in clozeTokens must use compound options".

### C1-B-03 — ex-fm01-p2-c2-prod-1: production template builds a contradictory sentence  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `chapter-fm01.exercises.ts:1225-1246` (station stn-fm01-17-practice).
- Problem: prompt `بساز: «[من] دانشجو نیستم. دانش‌آموز هستم.»` with chips
  `がくせいでは / ありません / がくせいです` → accepted sentence is
  `がくせいでは ありません。がくせいです。` = *"I am not a student. I am a student."* The Persian
  prompt distinguishes دانشجو (がくせい) from دانش‌آموز (pupil), but the chip set reuses がくせい
  for both clauses, so the "correct" Japanese is semantically false. The parenthetical even
  concedes it: `がくせی‌های مدرسه را با خودت عوض نکن — همین الگو را بساز`.
- Expected: a template whose target sentence is true Japanese (e.g. せんせいでは ありません。
  がくせいです。), teaching the AはBではありません pattern with distinct nouns.
- Actual: verbatim quote above; f3Explain gives only the abstract pattern (`الگوی نفی: AはBでは
  ありません.`) — never the sentence, which hides the contradiction.
- Evidence: full source read (100% FM coverage).
- Learner impact: teaches the negation pattern via a nonsense model sentence; risk of
  imitating "Xではありません。Xです。" as a meaningful utterance.
- Suggested fix: swap chip 1 to `せんせいでは` (teacher) — prompt «او معلم نیست. دانشجو است.»
  (that exact sentence already exists as ex-fm01-g4-prod-1; vary the nouns).
- Regression test: content-lint on produce-template items: accepted chip sequence rendered as
  a sentence must not contain the same content word on both sides of ではありません。

### C1-B-04 — Mastery-gate pool contains verbatim duplicates of practice items  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: gate items in both exercise banks (referenced by zero stations — verified).
- Problem: 4 gate items are byte-for-byte duplicates (prompt+options+key, incl. key position)
  of items the learner already answered inside stations:
  - `ex-kana-gate-m1-1` ≡ `ex-kana-h2-rec-hira-ko` (glyph こ, options «کا/کُ/کی», key a);
  - `ex-kana-gate-m2-1` ≡ `ex-kana-h1-lis-hira-e`; `ex-kana-gate-m2-2` ≡ `ex-kana-h12-lis-hira-he`;
  - `ex-fm01-gate-m3-3` ≡ `ex-fm01-g5-order-1` (بچین: «از کره آمدم», chunks identical).
  The banks' headers claim a "non-overlapping mastery pool (QUESTION §۵-۱)" — true at the
  station-reference level, false at content level: the gate partially measures recognition
  memory of a prior answer, not independent mastery.
- Expected: gate items never repeat practice content verbatim (fresh surface, e.g. different
  glyph trio or different country example).
- Actual: exact-match script output (type+prompt+promptJa+options+correctOptionId).
- Learner impact: inflated gate scores (M-K2/M3) for learners with good item memory; the
  mastery weights (0.9 gate / 0.8 minMeasure) are then partly satisfied by rehearsed answers.
- Suggested fix: rotate surface (different glyph/example) for these 4; keep key position.
- Regression test: content-lint "no two exercise ids may share prompt+options+key" across
  gate vs practice roles.

### C1-B-05 — Learnable key-position bias inside stations  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: per-station key-position stats (script over all option-based items).
- Problem: the seeded-position claim (EQA-4) holds only at bank level (b=40% in kana); inside
  stations the key sits predictably: `stn-kana-h13` key b in **11/14** (79%); `stn-kana-h14`
  key c in **0/12** (never c); `stn-kana-h5` c in 1/15, `stn-kana-h4` c in 2/15;
  `stn-kana-k5` key c in **11/18** (61%); `stn-kana-k7` c in 2/16, h6 c 4/15. In Chapter 2 the
  six anchor/reconnect gist items (ex-fm01-a1-gist-1..3, a2-gist-1..3) are **all keyed a**
  (6/6 in a row across two stations) — a learner can answer "first option" and pass.
- Expected: position roughly uniform per station (each position ≈33% ±spread) and no runs of
  same-position keys >3.
- Actual: counts above (verbatim from stats output).
- Learner impact: position-based test-wiseness inflates station mastery measurement.
- Suggested fix: rebalance those stations' keys; note anchor gist items already exist at the
  same positions in two stations — vary.
- Regression test: per-station lint: max(key-position share) ≤ 50% for stations n≥8; no
  >3 consecutive same-position keys.

### C1-B-06 — 92 recall items carry a duplicated feedback sentence (template bug)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: every `kana-recall` item's `feedback.f1Fa`, e.g. `chapter-kana01.exercises.ts:160`.
- Problem: f1Fa ends with the phrase `— به شکل درست نگاه کن.` **twice**: `کانای «آ» این نیست —
  به شکل درست نگاه کن. — به شکل درست نگاه کن.` Generator concatenated the template twice.
- Expected: single sentence.
- Actual: `rg -c` over the file: **92 occurrences** (= all 92 recall items).
- Learner impact: visible sloppiness in the most-used feedback line of the kana course.
- Suggested fix: one-line codegen/content fix: strip the duplicated suffix.
- Regression test: lint `f1Fa` must not contain a repeated trailing sentence.

### C1-B-07 — FM minimal-pair distractors are pre-marked as non-words («(؟)») — answerable without listening  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-fm01.exercises.ts` — ex-fm01-l1-mp-1 (`せんせ (؟)`, `せんせえ (؟)`),
  ex-fm01-l1-mp-2 (`ちゅごく (؟)`, `ちゅうご (؟)`), ex-fm01-l2-mp-1 (`かこく (؟)`, `かここ (؟)`).
- Problem: in listening minimal-pair items, 2 of 3 options are visibly annotated «(؟)» =
  "not a word". A learner can pick the only un-annotated (real) option **without listening at
  all** — the item stops measuring the auditory distinction (vowel length / nasal mora) it
  declares in `assessesConcepts`. Also factually shaky: かこく is a real word (過酷, kakoku),
  and せんせ is live slang for せんせい.
- Expected: bare kana forms as in ex-fm01-or2-mp-1 (`せんせい/せんせ/せんせえ`, no annotations) —
  that item does it right.
- Actual: verbatim option labels above.
- Learner impact: d3 listening items effectively become d1 visual-elimination items.
- Suggested fix: remove «(؟)» from labels (keep the rationale text).
- Regression test: lint — option labels must not contain «؟» in minimal-pair/listening items.

### C1-B-08 — 'sensei' marked wrong while being the standard romanization of せんせい  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: ex-fm01-p1-c3-decode-1 (`chapter-fm01.exercises.ts:701-721`, station 08-practice).
- Problem: options `sensee / sensei / sensen`, key `sensee`; rationale b: `i کوتاه — استاندارد
  HANASO دوبل‌واکه است.` Learners who know any mainstream textbook (Hepburn/kunrei: せんせい =
  "sensei") see **two defensible correct answers**; the item punishes prior knowledge instead
  of building on it.
- Expected: distractors that are wrong under every common romanization (e.g. `sensen`,
  `sense`), or the item asks for the double-vowel convention explicitly.
- Actual: quoted rationale; prompt `با کاناهایی که در فصل ۰۱ آموختی بخوان: این واژهٔ همین فصل چیست؟`
  (no convention stated).
- Learner impact: contradictory scoring for learners with prior exposure; convention clash
  between chapters (Ch.1 readings are Persian-script; Ch.2 suddenly Latin romaji).
- Suggested fix: keep `sensee` as key, replace `sensei` with e.g. `sense` / `sensē`-free form.
- Regression test: lint — a distractor that is a standard romanization of the target word is
  flagged (small exception list per house convention doc).

### C1-B-09 — Distractor-policy violations (arbitrary options)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location/Problem (3 cases):
  1. `ex-kana-h2-rec-hira-ku` (`:313-338`): distractor `«هه»` (label of へ/he) for く/ku —
     not same-row, not a documented confusable; the declared policy is "documented
     confusables first, then same-row siblings (CONTENT-104)" (file header). Repeated in
     optrev-rec-8 / optdrill-rec-6 clones.
  2. `chuugokujin؟` as a reading distractor in ex-fm01-p1-c3-decode-2 and ex-fm01-v2-dec-1 —
     a correct reading with a stray Persian question mark; rationale `پرسشی نیست!` tests
     nothing about kana reading.
  3. `ex-kana-m2-word-pasokon`: distractor `گارسون (زن)` — semantically absurd for a
     パソコン meaning item (harmless but unprofessional).
- Expected: error-family distractors only (as the bank overwhelmingly does).
- Suggested fix: replace with same-row siblings (`«که»/«کی»` for ku; `chuugokun`/`chugokujin`
  for the decode; a registry host-word for pasokon).
- Regression test: extend the distractor lint with "options must be same-row/confusable/
  real-error-family" heuristics for glyph-sound items.

### C1-B-10 — Monotony & flat difficulty  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: station type-run stats (script over station block order).
- Problem: same-type runs — opt-r-h9: **12 recognition items in a row**; opt-drill: 10 in a
  row; k13: 6 recognition in a row; m1-reading/m2-realworld: 6 meaning-select in a row;
  core kana stations run 5 recognition in a row (by packet design, acceptable). Difficulty
  is flat: chapter-1 is ~90% d2 (e.g. h11: 18/18 d2; h4/h5: 15/15 d2), so `difficulty`
  barely discriminates; no per-item band/arc is declared on exercises (only d1–d3), which
  limits level-alignment auditing.
- Expected: interleave types in optional drill stations; use d1/d3 where the construct is
  genuinely easier/harder (listening items are d2 while the same judgment is d3 in FM).
- Learner impact: fatigue in optional drills; weak difficulty-based sequencing.
- Suggested fix: reorder/interleave opt stations; recalibrate a handful of difficulty flags.
- Regression test: lint — max same-type run ≤6 in core stations, ≤8 in drills.

### C1-B-11 — Persian o/u convention: «کُ» reads as /u/ to Persian eyes  [SEVERITY: Low] [STATUS: CONFIRMED (design observation)]
- Location: house transliteration throughout (e.g. ex-kana-h2-rec-hira-ko key `«کُ»` for こ;
  ex-kana-h11-rec-hira-ru options `«رُ»`(=ろ) vs `«رو»`(=る) in one item).
- Problem: Japanese o is written with Persian damma (ُ), which Persian readers vocalize as
  /u/ — the same sound as the و-form used for u. So sound-based recall cannot distinguish
  く/こ pairs; only the visual و-vs-ُ contrast is trained. The bank never puts both forms of
  the same consonant in one item **except** the r-row face-off cited above (which at least
  makes the contrast explicit). It is consistent (0 unintended label collisions found), so
  this is a pedagogical-phonology risk, not a scoring bug.
- Suggested fix (optional): add one teaching note in the kana cards that «ـُ» = Japanese "o"
  (short), distinct from «ـو» = "u"; or switch to «ـو» for u and «ـوو»-style for long forms.
- Regression test: n/a (design); keep the existing "no two labels with same consonant+u/o
  reading in one option set" lint that currently passes.

## POSITIVE FINDINGS (with evidence)

1. **Answer keys are flawless at the single-answer level**: all 473 kana + 60 FM option items
   have their registered key matching the registry/dialogue ground truth (126 recognition,
   92 recall, 173 listening, 14 rule-listening, 50 decode; 100% FM). No wrong-key item found
   in 557 items — a strong base for the gate.
2. **Confusable-pair distractor design is excellent where applied**: recognition/recall
   distractors draw on documented pairs — ソ→`«ن»` for ン (ex-kana-k6-rec-kata-n / k4-rec-so),
   フ→`«وا»` for ワ, ユ→`«اِ»` for ユ/エ, ヌ→`«مه»` (メ), タ→`«نا»` (ナ). Evidence: dump lines for
   ex-kana-k4-rec-kata-so, k5-rec-kata-fu, k10-rec-kata-yu, k11-rec-kata-nu, k11-rec-kata-na.
3. **Decode items use authentic learner-error families**: dakuten (`がっこう`→`«کَکّوو»`),
   long-vowel (`こうこう`→`«کوکو»`, `コーラ`→`«کورا»`), sokuon with Persian tashdid
   (`さっき`→`«سَکّکی»`, `がっこう`→`«گَکّوو»` vs `«گَکّو»`). Evidence: ex-kana-h13-dec-1/2,
   h13-asm-1/2, k8-asm-3.
4. **No mechanical option defects**: exactly 3 options everywhere; no duplicate labels; no
   missing keys; option sets are same-script/same-length families (no length giveaways) in
   both chapters — verified item by item.
5. **Warm-up recycling is real and structured** (EV-232): each station's warm block re-plays
   the previous unit's listening trio as fresh items with rotated keys (e.g. h4/h5/h6/h7
   warm blocks clone the h3 sa-row trio) — spaced retrieval, not copy-paste of ids.
6. **Gate pool isolation verified**: all 13 kana + 12 FM gate items are referenced by zero
   station blocks — exactly as the file headers document (map built from stations source).
7. **Cross-item label consistency**: the u/o (و/ُ) convention never produces two same-sound
   labels in one option set (0 hits); を is taught consistently as «اُ» (modern "o") across
   rec/rcl/lis (ex-kana-h15-rec/rcl/lis-hira-wo) — internally coherent transliteration.
8. **Chapter-2 cloze distractors teach real contrasts**: です/ですか/ですね options carry
   accurate rationales (`ですか = پرسش — این جمله خبری است。`, `ですね = تأیید شنیده‌ها…`) —
   ex-fm01-g1-cloze-1; and compound double-blank clozes (p2-c3-cloze-1/2) are correctly
   built — showing C1-B-02 is a one-off, not a pattern.
9. **Anchor comprehension checks honor EQA-1**: the six a1/a2 gist items are answerable
   from viewing alone, distractors reference story facts (`کره خاستگاه کیم است، نه سورا`),
   never untaught language — file comment + item texts (see C1-B-05 for their position bias).
10. **Prerequisite hygiene**: zero untaught-glyph usage outside rule stations (7 hits, all
    the yōon/sokuon rule contrasts those stations exist to teach) — scan across all 475.

## NOTE FOR ROUND 3 (verification pointers)

- The 60-item list in C1-B-01 can be regenerated with: for each option-based item, assert
  no two option glyphs' registry romaji equal the target concept's romaji (exception:
  script-explicit prompts like ex-kana-gate-m4-2).
- C1-B-02/C1-B-03 are single-file content edits in `chapter-fm01.exercises.ts` (lines ~280,
  ~1225); C1-B-06 is a one-line codegen regex over 92 items in `chapter-kana01.exercises.ts`.

— Subagent B, Round C1. No product files created/modified; only this report added.
