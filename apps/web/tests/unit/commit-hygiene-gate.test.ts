/**
 * HANASO — TASK-HANASO-21 — the commit hygiene gate (TASK-HANASO-20 BUG-011).
 *
 * The gate's contract, made mechanical:
 * H1 — a docs(…) commit touching apps/web/src FAILS the range;
 * H2 — a style(…) commit touching apps/web/src FAILS the range;
 * H3 — a fix(…) commit touching apps/web/src passes (labels stay honest);
 * H4 — a docs(…) commit touching only ops/*.md passes;
 * H5 — the explicit `hygiene-waiver:` trailer passes with a loud log;
 * H6 — an unresolvable base skips (first push of a new branch).
 *
 * Each case builds a THROWAWAY git fixture in a tmp dir (never this repo).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// this file: apps/web/tests/unit/x.test.ts → repo root needs FOUR ups
// (tests/unit → tests → web → apps → root) — robust regardless of cwd.
const GATE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'scripts', 'ci', 'commit-hygiene.sh');
const dirs: string[] = [];

function fixture(): { dir: string; git: (args: string[]) => string; commit: (msg: string, files: Record<string, string>) => string } {
  const dir = mkdtempSync(join(tmpdir(), 'h21-hygiene-'));
  dirs.push(dir);
  const git = (args: string[]) =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t', HOME: dir } }).trim();
  git(['init', '-q']);
  git(['config', 'user.name', 'T']);
  git(['config', 'user.email', 't@t']);
  const commit = (msg: string, files: Record<string, string>) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), content);
    }
    git(['add', '-A']);
    git(['commit', '-q', '--allow-empty', '-m', msg]);
    return git(['rev-parse', 'HEAD']);
  };
  return { dir, git, commit };
}

function run(dir: string, before: string, after: string) {
  try {
    const out = execFileSync('bash', [GATE, before, after], { cwd: dir, encoding: 'utf8', env: { ...process.env, HOME: dir } });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { code: err.status ?? -1, out: err.stdout ?? '' };
  }
}

afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('commit-hygiene.sh — BUG-011 gate', () => {
  it('H1/H2/H4: docs+src and style+src fail; fix+src and docs+ops pass', () => {
    const { dir, commit } = fixture();
    const base = commit('chore: base', { 'README.md': 'x' });
    const badDocs = commit('docs(ops): notes', { 'apps/web/src/a.ts': 'x' });
    const badStyle = commit('style: prettier', { 'apps/web/src/b.ts': 'x' });
    const goodFix = commit('fix(learning): real fix', { 'apps/web/src/c.ts': 'x' });
    const goodDocs = commit('docs(ops): checkpoint', { 'ops/checkpoints/x/NOTE.md': 'y' });
    expect(goodFix).toBeTruthy();
    expect(goodDocs).toBeTruthy();

    const r1 = run(dir, base, badDocs);
    expect(r1.code).toBe(1);
    expect(r1.out).toContain('VIOLATION');
    expect(r1.out).toContain('docs(ops): notes');

    const r2 = run(dir, base, badStyle);
    expect(r2.code).toBe(1);
    expect(r2.out).toContain('style: prettier');

    const r3 = run(dir, badStyle, goodFix);
    expect(r3.code).toBe(0);
    expect(r3.out).toContain('clean');

    // range containing ONLY the good docs commit (base..goodDocs would span
    // the two bad commits too — the gate is right to fail that range)
    const r4 = run(dir, goodFix, goodDocs);
    expect(r4.code).toBe(0);
  });

  it('H5: the explicit hygiene-waiver trailer passes with a loud log', () => {
    const { dir, commit } = fixture();
    const base = commit('chore: base', { 'README.md': 'x' });
    const waived = commit('style: prettier --write sweep\n\nhygiene-waiver: format-only (prettier), zero semantic change', {
      'apps/web/src/d.ts': 'x',
    });
    const r = run(dir, base, waived);
    expect(r.code).toBe(0);
    expect(r.out).toContain('WAIVED');
    expect(r.out).toContain('hygiene-waiver: format-only');
  });

  it('H6: an unresolvable base skips cleanly (first push of a branch)', () => {
    const { dir, commit } = fixture();
    commit('chore: base', { 'README.md': 'x' });
    const r = run(dir, '0000000000000000000000000000000000000000', 'HEAD');
    expect(r.code).toBe(0);
    expect(r.out).toContain('skip');
  });

  it('the gate script exists in the repo (wired into CI)', () => {
    expect(existsSync(GATE)).toBe(true);
  });
});
