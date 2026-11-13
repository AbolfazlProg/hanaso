# C1-A — Scientific/linguistic & curriculum audit — Chapters 1 (kana-foundation-01) + 2 (first-meeting-01)

Auditor: Subagent A (Japanese-language master / curriculum auditor, RESEARCHER role — no code changes).
Method: full source read of the station spines + scripted cross-checks (§5.2). A Python pass parsed
all 92 registry glyphs and all 475 chapter-1 exercises, verifying (a) correct-answer↔romaji mappings
for every recognition/recall/listening item, and (b) prerequisite legality of every Japanese surface
(promptJa, cloze tokens, option labels) against cumulative glyph budgets incl. rule marks
(dakuten H5, handakuten H15, yōon H6/K6, sokuon H13, chōonpu K8, foreign-small KF). Chapter 2 was
read 100% by hand. Both dialogue YAMLs read line-by-line.

**Headline:** prerequisite discipline in chapter 1 is genuinely excellent (0 true violations found in
475 exercises + all station blocks), but chapter 2 carries a systemic stale-turn-number defect from
its 13-turn restructure, one production exercise builds a contradictory Japanese sentence, and a few
chapter-1 copy bugs teach or show wrong details (ペ diacritic, Arabic ن inside Japanese words,
"readable" hostword labels that are not yet readable).

---

### C1-A-01 — Production exercise builds a contradictory Japanese sentence  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `apps/web/src/modules/curriculum/content/chapter-fm01.exercises.ts:1225-1246` (ex-fm01-p2-c2-prod-1, station stn-fm01-17-practice)
- Problem: the model answer is «がくせいでは ありません。がくせいです。」 — "I am not a student. I am a student." The same word がくせい is used as both the negated and the asserted predicate.
- Expected: a contrast pair with two different words (like the grammar station's own example わたしは せんせいでは ありません。がくせいです。, blk-g4-ex-2).
- Actual (verbatim): prompt «بساز: «[من] دانشجو نیستم. دانش‌آموز هستم.» (がくせい=دانشجو · がくせی‌های مدرسه را با خودت عوض نکن — همین الگو را بساز)»; chips `がくせいでは / ありません / がくせいです`.
- Evidence: source read; chips + acceptedChipOrder ['x1','x2','x3'] produce the contradictory sentence; prompt also contains the typo «がくせی» (Persian ی) and garbled instructions.
- Learner impact: the culminating practice of unit 2 rehearses a semantically absurd Japanese sentence and confuses دانشجو/دانش‌آموز as if both were がくせい.
- Suggested fix: replace chips with せんせいでは/ありません/がくせいです (mirroring g4-ex-2) and rewrite the prompt.
- Regression test: content lint — a produce-template whose accepted order yields «Bでは ありません。Bです» with identical B must fail.

### C1-A-02 — ペ described with the wrong diacritic (dakuten instead of handakuten)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts:3253` (stn-kana-k8 prereq block blk-stn-kana-k8-prereq)
- Problem: ペ (pe) is explained as ヘ+゛ (two strokes = "b" family), but ペ is ヘ+゜ (circle = "p").
- Actual (verbatim): `{ glyph: 'ペ', readingFa: 'پِ', noteFa: 'ヘ+゛ — در ボールペン.' }`
- Evidence: source read; contradicts the product's own h15 rule (ば=゛ / ぱ=゜) and k5's katakana handakuten prereq (ピ=ヒ+゜).
- Learner impact: at k8 the learner is told the circle-p sound is written with the b-mark — directly undoes the h15/k5 ba/pa distinction; ボールペン is also the k8 reading example.
- Suggested fix: change note to «ヘ+゜ — در ボールペン».
- Regression test: lint — derived-glyph notes must match the diacritic in the glyph's NFD decomposition.

### C1-A-03 — Arabic letter ن (U+0646) inside Japanese words in h12  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts:1807,1814` (blk-stn-kana-h12-step-byouin ask/reveal)
- Problem: the hospital/salon minimal pair is corrupted: 「びょういن」 and 「びよういن」 use ARABIC LETTER NOON (U+0646) instead of ん (U+3093), and close with » (U+00BB) instead of 」.
- Actual (verbatim): `'آرایشگاه! 「びょういن» (ょ کوچک) بیمارستان است و 「びよういن» (よ بزرگ) آرایشگاه…'`
- Evidence: codepoint dump: 0x646 ARABIC LETTER NOON inside the string.
- Learner impact: the flagship ょ/よ size-contrast example renders as broken Japanese; copy-paste/search of the "word" yields garbage.
- Suggested fix: replace U+0646→ん and »→」 in both strings; add a content lint forbidding Arabic/Persian codepoints (U+0600–U+06FF) inside `ja`-language fields except within Persian gloss markers.
- Regression test: codepoint-range lint on all `patternJa`/`ja`/`revealFa` strings.

### C1-A-04 — Listening exercise whose question audio does not exist (ファイル)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-kana01.exercises.ts` (ex-kana-kf-lis-1, station stn-kana-k12-foreign); `public/audio/hostwords/manifest.json`
- Problem: the rule-listening question plays hostWordAudioUrls('ファイル'), but ファイル is absent from the hostwords manifest (checked all 153 entries); the client degrades to visual-only, and visually the small ァ uniquely marks the correct option — the auditory discrimination goal (ファ vs フア) is lost and the item is trivially answerable without listening.
- Evidence: manifest key check — missing list includes ファイル; the other 13 rule-listening words (いえ/いいえ/ここ/ごご/きょう/いしゃ/せんせい/がっこう/ざっし/さんぽ/えんぴつ/コーヒー/ジュース) are all present.
- Learner impact: the only listening item of the foreign-combination station cannot test listening.
- Suggested fix: generate the ファイル VOICEVOX asset (and フアイル distractor would be ideal), or swap the item to a word with an existing asset.
- Regression test: build-time check — every rule-listening `promptJa` must exist in the hostwords audio manifest.

### C1-A-05 — Internal jargon / truncated text in learner-facing station objectives  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts:2382` (stn-kana-k1), `:3742` (stn-kana-k12), `:4110` (stn-kana-opt-r-h9), `:4152` (stn-kana-opt-drill)
- Problem: objectiveFa renders on the journey rows and station pages (section-journey.tsx:375, station page:235), but four objectives are internal planning notes; k1's is additionally truncated mid-word.
- Actual (verbatim): k1 `«…(الگوی H0)؛ اولین بازگشایی واقعی در K2؛ انت`» (ends mid-word); k12 `«…با روماجی روشن (استثنای CONTENT-107)»`; opt-r-h9 `«شاخهٔ اختیاری از H9 — آویخته، هرگز گیت نمی‌شود (spec §3)»`; opt-drill `«FEAT-158 — تمرین بازشناسی با فیلتر ردیف/خط…»`
- Learner impact: unprofessional/confusing copy in the chapter overview for every learner.
- Suggested fix: author learner-facing objectives for these four stations (drop CONTENT-107/spec §3/FEAT-158/H0/K2 references; complete the k1 sentence).
- Regression test: content lint — objectiveFa must not match /CONTENT-|FEAT-|spec §|فاز K|H\d\/K\d/ and must not end mid-word (e.g. ends with a complete word + sentence-final punctuation or none).

### C1-A-06 — Chapter 2 systemic stale turn numbers (14-turn era) after the 13-turn restructure  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-fm01.stations.ts`, `chapter-fm01.items.ts`, `index.ts`, `chapter-fm01.exercises.ts` (≈20 learner-visible strings)
- Problem: the dialogue was restructured to 13 lines (YAML header: "12 single-speaker turns + 1 JOINT = 13", the invented Kim entry line removed), but prose still cites the old +1 numbering for every line after L9. The `lineRef` fields are correct — only the human-readable numbers are wrong.
- Actual (verbatim samples): canDoFa «کل مکالمهٔ ۱۴ نوبتی را بفهمی» (index.ts:20); a2 objectiveFa «نوبت‌های ۹–۱۴» (stations:522); unit-02-2 title «نوبت‌های ۹–۱۴» (index.ts:71); g3 discovery «جملهٔ نوبت ۶ را با نوبت ۱۰ مقایسه کن» (mo-question is L9); g4-ex-1 whyFa «از مکالمه (خط ۱۱)» (negation is L10); g5-ex-1 «از مکالمه (خط ۱۳)» (Kim intro is L12); chrk-yoroshiku replyFa «در L9 هر دو با هم می‌گویند» (joint line is L13); ex-fm01-v1-p3-match-1 «かんこくじん در خط ۱۱ می‌آید»; ex-fm01-e2-resp-1 «خط ۱۱ سورا»; ex-fm01-e2-order-1 «(خط ۱۲)»; ex-fm01-l2-gist-1 «گوش بده (خط ۱۳)»; ex-fm01-l2-who-1 f2/f3 «خط ۱۳»/«خط ۱۱»; ex-fm01-l2-aud-1 «گوش بده (خط ۱۰)» (is L9); gate-m1-1 «در نوبت ۱۰، も…»; gate-m2-2 «(خط ۱۱)»; gate-m3-2 f2 «خط ۱۱»; gate-m3-3 f2 «خط ۱۳»; gate-m4-2 «(خط ۱۰)»+«خط ۱۳»; gate-m5-1 «خط ۱۱»+«خط ۱۳»; gate-m5-2 «(خط ۱۲)»+«(خط ۱۳)»; ex-fm01-p2-c3-order-1 «(خط ۱۳)».
- Additionally the two anchor stations' lineRefs duplicate L(9) and omit L(13): `[L(1)…L(8), L(9), L(9), L(10), L(11), L(12)]` (stations:35,526) — the joint よろしく line is never in a focus list.
- Evidence: dialogue YAML has exactly 13 lines; every stale citation is +1 for lines ≥9.
- Learner impact: learners following «به خط ۱۳ نگاه کن» land on the wrong line; the chapter promise "۱۴ نوبتی" is factually wrong in the chapter canDo statement.
- Suggested fix: one sed-style pass over ch2 prose (۱۴→۱۳, and decrement cited numbers ≥10), fix the two anchor lineRefs (drop the dup L9, add L13), and retitle unit-02-2 «نوبت‌های ۹–۱۳».
- Regression test: content lint — every Persian digit N in «خط N/نوبت N» must equal the numeric part of the item's lineRef.

### C1-A-07 — Integrate station accepts an ungrammatical word order as correct  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-fm01.stations.ts:950-953` (blk-i2-scene userReply, station stn-fm01-18-integrate)
- Problem: acceptedOrders includes `['i2c2','i2c1','i2c3','i2c4','i2c5']` = «わたしは、いいえ、イランじんです。» — いいえ cannot follow the topic inside the sentence; the natural order いいえ、わたしは… is the other accepted order.
- Evidence: source read of acceptedOrders.
- Learner impact: the chapter's culminating production task rewards a wrong Japanese order.
- Suggested fix: keep only `['i2c1','i2c2','i2c3','i2c4','i2c5']`.
- Regression test: linguistic review gate on all template-build acceptedOrders (more than one accepted order needs a native-checker note).

### C1-A-08 — Katakana hostwords labeled «واژهٔ قابل‌خواندن» before their glyphs/rules are taught  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: registry `kana-items.ts` (hostWord fields) × UI label `messages/fa.ts:258` «واژهٔ قابل‌خواندن» on kana cards; no decodability validation exists (grep: validation.ts/glyph-budget.ts never check hostWord).
- Problem: 11 katakana anchor words are shown as "readable words" at a station where the learner cannot decode them: kata-u ウェイトレス@K1 (needs ェ KF, ト K2, レ K3, ス K4), kata-i ドイツ@K1 (ド/ツ K2), kata-o ラジオ@K1 (ラ K3, ジ K4), kata-e エアコン@K1 (ン K6, コ K7), kata-to トイレ@K2 (レ K3), kata-te テスト@K2 (ス K4), kata-chi サンドイッチ@K2 (サ K4), kata-shi レンタルショップ@K4 (ン K6, ショ K6, ッ never taught, プ K6), kata-so パソコン@K4 (パ K5, ン K6, コ K7), kata-fu フランス@K5 (ン K6), kata-hi コーヒー@K5 (コ K7, ー K8).
- Evidence: scripted glyph-budget check of every hostWord against its own introducedInUnit; all 46 hiragana hostwords pass, the 11 above fail. Katakana sokuon ッ (in レンタルショップ) is additionally never taught anywhere in the chapter.
- Learner impact: contradicts the product's own golden rule («no question or example may depend on untaught knowledge») at the very moment of first encounter; learner sees an undecodable string under a "readable" label.
- Suggested fix: either relabel the hostword chip (e.g. «واژهٔ لنگر» / anchor word) or gate the section to hostwords that pass the glyph-budget at that unit; register/teach ッ or drop レンタルショップ.
- Regression test: extend glyph-budget validation to KanaItem.hostWord at its introducedInUnit.

### C1-A-09 — Wrap-ups claim FSRS cards «برای همین کاناها ثبت شدند» at stations that enroll nothing  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts:44` (h0), `:4050` (k13), `:4143` (opt-r-h9), `:4196` (opt-drill) — all have `fsrsItems: []` and no kana cards.
- Problem: boilerplate sentence asserts review cards "for these kana" were registered where the station teaches/enrolls none (h0 teaches zero kana; k13/opt stations have no cards). The FSRS engine is honestly 'not-integrated' (fsrs/integration.ts) and the «به‌زودی فعال می‌شود» hedges the queue, but the enrollment claim itself is false at these four stations.
- Suggested fix: make the sentence conditional on fsrsItems being non-empty (ch2 does this correctly: v1-wrap's «۱۶ کارت» matches its 16 fsrsItems).
- Regression test: lint — wrap-up may claim FSRS registration only when station.fsrsItems.length > 0.

### C1-A-10 — Duplicated phrase in all 92 recall feedback strings  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `chapter-kana01.exercises.ts` — all `type: 'kana-recall'` items (92/92), f1Fa field.
- Actual (verbatim): «کانای «آ» این نیست — به شکل درست نگاه کن. — به شکل درست نگاه کن.» (grep count: 92).
- Impact: cosmetic but shown on every wrong recall answer across the whole kana chapter.
- Suggested fix: strip the duplicated «— به شکل درست نگاه کن.» segment.
- Regression test: lint for repeated sentence fragments within a single feedback string.

### C1-A-11 — Wrap-up "readable words" counters don't reconcile at rule-station boundaries  [SEVERITY: Low] [STATUS: CONFIRMED numbers / HYPOTHESIS impact]
- Location: `chapter-kana01.stations.ts` wrap-ups (e.g. h14 `:2127` «51 واژهٔ واقعی تازه خواندنی شد — مجموع 606» while h12's total is 538 → Δ68≠51; the 17-word sokuon delta from h13 is silently folded in; same pattern across h4–h7 whose deltas are never reported while the running total jumps, e.g. 46→163 across h4–h8).
- Problem: «تازه» is row-specific but «مجموع» is cumulative-including-rule-unlocks; a learner adding the numbers sees contradictions. The underlying totals themselves are unverifiable in-repo (N5 list not bundled) — HYPOTHESIS on absolute correctness.
- Suggested fix: either report the rule stations' deltas or footnote that totals include rule unlocks.

### C1-A-12 — Copy-hygiene cluster (mixed-script typos, broken punctuation, inconsistent transliteration)  [SEVERITY: Low] [STATUS: CONFIRMED]
- `chapter-fm01.exercises.ts:74` «にほん را با ちゅうごک قاطی نکن» — Persian ک (U+06A9) inside ちゅうごく.
- `chapter-fm01.exercises.ts:471,1083` «کلمهٔ はじめまて را که شنیدی» — はじめまて missing し (×2).
- `chapter-kana01.exercises.ts:10259` promptFa «(ضربه‌ها را بشمار!» — unclosed parenthesis.
- `chapter-kana01.stations.ts:4031` character-scene おなまえは？ `reading: 'onamae wa'` — romaji where every other `reading` is Persian («کُنیچیوا» one line above).
- `chapter-kana01.stations.ts:1489` ともだち `reading: 'تُمُداتی'` renders ち as «تی» (pronFa correctly says «توموداچی»; ち = «چی» everywhere else).
- Suggested fix: one proofing pass + the codepoint lint from C1-A-03 + a consistency lint for `reading` field script.

### C1-A-13 — «きよう این شکل واژه نیست» is an overclaim  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts:842-848` (h6 contrast block).
- Problem: きよう is a real word (器用 «maahir/badast») — rare and normally kanji-bound, but the flat claim «این شکل واژه نیست» is factually wrong; all other "not a word" distractors checked out (フアイル, がこう, ざし, コヒー, ジュス, タクシ ✓ genuinely non-words).
- Suggested fix: soften to «در این معنا واژه‌ای نیست که با آن سر و کار داشته باشی» or use a true non-word.
- Regression test: none (linguistic review).

### C1-A-14 — がくせい gloss inconsistency + one wrong etymology note  [SEVERITY: Low] [STATUS: CONFIRMED]
- `chapter-kana01.stations.ts:685` glosses がくせい as «دانش‌آموز» (school pupil) while ch2 glosses the same word as «دانشجو» (university student — the better gloss for 学生); 学生 is even the chapter-2 title word yet is not one of the 11 registered words (documented cap exception; only inline-glossed).
- `chapter-fm01.stations.ts:1135` (opt-jobs od2-ex-3) explains いしゃ as «い (پزشکی) + しゃ (کار)» — 者(しゃ) means «person», not «کار»; 員=عضو in od2-ex-4 is correct.
- Suggested fix: unify がくせい = «دانشجو/محصل» and fix the しゃ etymology («しゃ = شخص»).

### C1-A-15 — Wrong positional hint in v1 audio exercise  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `chapter-fm01.exercises.ts:54` (ex-fm01-v1-p1-aud-1 f2HintFa): «اولین واژهٔ خط ۳» — わたし is not the first word of L3 (はじめまして is; わたし is mid-line).
- Suggested fix: «واژهٔ میانی خط ۳» or drop the positional claim.

### C1-A-16 — え-row + い (えい) long-vowel spelling never explicitly taught, yet used and assessed  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: h4 pattern tables (`chapter-kana01.stations.ts:574-581,619-625`) teach only い段+い / え段+え / う段+う; the highest-frequency real pattern え段+い (せんせい, がくせい — both ch2 core words) is handled only ad hoc (h7 pronFa ««اِی» آخر کشیده است»; ex-fm01-or2-mp-1 distractor rationale explicitly invokes «کشش با «ی» نوشته می‌شود (え+い)» without a prior rule card).
- Impact: learners meet the pattern in every 〜せい word before any rule teaches it (mitigated by correct ad-hoc notes).
- Suggested fix: add one row «え段 + い ( رایج‌ترین الگو در واژه‌های せい)» to the h4 mini-table/rule-card.

### C1-A-17 — Romaji convention differs between chapters  [SEVERITY: Low] [STATUS: CONFIRMED]
- Chapter 1 registry/exercises use Hepburn-style (shi, chi, tsu, fu; Persian readings in examples); chapter 2 uses the owner-notes double-vowel standard (sensee, chuugoku, anokata, soodesuka — documented in chapter-fm01.items.ts:10). Each chapter is internally consistent and ch2's choice is documented provenance, but a learner crossing chapters sees せんせい = «sensee» after ch1 never used Latin romaji for words. Impact: minor (Low). Suggested fix: a one-line note in ch2 station 02 that the house romaji doubles long vowels.

---

## POSITIVE FINDINGS

- **P-1 — Prerequisite discipline is real and enforced (chapter 1).** My independent scripted audit of all 475 exercises (promptJa, cloze tokens, option labels) + every station block found **zero** out-of-prerequisite usages. The h6 preview of big やゆよ is a *declared* first-look (`introducesGlyphs`) consumed by `glyph-budget.ts`/`validation.ts`, which decompose every surface into base glyphs + rule marks (dakuten H5, handakuten H15, yōon H6, sokuon H13, chōonpu K8, foreign-small k12-foreign). The module header even documents the root cause it closed (びょういん at H6, TL-14 U1-U3). Evidence: my NFD-aware re-implementation agreed with the product's rule table on all 475 items.
- **P-2 — Milestones honor the "taught material only" law.** stn-kana-m1-reading uses exactly six registered hiragana hostwords (すし/ねこ/いぬ/えき/みず/ともだち — incl. derived ず, だ) and stn-kana-m2-realworld exactly six registered katakana hostwords (ドア/エアコン/カラオケ/パソコン/テスト/ラジオ); all distractor meanings are drawn from other taught hostwords («گربه = ねこ — واژهٔ دیگری از همین درس‌هاست») — recycling, not noise.
- **P-3 — Phonetics coaching for Persian speakers is unusually accurate.** pronFa notes are phonetically correct throughout: unrounded /u/ («اُوی بی‌فشار»), tap /r/ (ラーメン note), nasal assimilation (しんぶん→«شیمبون», えんぴつ→«اِمپیتسو», さんぽ→«سامپو»), mora-flat カタカナ, はい pitch note, そうですか vs そうですね contrast, びょういん/びよういん classic pair, mora-counting せんせい = 4. This is rare quality for an absolute-beginner product.
- **P-4 — estMinutes is honest arithmetic.** Chapter 1 station sums: 386 core + 20 optional = 406 = declared estMinutes; chapter 2: 60 + 11 = 71 = declared. Both sit inside the L1/L2 level caps, and the L2 minute-cap raise (levels.ts OBS-003 comment) was done with documented provenance instead of fudging the chapter number — the audit culture works.
- **P-5 — Honest-labeling discipline.** Mnemonics ship `status: 'draft'` + «داستانِ یادسپار» labels (never presented as final, per kana-items header); rule-cards carry honestyLabelFa caveats (mora-model simplification, French-loanword ー outside N5, ヴ rarity vs バイオリン, Persian-SOV transfer «پیش‌بینی ماست، نه اثبات‌شده»); missing audio degrades visibly (kanaAudioPending label; k8 rule-card admits タクシー audio pending); the FSRS port throws rather than fakes. No fake completeness found anywhere in the two chapters.
- **P-6 — Chapter 2 grammar teaching is linguistically clean.** All five clusters (AはBです, ですか/ですね with intonation table, AもBです «یا は یا も», AはBではありません + correction etiquette, 〜から来ました) are accurate, and the Persian bridges are genuinely instructive (SOV shared order; よろしく as taarof formula «ترجمه‌اش نکن، جایگاهش را یاد بگیر»; いいえ «ردِ اطلاعات است نه شخص»). The cafe dialogue is natural, adult, and source-faithful (13-turn structure documented 1:1).
- **P-7 — Distractor engineering is principled and documented.** Confusable-first policy (あ/お, し/つ, き/さ, ク/ケ, ソ/ン, ユ/エ…), same-row siblings second, error-family third options (せんせ/せんせえ/せいせん), and per-option Persian rationale on most items; correct-answer position seeded per item id (EQA-4) — verified across the dumps: correct answers are spread across positions a/b/c.
- **P-8 — Assessment hygiene.** Gate banks are truly non-overlapping with station exercises in both chapters (grep: zero `ex-kana-gate-*`/`ex-fm01-gate-*` ids referenced by any station block); all 13 kana-gate items and all 9 fm01-gate items verified answer-correct and within taught scope.

## COVERAGE

- **Chapter 1 stations: 34/34 read at block level** (h0–h15, m1-reading, k1–k13, k12-foreign, m2-realworld, opt-r-h9, opt-drill) — every scene, rule-step, rule-contrast, rule-card, example-set, prereq block, wrap-up.
- **Chapter 1 exercises: 475/475 machine-verified** (answer↔romaji for 126 recognition + 92 recall + 173 kana-listening; prerequisite legality of every Japanese surface). **191 items additionally read in full text**, including 100% of: h1 (15), h15 (10), k1 (17), k13 (8+2 warm), m1 (6), m2 (6), opt-r-h9 (12), opt-drill (10), all 50 kana-decode, all 14 rule-listening, all 12 meaning-select, all 6 cloze, both produce-template, all 13 gate items, and ~25 sampled recognition/recall/listening items. h0 has no exercises (completion: viewed).
- **Chapter 2: 22/22 stations read at block level; 82/82 exercises read in full (100%)**; 11/11 words, 5/5 grammar clusters, 8/8 expressions; dialogue 13/13 lines; index/units read.
- **Registries:** kana-items.ts 92/92 glyphs (romaji, hostword, meaning, mnemonic presence, introducedInUnit) + kana-teaching.ts coverage verified 92/92 (mnemonic layer complete there, incl. all katakana); audio manifests cross-checked (185 kana files = 92×2+1, 153 hostword entries).
- Not covered (out of my scope / for other subagents): UI rendering of practice module, DB/progress behavior, E2E browser flows, kana-teaching.ts full prose of all 92 entries (30 read in full; rest skimmed for coverage fields).

## NOTES FOR ROUND 3 / OTHER SUBAGENTS
- C1-A-04 (missing ファイル audio) overlaps the audio subagent's territory — coordinate ownership.
- C1-A-06 needs a single mechanical pass; C1-A-03/C1-A-12 are one lint rule away from impossible (non-Japanese codepoints in ja fields).
- The wrap-up "readable words" totals (C1-A-11) trace to a decodability dataset not in the repo; the KB may hold the N5 list to verify absolute counts.
