# TASK-HANASO-21 — AIZEN Seal Browser Verification (Phase 2.5)

All checks from the real-browser E2E suite (46/46 green; evidence in
`screenshots/e2e/`):

| Required check | Evidence | Result |
| --- | --- | --- |
| Seal shown after a REAL lesson completion | S1.4 (h0), S2.4 (k8), S3.2 (k12-foreign), S4.2 (fm01 anchor) — fresh ceremony (`data-animate="true"`) | PASS |
| Correct on mobile | e2e-09 (`s4-seal-mobile-360.png`) — S4.3, seal fully visible at 360px | PASS |
| Correct on desktop | e2e-10 (`s4-seal-desktop-1440.png`) — S4.4 | PASS |
| Animation runs on FIRST completion | S1.4 / S2.4 `sealAnimate === true` | PASS |
| Stays after refresh | S1.10 — seal present, SETTLED | PASS |
| No re-run of the animation | S1.10 — `data-animate` absent on revisit | PASS |
| No duplicate on replay | S5.6c — replay end: NO seal stamp, NO complete POST | PASS |
| No duplicate seal on concurrent requests | S5.4b (double-click: one seal) + S5.7 (`already:true` settles) | PASS |

## Design review (VLM, on the actual screenshots)

- `e2e-02-s1-h0-seal-fresh.png` — "circular hanko-style stamp, red/vermilion
  with a lighter glow/halo; white kanji 藍染 carved into the red circle
  (vertical); genuinely an ink stamp rather than a flat circle — irregular
  edges, uneven ink coverage, distressed texture, double-ring border";
  Persian success message + single CTA present; no overlap, no broken RTL.
- `e2e-09-s4-seal-mobile-360.png` — seal fully visible inside the card; CTAs
  tappable; text wraps; nothing clipped.
- `e2e-11-s5-criterion-409-panel.png` — the recovery panel reviewed too:
  Persian explanation + «انجام دوبارهٔ تمرین پایانی» + progress-kept
  reassurance, clean layout.

## Screenshots (before / after completion)

- Before: `e2e-01-s1-home-firstvisit.png` (the very first visit), and the
  walk's pre-completion state is visible in `e2e-15-s5-resume-banner.png`.
- After: `e2e-02-s1-h0-seal-fresh.png` (h0), `e2e-06-s2-k8-seal-fresh.png`
  (the owner-bug station), `e2e-08-s4-fm01-anchor-seal.png` (fm01),
  `e2e-05-s1-h0-seal-settled-revisit.png` (settled impression).

The mere existence of an SVG/component in the repo is NOT the completion
proof — the proof is this file's evidence chain: every state above was
driven in a real browser against the production build.
