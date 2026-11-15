KanjiVG kana sources (vendored)
================================

Source: KanjiVG — https://kanjivg.tagaini.net
Release: r20260714 (https://github.com/KanjiVG/kanjivg)
Copyright © 2009-2026 Ulrich Apel.
License: Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0) — see
LICENSE-CC-BY-SA-3.0.txt in this directory.

The 92 files in this directory are verbatim KanjiVG SVG sources for the basic
hiragana + katakana syllabaries (46 + 46). Each file keeps KanjiVG's original
license header. They are vendored so `scripts/build-kana-writing-data.mjs` can
regenerate `public/writing-data/*.json` deterministically without network
access, and so the CC BY-SA 3.0 attribution travels with the sources.

The generated `public/writing-data/*.json` files are a transformed derivative
of these SVGs (coordinate scale 109 → 1024, centerline paths + sampled
medians) and are therefore distributed under the same CC BY-SA 3.0 terms
(ShareAlike). The runtime attribution link in the writing UI points at
`/writing-data/licenses/` which ships this notice and the license text.

These files replaced the earlier AnimCJK-derived data
(`@k1low/hanzi-writer-data-jp`) in TASK-LEARNING-08 phase 2 (#117) after an
audit found 16/92 glyphs with non-standard stroke counts and 12/92 with
out-of-bounds medians in that source.
