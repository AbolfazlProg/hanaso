# TASK-HANASO-23 — SCREENSHOT INDEX (75 PNGs; 73 in screenshots/ + 2 in rounds/t3/)

> Every PNG was sanity-checked (non-blank, real content) programmatically;
> the round reports cite them as evidence. Naming: c3* = content round 3,
> t1a/t2a/t3* = technical rounds.

## Content verification (23 — screenshots/c3*)

| File | Shows |
| --- | --- |
| c3a-01a/b | ch2 station 07/15: line-audio buttons disabled (incl. asset-ful l3); zero audio network requests — BUG-008 |
| c3a-02a | k1 ウ card shows ウェイトレス under «واژهٔ قابل‌خواندن» — BUG-018 |
| c3a-02b | h2 け card shows けさ (さ untaught until h3) — BUG-018 |
| c3a-03a | k8 prereq renders ペ = «ヘ+゛» verbatim — BUG-014 |
| c3a-03b | h12 step block renders corrupted 「びょういن» (Arabic ن) — BUG-015 |
| c3a-04a/b | m1-reading items 1–2 (taught hostwords only — positive P-2) |
| c3b-01a/b | ch1 gate page: listening item with options, no audio player, network log with 0 audio requests — BUG-001 (Critical) |
| c3b-02a | rcl-kata-a answered あ (the hiragana twin) → marked wrong + false rationale «کانای دیگری با همین ردیف» — BUG-002 |
| c3b-02b | lis-kata-a answered あ (cross-script twin, sound-only prompt) → marked wrong — BUG-002 |
| c3b-03 | rcl-kata-i answered イ (sole katakana = the key) → correct without katakana knowledge — BUG-002 strategy |
| c3c-01 | mis-keyed rationale: picked option gets no rationale (or a mismatched one) — BUG-005 |
| c3c-02a | live player counter «خط N از ۱۳» — BUG-006 impact |
| c3c-03a/b | «سرنخ» hint no-op; stray «سرنخ…» label after retry — BUG-023 |
| c3c-05a/b | gate-pass «کارت‌های مرور فردا» vs home «به‌زودی» — the honesty contradiction |
| c3c-06a | spoiler fix: wrong listening answer does NOT play the correct audio (positive) |
| c3c-06b | attempt-2 elimination: one wrong option disappears (positive) |
| c3c-06c | achievements: max-3 chips on the m1 completion panel (positive) |
| c3c-07 | gateLead screen |

## Frontend T1 (31 — screenshots/t1a-*)

| Group | Files | Shows |
| --- | --- | --- |
| 404 | t1a-b1-404 | Persian 404 page |
| offline | t1a-b2-{offline-failure,grading,completion-fail,completion-recovered} | honest failure panel + one-click recovery |
| writing | t1a-b5-stage-{intro,ready,guided,free,done} | full writing stage chain with real strokes |
| seal | t1a-b6-{seal-fresh,seal-revisit,replay-ended} | fresh animation vs settled revisit; replay 0 POSTs |
| persistence | t1a-b7-{midwalk-refresh,card-stage-restore,revisit-completed} | snapshot restore incl. kana-card stage |
| flows | t1a-b8-{completion,practice,wrong-hint} | completion panel, practice, feedback |
| viewports | t1a-vp-{360,390,430,768,1024,1440}-{journey,station} ×12 | zero overflow at every width |

## Frontend adversarial T2 (19 — screenshots/t2a-*)

| Group | Files | Shows |
| --- | --- | --- |
| 360px extras | t2a-360-{practice-hub,practice-session,radio-space,404} | mobile surfaces beyond the matrix |
| ch2 at 360 | t2a-360-ch2-{journey,journey-unlocked,anchor,anchor-mid,anchor-unlocked} | ch2 mobile surfaces after honest gate pass |
| exercise | t2a-360-h4-exercise | options at 360 |
| flows re-drive | t2a-flows-{completion,practice,wrong-hint} | console totals 0/0/0/0 |
| offline | t2a-offline-retry-spam | retry-spam ×5 recovers |
| snapshot clamp | t2a-snapshot-999 | stepIndex 999 clamps to ۱۵/۱۵ |
| 2G | t2a-throttle-{journey,station}-{early,late} | header-only 5–10s, zero skeletons — BUG-036-family |

## Technical verification T3 (2 — rounds/t3/)

| File | Shows |
| --- | --- |
| t3/t3-focus-post-answer.png | focus dropped to `<body>` after answer — BUG-038 |
| t3/t3-journey-360.png | journey re-measured at 360 |
