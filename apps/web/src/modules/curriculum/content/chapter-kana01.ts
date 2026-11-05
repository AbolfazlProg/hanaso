/**
 * HANASO — Chapter 01: kana foundation (TASK-LEARNING-06 / WP-2 — Issue #94, DD-117..122).
 *
 * The 32-unit kana stage of section 18 (05A): 4 islands · 31 walk stations
 * (H0..H15, K1..K13, 2 optional branches) · 92-glyph registry · kn- card data.
 * The chapter gate G1 (M-K1..M-K5, thresholds 0.90/0.80 from the L1 level policy)
 * is the assessment-page bank — never a walk station (the product's shared gate
 * architecture; a parallel gate system is forbidden, DD-117).
 *
 * Station/exercise data are GENERATED from the validated WP-0 package (see file
 * headers); this file only assembles the Chapter and owns the island grouping
 * (units[]) + the mastery bank.
 */
import type { Chapter } from '../types';
import { KANA_STATIONS } from './chapter-kana01.stations';
import { KANA_EXERCISES } from './chapter-kana01.exercises';

const KANA_ISLANDS: Chapter['units'] = [
  {
    slug: 'island-1-hira-voice',
    titleFa: 'هیراگانا — صدای ژاپنی',
    summaryFa: 'نیمی از هیراگانا + قواعد آوایی را می‌خوانی (H0..H6)',
    stationSlugs: [
      'stn-kana-h0', 'stn-kana-h1', 'stn-kana-h2', 'stn-kana-h3',
      'stn-kana-h4', 'stn-kana-h5', 'stn-kana-h6',
    ],
  },
  {
    slug: 'island-2-hira-complete',
    titleFa: 'هیراگانا — تکمیل',
    summaryFa: 'هر واژهٔ هیراگانایی جزوهٔ N5 را می‌خوانی (H7..H15 + مرور اختیاری)',
    stationSlugs: [
      'stn-kana-h7', 'stn-kana-h8', 'stn-kana-h9', 'stn-kana-opt-r-h9',
      'stn-kana-h10', 'stn-kana-h11', 'stn-kana-h12', 'stn-kana-h13',
      'stn-kana-h14', 'stn-kana-h15',
    ],
  },
  {
    slug: 'island-3-kata-loanwords',
    titleFa: 'کاتاکانا — زبانِ وام‌واژه‌ها',
    summaryFa: 'منو، برند و وام‌واژه‌ها را می‌خوانی (K1..K12)',
    stationSlugs: [
      'stn-kana-k1', 'stn-kana-k2', 'stn-kana-k3', 'stn-kana-k4',
      'stn-kana-k5', 'stn-kana-k6', 'stn-kana-k7', 'stn-kana-k8',
      'stn-kana-k9', 'stn-kana-k10', 'stn-kana-k11', 'stn-kana-k12',
    ],
  },
  {
    slug: 'island-4-two-scripts',
    titleFa: 'آشتی دو خط',
    summaryFa: 'دو خط را از هم تشخیص می‌دهی و نامت را می‌نویسی (K13 + دریل + گیت)',
    stationSlugs: ['stn-kana-k13', 'stn-kana-opt-drill'],
  },
];

export const CHAPTER_KANA_FOUNDATION: Chapter = {
  slug: 'kana-foundation-01',
  levelCode: 'L1',
  titleFa: 'فصل ۰۱ — مبانی نوشتار: هیراگانا و کاتاکانا',
  canDoFa: 'در پایان این فصل هر دو خط کانای ژاپنی را می‌خوانی و واژه‌های سادهٔ واقعی را رمزگشایی می‌کنی.',
  summaryFa:
    'مسیر کامل کانا برای مبتدی مطلق: ۴ جزیره، ۳۱ ایستگاه، ۹۲ شکل — با یادسپارهای فارسی، واژه‌های واقعیِ همان لحظه و گیت فهم در پایان.',
  dialogueSlug: 'kana-welcome-01',
  orderInLevel: 1,
  estMinutes: 338,
  estLoad: 'medium',
  bandArc: 'kana-foundation',
  sceneFa:
    'قبل از اولین مکالمهٔ ژاپنی‌ات، الفبایش را می‌آموزی: هیراگانا (خط بومی) و کاتاکانا (خط وام‌واژه‌ها). هر ایستگاه چند صدا و چند شکل تازه باز می‌کند — و همان لحظه واژه‌های واقعی که می‌توانی بخوانی.',
  words: [],
  grammar: [],
  expressions: [],
  stations: KANA_STATIONS,
  exercises: Object.fromEntries(KANA_EXERCISES.map((e) => [e.id, e])),
  mastery: {
    // M-K1..M-K5 profile (DD-120 / thresholds.json — kana gate 0.90/0.80 lives in the
    // L1 level policy, never here). Weights are HANASO-proposed v1 data (no KB source
    // fixes kana measure weights — flagged for owner calibration via OQ-052).
    weights: { M1: 0.3, M2: 0.25, M3: 0.2, M4: 0.15, M5: 0.1 },
    measureLabelsFa: {
      M1: 'بازشناسی (شکل → صدا)',
      M2: 'فراخوانی (صدا → شکل)',
      M3: 'رمزگشایی واژهٔ تازه',
      M4: 'تمایز جفت‌های شبیه',
      M5: 'تولید نوشتاری (تا فعال‌سازی IME سبک — OQ-007 — به‌صورت انتخابی)',
    },
    weakPointMap: {
      M1: ['stn-kana-opt-r-h9'],
      M2: ['stn-kana-opt-r-h9'],
      M3: ['stn-kana-k13'],
      M4: ['stn-kana-opt-drill'],
      M5: ['stn-kana-opt-drill'],
    },
  },
  units: KANA_ISLANDS,
};
