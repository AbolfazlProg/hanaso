/**
 * HANASO — self-hosted webfonts (TASK-M0-09; decision TR-031 / spike M0-07).
 *
 * Why local (not `next/font/google`): SNI-filtering evidence makes foreign font
 * CDNs unreliable inside Iran — including at BUILD time (spike M0-07 §2). All
 * weights are pre-subset woff2 files in `./woff2/`, regenerated with
 * `spikes/fonts-iran/reproduce.sh` (pinned upstream versions there).
 *
 * Loading strategy (spike M0-07 §6-1):
 * - Vazirmatn (Farsi-Digits edition): the ONLY preloaded font — top of the
 *   Persian critical path.
 * - Zen Kaku Gothic New (starter subset): JP UI + furigana; no preload.
 * - Noto Serif JP (variable 200–900, one file): long-form JP text; no preload.
 *
 * The generated families are exposed as `--font-*-loaded` on <html>; the FULL
 * stacks (with system fallbacks) live ONLY in `tokens.css` (DD-067 single
 * source). `--font-ja-ud` (BIZ UDPGothic) is intentionally NOT loaded yet —
 * deferred with its size budget (spike §6-2, +≤700KB).
 *
 * Size budget (hard gate `check:fonts`, cap 2.3MB total — unchanged):
 *   fa ≤170KB · zenkaku starter ≤700KB · noto serif VF ≤1.2MB.
 * (TASK-DSGN-01/DD-084: سقف‌های خانواده‌ای برای پذیرش وزن‌های ۸۰۰/۹۰۰/Black بالا رفتند؛
 * سقف کل ۲٫۳MB و سیاست preload فقط-فارسی بدون تغییر.)
 * OFL license files ship next to the binaries (OFL-*.txt) — OFL requirement.
 */
import localFont from 'next/font/local';

/** فارسی — FD subset (465 glyphs incl. Persian digits ۰–۹).
 * TASK-DSGN-01 (DD-084 — Aizen): وزن‌های ۸۰۰/۹۰۰ اضافه شدند — تایپوگرافی پوستری Aizen
 * («نیلیِ ساختاری») روی وزن‌های سنگین بنا شده؛ بدون آن‌ها هویت جسور جهت هنری قابل‌اجرا نیست. */
export const vazirmatn = localFont({
  src: [
    { path: './woff2/vazirmatn-fd-400.woff2', weight: '400', style: 'normal' },
    { path: './woff2/vazirmatn-fd-500.woff2', weight: '500', style: 'normal' },
    { path: './woff2/vazirmatn-fd-700.woff2', weight: '700', style: 'normal' },
    { path: './woff2/vazirmatn-fd-800.woff2', weight: '800', style: 'normal' },
    { path: './woff2/vazirmatn-fd-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-fa-loaded',
  display: 'swap',
  preload: true, // only the dominant-language font gets preloaded
});

/** ژاپنی UI — Zen Kaku starter subset (M0; upgrade to full past N2 content).
 * TASK-DSGN-01 (DD-084): Black ۹۰۰ اضافه شد — تیترهای CJK پوستری Aizen با tracking باز. */
export const zenkaku = localFont({
  src: [
    { path: './woff2/zenkaku-starter-Regular.woff2', weight: '400', style: 'normal' },
    { path: './woff2/zenkaku-starter-Medium.woff2', weight: '500', style: 'normal' },
    { path: './woff2/zenkaku-starter-Bold.woff2', weight: '700', style: 'normal' },
    { path: './woff2/zenkaku-starter-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-ja-ui-loaded',
  display: 'swap',
  preload: false, // avoid triple preload; lesson pages only
});

/** ژاپنی متن بلند — Noto Serif variable (one file = all weights 200–900). */
export const notoSerifJP = localFont({
  src: [{ path: './woff2/notoserif-vf.woff2', weight: '200 900', style: 'normal' }],
  variable: '--font-ja-serif-loaded',
  display: 'swap',
  preload: false,
});
