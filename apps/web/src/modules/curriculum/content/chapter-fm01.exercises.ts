/**
 * HANASO — Chapter 1 (first conversation) exercise bank — TASK-LEARNING-06 05B rebuild.
 *
 * PROVENANCE: exercises are HANASO-original compositions (OQ-029/030/033 — no Attain
 * exercise prose is reproduced; the source PDF exercise sections were empty anyway).
 * Station mapping + item mix per KB section 19 LESSON_ACTIVITY_MAP §۲/§۳ (19-station
 * two-unit map) + LEARNING_SEQUENCE_POLICY (recall-first ≥60%, Q1 ≤30%, packets with
 * in-flow retrieval). Non-overlapping mastery pool (QUESTION §۵-۱): the gate items
 * (M1..M5) are NEVER referenced by station blocks.
 *
 * Feedback ladder: F1 statement → F2 hint (+ server-side option elimination — #106)
 * → F3 explanation + reveal; referenceBlockId powers the F4 return link (#106).
 */
import type { Exercise } from '../types';

const L = (n: number) => `s-first-meeting-01-l${n}`;

/** helper: 3 options with the correct one placed by index (varied per item — EQA-4). */
const o3 = (
  id: string,
  correct: string,
  wrong1: string,
  wrong2: string,
  correctAt: 0 | 1 | 2,
): { options: { id: string; label: string }[]; correctOptionId: string } => {
  const labels = [wrong1, wrong2];
  labels.splice(correctAt, 0, correct);
  const ids = ['a', 'b', 'c'];
  const correctId = ids[correctAt]!;
  return {
    options: labels.map((label, i) => ({ id: ids[i]!, label })),
    correctOptionId: correctId,
  };
};

export const FM01_EXERCISES: Exercise[] = [
  /* ════════════════════════ UNIT 02-1 · VOCAB-1 (stn-fm01-02-vocab) ════════════════════════ */
  // packet 1 retrieval (watashi / san / nihonjin)
  {
    id: 'ex-fm01-v1-p1-aud-1',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-watashi',
    audioLineRef: L(3),
    difficulty: 1,
    promptFa: 'به صدا گوش بده — این واژه چه معنایی دارد؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'من', 'شما / تو', 'آن شخص', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'این واژه «من» است — به کارت واژه برگرد و دوباره گوش بده.',
      f2HintFa: 'اولین واژهٔ خط ۳؛ دربارهٔ خودِ گوینده.',
      f3ExplainFa: 'わたし = من (ضمیر اول شخص).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v1-card-watashi',
  },
  {
    id: 'ex-fm01-v1-p1-aud-2',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-nihonjin',
    audioLineRef: L(3),
    difficulty: 1,
    promptFa: 'به صدا گوش بده — کدام ملیت را شنیدی؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'ژاپنی', 'چینی', 'کره‌ای', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ملیتی که شنیدی «ژاپنی» بود — にほん را با ちゅうごک قاطی نکن.',
      f2HintFa: 'ni-ho-n-ji-n؛ در خط ۳ یامادا دربارهٔ خودش می‌گوید.',
      f3ExplainFa: 'にほんじん = ژاپنی (اهل ژاپن).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v1-card-nihonjin',
  },
  // packet 2 retrieval (chuugokujin / daigaku / sensee)
  {
    id: 'ex-fm01-v1-p2-aud-1',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-chuugokujin',
    audioLineRef: L(5),
    difficulty: 2,
    promptFa: 'به صدا گوش بده — کدام ملیت؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'چینی', 'ژاپنی', 'ایرانی', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: '«چینی» بود — دقت کن: chuugoku دو واکهٔ کشیده دارد.',
      f2HintFa: 'ملیتی که سورا دربارهٔ خودش تأیید می‌کند (خط ۶).',
      f3ExplainFa: 'ちゅうごくじん = چینی (اهل چین).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v1-card-chuugokujin',
  },
  {
    id: 'ex-fm01-v1-p2-txt-1',
    type: 'meaning-select',
    targetSkill: 'vocab',
    targetConcept: 'voc-daigaku',
    lineRef: L(8),
    difficulty: 1,
    promptFa: 'この言葉（ことば）は何（なに）？ — だいがく',
    promptJa: 'だいがく',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'دانشگاه', 'مدرسه', 'معلم', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'مدرسه = がっこう — در این فصل نیست؛ جفت اشتباه‌پذیر آینده.',
      c: 'معلم = せんせい — ربط کار/مکان را قاطی نکن.',
    },
    feedback: {
      f1Fa: '「だいがく» یعنی دانشگاه.',
      f2HintFa: 'محل کارِ علیِ استاد — だいがくの せんせい.',
      f3ExplainFa: 'だいがく = دانشگاه (الگو: だい=بزرگ + がく=مکتب/علم).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v1-card-daigaku',
  },
  // packet 3 retrieval (anokata / iranjin)
  {
    id: 'ex-fm01-v1-p3-match-1',
    type: 'match-in-line',
    targetSkill: 'vocab',
    targetConcept: 'voc-iranjin',
    lineRef: L(8),
    difficulty: 1,
    promptFa: 'کدام واژه در نوبت ۸ آمده است؟',
    promptJa: 'イランじん',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'イランじん', 'かんこくじん', 'ちゅうごくじん', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'かんこくじん در خط ۱۱ می‌آید — بعداً می‌آموزیم.',
      c: 'ちゅうごくじん در خط ۵ و ۶ است، نه ۸.',
    },
    feedback: {
      f1Fa: 'درست! نوبت ۸ دربارهٔ علی است: イランじんです.',
      f2HintFa: 'یامادا سه جمله دربارهٔ علی می‌گوید؛ ملیت او کدام است؟',
      f3ExplainFa: 'خط ۸: アリさん です。イランじん です。だいがくの せんせい です。',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v1-card-iranjin',
  },
  // base diagnostic (station-end mix)

  /* ════════════════════════ GRAMMAR-1 (stn-fm01-03-grammar-desu) ════════════════════════ */
  {
    id: 'ex-fm01-g1-order-1',
    type: 'word-order',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-identity',
    lineRef: L(6),
    difficulty: 1,
    promptFa: 'کلمات را بچین: «من چینی‌ام»',
    chunks: [
      { id: 'c1', ja: 'わたしは' },
      { id: 'c2', ja: 'ちゅうごくじん' },
      { id: 'c3', ja: 'です' },
    ],
    correctOrder: ['c1', 'c2', 'c3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ترتیب درست: موضوع → هویت → です.',
      f2HintFa: '«من» اول می‌آید و は آخرش؛ です همیشه پایان.',
      f3ExplainFa: 'わたしは ちゅうごくじんです = من چینی‌ام (AはBです).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g1-rule',
  },
  {
    id: 'ex-fm01-g1-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-identity',
    lineRef: L(8),
    difficulty: 1,
    promptFa: 'جای خالی را پر کن: «آلی استاد دانشگاه است»',
    promptJa: 'アリさんは だいがくの せんせい ___。',
    clozeTokens: ['アリさんは', 'だいがくの', 'せんせい', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'です', 'ですか', 'ですね', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'ですか = پرسش — این جمله خبری است.',
      c: 'ですね = تأیید شنیده‌ها — این‌جا معرفی است نه تأیید.',
    },
    feedback: {
      f1Fa: 'جملهٔ خبری مؤدبانه با です تمام می‌شود.',
      f2HintFa: 'پرسش نیست، تأیید هم نیست — معرفی ساده.',
      f3ExplainFa: 'AはBです — جملهٔ خبری: アリさんは だいがくの せんせいです。',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g1-rule',
  },
  {
    id: 'ex-fm01-g1-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-desu-identity',
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'بساز: «من ایرانی‌ام»',
    chips: [
      { id: 'p1', ja: 'わたしは' },
      { id: 'p2', ja: 'イランじん' },
      { id: 'p3', ja: 'です' },
    ],
    acceptedChipOrder: ['p1', 'p2', 'p3'],
    feedback: {
      f1Fa: 'یک چیپ اضافه داری — این جمله خبری است.',
      f2HintFa: 'سه چیپ کافی است: موضوع + هویت + پایان‌بندی.',
      f3ExplainFa: 'わたしは イランじんです — همان الگوی خط ۳.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g1-rule',
  },
  {
    id: 'ex-fm01-g1-prod-2',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-desu-identity',
    lineRef: L(8),
    difficulty: 2,
    promptFa: 'بساز: «[نام تو] دانشجو است» — جای نام، چیپ نام را بگذار',
    chips: [
      { id: 'n1', ja: 'NAME' },
      { id: 'n2', ja: 'は' },
      { id: 'n3', ja: 'がくせい' },
      { id: 'n4', ja: 'です' },
    ],
    acceptedChipOrder: ['n1', 'n2', 'n3', 'n4'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ترتیب: نام + は + هویت + です.',
      f2HintFa: 'がくせい (دانشجو) واژهٔ شناخته‌شدهٔ این فصل است — با همین الگو.',
      f3ExplainFa: '[نام]さんは がくせいです — معرفی کامل خودت!',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g1-rule',
  },

  /* ════════════════════════ STRUCTURE (stn-fm01-04-structure) ════════════════════════ */
  {
    id: 'ex-fm01-st-order-1',
    type: 'word-order',
    targetSkill: 'structure',
    targetConcept: 'sov-bridge-persian',
    lineRef: L(3),
    difficulty: 1,
    promptFa: 'کلمات جملهٔ «یامادا ژاپنی است» را به ترتیب ژاپنی بچین',
    chunks: [
      { id: 's1', ja: 'やまだは' },
      { id: 's2', ja: 'にほんじん' },
      { id: 's3', ja: 'です' },
    ],
    correctOrder: ['s1', 's2', 's3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ترتیب فارسی و ژاپنی این‌جا یکی است: موضوع اول، فعل آخر.',
      f2HintFa: 'فعل/هویت‌ساز (です) همیشه آخر می‌نشیند.',
      f3ExplainFa: 'やまだは にほんじんです — مثل فارسی: «یامادا ژاپنی است».',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-st-rule',
  },

  /* ════════════════════════ GRAMMAR-2 (stn-fm01-05-grammar-qa) ════════════════════════ */
  {
    id: 'ex-fm01-g2-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-qa',
    lineRef: L(5),
    difficulty: 2,
    promptFa: 'جای خالی: «پس سورا هستید. چینی هستید؟»',
    promptJa: 'ソラさん___。ちゅうごくじん___か。',
    clozeTokens: ['ソラさん', null, '。', 'ちゅうごくじん', null, 'か', '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'です', 'ですか', 'ですね', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'دو جای خالی داری — اولی تأیید (ですね)، دومی پرسش (です).',
    },
    feedback: {
      f1Fa: 'خالی اول تأیید است: ですね؛ خالی دوم گزارهٔ پرسش: です.',
      f2HintFa: 'خط ۵ هر دو را یکجا دارد — به آن نگاه کن.',
      f3ExplainFa: 'ソラさんですね (تأیید) + ちゅうごくじんですか (پرسش).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g2-rule',
  },
  {
    id: 'ex-fm01-g2-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-desu-qa',
    lineRef: L(7),
    difficulty: 2,
    promptFa: 'بساز: «[او] استاد است؟» — پرسش مؤدبانه',
    chips: [
      { id: 'q1', ja: 'せんせい' },
      { id: 'q2', ja: 'です' },
      { id: 'q3', ja: 'か' },
    ],
    acceptedChipOrder: ['q1', 'q2', 'q3'],
    feedback: {
      f1Fa: 'پرسش با か است، نه ね.',
      f2HintFa: 'هویت + です + か.',
      f3ExplainFa: 'せんせいですか = استاد است؟ (آهنگ پایانی بالا).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g2-rule',
  },
  {
    id: 'ex-fm01-g2-prod-2',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-desu-qa',
    lineRef: L(5),
    difficulty: 2,
    promptFa: 'بساز: «خانم کیم هم چینی است؟» (پرسش دربارهٔ کیم — با も)',
    chips: [
      { id: 'm1', ja: 'キムさんも' },
      { id: 'm2', ja: 'ちゅうごくじん' },
      { id: 'm3', ja: 'です' },
      { id: 'm4', ja: 'か' },
    ],
    acceptedChipOrder: ['m1', 'm2', 'm3', 'm4'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ترتیب: موضوع+も → هویت → です → か.',
      f2HintFa: 'همان پرسش خط ۵، فقط は به も تبدیل شده.',
      f3ExplainFa: 'キムさんも ちゅうごくじんですか — پرسشِ خط ۱۰!',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g2-rule',
  },
  {
    id: 'ex-fm01-g2-aud-1',
    type: 'audio-meaning',
    targetSkill: 'listening',
    targetConcept: 'gr-desu-qa',
    assessesConcepts: ['gr-desu-qa', 'listen-final-intonation'],
    audioLineRef: L(7),
    lineRef: L(7),
    difficulty: 2,
    promptFa: 'گوش بده: این جمله پرسش است یا تأیید؟ (خط ۷)',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'پرسش (ですか)', 'تأیید (ですね)', 'خبر (です)', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'آهنگ پایانی بالا بود → پرسش با か.',
      f2HintFa: 'به آخر جمله گوش کن: بالا = پرسش، پایین = خبر/تأیید.',
      f3ExplainFa: 'あのかたは どなたですか — با か و آهنگ بالاتمام می‌شود.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g2-rule',
  },

  /* ════════════════════════ EXPRESSION-1 (stn-fm01-06-expression) ════════════════════════ */
  {
    id: 'ex-fm01-e1-resp-1',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-hajimemashite',
    lineRef: L(3),
    difficulty: 1,
    promptFa: 'اولین بار کسی را می‌بینی و معرفی می‌شوید — با چه چیزی شروع می‌کنی؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'はじめまして', 'こんにちは', 'よろしく おねがいします', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'こんにちは سلامِ روزانه است — برای هر ساعتی، نه مخصوص اولین دیدار.',
      c: 'よろしく おねがいします پایان آیین آشنایی است، نه آغاز آن.',
    },
    feedback: {
      f1Fa: 'آغاز آیین آشنایی با はじめまして است.',
      f2HintFa: 'ترتیب خط ۳ را یادت هست: اول «از آشنایی خوشبختم»، بعد معرفی، بعد یوروشیکو.',
      f3ExplainFa: 'はじめまして = از آشنایی‌تان خوشبختم — فقط اولین ملاقات.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e1-card-hajimemashite',
  },
  {
    id: 'ex-fm01-e1-resp-2',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-yoroshiku',
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'معرفی‌ات تمام شد — با چه عبارتی می‌بندی؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'よろしく おねがいします', 'はじめまして', 'そうですか', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'はじめまして آغاز است، نه پایان.',
      c: 'そうですか واکنش به اطلاعات تازه است — جای آیین معرفی نیست.',
    },
    feedback: {
      f1Fa: 'پایان آیین آشنایی با よろしく おねがいします.',
      f2HintFa: 'هر دو طرف در پایان با هم می‌گویندش (خط ۱۳).',
      f3ExplainFa: 'よろしく おねがいします = از رابطه‌مان خوشحالم / بردم را بدار.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e1-card-yoroshiku',
  },
  {
    id: 'ex-fm01-e1-order-1',
    type: 'dialogue-order',
    targetSkill: 'expression',
    targetConcept: 'chrk-hajimemashite',
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'سه گام آیین معرفی را به ترتیب بچین',
    chunks: [
      { id: 'd1', ja: 'はじめまして' },
      { id: 'd2', ja: '[نام]です' },
      { id: 'd3', ja: 'よろしく おねがいします' },
    ],
    correctOrder: ['d1', 'd2', 'd3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ترتیب آیین: خوشبختم → معرفی → یوروشیکو.',
      f2HintFa: 'خط ۳ یامادا دقیقاً همین ترتیب را نشان می‌دهد.',
      f3ExplainFa: 'はじめまして、やまだです。よろしく おねがいします。',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e1-card-hajimemashite',
  },

  /* ════════════════════════ LISTEN-1 (stn-fm01-07-listen) ════════════════════════ */
  {
    id: 'ex-fm01-l1-gist-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['gr-desu-identity', 'voc-nihonjin', 'voc-chuugokujin'],
    audioLineRef: L(3),
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۳): یامادا چه می‌کند؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'خودش را معرفی می‌کند',
        'سفارش قهوه می‌دهد',
        'از میکی دربارهٔ علی می‌پرسد',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'کل خط ۳ یک معرفی کامل است: نام + ملیت + یوروشیکو.',
      f2HintFa: 'کلمهٔ はじめまて را که شنیدی، یعنی آغاز آشنایی.',
      f3ExplainFa: 'خط ۳ = معرفی کامل یامادا (はじめまして、やまだです…).',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l1-who-1',
    type: 'speaker-identify',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['voc-chuugokujin'],
    audioLineRef: L(6),
    lineRef: L(6),
    difficulty: 1,
    promptFa: 'این جمله («بله، من چینی‌ام») را چه کسی می‌گوید؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'سورا', 'یامادا', 'میکی', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'جمله دربارهٔ خودِ گوینده است — کسی که چینی است.',
      f2HintFa: 'یامادا ژاپنی است؛ پس «من چینی‌ام» از او نیست.',
      f3ExplainFa: 'سورا (خط ۶): はい、わたしは ちゅうごくじんです.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l1-mp-1',
    type: 'listen-minimal-pair',
    targetSkill: 'listening',
    targetConcept: 'voc-sensee',
    assessesConcepts: ['listen-vowel-length'],
    audioLineRef: L(8),
    lineRef: L(8),
    difficulty: 3,
    promptFa: 'گوش بده: کدام را شنیدی؟ (تفاوت طول واکه)',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'せんせい (استاد)', 'せんせ (؟)', 'せんせえ (؟)', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'واکهٔ پایانی در ژاپنی کشیده است: sen-see.',
      f2HintFa: 'دو مورا: せ+んせ+い — آخرین واکه کامل شنیده می‌شود.',
      f3ExplainFa: 'せんせい = sensee — کوتاه‌کردن واکه یعنی واژهٔ دیگری/بی‌معنا.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l1-mp-2',
    type: 'listen-minimal-pair',
    targetSkill: 'listening',
    targetConcept: 'voc-chuugokujin',
    assessesConcepts: ['listen-vowel-length'],
    audioLineRef: L(5),
    lineRef: L(5),
    difficulty: 3,
    promptFa: 'گوش بده: کدام ملیت؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'ちゅうごく (چین)', 'ちゅごく (؟)', 'ちゅうご (؟)', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'uu کشیده است: chuu-goku.',
      f2HintFa: 'دو مورا در میانه: ちゅ+う — «اوی» بلند.',
      f3ExplainFa: 'ちゅうごく = chuugoku — طول واکه معنا را عوض می‌کند.',
    },
    assessmentRole: 'practice',
  },

  /* ════════════════════════ PRACTICE-1 (stn-fm01-08-practice) ════════════════════════ */
  // C1 — warm-up recycling (2)
  {
    id: 'ex-fm01-p1-c1-aud-1',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-watashi',
    audioLineRef: L(6),
    difficulty: 1,
    promptFa: 'گرم‌کردن: این واژه چه بود؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'من', 'شما / تو', 'دوست', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'この واژه یعنی «من».',
      f2HintFa: 'خط ۶: わたしは ちゅうごくじんです.',
      f3ExplainFa: 'わたし یعنی «من» — خط ۶: わたしは ちゅうごくじんです.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c1-aud-2',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-iranjin',
    audioLineRef: L(8),
    difficulty: 1,
    promptFa: 'گرم‌کردن: این ملیت چه بود؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'ایرانی', 'چینی', 'ژاپنی', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'イランじん = ایرانی.',
      f2HintFa: 'خط ۸ — دربارهٔ علی.',
      f3ExplainFa: 'イランじん = ایرانی (الگوی 〜じん).',
    },
    assessmentRole: 'practice',
  },
  // C2 — mixed consolidation (5)
  {
    id: 'ex-fm01-p1-c2-order-1',
    type: 'word-order',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-identity',
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'بچین: «یامادا ژاپنی است»',
    chunks: [
      { id: 'w1', ja: 'やまだは' },
      { id: 'w2', ja: 'にほんじん' },
      { id: 'w3', ja: 'です' },
    ],
    correctOrder: ['w1', 'w2', 'w3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'موضوع → هویت → です.',
      f2HintFa: 'خط ۳ را به یاد بیاور.',
      f3ExplainFa: 'やまだは にほんじんです.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c2-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-qa',
    lineRef: L(7),
    difficulty: 2,
    promptFa: 'پرسش مؤدبانه بساز: «آن شخص کیست؟»',
    promptJa: 'あのかたは どなた___。',
    clozeTokens: ['あのかたは', 'どなた', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'ですか', 'です', 'ですね', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'با です خبری می‌شود نه پرسش.',
      c: 'ですね تأکید/تأیید است.',
    },
    feedback: {
      f1Fa: 'پرسش با ですか ساخته می‌شود.',
      f2HintFa: 'آهنگ پایانی بالا — か.',
      f3ExplainFa: 'あのかたは どなたですか (خط ۷).',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c2-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-desu-identity',
    lineRef: L(6),
    difficulty: 2,
    promptFa: 'بساز: «من چینی‌ام»',
    chips: [
      { id: 'r1', ja: 'わたしは' },
      { id: 'r2', ja: 'ちゅうごくじん' },
      { id: 'r3', ja: 'です' },
    ],
    acceptedChipOrder: ['r1', 'r2', 'r3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'سه تکه: موضوع + هویت + です.',
      f2HintFa: 'خط ۶ سورا همین را می‌گوید.',
      f3ExplainFa: 'わたしは ちゅうごくじんです.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c2-gist-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['gr-desu-identity', 'voc-daigaku', 'voc-sensee'],
    audioLineRef: L(8),
    lineRef: L(8),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۸): یامادا چه چیزهایی دربارهٔ علی می‌گوید؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'نام + ملیت + شغل', 'فقط نام', 'نام + سن', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'سه جملهٔ پشت‌سرهم: نام، ملیت، شغل.',
      f2HintFa: 'アリさん です。イランじん です。だいがくの せんせい です。',
      f3ExplainFa: 'خط ۸ = معرفی سه‌بخشی علی.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c2-mp-1',
    type: 'listen-minimal-pair',
    targetSkill: 'listening',
    targetConcept: 'voc-sensee',
    assessesConcepts: ['listen-vowel-length'],
    audioLineRef: L(8),
    lineRef: L(8),
    difficulty: 3,
    promptFa: 'کدام را شنیدی؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'せんせい', 'せんせ', 'せいせん', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'sensee — واکهٔ آخر کشیده.',
      f2HintFa: 'せ+ん+せ+い: چهار مورا.',
      f3ExplainFa: 'せんせい (sensee) = استاد.',
    },
    assessmentRole: 'practice',
  },
  // C3 — kana × chapter-word mix (2) — the Ch01 bridge (05B PRACTICE-1 C3)
  {
    id: 'ex-fm01-p1-c3-decode-1',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-sensee',
    assessesConcepts: ['voc-sensee'],
    difficulty: 2,
    promptFa: 'با کاناهایی که در فصل ۰۱ آموختی بخوان: این واژهٔ همین فصل چیست؟',
    promptJa: 'せんせい',
    promptJaReading: 'sensee',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'sensee', 'sensei', 'sensen', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'i کوتاه — استاندارد HANASO دوبل‌واکه است.', c: 'آخرین واکه n نیست.' },
    feedback: {
      f1Fa: 'واکهٔ پایانی بلند است — دوبل بنویس.',
      f2HintFa: 'せ+ん+せ+い.',
      f3ExplainFa: 'せんせい = sensee = استاد.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p1-c3-decode-2',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-chuugokujin',
    assessesConcepts: ['voc-chuugokujin'],
    difficulty: 2,
    promptFa: 'این واژه را کانا‌به‌کانا بخوان:',
    promptJa: 'ちゅうごくじん',
    promptJaReading: 'chuugokujin',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'chuugokujin', 'chugokujin', 'chuugokujin؟', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'uu را نیفکن — دو موراست.', c: 'پرسشی نیست!' },
    feedback: {
      f1Fa: 'uu و oo کشیده‌اند.',
      f2HintFa: 'ちょ+う+ご+く+じ+ん.',
      f3ExplainFa: 'ちゅうごくじん = chuugokujin = چینی.',
    },
    assessmentRole: 'practice',
  },

  /* ════════════════════════ UNIT 02-2 · VOCAB-2 (stn-fm01-11-vocab2) ════════════════════════ */
  // recycling via READING (the Ch01 bridge — 05B C1 spirit; FSRS queue = not integrated)
  {
    id: 'ex-fm01-v2-dec-1',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-chuugokujin',
    assessesConcepts: ['voc-chuugokujin'],
    difficulty: 1,
    promptFa: 'بازیافت با خواندن: این واژهٔ واحد قبل؟',
    promptJa: 'ちゅうごくじん',
    promptJaReading: 'chuugokujin',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'chuugokujin', 'chugokujin', 'chuugokujin؟', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'uu را نیفکن — دو موراست.', c: 'پرسشی نیست!' },
    feedback: {
      f1Fa: 'uu و oo کشیده‌اند.',
      f2HintFa: 'ちょ+う+ご+く+じ+ん.',
      f3ExplainFa: 'ちゅうごくじん = chuugokujin = چینی.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-v2-dec-2',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-nihonjin',
    assessesConcepts: ['voc-nihonjin'],
    difficulty: 1,
    promptFa: 'بازیافت با خواندن:',
    promptJa: 'にほんじん',
    promptJaReading: 'nihonjin',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'nihonjin', 'nihonjen', 'ninhonjin', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'واکهٔ آخر e نیست.', c: 'ん این‌جا خیشومیِ سبک است — nihon.' },
    feedback: {
      f1Fa: 'ni-ho-n-ji-n.',
      f2HintFa: 'に+ほ+ん+じ+ん.',
      f3ExplainFa: 'にほんじん = nihonjin = ژاپنی.',
    },
    assessmentRole: 'practice',
  },
  // new words (3)
  {
    id: 'ex-fm01-v2-aud-1',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-kankokujin',
    audioLineRef: L(10),
    difficulty: 2,
    promptFa: 'به صدا گوش بده — کدام ملیت؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'کره‌ای', 'چینی', 'ژاپنی', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'かんこくじん = کره‌ای — ん خیشومی را کامل بگو.',
      f2HintFa: 'ka-n-ko-ku-ji-n.',
      f3ExplainFa: 'かんこくじん = کره‌ای (اهل کره).',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v2-card-kankokujin',
  },
  {
    id: 'ex-fm01-v2-aud-2',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-kara',
    audioLineRef: L(12),
    difficulty: 1,
    promptFa: 'به صدا گوش بده — から چه کار می‌کند؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', '«از» — نشانهٔ خاستگاه', '«به» — جهت', '«در» — مکان', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'から = از (خاستگاه).',
      f2HintFa: 'かんこくから = از کره.',
      f3ExplainFa: '〜から きました = از … آمدم.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v2-card-kara',
  },
  {
    id: 'ex-fm01-v2-txt-1',
    type: 'meaning-select',
    targetSkill: 'vocab',
    targetConcept: 'voc-kimashita',
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'きました یعنی چه؟',
    promptJa: 'きました',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'آمد (گذشتهٔ مؤدبانه)', 'می‌آید (اکنون)', 'خواهد آمد', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'حال استعلایی است — شکل きます؛ این گذشته است.',
      c: 'آینده در این سطح نیست.',
    },
    feedback: {
      f1Fa: 'きました = آمد (مؤدبانه، گذشته).',
      f2HintFa: 'خط ۱۳: کیم می‌گوید از کره …',
      f3ExplainFa: 'かんこくから きました = از کره آمدم.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-v2-card-kimashita',
  },

  /* ════════════════════════ GRAMMAR-3 も (stn-fm01-12-grammar-mo) ════════════════════════ */
  {
    id: 'ex-fm01-g3-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-mo',
    lineRef: L(9),
    difficulty: 2,
    promptFa: 'جای خالی: «کیم هم چینی است؟»',
    promptJa: 'キムさん___ ちゅうごくじんですか。',
    clozeTokens: ['キムさん', null, 'ちゅうごくじんですか', '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'も', 'は', 'か', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'は = «دربارهٔ» — معنی «هم» نمی‌دهد.',
      c: 'か فقط پایان پرسش است؛ این‌جا داخل جمله است.',
    },
    feedback: {
      f1Fa: '«هم» با も است.',
      f2HintFa: 'یامادا فکر می‌کند کیم مثل سورا چینی است.',
      f3ExplainFa: 'キムさんも ちゅうごくじんですか = کیم هم چینی است؟',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g3-rule',
  },
  {
    id: 'ex-fm01-g3-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-mo',
    lineRef: L(9),
    difficulty: 2,
    promptFa: 'بساز: «من هم دانشجوام» (がくせい = دانشجو)',
    chips: [
      { id: 'g1', ja: 'わたしも' },
      { id: 'g2', ja: 'がくせい' },
      { id: 'g3', ja: 'です' },
    ],
    acceptedChipOrder: ['g1', 'g2', 'g3'],
    feedback: {
      f1Fa: 'も جای は را می‌گیرد — با هم نمی‌آیند.',
      f2HintFa: 'موضوع+も → هویت → です.',
      f3ExplainFa: 'わたしも がくせいです = من هم دانشجوام.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g3-rule',
  },

  /* ════════════════════════ GRAMMAR-4 ではありません (stn-fm01-13-grammar-dewa) ════════════════════════ */
  {
    id: 'ex-fm01-g4-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-dewa-arimasen',
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'جای خالی: «کیم چینی نیست. کره‌ای است.»',
    promptJa: 'キムさんは ちゅうごくじん___。かんこくじんです。',
    clozeTokens: ['キムさんは', 'ちゅうごくじん', null, '。', 'かんこくじんです', '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'では ありません', 'です', 'でした', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'です یعنی «است» — این‌جا نفی لازم است.',
      c: 'でした گذشته است — در این مکالمه نیست.',
    },
    feedback: {
      f1Fa: 'نفی مؤدبانه: では ありません.',
      f2HintFa: 'سورا فرض یامادا را رد می‌کند — نه + درست.',
      f3ExplainFa: 'ちゅうごくじんでは ありません = چینی نیست.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g4-rule',
  },
  {
    id: 'ex-fm01-g4-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-dewa-arimasen',
    lineRef: L(10),
    difficulty: 3,
    promptFa: 'بساز: «او معلم نیست. دانشجو است.»',
    chips: [
      { id: 'n1', ja: 'せんせい' },
      { id: 'n2', ja: 'では' },
      { id: 'n3', ja: 'ありません' },
      { id: 'n4', ja: 'がくせいです' },
    ],
    acceptedChipOrder: ['n1', 'n2', 'n3', 'n4'],
    feedback: {
      f1Fa: 'دو جمله داری: نفی + درست — هرکدام یک پایان‌بندی.',
      f2HintFa: '…では ありません。…です。',
      f3ExplainFa: 'せんせいでは ありません。がくせいです.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g4-rule',
  },

  /* ════════════════════════ EXPRESSION-2 (stn-fm01-14-expression) ════════════════════════ */
  {
    id: 'ex-fm01-e2-resp-1',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-iie',
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'کسی ملیتت را اشتباه حدس زد — با چه شروع می‌کنی؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'いいえ', 'はい', 'そうですか', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'はی یعنی تأیید حدسِ غلط!',
      c: 'そうですか برای اطلاعات تازه است — این‌جا باید اصلاح کنی.',
    },
    feedback: {
      f1Fa: 'اول いいえ، بعد جملهٔ درست.',
      f2HintFa: 'خط ۱۱ سورا: いいえ、キムさんは…',
      f3ExplainFa: 'いいえ + نفی + هویتِ درست = ردّ مؤدبانهٔ کامل.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e2-card-iie',
  },
  {
    id: 'ex-fm01-e2-resp-2',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-soodesuka',
    lineRef: L(11),
    difficulty: 2,
    promptFa: 'دوستت خبر تازه‌ای گفت («او کره‌ای است») — واکنش مناسب؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'そうですか', 'はじめまして', 'よろしく おねがいします', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'اولین دیدار نیست.',
      c: 'پایان آیین معرفی است، نه واکنش به خبر.',
    },
    feedback: {
      f1Fa: 'そうですか = آه، می‌فهمم — واکنش به اطلاعات نو.',
      f2HintFa: 'با آهنگ نزولی.',
      f3ExplainFa: 'そうですか (نزولی) = جالب بود/می‌فهمم.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e2-card-soodesuka',
  },
  {
    id: 'ex-fm01-e2-order-1',
    type: 'dialogue-order',
    targetSkill: 'expression',
    targetConcept: 'chrk-wakarimashita',
    lineRef: L(11),
    difficulty: 2,
    promptFa: 'واکنش یامادا به اصلاح سورا را کامل بچین (خط ۱۲)',
    chunks: [
      { id: 'z1', ja: 'そうですか。' },
      { id: 'z2', ja: 'わかりました。' },
    ],
    correctOrder: ['z1', 'z2'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'اول واکنش به خبر (そうですか)، بعد دریافت (わかりました).',
      f2HintFa: 'دو جملهٔ پشت‌سرهم در خط ۱۲.',
      f3ExplainFa: 'そうですか。わかりました。',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e2-card-soodesuka',
  },

  {
    id: 'ex-fm01-e2-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'chrk-iie',
    lineRef: L(10),
    difficulty: 3,
    promptFa: 'بساز: ردّ کاملِ فرضِ غلط — «نه، [او] چینی نیست. کره‌ای است.»',
    chips: [
      { id: 'ii1', ja: 'いいえ、' },
      { id: 'ii2', ja: 'キムさんは' },
      { id: 'ii3', ja: 'ちゅうごくじんでは' },
      { id: 'ii4', ja: 'ありません。' },
      { id: 'ii5', ja: 'かんこくじんです。' },
    ],
    acceptedChipOrder: ['ii1', 'ii2', 'ii3', 'ii4', 'ii5'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'رد مؤدب = نه + نفی + هویت درست.',
      f2HintFa: 'خط ۱۱ را مرحله‌به‌مرحله بساز.',
      f3ExplainFa: 'いいえ、キムさんは ちゅうごくじんでは ありません。かんこくじんです。',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-e2-card-iie',
  },

  /* ════════════════════════ LISTEN-2 (stn-fm01-15-listen) ════════════════════════ */
  {
    id: 'ex-fm01-l2-gist-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['gr-kara-kimashita', 'chrk-hajimemashite'],
    audioLineRef: L(12),
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۱۳): کیم چه کرد؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'خودش را کامل معرفی کرد و گفت از کره آمده',
        'سفارش نوشیدنی داد',
        'از یامادا دربارهٔ علی پرسید',
        1,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'خط ۱۳ معرفی کامل است: نام + خاستگاه + یوروشیکو.',
      f2HintFa: 'はじめまて را که شنیدی، معرفی است.',
      f3ExplainFa: 'はじめまして、キムです。かんこくから きました。',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l2-mp-1',
    type: 'listen-minimal-pair',
    targetSkill: 'listening',
    targetConcept: 'voc-kankokujin',
    assessesConcepts: ['listen-nasal-mora'],
    audioLineRef: L(10),
    lineRef: L(10),
    difficulty: 3,
    promptFa: 'گوش بده: کدام را شنیدی؟ (تفاوت ん خیشومی)',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'かんこく (کره)', 'かこく (؟)', 'かここ (؟)', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ん کامل ادا می‌شود: ka-n-ko-ku.',
      f2HintFa: 'یک مورای خیشومی در میانه هست.',
      f3ExplainFa: 'かんこく = kankoku — بدون ん واژهٔ دیگری می‌شود.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l2-who-1',
    type: 'speaker-identify',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['voc-kankokujin', 'gr-dewa-arimasen'],
    audioLineRef: L(10),
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'این جمله («نه، کیم چینی نیست. کره‌ای است») را چه کسی می‌گوید؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'سورا', 'یامادا', 'کیم', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'کسی که همکلاسی‌اش را معرفی می‌کند.',
      f2HintFa: 'کیم خودش این‌جا تازه رسیده و در خط ۱۳ حرف می‌زند.',
      f3ExplainFa: 'سورا (خط ۱۱) فرض یامادا را اصلاح می‌کند.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-l2-aud-1',
    type: 'audio-meaning',
    targetSkill: 'listening',
    targetConcept: 'gr-dewa-arimasen',
    assessesConcepts: ['gr-dewa-arimasen', 'listen-final-intonation'],
    audioLineRef: L(9),
    lineRef: L(9),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۱۰): یامادا چه نوع جمله‌ای گفت؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'پرسش با も', 'خبر ساده', 'نفی', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'آهنگ پایانی بالا + ですか = پرسش.',
      f2HintFa: 'دربارهٔ کیم و شبیه‌بودن به سورا.',
      f3ExplainFa: 'キムさんも ちゅうごくじんですか = پرسش با も.',
    },
    assessmentRole: 'practice',
  },

  /* ════════════════════════ GRAMMAR-5 〜から きました (stn-fm01-16-grammar-kara) ════════════════════════ */
  {
    id: 'ex-fm01-g5-order-1',
    type: 'word-order',
    targetSkill: 'grammar',
    targetConcept: 'gr-kara-kimashita',
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'بچین: «از کره آمدم»',
    chunks: [
      { id: 'k1', ja: 'かんこくから' },
      { id: 'k2', ja: 'きました' },
    ],
    correctOrder: ['k1', 'k2'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'مکان + から، بعد فعل.',
      f2HintFa: 'برعکس فارسی: «از کره» اولِ ژاپنی می‌آید… یعنی かんこくから اول است و فعل آخر.',
      f3ExplainFa: 'かんこくから きました = از کره آمدم.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g5-rule',
  },
  {
    id: 'ex-fm01-g5-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-kara-kimashita',
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'بساز: «از ایران آمده‌ام»',
    chips: [
      { id: 'i1', ja: 'イランから' },
      { id: 'i2', ja: 'きました' },
    ],
    acceptedChipOrder: ['i1', 'i2'],
    feedback: {
      f1Fa: 'دو تکه کافی است.',
      f2HintFa: 'مکان+から → きました.',
      f3ExplainFa: 'イランから きました = از ایران آمدم — جملهٔ خودت!',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'blk-g5-rule',
  },

  /* ════════════════════════ PRACTICE-2 (stn-fm01-17-practice) ════════════════════════ */
  // C2 mixed (3)
  {
    id: 'ex-fm01-p2-c2-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-mo',
    lineRef: L(9),
    difficulty: 2,
    promptFa: '«من هم ایرانی‌ام» — جای خالی؟',
    promptJa: 'わたし___ イランじんです。',
    clozeTokens: ['わたし', null, 'イランじんです', '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'も', 'は', 'ね', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'は معنی «هم» ندارد.', c: 'ね تأکید است، جای موضوع نیست.' },
    feedback: {
      f1Fa: 'معنی «هم» با も ساخته می‌شود.',
      f2HintFa: 'مثل کیم/سورا — به همان گروه اضافه شدن.',
      f3ExplainFa: 'わたしも イランじんです = من هم ایرانی‌ام.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p2-c2-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'gr-dewa-arimasen',
    lineRef: L(10),
    difficulty: 3,
    promptFa:
      'بساز: «[من] دانشجو نیستم. دانش‌آموز هستم.» (がくせい=دانشجو · がくせい‌های مدرسه را با خودت عوض نکن — همین الگو را بساز)',
    chips: [
      { id: 'x1', ja: 'がくせいでは' },
      { id: 'x2', ja: 'ありません' },
      { id: 'x3', ja: 'がくせいです' },
    ],
    acceptedChipOrder: ['x1', 'x2', 'x3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'نفی کامل + خبر درست.',
      f2HintFa: '…では ありません。…です。',
      f3ExplainFa: 'الگوی نفی: AはBでは ありません.',
    },
    assessmentRole: 'practice',
  },
  // C2 mixed (4)
  {
    id: 'ex-fm01-p2-c2-prod-2',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'self-intro-production',
    assessesConcepts: ['gr-desu-identity', 'gr-kara-kimashita'],
    lineRef: L(12),
    difficulty: 3,
    promptFa: 'معرفی کامل خودت را بساز: «[من] ایرانی‌ام. از ایران آمده‌ام.»',
    chips: [
      { id: 'si1', ja: 'わたしは' },
      { id: 'si2', ja: 'イランじんです。' },
      { id: 'si3', ja: 'イランから' },
      { id: 'si4', ja: 'きました。' },
    ],
    acceptedChipOrder: ['si1', 'si2', 'si3', 'si4'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'دو جمله: هویت + خاستگاه.',
      f2HintFa: 'اول です، بعد きました.',
      f3ExplainFa: 'わたしは イランじんです。イランから きました。',
    },
    assessmentRole: 'practice',
  },
  // C1 — warm-up recycling via reading (2)
  {
    id: 'ex-fm01-p2-c1-decode-1',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-daigaku',
    assessesConcepts: ['voc-daigaku'],
    difficulty: 1,
    promptFa: 'گرم‌کردن — بخوان:',
    promptJa: 'だいがく',
    promptJaReading: 'daigaku',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'daigaku', 'daigaki', 'digaku', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'ک پایانی k نیست — く.', c: 'موراها را کامل بگو: da-i-ga-ku.' },
    feedback: {
      f1Fa: 'da-i-ga-ku.',
      f2HintFa: 'だ+い+が+く.',
      f3ExplainFa: 'だいがく = daigaku = دانشگاه.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p2-c1-decode-2',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'voc-kankokujin',
    assessesConcepts: ['voc-kankokujin'],
    difficulty: 2,
    promptFa: 'گرم‌کردن — بخوان:',
    promptJa: 'かんこくじん',
    promptJaReading: 'kankokujin',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'kankokujin', 'kakokujin', 'kankojin', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'ん را نیفکن!', c: 'く را رها نکن.' },
    feedback: {
      f1Fa: 'ka-n-ko-ku-ji-n.',
      f2HintFa: 'か+ん+こ+く+じ+ん.',
      f3ExplainFa: 'かんこくじん = kankokujin = کره‌ای.',
    },
    assessmentRole: 'practice',
  },
  // C3 — real interleaving of both units (3)
  {
    id: 'ex-fm01-p2-c3-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-qa',
    assessesConcepts: ['gr-desu-qa', 'gr-mo'],
    lineRef: L(9),
    difficulty: 3,
    promptFa: 'میان は と も و پرسش: «آیا یامادا هم استاد است؟»',
    promptJa: 'やまださん___ だいがくの せんせい___。',
    clozeTokens: ['やまださん', null, 'だいがくの', 'せんせい', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'も + ですか', 'は + です', 'も + ですね', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: '«هم» لازم است + پرسش لازم است.', c: 'ね تأیید است.' },
    feedback: {
      f1Fa: 'دو تصمیم: افزوده (も) + نوع جمله (پرسش).',
      f2HintFa: '«هم» + آهنگ بالا.',
      f3ExplainFa: 'やまださんも だいがくの せんせいですか.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p2-c3-cloze-2',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-dewa-arimasen',
    assessesConcepts: ['gr-desu-identity', 'gr-dewa-arimasen'],
    lineRef: L(10),
    difficulty: 3,
    promptFa: 'تأیید یا نفی؟ «علی ایرانی است» / «علی ژاپنی نیست»',
    promptJa: 'アリさんは イランじん___。にほんじん___。',
    clozeTokens: ['アリさんは', 'イランじん', null, '。', 'にほんじん', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'です + では ありません',
        'では ありません + です',
        'です + です',
        2,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'برعکس شد!', c: 'جملهٔ دوم نفی لازم دارد.' },
    feedback: {
      f1Fa: 'اولی خبر مثبت، دومی نفی.',
      f2HintFa: 'ایرانی است / ژاپنی نیست.',
      f3ExplainFa: 'イランじんです。にほんじんでは ありません。',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-p2-c3-order-1',
    type: 'dialogue-order',
    targetSkill: 'expression',
    targetConcept: 'gr-kara-kimashita',
    assessesConcepts: ['gr-kara-kimashita', 'chrk-hajimemashite'],
    lineRef: L(12),
    difficulty: 3,
    promptFa: 'معرفی کامل کیم را بچین (خط ۱۳)',
    chunks: [
      { id: 'y1', ja: 'はじめまして、キムです。' },
      { id: 'y2', ja: 'かんこくから きました。' },
      { id: 'y3', ja: 'よろしく おねがいします。' },
    ],
    correctOrder: ['y1', 'y2', 'y3'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'آیین معرفی: خوشبختم → خاستگاه → یوروشیکو.',
      f2HintFa: 'خط ۱۳ را بازپخش کن.',
      f3ExplainFa: 'はじめまして、キムです。かんこくから きました。よろしく おねがいします。',
    },
    assessmentRole: 'practice',
  },

  /* ════════════════════════ OPTIONAL BRANCHES ════════════════════════ */
  // OPT-DEEPDIVE-1 «کشورها و زبان‌ها» — recognition layer (no cards — DD-093)
  {
    id: 'ex-fm01-od1-resp-1',
    type: 'response-select',
    targetSkill: 'vocab',
    targetConcept: 'country-pattern',
    lineRef: L(10),
    difficulty: 1,
    promptFa: 'با الگوی 〜じん، «آمریکایی» چطور می‌شود؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'アメリカじん', 'アメリカご', 'アメリカさん', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: '〜ご = زبان (آمریکایی انگلیسی!) — پیش‌نمایش بعدی.',
      c: 'さん برای اسامی اشخاص است.',
    },
    feedback: {
      f1Fa: 'الگو: نام کشور + じん.',
      f2HintFa: 'にほん + じん = にほんじん — همان الگو.',
      f3ExplainFa: 'アメリカじん = آمریکایی.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-od1-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'country-pattern',
    lineRef: L(8),
    difficulty: 2,
    promptFa: 'ملیت خودت را بساز: «من ایرانی‌ام»',
    chips: [
      { id: 'cp1', ja: 'わたしは' },
      { id: 'cp2', ja: 'イランじん' },
      { id: 'cp3', ja: 'です' },
    ],
    acceptedChipOrder: ['cp1', 'cp2', 'cp3'],
    feedback: {
      f1Fa: 'سه چیپ کافی است.',
      f2HintFa: 'AはBです.',
      f3ExplainFa: 'わたしは イランじんです.',
    },
    assessmentRole: 'practice',
  },
  // OPT-DEEPDIVE-2 «شغل‌ها» — supplementary words (opt-in only — DD-093)
  {
    id: 'ex-fm01-od2-resp-1',
    type: 'response-select',
    targetSkill: 'vocab',
    targetConcept: 'jobs-recognition',
    lineRef: L(8),
    difficulty: 1,
    promptFa: '「エンジニア» یعنی چه؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'مهندس', 'پزشک', 'کارمند شرکت', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'پزشک = いしゃ.', c: 'کارمند شرکت = かいしゃいん.' },
    feedback: {
      f1Fa: 'エンジニア = مهندس (واژهٔ خارجی با کاتاکانا).',
      f2HintFa: 'صدای «انجینیر» انگلیسی.',
      f3ExplainFa: 'エンジニア = مهندس.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-od2-prod-1',
    type: 'produce-template',
    targetSkill: 'production',
    targetConcept: 'jobs-recognition',
    lineRef: L(8),
    difficulty: 2,
    promptFa: 'شغل خودت را بگو: «من مهندسم»',
    chips: [
      { id: 'jb1', ja: 'わたしは' },
      { id: 'jb2', ja: 'エンジニア' },
      { id: 'jb3', ja: 'です' },
    ],
    acceptedChipOrder: ['jb1', 'jb2', 'jb3'],
    feedback: {
      f1Fa: 'الگوی گزاره: AはBです.',
      f2HintFa: 'الگوی خط ۳ و ۸.',
      f3ExplainFa: 'わたしは エンジニアです.',
    },
    assessmentRole: 'practice',
  },
  // OPT-REVIEW-2 «دریل تمایزی»
  {
    id: 'ex-fm01-or2-mp-1',
    type: 'listen-minimal-pair',
    targetSkill: 'listening',
    targetConcept: 'voc-sensee',
    assessesConcepts: ['listen-vowel-length'],
    audioLineRef: L(8),
    lineRef: L(8),
    difficulty: 3,
    promptFa: 'دریل تمایزی: کدام؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'せんせい', 'せんせ', 'せんせえ', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'مورای آخر («ای») جا افتاده — «سِنسِ» واژهٔ ژاپنی نیست.',
      c: 'کشش با «اِ» نوشته شد (せんせえ)؛ در این واژه کشش با «ی» نوشته می‌شود (え+い).',
    },
    feedback: {
      f1Fa: 'واکهٔ پایانی بلند است: sen-see.',
      f2HintFa: 'せ+ん+せ+い — چهار مورا.',
      f3ExplainFa: 'せんせい = sensee = استاد.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-or2-cloze-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-qa',
    assessesConcepts: ['gr-desu-qa', 'gr-desu-identity'],
    lineRef: L(5),
    difficulty: 2,
    promptFa: 'تمایز: تأیید (خط ۵، جملهٔ اول) با چه چیزی تمام می‌شود؟',
    promptJa: 'ソラさん___。',
    clozeTokens: ['ソラさん', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'ですね', 'ですか', 'です', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'پرسش است.', c: 'خبر ساده است — یامادا شنیده‌اش را تأیید می‌کند.' },
    feedback: {
      f1Fa: 'یامادا چیزی را که می‌داند تأیید می‌کند: ね.',
      f2HintFa: '«پس سورا هستید…»',
      f3ExplainFa: 'ソラさんですね (خط ۵).',
    },
    assessmentRole: 'practice',
  },

  /* ════════════════════════ MASTERY GATE BANK (M1..M5 — non-overlapping pool) ════════════════════════ */
  // M1 — معنای کلیدی مکالمه (30%)
  {
    id: 'ex-fm01-gate-m1-1',
    type: 'meaning-select',
    targetSkill: 'grammar',
    targetConcept: 'gr-mo',
    lineRef: L(9),
    difficulty: 2,
    promptFa: 'در نوبت ۱۰، も چه کاری می‌کند؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'کیم را به همان گروهِ سورا اضافه می‌کند',
        'پرسش را مؤدبانه می‌کند',
        'جمله را منفی می‌کند',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'آن کار か است.', c: 'آن کار ではありません است.' },
    feedback: {
      f1Fa: 'も = هم/نیز.',
      f2HintFa: '«کیم هم چینی است؟»',
      f3ExplainFa: 'キムさんも = کیم هم.',
    },
    assessmentRole: 'mastery_M1',
  },
  {
    id: 'ex-fm01-gate-m1-2',
    type: 'dialogue-order',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['chrk-hajimemashite', 'gr-desu-identity'],
    lineRef: L(3),
    difficulty: 2,
    promptFa: 'رویدادهای مکالمه را به ترتیب بچین',
    chunks: [
      { id: 'e1', ja: 'سلام و احوال‌پرسی' },
      { id: 'e2', ja: 'معرفی خود (نام و ملیت)' },
      { id: 'e3', ja: 'پرسش دربارهٔ شخص سوم' },
      { id: 'e4', ja: 'اصلاح فرض غلط دربارهٔ کیم' },
      { id: 'e5', ja: 'ورود و معرفی کیم' },
    ],
    correctOrder: ['e1', 'e2', 'e3', 'e4', 'e5'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'مسیر داستان: سلام → معرفی → پرسش → اصلاح → ورود کیم.',
      f2HintFa: 'به شمارهٔ نوبت‌ها فکر کن.',
      f3ExplainFa: 'L1-L2 → L3-L4 → L5-L8 → L9-L10 → L12.',
    },
    assessmentRole: 'mastery_M1',
  },
  {
    id: 'ex-fm01-gate-m1-3',
    type: 'meaning-select',
    targetSkill: 'grammar',
    targetConcept: 'gr-kara-kimashita',
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'چرا گفت‌وگو با تعارف دوطرفه (よろしく) تمام شد؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'آیین ژاپنی پایان آشنایی است',
        'چون معرفی ناقص ماند',
        'چون کسی عصبانی شد',
        1,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'همه کامل معرفی شدند.', c: 'هیچ تنش‌ای نیست!' },
    feedback: {
      f1Fa: 'よろしく おねがいします فرمول بستن آشنایی است.',
      f2HintFa: 'هر دو طرف با هم می‌گویند.',
      f3ExplainFa: 'پایان آیین معرفی = تعارف دوطرفه.',
    },
    assessmentRole: 'mastery_M1',
  },
  // M2 — واژگان کلیدی در جملهٔ نو (20%)
  {
    id: 'ex-fm01-gate-m2-1',
    type: 'meaning-select',
    targetSkill: 'vocab',
    targetConcept: 'voc-daigaku',
    lineRef: L(8),
    difficulty: 2,
    promptFa: 'در جملهٔ ミキさんは だいがくの せんせいです، واژهٔ だいがく یعنی چه؟',
    promptJa: 'ミキさんは だいがくの せんせいです',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'دانشگاه', 'کلاس', 'کتاب', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'کلاس = クラス.', c: 'کتاب = ほん.' },
    feedback: {
      f1Fa: 'だいがく = دانشگاه.',
      f2HintFa: 'だいがくの せんせい = استاد دانشگاه.',
      f3ExplainFa: 'だいがく = دانشگاه.',
    },
    assessmentRole: 'mastery_M2',
  },
  {
    id: 'ex-fm01-gate-m2-2',
    type: 'audio-meaning',
    targetSkill: 'vocab',
    targetConcept: 'voc-kankokujin',
    audioLineRef: L(10),
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۱۱): کیم چه ملیتی است؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'کره‌ای', 'چینی', 'ژاپنی', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'ملیتِ کیم: かんこくじんです.',
      f2HintFa: 'سورا فرض یامادا را اصلاح می‌کند.',
      f3ExplainFa: 'کیم کره‌ای است.',
    },
    assessmentRole: 'mastery_M2',
  },
  // M3 — ساختارها (20%)
  {
    id: 'ex-fm01-gate-m3-1',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-desu-qa',
    lineRef: L(5),
    difficulty: 2,
    promptFa: 'در نوبت ۵، ね چه می‌کند؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'شنیده‌شده را تأیید می‌کند', 'پرسش می‌سازد', '«هم» می‌دهد', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'آن کار か است.', c: 'آن کار も است.' },
    feedback: {
      f1Fa: 'ね = تأیید شنیده‌ها.',
      f2HintFa: '«پس سورا هستید…»',
      f3ExplainFa: 'جملهٔ تأیید: ソラさんですね = پس سورا هستید.',
    },
    assessmentRole: 'mastery_M3',
  },
  {
    id: 'ex-fm01-gate-m3-2',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-dewa-arimasen',
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'جای خالی: わたしは がくせい___。(دانشجو نیستم)',
    promptJa: 'わたしは がくせい___。',
    clozeTokens: ['わたしは', 'がくせい', null, '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'では ありません', 'です', 'ですか', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'مثبت شد!', c: 'پرسش شد!' },
    feedback: {
      f1Fa: 'نفی مؤدبانه.',
      f2HintFa: '「نیستم» — خط ۱۱.',
      f3ExplainFa: 'がくせいでは ありません = دانشجو نیستم.',
    },
    assessmentRole: 'mastery_M3',
  },
  {
    id: 'ex-fm01-gate-m3-3',
    type: 'word-order',
    targetSkill: 'structure',
    targetConcept: 'sov-bridge-persian',
    lineRef: L(12),
    difficulty: 2,
    promptFa: 'بچین: «از کره آمدم»',
    chunks: [
      { id: 'go1', ja: 'かんこくから' },
      { id: 'go2', ja: 'きました' },
    ],
    correctOrder: ['go1', 'go2'],
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'خاستگاه + から + فعل.',
      f2HintFa: 'خط ۱۳.',
      f3ExplainFa: 'かんこくから きました.',
    },
    assessmentRole: 'mastery_M3',
  },
  // M4 — شنیداری (20%)
  {
    id: 'ex-fm01-gate-m4-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['gr-desu-qa', 'voc-anokata'],
    audioLineRef: L(7),
    lineRef: L(7),
    difficulty: 2,
    promptFa: 'گوش بده (خط ۷، بدون متن): دربارهٔ چه کسی پرسید؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'شخص سومی که کنار پنجره است', 'خودِ گوینده', 'صاحب کافه', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {},
    feedback: {
      f1Fa: 'あのかた = شخص سوم.',
      f2HintFa: 'پرسش دربارهٔ حاضرِ گفت‌وگو نیست.',
      f3ExplainFa: 'دربارهٔ علی پرسید.',
    },
    assessmentRole: 'mastery_M4',
  },
  {
    id: 'ex-fm01-gate-m4-2',
    type: 'listen-who-asked',
    targetSkill: 'listening',
    targetConcept: 'listen-vowel-length',
    assessesConcepts: ['gr-mo', 'voc-kankokujin'],
    audioLineRef: L(9),
    lineRef: L(9),
    difficulty: 3,
    promptFa: 'گوش بده (خط ۱۰): چه پرسشی پرسیده شد؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'آیا کیم هم چینی است؟', 'آیا کیم معلم است؟', 'کیم از کجا آمد؟', 2);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'شغل در خط ۸ دربارهٔ علی بود.', c: 'خاستگاه در خط ۱۳ خود کیم می‌گوید.' },
    feedback: {
      f1Fa: 'پرسش دربارهٔ ملیتِ کیم با も.',
      f2HintFa: 'キムさんも…',
      f3ExplainFa: 'キムさんも ちゅうごくじんですか (خط ۱۰).',
    },
    assessmentRole: 'mastery_M4',
  },
  // M5 — گوینده و نیت (10%)
  {
    id: 'ex-fm01-gate-m5-1',
    type: 'speaker-identify',
    targetSkill: 'listening',
    targetConcept: 'identity-vocab-core',
    assessesConcepts: ['chrk-iie', 'gr-dewa-arimasen'],
    audioLineRef: L(10),
    lineRef: L(10),
    difficulty: 2,
    promptFa: 'چه کسی با いいえ شروع کرد و چرا؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'سورا — فرض غلط را مؤدبانه رد کرد',
        'یامادا — از خبر ناراحت شد',
        'کیم — خودش را معرفی کرد',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'ناراحتی در کار نیست — اصلاح اطلاعات است.', c: 'کیم در خط ۱۳ حرف می‌زند.' },
    feedback: {
      f1Fa: 'いいえ ردِّ اطلاعاتِ غلط است، نه شخص.',
      f2HintFa: 'خط ۱۱.',
      f3ExplainFa: 'سورا: いいえ、キムさんは ちゅうごくじんでは ありません。',
    },
    assessmentRole: 'mastery_M5',
  },
  {
    id: 'ex-fm01-gate-m5-2',
    type: 'response-select',
    targetSkill: 'expression',
    targetConcept: 'chrk-wakarimashita',
    lineRef: L(11),
    difficulty: 2,
    promptFa: 'یامادا اطلاعات تازه‌ای دربارهٔ کیم گرفت — واکنش او چه بود؟ (خط ۱۲)',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'そうですか。わかりました。',
        'はじめまして。キムです。',
        'わたしは にほんじんです。',
        1,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'این معرفیِ خودِ کیم است (خط ۱۳).', c: 'این معرفی یامادا در خط ۳ است.' },
    feedback: {
      f1Fa: 'واکنش = دریافت اطلاعات.',
      f2HintFa: 'دو جملهٔ پشت‌سرهم.',
      f3ExplainFa: 'そうですか。わかりました。',
    },
    assessmentRole: 'mastery_M5',
  },
  /* ════════════════════════ OPT-REVIEW-2 «دریل تمایزی» (2nd item) ════════════════════════ */
  {
    id: 'ex-fm01-or2-cloze-2',
    type: 'cloze',
    targetSkill: 'grammar',
    targetConcept: 'gr-mo',
    assessesConcepts: ['gr-mo', 'gr-desu-identity'],
    lineRef: L(9),
    difficulty: 2,
    promptFa: 'تمایز は/も: «کیم هم (مثل سورا) چینی است؟»',
    promptJa: 'キムさん___ ちゅうごくじんですか。',
    clozeTokens: ['キムさん', null, 'ちゅうごくじんですか', '。'],
    ...(() => {
      const { options, correctOptionId } = o3('x', 'も', 'は', 'ね', 1);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: { b: 'は فقط موضوع را علامت می‌زند — «هم» نمی‌دهد.', c: 'ね تأکید است.' },
    feedback: {
      f1Fa: 'معنی «هم» با も ساخته می‌شود.',
      f2HintFa: 'مثل سورا بودن → も.',
      f3ExplainFa: 'キムさんも ちゅうごくじんですか.',
    },
    assessmentRole: 'practice',
  },
  /* ════════════════════════ TASK-HANASO-21 (OBS-001) — anchor comprehension checks ════════════════════════
     No CORE station completes by viewing alone (audit P1-5, owner-decided).
     Each anchor closes with a 3-question SCENE-comprehension check — the
     questions are answerable from the viewing itself (the Persian glosses +
     the prediction reveals the learner just saw), never from language items
     that the chapter has not taught yet (EQA-1 S-1: no assessment before
     teaching — the gate stays intact, no line-level linguistic checks). */
  {
    id: 'ex-fm01-a1-gist-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'کل مکالمه را دیدی — این داستان کجا می‌گذرد؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'در یک کافه', 'در کلاس درس', 'در کتابخانه', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'کلاس درس نیست — میکی و یامادا در کافه با هم سلام و احوال‌پرسی می‌کنند.',
      c: 'کتابخانه نیست — صحنهٔ داستان کافهٔ یاماداست.',
    },
    feedback: {
      f1Fa: 'به صحنهٔ ابتدای درس برگرد: میکی وارد کافهٔ یامادا می‌شود.',
      f2HintFa: 'سلام آقای یامادا — صاحب کافه.',
      f3ExplainFa: 'صحنهٔ فصل: کافه‌ای کوچک نزدیک دانشگاه در توکیو.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-a1-gist-2',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'به پیش‌بینی وسط مکالمه برگرد — سورا اهل کجاست؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'چین', 'کره', 'ژاپن', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'کره خاستگاه کیم است، نه سورا — این دو را جا نگیر.',
      c: 'سورا ژاپنی نیست — او مهمان تازهٔ کافه است.',
    },
    feedback: {
      f1Fa: 'پاسخ پرسش ملیت را دیدی: سورا چینی است.',
      f2HintFa: 'فرمول مکالمه: نام + ملیت.',
      f3ExplainFa: 'سورا در همان ابتدا می‌گوید: «من چینی‌ام» — پیش‌بینی همین را نشان داد.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-a1-gist-3',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'در پایان این نیمهٔ مکالمه چه اتفاقی افتاد؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'مهمان تازه‌ای وارد شد و خودش را معرفی کرد',
        'کافه تعطیل شد و همه رفتند',
        'یامادا از میکی معذرت‌خواهی کرد',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'تعطیلی در کار نیست — مکالمه با ورود کیم گرم‌تر می‌شود.',
      c: 'معذرت‌خواهی نمی‌بینی — یک آشنایی تازه شروع می‌شود.',
    },
    feedback: {
      f1Fa: 'یک صدای تازه در پایان بود.',
      f2HintFa: 'آداب آشنایی — مثل شروع مکالمه.',
      f3ExplainFa: 'کیم وارد کافه شد و خودش را معرفی کرد — نیمهٔ دوم فصل دربارهٔ اوست.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-a2-gist-1',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'به پیش‌بینی همین درس برگرد — کیم اهل کجاست؟',
    ...(() => {
      const { options, correctOptionId } = o3('x', 'کره', 'چین', 'ژاپن', 0);
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'چین خاستگاه سوراست — یامادا دقیقاً همین را اشتباه گرفت.',
      c: 'کیم ژاپنی نیست — او هم مثل سورا مهمان تازه است.',
    },
    feedback: {
      f1Fa: 'پیش‌بینی همین را نشان داد.',
      f2HintFa: 'کشوری غیر از چین — کشوری که یامادا گمانش را نکرد.',
      f3ExplainFa: 'کیم می‌گوید: «از کره آمده‌ام» — ردّ مؤدبانهٔ فرض یامادا.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-a2-gist-2',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'یامادا در این نیمه ابتدا چه گمانی دربارهٔ کیم داشت؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'اینکه او هم مثل سورا چینی است',
        'اینکه او کره‌ای است',
        'اینکه او ژاپنی است',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'گمان اولیه همین بود که غلط از آب درآمد — پاسخ درست گمانِ غلطِ یاماداست.',
      c: 'یامادا کیم را ژاپنی نمی‌پندارد — او کیم را به سورا شبیه می‌داند.',
    },
    feedback: {
      f1Fa: 'ترجمهٔ فارسی جملهٔ یامادا را دوباره بخوان: «خانم کیم هم چینی است؟»',
      f2HintFa: 'واژهٔ «هم» — شبیه دانستن به سورا.',
      f3ExplainFa: 'یامادا با «هم» گمان کرد کیم هم چینی است — و سورا اصلاحش کرد.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-fm01-a2-gist-3',
    type: 'gist-select',
    targetSkill: 'listening',
    targetConcept: 'greet-first-meeting',
    assessesConcepts: ['greet-first-meeting'],
    difficulty: 1,
    promptFa: 'سورا فرض غلط یامادا را چگونه رد کرد؟',
    ...(() => {
      const { options, correctOptionId } = o3(
        'x',
        'مؤدبانه گفت نه — و گفت کیم کره‌ای است',
        'سکوت کرد و بحث را عوض کرد',
        'تأیید کرد که بله، چینی است',
        0,
      );
      return { options, correctOptionId };
    })(),
    distractorRationaleFa: {
      b: 'سکوت نبود — یک ردّ کامل با «نه» دیدی.',
      c: 'تأیید نبود — پاسخ با «نه» شروع شد.',
    },
    feedback: {
      f1Fa: 'اولین واژهٔ پاسخ سورا را به یاد بیاور: «نه».',
      f2HintFa: 'نه + اصلاح + واقعیت.',
      f3ExplainFa: 'سورا گفت: «نه، خانم کیم چینی نیست؛ کره‌ای است.»',
    },
    assessmentRole: 'practice',
  },
];


