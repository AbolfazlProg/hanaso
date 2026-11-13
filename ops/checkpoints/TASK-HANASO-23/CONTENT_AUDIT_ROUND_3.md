# TASK-HANASO-23 — CONTENT AUDIT ROUND 3 (verification; merged from 3 subagent reports + lead completion)

> Date: 2026-11-13 (completed across the sandbox-recycle incident; see
> CURRENT_STATE.md). Sources: `rounds/c3/{A,B,C}.md` + lead browser runs.
> Method: every C1/C2 claim re-derived with fresh eyes (no inheritance),
> source spot-checks + mechanical censuses + browser reproduction on the
> local standalone build (identical code, in-memory) + arithmetic.

## Provenance (honest)

- Subagents A/B/C each started Round C3; the Task infrastructure failed
  repeatedly (context-deadline timeouts — recorded in CURRENT_STATE.md
  INCIDENT). Net result: all three verdict tables were filled by the
  subagents themselves (§1 of each report); subagent A additionally
  produced c3a-01a/b, C produced 8 PNGs, B completed its full report
  (census + arithmetic + gate browser proof) and the lead completed the
  remaining browser shots (c3a-02a/b, 03a/b, 04a/b, c3b-02a/b, c3b-03,
  c3c-06c) via a snapshot-injection technique. 22 evidence PNGs total.

## Final verdict ledger (all 67 C1/C2 findings)

| Class | Count | Verdicts |
| --- | --- | --- |
| C1-A (17) | 17 | 16 VERIFIED-SOURCE · 0 refuted — plus browser for A-02, A-03, A-08 (c3a-03a/03b/02a) |
| C2-A (11) | 11 | 11 VERIFIED-SOURCE — plus browser for A-01 (c3a-01a/b), A-02 (c3a-02b) |
| C1-B (11) | 11 | 10 VERIFIED-SOURCE · **B-05 SPLIT**: authored-position bias verified as DATA, runtime learnability REFUTED (seeded shuffle serves 184/182/167; FM gist 6/6-a → served 2,2,1,0,2,0) |
| C2-B (10) | 10 | 10 VERIFIED-SOURCE — B-01 additionally VERIFIED-BROWSER + ARITHMETIC (P(pass)=1/243 per attempt; the binding constraint is minMeasure 0.8 ⇒ M2 3/3, M5 2/2 — perfect scores; escape hatch = item memory (m2-1/m2-2 byte-twins of station items), P=11.1% via memory vs 0.41% honest-listening); B-02 browser-proven (c3b-03); B-01 family browser-proven (c3b-02a/b) |
| C1-C (12) | 12 | 12 VERIFIED-SOURCE — browser for C-01 (c3c-01), C-02 (c3c-02a + live counter), C-05 (c3c-03a/b) |
| C2-C (13) | 13 | 13 VERIFIED-SOURCE — browser for C-02 (c3c-05a/b); C-01 census UPgraded by C3-C's own census (33/2000 mixed, 24/1540 focused — stronger than C2's 14/2000) |

**Net: 66 of 67 findings stand (98.5%); 1 finding split with its
learner-impact half REFUTED (C1-B-05).** No C1/C2 finding was wholly
refuted. Zero unverifiable.

## New findings this round (verification-discovered)

| ID | Severity | Finding |
| --- | --- | --- |
| C3-B-N1 | Low | «جفت اشتباه‌پذیر» rationale over-claims confusability in 48 option-rationale labels (C2-B-04 counted only 3+same-row=13 under its stricter cut); applying C2-B-04's own stated lint rule yields 48 — the generic template mislabels same-row siblings (さ/す, し/せ, め/モ, ふ/ヘ, れ/る, ぬ/に, ね/の, お/え, こ/く, ソ/ス, ツ/テ…) as documented confusables. Fix + regression test as in C2-B-04. |

## Lost-in-incident claims (NOT in the bug register — HYPOTHESIS only)

The first C3-A run (destroyed by the sandbox recycle before commit) had
reported 3 Low findings that were never re-verified: (1) the claim that
C2-A-03's プレゼント card contradicts practice K5 (mechanism refuted in the
lost run — プレゼント is not a registry hostWord so decodableWords() never
serves it); (2) ヨーロッパ hostWord contains never-taught ッ; (3)
chrk-yoroshiku replyFa lineRef L(9) stale (should be L13). If a remediation
mission touches these files, re-check them; they are recorded here as
HYPOTHESIS.

## Positives validated (live)

- **P-2 milestone honesty** — VERIFIED-BROWSER (c3a-04a/b): m1-reading items
  draw only registered taught hostwords.
- **P-4 estMinutes** — recomputed by lead: ch1 386+20=406 == 406 declared;
  ch2 60+11=71 == 71. HONEST.
- **Engine positives end-to-end** (c3c-06a/b/c): spoiler fix holds in the
  listening flow (wrong answer never plays the correct audio); attempt-2
  elimination; achievements max-3 chips.
- **EQA-4 seeded shuffle** — VALIDATED (10 deterministic re-runs; the one
  authoredbias finding that reaches learners is the C3-B-N1 rationale
  mislabeling, not position bias).

## Consolidated content-audit totals (after C3)

- **67 C1/C2 findings: 66 stand** — Critical 1 (C2-B-01), High 9 (after
  B-05's split; the 10th — B-05 — is data-only), Medium ~29, Low ~26 · plus
  C3-B-N1 (Low). All carry file:line evidence; 17 additionally carry live
  browser PNG proof; 1 carries the full arithmetic derivation.
- Answer-key correctness positive held under attack: 0 wrong keys in 557
  items (re-derived twice); the two-correct defects are ADDITIONAL-valid
  answer problems, not wrong keys.

## What enters the BUG REGISTER (from the content track)

All 66 standing findings + C3-B-N1, each with its verified status, evidence
file:line, and the PNG index where applicable. The remediation mission
should treat: C2-B-01 (Critical) → C1-B-01/C2-B-02 (60+2 items + strategy) →
C1-C-01/C-02 (ch2 rationale/numbering) → the rest by severity.
