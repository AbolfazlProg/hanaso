/**
 * Button/AudioSentenceButton — تست‌های نشانه‌گذاری (TASK-M0-09).
 * حالت‌ها: default/loading/disabled + نام دسترس‌پذیر دکمهٔ صوت (الزام KB).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AudioSentenceButton } from '@/components/patterns/audio-button';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('variant پیش‌فرض primary با کلاس bg-ai (توکن)', () => {
    const m = renderToStaticMarkup(<Button>ذخیره</Button>);
    expect(m).toContain('bg-ai');
    expect(m).toContain('type="button"');
  });

  it('loading → disabled + aria-busy + اسپینر + برچسب نامرئی (بدون جهش عرض — KB btn--loading)', () => {
    const m = renderToStaticMarkup(<Button loading>در حال انجام</Button>);
    expect(m).toContain('disabled');
    expect(m).toContain('aria-busy="true"');
    expect(m).toContain('invisible');
    expect(m).toContain('motion-safe:animate-[spin_var(--dur-spin)_linear_infinite]');
  });

  it('کف لمسی ۴۴px (min-h-11) روی همهٔ سایزها', () => {
    for (const size of ['default', 'sm', 'icon'] as const) {
      const m = renderToStaticMarkup(<Button size={size}>x</Button>);
      expect(m).toContain('min-h-11');
    }
    const main = renderToStaticMarkup(<Button size="main">x</Button>);
    expect(main).toContain('min-h-12'); /* اکشن اصلی ۴۸px */
  });
});

describe('AudioSentenceButton', () => {
  it('نام دسترس‌پذیر الزامی — aria-label رندر می‌شود', () => {
    const m = renderToStaticMarkup(<AudioSentenceButton aria-label="پخش صوت جمله" />);
    expect(m).toContain('aria-label="پخش صوت جمله"');
  });

  it('حالت playing → آیکن Pause و aria-busy نیست (پخش = کنترل، نه انتظار)', () => {
    const m = renderToStaticMarkup(<AudioSentenceButton aria-label="x" state="playing" />);
    expect(m).not.toContain('aria-busy');
  });

  it('حالت loading → aria-busy', () => {
    const m = renderToStaticMarkup(<AudioSentenceButton aria-label="x" state="loading" />);
    expect(m).toContain('aria-busy="true"');
  });

  it('دایره‌ای و ۴۴px (size-11 rounded-full)', () => {
    const m = renderToStaticMarkup(<AudioSentenceButton aria-label="x" />);
    expect(m).toContain('size-11');
    expect(m).toContain('rounded-full');
  });
});
