# C3-A — Verification round (redo) — C1-A + C2-A findings, chapters 1 & 2

Auditor: Subagent A of Round C3 (fresh-eyes verification). Scope: verdict per id for C1-A-01..17
and C2-A-01..11 — source spot-checks (re-read the cited file:line, confirm quoted text) + browser
reproductions of the top items on the local standalone build + positive validation (P-2) and a
recomputation of estMinutes (P-4). No inheritance of C1/C2 conclusions.

Verdict codes: VERIFIED-SOURCE (I re-read the cited source and the claim holds) ·
VERIFIED-BROWSER (reproduced in a real browser on the local build) · REFUTED · UNVERIFIED.

**STATUS: COMPLETE.** Provenance note (honest): subagent A filled the verdict
table and produced c3a-01a/b, then died in a subagent-infrastructure failure
(3 consecutive Task-launch timeouts — see CURRENT_STATE INCIDENT). The LEAD
completed the remaining browser reproductions (c3a-02a/b, 03a/b, 04a/b) via a
snapshot-injection technique (localStorage `hanaso.walk.v1.<lid>.…` with a
chosen stepIndex jumps straight to the target block — scripts
scripts/h23-audit/c3-lead{3,4,5}.mjs outside the worktree) and recomputed
P-4. No inheritance: every verdict below was re-derived by the named party.

## Verdict table

| ID | Title | Verdict |
| --- | --- | --- |
| C1-A-01 | ch2 prod exercise contradictory sentence | VERIFIED-SOURCE |
| C1-A-02 | ペ = ヘ+゛ (should be ゜) | VERIFIED-SOURCE |
| C1-A-03 | Arabic ن inside びょういん | VERIFIED-SOURCE |
| C1-A-04 | ファイル listening audio missing | VERIFIED-SOURCE |
| C1-A-05 | internal jargon in objectives | VERIFIED-SOURCE |
| C1-A-06 | ch2 stale turn numbers | VERIFIED-SOURCE |
| C1-A-07 | integrate accepts ungrammatical order | VERIFIED-SOURCE |
| C1-A-08 | katakana hostwords «قابل‌خواندن» | VERIFIED-SOURCE |
| C1-A-09 | FSRS wrap-up claims at empty stations | VERIFIED-SOURCE |
| C1-A-10 | duplicated phrase in 92 recall feedbacks | VERIFIED-SOURCE |
| C1-A-11 | wrap-up counters don't reconcile | VERIFIED-SOURCE |
| C1-A-12 | copy-hygiene cluster | VERIFIED-SOURCE |
| C1-A-13 | きよう overclaim | VERIFIED-SOURCE |
| C1-A-14 | がくせい gloss + しゃ etymology | VERIFIED-SOURCE |
| C1-A-15 | wrong positional hint v1 audio | VERIFIED-SOURCE |
| C1-A-16 | えい pattern never taught | VERIFIED-SOURCE |
| C1-A-17 | romaji convention differs | VERIFIED-SOURCE |
| C2-A-01 | ch2 dialogue audio all disabled | VERIFIED-BROWSER (c3a-01a/b by subagent A: stations 07+15, LineAudioButtons disabled incl. asset-ful l3, 0 audio network requests, API available:false) |
| C2-A-02 | けさ chip violates golden rule | VERIFIED-SOURCE |
| C2-A-03 | 3 pronFa factual errors | VERIFIED-SOURCE |
| C2-A-04 | ん in h4 rationale 3 units early | VERIFIED-SOURCE |
| C2-A-05 | ど never shown in ch1 | VERIFIED-SOURCE |
| C2-A-06 | も produced 7 stations early | VERIFIED-SOURCE |
| C2-A-07 | 15 cards show future confusables | VERIFIED-SOURCE |
| C2-A-08 | kana-teaching stroke/shape errors | VERIFIED-SOURCE |
| C2-A-09 | 8 glyphs have no anchor word | VERIFIED-SOURCE |
| C2-A-10 | ch2 boundary surfaces unreadable | VERIFIED-SOURCE |
| C2-A-11 | minor copy-hygiene extensions | VERIFIED-SOURCE |

## Browser reproductions (all DONE)

- c3a-01a/b (C2-A-01 ch2 dialogue audio) — subagent A, before the infra failure
- c3a-02a (C1-A-08: k1 card shows ウェイトレス under the «قابل‌خواندن» chip at block idx 3) — lead
- c3a-02b (C2-A-02: h2 け card shows けさ — さ untaught until h3 — at block idx 5) — lead
- c3a-03a (C1-A-02: k8 prereq renders ペ = «ヘ+゛» verbatim) — lead
- c3a-03b (C1-A-03: h12 step block renders the corrupted 「びょういن」 with Arabic ن at block idx 11) — lead
- c3a-04a/b (P-2: m1-reading items 1-2 use only registered taught hostwords) — lead

## Positive re-validations

- P-2 (milestone taught-only): VERIFIED-BROWSER (c3a-04a/b — the 6-item set
  draws only すし/ねこ/いぬ/えき/みず/ともだち + taught-hostword distractor meanings)
- P-4 (estMinutes): recomputed by lead — ch1: Σ 34 stations = 386 core + 20
  optional = 406 == declared 406; ch2: 60 + 11 = 71 == declared 71. HONEST.

## New findings (C3-A-nn)

- none (NOTE: the FIRST C3-A run — destroyed by the sandbox recycle — had
  reported 3 Low findings (K5-practice-contradiction refuted-mechanism,
  ヨーロッパ ッ never taught, chrk-yoroshiku lineRef stale). They were never
  re-verified after the incident; treat them as HYPOTHESIS only, carried in
  the Round-3 merge as unverified-loss, NOT in the bug register as CONFIRMED.)

## New findings (C3-A-nn)

- none yet
