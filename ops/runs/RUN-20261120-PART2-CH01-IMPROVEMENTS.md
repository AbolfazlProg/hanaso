# RUN-20261120 — PART2: Chapter-01 improvements (the nine groups الف–ط)

> Branch `fix/chapter01-part2` · worktree-isolated · **baseline = the EXACT head of PR #129 (`b0229dd`)** — PR #129 was still OPEN at start (verified via API), so per the coordination contract Part-2 builds ON Part-1's head and its PR targets `fix/chapter01-part1` (the diff contains ZERO Part-1 changes — verified with `git diff origin/fix/chapter01-part1..HEAD` = 23 real files).
> No merge, no deploy. The owner reviews both missions' compatibility first.

## The nine groups — what shipped

### الف) The ONE Persian transliteration standard

- `src/modules/curriculum/content/translit-standard.ts` — the documented spec (vowels, y-row, the yōon compounds, r-row, wo) + `BANNED_TRANSLIT_STRINGS`.
- Fixed the three flagged drifts + the same-class family:
  - **ヲ/を**: both teaching cards now BRIDGE romaji «wo» ↔ reading «اُ» (the card gap);
  - **ル/ロ**: the k3 summary rendered BOTH glyphs as «رو» — ロ is now «رُ» (registry parity);
  - **«یُ/یُو»**: the compound family taught the REVERSED convention (きょう=«کیوو»، きゅう=«کیُوو») vs the singleton standard (yo=«یُ»، yu=«یو») — all 29 spots aligned: きょう=«کیُو»، きゅう=«کیوو»، きよう=«کی‌یُو»، びょういん=«بیُوین»، とうきょう=«توکیُو»، including the h6 teaching BODY that explicitly taught the reversal.
- Enforced by `tests/unit/translit-standard.test.ts` (banned strings + singleton contract over every recognition item + the fixed compound forms).

### ب) The teach-first law

- Full audit with balanced-brace exercise parsing (the naive scan had 142 false positives): the exercise bank is glyph-clean except ONE true violation — `ex-kana-h1-rec-kata-warm-2` used ア (katakana untaught at warmup time) → replaced with あ (same «آ» reading, H1).
- CL-13 (the in-repo teaching-order gate) green; the h9 examples verified taught (あなた/だいがく/あつい/あした).

### ج) FSRS — the REAL review loop

- The engine was LIVE (owner-pass: app.fsrs_cards + /api/review) but NO UI served the queue and the content still said «به‌زودی فعال می‌شود».
- **`/review` page + ReviewRunner**: the learner's real due cards (kn/w/gr/chrk resolved from the bundled content), recall → reveal → rate (again/hard/good/easy — SCHEDULING data, never a score), idempotent submission (uuid clientReviewId), honest unknown-card + empty states, skip = honest no-op.
- The 25 station wrap-up lines + home keys + the complete page: every «coming soon» removed; the home «due» card is now the REAL one-click CTA.
- The t29 F1 guard flipped WITH the reality it protects (the link must exist; /review must really submit; no dishonest strings survive).
- `tests/unit/part2-fsrs-review.test.ts` — the four owner requirements through the REAL HTTP handlers: empty-queue honesty, station-completion enrollment (h1's 5 kn- cards), per-learner ownership (B sees nothing of A), grade application + reschedule + clientReviewId idempotency + unknown-item refusal.

### د) m2 — the real menu/signboard experience

- New teaching block `realworld-board` (pure display; the transport strips it explicitly).
- m2 rebuilt: Tokyo-café scene → the GLOSSED bilingual café menu (コーヒー ۴۵۰، サンドイッチ ۵۲۰، ラジオ، テスト) + the electronics-shop signboard (パソコン، エアコン، カラオケ، ドア with セール/新入荷/オート) → the 6 anchored exercises → **3 NEW menu-comprehension items** → wrap-up.
- The clue law is now structural: EVERY assessed word appears on the board BEFORE its exercise (パソコン included) — pinned by `part2-realworld.test.ts`.

### هـ) k12-foreign — diverse exercises + the leaks closed

- +6 new items: recognition (ヴ vs バ vs ファ visual — no TTS), reading (ティッシュ/ヴァイオリン decode), decomposition (ファイル = フ+ァ+イ+ル vs the big-ア fake), building (the word-order chips), + the compression pair.
- The answer-leaking contrast labels («با ァ کوچک» / «با ア بزرگ») reworded — the options are the bare words now.
- The f/v TTS risk removed from `ex-kana-kf-lis-1` (the ヴァイル audio distractor replaced by the vowel-length pair ファール — audible, no v/f guess).

### و) k13 — the REAL name-writing experience (all 7 requirements)

- `src/modules/curriculum/kana-name.ts` — pure LOCAL engine (NO external service, NO paid API): Finglish/Latin syllable mapping + Persian-script plane mapping (سا→サ، ری→リ، لا→ラ)، CyV clusters (rya→リヤ)، word-final nasal ン، doubled vowels → chōonpu، geminates → ッ. Honest confidence: Latin = high, Persian = medium (the short-vowel ambiguity STATED in the UI).
- The `name-katakana` block + `NameKatakana` component:
  1. Persian OR Latin input, with the WHY-Latin-is-better copy;
  2. mora-by-mora suggestion with the source letters;
  3. every mora editable before the build;
  4. the tray = required morae + extras sampled from the taught pool;
  5. arrangement with duplicates carried (Nana → ナナ needs two ナ cards);
  6. the progressive ladder: count → first-mismatch → reveal after three tries (never printed up front);
  7. the tolerated-variant check (シュ/チュ class, nasal) + the «نام‌ها یک املای درست ندارند» non-blaming frame on disagreement.
- The accepted answer is computed at RUNTIME from the learner's own input — no key ever exists to strip. The walk gates on it like writing-practice (practice-layer only, never a mastery gate — DD-106).

### ز) opt-drill — the real choice, still optional

- The `drill-menu` block: four modes — هیراگانا (10 pure-hiragana items) / کاتاکانا (10 items, one per taught row) / ترکیب دو خط (k13 script-discrimination + cross-script) / جفت‌های شبیه (る/ろ シ/ツ ソ/ン さ/き ぬ/め ワ/フ).
- The pick jumps the walk POINTER to the chosen pool (pointer-only, F4 semantics — no progress granted); «کافی است» jumps to the wrap-up so ONE chosen pool finishes honestly. core:false unchanged.

### ح) Feedback + おなまえ

- 126 generic recognition f1/f2 rewritten from the teaching registry (mnemonic image + row + confusable pair); future pairs carry the honest «بعداً» preview promise (the CL-13 device); the p-stations obey the h27 ban lists; the CL-05 leak gate stays green (no reading inside f1/f2 — the sound stays in f3, the reveal).
- おなまえ explained in a dedicated rule-step BEFORE the میکی scene uses it (its glyphs all taught; は-as-particle noted).

### ط) Paths and the chapter end

- **h0 NOTE-BUG1 closed**: the dialogue page's CTA no longer completes the station (the wrap-up never rendered) — it anchors the walk at the wrap-up (action:`progress`) and returns via a validated `?block=` deep link; the runner honors the pointer-only override. Live-verified: step «۳ / ۳» renders after the CTA.
- **G1 in the execution path**: completing the LAST core station (m2) hands the walk straight to `/assessment` — the completion CTA IS the gate.
- **m1's «پیام دوستت» promise real**: the friend's POSTCARD board (bare — glosses would leak the decode answers) whose every line is taught corpus (こんにちは decodable; おおきい the h4 example).

## Tests and gates (REAL outputs)

- `pnpm vitest run` → **87 files / 931 tests, all green** (5 new Part-2 suites: translit-standard, part2-fsrs-review, part2-realworld, part2-name, part2-full-walk).
- `pnpm typecheck` green · `pnpm lint` green · `pnpm build` green.
- The pedagogy gates green: EQA-1..7, CL-02..CL-17, h25 feedback/leak, h27 practice-content, two-correct, TL-13 bank integrity.
- `part2-full-walk.test.ts`: the 38-node journey walked in resolver order through the REAL API — every station graded + completed, the core path flips complete, and out-of-order completion is refused (`station/prerequisites_not_met`).

## Real-browser navigation (targeted, the NEW surfaces)

- h0: scene → dialogue link → dialogue page → «ادامهٔ درس — جمع‌بندی» → returns to `?block=blk-stn-kana-h0-wrapup` → step ۳/۳ (the wrap-up) → honest FSRS line → completed.
- k13 name flow: «Maryam» → suggestion マリヤム (ma/r/ya/m with sources) → tray (4 required shuffled + 4 extras) → wrong build → hint 1 «۴ ضرب» → hint 2 «ضربِ ۱» → reveal with the non-blaming frame → reset → correct build → «نامِ کاتاکانای تو ساخته شد». Persian «مریم» → マリム + the medium-confidence note.
- m2: the glossed menu board rendered in full (both panels, prices, サイド labels).
- opt-drill: the four-mode picker rendered; picking «جفت‌های شبیه» jumped to the 12-item pool.
- /review: honest empty for a fresh learner → after h1 enrollment: «۵ کارت» → あ → reveal → «خوب» → ۲/۵ → the API shows the reschedule (dueCount 4, the card pushed future) → the HOME page shows «۴ کارت برای مرور امروز» + the real «شروع مرور امروز» CTA.
- Screenshots: `/tmp/evidence-m2-menu.png`, `/tmp/evidence-k13-name.png` (sandbox evidence; not committed — the repo baseline-screenshot rule).

## Conflicts / merge contract

- Zero overlap with the other agent's in-flight work: their three newest main commits touch only `apps/web/src/db/seed-curriculum.ts` (untouched here); the diff was audited against fm01/dialogue/audio/preview/security paths — none touched.
- Shared files edited by BOTH missions across history (fa.ts, station-runner.tsx, content files) were edited additively on TOP of Part-1's head — the PR diff vs `fix/chapter01-part1` contains only Part-2 changes.
- **Merge order**: Part-2 merges ONTO Part-1 (base = `fix/chapter01-part1`). After both merge, main carries them sequentially with no conflicts expected. Deploy stays owner-gated.

## Skills Used

agent-browser (real navigation) · repo-internal gates (vitest/typecheck/lint/EQA/CL) — no external skills were needed for the content work itself.

## Source Documents Reviewed

AGENT_PROGRESS.md (the coordination ledger) · ops/runs/RUN-20261120-PART1-CH01-FIXES.md (Part-1's handoff/merge contract) · AGENTS.md (the repo rules — no parallel engine, no score, generated-file pretool) · the owner's Part-2 mission brief (الف–ط).
