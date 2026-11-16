# TASK-HANASO-27 — Pedagogy & Exercise Design (Subagent B)

**Date:** 2026-11-14 · **Branch:** `feat/TASK-HANASO-27-integrated-practice`
**Scope:** READ-ONLY design work. No files were modified.

**Sources for taught-material facts:** `apps/web/src/modules/curriculum/content/kana-items.ts` (`introducedInUnit`, host words, `confusableWith`), `chapter-kana01.stations.ts` (blocks, example words, rule tables, `confusableNoteFa`), `chapter-kana01.exercises.ts` (types, word bank, F1–F3 ladder), `chapter-kana01.ts` (`stationSlugs`), `kana-teaching.ts` (`pronunciationFa` → `KANA_READING_FA_BY_GLYPH`), `messages/fa.ts` (voice, audio notes, hint UI), `config/experience.ts` (auto-next constants), `curriculum/types.ts` (`ExerciseType`), `ops/checkpoints/TASK-HANASO-26R/CURRICULUM_MAP.md`.

## 1. Taught-material snapshot (verified facts)

**Glyphs by station:** h1 あいうえお · h2 かきくけこ · h3 さしすせそ · h7 ん · h8 なにぬねの · h9 たちつてと+だ · h10 まみむめも · h11 らりるれろ · h12 はひふへほ+ば/び/ぶ · h14 やゆよ · h15 わ/を+ぱ/ぴ/ぽ/ぼ (゜). **Rules:** h4 long vowel (いいえ، ええ، おおきい، おおさか، こうこう) · h5 dakuten on か/さ rows (shown: が ぎ ご ざ じ ぜ; words がくせい، ごご، かぞく، かいぎ) · h6 yōon (きょう، かいしゃ، いしゃ، しゃしん، びょういん؛ exercises きゃく، きゅう، じゅう) · h13 sokuon (がっこう، ざっし، ちょっと، いっしょ، けっか、 さっき) · h15 handakuten (さんぽ، えんぴつ، ぱん). **Key words appear at:** かばん/しんぶん/ほん/にほん at h12; でんわ at h15 (で taught at h9 だいがく); わたし at h15. **Never exposed in the Hiragana unit:** ぐ، ず، げ، づ، ぷ، ぺ، the katakana chōonpu ー (k8), all katakana glyphs.

## 2. Placements (4 new stations, slug prefix `stn-kana-p1…p4`)

| Slug                                                 | Position in `stationSlugs` (section-a)             | Prereq chain change | Scope (allowed material)                                                           | Rationale                                                                                                                                                     |
| ---------------------------------------------------- | -------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stn-kana-p1` «تمرین ۱ — سه ردیف و دو قاعده»         | after `stn-kana-h5`, before `stn-kana-h7`          | h7's prereq → p1    | あ/か/さ rows (15 glyphs), long vowel, dakuten が ぎ ご ざ じ ぜ + all h1–h5 words | First consolidation point: 15 glyphs + 2 rules before the sonorant cluster; closes the «look-alike triangle» あ/お، き/さ، し/つ while fresh                  |
| `stn-kana-p2` «تمرین ۲ — ん و ردیف‌های ن/ت»          | after `stn-kana-h9`, before `stn-kana-h10`         | h10's prereq → p2   | + ん، な-row، た-row، だ + h7–h9 words                                             | Heaviest new-glyph load of the unit (11 glyphs); さ/ち، し/つ، た/な، ん/そ discrimination must be secured before ま/ら add more shape twins                  |
| `stn-kana-p3` «تمرین ۳ — ردیف‌های م/ر/ه و داکوتن ば» | after `stn-kana-h12`, before `stn-kana-h14`        | h14's prereq → p3   | + ま/ら/は rows, ば/び/ぶ + their words (incl. かばん، しんぶん)                   | All base glyphs done here; the densest confusable field (ぬ/め، ね/れ، る/ろ، は/ほ/ま، く/へ، う/ら، い/り) needs a dedicated pass before rules stack on top |
| `stn-kana-p4` «تمرین ۴ — آیین کامل هیراگانا»         | after `stn-kana-h15`, before `stn-kana-m1-reading` | m1's prereq → p4    | all 46 base + ん + ゛/゜ + ゃゅょ + っ + all taught words                          | Full-spiral dress rehearsal: size discrimination (ゃ vs や)، っ detection، ば/ぱ mark confusion — exactly the skills m1-reading silently assumes              |

Resulting rhythm: h0–h5 (Learn) → **P1** → h7–h9 (Learn) → **P2** → h10–h12 (Learn) → **P3** → h14–h15 (Learn) → **P4** → m1-reading (Review) → opt-r-h9. Station shape: `type: 'practice'`, `core: true`, `completion: { kind: 'task_completed' }`, `estMinutes: 8–10`, no `mastery` (matches m1-reading), one `scene` block + exercise blocks + `wrap-up`. Note for implementer: `order` integers must be renumbered (CL-16 requires stationSlugs == order sequence); negative CL-16 fixture must be extended to the new slugs.

## 3. Per-station exercise lists (all strings final Persian)

Exercise-type mapping to the engine: Glyph Recognition = `kana-recognition` («این کانا چه صدایی دارد؟»), Sound-to-Kana = `kana-listening` («به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟»), Confusable Pairs = `kana-recognition`/`kana-recall` with pair distractors, Sequence/Word Reading = `kana-decode` («این واژه را بخوان — راهنمایی: …»), rule minimal pairs = `rule-listening`, word→meaning = `meaning-select`. 3 options per item; option ids a/b/c with seeded position (EQA-4). Each item carries `distractorRationaleFa` per option and `referenceBlockId` back to the origin kana-card/rule-card block (F4 «بازگشت به آموزش»).

### P1 — after h5 (19 items)

**Block A — بازشناسی گلیف (`kana-recognition`, 4):**

1. さ → «سا» ✓ / «کی» (شکل き — دو خط افقی دارد، さ فقط یکی) / «سُ» (خواهرِ ردیف そ)
2. お → «اُ» ✓ / «آ» (جفت あ) / «او» (خواهر う)
3. せ → «سه» ✓ / «سا» (خواهر さ) / «زه» (ぜ با ゛)
4. き → «کی» ✓ / «سا» (جفت さ) / «که» (خواهر け)

**Block B — صدا به کانا (`kana-listening`, 3):** 5. «کُ»→こ/か/そ ✓こ 6. «شی»→し/つ/き ✓し 7. «گا»→が/か/ざ ✓が (distractor rationale: か بدون ゛؛ ざ داکوتنِ ردیف دیگر)

**Block C — جفت‌های شبیه (`kana-recall`, 3):** 8. «کانای «آ» کدام است؟» → あ/お/い ✓あ9. «کانای «شی» کدام است؟» → し/つ/さ ✓し (つ کلاه دارد و به بیرون نگاه می‌کند؛ し قلابش پایین و رو به چپ است) 10. «کانای «گا» (با ゛) کدام است؟» → が/か/さ ✓が

**Block D — خواندن پیاپی (`kana-decode`, 3):** 11. あさ «صبح» → «اَسا» ✓ / «آسا» (کشش — معنا عوض می‌شود، h4) / «اُسا» (あ/و خلط) 12. すし → «سوشی» ✓ / «شوسو» (ترتیب وارونه) / «سوسو» (خوانش そ) 13. ここ → «کوکو» ✓ / «گوگو» (جفت کمینه‌ای داکوتن، h5) / «کاکا» (مصوت)

**Block E — واژه‌خوانی با قاعده (3):** 14. (`kana-decode`) いいえ → «اییه» ✓ / «ایه» (بدون کشش = خانه) / «اِیی» (ترتیب مصوت) 15. (`meaning-select`) ごご → «بعدازظهر» ✓ / «اینجا» (ここ) / «خانه» (いえ) 16. (`kana-decode`) おおきい → «اووکیی» ✓ / «اوکیی» (کشش جاافتاده) / «اووکین» (ん ندارد)

**Block F — مرور مخلوط (3):** 17. (`kana-recognition`) ご → «گو»/«کو»/«زو» ✓گو 18. (`kana-listening`) «سُ»→そ/こ/せ ✓そ 19. (`kana-decode`) かさ → «کاسا» ✓ / «کازا» (داکوتن) / «ساکا» (ترتیب)

### P2 — after h9 (19–20 items)

**A — بازشناسی گلیف (4):** 1. な→«نا»/«تا»/«نی» ✓نا (تا = جفت شکل た) 2. ぬ→«نو»/«ته»/«نه» ✓نو 3. ち→«چی»/«سا»/«شی» ✓چی (さ دسته و تیغه دارد؛ ち مثل ۵ فارسی) 4. と→«تُ»/«کُ»/«ته» ✓تُ

**B — صدا به کانا (3):** 5. «نی»→に/ぬ/な ✓に 6. «تسو»→つ/し/ち ✓つ 7. «دا»→だ/た/ざ ✓だ

**C — جفت‌های شبیه (4):** 8. (rec) ち→«چی»/«سا»/«کی» ✓چی 9. (rcl) «کانای «تسو» کدام است؟»→つ/し/き ✓つ 10. (rec) た→«تا»/«نا»/«تُ» ✓تا (هر دو یک تکهٔ مشترک چپ دارند؛ た دُمِ رو به بالا و بسته دارد، な حلقهٔ باز) 11. (rec) ん→«ن»/«سُ»/«نو» ✓ن (そ مسیر باز و خمیده است؛ ん حلقهٔ کوچک یک‌ضربی)

**D — خواندن پیاپی (3):** 12. くに→«کونی»/«گونی»/«نیکو» ✓کونی 13. その→«سُنو»/«سونو»/«زُنو» ✓سُنو 14. あした→«آشیتا»/«آچیتا»/«آتسایتا» ✓آشیتا (قاعده: し = «شی»، つ = «تسو»)

**E — واژه‌خوانی با ん (3):** 15. せんせい→«سِنسِی»/«زِنزِی»/«سِنسِیی» ✓سِنسِی 16. さん→«سان»/«سا» (ん یک ضربهٔ کامل است — حذفش واژه را نابود می‌کند) /«تسان» ✓سان 17. あなた→«اناتا»/«آنتا»/«انادا» ✓اناتا

**F — مرور مخلوط (3):** 18. (rec) ご→«گو»/«کو»/«زو» ✓گو 19. (lis) «تُ»→と/こ/そ ✓と 20. (dec) あつい→«آتسویی»/«آتشویی»/«آسویی» ✓آتسویی

### P3 — after h12 (20 items)

**A — بازشناسی گلیف (4):** 1. め→«مه»/«نو»/«مُ» ✓مه (ぬ حلقه در چپِ دُم؛ め حلقه در راست) 2. ほ→«هُ»/«ها»/«فو» ✓هُ (は چهار خط دارد؛ ほ همان は با یک خط اضافه) 3. る→«رو»/«رُ»/«او» ✓رو 4. へ→«هه»/«کو»/«هی» ✓هه

**B — صدا به کانا (3):** 5. «نه»→ね/れ/ぬ ✓ね 6. «با»→ば/は/ま ✓ば 7. «می»→み/め/し ✓み

**C — جفت‌های شبیه (5) — قلب ایستگاه:** 8. (rec) ぬ→«نو»/«مه»/«نه» ✓نو — wrong-feedback: «این «نو» است — حلقه در چپِ دُم؛ «مه» حلقه‌اش در راست است. به جهت حلقه نگاه کن.» 9. (rec) れ→«ره»/«نه»/«رو» ✓ره (ね دُمش کوتاه و پیچ؛ れ بلند و باز) 10. (rcl) «کانای «رُ» کدام است؟»→ろ/る/そ ✓ろ (る دُمِ حلقه‌دار دارد؛ ろ صاف تمام می‌شود) 11. (rec) は→«ها»/«هُ»/«ما» ✓ها — three-way は/ほ/ま: «は چهار ضربه و خطِ بالاییِ جداست؛ ほ یک خط اضافه دارد؛ ま حلقهٔ بسته زیر خط دارد» 12. (rec) へ→«هه»/«کو»/«هُ» ✓هه (منقارِ へ به چپِ پایین باز است؛ く به راست)

**D — خواندن پیاپی (3):** 13. ねこ→«نِکُ»/«کِنُ»/«رِکُ» ✓نِکُ (خوانش れ نادرست — دقت به حلقهٔ ね) 14. みず→«میزو»/«مِزو»/«میزوو» ✓میزو 15. くるま→«کوروما»/«گوروما»/«کُروما» ✓کوروما

**E — واژه‌خوانی داکوتن ば (3) — واژه‌های h12:** 16. かばん→«کابان»/«کاهان» (は بدون ゛) /«کامان» (ば/ま) ✓کابان — **دیزتراکتور «کاپان» ممنوع** (゜ هنوز آموزش داده نشده) 17. しんぶん→«شینبون»/«شینفون» (ぶ/ふ) /«شینمون» ✓شینبون 18. ほん→«هُن»/«هون»/«مُن» (ほ/ま) ✓هُن

**F — مرور مخلوط (2):** 19. (rec) ふ→«فو»/«هُ»/«هی» ✓فو 20. (dec) ともだち→«تُمُداتی»/«تُمُراتی»/«تُمُتاتی» ✓تُمُداتی

### P4 — after h15, before m1 (21–22 items)

**A — بازشناسی گلیف (4):** 1. わ→«وا»/«ره»/«نه» ✓وا (سه‌گانه れ/わ/ね) 2. を→«اُ»/«وا»/«او» ✓اُ 3. ぽ→«پُ»/«بُ»/«هُ» ✓پُ (دایره ゜ = پ؛ دو خط ゛ = ب) 4. ぼ→«بُ»/«پُ»/«هُ» ✓بُ

**B — صدا به کانا (3):** 5. «وا»→わ/れ/ね ✓わ 6. «پا»→ぱ/ば/は ✓ぱ 7. «یو»→ゆ/よ/や ✓ゆ

**C — جفت‌های سه‌تایی (3):** 8. (rec) ね→«نه»/«وا»/«ره» ✓نه («ね دُمِ کوتاهِ پیچ‌دار؛ れ بلند و باز؛ わ تخت با دُمِ گردِ پایین») 9. (rcl) «کانای «هُ» کدام است؟»→ほ/は/ま ✓ほ 10. (rec) ょ (کوچک، داخل きょ) → prompt «この ょ کوچک است — きょ چه صدایی دارد؟» options «کیُ (یک ضربه)» ✓ / «کی‌یُ (دو ضربه)» (ょ بزرگ = جدا) / «کی‌یُو» — rationale: اندازه در ژاپنی معنا دارد.

**D — جفت کمینه‌ای شنیداری (`rule-listening`, 3):** 11. audio がっこう → がっこう/がこう/がごう ✓がっこう (صدا هرگز قبل از پاسخ نمایش متن نمی‌شود) 12. audio きょう → きょう/きよう/きゅう ✓きょう13. audio ごご → ごご/ここ/ご ✓ごご

**E — واژه‌خوانی با همهٔ قواعد (4):** 14. がっこう→«گَکّوو»/«گاکو» (っ و う جاافتاده) /«گاکوو» (っ حذف) ✓گَکّوو 15. えんぴつ→«اِمپیتسو»/«اِنبیتسو» (゛ به‌جای ゜) /«اِمپیتس» ✓اِمپیتسو 16. しゃしん→«شاشین»/«شی‌یاشین» (ゃ بزرگ) /«ساشین» ✓شاشین 17. わたし→«واتاشی»/«راتاشی» (わ/ら) /«واتاسی» ✓واتاشی

**F — مرور مخلوط نهایی (5):** 18. (rec) つ→«تسو»/«شی»/«چی» ✓تسو 19. (lis) «چی»→ち/さ/き ✓ち 20. (dec) すし→«سوشی»/«سوسو»/«شوسو» ✓سوشی 21. (`meaning-select`) ねこ→«گربه»/«سگ»/«آب» ✓گربه 22. (rec) ん→«ن»/«سُ»/«نو» ✓ن

## 4. Hint ladders (per type, in app voice) + feedback templates

The engine ladder is F1 (nudge) → F2 (hint; engine also eliminates one wrong option — «یک گزینهٔ نادرست حذف شد») → F3 (explanation after adequate attempts) → F4 «بازگشت به آموزش» via `referenceBlockId`. Per type:

**Glyph Recognition (`kana-recognition`):**

- F1: «به شکل کانا دقت کن — از کدام ردیف است؟ با یادسپار و جفت شبیه‌اش مقایسه‌اش کن.»
- F2: «این کانا [ویژگی: «دو خط افقی دارد» / «دو گردی دارد» / …] است — گزینهٔ «[نادرست]» را حذف کن؛ آن صدای کانای دیگری است.»
- F3: «کانای [X] با خوانش «[Y]» خوانده می‌شود — [یادسپار یک‌خطی].»
- Wrong: ««[گزینه]» صدای کانای [glyph] است. کانای سؤال [ویژگی تمایز] — دوباره نگاه کن.» Correct: «درست! [X] = «[Y]».»

**Sound-to-Kana (`kana-listening`):**

- F1: «صدا را دوباره پخش کن — روی مصوتش تمرکز کن.»
- F2: «صدای شنیده‌شده از ردیف [ک/س/…] بود — [glyph] (صدای «[Y]») را حذف کن.»
- F3: ««[X]» صدای کانای [glyph] است — پخشش کن و شکلش را به خاطر بسپار.»
- Wrong: «گزینه‌ات «[reading]» خوانده می‌شود — صدا را دوباره بشنو؛ شنیده‌شده «[sound]» بود.»

**Confusable Pairs:**

- F1: «این دو کانا فقط در [جهت حلقه / شمار خط / دُم] فرق دارند — همان را پیدا کن.»
- F2: «کانای درست [جهت‌نما]؛ گزینهٔ [X] را حذف کن.»
- F3: the discrimination sentence, e.g. «این «نو» است — حلقه در چپِ دُم؛ «مه» حلقه‌اش در راست است.» / «は چهار ضربه دارد؛ ほ همان は با یک خط اضافه؛ ま حلقهٔ بسته زیر خط دارد.»
- Wrong: «این [گزینه] است — [ویژگی آن]. کانای سؤال [ویژگی درست] دارد.» Correct: «درست! [A] و [B] را دیگر قاطی نمی‌کنی — [نشانهٔ تمایز].»

**Sequence/Word Reading (`kana-decode`):**

- F1: «کانا به کانا بخوان — هر کانا یک ضربه.»
- F2: «با کانای اول شروع کن: «[r1]…» — گزینه‌ای که با آن شروع نمی‌شود را حذف کن.»
- F3: «[k1]+[k2](+…) = «[reading]» — [معنا/قاعده].»
- Wrong: «کانا به کانا چک کن: [breakdown] — [قاعدهٔ خط‌رفته: کشش/゛/゜/っ].» Correct: «درست! [word] = «[reading]» ([معنا]).»

**Rule-listening (minimal pairs):** F1 «صدا را دوباره پخش کن — مکث/فشردگی وسط واژه را بشنو.» F2 «این واژه [تعداد] ضربه دارد — گزینهٔ بدون [っ/کشش] را حذف کن.» F3 «[word] = «[reading]» ([معنا]) — [قاعده].»

## 5. Audio / auto-next contract per type

Inherits `EXPERIENCE` constants — no new timings:

- **`kana-recognition`** (reading exercises): glyph shown visually; its sound must NOT play before answering (it would leak the answer). After a correct answer → play «شنیدن تلفظ درست» (kana audio), then auto-next waits for audio end + `autoNextAudioBeatMs` (650ms); without audio, 1500ms (2200ms after retry).
- **`kana-recall`**: the prompt's reading sound plays (the sound shown in the prompt is not a leak; the shape is the answer). Options are glyphs. After correct → replay glyph audio for reinforcement, then auto-next.
- **`kana-listening`**: audio IS the question — auto-plays at start, replay allowed («پخش مجدد»), options are glyphs so no visual leak. After correct: no extra answer audio (question already is it); auto-next 1500ms.
- **`kana-decode`**: word shown visually; word audio must NOT play before answering. After correct → play word audio («شنیدن تلفظ درست»), auto-next after audio + 650ms beat (fallback 3200ms if audio stalls).
- **`rule-listening`**: word audio is the question (auto-play, replay allowed); the word is NEVER rendered before answering. After correct → show + play once more.
- **`meaning-select`**: word shown; no audio before answer; after correct play word audio.

## 6. Persian+English reading-guide format

Use the existing UI formatter `fa.curriculum.kanaReadingLatin(faReading, latin)` → `«کو | ku»`, with readings taken verbatim from `KANA_READING_FA_BY_GLYPH` (kana-teaching.ts): あ «آ | a» · い «ای | i» · う «او | u» · え «اِ | e» · お «اُ | o» · か «کا | ka» · き «کی | ki» · く «کو | ku» · け «که | ke» · こ «کُ | ko» · さ «سا | sa» · し «شی | shi» · す «سو | su» · せ «سه | se» · そ «سُ | so» · た «تا | ta» · ち «چی | chi» · つ «تسو | tsu» · て «ته | te» · と «تُ | to» · な «نا | na» · に «نی | ni» · ぬ «نو | nu» · ね «نه | ne» · の «نُ | no» · は «ها | ha» · ひ «هی | hi» · ふ «فو | fu» · へ «هه | he» · ほ «هُ | ho» · ま «ما | ma» · み «می | mi» · む «مو | mu» · め «مه | me» · も «مُ | mo» · や «یا | ya» · ゆ «یو | yu» · よ «یُ | yo» · ら «را | ra» · り «ری | ri» · る «رو | ru» · れ «ره | re» · ろ «رُ | ro» · わ «وا | wa» · を «اُ | wo» · ん «ن | n». Derived: が «گا»، ぎ «گی»، ご «گو»، ざ «زا»، じ «جی»، ぜ «زه»، ぞ «زو»، だ «دا»، で «ده»، ば «با»، び «بی»، ぶ «بو»، ぼ «بُ»، ぱ «پا»، ぴ «پی»، ぽ «پُ».

## 7. Coverage matrix (columns: GR/S2K/CP = A–C blocks, SR = sequence, WR = word reading, MX = mixed; cells = stations)

| Taught kana / rule                                    | GR  | S2K                 | CP                | SR                | WR                                          | MX    |
| ----------------------------------------------------- | --- | ------------------- | ----------------- | ----------------- | ------------------------------------------- | ----- |
| あ-row                                                | P1  | P1                  | P1                | P1,P4             | P1–P4                                       | all   |
| か-row                                                | P1  | P1                  | P1                | P1                | P1,P3                                       | P2,P4 |
| さ-row                                                | P1  | P1                  | P1,P2             | P1                | P1,P2                                       | P4    |
| Dakuten が ぎ ご ざ じ ぜ                             | P1  | P1                  | P1                | —                 | P1,P3                                       | P2,P4 |
| ん                                                    | P2  | —                   | P2 (ん/そ)        | —                 | P2 (さん، せんせい)                         | P4    |
| な-row                                                | P2  | P2                  | P2 (た/な)        | P2 (くに، その)   | P2,P4                                       | P3    |
| た-row + だ                                           | P2  | P2                  | P2 (さ/ち، し/つ) | P2 (あした)       | P2 (あなた، だいがک via MX), P4             | P3,P4 |
| ま-row                                                | P3  | P3                  | P3 (は/ほ/ま)     | P3 (みず، くるま) | P3 (ともだち)                               | P4    |
| ら-row                                                | P3  | P3                  | P3 (ね/れ، る/ろ) | P3                | P3,P4                                       | P4    |
| は-row + ば び ぶ                                     | P3  | P3                  | P3 (は/ほ، く/へ) | —                 | P3 (かばん، しんぶん، ほん)                 | P4    |
| や-row                                                | P4  | P4                  | P4 (ゆ/よ)        | —                 | P4 (via yōon words)                         | —     |
| Yōon ゃゅょ (きゃ/きゅ/きょ/しゃ/しゅ/じゅ/ちょ/びょ) | P4  | P4 (rule-listening) | P4 (size)         | —                 | P4 (きょう، しゃしん، びょういん via WR/MX) | —     |
| Sokuon っ                                             | —   | P4 (rule-listening) | —                 | —                 | P4 (がっこう، ざっし، いっしょ، ちょっと)   | —     |
| わ / を                                               | P4  | P4                  | P4 (れ/わ/ね)     | —                 | P4 (わたし)                                 | —     |
| Handakuten ぱ ぴ ぽ ぼ                                | P4  | P4                  | P4 (ば/ぱ)        | —                 | P4 (えんぴつ، さんぽ via WR)                | —     |

**Intentional gaps:** ぐ، ず، げ، づ، ぷ، べ، ぺ — no teaching exposure anywhere in the unit (no station word contains them), so no exercise may use them (distractors must be taught kana — CONTENT-104 lineage). Every other taught glyph is covered by ≥2 types across stations; each confusable pair documented in `kana-items.ts` (あ/お، い/り، う/ら، き/さ، く/へ، さ/ち، し/つ، ぬ/め، ね/れ/わ، は/ほ، る/ろ) gets a dedicated CP item at the earliest station where both members are taught. Writing practice is out of scope for these stations (it lives in the teach stations and the optional drill).

## 8. Guardrails (forbidden at each station)

- **P1:** no ん، no な/た/ま/ら/は/や/わ rows, no ゛ outside か/さ-row glyphs, no ゜ (untaught until h15 — distractor sound «کاپان» is a future-content leak), no ぬ/め pair (め untaught).
- **P2:** everything above plus ん/な/た/だ allowed; no ま/ら/は/や/わ، no ば (h12)، no yōon/sokuon، no word containing an untaught glyph.
- **P3:** all base rows except や-row allowed; no ゃゅょ (h6)، no っ (h13)، no わ/を (h15)، no ゜ (h15) — handakuten distractors forbidden; がっこう/ざっし forbidden (contain っ).
- **P4:** full hiragana + all rules allowed; **no katakana glyphs** (k1+), no chōonpu ー (k8 — so らーめん-style words forbidden), no ぐ/ず/げ/づ/ぷ/べ/ぺ، no untaught words.
- **All stations:** distractor readings must be readings of taught kana; hints never name or show future rows/rules («بعداً می‌آید» phrasing like h1's confusableNote is acceptable, naming the glyph is not); reading exercises never auto-play the answer audio before the learner answers; no engineering tokens or Arabic-Yeh inside Japanese strings (CL-17); every item needs per-option `distractorRationaleFa` and a `referenceBlockId` into the originating teach station's block.

The design is fully implementable within the existing engine: no new exercise types, no new timings, no new UI strings beyond the station titles/scenes and per-item copy shown above.
