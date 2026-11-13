# TASK-HANASO-21 — BUG-009 Validation (Phase 3.1)

## What BUG-009 was

TASK-HANASO-20's audit left BUG-009 deferred with a documented owner-approved
decision: the 13+1 rule-listening exercises were TWO-alternative (2AFC) — a
50% blind-guess chance that inflated the 0.7 completion gate. The recorded
owner decision (from the TASK-20 backlog) was to retire 2AFC by giving every
pair a THIRD option drawn from its OWN documented error family.

## Independent validation performed (this mission)

1. **Read the documented design** — the TASK-20 remediation log's BUG-009
   entry and the recorded decision path (third option from the station
   deck's own contrast family, never a random word).
2. **Checked the pedagogical logic** — a distractor from the SAME contrast
   the station teaches (e.g. the half-voicing pair こご/ごこ) preserves the
   discrimination training intent; a random word would not. The error
   families are exactly the documented ones:
   order permutation (いえい) · half-voicing (こご/ごこ) · short variant (きょ) ·
   reversed fusion (しゃい) · long-e spelling (せんせえ) · final-mora drop
   (がっこ/ジュー) · devoicing (さっし) · plain-vs-handakuten (さんほ/えんひつ) ·
   missing final length (コーヒ) · same-deck vu-fusion (ヴァイル).
   No conflict with the current contracts was found — the design holds.
3. **Implemented exactly the documented design** (commit `90ca72c`):
   every rule-listening pair carries its third option + a Persian
   rationale in `distractorRationaleFa`; the validation gate moved
   rule-listening allowed option counts [2]→[2,3] (MCQ-THREE rule text
   updated; RULE-LISTENING-SHAPE records the HANASO-21 decision).
4. **Positive + negative tests** — the conversion test flipped: a 4-option
   rule-listening pair is REJECTED, and every shipped 3-option pair
   validates (EQA gate). Positive: the shipped deck passes
   (`tl14-rule-teaching.test.ts`). Negative: the 4-option fixture fails.
5. **Browser confirmation** — the E2E suite answers the rule-listening
   questions of stn-kana-k8 (`independent` block, 2× rule-listening) and
   stn-kana-k12-foreign (`guided`, 1× rule-listening) from the shipped
   3-option payloads: both stations complete on perfect walks (S2.2,
   S3.1) — the third option renders and grades through the real UI.

## Scope discipline

No new pedagogical decisions were invented: the third options and their
rationales are the documented ones only. No conflict serious enough to
freeze the design was found, so nothing was left un-implemented.
