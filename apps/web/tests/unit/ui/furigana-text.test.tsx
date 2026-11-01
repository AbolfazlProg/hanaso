/**
 * FuriganaText — تست‌های واحد (TASK-M0-09).
 * قرارداد: spike M0-08 §۶ (props + DSL + قواعد bidi isolation).
 * رندر با react-dom/server (بدون نیاز به jsdom) — همان خروجی SSR.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  FuriganaText,
  furiganaPlainText,
  fromSurfaceReading,
  parseFuriganaDsl,
} from '@/components/patterns/furigana-text';

describe('parseFuriganaDsl', () => {
  it('متن ساده را بدون تغییر عبور می‌دهد', () => {
    expect(parseFuriganaDsl('こんにちは')).toEqual([{ t: 'plain', v: 'こんにちは' }]);
  });

  it('قلاب پایه+خوانش را به ruby تبدیل می‌کند', () => {
    expect(parseFuriganaDsl('今日[きょう]は')).toEqual([
      { t: 'ruby', base: '今日', rt: 'きょう' },
      { t: 'plain', v: 'は' },
    ]);
  });

  it('چند روبی در یک رشته', () => {
    expect(parseFuriganaDsl('日本語[にほんご]を 勉強[べんきょう]します。')).toEqual([
      { t: 'ruby', base: '日本語', rt: 'にほんご' },
      { t: 'plain', v: 'を ' },
      { t: 'ruby', base: '勉強', rt: 'べんきょう' },
      { t: 'plain', v: 'します。' },
    ]);
  });

  it('قلاب literal با بک‌اسلش', () => {
    expect(parseFuriganaDsl('a\\[b\\]')).toEqual([{ t: 'plain', v: 'a[b]' }]);
  });

  it('قلاب بازِ بدون بسته → literal (داده ناقص شکست نمی‌دهد)', () => {
    expect(parseFuriganaDsl('今日[きょう')).toEqual([{ t: 'plain', v: '今日[きょう' }]);
  });

  it('قلاب بدون پایه → به‌عنوان plain حفظ می‌شود', () => {
    expect(parseFuriganaDsl(' [x]')).toEqual([{ t: 'plain', v: ' [x]' }]);
  });
});

describe('fromSurfaceReading', () => {
  it('reading مساوی surface → plain (روبی بی‌مورد نمی‌سازد)', () => {
    expect(fromSurfaceReading([{ surface: 'コーヒー', reading: 'コーヒー' }, { surface: 'を' }])).toEqual([
      { t: 'plain', v: 'コーヒー' },
      { t: 'plain', v: 'を' },
    ]);
  });

  it('reading متفاوت → ruby (سازگار با DialogueToken)', () => {
    expect(fromSurfaceReading([{ surface: 'お願い', reading: 'おねがい' }])).toEqual([
      { t: 'ruby', base: 'お願い', rt: 'おねがい' },
    ]);
  });
});

describe('furiganaPlainText', () => {
  it('فقط از baseها می‌سازد — rt هرگز وارد متن کپی نمی‌شود (spike §۶-۳-۵)', () => {
    expect(
      furiganaPlainText([
        { t: 'ruby', base: '今日', rt: 'きょう' },
        { t: 'plain', v: 'は' },
      ]),
    ).toBe('今日は');
  });
});

describe('FuriganaText markup (SSR)', () => {
  const markup = renderToStaticMarkup(
    <FuriganaText
      tokens={[
        { t: 'ruby', base: '今日', rt: 'きょう' },
        { t: 'plain', v: 'は' },
      ]}
    />,
  );

  it('جزیرهٔ lang=ja دارد (WCAG 3.1.2)', () => {
    expect(markup).toContain('lang="ja"');
  });

  it('کلاس جزیرهٔ fg روی ریشه است (direction:ltr + isolate از globals.css)', () => {
    expect(markup).toMatch(/<span[^>]*class="fg"/);
  });

  it('ساختار ruby/rt گروهی — نه توزیع کاراکتری', () => {
    expect(markup).toContain(
      '<ruby>今日<rp aria-hidden="true">（</rp><rt>きょう</rt><rp aria-hidden="true">）</rp></ruby>',
    );
    expect(markup).not.toMatch(/<ruby>[^<]<\/ruby>/);
  });

  it('position پیش‌فرض over و variant پیش‌فرض ui', () => {
    expect(markup).toContain('data-position="over"');
    expect(markup).not.toContain('serif');
  });

  it('variant=serif کلاس serif اضافه می‌کند و position قابل تنظیم است', () => {
    const m2 = renderToStaticMarkup(
      <FuriganaText tokens={[{ t: 'plain', v: 'て' }]} variant="serif" position="under" />,
    );
    expect(m2).toContain('serif');
    expect(m2).toContain('data-position="under"');
  });

  it('children رشته‌ای با همان DSL توکن می‌شود', () => {
    const m3 = renderToStaticMarkup(<FuriganaText>今日[きょう]は</FuriganaText>);
    expect(m3).toContain(
      '<ruby>今日<rp aria-hidden="true">（</rp><rt>きょう</rt><rp aria-hidden="true">）</rp></ruby>',
    );
  });
});
