# TASK-HANASO-21 — AIZEN Seal Design (Phase 2.1 / 2.2)

## Identity — Aizen's own hanko (藍染の印鑑)

Not a badge, not an emoji, not a plain circle with 理解 text. The seal is a
**hand-carved vermilion hanko impression**, drawn as deterministic pure SVG
(`src/components/curriculum/aizen-seal.tsx`):

- **Color** — shu vermilion, the design system's DEDICATED seal accent
  (DD-084 tokens `--color-shu` / `--color-shu-deep`; paper-colored negative
  glyphs). Tokens only — no raw colors.
- **Carving** — 藍染 (Aizen, "indigo-dyed") carved **relief-negative**:
  paper-colored glyphs on the shu disc, vertical tategaki, inside a carved
  inner ring — the vocabulary of a real rakkan impression.
- **Ink realism** — ink-skip chips at the impression edge (the stamp never
  inked perfectly), a subtle carved-stone grain filter over the impression
  (progressive enhancement: browsers without the filter get a clean seal,
  never a broken one). Deterministic paths — no runtime randomness; the same
  carved stamp impresses every time.
- **Posture** — a natural −8° tilt (a hand-pressed stamp is never perfectly
  square), also present in the settled state.
- **Composition** — centered above the completion message inside the success
  panel (the fact lands first); the halo bleeds into the paper fibers at
  impact. Non-interactive by design: red stays reserved for errors in
  CONTROLS — this is an impression, not a button.
- **Quality both ends** — vector SVG, `size-28 md:size-32` frame; verified
  visually at 360px and 1440px (screenshots e2e-09 / e2e-10; VLM review
  passed: full seal visible, no clipping, clean RTL layout).

## Ceremony (Phase 2.2 — the six beats)

Built on `--dur-ceremonial` (the token the design system reserved for
exactly this moment) in `globals.css`:

1. **Enter** — the stamp descends from above the panel, rotating −26°→−8°.
2. **Press** — impact on the paper.
3. **Squash** — a short compression on impact.
4. **Ink halo** — the ink spreads naturally into the fibers
   (`aizen-seal-halo`).
5. **Settle** — the seal comes to rest at −8° and stays, fixed and beautiful.

The whole sequence is ~1.5s (ceremonial but never annoying).
`prefers-reduced-motion` collapses it to the simple fade the tokens.css
contract promises — halo disabled.

## When it stamps (Phase 2.3 — canonical completion)

The canonical unit is the **STATION** (the architecture's independent lesson:
Course→Chapter→Section→Station; "Lesson" ≡ station in the current model —
the journey pages, progress store and mastery gate all key on it). ONE
completion event per station ⇒ ONE seal. The seal mounts ONLY inside the
completion panel (`[data-station-complete]`, rendered when the server
confirmed `complete`) — never per question, slide or small activity.
