# TASK-HANASO-23 — CONTENT QUALITY REPORT (chapters 1 & 2)

> Consolidated from rounds C1+C2+C3 (34+22 stations, 475+82 exercises, 92/92
> teaching entries, 3,540 generated practice items — all verified twice).

## 1. The engine vs the content (the central verdict)

The **learning engine** is genuinely strong — prerequisite discipline (0
violations in 475 items, verified by 3 independent implementations), honest
estMinutes (406=406, 71=71, recomputed twice), milestone taught-only law
(browser-validated), spoiler fix, retry ladder, jargon-defined-on-first-use,
honest mnemonics labeling, excellent Persian-speaker phonetics coaching.
The **content layer** ships two systemic authoring defects + a cluster of
copy bugs: the 60-item two-correct family (13% of ch1's bank), the
14-turn-era ch2 numbering (~27 strings), and ~30 point defects. Root cause
(T1-C-09): no content-lint exists.

## 2. Per-chapter verdicts

### Chapter 1 (kana-foundation-01) — «acceptable with reservations»
- **What a Japanese master approves**: sequencing (46 hiragana → dakuten →
  handakuten → yōon → sokuon; then katakana + chōonpu + foreign-small) is
  correct and enforced; romaji is Hepburn-consistent; hostwords are real
  Japanese; pronFa coaching is unusually accurate (nasal assimilation,
  mora counting, unrounded /u/); mnemonics honestly labeled.
- **What fails review**: the katakana half's assessment is broken for
  ~13% of items (two-correct + the pick-the-katakana strategy answering
  97.7% of mixed items); ペ taught with the wrong diacritic (BUG-014); the
  h12 flagship pair is corrupted Japanese (Arabic ن — BUG-015); the
  e+い long-vowel pattern (the most frequent real pattern, in せんせい/
  がくせい — ch2's title word!) is never explicitly taught yet assessed;
  18 hostWord chips lie («قابل‌خواندن» on undecodable words — BUG-018);
  the gate (chapter climax) is a lottery (BUG-001) — **the chapter's
  promise «هر دو خط کانا را می‌خوانی» is not honestly measurable at the
  gate**.
- estMinutes honest; difficulty flat (82.9% d2) and optional drills
  monotonous (12-in-a-row recognition).

### Chapter 2 (first-meeting-01) — «good bones, stale skin»
- **What a Japanese master approves**: the dialogue is natural adult
  Japanese; all 5 grammar clusters are accurate; the Persian bridges
  genuinely teach (SOV, よろしく as taarof, いいえ as information-rejection);
  the anchor-comprehension checks honor EQA-1; 82/82 keys are correct at
  the single-answer level.
- **What fails review**: the entire learner-visible numbering is one
  epoch behind the 13-turn restructure (BUG-006 — including the chapter's
  canDo promise «۱۴ نوبتی» and the live player counter contradicting
  feedback on screen); the per-option rationale layer fails on 23 items
  (BUG-005) — in the mission's most sensitive area (wrong-answer
  explanation); one production item's accepted answer is a contradictory
  sentence (BUG-004) and the integrate station rewards an ungrammatical
  word order (BUG-017); dialogue-line audio is entirely disabled
  (BUG-008) despite 9 committed assets.

## 3. Difficulty & pacing

- estMinutes: honest to the minute (both chapters, recomputed twice).
- Ramp: ch1 difficulty is flat (d1 67 / d2 394 / d3 14); listening items
  are d2 while the same judgment is d3 in ch2. Optional stations run
  10–12 same-type items in a row.
- Information volume: rule stations fold silently into the wrap-up ledger
  (BUG-025) — a learner tracking «مجموع» sees numbers jump without cause.

## 4. Repetition & variety

- Deliberate warm-up recycling (EV-232) is real and structured (rotated
  keys) — a strength.
- Violations: 7 gate items recycle practice content verbatim (BUG-019);
  optional-drill clones are byte-identical (not key-rotated as claimed);
  the «(؟)» pre-marking makes listening minimal-pairs answerable without
  listening (BUG-021).

## 5. Practice module (/practice)

- Honest empty state, honest review line («هنوز فعال نیست»), honest
  labeling; sessions persist server-side; the answer key never reaches the
  client (learn surfaces).
- Content defects inside the generator: two-correct items (1.5–1.65%),
  K4 autoplay defeats the declared decoding construct, K5 omits the ー
  mora rule, a third romaji convention («ko-hi-») never taught, writing
  advertised but unreachable.

## 6. Examples: natural, childish, or artificial?

Natural and adult throughout (no childish content found — the only
blame-phrased feedback in 557 items is one k13 string). The artificial
cases are corruption, not tone: 「びょういن」 (Arabic ن), がくせいでは
ありません。がくせいです (contradiction), ちゅうごک (Persian ک inside
Japanese) — copy-hygiene, one lint away from impossible.

## 7. Leveling & prerequisite honesty

- Exercise surfaces: 0 out-of-prerequisite usages in 475 items (3
  independent verifications) — the glyph-budget machinery is real.
- Non-exercise surfaces are NOT covered by any gate: hostWord chips (18
  violations), teaching-block rationale (ん shown 3 units early),
  confusable chips naming future-unit glyphs (15 cards), the ch1→ch2
  boundary (ど, っ, え+い, sensee-romaji never taught in ch1 but used in
  ch2).

## 8. Final content verdicts (the mission's questions 1–6 — short form)

1. Acceptable to a Japanese master? **Yes for teaching content and
   sequencing; NO for assessment validity (ch1 katakana half + the gate)
   and the ch2 copy layer.**
2. Weakest items: the ch1 katakana recall/listening family (60 items) +
   the ch1 gate (Critical) + ch2's p2-c2-prod-1/g2-cloze-1 + the 23
   mis-keyed rationale items.
3. Examples repetitive/unnatural/level-mismatched? Hostword chips
   overclaim readability; two-correct items are level-mismatched by
   design; repetition is principled except the 7 gate recycles; no
   childish content.
4. Answers/feedback correct? Keys are flawless (0 wrong in 557); the
   DEFECTS are additional-valid answers + rationale/numbering copy
   layers.
5. Can a beginner understand their mistake? On the engine level yes
   (ladder, elimination, return-to-teaching); on the content level the
   rationale layer fails exactly where it matters most (23 ch2 items
   mis-keyed; 172/173 listening rationales valueless; the false «کانای
   دیگری با همین ردیف» on phonetically correct answers).
6. Biggest educational weaknesses: the gate (blocks ch2 for honest
   learners), the two-correct family (teaches false claims), the missing
   e+い rule, F1-reading leakage (spoils recognition items), the
   wrap-up/FSRS honesty gaps.
