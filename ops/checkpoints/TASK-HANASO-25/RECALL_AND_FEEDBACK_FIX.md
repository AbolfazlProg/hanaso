# TASK-HANASO-25 — RECALL & FEEDBACK FIX (Phase 3)

> Three content-quality remediations over the whole ch1 bank, each
> census-driven, applied mechanically, verified, and pinned by test.

## 3.1 — The 92 recall items (BUG-020)

**Census (re-derived):** all 92 `kana-recall` items carried BOTH defects:

1. `f1Fa` ended with `— به شکل درست نگاه کن.` **twice** (a template generator
   concatenated the suffix twice) — 92 occurrences, verified by count;
2. `f2HintFa` was the cryptic `روی همین خط از ردیفِ «X» هست؛ جفت اشتباه‌پذیرش
   را حذف کن.` — which names neither the confusable glyph nor any usable
   anchor; for ん (n-row: a row that does not exist as a syllable row) the
   hint was outright nonsense («ردیفِ ن»).

**Fix (all 92):**

- f1Fa: single tail (the doubled string removed globally; 92/92);
- f2HintFa rewritten per item from registry data:
  - normal items: `به شکل جفت اشتباه‌پذیرش دقت کن: با ««confusable-glyph»» قاطی
    نکن — کانای درست به خط «script» است.` (confusableWith from kana-items);
  - ん/ン items: `تنها کانایی است که هجا نیست — «ن» بینیِ بدون واکه؛ گزینه‌ای که
    با واکه می‌آید (مثل «نـا») درست نیست.` — the audit's demanded
    standalone-nasal phrasing.

Per the mission's repetition-vs-reinforcement rule: these were NOT "useful
repetition" — the f2 was a guessable placeholder carrying zero information
about the actual confusable at hand. The fix ties every hint to the item's
registered confusable pair (the learning objective the station teaches).

## 3.2 — The listening rationale layer (172/173 «فاقد ارزش آموزشی»)

**Census:** 173 `kana-listening` items + 5 gate items (the gate five were
re-authored by hand in CP-01). The practice items' rationale layer was the
recognition pool's shapes-for-a-sound template: telling a learner who picked
お over あ to «به تفاوت شکل دقت کن» — noise for a SOUND task; f3 never named
the kana; f1 said «این صدای کانای دیگری بود» without saying WHICH sound was
heard or what the picked option sounds like.

**Fix (data-driven from the bank's own reading labels — the recognition
items' keyed labels are the single source of Persian readings, 92 glyphs
mapped):**

- every distractor rationale now states both sounds:
  `«お» صدای «اُ» است — شنیده‌شده «آ» بود.` (the picked option's sound +
  the heard sound);
- f1: `صدای شنیده‌شده «آ» بود — دوباره پخش کن و به آوا دقت کن.`;
- f2: `صدا را دوباره پخش کن و خوانش هر گزینه را با آن مقایسه کن — «آ» را
  جست‌وجو کن.`;
- f3: `«あ» با خوانش «آ» خوانده می‌شود — پخشش کن و شکلش را به خاطر بسپار.`
  (names the kana — the old template never did);
- the 36 twin options keep their script-distinction rationale from CP-02
  (reconciled: the sound-based rewrite initially overwrote them; the final
  form for twins is «همان صدا را دارد اما به خط هیراگانا است» — the script
  fact is primary for twins, since the sounds are identical by definition);
- kf-warm-1 (the audit's one variant-template item) fixed by hand: prompt
  script-explicit + sound-named feedback for ヲ.

Persian is the language of every rationale (the mission's requirement);
readings appear as the house Persian labels («کُ»), no Latin needed.

## 3.3 — The F1 recognition leak (BUG-029, narrowed by the audit to F1)

**Census:** the audit sampled 10/10 across 10 stations; the full census on
this branch found **120 recognition items** whose f1Fa embeds the correct
reading (`«こ» صدای «کُ» دارد…`) — the reading IS the answer for a
shape→sound item, so the first-miss feedback handed it over, defeating the
retry. (F2 was clean except 6 k13-disc items — those are script-discrimination
items whose options ARE script names and whose hint legitimately describes
both scripts; verified and left as designed.)

**Fix (all 120):** f1Fa → `به شکل کانا دقت کن — از کدام ردیف است؟ با یادسپار و
جفت‌های شبیه مقایسه‌اش کن.` — redirects attention to the shape family and
the mnemonic (the teaching anchor), without the reading. The ladder still
works: F2 carries the glyph mnemonic + confusable pair; F3/reveal names
everything, as designed at ladder exhaustion.

## Test coverage (tests/unit/h25-feedback-quality.test.ts — 5 tests)

1. recall: no doubled tails, no cryptic row hints, f2 always carries a
   concrete anchor (92 items);
2. ん/ن items teach the standalone-nasal fact;
3. every listening option rationale names sounds (or the twin script fact);
   f3 names the kana + reading;
4. recognition F1/F2 never contain the keyed reading (script-name options
   excluded — the k13-disc family, 120+ items checked);
5. negative fixture: a mutated leaking F1 fails the check.

Full suite: **67 files / 775 tests passed**; typecheck + ESLint clean.

## Process note (recorded for honesty)

The first scripted pass at 3.2 overreached (a rationale-key regex matched
into promptFa — the same class of bug as CP-02's first pass). Detected by the
post-pass verification battery, fixed by resetting to the CP-02 commit and
re-running a unified pass with strictly property-anchored replacements
(`f1Fa: '…'` / whole-map spans), then a reconciliation pass for the 36 twins.
Final state verified by an 8-point mechanical battery + the unit spec.
