# TASK-HANASO-23 — REMEDIATION ROADMAP (prioritized, evidence-linked)

> Built from 103 confirmed findings (BUG_REGISTER). Order = learner impact
> × risk × effort. Each batch names its entry points, the tests that must
> land with it, and the lint rule that keeps it fixed. No fix here is
> applied by this mission (audit-only) — this is the plan for the
> remediation mission.

## P0 — unblock the learner (1–2 days)

1. **BUG-001 gate audio (Critical)** — attach `promptAudio` to the 5
   kana-listening gate items (reuse journey/[station]/page.tsx:114-118's
   existing wiring). Decide the gate math in the same PR: either rebank
   (≥4 items/measure) or relax minMeasure — T2-C-01's arithmetic says
   minMeasure 0.8 × banks of 2–3 = "any error ⇒ remediate", which with
   the audio fix becomes honest but brutal; recommend ≥4/measure so one
   miss stays recoverable. Tests: e2e network-assert audio/kana on the
   gate; unit: assessment payload carries promptAudio; property test of
   the gate arithmetic; EQA guard: every measure ≥1 gate item per chapter
   (also closes latent BUG-034).
2. **BUG-008 ch2 dialogue audio** — per-line truth in the manifest
   (`available: hasRealAudioAsset(lineId) || sidecar !== null` per line);
   helpers already exist (T2-C-08: wiring-only). Tests: manifest unit +
   e2e on station 07.

## P1 — security (1 day)

3. **BUG-011/028/030/033/039 identity** — one PR: resolve identity
   ONLY server-side from the cookie on /api/progress + /api/attempts
   (401 on absent/invalid; no mint-and-proceed on state-changing
   routes); scope attempts GET by lid; httpOnly+Secure cookie. Tests:
   two-context API tests (no cross read/write); wire test for cookie
   attributes.
4. **BUG-032 /poc key leak** — route /poc exercises through
   toClientItem OR delete the legacy poc pages (preferred — they also
   carry T2-C-09). Test: payload scan on every route (extend the
   existing T1-B probe into a permanent test).
5. **BUG-031 practice write grading** — server-side stroke check (the
   writing engine exists) or disable the write kind until then.
6. **BUG-029 F1 recognition leak** — rewrite the recognition F1
   template (drop the correct-reading embed). Test: content-lint rule
   (below) + unit.

## P2 — assessment validity (2–3 days)

7. **BUG-002 the 60-item two-correct family** — make katakana items
   script-explicit (the pattern already exists: gate-m4-2) or drop the
   twin from options; one mechanical pass over the 60 ids (list in
   rounds/c1/B.md). Also BUG-009 («؟» labels), BUG-026 (gate-m5-1 ン),
   BUG-019 (7 gate recycles → rotate surfaces), BUG-022 (sensei).
8. **BUG-003 cloze structural** — compound options for multi-null
   items (pattern exists: p2-c3-cloze-1/2) + the per-blank UI fix if
   the team wants it; content-lint: multi-null ⇒ compound options.
9. **BUG-010 practice generator** — same-script distractor pools
   (script-explicit prompts); census test over 10k generated items.

## P3 — chapter-2 copy layer (1 day, mostly mechanical)

10. **BUG-006 stale numbering** — one sed pass (۱۴→۱۳ ×4, ۹–۱۴→۹–۱۳,
    decrement cited numbers ≥10; fix the two anchor lineRefs: drop the
    dup L(9), add L(13)). Content-lint: «خط/نوبت N» must equal lineRef.
11. **BUG-005 mis-keyed rationales** — re-key the 23 maps (list in
    rounds/c3/C.md §1). Unit: every non-correct option id has a
    rationale referencing that option's label.
12. **BUG-004 contradictory sentence + BUG-017 ungrammatical order** —
    two point edits (chips → せんせいでは; drop the wrong acceptedOrder).
13. **BUG-007 jargon objectives** — 4 plain-Persian rewrites.

## P4 — honesty surface (1 day)

14. BUG-024 false FSRS claims (template on fsrsItems.length>0);
    BUG-037 remediation outputs (emit + persist + re-serve on GET —
    include the zero-emitter `remediation_loop` event or delete it);
    the «کارت‌های مرور فردا» gate-pass line + «حداکثر سه حلقه» promise
    (implement or remove the copy); BUG-025 wrap-up ledgers (derive from
    one computed source).

## P5 — content-lint layer (2 days — the root-cause fix, T1-C-09)

15. Build `content-lint` with the rules the rounds specified (each
    closes a bug class permanently):
    - no two options with the target's romaji (script-agnostic prompts);
    - multi-null cloze ⇒ compound options;
    - «خط/نوبت N» == lineRef; N ≤ dialogue lines;
    - *Fa fields: no /[A-Z]{2,}-\d+|spec §/; complete sentences;
    - no Arabic/Persian codepoints inside ja fields;
    - rationale maps keyed to actual option ids, referencing labels;
    - every rule-listening promptJa exists in the audio manifest;
    - hostWord decodable at its introducedInUnit (extend glyph-budget);
    - prereq lint must cover rationale/hint fields too;
    - f1Fa no duplicated sentence tails; listening rationale must name
      the picked option's sound;
    - produce-template accepted order: no repeated content word across
      ではありません。…です;
    - wrap-up FSRS claims ⇒ fsrsItems.length>0;
    - option labels: no «؟» annotations; no duplicated labels;
    - every measure ≥1 gate item; gate items never duplicate practice
      content;
    - no Japanese token in *Fa outside the taught-glyph registry.
    Wire into CI as a content gate (the commit-hygiene gate BUG-011-style
    waiver pattern exists from HANASO-21).

## P6 — test-gap closure (T1-C-13; 2 days, rides with P0–P5)

16. Close the 10 blind spots — each shipped bug gets the test that
    would have caught it: gate audio inventory (remove the kn-
    carve-out in h21-audio-inventory.test.ts), content semantics
    (rides on content-lint), walk-snapshot codec validation
    (BUG-036-family), practice persistence + write grading, F1/F2
    copy, remediation outputs, focus management (BUG-038), body-size
    limits + rate limiting, /poc payload scan, transactions
    (BUG-036: wrap multi-step writes).

## P7 — polish backlog (Low severity; batch opportunistically)

Tap targets ≥44px on secondary controls; 2G skeletons; focus restore
(BUG-038 — if not landed in P6); spk-4-l token; keepalive for walk-save;
station-runner decomposition (T1-C-05 — refactor debt, schedule after
the content work); observability (OTD-011 — Sentry/GlitchTick);
event store PG backing (BUG-035 — pairs with the FSRS M2 work);
/practice chip sizes; the terminology unification (کانا everywhere);
the mixed-script point fixes; え+い rule card (A-16); teach or drop ッ;
the 3 HYPOTHESIS-LOST re-checks.

## Sequencing & gates

- P0 before anything (the chapter-2 lock is the product's biggest
  learner-facing defect).
- P1 lands before any public traffic growth; the /poc deletion also
  removes T2-C-09.
- P5 (content-lint) must land BEFORE the big content passes (P2/P3
  amendments) so every edit is guarded — otherwise the same bug classes
  re-enter.
- Every PR carries its named tests; CI gates: content-lint (new),
  audio-inventory (fixed carve-out), payload scan (new), two-context
  identity tests (new).
- After P0–P4: re-run this audit's verification scripts (they are in
  scripts/h23-audit/ + the round reports' methodology) as the
  remediation mission's acceptance evidence.
