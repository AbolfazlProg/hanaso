/**
 * HANASO — Addendum-4 unit tests (TASK-LEARNING-08 #117 addendum 4).
 *
 * §7 — the CONTENT VALIDATOR for example-word audio: every example word the
 * learner can see in the example-set blocks (kana chapter + first-conversation
 * chapter) must have a committed, independent audio asset in the per-word
 * registry; a missing one must be VISIBLE in the validator output (named by
 * word) and the UI must never render a dead play control for it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { ExampleAudioButton } from '@/components/curriculum/example-audio-button';

const webRoot = join(__dirname, '..', '..', '..');

/**
 * Extract the unique example words from a stations file. Only speakable
 * examples count: template sentences with blanks/placeholders (___ / NAME /
 * …) are authoring scaffolds, not displayable examples — the UI never shows
 * them as a finished example word.
 */
function uniqueExampleWords(stationsFile: string): string[] {
  const src = readFileSync(join(webRoot, 'src', 'modules', 'curriculum', 'content', stationsFile), 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(/role:\s*'(?:anchor|near|varied|faded|reading)',\s*\n\s*ja:\s*'([^']+)'/g)) {
    const ja = m[1]!;
    if (/___|NAME|…/.test(ja)) continue; // template scaffold — not a speakable example
    out.add(ja);
  }
  return [...out];
}

describe('example-word audio — Addendum-4 §7 (content validator)', () => {
  it('every example word in the kana + first-conversation chapters has a committed audio entry', () => {
    const manifest = JSON.parse(
      readFileSync(join(webRoot, 'public', 'audio', 'hostwords', 'manifest.json'), 'utf8'),
    ) as { entries: Record<string, unknown> };
    const words = [
      ...new Set([
        ...uniqueExampleWords('chapter-kana01.stations.ts'),
        ...uniqueExampleWords('chapter-fm01.stations.ts'),
      ]),
    ];
    expect(words.length, 'the example corpus shrank — the extractor broke').toBeGreaterThan(90);
    const missing = words.filter((w) => !manifest.entries[w]);
    expect(
      missing,
      `example words WITHOUT a committed audio asset — each must be generated, or the UI hides its play control: ${missing.join('، ')}`,
    ).toEqual([]);
  });

  it('an example with no asset renders NO play control (never a dead button)', () => {
    const { container } = render(<ExampleAudioButton word="え" urls={null} />);
    expect(container.querySelector('[data-example-audio]')).toBeNull();
  });

  it('an example with an asset renders the control bound to THIS word', () => {
    const { container } = render(
      <ExampleAudioButton word="コーヒー" urls={{ opus: '/audio/hostwords/%E3%82%B3%E3%83%BC%E3%83%92%E3%83%BC.opus', m4a: '/audio/hostwords/%E3%82%B3%E3%83%BC%E3%83%92%E3%83%BC.m4a' }} />,
    );
    const btn = container.querySelector('[data-example-audio]');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('data-example-word')).toBe('コーヒー');
    expect(btn?.getAttribute('aria-label')).toContain('コーヒー');
  });
});
