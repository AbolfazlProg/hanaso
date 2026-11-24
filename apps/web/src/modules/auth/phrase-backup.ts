/**
 * HANASO — the recovery-phrase BACKUP kit (owner revision 2026-11-25:
 * «عبارت بازیابی رو باید به صورت تکس هم به کاربر بده و امکان دانلودش برا
 * یوزر باشه همچنین pdf هم باید باشه، قابلیت کپی کردن هم»).
 *
 * The phrase must LEAVE the page as user-held text — three honest formats,
 * all built CLIENT-side so the words never make another server round-trip:
 *  - clipboard copy,
 *  - a plain TXT file (selectable, universal),
 *  - a PDF card (print/archive quality).
 *
 * Zero new dependencies, on purpose (the supply-chain rule that brought
 * @scure/bip39 in M3 cuts both ways): the TXT is a template string; the PDF
 * is a minimal single-page writer embedding the card as a JPEG (DCTDecode)
 * — the browser's OWN text engine shapes the Persian on a <canvas>, so the
 * PDF needs no font embedding and no Arabic-shaping math.
 *
 * Pure, unit-testable core (Node-safe):
 *  - `buildPhraseTextFile()` — the TXT document.
 *  - `buildPhraseCardPdf()` — the PDF bytes from already-encoded JPEG bytes.
 * Browser-only shell (guarded, no-ops without DOM):
 *  - `renderPhraseCardCanvas()`, `downloadPhraseTxt()`, `downloadPhrasePdf()`.
 */

import { fa } from '@/messages/fa';

/** Persian digits + full date — shared by the TXT and the PDF card. */
export function phraseFileDateFa(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(now);
}

/** The download-safe file base name (ASCII — never the Persian title). */
export function phraseBackupFileBase(): string {
  return 'hanaso-recovery-phrase';
}

/** The words ARE the secret — the TXT never says anything else about the account. */
export function buildPhraseTextFile(words: string[], meta: { username?: string | null; now?: Date } = {}): string {
  const generatedAt = phraseFileDateFa(meta.now ?? new Date());
  const lines = [
    '='.repeat(48),
    `    ${fa.auth.phraseFileTitle}`,
    '='.repeat(48),
    '',
    fa.auth.phraseFileIntro(meta.username ?? null),
    fa.auth.phraseFileGeneratedAt(generatedAt),
    '',
    '-'.repeat(48),
    ...words.map((word, i) => `${String(i + 1).padStart(2, ' ')}. ${word}`),
    '-'.repeat(48),
    '',
    fa.auth.phraseFileWarning,
    '',
    'hanaso.ir',
  ];
  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ *
 * The minimal PDF writer — ONE page, ONE embedded JPEG.              *
 * Format per ISO 32000 (§7.x): header, objects, xref table with true  *
 * byte offsets, trailer. Pure bytes in, pure bytes out — Node-safe.   *
 * ------------------------------------------------------------------ */

/** A PDF string literal body escaping \ ( ) — the only escapables in (). */
function pdfEscapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Build a single-page PDF embedding the JPEG at full page size.
 * Object layout: 1 Catalog · 2 Pages · 3 Page · 4 Image (DCTDecode, raw
 * JPEG bytes) · 5 Contents — then the xref with true byte offsets.
 */
export function buildPhraseCardPdf(jpeg: Uint8Array, pixelWidth: number, pixelHeight: number): Uint8Array {
  // A4-width portrait page (595pt); the height keeps the card's aspect.
  const pageW = 595;
  const pageH = Math.max(1, Math.round((pageW * pixelHeight) / pixelWidth));
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const imageHeader =
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight}` +
    ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`;

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;
  const push = (part: string | Uint8Array): void => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part;
    parts.push(bytes);
    offset += bytes.length;
  };
  const beginObj = (): void => {
    offsets.push(offset);
    push(`${offsets.length} 0 obj\n`);
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  beginObj();
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  beginObj();
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  beginObj();
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}]` +
      ` /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  beginObj();
  push(imageHeader);
  push(jpeg);
  push('\nendstream\nendobj\n');

  beginObj();
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  const xrefAt = offset;
  const count = offsets.length + 1; // + free entry 0
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(offset);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** PDF string-literal bytes for a title (kept for tests of the escaping rule). */
export function pdfTitleBytes(title: string): number[] {
  return Array.from(new TextEncoder().encode(pdfEscapeText(title)));
}

/* ------------------------------------------------------------------ *
 * Browser shell — everything below touches the DOM and no-ops safely  *
 * outside one (jsdom tests never reach these paths).                  *
 * ------------------------------------------------------------------ */

/** Read the page's loaded Persian font family for canvas text. */
function persianFontFamily(): string {
  if (typeof window === 'undefined') return 'sans-serif';
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--font-fa-loaded');
  const family = raw.trim();
  return family.length > 0 ? `${family}, Vazirmatn, sans-serif` : 'Vazirmatn, sans-serif';
}

/** A design-token color read (canvas needs concrete values). */
function tokenColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.length > 0 ? raw : fallback;
}

export interface PhraseCardMeta {
  username?: string | null;
  now?: Date;
}

/** Draw the backup card on a fresh canvas (2× for print crispness). */
export function renderPhraseCardCanvas(words: string[], meta: PhraseCardMeta = {}): HTMLCanvasElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const faFont = persianFontFamily();
  const ink = tokenColor('--color-ink', '#191C24');
  const inkSoft = tokenColor('--color-ink-soft', '#5A5F6E');
  const indigo = tokenColor('--color-indigo', '#2B3A67');
  const paper = tokenColor('--color-paper', '#FAF7F0');
  const shu = tokenColor('--color-shu', '#C7442E');

  const W = 900;
  const H = 1180;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // paper + frame
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // header
  ctx.fillStyle = indigo;
  ctx.beginPath();
  ctx.arc(W - 64, 78, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = `900 30px ${faFont}`;
  ctx.fillText('هاناسو', W - 88, 88);
  ctx.font = `800 34px ${faFont}`;
  ctx.fillStyle = indigo;
  ctx.fillText(fa.auth.phraseFileTitle, W - 64, 150);

  // meta lines
  ctx.font = `400 21px ${faFont}`;
  ctx.fillStyle = inkSoft;
  ctx.fillText(fa.auth.phraseFileIntro(meta.username ?? null), W - 64, 196);
  ctx.fillText(fa.auth.phraseFileGeneratedAt(phraseFileDateFa(meta.now ?? new Date())), W - 64, 230);

  // words — 2 columns × 6 rows, LTR words inside an RTL layout.
  // Cell contract (visual-check 2026-11-25, VLM round 1): the NUMBER chip
  // owns the cell's right edge; the WORD's right edge sits 44px further in
  // and grows leftward (textAlign right + ltr) — nothing may ever cross the
  // cell bounds, whatever the word length.
  const gridX = 72;
  const gridW = W - 144;
  const colW = gridW / 2;
  const rowH = 84;
  const gridY = 286;
  ctx.strokeStyle = tokenColor('--color-indigo-mist', '#C9CFE3');
  ctx.lineWidth = 2;
  ctx.strokeRect(gridX - 12, gridY - 12, gridW + 24, rowH * 6 + 24);
  words.forEach((word, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2; // 0 = right column (RTL first)
    // the CELL's own right edge: right column hugs the frame, left column
    // ends at the half — both stay inside the stroked grid box.
    const cellRight = col === 0 ? gridX + gridW - 28 : gridX + colW - 28;
    const cy = gridY + row * rowH + rowH / 2;
    // number chip — a filled pill, clearly visible even in print
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = `800 20px ${faFont}`;
    const num = new Intl.NumberFormat('fa-IR').format(i + 1);
    const numW = ctx.measureText(num).width;
    ctx.fillStyle = 'rgba(43, 58, 103, 0.10)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(cellRight - numW - 14, cy - 17, numW + 24, 34, 8);
    } else {
      ctx.rect(cellRight - numW - 14, cy - 17, numW + 24, 34);
    }
    ctx.fill();
    ctx.fillStyle = indigo;
    ctx.fillText(num, cellRight - 2, cy + 7);
    // the word — LTR latin mono, RIGHT-ALIGNED so it grows leftward, never
    // past the cell's right edge (the clipping bug of round 1)
    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.font = `700 27px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = ink;
    ctx.fillText(word, cellRight - 52, cy + 9);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
  });

  // warning box
  const warnY = gridY + rowH * 6 + 48;
  const warnH = 210;
  ctx.fillStyle = 'rgba(199, 68, 46, 0.06)';
  ctx.fillRect(gridX - 12, warnY, gridW + 24, warnH);
  ctx.strokeStyle = shu;
  ctx.lineWidth = 3;
  ctx.strokeRect(gridX - 12, warnY, gridW + 24, warnH);
  ctx.fillStyle = shu;
  ctx.font = `900 24px ${faFont}`;
  ctx.fillText('نگه‌داری امن عبارت', W - 64, warnY + 46);
  ctx.fillStyle = ink;
  ctx.font = `400 21px ${faFont}`;
  // wrap the warning text at ~46 chars per line (Persian wraps on spaces)
  const warningText = fa.auth.phraseFileWarning;
  const wordsOfWarning = warningText.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of wordsOfWarning) {
    if ((line + ' ' + w).trim().length > 52) {
      lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line.trim().length > 0) lines.push(line.trim());
  lines.forEach((l, i) => {
    ctx.fillText(l, W - 76, warnY + 92 + i * 34);
  });

  // footer
  ctx.fillStyle = inkSoft;
  ctx.font = `700 22px ${faFont}`;
  ctx.fillText('hanaso.ir', W - 64, H - 68);

  return canvas;
}

/** Canvas → JPEG bytes (quality 0.92). */
async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('canvas jpeg encode failed');
  return new Uint8Array(await blob.arrayBuffer());
}

/** Trigger a browser download for arbitrary bytes. */
function downloadBytes(bytes: Uint8Array, mime: string, name: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

/** Download the TXT backup. */
export function downloadPhraseTxt(words: string[], meta: PhraseCardMeta = {}): void {
  if (typeof document === 'undefined') return;
  const text = buildPhraseTextFile(words, meta);
  const bytes = new TextEncoder().encode(text);
  downloadBytes(bytes, 'text/plain;charset=utf-8', `${phraseBackupFileBase()}.txt`);
}

/** Render the card and download it as a PDF. */
export async function downloadPhrasePdf(words: string[], meta: PhraseCardMeta = {}): Promise<void> {
  if (typeof document === 'undefined') return;
  const canvas = renderPhraseCardCanvas(words, meta);
  if (!canvas) throw new Error('canvas unavailable');
  const jpeg = await canvasToJpeg(canvas);
  const pdf = buildPhraseCardPdf(jpeg, canvas.width, canvas.height);
  downloadBytes(pdf, 'application/pdf', `${phraseBackupFileBase()}.pdf`);
}
