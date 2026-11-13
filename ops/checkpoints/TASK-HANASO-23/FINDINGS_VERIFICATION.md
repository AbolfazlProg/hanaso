# TASK-HANASO-23 — FINDINGS VERIFICATION (final status of every claim, post 6 rounds)

> This file separates CONFIRMED bugs from REFUTED claims and HYPOTHESES —
> the mission's honesty requirement. "Verified" means re-derived by an
> independent verifier with its own evidence (never inherited).

## Verification funnel

112 raw findings (content 67 + technical 45) → after adversarial + verification
rounds: **103 stand CONFIRMED** (1 Critical, 12 High, 26 Medium, 34 Low
listed, plus folded cross-references), **5 claims REFUTED**, **4
HYPOTHESIS-LOST** (incident), 0 unverifiable.

## REFUTED claims (with the refuting evidence)

| Original claim | Refuted by | Evidence |
| --- | --- | --- |
| C1-B-05 — authored key-position bias is learner-learnable | C2-B (runtime), confirmed C3-B | the EQA-4 seeded shuffle (grading.ts:313-331) serves uniform positions (184/182/167 over 10 deterministic re-runs); FM gist 6/6 authored-a → served 2,2,1,0,2,0; residual local lumps only (Low) |
| T1-A-02 — radio Enter leaves aria-checked null | T2-A | aria-checked="false" present pre-answer; radios stay mounted; the null was a focus→body artifact — the real bug it hid: T2-A-01 (CONFIRMED separately) |
| T1-A-03 — contrast unverified gap | T2-A | RESOLVED: palette passes AA everywhere, core AAA 13.39/12.61/12.05 (one token contract miss remains — Low) |
| T1-B-06 as stated — punitive exercise_threshold stations exist | T2-B | zero exercise_threshold stations exist today; score:1 → 409; narrowed to the design-trust point (T2-B-05) |
| T2-B §P2 — "401 learner/no_identity reproduced on grade" | T3 (wire level) | no-cookie/invalid-cookie POSTs get a middleware-minted UUID → 200/409, never 401; REFRAMED as T3-01 (unauthenticated row growth — CONFIRMED as a different, real finding) |
| (C3-verifier's own) F2 leak 2/10 | T3 | substring artifact («ن»⊂«کن», «یا»⊂«یادسپارش») — T1-B-03's "F2 clean" stands |

## Narrowed findings (verified in a narrower form — the narrow form is what's in the BUG REGISTER)

| Finding | Narrowing |
| --- | --- |
| C1-A-08 | hostWord violations: 18 (not 11); «all 46 hiragana pass» sub-claim refuted by けさ |
| C1-B-03/B-09.2 | chuugokujin؟ upgraded to two-correct (BUG-009) |
| C1-B-10 | 82.9% d2 (not ~90%); d1/d3 usage is systematic |
| C1-B-04 | gate recycling: 7 items (not 4) |
| C1-C-01 | mis-keyed rationales: 23 (not 21) |
| C1-C-02/A-06 | ~27 stale strings (not ~20); impact strengthened by the live player counter |
| C1-A-11/C-07 | CONFIRMED at the learner-facing level; absolute N5 totals stay unverifiable in-repo (dataset not bundled) |
| C1-A positives P-3 | pronFa «unusually accurate» — partially refuted (3 factual errors); the 28-of-31 remainder holds |
| T1-B-03 | recognition-only (10/10); listening + recall clean at F1/F2 |
| T2-C-01 | bank 13 items (not 14 — M1×3); substance intact; two independent derivations agree (C3-B 1/243) |
| T1-C-04 | 16 non-null assertions by the stricter count (24 by the looser) — sites real either way |
| T1-C-13 | 57/5/7 test files (not 61/5/8) |
| T1-C-14 | observability gap is ticketed (OTD-011) — known, not unknown |
| C2-A-03 | the プレゼント-practice contradiction mechanism REFUTED (not a registry hostWord — decodableWords never serves it); the other 2 pronFa errors stand |

## HYPOTHESIS-LOST (sandbox incident; re-check during remediation)

1. C3-A-01 — K5 practice would contradict the プレゼント card (mechanism
   refuted in the lost run; never re-verified after the incident).
2. C3-A-02 — ヨーロッパ hostWord contains never-taught ッ.
3. C3-A-03 — chrk-yoroshiku replyFa lineRef stale (should be L13).
4. (budget-skipped, not lost) T2-A's 2G runtime throttle (source-verified
   only) and the /practice chip tap-size probe (PNG stands).

## Cross-derivation agreements (the strongest confirmations)

- **The contradictory sentence** (がくせいではありません。がくせいです):
  found independently by 3 agents in C1, re-verified in C3.
- **The stale-turn inventory** (~27 strings): 2 independent agents, same
  list, then strengthened by the live player counter.
- **The 60-item two-correct list**: derived identically twice (0 added, 0
  removed), then browser-proven 3× (recall, listening, gate).
- **The gate arithmetic**: two independent derivations AGREE (C3-B:
  P=1/243 via 3⁻⁵ on the M2∪M5 items; T2-C/T3: any-single-error ⇒
  remediate, weighted never binds) — plus the T2-A frontend corroboration
  (35/35 stations completed, ch2 still locked).
- **Answer-key integrity**: 0 wrong keys in 557 items — verified by 3
  independent agents; the shipped defects are additional-valid answers,
  not wrong keys.

## Positive-claim validation (all re-attacked, all held unless noted)

Engine: spoiler fix (browser ×2), retry/elimination (browser),
predictions-never-punished (source), achievements max-3 (browser),
estMinutes honest (3 computations), milestone taught-only law (browser +
mechanical), prerequisite discipline (3 independent implementations, 0
violations in 475), jargon-on-first-use, honest labeling, single-flight
completion, additive migrations, no-external-requests, key-stripping on
learn surfaces (probed), traversal-blocked slugs, no-N+1 (measured ×2).
Narrowed/lost: P-3 phonetics (2 of 3 errors stand), «all 46 hiragana
hostwords» (refuted), «no length giveaways» (refuted — 42 items),
«warm clones key-rotated» (partly refuted — 23 same-position), kana-
teaching «exemplary» (narrowed — 5 stroke-fact errors).
