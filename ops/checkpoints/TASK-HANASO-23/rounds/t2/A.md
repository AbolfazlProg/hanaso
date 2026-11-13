# T2-A — Adversarial frontend audit (attacks T1-A's report; ch1+ch2 learn surfaces)

> Provenance: Round T2 subagent A. Method: re-ran T1-A's flows with its own
> reusable techniques (scripts/h23-audit/t2a-*.mjs — 5 new scripts) against the
> local standalone build (identical code, in-memory, port 3131/3132). Every
> claim maps to a script output line quoted in this report or a t2a-*.png.
> Nothing inherited from T1-A without re-verification.

## §1 Verdicts on T1-A-01..03

| ID | Verdict | Basis |
| --- | --- | --- |
| T1-A-01 tap targets <44px | **VERIFIED, NARROWED** — primary learner controls are NOT affected; only secondary controls | re-measured 360px (t2a-verify360): exercise option radios **294×55**, «ادامه» **98×44**, practice options **328×56**, practice-check **117×44**, practice CTAs **196×48/199×48** — all ≥44. Sub-44 family = journey intro card, station replay buttons (T1's own list) **plus a new instance: /practice hub row chips «ردیف あ» 46×25** (t2a-360-practice-hub.png). Finding stands as Low, scoped to secondary controls. |
| T1-A-02 radio-Enter aria-checked null | **REFUTED** (no state gap) — measurement artifact; but re-probe exposed a real focus bug (→ T2-A-01) | slow re-probe (250/1000/2500 ms): before Enter radios carry `aria-checked="false"`; after Enter the radios **stay mounted** (`radiosVisible:2` at +250/+1000/+2500 ms) and the status region updates (t2a-verify360 probe1). The null reading = `document.activeElement` becomes `<body>` after answering, so `activeElement.getAttribute('aria-checked')` is null on body. Space behaves the same. T1's own suspicion ("measurement race") was correct. |
| T1-A-03 contrast UNVERIFIED | **RESOLVED — palette PASSES AA everywhere; core pairs AAA** | computed from tokens.css (t2a-contrast.mjs): ink/paper **13.39** (matches KB claim), paper/indigo **12.61** ✓, ink/surface-warm **12.05** AAA, ink/card 14.34 AAA, ink-soft/paper 6.64 AA, ai/paper 8.26 AAA, white/shu CTA **5.19 AA**, shu/paper 4.85 AA (focus ring ≥3:1 UI ✓), error/success/warning on paper 5.33/5.74/5.52 AA. Two doc/token contract nits → T2-A-02. |

## §2 New findings

### T2-A-01 — Keyboard focus is dropped to `<body>` after every answer and after block advance  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: station exercise blocks (station-runner), e.g. stn-kana-h4 idx 3 (rule-ask)
- Problem: answering via Enter or Space (or clicking «ادامه») leaves `document.activeElement === document.body`; focus is never moved to the feedback region or the next control.
- Expected: after an answer, move focus to the status/feedback region (or keep it on the option group / next block's first control) so keyboard users continue from where they were.
- Actual: `probe1 +250ms: {"activeRole":null,...}` and `ADVANCE focus/scroll: {"pre":{"active":"BODY"},"post":{"active":"BODY"}}` (t2a-verify360.mjs).
- Evidence: browser keyboard probe, two independent states (answer, advance), 360px context.
- Impact: keyboard-only / switch users must Tab through the whole document header again after EVERY step of a 13–15-block station — core-flow friction for that user class (T1-A's B9 saw the symptom but filed it as an aria-checked hypothesis).
- Suggested fix: on answer submit, `feedbackRef.current?.focus()` (status region with `tabindex="-1"`); on advance, focus next block's first control.
- Regression: a11y e2e — after Enter-answer assert `document.activeElement` is inside main, not body.

### T2-A-02 — Light-speaker violet `spk-4-l` breaks the tokens' own ≥7.1 contrast contract; KB "white/shu 4.85" figure is a mislabel  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/styles/tokens.css:58 (contract «روشن روی نیلی (≥7.1)»), :62 (`--color-speaker-4-l: #c9aede` — TASK-LEARNING-06), :48 (claim `white/shu 4.85:1`)
- Problem: (a) `#c9aede` on indigo `#173049` computes **6.81:1** — below the ≥7.1 light-speaker floor the same file declares (speakers 1–3-l: 7.16/7.19/7.76). (b) white on shu is actually **5.19:1**; 4.85 is the shu-on-paper ratio — the KB/tokens comment mislabels it.
- Expected: all light speakers ≥7.1:1 on indigo; documented claim figures match reality.
- Actual: 6.81:1 (computed, t2a-contrast.mjs, WCAG formula identical to the one reproducing the KB's other figures exactly).
- Impact: none for WCAG AA (passes 4.5) — chr-kim's name/bubble text on dark scenes is slightly below the art-direction contract; doc figure could mislead future remediation.
- Suggested fix: darken `--color-speaker-4-l` one step (e.g. ~#b99cd6 ≈7.1) originating in the KB per tokens.css rules; correct the white/shu comment.
- Regression: unit test over the :root light-speaker list asserting ratio ≥7.1 on --color-indigo.

### T2-A-03 — Station page shows a header-only, zero-control screen for 5–10 s on slow networks (no skeleton)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: station route `/learn/kana-foundation-01/journey/[station]` (stn-kana-h1 probe)
- Problem: under emulated 2G (CDP `Network.emulateNetworkConditions`, 400 ms latency / 50 KB/s, cache disabled) the station paints only ~91 chars with **0 enabled buttons and 0 skeleton elements** at +2.5 s; full content (1142 chars, 5 controls) only by +8 s. No shimmer/skeleton appears at any sample despite `--dur-shimmer` existing in tokens.css for "skeleton loop".
- Expected: a skeleton/placeholder (the design system has shimmer tokens) or at least a progress affordance while station data loads.
- Actual: `THROTTLE station +2.5s: {"txtLen":91,"skeleton":0,...,"enabledBtns":0}` → `+8s: {"txtLen":1142,...,"enabledBtns":5}` (t2a-throttle.mjs). Journey map is fine (DCL 2.8 s, content at +2 s). No errors, no blank overflow.
- Impact: on 2G a learner stares at a near-empty station page for 5–10 s with no feedback — perceived breakage risk.
- Suggested fix: render the station skeleton (existing shimmer token) until station data resolves.
- Regression: e2e with CDP throttle asserting a skeleton node exists while `enabledBtns === 0`.

### T2-A-04 — 93 walk-persistence POSTs aborted (net::ERR_ABORTED) during the 12-flow drive  [SEVERITY: Low] [STATUS: HYPOTHESIS]
- Location: POST /api/curriculum/station during station walk / replay (observed from journey map context)
- Problem: raw request failures in the flows run are 93, all one deduped kind: `POST /api/curriculum/station net::ERR_ABORTED` — step-save POSTs cancelled by rapid advance/navigation.
- Expected: saves either debounced or fire-and-forget-tolerant with a resync so server walk state never lags silently.
- Actual: `COUNTS: {"consoleError":0,...,"reqfail":93,...}` / `DEDUPED ISSUE KINDS: 1` (t2a-flows.mjs). No user-visible loss in any flow (offline panel + snapshot restore + replay all behave — §3), so impact is unproven server-side.
- Impact: potential silent server-side walk-state lag until the next successful save (client localStorage snapshot masks it).
- Suggested fix: debounce walk saves; on `visibilitychange`/`pagehide` flush once (fetch keepalive).
- Regression: e2e — rapid-advance a station, then inspect server walk stepIndex via fresh-context resume.

Non-findings closed: my first ch1 "full complete" returned 409 for k13/m2 — that was an incomplete slug list on my side (k12-foreign/opt stations missing); with all 35 slugs every complete is 200 (`all statuses: 200×35`). No product defect.

## §3 Attacks on T1-A's 9 positives

1. **Responsive clean** — ATTACKED on the surfaces T1 never tested: /practice hub + session, ch2 journey, ch2 anchor, 404 — all at 360×740 touch: `sw==cw==360` everywhere (t2a-verify360). **HOLDS (extended).** Note: ch2 *unlocked* surfaces unreachable (see Coverage).
2. **RTL/bidi correct** — light re-check: practice JP chips («ردیف あ» etc.) and ch2 lock header render clean, no garbled runs. **HOLDS** (deep ch2 dialogue bidi untested — behind gate).
3. **Offline resilience** — ATTACKED with retry-spam: 5 rapid clicks on the retry button while still offline → `{"failedStill":true,"complete":false,"bodySane":true}` (no crash, no double-recover), then one online retry → `{"complete":true,"failed":false,"seal":true}` (t2a-offline-retry-spam.png). **HOLDS under attack.**
4. **Writing canvas strokes** — NOT re-attacked in browser (time budget); T1's t1a-b5 PNG chain stands unrefuted.
5. **Seal + completion idempotency** — ATTACKED: replay («مرور») + 6 rapid «ادامه» clicks → `complete-POSTs during replay = 0` (t2a-flows F10b). **HOLDS under attack.**
6. **Refresh persistence** — ATTACKED with adversarial snapshot `stepIndex: 999` + garbage `kanaCardStages: {bogus:'guided'}`: clamped sanely to `counter "۱۵ / ۱۵"`, 0 pageerrors, 2 enabled buttons (t2a-snapshot-999.png); mid-walk restore re-verified (h5 → `۳ / ۱۳`). **HOLDS under attack.**
7. **Audio surface** — re-verified via network: 106 asset requests (audio/fonts/writing/media) across the 12 flows, `ASSET NON-2xx/304: 0`. **HOLDS.**
8. **Fonts self-hosted** — `EXTERNAL (non-local) requests: []` for the entire 12-flow run; 6 local font resources on the ch2 journey load. **HOLDS.**
9. **404 behaves** — at 360px: HTTP 404, Persian page («این صفحه پیدا نشد…»), `sw==cw==360` (t2a-360-404.png). **HOLDS.**

## §4 Coverage

- **Scripts** (all under scripts/h23-audit/): t2a-contrast.mjs (24 token pairs computed), t2a-verify360.mjs (360px: h4 exercise taps/touch-action, Enter+Space slow probes ×2, advance focus/scroll, 404, /practice hub+session, ch2 journey+anchor), t2a-flows.mjs (12 mission flows, console/pageerror/network capture), t2a-throttle.mjs (CDP 2G on journey+station; offline retry-spam; snapshot-999), t2a-ch2unlock.mjs (35-station complete census + ch2 gate).
- **Flows re-driven**: all 12 of T1-A's B8 flows (guest start, ch1 journey, ch2 lock, section moves, wrong-answer/hint/retry, completion+seal, seal revisit, replay, mid-walk refresh, locked row, practice session ~20 answers).
- **Viewports**: 360×740 touch (new surfaces) + 1366×900 (flows, throttle).
- **Console-error totals (closes T1-A's B8 gap)**: 12 flows — **0 console.error, 0 console.warning, 0 pageerror, 0 HTTP ≥400**; 93 request-aborts of one kind (T2-A-04). 360px runs — 0 pageerrors (the only console.errors were my own out-of-order API 409s and the intentional 404 document).
- **Blocked / not covered**: ch2 *unlocked* surfaces at 360 (journey content, anchor dialogue player) — unreachable: after completing **all 35 ch1 stations with score 1 via API, ch2 remains locked** (`locked:true`, t2a-ch2unlock) because the chapter gate is mastery-measure-driven (minMeasure 0.8 needs real per-item evidence — corroborates content-track C2-B-01 from the frontend side). Writing canvas not re-attacked. Practice session driven to ~20 answers without reaching recap (loop cap), recap UI not re-shot.
- **PNGs**: t2a-360-h4-exercise, t2a-360-radio-space, t2a-360-404, t2a-360-practice-hub, t2a-360-practice-session, t2a-360-ch2-journey, t2a-360-ch2-journey-unlocked (still locked), t2a-360-ch2-anchor, t2a-360-ch2-anchor-unlocked, t2a-360-ch2-anchor-mid, t2a-throttle-journey-early/late, t2a-throttle-station-early/late, t2a-offline-retry-spam, t2a-snapshot-999, t2a-flows-wrong-hint/completion/practice.
