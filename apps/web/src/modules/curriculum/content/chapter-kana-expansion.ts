/**
 * HANASO — Chapter 01-Expansion: kana bank completion (Issue #146).
 *
 * «بسط کانا» — the compact expansion chapter that completes the kana SYSTEM:
 * 46 dakuten/handakuten + 46 yōon glyphs as registry cards (the 92 base glyphs
 * live in kana-foundation-01). Placement decision (framework-aligned):
 *  - chapter 01 is AT its registered caps (36 core / 441' of 460' — TASK-HANASO-27);
 *    fitting 92 cards there would break CONTENT-103 packets and the minute cap.
 *  - the authored h5 honesty note plans the だ/ば rows «بعداً همراه خودِ ردیف‌ها».
 *  - the framework's kana domain (§7) keeps kana infrastructure PARALLEL and
 *    continuous — a small dedicated expansion chapter, not a heavier ch01.
 * Level: L1 (orderInLevel 2), prerequisite = kana-foundation-01 (CHAPTER-CHAIN).
 */
import type { Chapter } from '../types';
import { KXP_STATIONS } from './chapter-kana-expansion.stations';
import { KXP_EXERCISES, KXP_MASTERY_EXERCISES } from './chapter-kana-expansion.exercises';

export const CHAPTER_KANA_EXPANSION: Chapter = {
  slug: 'kana-expansion-01',
  levelCode: 'L1',
  titleFa: 'فصل ۰۱+ — بسطِ نوشتار: داکوتن، هان‌داکوتن و یُوئون',
  canDoFa:
    'در پایان این فصل نظام کاملِ کانای ژاپنی را می‌خوانی: واک‌دارها (が・ザ)، پ‌دارها (ぱ・パ) و فشرده‌ها (きゃ・キャ) — و واژه‌های واقعیِ هر دو خط با همهٔ نشانه‌ها.',
  summaryFa:
    'بسطِ بانک کانا: ۲۰ ایستگاه، ۹۲ کارتِ تازه (ردیف‌های واک‌دار، پ‌دار و فشرده در هر دو خط)، جفت‌های کمینه با شکل‌های آموخته، یک ایستگاه خواندنِ واقعی و گیت فهم — قواعد از فصل ۰۱، کارت‌ها این‌جا.',
  dialogueSlug: 'kana-expansion-01',
  orderInLevel: 2,
  estMinutes: 179 /* ENGINE-REFORM: hd1/hy1 staged-teaching rebuild (+4) */,
  estLoad: 'light',
  bandArc: 'kana-expansion',
  sceneFa:
    'کافهٔ یامادا، یک هفته بعد. میکی منوی تازهٔ کافه را نشان می‌دهد: واژه‌های واک‌دار و کاناهای کوچک. سورا تابلوی نانوایی محله را می‌خواند — حالا همه‌چیز خواندنی است.',
  words: [],
  grammar: [],
  expressions: [],
  stations: KXP_STATIONS,
  exercises: Object.fromEntries([...KXP_EXERCISES, ...KXP_MASTERY_EXERCISES].map((e) => [e.id, e])),
  mastery: {
    weights: { M1: 0.3, M2: 0.25, M3: 0.2, M4: 0.15, M5: 0.1 },
    measureLabelsFa: {
      M1: 'بازشناسی نشانه‌دار (از شکل به صدا)',
      M2: 'فراخوانی نشانه‌دار (از صدا به شکل)',
      M3: 'رمزگشایی واژهٔ نشانه‌دار',
      M4: 'تمایز جفت‌های نشانه/اندازه',
      M5: 'تمایز شنیداری واژه‌های نشانه‌دار',
    },
    weakPointMap: {
      M1: ['stn-kana-hd1', 'stn-kana-kd2'],
      M2: ['stn-kana-hp1', 'stn-kana-kp1'],
      M3: ['stn-kana-kx1'],
      M4: ['stn-kana-hy3', 'stn-kana-kp1'],
      M5: ['stn-kana-kx1'],
    },
  },
  units: [
    {
      slug: 'section-a-hira-expansion',
      titleFa: 'بسط هیراگانا — واک‌دار، پ‌دار و فشرده',
      summaryFa: 'ردیف‌های が・ざ・だ・ば・ぱ و بسته‌های یُوئون هیراگانا — با جفت‌های کمینهٔ شکل‌های آموخته.',
      stationSlugs: [
        'stn-kana-hd1',
        'stn-kana-hd2',
        'stn-kana-hd3',
        'stn-kana-hd4',
        'stn-kana-hp1',
        'stn-kana-hy1',
        'stn-kana-hy2',
        'stn-kana-hy3',
        'stn-kana-hy4',
      ],
    },
    {
      slug: 'section-b-kata-expansion',
      titleFa: 'بسط کاتاکانا — وام‌واژه‌ها با نشانه‌ها',
      summaryFa: 'ردیف‌های ガ・ザ・ダ・バ・パ و بسته‌های یُوئون کاتاکانا — و ایستگاه خواندنِ واقعی با نظام کامل.',
      stationSlugs: [
        'stn-kana-kd1',
        'stn-kana-kd2',
        'stn-kana-kd3',
        'stn-kana-kd4',
        'stn-kana-kp1',
        'stn-kana-ky1',
        'stn-kana-ky2',
        'stn-kana-ky3',
        'stn-kana-ky4',
        'stn-kana-ky5',
        'stn-kana-kx1',
      ],
    },
  ],
  prerequisiteChapterSlug: 'kana-foundation-01',
};
