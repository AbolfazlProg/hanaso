# TASK-HANASO-20 — RELEASE MANIFEST

> Pattern follows the TASK-HANASO-16/17 manifests (self-referential tooling pin; the target is the CODE tip, the tooling commit follows on the same branch).

## Pins

| Item | Value |
| --- | --- |
| Target release | `1.0.0-hanaso20-r01` @ `2574788c36521cec6ac0673488b769e77a8ab982` |
| Target branch | `fix/TASK-HANASO-20-onboarding` (pushed to origin) |
| Deploy tooling | this commit (see OWNER-COMMAND v11 `R=` — the self-referential pin; verified by the deploy05 P0 gate) |
| Bootstrap | `infra/deploy/bootstrap-hanaso.sh` — sha256 `03ee6e740db0860dd1149ca689ea2d84b9634becfc8f6a8e30632bb660770035` (unchanged from v10 — file byte-identical) |
| Smoke | `scripts/smoke.sh` at the tooling commit must match the target's app expectations (deploy05 P0 checks this) |

## Commit chain (code)

```
d9a3ede fix(learner+api): P0 — retire the shared poc-user fallback (BUG-001/002/004)
4513c6f fix(curriculum): P0 — きょう reading contradiction (BUG-003) + TRANSCRIPT gate
f0d6d4d feat(curriculum): P1 — every derived form taught; real k12-foreign station
233258c fix(scripts): FOREIGN_COMBO_WORDS wired (lint)
47dd482 fix(feedback): P1 — differentiated feedback + rationale rendering (BUG-007)
23669b2 feat(audio): P1 — rule-card listening audio (BUG-008)
d64c810 feat(ux): P2 — Persian 404 (BUG-010)
2574788 test(e2e): PHASE 5+6 verification — 22/22 E2E + 31/31 responsive  ← TARGET
(this)   release pin + sandbox drill + OWNER-COMMAND v11                  ← TOOLING
```

## Verification at the target

- 718/718 unit+integration, EQA 37/37, typecheck+lint clean
- 22/22 browser E2E (local QA instance, in-memory stores) — `screenshots/e2e/`
- 31/31 responsive + 0 JS errors — `screenshots/responsive/`
- Production image build OK (middleware registered); served + verified on :3111

## Deliberate scope notes

- No destructive migration; no seed change; DB volumes untouched.
- New audio assets REQUIRE a VPS VOICEVOX run (list extended: FOREIGN_COMBO_WORDS, YOON_SEPARATE_FORMS, PENDING_CARD_WORDS) — the UI hides the controls until then (honest).
- Deferred items are listed with reasons in `BUG_REMEDIATION_LOG.md` / `CURRENT_STATE.md`.
