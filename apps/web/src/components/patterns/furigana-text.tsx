/**
 * FuriganaText — TASK-M0-09 (contract: spike M0-08 §6, verbatim).
 *
 * هر «قطعهٔ ژاپنی» = یک فراخوانی FuriganaText = یک جزیرهٔ LTR (`direction:ltr`
 * + `unicode-bidi:isolate` + `lang="ja"`) — این شرط صحت است نه سلیقه (spike §۲:
 * بدون isolate ترتیب قطعه‌ها در پاراگراف فارسی وارونه می‌شود).
 *
 * فقط group-ruby: هر پایه یک واحد معنایی/خوانشی است؛ توزیع کاراکتری jukugo
 * در Blink خراب است (KB bilingual-rtl-ltr).
 *
 * ورودی‌ها:
 *  - `tokens`: آرایهٔ ساختاریافته (قرارداد spike §۶-۱)
 *  - یا `children` با DSL رشته‌ای: `今日[きょう]は` — قلاب `[خوانش]` بعد از پایه؛
 *    `\\[` و `\\]` برای قلاب literal.
 *
 * خروجی متنی (کپی/جست‌وجو) همیشه از baseها ساخته می‌شود نه DOM (rtها
 * user-select:none اند — spike §۵).
 */
import { cn } from '@/lib/utils';

export type FuriganaToken = { t: 'plain'; v: string } | { t: 'ruby'; base: string; rt: string };

export interface FuriganaTextProps {
  tokens?: FuriganaToken[];
  children?: string;
  /** پیش‌فرض 'ja' (WCAG 3.1.2) */
  lang?: string;
  /** فونت: Zen Kaku Gothic New | Noto Serif JP */
  variant?: 'ui' | 'serif';
  /** پیش‌فرض 'over' (سازگار با KB) */
  position?: 'over' | 'under';
  className?: string;
}

/** تبدیل ساختار surface/reading ماژول‌ها (مثل DialogueToken) به توکن‌های این کامپوننت — بدون وابستگی به ماژول خاص (الگوی ماژول‌آگنوستیک). */
export function fromSurfaceReading(parts: ReadonlyArray<{ surface: string; reading?: string }>): FuriganaToken[] {
  return parts.map((p) =>
    p.reading && p.reading !== p.surface ? { t: 'ruby', base: p.surface, rt: p.reading } : { t: 'plain', v: p.surface },
  );
}

/** DSL `[خوانش]` → توکن‌ها. قلاب literal با `\\[` / `\\]`. */
export function parseFuriganaDsl(input: string): FuriganaToken[] {
  const tokens: FuriganaToken[] = [];
  let plain = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '\\' && (input[i + 1] === '[' || input[i + 1] === ']')) {
      plain += input[i + 1];
      i += 1;
      continue;
    }
    if (ch === '[') {
      const close = input.indexOf(']', i + 1);
      if (close === -1) {
        plain += ch; // قلاب باز بدون بسته — literal (محتوا از قبل اعتبارسنجی می‌شود)
        continue;
      }
      const rt = input.slice(i + 1, close);
      // پایه = آخرین «کلمه» قبل از قلاب: هرچه از آخرین مرز جداکننده آمده
      const baseMatch = plain.match(/([^\s。、！？「」…]+)$/);
      const base = baseMatch?.[1] ?? '';
      if (base) {
        plain = plain.slice(0, plain.length - base.length);
        if (plain) tokens.push({ t: 'plain', v: plain });
        plain = '';
        tokens.push({ t: 'ruby', base, rt });
      } else {
        // قلاب بدون پایه — به‌عنوان plain نگه می‌داریم (داده ناقص)
        plain += `[${rt}]`;
      }
      i = close;
      continue;
    }
    plain += ch;
  }
  if (plain) tokens.push({ t: 'plain', v: plain });
  return tokens;
}

/** متن سادهٔ قابل کپی — فقط از baseها (قاعدهٔ spike §۶-۳-۵). */
export function furiganaPlainText(tokens: readonly FuriganaToken[]): string {
  return tokens.map((t) => (t.t === 'plain' ? t.v : t.base)).join('');
}

export function FuriganaText({
  tokens,
  children,
  lang = 'ja',
  variant = 'ui',
  position = 'over',
  className,
}: FuriganaTextProps) {
  const resolved: FuriganaToken[] = tokens ?? (typeof children === 'string' ? parseFuriganaDsl(children) : []);
  return (
    <span lang={lang} className={cn('fg', variant === 'serif' && 'serif', className)} data-position={position}>
      {resolved.map((tok, i) =>
        tok.t === 'plain' ? (
          <span key={i}>{tok.v}</span>
        ) : (
          <ruby key={i}>
            {tok.base}
            <rt>{tok.rt}</rt>
          </ruby>
        ),
      )}
    </span>
  );
}
