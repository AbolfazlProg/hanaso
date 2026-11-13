# C2-A — ADVERSARIAL content audit (attacks C1's claims) — Chapters 1 + 2

Auditor: Subagent A round 2 (Japanese-language master / curriculum auditor). Method: independent
re-implementation of the prerequisite check from `kana-items.ts` (my own NFD-style decomposition
table + rule-station orders re-derived from station titles, NOT imported from glyph-budget.ts)
run over a WIDER surface set than the product's gate or C1-A's script (promptFa, feedback
f1/f2/f3, distractorRationaleFa, chunks, kana-card hostWords + confusableNoteFa, scenes,
wrap-ups, prereq notes); semantic two-correct hunt (label canonical maps, romaji pairs,
meaning-select/rule-listening full reads); audio-manifest cross-checks for every listening
surface + one runtime browser verification on the local standalone build (guest flow → ch1
completed + gate passed honestly → ch2 station walked to a listening exercise).

**Headline:** C1's "0 prerequisite violations" holds ONLY for the narrow field set its checker
covered — the anchor-word chip of the け card shows けさ with an untaught さ (one true violation
of the golden rule, plus 17 katakana chips C1-A-08 undercounted by 6), one h4 feedback rationale
shows ん three units early, and 15 kana cards carry confusable notes naming glyphs up to 10
stations in the future. Bigger: **all dialogue-line audio in chapter 2 is dead** — 4 of 13 lines
have no assets, and the bundle-level `available` flag disables the play buttons even for the 9
lines WITH committed VOICEVOX assets (runtime-verified). Also 3 factual errors in the pronFa
layer C1-A called "unusually accurate", and 4 more stale turn-number strings C1-A-06 missed.

---

## §1 RE-VERIFICATION OF C1-A FINDINGS (same-id, verdict)

### C1-A-04 — ファイル rule-listening audio missing — UPHELD
- Re-checked all 14 rule-listening promptJa words against `public/audio/hostwords/manifest.json`
  (153 entries): 13 present; ファイル absent (ex-kana-kf-lis-1). Exactly as reported.

### C1-A-06 — ch2 stale turn numbers — UPHELD, NARROWED (inventory incomplete)
- My comprehensive regex sweep over every string of every ch2 station/exercise/unit/chapter field
  found **78 «خط/نوبت/L(n)» citations**; ~27 are stale (+1 for lines ≥9) or wrong-range. C1-A-06's
  ~20-string inventory MISSED at least 4 (all verified against dialogue YAML lines):
  - `ex-fm01-g2-prod-2` f3: «キムさんも ちゅうごくじんですか — پرسشِ خط ۱۰!» — the も-question is L9.
  - `ex-fm01-v2-txt-1` f2: «خط ۱۳: کیم می‌گوید از کره …» — Kim's かんこくからきました is L12.
  - `ex-fm01-e2-prod-1` f2: «خط ۱۱ را مرحله‌به‌مرحله بساز» — the negation line is L10.
  - `blk-g3-examples` whyFa: «از مکالمه (خط ۱۰) — یامادا کیم را به گروهِ سورا اضافه می‌کند» — L9.
- Also independently re-confirmed: anchor + reconnect `lineRefs` duplicate L(9) and omit L(13)
  (content/index.ts station dump); unit-2 title «نوبت‌های ۹–۱۴» (should ۹–۱۳).
- Extra staleness: dialogue.first-meeting-01.yaml:36-37 header claims «l9..l12 + l13 co-speaker
  have NO real audio yet» — but `s-first-meeting-01-l13` HAS a committed asset in the manifest
  (only l9–l12 and the `l13-co` key are missing).

### C1-A-08 — katakana hostwords unreadable at their station — UPHELD, NARROWED (undercount + one refuted sub-claim)
- My independent glyph-budget check of all 84 registry hostWords (8 glyphs have none — see
  C2-A-10) finds **18 violations**, not 11. C1-A-08 missed 6 katakana cases and the only
  hiragana one:
  - **け@H2 «けさ»** (kana-items.ts:163) — contains さ, taught H3. **REFUTES C1-A's claim «all 46
    hiragana hostwords pass»** — this is a true golden-rule violation: the け card's
    «واژهٔ قابل‌خواندن» chip (fa.ts:258) shows a word with a glyph from the NEXT lesson.
  - Missed katakana (all verified): ア@K1 «ドア» (ド→ト@K2) · キ@K7 «スキー» (ー@K8) ·
    セ@K4 «センチ» (ン@K6) · ハ@K5 «ハンカチ» (ン@K6, カ@K7) · ラ@K3 «ラジオ» (ジ→シ@K4 — the same
    word C1-A listed only for kata-o@K1) · ロ@K3 «グローバル» (グ→ク@K7, ー@K8, バ→ハ@K5).
  - C1-A-08's 11 all re-confirmed (incl. レンタルショップ's ッ, never displayed — but note: ッ
    does NOT cross into ch2; see coverage of directive §6 below).

### C1-A-13 — «not a word» overclaims — UPHELD, NARROWED
- きよう (器用) confirmed a real word. NEW instance in the same class that C1-A's sweep missed:
  ex-kana-h7-lis-1 rat-a: ««سِنسِ» واژهٔ ژاپنی نیست» — せんせ is live informal slang for せんせい
  (same status C1-B-07 gave it in the fm chapter). Should be softened like きよう.

### C1-A positives P-1..P-8 — attacked verdicts
- **P-1 (0 prerequisite violations) — NARROWED.** For the fields the product's GLYPH-BUDGET gate
  and C1-A's script cover (promptJa, options, cloze, chips, rule-card/prereq/contrast/step
  surfaces, example ja) my independent re-implementation agrees: **0 violations** — the checked
  core is genuinely clean, incl. correct handling of h6's introducesGlyphs first-look. But the
  claim «+ every station block» is false: block fields the gate never checks carry **34+
  out-of-prerequisite kana surfaces**: 18 hostWord chips (above), 15 confusableNoteFa chips
  (C2-A-07), the h4 exercise rationale ん (C2-A-04), the k6 prereq note showing ジュース (ー, rule
  taught K8, two stations later), and the h0 scene's ひらがな/カタカナ/かんじ (13 untaught glyphs —
  judged intentional naming exposure, attacked-held as acceptable).
- **P-2 (milestone honesty) — UPHELD.** All 24 distractor meanings of the 12 m1/m2 items map to
  registered hostWords (ねこ/いぬ/えき/みず/ともだち/あう/くに/よる/なまえ/てちょう/うえ /
  ラジオ/ピンク/カラオケ/テスト/パソコン/ウェイトレス/サイズ/ドア/レンタルショップ); every
  kana surface of both milestone stations is within budget (scripted).
- **P-3 (phonetics «unusually accurate») — NARROWED / partially REFUTED.** 28 of 31 pronFa notes
  verified correct (unrounded u ×3, tap r ×2, n→m assimilation ×2, devoiced u ×3, flat pitch ×2,
  せんせい=ē …), but 3 contain factual errors — see C2-A-03 (へや small-ya claim, カタカナ «5
  syllables», プレゼント «4 morae»). A ~10% error rate is not «rare quality».
- **P-4 (estMinutes honest) — UPHELD.** Recomputed: ch1 406=406, ch2 71=71.
- **P-5 (honest labeling) — UPHELD.** All 92 mnemonics in both layers carry status 'draft' +
  «داستانِ یادسپار»/«الگوی تشخیص شکل» labels (read 100% of kana-teaching.ts + registry spot
  checks); no fake completeness found in the layers I read.
- **P-6 (ch2 grammar clean) — UPHELD on correctness** (all 5 clusters + dialogue re-read:
  natural, accurate, source-faithful 13-turn structure) — but the cluster SEQUENCING has one
  break (C2-A-06) that P-6's correctness frame did not test.
- **P-7 (distractor engineering) — UPHELD.** Cross-item canonical label map: 0 conflicts in 126
  recognition + 92 recall items (every glyph ↔ exactly one Persian label, both directions); all
  50 decode distractor families verified as real error families; my independent recount of the
  two-correct class reproduces exactly C1-B-01's 60 items (gate-m5-2's ワ/わ pair is
  distractor-distractor — both wrong under /o/ audio — not two-correct).
- **P-8 (gate isolation) — UPHELD.** Re-verified: 13 kana + 12 fm gate items referenced by zero
  station blocks; all 25 gate answer keys valid.

---

## §2 NEW FINDINGS

### C2-A-01 — ALL dialogue-line audio is disabled in chapter 2 (even the 9 lines with real assets)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `src/modules/audio/audio-manifest.ts:274` (`available: allReal || sidecar !== null`),
  `src/lib/poc/dialogue-bundle.ts:30`, `src/app/learn/[chapter]/journey/[station]/page.tsx:255`
  (`audioAvailable={bundle!.bundle.audio.available}`) → station-runner.tsx:2088 →
  exercise-session.tsx:688-689 → line-audio-button.tsx:109 (`disabled={disabled || !audioAvailable}`).
- Problem: L9–L12 (+ the `l13-co` co-speaker key) have no VOICEVOX assets (manifest has only
  l1–l8 + l13), so `allReal` is false and the sidecar (`public/poc-audio/manifest.json`) does not
  exist → the per-DIALOGUE `available` flag is false → **every** LineAudioButton in every ch2
  station is disabled — including for L1–L8 which have committed dual-format assets. The 4 dead
  lines' URL slots point to `/poc-audio/*.wav` which do not exist on disk.
- Actual (runtime): local standalone build, guest session, ch1 completed + mastery gate passed
  with honest answers; on stn-fm01-07-listen the listening exercise renders
  `aria-label="پخش صدای این خط (s-first-meeting-01-l3)"` as a **disabled** button; zero
  audio network requests; auto-play (exercise-session.tsx:698-703) silently no-ops. API confirms
  `audio.available=false`, `audioSource:"placeholder"` for first-meeting-01.
- Impact: the chapter's listening construct (M4, 20% weight) is entirely silent — station 07
  (unit 1, all its items anchor real-asset lines L3/L5/L6/L8), station 15 (unit 2, anchors
  L9–L12 which have no assets at all), the anchor station's dialogue replay, vocab/expression
  line audio, and 3 mastery-gate items (gate-m2-2, gate-m4-2, gate-m5-1 anchor L9/L10 — no
  assets; they degrade to memory-of-transcript questions). Prompts still say «فقط گوش کن».
- Suggested fix: per-line availability — `audioAvailable={hasRealAudioAsset(lineId)}` at the
  LineAudioButton call sites (the helper already exists, audio-manifest.ts:203); generate the
  l9–l12 + l13-co assets; until then let real-asset lines play.
- Regression test: e2e asserting the play button of a line with a manifest entry is enabled.

### C2-A-02 — The け card's anchor word けさ violates the golden rule (ひらがな hostWord class C1 missed)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: kana-items.ts:163 (hira-ke hostWord «けさ»), card at stn-kana-h2 (order 3); さ taught
  at stn-kana-h3 (order 4).
- Problem/Actual: the け kana-card renders the chip «واژهٔ قابل‌خواندن: けさ» at H2 — the learner
  cannot decode さ until the next lesson. Same defect class as C1-A-08 (katakana), in the script
  C1-A explicitly cleared («all 46 hiragana hostwords pass»).
- Evidence: scripted hostWord budget check (my own decomposition): 18/84 fail, けさ is the only
  hiragana one; KanaCard renders hostWord as the v5 hero word (kana-card.tsx:471-479).
- Impact: the product's own law («no question or example may depend on untaught knowledge»)
  broken at the card level; learner meets an undecodable char in the "readable word" slot.
- Suggested fix: swap け's hostWord to a ka-row-decodable word (e.g. けが「بازو»? none in N5 —
  then ここ-style repetition or かき) or gate the chip display on budget; extend the
  glyph-budget gate to KanaItem.hostWord (C1-A-08 already proposed the lint).
- Regression test: hostWord decodability at introducedInUnit for all 92 registry entries.

### C2-A-03 — Three factual/phonetic errors in the pronFa coaching layer  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.stations.ts example-sets (pronFa fields):
  1. へや @ stn-kana-h14 reading example: pronFa ««هِیا» — «یـ»ی کوچک با «هِ» یکی می‌شود و یک هجا
     می‌سازد (hya)» — **wrong**: へや is へ+や with FULL-SIZE や (codepoints U+3078 U+3084), 2 morae
     he-ya; there is no small ゃ (that would be ひゃ). This is taught at the や-row station whose
     whole point is the big/small distinction (h6's きょう/きよう rule) — the note actively
     contradicts it.
  2. カタカナ @ stn-kana-k11: «پنج هجای کاملاً مساوی» — **wrong count**: ka-ta-ka-na = 4 morae.
  3. プレゼント @ stn-kana-k12: «چهار مورا — «پورِزِنتو»» — **wrong**: プ・レ・ゼ・ン・ト = 5 morae
     (4 syllables). The practice module's computed `moraCount` (practice/kana/items.ts:92)
     returns 5 for the same word, so a K5 practice item («این واژه چند مورا دارد؟») will mark the
     count the teaching card just taught as WRONG.
- Evidence: codepoint dump + mora arithmetic; practice generator K5 uses the same word pool.
- Impact: teaches wrong phonology/orthography in the exact layer Persian speakers rely on most;
  card-vs-practice contradiction on プレゼント.
- Suggested fix: へや → «دو مورا: هِ+یا؛ や اینجا بزرگ است — با ひゃ (کوچک) اشتباه نگیر»;
  ۴ هجا for カタカナ; ۵ مورا for プレゼント (or «۴ هجا / ۵ مورا» to teach both).
- Regression test: pronFa mora counts must equal `moraCount(ja)`; a pronFa mentioning «کوچک»
  must match a real small-kana codepoint in the word.

### C2-A-04 — Feedback rationale shows ん three units before it is taught  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-kana01.exercises.ts:810 (ex-kana-h4-dec-3, station stn-kana-h4, order 5).
- Actual: `distractorRationaleFa: { c: '「ん」 در این واژه نیست.' }` — ん is introduced at
  stn-kana-h7 (order 8). The learner who picks «اییه‌ن» is shown a glyph they cannot read, in the
  explanation of their own mistake.
- Evidence: my full-surface scan (rationale fields are outside both the product's GLYPH-BUDGET
  gate — validation.ts checks only promptJa/options/cloze/chips — and C1-A's re-implementation).
- Impact: small but a true untaught-glyph use in an exercise surface — the exact class the
  chapter's header claims is closed.
- Suggested fix: «آخرین واکه «اِ» است — صدای «ن» در این واژه نیست» (name the sound, not the glyph).
- Regression test: extend glyph-budget to f1Fa/f2HintFa/f3ExplainFa/distractorRationaleFa/promptFa.

### C2-A-05 — ど (of どなた) is never shown anywhere in chapter 1; first appears mid-chapter-2  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: ch1 zero occurrences of ど (grep across chapter-kana01.{stations,exercises}.ts,
  kana-items.ts, kana-teaching.ts = 0/0/0/0). First learner exposure: chapter-fm01.stations.ts:347
  (blk-g2-ex-2 «あのかたは どなたですか。», station 05), then ex-fm01-g2-aud-1 f3, the cloze token
  of ex-fm01-p1-c2-cloze-1 (station 08), and expression chrk-anokata-donata (items.ts:242).
- Problem: と-row dakuten siblings だ/で ARE displayed in ch1 teaching blocks (my fold of the
  DERIVED-GLYPH-SHOWN walk: がござぎぜじぞゃゅょだずびばぶっでぴぼぽぱ + katakana set — ど absent),
  so ど is the one と-row derived form a ch1 finisher has never seen, and the DERIVED-GLYPH-SHOWN
  gate does not run for ch2 (validation.ts:449 scope guard — no kana-cards → early return). どなた
  is also not a registered word (it lives only inside the expression).
- Impact: boundary sequencing gap — the learner must apply the dakuten rule to an unseen
  combination inside a new honorific word, unannounced.
- Suggested fix: one prereq first-look line in ch1 h9 (た-row) or at ch2 station 03/05: «ど = と+゛
  (کدام — در どなた)».
- Regression test: derived-forms-shown check extended to chapter 2 surfaces against ch1's shown set.

### C2-A-06 — ch2 cluster-level sequencing breaks: も produced 7 stations before its grammar station; unit-2 vocab as unit-1 distractor  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: chapter-fm01.exercises.ts:327-349 (ex-fm01-g2-prod-2, station stn-fm01-05, order 5):
  produce-template whose chips are キムさんも/ちゅうごくじん/です/か — the も grammar cluster is
  taught at stn-fm01-12 (order 12). The prompt does say «با も» and f2 explains «فقط は به も
  تبدیل شده», but production of a も-sentence precedes its DIA-loop station by 7 stations, and
  f3 cites the wrong line («پرسشِ خط ۱۰!» — L9, see C1-A-06 narrowing).
- Also: ex-fm01-v1-p3-match-1 (station 02-vocab, order 2) uses かんこくじん — vocab-2
  (stn-fm01-11, order 11) — as a distractor; the learner has not met the word (it appears at
  L10, unit 2). Rationale even says «بعداً می‌آموزیم» — an honest flag but still forward vocab.
- Evidence: scripted station-order cross-check of every exercise surface against grammar-cluster
  and vocab registration stations.
- Impact: breaks the chapter's own teach-before-produce design at two points; softened by
  in-item scaffolding, hence Medium not High.
- Suggested fix: move g2-prod-2 to station 12's drill (or swap the chip to a は-version and keep
  a も-recognition item); replace the station-02 distractor with a taught word (イタリアじん? —
  untaught too; use にほんじん/イランじん pair).
- Regression test: produce-template items may only use grammar clusters whose station order ≤ the
  item's station; option labels must be registered vocab at that point.

### C2-A-07 — 15 kana cards show confusable glyphs from future units  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: confusableNoteFa chips (kana-card blocks), e.g. stn-kana-h1 い: «با «り» اشتباه نشود»
  (り is H12 — 10 stations later); h1 う→ら(H11); h2 き→さ, く→へ(H12); h3 さ→ち, し→つ(H9);
  h8 ぬ→め(H10), ね→れ/わ(H11/H15); h11 れ→わ(H15); k1 エ→ユ(K10); k2 タ→ナ(K11), ツ→シ(K4);
  k4 ソ→ン(K6); k5 フ→ワ(K12); k9 メ→ヌ(K11).
- Problem: shape-discrimination chips name glyphs the learner cannot read yet (up to 10/9
  stations ahead); the registry mnemonics do the same («با り اشتباه نگیر» on the い card).
  Judgement: partly defensible (the point is shape, not sound) — but at h1 the learner has seen
  10 kana total and gets two more, unexplained.
- Suggested fix: delay the pair chip to the LATER glyph's card (both known by then), or label
  «شکلِ آینده» honestly.
- Regression test: confNote glyph's unit ≤ current unit (or explicitly badged first-look).

### C2-A-08 — kana-teaching.ts stroke/shape/length errors (the 62 entries C1-A never read)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: kana-teaching.ts (read 92/92 in full this round):
  1. kata-ku pairHintFa (l.758): «ク دو ضربه دارد و پایینش کوتاه است؛ ケ یک‌ضربه و شاخکِ بلند
     دارد» — ケ is TWO strokes; the contrast is false and contradicts kata-ke's own entry
     («یک خطِ عمودی و یک شاخک», l.769 — two elements).
  2. kata-ro storyFa (l.1214): «چهار ضربه که همه به هم چسبیده‌اند» — ロ is THREE strokes
     (top+right, left, bottom); the same file's own stroke-hint vocabulary uses ضربه = stroke
     (あ «سه ضربه» ✓, き «چهار ضربه» ✓).
  3. hira-fu strokeHintFa (l.401): «سه ضربه: دو خطِ عمودیِ کنار هم، بعد خطِ افقیِ پایین — مثل
     کوه با دو دامنه» — ふ's shape has no bottom horizontal and no two verticals; the
     description matches no element of the glyph.
  4. hira-a mnemonic (registry l.25 + teaching l.32): ««آ» بلند می‌کشد / صدایش هم «آ» بلند است:
     «آآآ»» — contradicts the same card's pronunciationFa ««آ» کوتاه … بدون کشیدن»; teaches
     long-a for あ in the very chapter that makes vowel length a rule (h4).
- Impact: stroke counts and length are exactly what beginners trust the cards for; errors are
  small but categorical (writing practice + mora model).
- Suggested fix: 4 point edits.
- Regression test: stroke-count claims against a kana stroke-count table; «کوتاه/بلند» words in a
  mnemonic must agree with pronunciationFa.

### C2-A-09 — 8 registry glyphs have no anchor word at all  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: kana-items.ts — を, ヌ, ヘ, ム, モ, ヤ, ユ, ヲ have no hostWord (84/92 do; all 84
  present in the hostwords audio manifest — 0 missing).
- Actual: their KanaCards render no «واژهٔ قابل‌خواندن» chip (kana-card.tsx:471 gates on
  hostWord) — honest, but the card design's real-word anchor silently skips 8 glyphs; を/ヲ are
  defensible (particle/archaic), ヤ/ユ/ヘ/ム/モ/ヌ less so (cf. hostwords that exist in the N5
  pool like ほん/ゆうびんきょく/ミス).
- Suggested fix: register anchor words for the 6 non-particle glyphs or state the exception in
  the registry header.
- Regression test: hostWord presence lint with a documented allow-list.

### C2-A-10 — Chapter-2 boundary surfaces a ch1 finisher cannot read (directive §6 inventory)  [SEVERITY: Low] [STATUS: CONFIRMED]
- The complete list (scripted scan of every ch2 Japanese string vs ch1's taught set):
  1. ど in どなた — never displayed in ch1 (C2-A-05).
  2. 学生 in the chapter title «فصل ۰۲ — اولین مکالمه: わたしは学生です» (content/index.ts:18) —
     kanji with no furigana; ch1 taught the word only as kana がくせい (h5). The title is the
     first thing the learner sees when the chapter unlocks.
  3. Vocab-card kanji terms 私/日本人/中国人/大学/先生/あの方/イラン人/韓国人/来ました — by design
     (recognition-only, furigana'd — attacked-held as acceptable).
  4. The え+い long-vowel pattern (せんせい) — never taught as a rule in ch1 (extends C1-A-16
     into ch2: the anchor dialogue + title word both use it before any rule card).
  5. Romaji convention switch (sensee vs Persian-script readings; C1-A-17/B-08 — upheld).
  - NOT a problem (verified): no ッ, no ー, no foreign-smalls anywhere in ch2 (61 distinct kana
    chars used, all within {92 base ∪ taught derived forms}); all other derived forms used in
    ch2 (ゅ ご じ で だ が ょ ジ ゃ ば っ) were displayed in ch1 teaching blocks.
- Suggested fix: furigana on the title kanji or a kana-only title until kanji chapters; the C2-A-05
  first-look; one え+い rule row in h4 (C1-A-16's fix).

### C2-A-11 — Minor copy-hygiene extensions of C1 findings  [SEVERITY: Low] [STATUS: CONFIRMED]
- ex-kana-k8-dec-3: the KEY label itself «بوولپِن» (and promptJaReading) transliterates ル with
  Persian لام — everywhere else Japanese r → «ر» (ら=«را», ラーメン=«راامِن»). C1-C-09.2 caught
  only the f2 («بوو-لو-پِ-ن»); the canonical answer string carries the same inconsistency.
- ex-kana-k6-lis-1 family: the k6 prereq note «بعداً در ジュース» (chapter-kana01.stations.ts:3029)
  displays ジュース (with ー) at k6 — chōonpu is taught at k8; prereq noteFa is an unchecked
  surface (honest «بعداً», so Low).
- k12 wrap-up itemsFa[1] displays ファ/ティ/ヴ one station before k12-foreign — explicitly
  labeled «در ایستگاه بعدی آموزش داده می‌شود» (honest teaser; unchecked surface; Low).

---

## §3 SEMANTIC TWO-CORRECT HUNT (directive §1) — result: no NEW two-correct items in ch1
- Re-implemented the sound-collision check with my own romaji table: reproduces exactly C1-B-01's
  60 items (19 recall + 41 listening incl. gate-m5-1); the 61st candidate (ex-kana-gate-m5-2,
  ワ/わ) is a distractor-distractor pair under /o/ audio — key を is unique — NOT two-correct.
- お/を (both taught «اُ»): no item ever offers both (options verified across all を/お items);
  the four-way «اُ» label (お を オ ヲ) never co-occurs in one option set. Clean — attacked-held.
- Canonical Persian label map (recognition ↔ recall, both scripts): 0 conflicts, 0 duplicate
  labels, 0 same-label-different-glyph collisions beyond the documented cross-script twins.
- All 12 meaning-select items read in full: every distractor meaning maps to a different real
  hostWord; no second defensible answer. All 14 rule-listening items read in full: keys unique
  under the tested contrast (mora count / voicing / compression); the only soft spots are the
  known きよう (C1-A-13) and せんせ (C2-A-11 narrowing) non-word claims.
- All 50 kana-decode promptJaReading labels verified against my own reading of each word — all
  correct EXCEPT ボールペン «بوولپِن» (C2-A-11).

## §4 POSITIVE FINDINGS (new this round; C1 positives I attacked and confirmed are marked attacked-held)

- **PN-1 — The ch1 checked core really is violation-free under independent re-implementation**
  (attacked-held, P-1 narrowed but not refuted): my from-scratch decomposition (own voicing
  tables, rule-station orders re-derived from station titles h5/h6/h13/h15/k8/k12-foreign)
  agrees with the product on all 475 items' checked fields and all gated block kinds. The
  engine-level discipline is real; the gaps are authoring surfaces the gate never covered.
- **PN-2 — Kana audio is complete and correctly wired**: 184 files = 92×2 dual-format, every
  registry kanaId resolves, all 173 kana-listening items carry a registry targetConcept, and the
  sound is attached only where it cannot leak the answer (grading.ts:288-304 comment verified
  against item types). Practice-module audio (kanaAudioUrls/wordAudio) degrades honestly
  (generator returns null → no sound item, never a dead one).
- **PN-3 — Practice-module generated items are linguistically sound** (first audit of generated
  quality): `moraCount` (items.ts:92) counts っ and ー as morae and merges small yoon — correct
  on every hostWord; `romajiOf` handles yoon/sokuon/chōonpu; K5 reveal teaches the exact rule
  («ゃゅょ کوچک ضربهٔ جدا نیست»).
- **PN-4 — The ch2 anchor dialogue is genuinely good Japanese** (read 13/13 lines line-by-line):
  natural, register-consistent polite forms, correct あいさつ ritual (はじめまして → 自己紹介 →
  よろしくおねがいします), the L13 joint turn is a real conversational device, and the cast
  adaptation (Kim present from scene start, speaking only T12) is internally consistent. The
  も-question, polite negation, and からきました patterns are all idiomatic.
- **PN-5 — Milestone distractor engineering holds under adversarial re-check** (attacked-held,
  P-2): every one of the 24 distractor meanings is a taught hostWord AND its rationale names
  that word's first kana — recycling, not noise; zero ambiguity introduced.
- **PN-6 — The h0 welcome scene's Japanese use is intentional and honest** (attacked-held): the
  three script names ひらがな/カタカナ/かんじ appear only as objects of discussion («این سه خط را
  کنار هم به کار می‌برند»), with Persian glosses — a defensible first-exposure, not a dependency.

## §5 COVERAGE (exact counts)

- **Ch1 stations 34/34**: every block kind scripted over the widest surface set so far (scene
  body/title, dialogue-player prediction, guided-discovery (question/options/explain/highlights),
  rule-card (pattern/table/listenWords/bridges), example-set (ja/reading/fa/why/pron/self),
  structured-input, kana-card (glyph + hostWord + confNote via registry join), rule-prereq
  (glyph/word/reading/note), rule-contrast, rule-step, writing-practice, character-scene
  (ja/reading/fa/userReply chips), wrap-up (items/fsrs), station title/objective).
- **Ch1 exercises 475/475 machine-checked** on all string fields incl. promptFa, feedback ladder,
  rationales, chunks; full-text reads: 12/12 meaning-select, 14/14 rule-listening, 50/50 decode
  (readings verified), 12/12 m1+m2, both produce-templates, 6/6 cloze, all 13 gate items, all
  を/お items, ~25 sampled recognition/recall/listening.
- **kana-teaching.ts 92/92 entries read in full** (C1-A had read 30) — the 62-entry gap is
  closed; kana-items.ts 92/92 registry fields + ~45 mnemonics read closely.
- **Ch2 22/22 stations scripted** (title/objective/all block strings), 82/82 exercises
  machine-checked (audioLineRef × manifest, «خط/نوبت» citations × dialogue truth, kanji
  inventory, cluster/vocab prereq by station order); ~30 items read in full; items.ts 295/295
  (11 words, 5 clusters, 8 expressions); index/units 115/115; both dialogue YAMLs read line-by-line.
- **Audio**: dialogue manifest 22 entries × dialogue lines; hostwords manifest 153 × all hostword
  surfaces (registry, rule-listening, milestones); 185 kana files × 92 ids; practice audio hooks
  (generator/items). Runtime: 1 local-server API check + 1 browser walk (guest → ch1 complete →
  gate passed → stn-fm01-07-listen listening exercise inspected, network-logged, screenshotted
  to /tmp/audit_c2a/).
- **Not covered**: practice-session browser E2E beyond the registry/generator read; m1/m2
  milestone rendering in-browser; SFX assets; prod spot-checks (read-only rule respected — all
  runtime work was on the local standalone build).

— Subagent A, Round C2. No product files created or modified; only this report added.
