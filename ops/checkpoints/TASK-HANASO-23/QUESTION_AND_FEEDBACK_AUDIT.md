# TASK-HANASO-23 — QUESTION & FEEDBACK AUDIT (chapters 1 & 2)

> Consolidated from rounds C1-C (feedback grading), C2-C, C3-C + B (option
> mechanics). Every number below was re-derived at least twice.

## 1. Question validity (mechanics — all verified twice)

- 557 items (473 kana + 60 FM option-based): exactly 3 options everywhere;
  0 duplicate labels; 0 missing keys; 0 keys outside options; **0 wrong
  keys at the single-answer level** (verified by 3 independent agents).
- Key-position: authored bias exists (h13 b=11/14, h14 never c, 6 FM gist
  all-a) but the EQA-4 seeded shuffle serves uniform positions
  (184/182/167) — authored bias NEVER reaches the learner (runtime
  refutation of C1-B-05); residual local lumps only (k1 5/9/3).
- The real validity defects are SEMANTIC, not mechanical: 60 two-correct
  (BUG-002), 2 decode two-correct (BUG-009), 2 cloze structural (BUG-003),
  the gate audio (BUG-001), 7 gate recycles (BUG-019), 42
  key-is-longest-option giveaways (7.9%), «(؟)» pre-marking (BUG-021),
  'sensei' (BUG-022).

## 2. Distractor quality

- Confusable-first policy (documented pairs ソ/ン, フ/ワ, ユ/エ, ヌ/メ,
  タ/ナ) is applied and is excellent where applied; same-row siblings
  second; real error families third (dakuten/long-vowel/sokuon tashdid).
- Violations: 3 arbitrary distractors («هه» for く, chuugokujin؟, گارسون
  for パソコン) + 48 option-rationale labels call same-row siblings
  «جفت اشتباه‌پذیر» as if documented confusables (C3-B-N1 — 16× the
  original count under the finding's own rule).

## 3. Feedback quality — the graded distribution (C1-C, re-verified C3)

### Chapter 2 (82/82):
| Grade | Count | Dominant cause |
| --- | --- | --- |
| مناسب برای مبتدی | 42 | clean, adult, accurate |
| نیازمند ساده‌سازی | 9 | untaught Japanese inside Persian copy; «(؟)» labels; untaught transliteration |
| مبهم | 24 | 20 mis-keyed rationales (BUG-005) + 4 stale line refs |
| غلط | 7 | factual errors + the contradictory production item |

### Chapter 1 (475/475):
| Grade | Count | Items |
| --- | --- | --- |
| مناسب برای مبتدی | 208 | all recognition + 49/50 decode + 13/14 rule-listening + cloze/produce/meaning-select |
| نیازمند ساده‌سازی | 92 | ALL 92 recall items (doubled tail + cryptic f2 — BUG-020) |
| فاقد ارزش آموزشی | 172 | the kana-listening rationale family (shapes-for-a-sound — C1-C-10) |
| غلط | 2 | k8-asm-2 (ル read «لو»); gate-m5-1 (unanswerable by sound) |
| مبهم | 1 | h4-lis-1 (garbled f2) |

Correct-answer feedback: hardcoded «درست!» + answer card + pronunciation
auto-play — never wrong anywhere in 557 items (verified).

## 4. The wrong-answer learning loop (engine — all browser-verified)

- 3 attempts; server eliminates ONE wrong option at attempt 2 (never the
  key, never the learner's own pick when avoidable); «بازگشت به آموزش» on
  ladder exhaustion; wrong answers never auto-advance; predictions/
  guided discovery never punished (reveal regardless of correctness).
- Spoiler fix (H22) verified END-TO-END in the listening flow: a wrong
  answer never plays the correct audio (c3c-06a); the answer key never
  reaches the client on learn surfaces.
- REMAINING leaks: F1 recognition feedback text embeds the correct
  READING (10/10 — BUG-029); the «سرنخ» hint button is a no-op
  (BUG-023 — browser-verified); focus drops to body after every answer
  (BUG-038).

## 5. Hints & retry availability per item family

| Family | Hint at attempt 2 | Working «سرنخ» button | Retry |
| --- | --- | --- | --- |
| recognition (126) | yes (f2) | no (no-op) | yes ×2 |
| recall (92) | yes but cryptic («ردیفِ…») | no | yes |
| listening (173) | yes (f2) | no | yes |
| decode/meaning/cloze/produce | yes | no | yes |

## 6. Terminology & tone

- Four names for one thing (کانا/شکل/گلیف/نویسه) — never unified;
  «کوچوئون‌پو» transliteration; 7 mixed-script point strings; one
  blame-phrased feedback («اشتباه گرفتی» — the only one in 557 items);
  zero discouraging/blaming patterns otherwise; adult tone throughout.
- Jargon IS defined on first use in teaching blocks (だくてん H5, スクオン
  H13…) — but leaks into objectives (BUG-007) and fa.ts surfaces
  (developer-speak on learner paths).

## 7. Promise honesty scoreboard

| Promise | Verdict |
| --- | --- |
| estMinutes | HONEST (406=406, 71=71 — twice) |
| «۱۴ نوبتی» ch2 canDo | FALSE (13 turns) |
| «کارت‌های مرور فردا» at gate pass | FALSE (FSRS not-integrated; home honestly says به‌زودی) |
| «حداکثر سه حلقه در هر جلسه» | NOT IMPLEMENTED anywhere (counter is chapter-lifetime) |
| wrap-up FSRS claims (4 stations) | FALSE (fsrsItems=[]) |
| wrap-up word ledgers | INCONSISTENT (doesn't add up) |
| «ده پرسش» gate intro | FALSE (13/12) |
| L1 canDo «روان می‌خواند» | OVERPROMISE for one chapter |
| milestones «هیچ چیز تازه‌ای آموزش داده نمی‌شود» | TRUE (browser-validated) |
| achievements (max 3 chips) | TRUE (browser-validated) |

## 8. Final feedback verdicts (mission questions 4–5 — short form)

4. All answers/feedback correct & understandable? Keys flawless; the
   rationale/numbering layers fail where it hurts (23+92+172+7 items by
   grade); correct-answer feedback never wrong.
5. Can a beginner understand their mistake? Engine yes; content too often
   no — the mis-keyed rationales (ch2) and the valueless listening
   rationales (ch1) leave the learner told-WRONG without told-WHY; the
   two-correct family actively teaches a false claim about Japanese.
