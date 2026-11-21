# RUN-20261121 — KANA-BANK RELEASE (Issues #146 + #147) — two-PR release record

> Owner order: «مأموریت را از وضعیت فعلی ادامه بده» (2026-11-21) · executor: Z.ai
> Production: **https://hanaso.ir** · Production SHA at mission start: `78b1c9d`
> Mission rule honored: PR #145's release was NOT re-audited — the previous release report was the baseline.

## 1. Issue #147 (P1 — fm01-09 locked scene) — already fixed & merged before this run's execution window

- **PR #148** (merged into main as `ea452c36f0deca695dfdb22c4f3fb1d9dcdef6a3`): the engine-level root fix —
  a narration-only `character-scene` step renders its forward action immediately; reply steps keep the
  answered-only gate. Full-content scan found 2 MORE locked scenes beyond fm01-09 (all three covered).
- Verification in THIS run (on the merged tree):
  - `tests/unit/ui/character-scene-advance.test.tsx` — 3/3 ✓ — the REAL StationRunner walk of
    `stn-fm01-09-integrate` (narration steps advance → the name chip grades → wrap-up + completion reached)
    plus the two other previously-locked scenes.
  - The full suite rides the same engine: `part2-full-walk` 2/2 ✓, `curriculum-station-walk` 19/19 ✓.

## 2. Issue #146 (P2 — the kana bank) — PR #149, squash-merged as `9be3984009b73995f03b7c7f9974606e965bd4ee`

### 2.1 The placement decision (teaching-framework call)

**A dedicated chained chapter: `kana-expansion-01`** — not an absorption into chapter 01:

- Chapter 01 sits AT its registered caps (36 core / 441′ of 460′ — the TASK-HANASO-27 exception);
  CONTENT-103 caps a kana station at 6 cards — 92 cards cannot fit honestly;
- the authored h5 rule-card honesty note plans the だ/ば rows «بعداً همراه خودِ ردیف‌ها» — this release
  executes that plan;
- the framework's kana domain (§7) keeps kana infrastructure PARALLEL and continuous — a compact expansion
  chapter after the foundation, before/parallel to the first conversations.

### 2.2 What shipped

- **The bank**: KANA_ITEMS 92 → 184 (46 voiced hiragana + 46 katakana mirrors) + 92 KANA_TEACHING rows —
  HANASO-original Persian pedagogy, honest `draft` review status, hostWords, confusables, FSRS card ids,
  `introducedInUnit` HD1..HP1/HY1..HY4 / KD1..KP1/KY1..KY5.
- **The chapter**: 20 row-packet stations (≤6 cards each — CONTENT-103), 120 walk exercises
  (recall-first ≥60%, option-position shuffle-graded, 3-option MCQs with documented error families),
  a 10-item mastery bank (≥2 per M1..M5 — M5 uses audio-committed words only), a real-reading
  milestone (`stn-kana-kx1`), and the anchor micro-dialogue `kana-expansion-01` (3 lines, L1 band).
- **Writing data**: 56 KanjiVG sources vendored (r20260714, CC BY-SA 3.0 — license travels with the data);
  the builder learns yōon COMPOUNDS (きゃ = write き then ゃ — deterministic concatenation of the two
  vendored centerlines); writing-data rebuilt 92 → 205 chars, BYTE-IDENTICAL for the original 92;
  the integrity test pins the 113 new glyphs + the composition rules (dakuten = base+2, handakuten = base+1).
- **Engine (chain-aware — the gates stay exactly as strict)**:
  - `decomposeJa` resolves voiced glyphs to base+mark FIRST (the knowledge model — chapter 01's
    decode/claim semantics unchanged);
  - `validateRuleTeaching` / `validateKanaContent` inherit the prerequisite chapter's taught glyphs and
    rule marks (the CHAPTER-CHAIN carries knowledge; teaching WITHIN the chapter is still budget-checked
    in deck order);
  - kana-card blocks fold as the explicit DERIVED-GLYPH-SHOWN display;
  - the station page seeds `taughtKanaBeforeStation` from the prerequisite — the computed readability
    claims stay honest from the expansion's station 1.

### 2.3 CI gates (kept AND widened)

- CONTENT-106 is CORPUS-WIDE now: 184/184 registry glyphs carded across the two kana chapters
  (no orphan bank data — anywhere, ever);
- writing-data integrity: 184 + 21 glyphs with composed stroke counts;
- the audio gen surface (`tl08-a4-audio-gen.mjs`) reads the expansion files and asserts its count against
  the REGISTRY (never a constant); the hostword/audio gates accept committed-OR-gen-covered —
  **the 92 new audio pairs complete on the next VPS VOICEVOX run** (honest absence until then:
  the cards hide their play controls, never fake sound);
- the reveal/plan + journey tests updated to the 3-chapter course order
  (kana-foundation-01 → kana-expansion-01 → first-meeting-01).

### 2.4 Test evidence

- **Unit: 89 files / 984 tests — ALL GREEN** (incl. the new expansion suite: full validation, packet
  sizes, chain rule, listening-only-committed, 2-section journey of 20 stations).
- **CI on the PR branch (5b6c4ed) and on main (9be3984): success** — format/lint/typecheck/test/
  integration (real PostgreSQL 18 + backup-restore drill)/compose smoke. The integration seed pins were
  updated with the release (4 dialogues / 29 lines / 81 lessons = 1 anchor + 80 stations).
- `typecheck`, `eslint`, `prettier --check`, `pnpm build` green locally.

## 3. Deployment state (honest)

- **Image ready**: `ghcr.io/abolfazlprog/hanaso:9be3984009b73995f03b7c7f9974606e965bd4ee` (CI-built, GHCR).
- **BLOCKER — the ops terminal is DOWN (server-side, pre-existing, not caused by this release)**:
  `wss://ops.hanaso.ir/ws` completes the handshake, delivers the initial frames, and CLOSES at init —
  ttyd's `spawn_process` fails on the server (reproduced 4× from the sandbox AND from raw clients;
  the browser flow sends the same init frame, so the owner's terminal is equally affected).
  The GHA SSH path is unreachable from runners (firewall — the deploy workflow's timeouts, pre-existing).
- **The owner one-command is prepared** (staged swap per the RUN-20261120 pattern, 10 steps:
  snapshot → pg_dump + .env backup → GHCR pull (fail = no change) → src sync → .env image-line swap →
  migrate one-shot → recreate web+worker (postgres/pgbouncer untouched) → 3-tier health gate with
  automatic rollback → user-behavior probes → rollback artifact) — `deploy-9be3984-owner-command.txt`
  (delivered with the mission report).
- **Production health at mission end**: `https://hanaso.ir/api/health` → `"commit":"78b1c9d…"` · `ok:true`
  · `/api/ready` db ok — the live release is UNCHANGED and HEALTHY; the new release ships when the owner
  runs the one-command (terminal repair is independent and can happen any time).

### 3.1 Deployment EXECUTED — the owner repaired the server connection (~07:29Z, same day)

With the owner's order «خودت درستش کن — اتصال به سرور الان درست شده» the executor ran the prepared
release through the official web-terminal (root shell — the same ttyd path the browser uses):

- **Pre-flight (server, read-only)**: `.env` image line = `hanaso-web:78b1c9d…` · web+worker Up 8h
  (healthy) · postgres+pgbouncer Up 38h (healthy) · `/api/health` → `78b1c9d`.
- **Disk hygiene (REQUIRED before the pull — honest deviation, documented)**: `/` at 97% (612MB free)
  would fail the 1.27GB pull and endanger postgres. Removed ONLY the superseded hanaso release images
  (a7f5325 / c9f74d4 / b46b948 / d942352 / 36cb4a5 — every one re-pullable from GHCR); the rollback
  target `hanaso-web:78b1c9d…` RETAINED; voicevox/coturn/ntfy/other services untouched. Result: 5.4GB
  free (71%).
- **Transfer integrity**: script moved base64 in 6 chunks; server SHA-256
  `623c4f6b4e203b3383f273ef67e60032045e3c110f85fce5530cb79220fb65f8` — byte-identical to the prepared
  owner-command body.
- **Execution** (detached, `/root/deploy-9be3984.log`): **ALL 10 STEPS GREEN** — ends
  `=== RELEASE LIVE: 9be3984009b73995f03b7c7f9974606e965bd4ee (kana-bank + fm01-09 fix) ===`.
- **Safety artifacts**: `/root/hanaso-backups/db-pre-kana-bank-20261121T072920Z.sql` (728,908 bytes,
  read-only pg_dump) + `.env.pre-kana-bank`; the deploy itself modified no user data.
- **Post-deploy verification from OUTSIDE the VPS**: `/api/health` →
  `"commit":"9be3984009b73995f03b7c7f9974606e965bd4ee"` · `ok:true` · `/api/ready` process ok +
  database ok (PG 18.6, 14ms) · `/`, `/learn`, `/review` all 200 · `/api/review/queue` → FSRS-6
  integrated, honest empty for a fresh visitor.
- **Real learner-path evidence for #146**:
  `/api/curriculum/journey?chapter=kana-expansion-01` → `ok:true` · title «فصل ۰۱+ — بسطِ نوشتار:
  داکوتن، هان‌داکوتن و یُوئون» · `coreTotal: 20` · `nodes: 20` (stn-kana-hd1 «ردیف が — داکوتنِ か行» …)
  · unlocked; `/learn/kana-expansion-01` → 200 with no cookies. (The `/learn` index HTML listing only
  the current chapter is the documented UX contract — one chapter at a time, never a chapter list.)
- **Server state after**: web+worker Up (healthy) on the `9be3984…` image; postgres+pgbouncer Up 38h
  (untouched); disk 4.4GB free (77%); rollback artifact = image `hanaso-web:78b1c9d…` retained + the
  printed one-liner + the DB backup path above.

## 4. Other agents' work — untouched

Open PRs #113 / #115 / #120 / #123 / #128 (dependabot + other agents) were not touched; no branch of
theirs was modified; the merge used squash per the repo's merge policy.
