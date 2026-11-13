# TASK-HANASO-23 · Round C2 · Subagent C — ADVERSARIAL learner-experience/feedback audit

Auditor: Subagent C (adversarial). Mandate: hunt what C1-C missed on surfaces C1-C never read
(practice module, full fa.ts, all 92 kana-teaching entries, all 56 wrap-ups, mastery-gate UX,
audio affordances) + re-verify C1-C's own findings by attacking them. Research only — no
product/content files touched (all scripts ran from /tmp/audit_c2c, outside the tree).

## §1 Re-verification of C1-C findings (only those re-derived — verdicts)

| C1-C finding | Verdict | Independent evidence |
| --- | --- | --- |
| C1-C-01 (21 mis-keyed ch2 rationales) | **UPHELD + EXPANDED: true count is 23** | Mechanical re-derivation from `o3()` (script): 23 items have `distractorRationaleFa[correctOptionId]` — the smoking gun. C1-C missed **ex-fm01-p2-c2-cloze-1** (o3(も,は,ね,1)→b correct; rationale `{b:'は معنی «هم» ندارد.'}` keyed as if correct were a) and **ex-fm01-or2-mp-1** (o3(せんせい,せんせ,せんせえ,1)→b correct; `{b:'مورای آخر («ای») جا افتاده…'}` describes option a). Both read in source: picked-wrong-option gets no rationale, correct option gets a wrong-option rationale. |
| C1-C-02 (stale 14-era turn numbers) | **UPHELD; impact UNDERSTATED by C1-C** | C1-C claimed "no player UI displays line numbers". False: `dialogue-scene.tsx:489` renders `خط ${activeIndex+1} از ${n}` live during playback — so every «خط/نوبت N» off-by-one in ch2 feedback is DIRECTLY contradicted on screen by the player counter. Finding stronger, not weaker. |
| C1-C-04 (doubled f1 tail, 92 items) | **UPHELD exactly** | `rg -c "به شکل درست نگاه کن. — به شکل درست نگاه کن."` = 92 = recall item count 92. |
| C1-C-05 («سرنخ» hint no-op) | **UPHELD** | Independent re-trace: button lives inside the feedback panel (exercise-session.tsx:947-956, needs `feedback` non-null); hint paragraph :1009 requires `!feedback` — unreachable while the button exists; `retry()` :553-567 clears feedback but never resets `hintRevealed` → stray «سرنخ…» label after retry. Exactly as reported. |
| C1-C-06 (4 false FSRS wrap-ups) | **UPHELD exactly** | Script dump of all 34 ch1 stations: FSRS sentence + `fsrsItems: []` = h0, k13, opt-r-h9, opt-drill (4/4). Every other FSRS-claiming station has fsrsItems>0; ch2's «۱۶/۵/۶ کارت» claims match 16/5/6 fsrsItems. |
| C1-C-07 (wrap-up ledger doesn't add up) | **UPHELD** | Re-derived: claimed sums consistent only where claimed (k6 650+11=661 ✓); silent rule-unlock deltas confirmed on the katakana side too (k8 ー-rule folds +27 silently into k9's 706). |
| C1-C POSITIVE list (10) | **9 UPHELD, 1 NARROWED** | #1 spoiler fix UPHELD end-to-end in the listening flow specifically (see P6). #2 retry/elimination UPHELD (grading.ts:82-88 victim ≠ key ≠ own pick). #3 predictions UPHELD (route:345-361 reveal both ways). #4 achievements UPHELD (lessonAchievementsOf: max 3, «آشنا شدی/تمرین کردی» only). #5 estMinutes UPHELD (recomputed 406=406, 71=71). #6 milestone hostword law UPHELD mechanically (0 non-hostword JP surfaces in m1/m2 items). #7 jargon-on-first-use UPHELD (spot: だくてん H5 :708-710). #8 kana-teaching «exemplary» **NARROWED** — see C2-C-06/07. #9 bridges UPHELD (SOV bridge + honesty label present — but the label itself is corrupted, C2-C-11). #10 derived rationales UPHELD (かき=خرمالو verified :10060). |

## §2 New findings

### C2-C-01 — Practice generator serves TWO-correct-answer items (the C1-B-01 class, alive in /practice)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `modules/practice/kana/generator.ts` — buildGlyphToReading :84-110 (K2), buildSoundToGlyph :113-139 (K3), buildDiscriminate :142-173 (K1); distractor pools drawn from ALL taught scope items with no same-sound/duplicate-label guard.
- Problem: once both scripts are taught, the cross-script twin of a sound (あ/ア, ね/ネ, を/ヲ…) enters every distractor pool:
  - **K2** (glyph→reading): twin produces an IDENTICAL option label — `k2-hira-wa: [«وا» | wa | «وا» | wa | «که» | ke]` (correct わ and distractor ワ both «وا» | wa) — coin-flip grading; or two identical DISTRACTOR labels (`k2-kata-ka: [«نه» | ne | «نه» | ne | «کا» | ka]`).
  - **K3** (sound→glyph): audio plays [ra], options include both twins — `k3-hira-ra: [う | ら | ラ]`, `k3-kata-wo: [ヲ | を | レ]` — unanswerable by sound.
  - **K1** (discriminate): prompt «کدام نشانه «fu» است؟» with both ふ and フ — `k1-kata-fu-kata-wa: [ワ | ふ | フ]`, `k1-hira-i-hira-ri: [イ | り | い]`.
- Evidence: esbuild bundle of the real generator + registry, 100 mixed sessions (full taught scope): 14/2000 defective items, 13/100 sessions contain ≥1; focused katakana drills k1..k13 ×10 seeds: 21/1540 (1.36%) — worst at k1 (the FIRST katakana station). Examples verbatim from generator output.
- Learner impact: ~1-in-7 mixed sessions and ~1.4% of focused-katakana items are graded coin flips; the attempt-2 reveal («X است؛ Y صدای… دارد») never admits the twin was equally correct — marked-wrong feedback on a right answer, in the product's dedicated practice surface that C1 never opened.
- Suggested fix: in all three builders, exclude candidates whose registry romaji equals the item's romaji (K1/K3) and dedupe option labels (K2); or make the prompt script-explicit.
- Regression test: generator unit test — no session item may contain two options with equal romaji/labels.

### C2-C-02 — Gate-pass screen promises review cards "tomorrow" that cannot exist  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `messages/fa.ts:475` (gatePassedBody), rendered mastery-gate.tsx:143 on PASS for both chapters.
- Actual: «مُهر «فهمیدم» این فصل خورد. کارت‌های مرور فردا منتظرند.»
- Problem: the FSRS engine is 'not-integrated' (`modules/fsrs/integration.ts:84`), `fsrsActive=false` (`home/server.ts:94`) — the home page honestly says «صف مرور هوشمند به‌زودی فعال می‌شود», the practice hub says «هنوز فعال نیست». The gate pass — the chapter's emotional peak — promises cards TOMORROW. Tomorrow nothing happens.
- Evidence: source read of both surfaces + integration status; home 'due' state unreachable (home-view.ts:204).
- Impact: same honesty class as C1-C-06 but on the most celebratory screen of the product.
- Suggested fix: «مُهر «فهمیدم» این فصل خورد.» + the honest queue note used everywhere else.
- Regression test: copy lint — strings containing «مرور فردا/فردا» must be gated on fsrsActive.

### C2-C-03 — Promised gate safeguard «حداکثر سه حلقه در هر جلسه» is not implemented anywhere  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `messages/fa.ts:477` (gateFailedBody), mastery-gate.tsx:165; `api/curriculum/mastery/route.ts`; `progress-machine.ts:111-118`.
- Problem: the copy promises a max-3-loops-per-session safeguard. (a) No code blocks a 4th+ gate attempt — gate_locked only checks unwalked core stations; the terminal status 'remediate' set at loops≥max is consumed by nothing. (b) `remediationCount` is chapter-lifetime persisted (reset only on pass), not per-session — so even the tracked number contradicts «در هر جلسه».
- Evidence: grep of all 'remediate'/remediationCount consumers; route read in full.
- Impact: an anti-frustration promise the system doesn't keep; a struggling learner can loop indefinitely believing the product will stop them.
- Suggested fix: enforce or delete the sentence (simplest: «هر بار که برگردی، ایستگاه‌های پیشنهادی زیر را دوباره ببین.»).
- Regression test: if kept, e2e — 4th failed submit in one session must show a different state.

### C2-C-04 — Writing practice (K6/K7) is unreachable while the UI advertises it  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `practice-hub.tsx:61` (start() body never sends `includeWriting`), `api/practice/route.ts:45` (default false), `fa.ts:65-66` (writingNote rendered under EVERY practice item :543; includeWriting string dead), WriteItem component :550-587 + K6 builder dead in practice.
- Problem: `includeWriting: true` has no UI path; K6/K7 items can never generate; yet every practice item shows «تمرین نوشتاری اختیاری است و هیچ‌وقت شرط پیشرفت مسیر نیست.» — "optional" implies available.
- Evidence: grep — only fa.ts/generator/route reference includeWriting; the hub's generate payload omits it.
- Impact: advertised feature silently absent; dead code + dead copy invite drift.
- Suggested fix: add the opt-in toggle (the fa string «با تمرین نوشتاری» already exists) or remove the note.
- Regression test: e2e — toggle present → session contains a K6 item.

### C2-C-05 — 19 writing instructions quote UI labels that do not exist  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `chapter-kana01.stations.ts` — 19 `instructionsFa` occurrences (e.g. :110, :251, :388, :1160); rendered station-runner.tsx:1369-1371.
- Actual: «اول «نمایش ترتیب» را ببین، بعد در «روی الگو» بکش و در پایان با «از حافظه» امتحانش کن.»
- Problem: the WritingPracticeBlock dropped its mode tabs (#117 §2 — "drops the mode tabs/toggles of the old panel"): it is free-writing only, with buttons «نمایش دوباره» / «راهنما» / «یک بار دیگر بنویس». There is no «نمایش ترتیب», no «روی الگو» (guided) stage, and «از حافظه» exists only inside the KanaCard chips («نوشتن از حافظه»), not this block. The instructions describe the removed 3-stage panel.
- Evidence: all 19 sites grepped; component + fa.ts label inventory read.
- Impact: every kana station's writing step opens with directions pointing at controls that aren't there — worst for beginners, who look for the named buttons.
- Suggested fix: rewrite the template to the current block («نویسه را انتخاب کن؛ با «نمایش دوباره» ترتیب را ببین و روی صفحه بنویس — بعد از چند خطا «راهنما» کمک می‌کند.»).
- Regression test: content lint — quoted «…» fragments in instructionsFa must match a fa.ts UI string.

### C2-C-06 — pairHintFa teaches wrong stroke counts (contradicting the product's own writing data)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `kana-teaching.ts` — hira-ku entry :136, kata-ku :758, kata-ke :773, kata-ta :869, kata-na :939; verified against `public/writing-data/index.json` (the data the writing canvas judges by).
- Actual: く-entry: «く منقارِ تیزِ یک‌ضربه است؛ **へ تیرِ خمیدهٔ دو ضربه**» — へ is ONE stroke (index: 1); the へ-entry's own pairHint :421 says «へ **یک ضربهٔ** رو به پایین» — internal contradiction. ケ is called «**یک‌ضربه**» in BOTH the ク (:758) and ケ (:773) entries — ケ is THREE strokes (index: 3). ナ: «فقط یک خطِ موربِ ساده است» / «ナ سقف ندارد» (:869, :939) — ナ has two strokes including a top diagonal.
- Evidence: writing-data index stroke counts (へ=1, ケ=3, ナ=2, ク=2) + full file read.
- Impact: the discrimination-cue layer — praised as exemplary in C1 — feeds false structural facts on 5 cards; a learner who counts strokes to tell ク/ケ apart is taught the wrong count.
- Suggested fix: 3 point edits (へ «تک‌ضربه»، ケ «سه‌ضربه»، ナ «دو ضربه») or drop stroke counts from hints.
- Regression test: content test — any «N ضربه» claim in kana-teaching must equal writing-data strokes.

### C2-C-07 — ひらがな う mnemonic teaches the exact pitfall its own note warns against  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `kana-teaching.ts:56-68` (hira-u), same pattern kata-u :683-693 (story is clean there).
- Actual: pronunciationNoteFa: «مثل «او»، اما **لب‌ها را گرد نکن** — این صدا در ژاپنی با لبِ تقریباً صاف گفته می‌شود» — while the mnemonic on the same card: «دهان از تعجب **گرد شده**: «اوو»!» and coreImage «دهانِ بازِ تعجب».
- Problem: the mnemonic links /u/ to a ROUND mouth — the precise Persian-speaker error (rounding /u/) the phonetics note exists to prevent; conflicting cues on one card.
- Evidence: card read; pronunciationNote otherwise excellent (C1-A P-3 holds for the notes).
- Impact: mnemonics are what beginners actually remember; this one rehearses the error.
- Suggested fix: re-anchor the story to the flat-lips cue («لب‌ها صاف، صدای «او»»). Regression: n/a (editorial review) — add to the OQ-051 human-review checklist.

### C2-C-08 — Generated practice reveals: K4 autoplay defeats the reading task; K5 rule omits ー; a third romaji convention  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `generator.ts` buildWordToReading :189-204 (promptAudio = the word's own audio), buildMoraCount :234 (reveal), romajiOf :67-79; `practice-hub.tsx:270-281` (autoplay effect plays promptAudio on every item).
- Problem: (1) K4 asks «این واژه را بخوان؛ خوانش درست کدام است؟» — then AUTO-PLAYS the word: hearing [pasokon] hands over the romaji without decoding パソコン; the declared K4 construct (decoding) is bypassed. (K5 mora-count and K8 meaning items keep their constructs — audio there doesn't give the answer.) (2) The K5 reveal states only «هر نشانهٔ کامل یک ضربه؛ ゃゅょ کوچک ضربهٔ جدا نیست» — but 10 hostwords contain ー (スキー، ノート، コーヒー…) and ー silently counts as a mora; the stated rule doesn't say so. (3) romajiOf renders ー as '-' and っ as 't-' → learner-visible labels/reveals like «コーヒー = ko-hi-» — a THIRD romanization convention (ch1 uses Persian script, ch2 uses sensee-style doubling); 'ko-hi-' was never taught.
- Evidence: generator code + hub autoplay read; hostword scan (10 ー-words); moraCount verified correct on all (スキー=3…サラリーマン=6).
- Impact: practice measures listening-not-reading on K4; K5 reveals under-explain; convention drift confuses.
- Suggested fix: drop promptAudio from K4 (keep on K5/K8); extend the K5 reveal («ー هم یک ضربه است»); use the house double-vowel romaji.
- Regression test: generator snapshot — K4 items carry no promptAudio; reveal contains 'ー' rule for ー-words.

### C2-C-09 — Gate intro promises «ده پرسش», gates serve 13 (ch1) / 12 (ch2)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `fa.ts:470` (gateLead) vs bank counts (script): ch1 mastery_* items = 13, ch2 = 12; header counter renders the true number (mastery-gate.tsx:201).
- Impact: the fixed intro copy is wrong for both chapters; visible contradiction with «پرسش ۱ از ۱۳» within seconds. Low because the counter is honest.
- Suggested fix: «سپس به پرسش‌های فهم پاسخ بده» (count-free). Regression: copy lint — no hardcoded counts where a dynamic count renders.

### C2-C-10 — Developer-speak and diagnostics on learner-visible paths  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location/Actual (each verified):
  1. `fa.ts:423` sealLabel «مهر **ایچن** — این درس کامل شد» — the internal art-direction codename "Aizen" mistransliterated (expected «آیزن») AND meaningless to learners; the seal's accessible name should say what it stamps («مهر تکمیل»).
  2. `fa.ts:252` kanaCardMissing «کارت کانا «X» **در رجیستری** پیدا نشد — **محتوای ایستگاه ناقص است**» — internal diagnostics ("registry", "station content incomplete") shown to learners (station-runner.tsx:1682). Honest, but dev-voiced.
  3. `dialogue-scene.tsx:389` aria-label «صحنهٔ مکالمهٔ **کافه**» is hardcoded — WRONG for ch1's h0 welcome dialogue (scene: «هنگام ورود به فصل کانا», characters ミキ/ソラ — no cafe).
  4. `dialogue-scene.tsx:392-396` the !audio.available banner appends the raw English dev note from audio-manifest.ts:277 ('audio not generated — run `pnpm gen:audio` (playback runs silent; **error paths still demo-able**)') plus Persian QA-speak «**مسیر خطا قابل آزمایش است**». Dormant today (all ch1/ch2 dialogue lines have assets) but live code; also an ADR-013 violation (UI strings hardcoded in the PoC player).
- Impact: polish/trust; the aria label misinforms screen-reader users on ch1's first station.
- Suggested fix: 4 point edits; pass a scene label prop; translate the note.
- Regression test: a11y lint — aria-labels come from props/fa.ts; banner copy learner-voiced.

### C2-C-11 — Corrupted mixed-script word in a learner-visible honesty label  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `chapter-fm01.stations.ts:255` (stn-fm01-04-structure, persianBridgeFa honestyLabelFa).
- Actual: «برتری فارسی‌زبان‌ها در ترتیب SOV: پیش‌بینی ماست (استنتاج **تipe‌شناختی**)، نه اثبات‌شده.» — Persian «ت» + Latin "ipe" spliced mid-word (intended «تیپ‌شناختی»); renders with a bidi break inside the sentence.
- Evidence: codepoint inspection (cat -A) + full-line read; same mixed-script class as C1-A-12's ちゅうごک but inside a Persian word.
- Suggested fix: «(استنتاجی تیپ‌شناختی)». Regression: the C1-A-03 codepoint lint extended to *Fa fields' Latin-in-Persian-word pattern.

### C2-C-12 — fa.ts/copy-quality cluster (terminology, grammar, dictionary bypass)  [SEVERITY: Low] [STATUS: CONFIRMED]
- (1) `fa.ts:39` practice.focusedBody «تمرکز روی **گلیف‌ها** و قواعد…» — the practice hub (a first-screen surface) is now the most visible carrier of the 4-terms-for-one-concept drift C1-C-11 flagged (کانا/شکل/گلیف/نویسه; the kana cards say «نویسه»). (2) `fa.ts:384` «این ایستگاه را با موفقیت پشت سر **گذشتی**!» — the idiom is «پشت سر گذاشتن»; «گذشتی» is nonstandard in the product's single most-seen success message. (3) practice-hub.tsx:204, :490, :584 hardcode Persian UI strings («درس‌های تمرین‌شدنی دیگر», «یک بار دیگر فکر کن و تلاش کن — پاسخ هنوز لو نرفته.», «وقتی همهٔ ضربه‌ها پذیرفته شد…») bypassing the typed dictionary (ADR-013). (4) Observation: PRACTICE_POLICY.weakSelectionShare (0.4) is referenced nowhere — the hub's «با وزن بیشتری تمرین می‌کند» rests on weak-first ordering only (bias exists, share doesn't) — soft-true, kept Low.
- Suggested fix: «تمرکز روی کاناهای یک درس تکمیل‌شده»; «گذاشتی»; move 3 strings to fa.ts. Regression: ADR-013 lint (hardcoded Persian in components) + terminology lint.

### C2-C-13 — Audio affordances: no volume/mute for learning audio; autoplay note missing in practice  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: all audio surfaces (dialogue-scene transport, LineAudioButton, exercise/practice playback); only `station-runner.tsx:267-317` has a mute — for the seal SFX alone (localStorage `hanaso.sfx.seal-muted` persists ✓, Persian aria labels ✓, exposed only on the completion panel).
- Problem: (1) no volume control and no general mute anywhere — a learner in a library cannot silence auto-playing listening questions without muting the tab; the ONLY mute covers the ceremonial stamp. (2) The lesson's honest autoplay note («صدا به‌صورت خودکار پخش می‌شود…» fa.exListenAutoNote) is NOT shown in /practice, whose K3/K6 items autoplay the question sound just the same. (3) The seal toggle can only be discovered at the moment the sound plays — no pre-settings surface.
- Evidence: transport/player code read; fa.audio = {playSentence, replay, stop} only.
- Suggested fix: one global audio-quiet toggle in SiteNav (persist like the seal key); render exListenAutoNote in the practice prompt card.
- Regression test: e2e — toggle silences a listening autoplay without muting the tab.

## §3 Positive findings (new + attacked-held)

1. **Practice answer ladder is spoiler-safe and honest** (route.ts:257-264): a miss at attempt 1 returns NO reveal — the hub shows the authored «یک بار دیگر فکر کن و تلاش کن — پاسخ هنوز لو نرفته.»; the full reveal comes only at attempt 2 or after a correct answer. Keys never leave the server (`toClientItem` strips correctOptionId/revealFa; write items judge locally via onAttemptComplete = all-strokes-accepted only).
2. **Practice hub honesty is exemplary**: no pass/fail («بدون نمره، بدون قبولی و مردودی»), honest reviewNote everywhere, weak suggestions strictly evidence-backed (seen ≥3 AND accuracy <0.6), recap reports first-try-correct only, exit mid-session records exactly what was answered.
3. **The 409 criterion recovery is exactly what its copy promises** (TASK-HANASO-21): `retryFinalExercise` (station-runner.tsx:837-862) drops ONLY the last exercise block's result and jumps there — the earned walk is kept; the Persian panel is accurate, calm and respectful. gate_locked 409 copy likewise clear («دروازهٔ فهم هنوز بسته است — اول همهٔ ایستگاه‌های اصلی مسیر را کامل کن.»).
4. **The practice content math is correct**: moraCount/romajiOf verified right on all 10 chōonpu hostwords (スキー=3, コーヒー=4, サラリーマン=6…); katakana ッ-words (レンタルショップ، サンドイッチ) are correctly excluded as undecodable (ッ never taught — consistent with C1-A-08).
5. **Ch2 wrap-up numbers are TRUE**: «۱۶ کارت»=16 fsrsItems (stn-02), «۵ کارت عبارت»=5 (stn-06), «۶ کارت»=6 (stn-11); «۸ واژه + ۲ الگو + ۴ فرمول» matches unit-1 content exactly; k12's promise «ترکیب خارجی در ایستگاه بعدی» is honored by k12-foreign.
6. **Attacked-held (C1-C's engine positives all survived adversarial re-verification)**: the H22 spoiler fix verified END-TO-END in the listening flow specifically — route.ts:263 gates correctAudio/correctReading behind `correct || level>=3`, and the client (exercise-session.tsx:516-521) plays outcome audio only on correct or reveal; recognition items never autoplay («the kana sound is the ANSWER there»); retry/elimination, predictions-never-punished, achievements caps, estMinutes (406/71 recomputed), milestone hostword law (0 violations, mechanical), jargon-on-first-use, SOV bridge, かき/かぎ/かく derived rationale — all UPHELD.
7. **Dialogue player affordances are good**: speed ۱×/۰٫۷۵× toggle, Persian-subtitle toggle, per-line replay, honest status labels, typed error banner with recovery — the best-equipped audio surface in the product.

## §4 Coverage (exact counts)

- **Practice module (never read by C1)**: 11/11 files in full — generator.ts (394/394), kana/items.ts (159), policy.ts (51), dimensions.ts (43), checker.ts (107, v1 dialogue checker), session.ts (158), evidence.ts (84), api/practice/route.ts (342/342), practice-hub.tsx (587/587), practice/page.tsx (81/81) — plus **3,540 generated items machine-inspected** (100 mixed sessions ×20 items + 130 focused sessions k1..k13 ×10 seeds) for the two-correct/duplicate-label defect, and all 7 item builders read line-by-line.
- **messages/fa.ts: 487/487 lines** — every learner-facing group graded (nav/practice/home/audio/curriculum incl. all 40 kanaStage*/kana* strings); uiKit noted as a /poc demo surface.
- **kana-teaching.ts: 1283/1283 — all 92 entries read**; all **35 pairHintFa** texts individually graded for correctness/confusability (5 wrong — C2-C-06); mnemonics checked against their own pronunciationNoteFa (1 conflict — C2-C-07).
- **Wrap-ups: all 34 ch1 + all 22 ch2 stations dumped and every claim graded** — 94 ch1 + 13 ch2 itemsFa lines (FSRS claims ×34, word-count arithmetic re-derived across the full 7→721 ledger, «N کانای جدید» counts vs registry, rule-station claims, forward promises).
- **Mastery gate**: mastery-gate.tsx (365/365), api/curriculum/mastery/route.ts (221/221), assessment page (61/61), progress-machine.ts (146/146), levels caps; gate bank counts re-derived (13/12).
- **Dialogue surfaces**: anchor-dialogue-experience.tsx (190/190), dialogue-scene.tsx learner UI (transport/banner/lines, :385-658), kana-welcome-01.yaml (58/58), h0 scene copy, in-station dialogue-player block (station-runner:2136-2150).
- **station-runner targeted**: seal/SFX (265-390), achievements (235-266), criterion recovery (760-890), writing block (1333-1478), completion panel (1140-1200).
- **exercise-session.tsx targeted re-trace**: audio controller + grade handler (220-600), hint/feedback/actions (900-1010).
- **Cross-checks**: writing-data index (92 chars), kana-audio + dialogue audio manifests, hostword audio module, FSRS integration status, /review route (absent, unreachable today).
- **Re-derivations by script**: 23-item mis-key list, 92 doubled-tail, estMinutes sums, milestone hostwords, 3,540-item practice census. 7 esbuild/node bundles in /tmp/audit_c2c (outside the worktree).

## §5 Verdict

Attacking C1-C's findings made them STRONGER, not weaker: every re-derived item was upheld, two
were under-counted (mis-keyed rationales 21→23; stale turn numbers worse than claimed because the
player displays line counters), and none of the 10 positives collapsed — though «kana-teaching
exemplary» must be narrowed (5 false stroke facts + 1 mnemonic that teaches the warned-against
error). The biggest C1 blind spot was the entire /practice surface: its generator reproduces the
two-correct-answer family (~1-in-7 mixed sessions) with the same lying feedback, while its honest
ladder/hub copy is genuinely good. The honesty frontier has moved from wrap-up counters to the
GATE experience: a tomorrow-promise, an unimplemented loop cap, and a wrong question count — all
in fa.ts strings C1 sampled but never graded against engine truth. No blockers for Round 3;
highest-value verification targets are C2-C-01 (regenerate my census), C2-C-02/03 (gate copy vs
engine), C2-C-05 (19 instruction strings vs the current writing block).

— Subagent C, Round C2. Only this report added to the tree.
