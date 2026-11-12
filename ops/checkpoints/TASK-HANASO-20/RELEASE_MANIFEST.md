# TASK-HANASO-20 — RELEASE MANIFEST

> Pattern follows the TASK-HANASO-16/17 manifests (self-referential tooling pin; the target is the CODE tip, the tooling commit follows on the same branch).

## Pins

| Item | Value |
| --- | --- |
| Target release | `1.0.0-hanaso20-r01` @ `2574788c36521cec6ac0673488b769e77a8ab982` |
| Target branch | `fix/TASK-HANASO-20-onboarding` (pushed to origin) |
| Deploy tooling | `5870eaf3892c7cb8a1bcfa3ec058d77474e3ad10` (bootstrap default pins joined the v11 target; verified by deploy05 P0 — OWNER-COMMAND v11 `R=` points here) |
| Bootstrap | `infra/deploy/bootstrap-hanaso.sh` — sha256 `d4736bd8d676ac10f8c2832c3888e8f2a95eff72d2088a65088a9c5d85fb2073` (default pins joined the v11 target — content change, hash re-pinned everywhere) |
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
9d75279 docs(ops)+deploy: release pin v11 + sandbox drill sync + full checkpoint
5870eaf fix(deploy): bootstrap default pins join the v11 target (drill P0)  ← TOOLING R
(this)   re-pin R/W in OWNER-COMMAND (self-referential pattern, as HANASO-18)
```

## Verification at the target

- 718/718 unit+integration, EQA 37/37, typecheck+lint clean
- 22/22 browser E2E (local QA instance, in-memory stores) — `screenshots/e2e/`
- 31/31 responsive + 0 JS errors — `screenshots/responsive/`
- Production image build OK (middleware registered); served + verified on :3111
- **Installer sandbox drill: DEPLOY-05 100/100** (P0..P12 + KOTODAMA/TLS/isolation sweep)

## Deliberate scope notes

- No destructive migration; no seed change; DB volumes untouched.
- New audio assets REQUIRE a VPS VOICEVOX run (list extended: FOREIGN_COMBO_WORDS, YOON_SEPARATE_FORMS, PENDING_CARD_WORDS) — the UI hides the controls until then (honest).
- Deferred items are listed with reasons in `BUG_REMEDIATION_LOG.md` / `CURRENT_STATE.md`.
