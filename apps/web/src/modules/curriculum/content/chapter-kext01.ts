/**
 * HANASO — Chapter 01X: kana extensions (ISSUE #146 — the completed kana bank).
 *
 * The 92 extension entries (dakuten 40 + handakuten 10 + basic yōon 42, both
 * scripts) as a PROPER chapter: same engine, same gates, same anatomy as
 * chapter-01. Level L1X (the kana band's second stage — after the foundation's
 * 92 base glyphs, before the conversation chapter's band), prerequisite =
 * kana-foundation-01 (progressive reveal: the foundation gate unlocks this).
 *
 * The bank (KANA_ITEMS) grows 92 → 184; every new entry carries the full data
 * row (teaching + audio pair + writing data + FSRS card id) — the anti-recurrence
 * content contract applies from the moment these rows entered the registry.
 */
import type { Chapter } from '../types';
import { KEXT_STATIONS } from './chapter-kext01.stations';
import { KEXT_EXERCISES } from './chapter-kext01.exercises';

const KEXT_SECTIONS: Chapter['units'] = [
  {
    slug: 'section-ext-dakuten',
    titleFa: 'داکوتن و هانداکوتن — صداهای واک‌دار',
    summaryFa:
      'قاعدهٔ ゛/゜ را روی همهٔ ردیف‌ها به کار می‌بَری و ۵۰ کانای واک‌دار/پوزی (۲۵ هیراگانا + ۲۵ کاتاکانا) را با کارت، صوت و نوشتن یاد می‌گیری.',
    stationSlugs: [
      'stn-kana-e0',
      'stn-kana-e1',
      'stn-kana-e2',
      'stn-kana-e3',
      'stn-kana-e4',
      'stn-kana-e5',
      'stn-kana-e6',
      'stn-kana-e7',
      'stn-kana-e8',
      'stn-kana-e9',
      'stn-kana-e10',
    ],
  },
  {
    slug: 'section-ext-yoon',
    titleFa: 'یوون — ترکیب‌های یک‌ضرب',
    summaryFa:
      'کانای کوچک ゃゅょ ضربِ جدید نمی‌سازد: ۴۲ ترکیبِ یوون (۲۱ هیراگانا + ۲۱ کاتاکانا) — و در پایان، تابلوی واقعیِ شهر.',
    stationSlugs: [
      'stn-kana-e11',
      'stn-kana-e12',
      'stn-kana-e13',
      'stn-kana-e14',
      'stn-kana-e15',
      'stn-kana-e16',
      'stn-kana-e17',
      'stn-kana-e18',
      'stn-kana-e19',
      'stn-kana-e20',
      'stn-kana-e21',
      'stn-kana-e22',
      'stn-kana-e23',
      'stn-kana-e24',
      'stn-kana-e25',
      'stn-kana-e26',
    ],
  },
];

export const CHAPTER_KANA_EXTENSIONS: Chapter = {
  slug: 'kana-extensions-01',
  levelCode: 'L1X',
  titleFa: 'فصل ۰۱X — بسط کانا: ゛/゜ و یوون',
  canDoFa:
    'در پایان این فصل همهٔ ۱۸۴ کانای بانک را می‌خوانی: صداهای واک‌دار/پوزی (が، パ…) و ترکیب‌های یک‌ضربِ یوون (きゃ، ショ…) — در واژه‌های واقعی، با صدا و نوشتن.',
  summaryFa:
    'قاعده‌ای که در فصل قبل دیدی حالا کانای مستقل می‌شود: ۵۰ شکلِ ゛/゜ و ۴۲ ترکیبِ یوون — هر کدام با کارت یادسپار، جفت صوت و دادهٔ نوشتاری؛ گیتِ فصل روی همین ۹۲ مدخل تازه.',
  dialogueSlug: 'kana-extensions-01',
  prerequisiteChapterSlug: 'kana-foundation-01',
  orderInLevel: 1,
  estMinutes: 186,
  estLoad: 'medium',
  bandArc: 'dakuten-city',
  sceneFa:
    'میکی و سورا در یک روز شهر می‌چرخند: تابلوی مغازه‌ها، منوی کافه، اعلان ایستگاه — همه پر از صداهای واک‌دار و ترکیب‌های یوون است؛ این فصل همان کلیدها را می‌دهد.',
  words: [],
  grammar: [],
  expressions: [],
  stations: KEXT_STATIONS,
  exercises: Object.fromEntries(KEXT_EXERCISES.map((e) => [e.id, e])),
  mastery: {
    weights: { M1: 0.3, M2: 0.25, M3: 0.2, M4: 0.15, M5: 0.1 },
    measureLabelsFa: {
      M1: 'بازشناسی (از شکل به صدا)',
      M2: 'فراخوانی (از صدا به شکل)',
      M3: 'رمزگشایی واژهٔ تازه',
      M4: 'تمایز جفت‌های شبیه',
      M5: 'تمایز شنیداری صداهای واک‌دار/ترکیبی',
    },
    weakPointMap: {
      M1: ['stn-kana-e1'],
      M2: ['stn-kana-e2'],
      M3: ['stn-kana-e3'],
      M4: ['stn-kana-e5'],
      M5: ['stn-kana-e10'],
    },
  },
  units: KEXT_SECTIONS,
};
