# TASK-HANASO-23 — CONTENT AUDIT ROUND 2 (adversarial; merged from 3 independent reports)

> Date: 2026-11-13 · Sources: `rounds/c2/{A,B,C}.md`. Each subagent re-derived
> C1 claims independently (scripts/runtime where possible) and hunted what
> C1 missed. Full evidence in the source reports.

## Outcome of the adversarial pass

- **34 new findings** (A 11 · B 10 · C 13), incl. the mission's first
  **Critical**: the ch1 mastery gate ships its 5 kana-listening items with
  NO question audio (runtime-verified on the local build) — with the L1
  gate at 0.9/0.8, M2 must go 3/3 → the gate is a ~3.7%-chance lottery
  without item memory (C2-B-01).
- **C1 verdicts**: most UPHELD; 1 finding REFUTED at runtime (C1-B-05
  key-position bias — the engine's seeded shuffle serves uniform positions
  184/182/167, so authored bias never reaches the learner); several
  positives NARROWED/REFUTED (P-3 phonetics «unusually accurate» — pronFa
  errors found; «all 46 hiragana hostwords pass» — けさ refutes it;
  «no length giveaways» — 42 strictly-longest keys refutes it); 3 findings
  EXPANDED (C-01 21→23 mis-keyed; A-06 ~20→~27 stale strings; B-04 4→7
  gate recycles).

## New findings register (by severity)

### Critical (1)

| ID | Finding | Evidence |
| --- | --- | --- |
| C2-B-01 | ch1 mastery gate: its 5 kana-listening items (all of M2 + M5) carry no `promptAudio`; MasteryGate has no kana-audio path — «به صدای پخش‌شده گوش کن» with nothing played. Runtime-verified (0 audio/kana refs in gate HTML). Gate 0.9/0.8 ⇒ M2 3/3 ⇒ lottery | local build runtime + code read |

### High (4)

| ID | Finding | Notes |
| --- | --- | --- |
| C2-A-01 | ALL ch2 dialogue-line audio disabled: 4/13 lines lack assets → bundle-level `available=false` kills play buttons for the 9 lines WITH committed VOICEVOX assets (runtime: disabled button, zero audio requests); station 15 anchors only asset-less lines; 3 gate items affected | runtime + manifests |
| C2-B-02 | "Pick the katakana" meta-strategy answers 126/129 mixed-script items (97.7%) — the C1-B-01 collision family is worse than reported: a test-wise learner passes katakana recall/listening without knowing any katakana | script over 475 |
| C2-B-03 | 2 ch2 decode items two-correct: option `chuugokujin؟` (correct reading + stray Persian ؟) reads identically to the key `chuugokujin` — upgrades C1-B-09.2 | source |
| C2-C-01 | Practice generator serves TWO-correct items (14/2000 mixed generated items; 13/100 sampled sessions; 1.36% of focused katakana drills): K2 duplicate labels («وا»×2), K3/K1 cross-script twins (あ/ア both keyed-one) — the C1-B-01 class alive in /practice, the surface C1 never opened | generated-session census |

### Medium (16)

| ID | Finding |
| --- | --- |
| C2-A-02 | け card's anchor word けさ shows さ one unit early — the one true hiragana hostWord violation (refutes C1-A's «all 46 pass»); hostWord violations total 18, not 11 |
| C2-A-03 | 3 factual/phonetic pronFa errors: へや claimed small ゃ (it's full-size — contradicts the chapter's own size rule); カタカナ «5 syllables» (4); プレゼント «4 morae» (5 — practice module computes 5 for the same word: card and practice contradict) |
| C2-A-04 | ex-kana-h4-dec-3 rationale shows ん 3 units before taught (rationale fields unchecked by both the product's gate and C1-A's script) |
| C2-A-05 | ど (of どなた) never shown anywhere in ch1; first appears mid-ch2 (while だ/で ARE shown in ch1) |
| C2-A-06 | ch2 cluster-level sequencing: も produced at station 05, 7 stations before its grammar station 12; unit-2 vocab as unit-1 distractor |
| C2-B-04 | 13 ch1 rationales factually false (wrong row / wrong confusable claims) |
| C2-B-05 | Gate recycling is 7 items, not 4 (m1-2, m4-1, m4-2 missed by C1-B-04) |
| C2-B-06 | Key-is-the-longest-option giveaway in 42 items (7.9%) — refutes C1-B positive-4 |
| C2-C-02 | Gate-pass screen promises «کارت‌های مرور فردا منتظرند» — FSRS is 'not-integrated'; tomorrow nothing happens (home honestly says «به‌زودی») |
| C2-C-03 | Promised safeguard «حداکثر سه حلقه در هر جلسه» not implemented anywhere; counter is chapter-lifetime, not per-session |
| C2-C-04 | Writing practice (K6/K7) unreachable while UI advertises it («اختیاری است» implies available); `includeWriting: true` has no UI path |
| C2-C-05 | 19 writing instructions quote UI labels that don't exist («نمایش ترتیب», «روی الگو») — 3-stage panel was dropped, content never updated |
| C2-C-06 | pairHintFa teaches wrong stroke counts (へ «دو ضربه»=1; ケ «یک‌ضربه»=3; ナ misdescribed) — contradicts the product's own writing data |
| C2-C-07 | う mnemonic teaches the round-mouth pitfall its own phonetics note warns against — conflicting cues on one card |
| C2-C-08 | Practice reveals: K4 autoplay hands over the reading answer (declared decoding construct bypassed); K5 rule omits ー-mora (10 hostwords contain ー); romajiOf's «ko-hi-» = a THIRD romanization convention never taught |
| (B-02/B-08 overlaps) | — |

### Low (13)

C2-A-07 (15 kana cards show confusable glyphs from future units) · C2-A-08 (kana-teaching stroke/shape/length errors in the 62 entries C1 never read) · C2-A-09 (8 registry glyphs have no anchor word at all) · C2-A-10 (ch1→ch2 boundary surfaces a finisher cannot read: ど, っ, え+い, sensee-romaji…) · C2-A-11 (copy-hygiene extensions) · C2-B-07 (k13 disc: «کانجی» option never correct 0/6 — learnable) · C2-B-08 (optional-drill clones byte-identical, not key-rotated; warm rotation 46/77) · C2-B-09 («اُ» labels BOTH お and を — recall prompt globally script-agnostic) · C2-B-10 (residual served-position lumps: k1 5/9/3, k5, h14) · C2-C-09 (gate intro promises «ده پرسش», serves 13/12) · C2-C-10 (developer-speak on learner paths) · C2-C-11 (corrupted mixed-script word inside an honesty label) · C2-C-12/13 (fa.ts cluster; no volume/mute for learning audio; autoplay note missing in practice; seal toggle undiscoverable until it plays).

## C1 verdict ledger (all three subagents, consolidated)

| C1 finding | Verdict | Note |
| --- | --- | --- |
| A-01/B-03 prod-1 contradiction | UPHELD (3-agent C1 + B re-verified) | |
| A-06/C-02 stale turn numbers | UPHELD, EXPANDED (~27 strings); C-02 impact UNDERSTATED — `dialogue-scene.tsx:489` renders «خط N از ۱۳» live during playback, so the off-by-one is contradicted on screen | stronger |
| B-01 60 two-correct | UPHELD exactly (60/60 re-derived, 0±); extended by C2-B-02 | |
| B-05 key-position bias | **REFUTED at runtime** — seeded shuffle serves uniform; residual lumps → C2-B-10 (Low) | learner-safe |
| B-04 gate dups | NARROWED → 7 items (C2-B-05) | |
| B-10 flat ~90% d2 | NARROWED → 82.9% (d1 67/d2 394/d3 14) | |
| C-01 21 mis-keyed | EXPANDED → 23 (p2-c2-cloze-1, or2-mp-1 missed) | |
| C-04/05/06/07 | UPHELD exactly (92-tail recount; hint no-op re-traced incl. stray label after retry; 4 FSRS claimants re-dumped; ledger arithmetic re-derived) | |
| C1-A positives P-1..P-8 | P-1 NARROWED (unchecked fields: rationale/hostWord classes — C2-A-02/03/04); P-3 PARTIALLY REFUTED (pronFa errors); «all 46 hiragana hostwords» REFUTED; P-2/P-4/P-5/P-7/P-8 attacked-held | |
| C1-B positives 1..10 | 1,2,3,6,8,9,10 HELD (6 extended to validation-enforced); 4 PARTLY REFUTED (C2-B-06); 5 PARTLY REFUTED (C2-B-08); 7 NARROWED (C2-B-09) | |
| C1-C positives 1..10 | 9 UPHELD, 1 NARROWED (kana-teaching «exemplary» → stroke errors C2-C-06) | |

No inter-agent contradiction surfaced in C2; the one C2-B runtime refutation
(B-05) was corroborated by C1-B's own data note («authored-data-only»).

## Running totals (C1+C2, dedup)

- Findings: 33 (C1) + 34 (C2) = 67 · Severity: Critical 1 · High 10 ·
  Medium 30 · Low 26 (approx., pre-C3 verification).
- The two-round evidence now covers: 475+82 exercises (all fields), 92/92
  teaching entries, 35/35 pairHints, 487/487 fa.ts strings, 3,540 generated
  practice items, all 3 audio manifests, wrap-ups of all 56 stations,
  dialogue YAMLs line-by-line, mastery-gate stack, practice module (11/11
  files), plus two runtime verifications on the local build (gate audio,
  ch2 dialogue audio).

## What Round C3 must verify (lead's directive)

All C1+C2 findings carry file:line evidence; C3 verifies against source AND
browser/runtime, and validates the POSITIVES with live samples. Priority
order: (1) C2-B-01 gate audio (Critical) — reproduce in browser; (2) C2-A-01
ch2 dialogue audio — reproduce; (3) the 60+2+14 two-correct families —
spot-check 6 items in browser as a learner answering the "other" correct
option (must be marked wrong + see the false rationale); (4) C1-C-01/C-02
ch2 copy defects — view gate screen + player counter; (5) positives P-2,
P-4, P-5, engine positives (spoiler/retry/elimination) — one browser pass
each; (6) everything else by source re-read with fresh eyes (no C1/C2
report as ground truth), confirming or rejecting each id.
