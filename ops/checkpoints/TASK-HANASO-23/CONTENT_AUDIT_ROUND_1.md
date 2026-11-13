# TASK-HANASO-23 — CONTENT AUDIT ROUND 1 (merged from 3 independent subagent reports)

> Date: 2026-11-13 · Sources: `rounds/c1/A.md` (Japanese master/curriculum),
> `rounds/c1/B.md` (assessment/psychometrics), `rounds/c1/C.md` (learner
> experience/feedback). Each subagent audited independently; the lead merged
> and cross-compared. Full evidence lives in the three source reports.

## Method & coverage (all three, independent)

- Ch1: 34/34 stations block-level; 475/475 exercises machine-verified
  (A: prerequisite legality + answer keys; B: key/options/position
  mechanics; C: feedback templates) — Ch2: 22/22 stations, 82/82 exercises
  100% by all three. Dialogue YAML 13/13; registries 92/92. estMinutes
  recomputed by two agents independently (406/406, 71/71 — honest).

## Headline

The **engine** layers are genuinely strong (verified spoiler fix, retry
ladder, prerequisite discipline — 0 violations in 475 items, flawless
single-answer keys). The **content** layer carries two systemic authoring
defects and a cluster of copy bugs:

1. **Systemic**: 60/475 ch1 items (13% of the bank) have TWO correct
   answers under their script-agnostic prompts (hiragana twin of the
   katakana target among options) — graded wrong + false rationale.
2. **Systemic**: ch2 was restructured 14→13 dialogue turns; ~20
   learner-visible strings still cite the old numbering («۱۴ نوبتی» in the
   chapter canDo) — and, independently, ~21 ch2 items' per-option
   rationales are keyed to the wrong option ids, so the "why this choice
   is wrong" layer misfires or vanishes.
3. One ch2 production item's accepted answer is a semantically
   contradictory Japanese sentence — found independently by all three
   agents (highest-confidence finding of the round).

## Consolidated register (17 + 11 + 12 = 40 findings; dedup → 33)

### Critical — none (no data/security/breakage class in content)

### High (6 after dedup)

| ID(s) | Finding | Cross-confirmed? |
| --- | --- | --- |
| C1-B-01 | 60 items with two correct answers (19 recall + 41 listening/warm incl. gate-m5-1); per-station list in B.md; misleading rationale «کانای دیگری با همین ردیف» | B only (mechanical, scripted); C-08 independently confirms the gate-m5-1 instance |
| C1-B-02 | ex-fm01-g2-cloze-1: two blanks need different tokens (ですね/ですか), one 3-option list; engine fills every null with one label (exercise-session.tsx:705-709); key valid for blank 2 only | B only |
| C1-A-01 = C1-B-03 ⊂ C1-C-09.6 | ex-fm01-p2-c2-prod-1 builds «がくせいでは ありません。がくせいです。」 ("I'm not a student. I am a student.") | **3 agents independently** |
| C1-C-01 | ~21 ch2 items: distractorRationaleFa keyed to wrong option ids (o3 positional helper vs authored-as-a); rationale lands on wrong/correct option; picked option gets nothing | C only (B's positive-8 shows neighbors do it right — one-off pattern) |
| C1-A-06 = C1-C-02 | ch2 stale turn numbering: «۱۴ نوبتی» promise (index.ts:20), «نوبت‌های ۹–۱۴» (index.ts:71), ~20 «خط/نوبت N» strings off-by-one for lines ≥9; anchor lineRefs duplicate L(9), omit L(13) | **2 agents independently**, same ~20-string inventory |
| C1-A-05 = C1-C-03 | internal jargon/truncated text in 4 learner-visible objectiveFa (k1 ends mid-word «…انت»; CONTENT-107, spec §3, FEAT-158); rendered on journey map (section-journey.tsx:375) | **2 agents independently** |

### Medium (14 after dedup)

| ID(s) | Finding | Notes |
| --- | --- | --- |
| C1-A-02 | ペ taught as ヘ+゛ (dakuten) — must be ヘ+゜ (handakuten); contradicts own h15/k5 rules | A only |
| C1-A-03 = C1-C-11.3 | Arabic ن (U+0646) inside 「びょういン」「びよういン」 + » bracket in h12 flagship pair | 2 agents |
| C1-A-04 | ex-kana-kf-lis-1 (ファイル): hostword audio missing from manifest → listening item degrades to visual; trivially answerable without listening | A only (audio-territory note) |
| C1-A-07 | stn-fm01-18-integrate accepts ungrammatical order «わたしは、いいえ、イランじんです» (いいえ inside sentence after topic) | A only |
| C1-A-08 | 11 katakana hostwords labeled «واژهٔ قابل‌خواندن» before their glyphs/rules taught (ウェイトレス@K1 … コーヒー@K5); ッ never taught at all; no hostWord validation exists | A only; **no contradiction with B's 0-untaught scan** — B scanned exercise surfaces; A-08 is station-page hostword chips (see adjudication) |
| C1-B-04 | 4 gate items are verbatim dups of practice items (gate-m1-1↔h2-rec-ko; gate-m2-1↔h1-lis-e; gate-m2-2↔h12-lis-he; fm gate-m3-3↔g5-order-1) → gate measures memory of prior answers | B only |
| C1-B-05 | key-position bias inside stations (h13 b=11/14; h14 never c; k5 c=11/18; 6 fm anchor gist items all keyed a) — learnable giveaway | B only |
| C1-B-06 = C1-A-10 = C1-C-04 | all 92 recall items: f1Fa tail duplicated («— به شکل درست نگاه کن.» ×2) + cryptic f2 row hint («ردیفِ «ن»» for ん which has no row) | **3 agents independently** |
| C1-B-07 (+C-12.4) | listening minimal-pair distractors pre-marked «(؟)» = "not a word" → answerable without listening; かこく is actually a real word (過酷) | 2 agents (aspects) |
| C1-B-08 | 'sensei' marked wrong though standard romanization of せんせい (house convention sensee undocumented to learner) | B only |
| C1-C-05 | «سرنخ» hint button is a no-op (setHintRevealed only renders inside feedback; hint paragraph requires !feedback) — visible affordance that does nothing | C only |
| C1-C-06 = C1-A-09 | 4 wrap-ups falsely claim FSRS card registration (fsrsItems: [] — h0/k13/opt-r-h9/opt-drill); route.ts:501 enrolls nothing | **2 agents independently** |
| C1-C-07 = C1-A-11 | wrap-up «مجموع N واژه» ledger doesn't add up (h3 46 + h8 38 = 84 ≠ 163; silent rule-unlock deltas) | 2 agents; absolute totals unverifiable in-repo (HYPOTHESIS on the N5 source numbers) |
| C1-C-08 | gate-m5-1 unanswerable by sound (ン/ん both /n/; audio can't discriminate script) — 10%-weighted M5 gate item can gate-block an honest learner | C only; instance of B-01 family |
| C1-C-09 | 7 factual feedback errors (mora count せんせい=«دو مورا»; ル read as «لو» in ボールペン; はじめまて ×2; ちゅうごک + «قاطی نکن»; impossible «چیپ اضافه» state; F1 wrong-level opens with «درست!»; garbled prod prompt) | C only |

### Low (13 after dedup)

C1-A-12 (mixed-script typos: ちゅうごک، はじめまて، unclosed paren, romaji/Persian inconsistency in `reading` fields, ともだち «تُمُداتی») · C1-A-13 (きよう «این شکل واژه نیست» overclaim — it IS a rare word 器用) · C1-A-14 (がくせい glossed دانش‌آموز vs دانشجو across chapters; しゃ etymology «کار» → should be «شخص») · C1-A-15 (v1 positional hint «اولین واژهٔ خط ۳» wrong — わたし is mid-line) · C1-A-16 (え+い long-vowel pattern — the most frequent real pattern — never explicitly taught, yet assessed) · C1-A-17 (romaji convention differs ch1/ch2 — sensee vs Persian-script readings) · C1-B-09 (3 distractor-policy violations: «هه» for く; chuugokujin؟; گارسون for パソコン) · C1-B-10 (monotony: 12-in-a-row recognition in opt-r-h9; flat d2 difficulty ~90% of ch1) · C1-B-11 (Persian damma-ُ reads /u/ → o/u indistinguishable by sound in Persian transliteration — design observation) · C1-C-10 (173 listening items: rationale template explains SHAPES for a SOUND task — «فاقد ارزش آموزشی» on 172/173) · C1-C-11 (terminology drift: کانا/شکل/گلیف/نویسه never unified; 7 point strings incl. «کوچوئون‌پو», «کُنیچیوا», «ئه‌کون») · C1-C-12 (L1 canDo «روان می‌خواند» overpromise; h0 objective == title; k13-disc only blame-phrased feedback «اشتباه گرفتی») · A-16/A-17 partially overlap B-08's convention note.

## Cross-comparison & adjudication of contradictions

1. **A-08 vs B's "0 untaught-glyph usage"**: NOT a contradiction — B's
   mechanical scan covered exercise item surfaces (prompts/options/cloze);
   A-08 covers the station-page hostWord chips (kana cards), which no
   validation covers. Both stand; the gap is hostWord validation.
2. **B positive-2 (distractors excellent) vs C1-B-09 (3 violations)**: no
   contradiction — 3 outliers in a 533-item bank; B itself flagged them.
3. **C's grade «فاقد ارزش آموزشی» for 172 listening items vs B's
   "listening keys flawless"**: different layers — B verified keys,
   C graded rationale text. Both stand.
4. **A-11/C-07 totals**: CONFIRMED at the learner-facing inconsistency
   level; the absolute N5 counts stay HYPOTHESIS (dataset not in repo).
5. No agent contradicted another's CONFIRMED finding. 11 findings were
   independently discovered by ≥2 agents with matching evidence — these
   enter Round 3 verification with the highest confidence.

## Statistics

- Findings: 40 raw → 33 after dedup. Severity: High 6 · Medium 14 · Low 13.
  Critical 0. Status: 31 CONFIRMED, 2 with HYPOTHESIS sub-points (A-11
  totals, B-11 design note).
- Positive findings recorded: 8 (A) + 10 (B) + 10 (C) — engine strengths
  verified independently (spoiler fix, retry ladder, prerequisite
  discipline, key correctness, honest estMinutes, milestone honesty law).
- Feedback grading (C): Ch2 82 items — مناسب 42 / ساده‌سازی 9 / مبهم 24 /
  غلط 7. Ch1 475 — مناسب 208 / ساده‌سازی 92 / فاقد ارزش 172 / غلط 2 /
  مبهم 1.

## What Round C2 must hunt (lead's directive)

1. Items/feedback the 100% mechanical passes could still hide: B's checks
   were structural (keys/options) — hunt SEMANTIC two-correct cases (like
   B-08 sensei) in ch1 too; any wrong answer-key B missed is highest value.
2. The 60-item B-01 list: verify the count and hunt the same pattern in
   ch2 (romaji/sound collisions across scripts).
3. Untested surfaces: hostWord chips (A-08 class) in H-stations; audio
   manifest coverage for ALL listening items (A-04 class beyond ファイル);
   practice-module generated sessions (nobody audited generated item
   quality/feedback — only the registry); the two optional stations'
   content quality; kana-teaching.ts full prose (only 30/92 read).
4. Whether ch2's 13-turn restructure left any L(n) contentRef itself wrong
   (A-06 verified lineRefs correct — re-verify independently).
5. Anything the three reports claim as POSITIVE that is actually wrong
   (adversarial: attack the positives too — esp. "0 prerequisite
   violations" and "keys flawless").
