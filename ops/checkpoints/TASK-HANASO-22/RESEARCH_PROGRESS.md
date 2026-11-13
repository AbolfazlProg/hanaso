# TASK-HANASO-22 — RESEARCH PROGRESS (Phase 1)

> CP-01 · Status: COMPLETE — 4 research docs written, committed, pushed.

## What was done

1. **KB reuse audit** (mission rule: reuse, don't re-produce):
   - Main evidence register: 367 EV rows (EV-001..367) — covers cognitive load (EV-043/044),
     testing effect (EV-046..049), spacing (EV-050..053, EV-350), interleaving (EV-064/065/084),
     feedback (EV-067..070), scaffolding (EV-071..073), mastery (EV-074/075), motivation
     (EV-076..080), desirable difficulties (EV-081/082), FSRS (EV-054..060).
   - Kana register (§18): EV-345..367 — self-teaching (Share 1999), Pavlik & Anderson,
     handwriting (Longcamp 2005), production effect (Putnam 2014), kana mnemonics (Rasiban 2019),
     decodable text (EV-347..349), discrimination (EV-359), katakana-harder consensus (EV-365).
   - KB design docs read: 02-learning-experience/exercise-design.md (15 exercise types,
     recall-first ≥60% rule, feedback design), learning-science.md, spaced-repetition-ux.md;
     13-educational-methodology/02-teaching-method-research.md; 18-kana-foundation/ (5 docs).

2. **Gap filling** (new sources found + verified via web search, each with method/findings/limitations):
   - Kang et al. 2013 (retrieval > imitation for L2 vocab, Psychon Bull Rev)
   - DeKeyser & Criado 2013 / DeKeyser 2015 / Maie et al. 2025 (skill acquisition 3-stage, SSLA)
   - Smolen et al. 2016 (spaced learning mechanisms, Neurosci Biobehav Rev, PMC)
   - Muqaibal et al. 2023 (CAVL practice distribution)
   - Nakata 2015 (feedback timing L2 vocab — little effect when lag controlled)
   - Li 2010 (corrective feedback meta-analysis, Language Learning)
   - Yang et al. 2013 (forward/backward association asymmetry)
   - Oppici et al. 2023 (gesture/enactment meta-analysis)
   - Lightbown 2008 (transfer-appropriate processing)
   - Tashiro 2015 (katakana word recognition training, Purdue)
   - Katakana difficulty survey (cognitive psych explanation)
   - Vandergrift & Goh 2012 + Li 2022 (metacognitive L2 listening)

3. **Documents created** (all in `docs/research/`, Persian, honest labels throughout):
   - `PRACTICE_PEDAGOGY_RESEARCH.md` — 9 sections: retrieval, spacing/massing/interleaving,
     corrective feedback, recognition/recall/production, cognitive load/skill acquisition/transfer,
     kana-specific evidence, honest gaps.
   - `LANGUAGE_SKILL_DIMENSIONS.md` — per-skill dimension matrices (Kana implemented; Vocab/
     Grammar/Kanji/Expressions/Listening/Reading/Speaking architected) + Kana traceability
     matrix (K1..K8 → practice types → data sources) + anti-duplication rule (review items =
     Learning Objects, not practice events).
   - `PRACTICE_SCHEDULING_RESEARCH.md` — scheduling decisions: Focused after each lesson
     (block) + Mixed after ≥3 stations (interleaving-for-discrimination, EV-065), session
     length policy 12–16 items (~5–8′) focused / 16–24 (~8–12′) mixed, guided→independent
     ladder (EV-045 expertise reversal), no FSRS mutation, no gating in practice.
   - `LISTENING_PEDAGOGY_RESEARCH.md` — metacognitive model (Vandergrift & Goh), sound
     discrimination dimensions, segmentation, dictation (honestly deferred), speed policy,
     dimension matrix with current/active/future phases.

## Key design decisions extracted (feed Phase 2/3 design)

1. Practice = retrieval-first, never re-watching; MCQ is complement only (EV-047).
2. Kana practice dimensions K1..K8 (see LANGUAGE_SKILL_DIMENSIONS §1/§9) with per-dimension
   scoring; existing assets fully cover them (92-glyph registry, 185 kana audio, 307 hostword
   audio, writing engine + KanjiVG).
3. Focused Practice unlocks per completed station (block practice — EV-065 for new items);
   Mixed Practice after ≥3 stations of an island, weak-point weighted, no untaught material.
4. Session length: 12–16 / 16–24 items as owner-tunable DATA (PRACTICE_POLICY), not code.
5. Practice records evidence per (LearningObject × dimension); never mutates FSRS due dates;
   review eligibility = introduced + ≥1 successful practice (state recorded, engine = M2 future).
6. Feedback ladder in practice: shorter than lesson (F1 statement → F3 reveal after retry);
   no gating, no pass/fail in Learn or Practice.
7. Writing (K6/K7) optional, separately measured, never a prerequisite (EV-356 reading-first).

## Honest gaps recorded

- No controlled trial of retrieval practice for kana specifically (transfer from L2 vocab/reading).
- No evidence-backed fixed optimal session length — policy numbers labeled as initial tunable data.
- Persian mnemonics effectiveness unproven (OQ-051) — measure via real error rates.
- Metacognitive listening approach evidence is classroom-based (transfer label).

## Next action

Phase 2/3 — write `PRACTICE_DESIGN_DECISIONS.md` (architecture + traceability), then implement.
