/**
 * دروازهٔ توکن‌ها (TASK-M0-09 · AC-3 + پورت کامل؛ مقادیر: DD-084/Aizen).
 * ۱) فهرست کامل توکن‌های قفل‌شدهٔ KB باید در tokens.css موجود باشد.
 * ۲) هیچ مقدار خام رنگ (hex) در کامپوننت‌ها مجاز نیست — فقط توکن.
 * ۳) هیچ کلاس left/right فیزیکی Tailwind در کامپوننت‌ها نیست (تکمیل stylelint).
 * TASK-DSGN-01 (DD-084 — Aizen): مقدارهای قفل، از پالت «کاغذ و مرکب» DD-067 به
 * پالت Aizen تغییر کردند (ابطال جزئی مقدارهای DD-064/067 با دستور مالک
 * 2026-11-02)؛ روش قفل عددی و الزام WCAG پابرجاست — این دروازه حالا پالت
 * Aizen را ۱:۱ قفل می‌کند تا drift نیفتد.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const tokensCss = readFileSync(join(import.meta.dirname, '../../../src/styles/tokens.css'), 'utf8');

const REQUIRED_TOKENS = [
  // رنگ‌ها (نمونهٔ کامل + توکن‌های تأخیری پورت کامل)
  '--color-paper',
  '--color-surface-warm',
  '--color-surface-muted',
  '--color-surface-sunken',
  '--color-ink',
  '--color-ink-soft',
  '--color-ink-faint',
  '--color-ai',
  '--color-ai-deep',
  '--color-shu',
  '--color-success',
  '--color-error',
  '--color-warning',
  '--color-info',
  '--color-speaker-1',
  '--color-speaker-2',
  '--color-speaker-3',
  '--color-chart-1',
  '--color-chart-4',
  '--color-chart-5',
  '--color-scrim',
  '--color-overlay-audio',
  // فونت‌ها — نام‌های KB
  '--font-fa',
  '--font-ja-ui',
  '--font-ja-serif',
  '--font-ja-ud',
  // مقیاس تایپ + ارتفاع خط
  '--text-caption',
  '--text-body',
  '--text-ja',
  '--text-display',
  '--leading-fa',
  '--leading-ja',
  '--tracking-ja-heading',
  '--furigana-size',
  // شعاع‌ها + full
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-full',
  // سایه‌ها
  '--shadow-card',
  '--shadow-raised',
  // Aizen (DD-084) — نیلی ساختاری + گوینده‌های روشن + آفست سخت
  '--color-indigo',
  '--color-indigo-deep',
  '--color-indigo-mist',
  '--color-indigo-wash',
  '--color-speaker-1-l',
  '--color-speaker-2-l',
  '--color-speaker-3-l',
  '--shadow-offset-cta',
  '--shadow-offset-indigo',
  '--text-hero-fa',
  '--text-hero-ja',
  '--tracking-poster',
  // حرکت — شامل shimmer/spin (بدهی review B-8)
  '--dur-micro',
  '--dur-fast',
  '--dur-phase',
  '--dur-ceremonial',
  '--dur-shimmer',
  '--dur-spin',
  '--ease-out',
  '--ease-soft',
  // z + ابعاد
  '--z-sticky',
  '--z-drawer',
  '--z-fab',
  '--z-toast',
  '--z-modal',
  '--touch-min',
  '--touch-main',
  '--frame-scene-w',
  '--focus-ring',
];

describe('tokens.css — پورت کامل (مقادیر Aizen · DD-084/AC-3)', () => {
  it('همهٔ توکن‌های الزامی KB موجودند', () => {
    const missing = REQUIRED_TOKENS.filter((t) => !tokensCss.includes(t));
    expect(missing, `missing tokens: ${missing.join(', ')}`).toEqual([]);
  });

  it('مقادیر قفل‌شدهٔ کلیدی ۱:۱ با DD-084 (Aizen) هستند (نمونه‌گیری نقطه‌ای)', () => {
    // Values locked by DD-084 (owner decision 2026-11-02) — Aizen palette
    // (KB design-lab/visual-direction/02-art-directions.md §مسیر ب).
    const locked = {
      '--color-paper': '#faf7ef', // paper-b (indigo 12.61:1)
      '--color-ink': '#2b2a28',
      '--color-indigo': '#173049', // structural anchor
      '--color-indigo-deep': '#12253a',
      '--color-indigo-mist': '#c9d8e4',
      '--color-ai': '#1d4e70',
      '--color-shu': '#c2401c',
      '--color-shu-deep': '#a33317',
      '--color-speaker-1-l': '#8fc3e8',
      '--color-warning': '#7a6119', // the REJECTED 8A6D1F must never come back
      '--radius-full': '9999px',
      '--touch-main': '48px',
      '--frame-scene-w': '1024px',
      '--furigana-size': 'max(0.5em, 12px)',
      '--dur-spin': '800ms',
      '--dur-shimmer': '1400ms',
      '--leading-fa': '1.8',
      '--leading-ja': '1.9',
    };
    const offenders = Object.entries(locked).filter(([k, v]) => !tokensCss.includes(`${k}: ${v}`));
    expect(offenders, `value drift: ${JSON.stringify(offenders)}`).toEqual([]);
  });

  it('کاهش حرکت، shimmer و spin را صفر می‌کند (AC-907)', () => {
    const reduced = tokensCss.slice(tokensCss.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('--dur-shimmer: 0ms');
    expect(reduced).toContain('--dur-spin: 0ms');
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(e)) out.push(p);
  }
  return out;
}

const componentDirs = ['components/ui', 'components/patterns'];

describe('کامپوننت‌ها — توکن‌محور و RTL-safe', () => {
  const files = componentDirs.flatMap((d) => walk(join(import.meta.dirname, '../../../src', d)));

  it('حداقل ۹ کامپوننت ui و ۴ pattern وجود دارد', () => {
    const ui = walk(join(import.meta.dirname, '../../../src/components/ui'));
    const patterns = walk(join(import.meta.dirname, '../../../src/components/patterns'));
    expect(ui.length).toBeGreaterThanOrEqual(9);
    expect(patterns.length).toBeGreaterThanOrEqual(4);
  });

  it('هیچ رنگ hex خام در کامپوننت‌ها نیست (فقط توکن)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hex) offenders.push(`${f}: ${hex.join(',')}`);
    }
    expect(offenders, `raw hex found → ${offenders.join(' | ')}`).toEqual([]);
  });

  it('هیچ کلاس left-/right- فیزیکی Tailwind در کامپوننت‌ها نیست', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // left-2 / right-[4px] / -left-1 … (sm:left-0 هم)
      const physical = src.match(/(?:\b|:)-?(?:left|right)-[\d.[\]a-z]/g);
      if (physical) offenders.push(`${f}: ${physical.join(',')}`);
    }
    expect(offenders, `physical side utilities → ${offenders.join(' | ')}`).toEqual([]);
  });

  it('هر کامپوننت ui سربرگ RTL-audit دارد (قاعدهٔ KB §۵-۲)', () => {
    const uiFiles = walk(join(import.meta.dirname, '../../../src/components/ui'));
    const missing = uiFiles.filter((f) => !readFileSync(f, 'utf8').includes('RTL-audit'));
    expect(missing, `no RTL-audit header → ${missing.join(', ')}`).toEqual([]);
  });
});
