# TASK-HANASO-25 — ROUND-1 REMEDIATION (CP-06)

All seven Round-1 findings (register in SUBAGENT_REVIEW_ROUND_1.md) fixed:

| # | Fix | Verification |
| --- | --- | --- |
| R1 | «هیراگانا»/«کاتاکانا» leaked into 32 listening rationales (root cause: the glyph→reading map ingested k13-disc script-name keys) — rebuilt the map script-name-excluded, rewrote all 32 | grep = 0 occurrences; new lint rule CL-11 (script NAME in a reading slot) pins it |
| R2 | m5-4 internal contradiction — コ=«کو», heard sound=«کُ» consistently | item inspected + gate spec |
| R3 | m4-4 ヮ→モ; f2 names メ/モ (not ノ, which is not an option) | item inspected |
| R4 | remediate with empty weakMeasures (M1+M2 one-miss-each, 0.89<0.9): targeting now falls back to MISSED measures; fail-safe to two lowest | new property test (B2 case) asserts remediationStations non-empty + correct station |
| R5 | kana-recall promptAudio no longer rides the gate RSC payload (gate has no recall-sound panel) | assessment page inspected |
| R6 | auto-play effect gains cleanup (pauses outgoing element — no overlap) | mastery-gate.tsx inspected |
| R7 | transliteration normalization in touched items (は=ها، へ=هه، コ=کُ، ク=کو per the bank's own recognition labels = house convention) | reading-map derivation |

Note: the first R1 repair pass had a structural-rebuild bug that dropped the
M1/M3/M4 gate sections from the working file — caught by the post-pass
verification (mastery count 10 ≠ 25), the file was reset to the committed
state, and the pass rewritten as pure string replacements (scripts/
h25_r1_safe.py + h25_r1_twins.py). Committed state never contained the damage.

Test state: 69 files / 786 tests green; typecheck + ESLint clean.
