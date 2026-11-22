KanjiVG N5 kanji sources (vendored)
==================================

Source: KanjiVG — https://kanjivg.tagaini.net / https://github.com/KanjiVG/kanjivg
Copyright © 2009-2026 Ulrich Apel.
License: Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0) — see
LICENSE-CC-BY-SA-3.0.txt in this directory.

What is vendored here: the 103 kanji of the HANASO N5 reference set
(src/modules/curriculum/kanji/n5-reference.ts — selected from KANJIDIC2's
old-level-4 tag ≡ the commonly-cited N5 list, cross-checked with an
independent published N5 list; see docs/domain/KANJI-N5-REFERENCE.md).
File naming: <literal>.svg (the character itself), content = the upstream
KanjiVG kanji/<five-hex-digit-ucs>.svg file verbatim.

Validation done at generation time (scripts side, 2026-11-22):

- every file's stroke count == KANJIDIC2 stroke_count for that kanji;
- stroke ids sequential 1..N;
- every kanji of the reference set present (103/103).
