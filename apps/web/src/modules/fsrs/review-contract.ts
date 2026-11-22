/**
 * HANASO — the Memory Station content-type review contract (KANJI-TWO-PHASE §۳ — 2026-11-22).
 *
 * «ایستگاه حافظه باید از تمام انواع محتوای آموزشی پشتیبانی کند… برای هر نوع
 * محتوا، ساختار بازیابی و تمرین مناسب خودش را تعریف کن.»
 *
 * THIS module is that definition — the ONE data table every review surface
 * (resolver, runner UI, admission checks, regression tests) answers from:
 *
 *   - which FRONT a kind shows (the recall direction),
 *   - what the reveal carries (the recalled knowledge),
 *   - the retrieval/practice STRUCTURE of the kind,
 *   - which resolver fields are REQUIRED (a card missing them is an honest
 *     unknown — «قالب نامناسب Memory برای نوع محتوا» is a contract breach
 *     the regression suite rejects).
 *
 * PURE + exhaustive: `validateReviewContract()` (run in CI) proves every
 * shipped FsrsCardKind has exactly one template and every template's required
 * fields agree with the resolver's output contract (ResolvedReviewCard).
 */
import type { FsrsCardKind } from './integration';

/** The recall direction of a review card's front. */
export type ReviewFront =
  | 'glyph' // the character itself (kana/kanji recognition)
  | 'term' // the Japanese word/expression surface
  | 'sentence' // a dialogue line
  | 'pattern' // a grammar pattern surface
  | 'meaning'; // the Persian meaning (production direction)

/** What the reveal carries after the retrieval attempt. */
export type ReviewReveal =
  | 'sound' // romaji/transliteration (sound recall)
  | 'meaning+reading' // Persian meaning + reading (+ dual pronunciation)
  | 'glyph+strokes' // the character + stroke count (kanji production)
  | 'pattern+function' // the pattern + its Persian function
  | 'line+translation'; // the line + its translation + audio

/** The retrieval/practice structure per content type. */
export type ReviewStructure =
  | 'recognize-sound' // see glyph → recall its sound (kana)
  | 'recall-word' // see term → recall meaning (words)
  | 'recall-from-sound' // hear audio → recall term (audio-word)
  | 'recall-form' // see Persian meaning → produce the Japanese form
  | 'recall-pattern' // see pattern → recall function/usage
  | 'recall-chunk' // see expression → recall its function+reply
  | 'recall-line' // see line context → recall meaning
  | 'recognize-kanji' // see kanji → recall meaning+readings (+ anchor words)
  | 'produce-kanji'; // see meaning+reading → produce/trace the kanji

export interface ReviewTemplateSpec {
  kind: FsrsCardKind;
  /** The content-type label rendered in reports (Persian). */
  typeFa: string;
  front: ReviewFront;
  reveal: ReviewReveal;
  structure: ReviewStructure;
  /** Resolver fields REQUIRED for this template to serve a ratable card. */
  requiredFields: (keyof import('./item-registry').ResolvedReviewCard)[];
  /** The honest note shown on the card (what the retrieval asks for). */
  noteFa: string;
}

/** The ONE template per content kind — the Memory Station's type contract. */
export const REVIEW_TEMPLATES: Record<FsrsCardKind, ReviewTemplateSpec> = {
  w: {
    kind: 'w',
    typeFa: 'واژه — بازیابی معنا',
    front: 'term',
    reveal: 'meaning+reading',
    structure: 'recall-word',
    requiredFields: ['term', 'meaningFa'],
    noteFa: 'واژهٔ ژاپنی را بخوان و معنی‌اش را به یاد بیاور.',
  },
  s: {
    kind: 's',
    typeFa: 'واژه — بازیابی از صدا',
    front: 'term',
    reveal: 'meaning+reading',
    structure: 'recall-from-sound',
    requiredFields: ['term', 'audio'],
    noteFa: 'صدا را گوش کن و واژه را به یاد بیاور.',
  },
  'w-p': {
    kind: 'w-p',
    typeFa: 'واژه — تولید',
    front: 'meaning',
    reveal: 'meaning+reading',
    structure: 'recall-form',
    requiredFields: ['term', 'meaningFa'],
    noteFa: 'معنی فارسی را ببین و شکل ژاپنی واژه را به یاد بیاور.',
  },
  's-line': {
    kind: 's-line',
    typeFa: 'جملهٔ مکالمه',
    front: 'sentence',
    reveal: 'line+translation',
    structure: 'recall-line',
    requiredFields: ['term', 'meaningFa'],
    noteFa: 'جملهٔ مکالمه — همان خطی که واژه را در آن شنیدی.',
  },
  gr: {
    kind: 'gr',
    typeFa: 'گرامر — الگو',
    front: 'pattern',
    reveal: 'pattern+function',
    structure: 'recall-pattern',
    requiredFields: ['term', 'meaningFa'],
    noteFa: 'الگوی گرامری را ببین و کارکردش را به یاد بیاور.',
  },
  chrk: {
    kind: 'chrk',
    typeFa: 'عبارت کاربردی',
    front: 'term',
    reveal: 'meaning+reading',
    structure: 'recall-chunk',
    requiredFields: ['term', 'meaningFa'],
    noteFa: 'عبارت آماده را ببین و کارکرد و پاسخش را به یاد بیاور.',
  },
  kn: {
    kind: 'kn',
    typeFa: 'کانا — تشخیص صدا',
    front: 'glyph',
    reveal: 'sound',
    structure: 'recognize-sound',
    requiredFields: ['glyph', 'romaji'],
    noteFa: 'کانا را ببین و صدایش را به یاد بیاور.',
  },
  'kj-rec': {
    kind: 'kj-rec',
    typeFa: 'کانجی — تشخیص',
    front: 'glyph',
    reveal: 'meaning+reading',
    structure: 'recognize-kanji',
    requiredFields: ['glyph', 'meaningFa', 'strokeCount'],
    noteFa: 'کانجی را ببین و معنا و خوانش‌هایش را به یاد بیاور.',
  },
  'kj-wri': {
    kind: 'kj-wri',
    typeFa: 'کانجی — نوشتن/یادآوری شکل',
    front: 'meaning',
    reveal: 'glyph+strokes',
    structure: 'produce-kanji',
    requiredFields: ['glyph', 'meaningFa', 'strokeCount'],
    noteFa: 'معنی و خوانش را ببین و شکل کانجی (و ترتیب ضربه‌هایش) را به یاد بیاور.',
  },
};

export function reviewTemplateFor(kind: string): ReviewTemplateSpec | undefined {
  return (REVIEW_TEMPLATES as Record<string, ReviewTemplateSpec | undefined>)[kind];
}

/**
 * Contract check — CI-side: every shipped kind has EXACTLY one template and
 * the table covers the whole FsrsCardKind union (a kind without a template is
 * «قالب نامناسب Memory برای نوع محتوا» — the admission gate rejects serving it).
 */
export interface ReviewContractIssue {
  kind: string;
  message: string;
}

export function validateReviewContract(): ReviewContractIssue[] {
  const issues: ReviewContractIssue[] = [];
  const kinds: FsrsCardKind[] = ['w', 's', 'w-p', 's-line', 'gr', 'chrk', 'kn', 'kj-rec', 'kj-wri'];
  for (const kind of kinds) {
    const t = REVIEW_TEMPLATES[kind];
    if (!t) {
      issues.push({ kind, message: 'قالب مرور برای این نوع محتوا تعریف نشده است.' });
      continue;
    }
    if (t.kind !== kind)
      issues.push({ kind, message: `قالب ${t.kind} روی کلید ${kind} نشسته است — قالب نامناسب برای نوع محتوا.` });
    if (t.requiredFields.length === 0)
      issues.push({ kind, message: 'قالب بدون فیلد الزامی — کارت قابل اعتبارسنجی نیست.' });
  }
  const extra = Object.keys(REVIEW_TEMPLATES).filter((k) => !kinds.includes(k as FsrsCardKind));
  for (const k of extra) issues.push({ kind: k, message: 'قالب خارج از فهرست انواع کارت.' });
  return issues;
}

/**
 * Does a resolved card SATISFY its template's required fields? A card that
 * does not is an honest unknown (never ratable) — the reader side refuses to
 * serve a template-broken card. This is the enforcement point of «استفاده از
 * قالب نامناسب Memory برای نوع محتوا رد شود».
 */
export function cardSatisfiesTemplate(card: { kind: string; unknown?: boolean }): {
  ok: boolean;
  missing: string[];
  template: ReviewTemplateSpec | undefined;
} {
  const template = reviewTemplateFor(card.kind);
  if (!template || card.unknown) return { ok: false, missing: [], template };
  const record = card as unknown as Record<string, unknown>;
  const missing = template.requiredFields.filter((f) => record[f] === undefined || record[f] === null);
  return { ok: missing.length === 0, missing: missing as string[], template };
}
