/**
 * دروازهٔ توکن‌ها (TASK-M0-09 · AC-3 + پورت کامل DD-067).
 * ۱) فهرست کامل توکن‌های قفل‌شدهٔ KB باید در tokens.css موجود باشد.
 * ۲) هیچ مقدار خام رنگ (hex) در کامپوننت‌ها مجاز نیست — فقط توکن.
 * ۳) هیچ کلاس left/right فیزیکی Tailwind در کامپوننت‌ها نیست (تکمیل stylelint).
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

describe('tokens.css — پورت کامل DD-067 (AC-3)', () => {
  it('همهٔ توکن‌های الزامی KB موجودند', () => {
    const missing = REQUIRED_TOKENS.filter((t) => !tokensCss.includes(t));
    expect(missing, `missing tokens: ${missing.join(', ')}`).toEqual([]);
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
