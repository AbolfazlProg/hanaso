# TASK-HANASO-21 — Audio Remediation (Phase 3.4)

## Status: assets PREPARED and GATED — generation requires the owner's VPS run

**The honest limitation first:** the shared VOICEVOX service runs on the
owner's VPS bound to loopback (127.0.0.1:50021). This sandbox has no SSH
access to the VPS, no local VOICEVOX, and no docker — audio CANNOT be
generated from here. Per the mission brief, nothing below claims otherwise.

## What WAS done (commit `c25dba7`)

1. **The complete generation surface** — the gen script
   (`apps/web/scripts/tl08-a4-audio-gen.mjs`) now sweeps EVERY remaining
   playable surface via `contrastAndExerciseWords()`: rule-step/rule-contrast
   words, a/b pair sides (including the derived single glyphs ば/ぱ that have
   no kana-registry asset), and every kana-decode / rule-listening `promptJa`
   word (the audible question itself). The 29 pending words join the next
   VPS run:
   ええ かぎ かぜ がこう きゃく きゅう きよう くうき けっか さっき さんすう ざせき せん
   ちゅうごくじん とうきょう ば ぱ ぱん びょういん らーめん ケーキ コヒー コーラ タクシー
   ティッシュ ネコ ファイル フアイル ヴァイオリン
2. **`--list` mode** — prints the JSON word surface (no VOICEVOX, no
   writes); `generateAll()` consumes the SAME `wordSurface()` — the staged
   list and the real run can never drift.
3. **The permanent honesty gate** (`tests/unit/h21-audio-inventory.test.ts`):
   every word a play control can bind to must be EITHER committed in the
   hostwords registry OR covered by the gen surface — an ORPHAN fails CI.
   Current pinned state: **surface=180 committed=151 pending=29 orphans=0**.
4. **UI honesty verified** — every playable surface resolves through
   `hostWordAudioUrls()` (manifest + file check); a missing asset returns
   null and the UI hides the play control (server: `if (urls)` guards;
   client: `ExampleAudioButton` null→hidden; «پخش هر دو» only when both
   sides have assets). No dead or misbound play buttons exist for pending
   words — confirmed by reading every consumer and by the E2E walks.
   The `___`/NAME template scaffolds are self-production prompts (no play
   control by design); dialogue-line exercises use the separate committed
   dialogues registry.

## What the OWNER must run (one command, on the VPS)

```bash
cd /opt/hanaso && docker compose --env-file .env run --rm web node apps/web/scripts/tl08-a4-audio-gen.mjs
```

(or any equivalent that runs the script inside the web container where
VOICEVOX is reachable), then commit the regenerated `public/audio/hostwords/*`
+ manifest. After that run the honesty gate flips to pending=0 with zero
code changes — and the play controls for those 29 words appear
automatically (the UI resolves from the registry, no deploy needed beyond
the asset commit).

## Why this mattered (the tie-in to the P0 bug)

The owner-observed completion failure proved the cost of a drifting
registry: kana-decode outcomes whose promptJa word had no committed asset
silently took the no-audio auto-next path — the exact path where the stale
closure lived. The registry is now structurally impossible to drift.
