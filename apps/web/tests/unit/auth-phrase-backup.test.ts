/**
 * HANASO — unit tests: the phrase BACKUP kit (owner revision 2026-11-25).
 *
 * The pure core only (Node-safe): the TXT document and the minimal PDF
 * writer. The canvas/DOM shell is browser-only and covered by the live
 * visual check.
 */
import { describe, expect, it } from 'vitest';
import {
  buildPhraseCardPdf,
  buildPhraseTextFile,
  pdfTitleBytes,
  phraseBackupFileBase,
} from '@/modules/auth/phrase-backup';

const WORDS = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
];

describe('buildPhraseTextFile — the TXT backup', () => {
  it('carries all 12 words, numbered, in order', () => {
    const txt = buildPhraseTextFile(WORDS, { username: 'sakura', now: new Date('2026-11-25T10:00:00Z') });
    WORDS.forEach((word, i) => {
      expect(txt).toContain(`${String(i + 1).padStart(2, ' ')}. ${word}`);
    });
    expect(txt.trimEnd().endsWith('hanaso.ir')).toBe(true);
  });

  it('carries the title, the account line and the honest warning', () => {
    const txt = buildPhraseTextFile(WORDS, { username: 'sakura' });
    expect(txt).toContain('عبارت بازیابی حساب هاناسو');
    expect(txt).toContain('حساب: sakura');
    expect(txt).toContain('حساب‌ات از دست می‌رود');
  });

  it('the account line degrades honestly without a username', () => {
    const txt = buildPhraseTextFile(WORDS, {});
    expect(txt).toContain('حساب هاناسو');
    expect(txt).not.toContain('حساب: ');
  });

  it('ends with a newline and never contains the raw phrase on ONE line', () => {
    const txt = buildPhraseTextFile(WORDS, {});
    expect(txt.endsWith('\n')).toBe(true);
    expect(txt).not.toContain(WORDS.join(' '));
  });
});

describe('buildPhraseCardPdf — the minimal single-page PDF writer', () => {
  // a fake JPEG: real SOI/EOI markers so byte lengths stay realistic
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

  it('produces a standards-shaped PDF: header, xref, trailer, EOF', () => {
    const pdf = buildPhraseCardPdf(jpeg, 1800, 2360);
    const text = Buffer.from(pdf).toString('latin1');
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Page');
    expect(text).toContain('/MediaBox [0 0 595 ');
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain(` /Width 1800 /Height 2360 `);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('the xref offsets point exactly at their objects', () => {
    const pdf = buildPhraseCardPdf(jpeg, 100, 100);
    const text = Buffer.from(pdf).toString('latin1');
    const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF/)?.[1]);
    expect(Number.isFinite(startxref)).toBe(true);
    expect(text.slice(startxref, startxref + 5)).toBe('xref\n');
    // every "NNNNNNNNNN 00000 n" offset lands on "M 0 obj"
    for (const m of text.matchAll(/^(\d{10}) 00000 n $/gm)) {
      const off = Number(m[1]);
      expect(text.slice(off, off + 8)).toMatch(/^([1-5]) 0 obj/);
    }
  });

  it('embeds the raw JPEG bytes untouched', () => {
    const pdf = buildPhraseCardPdf(jpeg, 10, 10);
    const haystack = Buffer.from(pdf);
    const at = haystack.indexOf(Buffer.from(jpeg));
    expect(at).toBeGreaterThan(0);
    expect(textof(haystack)).toContain(`/Length ${jpeg.length} >>`);
  });

  it('keeps a stable page aspect for the card', () => {
    const tall = buildPhraseCardPdf(jpeg, 900, 1800);
    const text = Buffer.from(tall).toString('latin1');
    const h = Number(text.match(/MediaBox \[0 0 595 (\d+)\]/)?.[1]);
    expect(h).toBe(1190); // 595 × (1800/900)
  });
});

function textof(buf: Buffer): string {
  return buf.toString('latin1');
}

describe('pdfTitleBytes — the PDF string-literal escaping rule', () => {
  it('escapes backslash and parentheses', () => {
    const bytes = pdfTitleBytes('a(b)c\\d');
    expect(Buffer.from(bytes).toString('utf8')).toBe('a\\(b\\)c\\\\d');
  });
});

describe('phraseBackupFileBase — download-safe ASCII name', () => {
  it('never contains Persian or spaces', () => {
    const name = phraseBackupFileBase();
    expect(name).toBe('hanaso-recovery-phrase');
    expect(name).toMatch(/^[a-z0-9-]+$/);
  });
});
