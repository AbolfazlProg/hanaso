# TASK-HANASO-25 — HINT IMPLEMENTATION (Phase 4 / BUG-023)

## Root cause
The «سرنخ» button rendered ONLY inside the feedback panel while the hint
paragraph required `!feedback` — dead by construction. After «تلاش دوباره»
(feedback cleared) a stray «سرنخ…» label appeared (button label, not a hint).

## Fix
- **Server**: `action: 'hint'` on /api/curriculum/station — returns ONLY the
  authored `f2HintFa` for a practice exercise OF that station (404 on
  cross-station / mastery-pool / unknown). No options/key/rationale ever
  cross (answer-key discipline). Read-only for GUEST scope (H24 identity rules).
- **Client** (exercise-session.tsx): click → fetch → render `data-testid="hint-text"`
  inside the wrong-answer panel; disabled while loading/shown; retry and reset
  clear it; the learner keeps full answering ability (retry button stays live).
- **Content**: every ch1 practice exercise verified to have a substantive
  f2HintFa (one 5-char orphan `سا-ن.` on ex-kana-h7-nas-1 rewritten).

## Tests (tests/integration/h25-hint-action.spec.ts — 5, all green)
authored text returned; payload carries hintFa ONLY; 404 cross-station;
404 mastery-pool; every practice item has a hint. Full suite 68/780 green.

## Ladder interaction (design)
F1 (statement) → «سرنخ» (f2 mnemonic/confusable redirect — NOW functional) →
F2 server-elimination → F3 reveal + return-to-teaching. The hint never
names the key for recognition/decode (CP-03 leak rewrite guarantees this at
the content layer; the lint rule CL-09 pins it).
