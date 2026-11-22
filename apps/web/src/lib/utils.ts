import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * shadcn-style class combiner — HANASO configuration (review r1-F2 fix).
 * The default tailwind-merge does not know our custom `@theme` font-size
 * tokens (text-h1/h2/h3/lead/ja/body/small/caption/display), so it classifies
 * them as colors and silently DROPS them when combined with `text-ink` etc.
 * Registering them in the `font-size` group keeps both alive.
 *
 * ENGINE-NEXTGEN W-B: the font-size whitelist now carries EVERY custom text
 * token of tokens.css — the hero/glyph/word-hero/micro sizes were unregistered
 * (latent: `text-word-hero text-ink` would silently drop the size). The list
 * must stay 1:1 with the `--text-*` scale in src/styles/tokens.css (pinned by
 * tests/unit/ja-typography.test.ts).
 */
const CUSTOM_TEXT_TOKENS = [
  'h1',
  'h2',
  'h3',
  'lead',
  'ja',
  'body',
  'small',
  'caption',
  'display',
  // heroes + glyphs (Aizen/TASK-28)
  'hero-fa',
  'hero-ja',
  'glyph-display',
  'glyph-hero',
  // ENGINE-NEXTGEN W-B — word heroes + micro + seal
  'word-hero',
  'word-hero-lg',
  'micro',
  'seal-glyph',
];
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: CUSTOM_TEXT_TOKENS }],
    },
  },
});

/** Class combiner that understands HANASO custom tokens. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
