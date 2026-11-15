/**
 * TASK-HANASO-21 — the audio-surface honesty gate (Phase 3.4).
 *
 * The owner-observed completion bug proved the cost of a drifting audio
 * registry: kana-decode outcomes whose promptJa word had NO committed asset
 * silently took the no-audio path. This test pins the contract permanently:
 *
 * EVERY word a play control can bind to (exercise promptJa words, rule-step /
 * rule-contrast words and pair sides, example words, kana-card host words)
 * must be EITHER
 *   (a) committed in the hostwords registry (manifest entry + file on disk), OR
 *   (b) covered by the generation script's word surface — i.e. the NEXT VPS
 *       VOICEVOX run (`node apps/web/scripts/tl08-a4-audio-gen.mjs`) will
 *       produce it.
 *
 * A word that is neither is an ORPHAN: the UI would honestly hide its play
 * control forever while content keeps referencing it — exactly the drift this
 * gate exists to catch at CI time, before it ships.
 *
 * Deliberately NOT part of the needed set:
 *  - `___`/NAME/… template scaffolds (faded self-production prompts — the
 *    learner speaks those aloud themselves; no play control exists);
 *  - the 92 basic kana glyphs (they own the separate kn-* kana registry);
 *  - dialogue-line exercises (audioLineRef → the dialogues registry, a
 *    committed system of its own).
 */
import { test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { getChapter } from '@/modules/curriculum/content';

const web = process.cwd(); // apps/web (vitest runs here)
const repoRoot = path.join(web, '..', '..');

const SCAFFOLD = /___|NAME|…/;

test('audio honesty gate — no playable word is an orphan (committed or covered by the next VPS gen run)', () => {
  // ---- 1. the needed surface: every word a play control can bind to -------
  const needed = new Set<string>();
  for (const slug of ['kana-foundation-01', 'first-meeting-01']) {
    const ch = getChapter(slug)!;
    for (const ex of Object.values(ch.exercises)) {
      const e = ex as { type: string; promptJa?: string };
      if ((e.type === 'kana-decode' || e.type === 'rule-listening') && e.promptJa && !SCAFFOLD.test(e.promptJa)) {
        needed.add(e.promptJa);
      }
    }
    for (const st of ch.stations) {
      for (const b of st.blocks as unknown as Array<Record<string, unknown>>) {
        const word = (b.word as { ja?: string } | undefined)?.ja;
        if (word && !SCAFFOLD.test(word)) needed.add(word);
        for (const key of ['a', 'b'] as const) {
          const pair = (b[key] as { ja?: string } | undefined)?.ja;
          if (pair && !SCAFFOLD.test(pair)) needed.add(pair);
        }
        for (const ex of (b.examples as Array<{ ja: string }> | undefined) ?? []) {
          if (!SCAFFOLD.test(ex.ja)) needed.add(ex.ja);
        }
      }
    }
  }
  // the kana cards' host words (kana-items.ts `word:` fields)
  const kanaItemsSrc = readFileSync(
    path.join(web, 'src', 'modules', 'curriculum', 'content', 'kana-items.ts'),
    'utf8',
  );
  for (const m of kanaItemsSrc.matchAll(/word:\s*'([^']+)'/g)) {
    if (m[1]) needed.add(m[1]);
  }
  expect(needed.size).toBeGreaterThan(100); // sanity: the surface is real

  // ---- 2. the committed registry (runtime truth) --------------------------
  const manifest = JSON.parse(
    readFileSync(path.join(web, 'public', 'audio', 'hostwords', 'manifest.json'), 'utf8'),
  ) as { entries: Record<string, { hash: string; file?: string }> };
  const committed = (w: string): boolean => {
    const e = manifest.entries[w];
    return !!e && existsSync(path.join(web, 'public', 'audio', 'hostwords', `${e.file}.opus`));
  };

  // ---- 3. the generation surface (what the next VPS run regenerates) ------
  const listed = spawnSync(
    process.execPath,
    ['apps/web/scripts/tl08-a4-audio-gen.mjs', '--list'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 },
  );
  expect(listed.status, `gen --list failed: ${listed.stderr}`).toBe(0);
  const genSurface = new Set(JSON.parse(listed.stdout.trim()) as string[]);

  // ---- 4. THE GATE ---------------------------------------------------------
  // basic kana glyphs own the kn-* registry — they are not hostword orphans
  const basicKana = new Set(
    [...kanaItemsSrc.matchAll(/kanaId:\s*'([^']+)',\s*\n\s*glyph:\s*'([^']+)'/g)].map((m) => m[2]),
  );
  expect(basicKana.size).toBe(92);

  const orphans = [...needed]
    .filter((w) => !basicKana.has(w))
    .filter((w) => !committed(w) && !genSurface.has(w))
    .sort();
  expect(
    orphans,
    'playable words neither committed nor covered by the generation surface (add them to the gen script extractors or commit their assets)',
  ).toEqual([]);

  // ---- 5. evidence line for the checkpoint doc ----------------------------
  const pending = [...needed]
    .filter((w) => !basicKana.has(w))
    .filter((w) => !committed(w))
    .sort();
  console.log(`[h21-audio] surface=${needed.size} committed=${needed.size - pending.length} pendingVpsRun=${pending.length}`);
  if (pending.length > 0) console.log(`[h21-audio] pending (next VPS VOICEVOX run): ${pending.join(' ')}`);
});
