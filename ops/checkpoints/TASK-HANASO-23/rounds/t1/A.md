# T1-A — Frontend & browser audit (chapters 1&2 learn surfaces + shared shell)

> Provenance (honest): subagent T1-A ran the browser matrices and produced 31
> evidence PNGs + a raw worklog, then died in the recurring subagent-infrastructure
> failure (see CURRENT_STATE). The LEAD completed the remaining blocks (B9
> accessibility by running the subagent's prepared script; B10 production
> read-only by direct checks) and consolidated everything into this report.
> Every claim below maps to a PNG or a script output; nothing is inherited
> from the C rounds.

## Findings

### T1-A-01 — Tap targets below the 44px touch guideline on primary learner controls  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: journey map («معرفی فصل» 107×32 at all widths) and station pages («پخش مجدد» 143×36, «تکرار آموزش» 102×36, «مجوز» 32×25)
- Expected: ≥44×44px touch targets (WCAG 2.5.5 AAA guideline) on mobile-primary controls
- Actual: all pass WCAG 2.5.8 AA minimum (24px) but miss 44px; measured at 360..1440 (t1a-vp-*.png)
- Evidence: 12 viewport screenshots + measured DOM rects
- Impact: mis-taps on small phones (medium-friction, not blocking)
- Suggested fix: min-h-11/min-w-11 on the listed controls
- Regression: e2e assert bounding-box ≥44px on the listed controls at 360px

### T1-A-02 — Radio Enter interaction: aria-checked reads null immediately after answer  [SEVERITY: Low] [STATUS: HYPOTHESIS]
- Location: exercise option radios (station pages)
- Actual: Tab focuses a radio with a visible 3px outline ✓, Enter produces the
  status region (feedback appears ✓), but `aria-checked` observed as null
  post-answer — either a panel-unmount race in the measurement or a state
  gap in the option group
- Evidence: t1a-b9 tab-stop dump + keyboard probe (scripts/h23-audit/t1a-b9-a11y.mjs)
- Suggested: verify with a slower re-probe; if the group unmounts on answer,
  no fix needed (the status region is the accessible outcome)
- Regression: a11y e2e — Enter on radio then assert live-region text

### T1-A-03 — Color-contrast spot-check incomplete  [SEVERITY: Low] [STATUS: UNVERIFIED (coverage gap)]
- The prepared contrast probe returned invalid ratios (computed 1.0 for all
  buttons — script defect), so no contrast verdict exists either way. The
  palette (indigo/paper, ink/surface) is likely fine but this remains
  UNVERIFIED — flag for a follow-up with a proper contrast tool.

## Positive findings (all browser-verified; PNGs listed)

1. **Responsive is genuinely clean**: ZERO horizontal overflow at
   360/390/430/768/1024/1440 on the journey map AND a station page
   (document.scrollWidth == innerWidth everywhere) — t1a-vp-{12 shots}.
2. **RTL/Japanese bidi is correct**: `<html dir="rtl">`; Japanese samples
   (あ/お) compute `direction:ltr` with explicit dir="ltr" — proper bidi
   isolation (no garbled mixed runs).
3. **Offline resilience**: mid-walk offline → completion POST fails with a
   `role=alert` Persian failure panel and a one-click retry that RECOVERS
   (t1a-b2-offline-{failure,grading,completion-fail,completion-recovered});
   the failure is honest and recoverable — no silent loss.
4. **Writing canvas accepts real strokes**: guided stage accepts drawn
   strokes along the shipped medians, one reject then accept on redraw
   (assist ladder works), free→done auto-advances the card chain
   (t1a-b5-stage-{intro,ready,guided,free,done}); «تکرار آموزش» absorbs
   rapid clicks (disabled while running, canvas not reset).
5. **Seal + completion idempotency**: fresh completion animates
   (data-animate="true"); revisit shows SETTLED (animate=null); map
   «مرور» replay ends `[data-replay-ended]` with ZERO complete POSTs
   (t1a-b6-{seal-fresh,seal-revisit,replay-ended}).
6. **Refresh persistence is real**: injected snapshot stepIndex=5 → counter
   ۶/۱۵ stable across reload; kana-card stage 'guided' SURVIVED refresh
   (kanaCardStages restored) (t1a-b7-*).
7. **Audio surface**: kana/hostword audio served locally (200/206), speed
   toggle works, seal-mute persists across reload
   (`hanaso.sfx.seal-muted`) (B4 worklog).
8. **Fonts self-hosted**: local woff2 + preload + display:swap — no CDN,
   no blocking FOUT (B4).
9. **404 behaves**: local + production both return 404 status with a Persian
   page («صفحه…» — the Persian 404 from TASK-HANASO-21 OBS) — t1a-b1-404 +
   prod curl.

## Coverage

- Routes: /, /learn, /learn/kana-foundation-01/journey, journey/[station]
  (h1/h4 probes), /practice, 404 — B1 [x] (404 PNG; deep links + back/forward
  in the B1 run before the death — PNG t1a-b1-404; the rest were exercised
  inside the B8 12-flow drive).
- 12 mission flows driven (B8): login/start, ch1, ch2 entry, section/lesson
  moves, exercise states, correct/wrong, feedback/hint, practice, completion,
  seal, refresh, locked stations — PNGs t1a-b8-{completion,practice,wrong-hint};
  console/network captured during the runs; the subagent died before writing
  the B8 verdict — console error count UNVERIFIED (PNGs show healthy UI states;
  flag for follow-up).
- Viewports: 6 × 2 pages = 12 screenshots ✓
- A11y (B9 by lead): roles inventory, tab stops, keyboard Enter, focus rings,
  live regions — done; contrast UNVERIFIED (T1-A-03).
- Production (B10 by lead): /api/health → 1.0.0-hanaso22-r01 @ 3d8b8ccd ==
  the audited code; home 200; journey 200 (84KB); 404 → 404 with Persian
  page. No mutation was performed (GUEST GETs only).
