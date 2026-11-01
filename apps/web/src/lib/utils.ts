import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * shadcn-style class combiner — HANASO configuration (review r1-F2 fix).
 * The default tailwind-merge does not know our custom `@theme` font-size
 * tokens (text-h1/h2/h3/lead/ja/body/small/caption/display), so it classifies
 * them as colors and silently DROPS them when combined with `text-ink` etc.
 * Registering them in the `font-size` group keeps both alive.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['h1', 'h2', 'h3', 'lead', 'ja', 'body', 'small', 'caption', 'display'],
        },
      ],
    },
  },
});

/** Class combiner that understands HANASO custom tokens. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
