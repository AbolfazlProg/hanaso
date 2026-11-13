# TASK-HANASO-23 · Round C1 · Subagent C — Learner-experience & feedback audit (Ch1+Ch2)

Auditor: Subagent C (learner feedback audit — beginner pedagogy, Persian UX, motivational design).
Scope: Ch1 `kana-foundation-01` + Ch2 `first-meeting-01` explanations, feedback, hints/retry, achievements, tone, promise-honesty. Research only — no code/content changes made.

## §1 Wrong-answer feedback — grade distribution

Grades per reviewed item, judged on the WORST defect in its feedback set (prompt/f1/f2/f3/distractorRationale).

**Chapter 2 (82/82 items = 100% read):**
| Grade | Count | Dominant cause |
| --- | --- | --- |
| مناسب برای مبتدی | 42 | clean, adult, accurate |
| نیازمند ساده‌سازی | 9 | untaught Japanese inside Persian copy («この…»), «(؟)» option labels, untaught transliteration «یوروشیکو» |
| مبهم | 24 | distractorRationale mis-keyed (20 items) + stale «خط/نوبت» line refs (4 items: gate-m2-2, l2-aud-1, e2-order-1, gate-m5-1) |
| غلط | 7 | ex-fm01-v1-p1-aud-2, v1-p3-match-1, g1-prod-1, l1-mp-1, l1-gist-1, l2-gist-1, p2-c2-prod-1 |

**Chapter 1 (475/475 items verified — see COVERAGE).** Exact type census: recognition 126, recall 92, decode 50, listening 173, rule-listening 14, cloze 6, produce 2, meaning-select 12.
| Grade | Count | Items |
| --- | --- | --- |
| مناسب برای مبتدی | 208 | all 126 recognition (incl. gates m1/m3/m4, optrev 12, optdrill 10) + 49/50 decode + 13/14 rule-listening + 6 cloze + 2 produce + 12 meaning-select (milestones) |
| نیازمند ساده‌سازی | 92 | ALL 92 recall items (doubled f1 tail + cryptic f2; C1-C-04) |
| فاقد ارزش آموزشی | 172 | the kana-listening family minus 1: rationale template explains SHAPES for a SOUND task and never names the kana (C1-C-10) |
| غلط | 2 | ex-kana-k8-asm-2 (f2 misreads ル as «لو»)؛ ex-kana-gate-m5-1 (unanswerable item, C1-C-08) |
| مبهم | 1 | ex-kana-h4-lis-1 (garbled f2 «سه ضربه = ای-ی-هِ نه، ای-ه») |

Ch1 gate items: 12/13 مناسب, 1 غلط (C1-C-08). Correct-answer feedback: hardcoded «درست!» (grading.ts:73) + answer card (correctReading) + pronunciation auto-play — never wrong; no case of incorrect correct-feedback found in either chapter.

## §2 Findings

### C1-C-01 — distractorRationaleFa keyed to the wrong option in Ch2  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: chapter-fm01.exercises.ts (`o3()` helper :19-34; affected items listed below)
- Problem: `o3(id, correct, wrong1, wrong2, correctAt)` maps ids a/b/c by POSITION, but ~21 items' `distractorRationaleFa` was authored assuming the correct option is always id `a` while placing it at index 1–2. grading.ts:96-97 serves `distractorRationaleFa[answer.optionId]`, so the rationale lands on the wrong option — including the CORRECT option — and the option the learner actually picked has no rationale.
- Affected (21): g1-cloze-1, v1-p3-match-1, p1-c2-cloze-1, v2-txt-1, g4-cloze-1, e1-resp-2, e2-resp-1, gate-m1-3, gate-m2-1, gate-m3-1, gate-m3-2, gate-m4-2, gate-m5-2, p1-c3-decode-1, p1-c3-decode-2, p2-c1-decode-1, v2-dec-2, p2-c3-cloze-2, or2-cloze-1, or2-cloze-2, od2-resp-1.
- Example (ex-fm01-v1-p3-match-1 :139): options a=かんこくじん, b=ちゅうごくじん, c=イランじん(correct); rationales `{b: 'かんこくじん در خط ۱۱ می‌آید…', c: 'ちゅうごくじん در خط ۵ و ۶ است، نه ۸.'}`. Learner picks a (かんこくじん) → rationale `a` missing → generic F1 only; picks b → sees the かんこくじん explanation for a choice they didn't make.
- Evidence: source read of o3 + all 21 items; grading.ts:96-97 (`ex.distractorRationaleFa?.[answer.optionId]`).
- Impact: the "why THIS choice is wrong" layer (TASK-HANASO-20 BUG-007) silently disappears or misexplains — in the mission's most sensitive area.
- Suggested fix: re-key the 21 rationale maps to the actual option ids (or drop the o3 positional helper and author options inline).
- Regression test: unit test asserting for every exercise with options: for each non-correct option id, `distractorRationaleFa[id]` exists and references that option's label/reading.

### C1-C-02 — Ch2 learner copy uses stale pre-restructure dialogue numbering («۱۴ نوبتی», «خط/نوبت» off-by-one)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: index.ts:20, 71; chapter-fm01.stations.ts:31, 522, 616; chapter-fm01.exercises.ts (:96, 853, 1017, 1069, 1141, 1541, 1641, 1750, 1799 + others); dialogue.first-meeting-01.yaml:4-13
- Problem: the dialogue was restructured to 13 turns ("12 single-speaker + 1 JOINT", YAML header; "interim 14-line graft … REMOVED"), but Ch2 copy still promises a 14-turn conversation and cites line numbers from the old 14-line layout. Content refs (`L(n)`) were updated; human-facing numbers were not.
- Actual: `canDoFa` promises «کل مکالمهٔ ۱۴ نوبتی را بفهمی» (index.ts:20) — the dialogue has 13 lines; unit 02-2 is titled «نوبت‌های ۹–۱۴» (index.ts:71) — should be ۹–۱۳. Feedback/prompts cite «خط/نوبت N» = ref+1 for unit-2 lines: e.g. ex-fm01-l2-gist-1 says «(خط ۱۳)» for `L(12)` (Kim's intro); e2-resp-1 f2 «خط ۱۱ سورا» for `L(10)`; gate-m4-2 «(خط ۱۰)» for `L(9)`; stn-fm01-12 discovery «جملهٔ نوبت ۶ را با نوبت ۱۰ مقایسه کن» for display L(9). Unit-1 refs (نوبت ۸=L8, خط ۶=L6, خط ۵=L5, خط ۳=L3) are correct — confirming the pre-restructure offset. Duplicate `L(9)` refs in stations (:35, :497, :528) are residue of the same renumber.
- Evidence: full read of dialogue YAML (13 lines) + all Ch2 station/exercise copy; no player UI displays line numbers, so the learner must count the transcript and finds the feedback pointing one line off.
- Impact: «۱۴ نوبتی» is a false promise in the chapter's headline canDo; every «خط/نوبت» hint in unit 2 sends the learner to the wrong line.
- Suggested fix: sweep Ch2 copy: ۱۴→۱۳ (4 places), ۹–۱۴→۹–۱۳, and subtract 1 from every «خط/نوبت» number ≥۹; dedupe L(9) refs.
- Regression test: content lint that parses «خط/نوبت N» in copy and asserts `L(N) === lineRef` and `N ≤ 13`.

### C1-C-03 — Internal design jargon leaked into learner-visible station objectives  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: chapter-kana01.stations.ts:2381-2382 (k1), :3736 (k12), :4109 (opt-r-h9), :4166 (opt-drill); rendered at section-journey.tsx:375
- Problem: `objectiveFa` (shown on the journey map under each station) contains internal spec language:
  - k1: «قاعدهٔ صادق فاز K: همان ۴۶ صدا، صورت دوم — وام‌واژه‌های آماده به‌عنوان اشتها (الگوی H0)؛ اولین بازگشایی واقعی در K2؛ انت» — truncated mid-word («انت»), design-speak («طرحوارهٔ قرینه‌گری» is in the titleFa too).
  - k12: «…با روماجی روشن (استثنای CONTENT-107)» — internal content-policy id.
  - opt-r-h9: «شاخهٔ اختیاری از H9 — آویخته، هرگز گیت نمی‌شود (spec §3)».
  - opt-drill: «FEAT-158 — تمرین بازشناسی با فیلتر ردیف/خط…» — internal ticket id as the objective.
- Evidence: source read + section-journey.tsx:375 renders `row.objectiveFa`.
- Impact: an absolute beginner reads meaningless English/code ids in place of a learning goal on the main journey screen.
- Suggested fix: rewrite 4 objectivesFa in plain learner Persian; add a lint forbidding `[A-Z]{2,}-\d+`, «spec», «CONTENT-», «FEAT-» in any *Fa field.
- Regression test: content lint regex over all learner-facing *Fa strings.

### C1-C-04 — Ch1 recall template: doubled f1 tail + cryptic row hint (92/92 items)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts — every `kana-recall` item (92; rg count 'نگاه کن. — به شکل درست نگاه کن.' = 92)
- Problem: f1Fa of every recall item duplicates its own tail: «کانای «آ» این نیست — به شکل درست نگاه کن. — به شکل درست نگاه کن.» (e.g. :160, :183, :206…). The f2HintFa is a filler phrase: «روی همین خط از ردیفِ «آ» هست؛ جفت اشتباه‌پذیرش را حذف کن.» — «روی همین خط از ردیف…» has no referent the learner can use (which line? which row chart?). For ん items it invents a «ردیفِ «ن»» (:1070) though ん has no row.
- Evidence: rg counts (92/92/92) + manual reads of h1/h2/h3/h7 recall sets.
- Impact: visible copy bug on EVERY wrong recall answer in chapter 1 (~most-answered exercise family); hint adds confusion, not help.
- Suggested fix: f1 = «کانای «آ» این نیست — به کارت ردیف あ برگرد و دو جفت اشتباه‌پذیر را مقایسه کن.»; f2 = name the row glyph + the confusable pair.
- Regression test: generator snapshot asserting f1 contains no duplicated sentence tail.

### C1-C-05 — «سرنخ» hint button is a no-op  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: exercise-session.tsx:947-956 (Lightbulb link `onClick={() => setHintRevealed(true)}`) and :1009 (`{hintRevealed && !feedback && <p>{fa.curriculum.showHint}…</p>`)
- Problem: the «سرنخ» (fa.ts:374) link only renders inside the feedback panel (feedback non-null); the paragraph that would show the hint requires `!feedback` — so it can never appear while the button exists. Clicking does nothing; after «تلاش دوباره» (feedback cleared, hintRevealed still true) a stray label «سرنخ…» appears under the exercise — the button label, not a hint.
- Expected: clicking reveals an actual hint (e.g. the item's f2HintFa) or the control is removed.
- Evidence: code-path read; the real hint arrives only automatically at attempt 2 (grading.ts:75-76).
- Impact: a visible affordance that does nothing — erodes trust; learner may believe hints are broken.
- Suggested fix: on click, render the item's `f2HintFa` inside the panel; clear hintRevealed in `retry()`.
- Regression test: component test — click «سرنخ» → expect hint text in the live region.

### C1-C-06 — False FSRS-registration claims in 4 wrap-ups  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.stations.ts:44 (h0), k13 wrapup (~:4087), opt-r-h9 wrapup (~:4130), opt-drill wrapup (~:4184)
- Problem: these stations' wrap-ups claim «کارت‌های مرور (FSRS) برای همین کاناها ثبت شدند — صف مرور روزانه به‌زودی فعال می‌شود.» but their `fsrsItems: []` — route.ts:501 only enrolls cards `if (station.fsrsItems.length > 0)`. h0 teaches NO kana at all («همین کاناها» has no referent); k13/opt stations teach no new cards either.
- Evidence: source read of the 4 stations + route.ts:501-512; cross-checked true-claim stations (h1 `fsrsItems` 5 entries = claim true; ch2 vocab wrap «۱۶ کارت» = 16 fsrsItems ✓ true).
- Impact: end-of-lesson achievement copy asserts something that did not happen — the exact "honesty" class this mission polices.
- Suggested fix: template the FSRS line only when `fsrsItems.length > 0`.
- Regression test: content lint: wrap-up containing «کارت‌های مرور» ⇒ station.fsrsItems.length > 0.

### C1-C-07 — Wrap-up word-count claims don't add up  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.stations.ts wrap-ups — h1 :190 (7→7), h2 :327 (16→23), h3 :465 (23→46), h8 :1236 (38→163), h9 :1373 (104→267), h10 :1520 (66→333), h11 :1686 (103→436), h12 :1873 (102→538), h14 :2127 (51→606), k2 :2580 (3→638) … k12 :3829 (5→721)
- Problem: the running «مجموع N واژه از جزوهٔ N5» is internally inconsistent as a learner-visible progress ledger: h3 total 46 + h8's own claimed 38 new = 84 ≠ 163 (a silent +79); h12 total 538 + h14's claimed 51 = 589 ≠ 606 (+17 silent); h4–h7 and h13 make no claim at all while the total still advances. The per-station «N واژهٔ واقعی تازه خواندنی شد» is also unverifiable from station content (h3 shows 10 real words but claims 23 new).
- Evidence: arithmetic on the 20 wrap-up lines (all read); no N5 deck cross-check possible in-repo (HYPOTHESIS on the underlying generator numbers, CONFIRMED on the learner-facing inconsistency).
- Impact: a learner tracking «مجموع» sees numbers jump without cause — reads as fabrication.
- Suggested fix: derive the wrap-up counters from one computed source (words readable with introduced units) and print per-station delta = total delta; or drop the running total and keep only "newly readable this lesson".
- Regression test: content test asserting total_after == total_before + claimed_new for every station sequence.

### C1-C-08 — Gate item ex-kana-gate-m5-1 is unanswerable by sound  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts:9685-9707 (targetConcept hira-n)
- Problem: prompt «به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟» with options a=ン (katakana n), b=ん (hiragana n, correct), c=あ. Both ん and ン represent /n/ — the audio (kn-hira-n) cannot discriminate script. A learner picking ン is marked wrong with rationale «کانای دیگری با همین ردیف.» (ン is not in "another row" and DOES have this sound).
- Evidence: item read; kana-listening items are sound→glyph (isCorrect by optionId, grading.ts:117-120).
- Impact: a 10%-weighted M5 gate item punishes a phonetically correct answer — gate is weighted ≥0.9/min 0.8 (levels.ts:35), so one such item can gate-block an honest learner.
- Suggested fix: replace the ン distractor with a different-sound kana (e.g. あ/め), or make the item script-recognition (visual).
- Regression test: content test: for every kana-listening item, no two options share the target's sound.

### C1-C-09 — Factual feedback errors (grouped)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location/Actual (each verified by source read):
  1. ex-fm01-l1-mp-1 (ch2 :515) f2 «دو مورا: せ+んせ+い» — せんせい is 4 morae; grouping wrong. (Sibling items say «چهار مورا» correctly.)
  2. ex-kana-k8-asm-1 sibling ex-kana-k8-asm-2 (:10725) f2 «بوو-رِن؟ نه: بوو-لو-پِ-ن.» — misreads ル as «لو»; ボールペン = «بوو-رُ-پِ-ن».
  3. ex-fm01-l1-gist-1 (:471) and ex-fm01-l2-gist-1 (:1083) hints «کلمهٔ はじめまて…» — misspells はじめまして (missing し).
  4. ex-fm01-v1-p1-aud-2 (:74) f1 «…にほん را با ちゅうごک قاطی نکن» — typo ちゅうごک (should ちゅうごく) + very colloquial «قاطی نکن».
  5. ex-fm01-g1-prod-1 (:221) f1 «یک چیپ اضافه داری» — item has exactly 3 required chips; no extra-chip state is possible (build UI sends chips verbatim), so the F1 describes an impossible error.
  6. ex-fm01-v1-p3-match-1 (:147) f1 «درست! نوبت ۸ دربارهٔ علی است…» — F1 (wrong-answer level) opens with praise «درست!».
  7. ex-fm01-p2-c2-prod-1 (:1231-1243) — prompt garbled («…がくせい‌های مدرسه را با خودت عوض نکن») and the chips build a semantic contradiction (「がくせいでは ありません。がくせいです」 = "not a student. is a student" with the SAME word twice); f3 «الگوی نفی: AはBでは ありません» never gives the answer.
- Suggested fix: 7 point edits; add a review pass for Japanese spellings inside Persian feedback.
- Regression test: content lint on f2/f3: Japanese tokens in *Fa fields must exist in the taught-glyph registry.

### C1-C-10 — Listening-item rationale template explains SHAPES for a SOUND task  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts — all 173 `kana-listening` items (lis + warm, all stations + gates)
- Problem: the distractor rationales are the recognition/recall pool: «جفت اشتباه‌پذیر — به تفاوت شکل دقت کن.» / «کانای دیگری با همین ردیف.» For a sound→glyph item the discriminant is the SOUND; telling the learner who picked お over あ to «به تفاوت شکل دقت کن» is noise, and «کانای دیگری با همین ردیف» never says what sound the picked option HAS. f3 «این صدا مال کانای نشان‌داده‌شده در پاسخ است…» never names the kana either.
- Evidence: template verification script over all 173 items (172 exact-template + 1 variant kf-warm-1 read manually) + manual reads (h1-lis ×5, h2-warm/lis, h8-lis ×5).
- Impact: the rationale layer adds no learning value on every wrong listening answer in chapter 1 (the F1/F2 ladder still functions).
- Suggested fix: listening-specific rationale: ««お» صدای «اُ» است؛ شنیده‌شده «آ» بود.» and f3 naming the kana.
- Regression test: content test: kana-listening rationale must contain the picked option's sound label.

### C1-C-11 — Terminology drift & mixed-script glitches (Low, grouped)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: across content; each verified by read/grep.
- Actual: (1) four names for a kana character — «کانا» (dominant), «شکل» (measureLabels, summaryFa), «گلیف» (stations.ts:684/726/2184, exercises.ts:10784, fa.ts:39), «نویسه» (h6:865, h13:2006, h7:979) — never unified or defined. (2) «کوچوئون‌پو» (k8 title/objective :3224) — odd transliteration of chōonpu (expected «چوئون‌پو»); the term itself IS taught in K8. (3) Mixed-script: stn-kana-h12 ask/reveal (:1807, :1814) write 「びょういン»/「びよういン» with Persian «ن» inside Japanese words (twice). (4) k13 scene reading «کُنیچیوا» for こんにちは (drops the geminate nn). (5) k7 エアコン reading «ئه‌کون» (:3178) drops a mora (should ~«اِئاکون»). (6) k6 prereq パ note «در ジャパン (پْا)» (:3033) garbled. (7) h4-lis-1 f2 «سه ضربه = ای-ی-هِ نه، ای-ه» (:9746) garbled contrast.
- Suggested fix: pick «کانا» as the term; fix 7 point strings.
- Regression test: lint — Japanese-quoted tokens must match `/[\u3040-\u30ff]/` only (no Persian letters inside 「…»); single-term policy for 'glyph'.

### C1-C-12 — Minor promise/tone items  [SEVERITY: Low] [STATUS: CONFIRMED]
- (1) levels.ts:18 L1 canDoFa «هر دو خط کانا را روان می‌خواند» — "fluently" overpromises one chapter (gate is recognition 0.9); chapter-level canDo (chapter-kana01.ts:87) is accurate.
- (2) h0 objectiveFa == titleFa («خوش‌آمد و سه خط ژاپنی» :17-18) — carries zero information; m1/m2 objectives are excellent by contrast.
- (3) k13-disc f1 ««ひ» را با شکل قرینه‌اش اشتباه گرفتی.» (:4979+) — the only second-person blame phrasing in the bank («اشتباه گرفتی»); everything else is neutral/friendly. No «اشتباه بود! دقت کن»-style discouragement found anywhere (grep across content).
- (4) Ch2 «(؟)» option labels ('せんせ (؟)', 'ちゅうご (؟)', 'chuugokujin؟') — unexplained placeholder meaning "not a word"; never taught.
- Suggested fix: 4 point edits.

## §3 Positive findings (verified)

1. **TASK-HANASO-22 spoiler fix holds** — route.ts:263 `revealAnswer = outcome.correct || outcome.level >= 3`; F1/F2 misses ship statement/hint only (route.ts:264-265 comment); answer key never reaches the client (`toClientExercise` grading.ts:344-359 strips correctOptionId/feedback/rationale). No cross-item spoilers found either (checked all ch2 F1/F3 + rationals).
2. **Retry design is genuinely learner-first** — 3 attempts (route zod :56), «تلاش دوباره» (exercise-session.tsx:972-980), server eliminates ONE wrong option at attempt 2 (grading.ts:82-88, never the key, never the learner's own pick when avoidable), «بازگشت به آموزش» on ladder exhaustion (:944-946). Wrong answers never auto-advance (owner rule, :444).
3. **Predictions/guided-discovery never punish** — route.ts:345-361 returns the reveal regardless of correctness ("pretesting guesses are never punished").
4. **Honest achievements** — station-runner.tsx:246-265 `lessonAchievementsOf`: max 3 chips, labels only «آشنا شدی / …تمرین…کردی», no mastery claims; rendered at :1176-1186.
5. **estMinutes is exactly honest** — Ch1: Σ station estMinutes = 406 = chapter estMinutes 406; Ch2: 71 = 71 (node-computed). levels.ts:55-62 documents the fixed dishonest 45' cap (TASK-HANASO-21).
6. **Milestone honesty** — all 12 m1/m2 words are registered hostwords (kana-items.ts grep: すし:214, ねこ:417, ドア:812, エアコン:849…); scene copy states «هیچ چیز تازه‌ای آموزش داده نمی‌شود» and the items honor it.
7. **Jargon defined on first use** — داکوتن (H5 rule :708-710), سوکوئون (H13 :1945-1947), هان‌داکوتن (H15 :2207-2209), チョーン‌پو (K8 :3283-3285), مورا introduced H4 with honesty label «شمارش ضربه = مدل آموزشی ساده‌شدهٔ مورا» (:629). Nothing used before taught.
8. **kana-teaching.ts is exemplary learner copy** — Persian-speaker pronunciation pitfalls («اُوی ژاپنی با لب‌های گردِ شل»), mnemonics honestly labeled «داستانِ یادسپار» (a mnemonic is called a mnemonic), pairHintFa discrimination cues per glyph.
9. **Persian bridges that actually teach** — SOV bridge (stn-fm01-04: «فارسی هم می‌گوید «(من) رفتم» بدون «من»»), から particle-position bridge, with honesty labels on unproven claims («پیش‌بینی ماست، نه اثبات‌شده» stn-fm01-04 honestyLabelFa).
10. **Hand-authored derived exercises are the best feedback in the product** — e.g. ex-kana-h5-asm-4 rationale «「かき» یعنی خرمالو — بدون ゛.» (:10060), ex-kana-m2-word-aircon f2 «کوتاه‌شدهٔ air conditioner؛ تابستانِ توکیو بدون آن نمی‌شود!» (:11063) — accurate, warm, adult.

## §4 Coverage (exact counts)

**Ch1 stations: 34/34 read** (100%): h0–h15, m1, k1–k13, k12-foreign, m2, opt-r-h9, opt-drill — all 4201 lines of chapter-kana01.stations.ts read (h0, milestones, all rule stations and both optionals fully; kana-row stations fully).
**Ch1 exercises: 475/475 feedback-verified** —
- manual full reads: h1 (15), h2 (18), h3 (18), h8-lis (5), optrev 6 + optdrill 2 bodies, all derived items (decode 50: dec 21 + ind 2 + asm 22 + nas 2 + gate-m3 3; cloze 6; produce 2; rule-listening 14; disc 6), gates m2 (3) + m5 (2) + m3 (3) manual, milestones m1 (6) + m2 (6);
- exhaustive template-verification (script printed every item's f1/f2/f3): all 126 recognition items (incl. gates m1/m4, optrev 12, optdrill 10), all 92 recall items (rg: 92/92 doubled-tail), all 173 kana-listening items (172 exact + 1 variant read).
**Ch1 stations 100% rule**: h0 (no exercises), m1, m2, listening sets — covered; every station's rec/rcl/lis/warm verified ⇒ per-station coverage is 100%, not just ≥40%.
**Ch2: 82/82 exercises (100%)**, 22/22 stations (1185/1185 lines), 11 words + 8 expressions + 5 grammar clusters read; dialogue YAML (13 lines) read in full; kana-teaching.ts sampled (≈30 entries) + kana-items.ts hostword greps.
**UI code paths read**: exercise-session.tsx (1135/1135), grading.ts (359/359), api/curriculum/station/route.ts (570/570), station-runner.tsx targeted (achievements/completion/vocab-card/blocks :235-414, 1130-1199, 1560-1679, 2136+), anchor-dialogue-experience.tsx (190/190), fa.ts feedback strings, levels.ts (170/170), section-journey objectiveFa rendering.

Verification methods: source reading (primary), cross-reference greps + node scripts (template checks, estMinutes sums, hostword registry), arithmetic checks on wrap-up counters. No server/prod side effects needed.

## §5 Verdict

The feedback ENGINE is excellent (ladder, elimination, return-to-teaching, spoiler fix — all verified holding). The feedback CONTENT has two systematic authoring defects that hit the most sensitive surface: Ch2's per-option rationales are mis-keyed (~21 items) and its dialogue line numbering is stale after the 13-turn restructure; Ch1's generated recall/listening templates carry a 92-item copy bug and shape-based rationales on sound tasks. Promise-honesty is strong on time and milestones, weak on wrap-up counters and 4 false FSRS claims. No blockers for Round 2.
