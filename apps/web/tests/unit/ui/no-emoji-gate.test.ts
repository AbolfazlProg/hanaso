/**
 * HANASO — No-emoji gate (TASK-LEARNING-07 Wave 3 — Issue #108).
 *
 * The repo-wide product rule: NO glyph emoji / dingbats in product UI (Persian
 * text + lucide icons with aria-labels instead — see dialogue-scene.test.tsx for
 * the per-component precedent). This gate scans SOURCE so a regression fails CI
 * before review:
 *
 * Scope (deliberate, documented):
 * - Dingbats/emoji ranges (\u2300-\u27BF, \u2B00-\u2BFF, \uFE0F, \u{1F000}-\u{1FAFF})
 *   are banned EVERYWHERE under src — they are never legitimate typography here.
 *   This covers ✓ ✗ ⏸ ▶ ✨ ⚠ ❌ ✅ ◦ … in pages, components, messages AND the
 *   curriculum/dialogue CONTENT that renders inside them.
 * - Arrows (\u2190-\u21FF) are additionally banned in the PRODUCT UI SURFACES
 *   (src/app, src/components, src/messages) — Persian copy must use words or
 *   lucide icons, not ←/→/↔ glyphs. Inside src/modules they remain allowed:
 *   engineering strings (validation/warning/EQA messages) and the PROTECTED
 *   chapter-fm01 authored content legitimately use → as chain notation
 *   (Wave 3 rules: fm01 content is off-limits beyond the audited symbols —
 *   the audit found none there).
 * - Comments are stripped before scanning: engineering notes use → and ✓ marks
 *   legitimately (e.g. the RTL-audit headers); the rule governs RENDERED text.
 * - src/modules/curriculum/eqa/report.ts is EXCLUDED — it renders a CLI/terminal
 *   report for engineers (pnpm eqa), never product UI.
 * - .css and font files are out of scope (fonts contain glyph outlines by design).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname, '../../../src');

/** Glyph emoji / dingbats — never legitimate in this codebase's rendered text. */
const DINGBAT_RE = /[\u2300-\u27BF\u2B00-\u2BFF\uFE0F\u{1F000}-\u{1FAFF}]/u;
/** Arrows — banned in product UI surfaces (words/lucide icons instead). */
const ARROW_RE = /[\u2190-\u21FF]/;
/** Files that never render product UI. */
const EXCLUDED = new Set(['modules/curriculum/eqa/report.ts']); // CLI-only engineering report

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p));
      continue;
    }
    // .css and fonts are excluded by extension; tests live outside src
    if (/\.(tsx?|jsx?|yaml|json)$/.test(entry)) out.push(p);
  }
  return out;
}

/**
 * Best-effort comment strip (false negatives are possible with comment-like
 * strings; false positives are not — a scanned hit is always real code/text).
 * `//` line comments, block comments, and `#` comments in YAML.
 */
function stripComments(src: string, isYaml: boolean): string {
  if (isYaml) return src.replace(/^[ \t]*#[^\n]*/gm, ' ');
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** Product UI surfaces where ALSO typographic arrows are banned. */
function isUiSurface(relPath: string): boolean {
  return relPath.startsWith('app/') || relPath.startsWith('components/') || relPath.startsWith('messages/');
}

describe('no-emoji gate — Issue #108 (glyph emoji never render in product UI)', () => {
  const files = walk(SRC_ROOT);

  it('scans a real source tree (sanity — the walk found the app pages)', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.includes(join('app', 'page.tsx')))).toBe(true);
  });

  it('no dingbats/emoji anywhere under src (comments stripped)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const rel = relative(SRC_ROOT, f).split('\\').join('/');
      if (EXCLUDED.has(rel)) continue;
      const code = stripComments(readFileSync(f, 'utf8'), /\.ya?ml$/.test(f));
      code.split('\n').forEach((line, i) => {
        if (DINGBAT_RE.test(line)) offenders.push(`${rel}:${i + 1} ${line.trim().slice(0, 80)}`);
      });
    }
    expect(offenders, `dingbat/emoji found →\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no arrow glyphs in the product UI surfaces (app/, components/, messages/)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const rel = relative(SRC_ROOT, f).split('\\').join('/');
      if (EXCLUDED.has(rel) || !isUiSurface(rel)) continue;
      const code = stripComments(readFileSync(f, 'utf8'), /\.ya?ml$/.test(f));
      code.split('\n').forEach((line, i) => {
        if (ARROW_RE.test(line)) offenders.push(`${rel}:${i + 1} ${line.trim().slice(0, 80)}`);
      });
    }
    expect(offenders, `arrow glyph in UI copy →\n${offenders.join('\n')}`).toEqual([]);
  });
});
