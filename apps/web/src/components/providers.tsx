'use client';

/**
 * Root client providers — TASK-M0-09.
 * `DirectionProvider dir="rtl"` is REQUIRED at the app root: without it Radix
 * menus/popovers get `dir="ltr"`, submenus open with the wrong arrow key and
 * anchors flip (spike M0-06 — measured, not assumed).
 */
import { DirectionProvider } from '@radix-ui/react-direction';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <DirectionProvider dir="rtl">{children}</DirectionProvider>;
}
