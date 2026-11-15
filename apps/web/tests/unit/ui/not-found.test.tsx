// @vitest-environment jsdom
/**
 * TASK-HANASO-20 (BUG-010) — the Persian 404. The audit found the default
 * English page on every invalid route; the product is Persian RTL.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

import NotFound from '@/app/not-found';

describe('BUG-010 — the Persian 404', () => {
  it('renders the Persian copy with recovery links (never the English default)', () => {
    render(<NotFound />);
    expect(screen.getByText('این صفحه پیدا نشد')).toBeDefined();
    expect((screen.getByRole('link', { name: 'بازگشت به خانه' }) as HTMLAnchorElement).getAttribute('href')).toBe('/');
    expect((screen.getByRole('link', { name: /رفتن به مسیر یادگیری/ }) as HTMLAnchorElement).getAttribute('href')).toBe('/learn');
    expect(document.body.textContent).not.toContain('This page could not be found');
  });
});
