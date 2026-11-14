# TASK-HANASO-25 — MULTI-ANSWER REMEDIATION (Phase 2 / BUG-002)

> The audit's 60-item two-correct family: every item judged one-by-one, the
> remediation applied, the contract pinned by test.

## 1. Re-derivation (repository truth, not the report)

A fresh census over the live bank (script: scripts/h25_two_correct_census.py)
reproduced the audit list EXACTLY:

- 19 `kana-recall` items — identical id list to audit rounds/c1/B.md C1-B-01;
- 40 `kana-listening`/warm items — the audit's 41 minus `ex-kana-gate-m5-1`
  (already fixed in CP-01 with sound-distinct distractors: ン→ぬ);
- total on this branch at Phase-2 start: **59** (60th closed by Phase 1).

The defect: each item's option set contained the katakana target AND its
hiragana twin (same romaji), under a prompt that never named the script
(`کانای «آ» کدام است؟` / `به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟`).
Both options are correct Japanese for the asked-about sound; the learner
picking the hiragana twin was marked wrong with the FALSE rationale
«کانای دیگری با همین ردیف.» (factually wrong: it is the same sound in the
other script, not "another kana of the same row").

## 2. Per-item adjudication (the mission's five questions, applied to all 59)

| Question | Answer for this family |
| --- | --- |
| Are two options genuinely correct Japanese? | **Yes** — both glyphs render the target sound; the twin is not a distractor error but a script distinction. |
| Is the ambiguity from the prompt? | **Yes** — the prompt asks for "the kana for آ" without naming a script; that question has two valid answers. |
| Are the wrong options insufficiently distinct? | The non-twin distractors are fine (different sounds). The twin is a GOOD distractor once the question is honest. |
| Does the key match the asked definition? | After the fix — yes: the question asks for the KATAKANA glyph for the reading/sound. |
| Does feedback explain right and wrong correctly? | After the fix — the twin's rationale states the real difference (same sound, other script). |

**Decision: make every item script-explicit** (the bank's own fix pattern,
`ex-kana-gate-m4-2`: «این کانای کاتاکانا چه صدایی دارد؟…»). The mission
forbade forcing two correct answers into one by deletion; the twin stays as
an honest distractor — the item now measures exactly what ch1's katakana half
teaches: WHICH script the glyph belongs to. (The alternative — dropping the
twin — was rejected: it weakens the item to a sound-only judgment that the
listening family already measures, and erases the script-contrast practice
the chapter's second half is about.)

## 3. The remediation (applied by scripts/h25_fix_two_correct.py, verified item-by-item)

- **19 recall items**: `کانای «آ» کدام است؟` →
  `کانای کاتاکانا برای خوانش «آ» کدام است؟`
- **40 listening/warm items**: `…کدام کانا این صدا را دارد؟` →
  `…کدام کانای کاتاکانا این صدا را دارد؟`
- **59 twin rationales** rewritten from the false «کانای دیگری با همین ردیف.»
  to the true distinction:
  - recall: `«あ» همان خوانش است اما به خط هیراگانا — خواستهٔ سؤال کاتاکاناست.`
  - listening: `«あ» صدای درستی دارد اما به خط هیراگانا است — پاسخ باید کاتاکانا باشد.`
- Keys, key positions, option glyphs, types, difficulty: **unchanged** (no
  answer-key churn; the EQA-4 seeded shuffle keeps serving balanced positions).

Implementation note: the first scripted pass corrupted prompts (a rationale
regex overreached into the prompt block) — detected by the post-pass
verification, the file was reverted (`git checkout --`), and the script
rewritten with strictly block-scoped, anchor-bound replacements. Final state
verified mechanically: 59/59 prompts script-explicit, 59/59 twin rationales
name the script difference, zero collateral edits.

## 4. The audit's named case (mission requirement)

> «پاسخ فونتیک صحیح مانند あ برای صدای ア نباید صرفاً به دلیل اشتباه در
> منطق نگاشت، غلط تشخیص داده شود.»

With the remediation, あ for the ア-sound item is graded wrong ONLY because
the question now explicitly asks for katakana — and the learner is told
exactly that («صدای درستی دارد اما به خط هیراگانا است»), not a false claim
about rows. Pinned by test: `the audit's named case` in
tests/unit/h25-two-correct.test.ts.

## 5. Test coverage (tests/unit/h25-two-correct.test.ts — 6 tests, all green)

1. census: ZERO script-ambiguous two-correct items remain;
2. contract: every katakana-target item that keeps its hiragana twin is
   script-explicit AND its twin rationale names the script difference (≥59);
3. negative fixture: a mutated script-agnostic twin item FAILS the census
   (regression guard);
4. positive fixture: remediated prompt passes; sound-distinct sets pass
   unmodified;
5. recall family: all 19 ids individually pinned script-explicit;
6. the audit's named case (あ/ア) behaves as specified.

Full suite after Phase 2: **66 files / 770 tests passed**; typecheck clean.

## 6. Boundary notes

- The practice-module generator's two-correct rate (BUG-010, /practice) is a
  separate code path (modules/practice/kana/generator.ts distractor pools) —
  it is in scope for the Content Lint phase's census rule, not for content
  edits (the generator needs a same-script pool fix — assessed with the lint
  phase).
- Chapter 2's BUG-009 (chuugokujin؟) two-correct decode items are OUT of scope
  (recorded in the baseline for the lint, not fixed here).
