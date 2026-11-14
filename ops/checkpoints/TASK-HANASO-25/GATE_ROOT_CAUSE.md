# TASK-HANASO-25 — GATE ROOT CAUSE (Phase 1 / BUG-001)

> The audit's single Critical, dissected and fixed. Evidence-first: every claim
> below was re-derived on this branch before the fix.

## 1. Root cause analysis (three independent defects compounding)

### Defect A — the listening items were silent (wiring)

`app/learn/[chapter]/assessment/page.tsx` mapped gate items through
`toClientExercise` and stopped there. `toClientExercise` (grading.ts:344)
deliberately never attaches sound (answer-key discipline), and the **site that
re-attaches the question's own sound lives in the journey station page**
(journey/[station]/page.tsx:115-118: `kana-listening || kana-recall →
kanaAudioUrls('kn-' + targetConcept)`). The assessment page simply never had
that block. Result: 10 kana-listening gate items (M2×3 + M5×2 before the
rebank) rendered «به صدای پخش‌شده گوش کن» with nothing to hear. All the
assets existed on disk the whole time (`public/audio/kana/kn-*.{opus,m4a}` —
185 files) — a pure wiring gap, not a missing-content gap.

### Defect B — the arithmetic made ANY error fatal

L1 policy (levels.ts): `gate: { weighted: 0.9, minMeasure: 0.8 }`. The bank
shipped M1×3, M2×3, M3×3, M4×2, M5×2 = 13 items. With n=2 or 3 per measure,
one wrong answer puts that measure at 0.5 or 0.667 — permanently below the
0.8 floor ⇒ **remediate**. `weighted` (0.9) never binds: one miss gives
weighted ≈ 0.93-0.96 ≥ 0.9. The mission's verdict was exact: the 0.9 threshold
is dead-letter; the 0.8 floor is a cliff. An honest learner with one slip in
any measure could never pass (audit browser-verified: 35/35 stations
completed, ch2 still locked).

### Defect C — guessing was the only path

With no audio (defect A) and a 1-in-3 guess on 5 sound-required items
(M2∪M5), P(pass) ≈ (1/3)⁵ = 1/243 per attempt. Two audit derivations agreed.

### Plus — M5 measured something it never banked

`measureLabelsFa.M5` said «تولید نوشتاری (تا فعال‌سازی IME سبک…)» but every
M5 item was kana-listening. The label described a writing/IME construct that
does not exist in the bank. And gate-m5-1's options were ン/ん — the SAME
sound /n/ in two scripts: unanswerable by listening (BUG-026).

## 2. The fix (all three defects + label)

| # | Change | File |
| --- | --- | --- |
| A | Assessment page attaches `promptAudio` for kana-listening/kana-recall (`kanaAudioUrls`) and rule-listening (`hostWordAudioUrls`, promptJa stripped) — mirrors the journey page contract exactly; recognition/decode never get sound (the sound IS the answer there) | assessment/page.tsx |
| A | MasteryGate renders the listening-question panel (replay button + auto-play on question change, normal speed 1.0, LRU-cached audio, honest no-asset degradation) | mastery-gate.tsx |
| B | **Rebank: 5 items × 5 measures = 25.** One miss = 4/5 = 0.8 ≥ 0.8 ⇒ still a PASS (recoverable). Two misses = 0.6 < 0.8 ⇒ remediate. The cliff became a graded slope; the 0.9 weighted now also meaningfully binds (two-miss weighted ≈ 0.92 still passes, three misses ≈ 0.88 fails) | chapter-kana01.exercises.ts |
| B | 12 new items authored (m1-4, m1-5, m2-4, m2-5, m3-4, m3-5, m4-3, m4-4, m4-5, m5-3, m5-4, m5-5) + 5 existing items' options/rationales fixed (m2-1/2/3 sound-named rationales, m2-3 katakana script-explicit prompt + katakana distractors, m5-1 ン→ぬ so every distractor differs in sound, m5-2 rationale names /wa/ vs /wo/) | chapter-kana01.exercises.ts |
| C | With audio attached + distractors sound-distinct, guessing odds on M2∪M5 collapse from "only path" to "worst case" — the construct is now hearable | — |
| D | M5 label: «تمایز شنیداری دو خط کانا» — states what the items actually measure | chapter-kana01.ts |
| E | Gate copy: «ده پرسش» → real count; intro no longer links a kana chapter to a dialogue replay with dialogue-specific instructions | fa.ts, mastery-gate.tsx |

### New-item authoring rules (all verified mechanically, see the test)

- distractors never share the target's romaji (two-correct guard, incl.
  cross-script twins — the BUG-002 class);
- katakana-target items carry script-explicit prompts («کانای کاتاکانا…»);
- all `assessesConcepts` taught in ch1 (first draft used みず = ね+こ…
  actually み+ず where ず is untaught — EQA-1 caught it; replaced with ねこ
  ね+こ, both taught, asset committed);
- no verbatim recycling of station practice items (BUG-019) — new items use
  different option sets than the practice twins of the same concepts;
- every listening rationale names the PICKED option's sound (audit's
  shapes-for-a-sound finding), Persian-first.

## 3. Gate arithmetic — the property test (tests/unit/h25-gate-integrity.test.ts)

| Scenario | Expectation | Result |
| --- | --- | --- |
| All 25 correct | passed (weighted 1.0) | ✓ |
| ONE miss in one measure (all 5 measures each) | still **passed** (0.8 ≥ 0.8, weighted ≈ 0.96) | ✓ |
| TWO misses in one measure (all 5 measures each) | remediate + that measure weak + remediation stations listed | ✓ |
| One miss in two different measures | still passed (each measure at its floor, weighted 0.96) | ✓ |
| Bank shape | exactly 5 per measure, 25 total | ✓ |
| Every kana-listening item has committed opus+m4a asset | ✓ (10/10) | ✓ |
| No option set carries the target sound twice | ✓ | ✓ |
| Listening rationales speak about SOUND | ✓ | ✓ |
| M5 label matches the measured construct | ✓ | ✓ |

Full unit suite after the change: **65 files / 764 tests passed** (including
the two count-sensitive tests updated to the new truth: kana bank 25, FM bank
untouched at 12). Typecheck clean, ESLint clean.

## 4. What is deliberately NOT changed

- The L1 thresholds themselves (0.90/0.80) — the mission forbade "lower the
  number to hide the problem". The bank was rebuilt so the existing,
  defensible thresholds behave fairly: one miss is recoverable, a pattern of
  misses is not.
- The remediation loop cap (max 3 per session) and weakPointMap — still
  data-driven, now pointing at real measures.
- No FSRS/review claims added (fsrsItems stays [] — honesty finding).
