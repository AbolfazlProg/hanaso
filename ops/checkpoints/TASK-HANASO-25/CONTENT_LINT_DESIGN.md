# TASK-HANASO-25 — CONTENT LINT (Phase 5)

## Design
`tests/unit/h25-content-lint.test.ts` — context-aware lint over the REAL
bundled chapters (runs in the existing `pnpm test` CI job = already wired).
Field-role driven (exercise type + field drives each rule; not string-greps
over the file). Rules:

- CL-01 listening audio committed (BUG-001) — ch1 hard gate
- CL-02 two-correct/script-ambiguity (BUG-002)
- CL-03a/b rationale keys ↔ option ids, never the correct option (BUG-005)
- CL-04 listening rationales name sounds/twin-script facts (172/173)
- CL-05 recognition F1 never embeds the keyed reading (BUG-029)
- CL-06 no Arabic codepoints in Japanese fields (BUG-015; [نام] scaffold ok)
- CL-07 no «؟» annotations in option labels (BUG-009/021)
- CL-08 every practice exercise has a substantive hint (BUG-023)
- CL-09 listening f3 names the keyed glyph (answer/feedback agreement)
- CL-10 gate bank shape 5×5 measures (CP-01 contract; latent BUG-034)

## Verdicts
- ch1 (mission scope): ZERO violations — hard gate, all must stay clean.
- ch2 (out of scope): BASELINE recorded (CL-03b: 23 = BUG-005 family;
  CL-07: 11 = «؟» labels). Growth fails CI; shrinkage updates baseline.
- Fixtures: negative (mutated script-agnostic item is caught) + positive
  (the 487-item ch1 bank passes with zero false positives).
- Known limits (honest): CL-05 covers keyed-label embeds (the shipped bug
  class); paraphrased leaks need the subagent/human review layer. CL-06
  scans authored fields, not runtime props.
