# TASK-HANASO-23 — PERFORMANCE AUDIT (runtime, payload, bundle, data)

> Consolidated from T1-C (measurements), T2-C, T3 (re-measured). All
> numbers re-derived at least twice on the standalone build (identical
> code); the largest-chunk and registry numbers reproduced exactly
> (229,813 B / 183,690 B).

## Runtime & payload (measured)

| Metric | Value | Verdict |
| --- | --- | --- |
| Journey page RSC+HTML | ~84 KB | lean |
| Station page payload | ~35 KB | lean |
| Largest JS chunk | 229,813 B (~224 KB) | fine for the learn path |
| Total static JS | ~3.5 MB across 31 chunks | fine |
| Kana registry chunk (glyph metadata only) | 183,690 B | largest data block — contract-safe (no answer keys), flagged Low |
| Answer keys in client chunks | 0 hits across all chunks + RSC payloads (learn surfaces) | verified twice |
| External requests | 0 (0 CDN refs; fonts/audio/writing-data all self-hosted) | excellent for the target region |
| N+1 queries | NONE — journey GET = 2 batched queries (listForUnit inArray + chapter get); stations map-joined | verified |
| DB write batching | NOT batched: practice complete = 1 + N read-modify-write upserts (see reliability) | gap |

## Rendering & interaction performance

- **No N+1, no station-content shipping to the client** — the
  content-as-code stays server-side; only glyph metadata ships.
- WritingCanvas re-renders per pointer-move (O(n²) array copies per
  stroke) — bounded to the canvas leaf component (station-runner NOT
  re-rendered per keystroke); the round's feared hazard is bounded.
- StationRunner: 2,801 lines, no React.memo in the learn trio; 5
  audio Record maps passed as props (prop-map passing). No measured
  jank found in the 12-flow drive (0 console errors), but the shape is
  a refactor-debt hazard, not a today-bug.
- 2G behavior: station page shows header-only for 5–10s with ZERO
  skeletons (T2-A-03) — the one real UX-performance defect.
- 93 aborted walk-save POSTs across the 12 flows (navigation aborts —
  benign today; a keepalive/abort-handle pass is Low).

## Reliability & data integrity (performance-adjacent)

- **Zero `.transaction` repo-wide** (T2-C-04): multi-step writes fold
  sequentially — crash/concurrency leaves partial state (session
  recorded, LO states half-folded); last-write-wins on read-modify-write
  upserts can lose folds under double-submit.
- **Event store in-memory ALWAYS** (T2-C-03): every learning event
  (fsrs_cards_enrolled, remediation_triggered, chapter_completed) dies
  on restart while progress rows survive — the FSRS "replay from the
  event log" promise is structurally void. This is the biggest
  durability gap.
- In-memory-only surfaces: events ring; `sweepExpired` never called in
  production (in-flight practice-session Map grows until restart —
  T1-B-08).
- Walk snapshot codec: raw JSON.parse cast — corrupted snapshots
  inject arbitrary shapes (no wrong-position guarantee — T1-C-03).

## Assets

- 185 kana audio + 153 hostword entries + SFX: all local, 200/206;
  106 assets all 2xx in the flow drive; missing-audio degrades visibly
  (honest labels) except the two systemic audio bugs (ch2 dialogue
  disabled — C2-A-01; gate audio — C2-B-01; both are wiring, not
  assets: the files exist on disk).
- Fonts: self-hosted woff2, preload + display:swap (no blocking FOUT).
- writing-data: per-glyph JSON all 200.

## Dependency health

- 21 direct deps, all current majors (read from package.json +
  pnpm-lock; no audit tool run in-sandbox — honest gap, Low).
- No runtime CDN dependency — regional-access resilient.

## Verdict

Performance is NOT a risk area for this product today: payloads are
lean, no N+1, no external requests, no key shipping, measured clean
across viewports and the 12 flows. The gaps are **durability
(transactions, event store) and polish (2G skeletons)**, not throughput.
