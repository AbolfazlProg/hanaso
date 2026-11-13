# TASK-HANASO-23 — BROWSER TEST RESULTS (12 mission flows + viewport matrix + a11y + production)

> All runs on the local standalone build (identical code to production
> commit 3d8b8ccd; production itself verified read-only twice:
> 1.0.0-hanaso22-r01, home/journey 200, Persian 404). Real Chromium via
> playwright-core 1.57.0. 72 evidence PNGs total (see SCREENSHOT_INDEX).

## The 12 mission flows (each driven end-to-end; console captured)

| # | Flow | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Login/start (guest) | PASS — guest mint works, home renders | t1a/t2a flows |
| 2 | Enter chapter 1 | PASS — journey map + sections | t1a-vp-*-journey |
| 3 | Enter chapter 2 | PASS after honest gate pass (T3 verifier); with API-completes only, ch2 stays LOCKED (gate needs real item evidence — corroborates BUG-001) | t2a-360-ch2-* |
| 4 | Section/lesson moves | PASS — two sections, prerequisites enforced (locked rows explain themselves) | t1a-vp-*-journey |
| 5 | Exercise states (all kinds) | PASS — recognition/recall/listening/decode/cloze/build; the cloze multi-blank defect is content-level (BUG-003) | c3b-02a/b |
| 6 | Correct + wrong answers | PASS — F1/F2 ladder, elimination at attempt 2; wrong never plays the correct audio (spoiler fix, c3c-06a) | c3c-06a/b |
| 7 | Feedback + hint | feedback PASS; the «سرنخ» button is a no-op (BUG-023, c3c-03a/b); hint arrives automatically at attempt 2 | c3c-03a/b |
| 8 | Practice | PASS — honest empty state, focused sessions, 21-item run, recap; two-correct items appear at 1.5% (BUG-010) | t2a-360-practice-* |
| 9 | Lesson completion | PASS — panel + achievements (max 3 chips, honest labels) + score honest | c3c-06c, t1a-b8-completion |
| 10 | AIZEN seal | PASS — fresh completion animates (data-animate=true); revisit settled; replay stamps nothing (0 POSTs); stamp sound + persistent mute | t1a-b6-seal-* |
| 11 | Refresh + resume | PASS — walk snapshot restores position (۶/۱۵ stable); kana-card stage survives refresh; cross-session persists | t1a-b7-* |
| 12 | Locked stations | PASS — locked rows answer clicks with reason + prerequisite names; map «مرور» deep-links replay | t2a-flows-* |

Console/network across all 12 flows (re-driven at T2-A): **0 errors /
0 warnings / 0 pageerror / 0 HTTP≥400; 106 assets all 2xx; 0 external
requests.** 93 benign walk-save aborts (T2-A-04).

## Viewport matrix (360/390/430/768/1024/1440)

- Pages: journey map + station page (12 PNGs, t1a-vp-*) + at 360px
  additionally: /practice hub, practice session, ch2 journey + anchor
  dialogue, 404 page, exercise view (6 PNGs, t2a-360-*).
- Horizontal overflow: ZERO at every width on every page
  (document.scrollWidth == innerWidth).
- RTL/Japanese bidi: `<html dir="rtl">`; Japanese runs isolate LTR
  correctly (computed direction + explicit dir="ltr" on JP samples).
- Tap targets: primary controls ≥44px at 360 (radios 294×55, check
  117×44); sub-44 secondary only (BUG-030-family, Low).
- The writing canvas accepts real pointer strokes at mobile widths
  (guided/free/done stages all pass).

## Accessibility (B9)

- Roles: radiogroup/radio on options; status live regions on feedback
  (polite); tab order sane (nav → audio modes → options → actions).
- Keyboard: Tab focuses radios with visible 3px outlines; Enter answers.
- Focus management defect: focus drops to `<body>` after every
  answer/advance (BUG-038 — the one real a11y bug; the aria-checked
  hypothesis was REFUTED).
- Contrast: palette passes AA everywhere, core AAA (13.39/12.61/12.05);
  one token contract miss (spk-4-l 6.81 < 7.1 — Low).

## Offline / slow network

- Offline mid-walk: completion POST fails with role=alert Persian panel +
  one-click retry that recovers; grading offline fails honestly
  (t1a-b2-*).
- 2G throttle: station page header-only 5–10s with zero skeletons
  (BUG-036-family, Low); journey map renders progressively.

## Production (read-only)

- /api/health → 1.0.0-hanaso22-r01 @ 3d8b8ccd (== audited code; checked
  twice, ~5h apart).
- Home 200; ch1 journey 200 (84KB); 404 → 404 with the Persian page.
- ONE read-only GET to /poc/practice confirmed the answer-key leak
  (BUG-032) — no mutations were performed on production at any time.
