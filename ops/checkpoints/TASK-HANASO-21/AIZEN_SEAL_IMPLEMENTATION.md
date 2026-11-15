# TASK-HANASO-21 — AIZEN Seal Implementation (Phase 2.3 / 2.4)

Commit `471f731` — `feat(learning): TASK-HANASO-21 — the AIZEN completion
seal (Aizen no inkan)`.

## Files

- `src/components/curriculum/aizen-seal.tsx` — the SVG art component
  (`data-aizen-seal`, `data-animate="true"` only during the ceremony,
  `data-aizen-seal-halo`, `role="img"` + Persian `aria-label`
  «مُهر فهم — پایان مرحلهٔ D»).
- `src/styles/globals.css` — the ceremony keyframes (enter/descend+rotate →
  press → squash → halo spread → settle), all durations derived from
  `--dur-ceremonial`; `.aizen-seal-art` uses logical properties
  (inline-size/block-size — TASK-21 stylelint pass); reduced-motion →
  simple fade.
- `src/components/curriculum/station-runner.tsx` — the mount point inside
  the completion panel (`data-aizen-seal-frame`, `animate={freshCompletion}`).
- `src/messages/fa.ts` — `aizenSealLabel`.

## Idempotency & persistence (Phase 2.4) — the seal is the PERSISTED fact

- `freshCompletion` is true ONLY when the complete response is a FRESH 200
  (`already !== true`) — the ceremony runs exactly once per real completion.
- **Refresh / revisit** of a completed station: the station page renders the
  completion panel with the seal SETTLED — `data-animate` absent — the
  animation never re-runs (E2E S1.10).
- **Replay** (`?mode=review`): the replay end panel carries NO seal —
  nothing was re-registered (E2E S5.6c).
- **Re-complete / double-click**: the server answers `already:true` → the
  seal settles without re-stamping; the single-flight guard means one POST,
  one seal (E2E S5.4, S5.7).
- The seal state is NOT React-local: it derives from the server-confirmed
  completion (the persisted station-progress row), so any device/session
  shows the same settled impression.

## Tests

`tests/unit/ui/aizen-seal.test.tsx` (6): the real hanko vocabulary (藍染
glyphs present, shu/paper tokens, ink-skip chips), fresh-completion stamps
with `data-animate`, `already:true` settles, revisit settled, replay-end
carries NO seal, and the reduced-motion token contract.
