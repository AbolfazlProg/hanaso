/**
 * HANASO — Chapter 1 (first conversation) stations — TASK-LEARNING-06 05B rebuild.
 *
 * The 19-station two-unit map of KB section 19 LESSON_ACTIVITY_MAP §۱/§۲/§۳:
 *   unit 02-1 «最初のあいさつ» (L1..L8): ANCHOR → VOCAB-1 → GRAMMAR-1 → STRUCTURE →
 *     GRAMMAR-2 → EXPRESSION-1 → LISTEN-1 → PRACTICE-1 → INTEGRATE-1
 *   unit 02-2 «キムさんの紹介» (L9..L13): RECONNECT → VOCAB-2 → GRAMMAR-3(も) →
 *     GRAMMAR-4(ではありません) → EXPRESSION-2 → LISTEN-2 → GRAMMAR-5(〜からきました) →
 *     PRACTICE-2 → INTEGRATE-2
 * The chapter gate (M1..M5) is the ASSESSMENT PAGE bank — never a walk station
 * (the product's shared gate architecture, DD-048; parallel gates forbidden — DD-117).
 *
 * Sequence per LEARNING_SEQUENCE_POLICY: vocab packets ≤3 cards with in-flow
 * retrieval; grammar = DIA loops (Display → Induce → Apply); expressions alternate
 * card/choice; ≤2 consecutive explanation blocks (EQA-2). FSRS enrollment per the
 * 05B contract (§3-1: wave-1 = 37 cards — 16+1+2+5+0 / 6+1+2+3+0+1).
 */
import type { Station, TeachingBlock } from '../types';
import { ANCHOR_INTRO_PROMISE_MARKER_FA, ANCHOR_INTRO_REASSURANCE_MARKER_FA } from './anchor-intro-law';

const L = (n: number) => `s-first-meeting-01-l${n}`;

const ex = (id: string, exerciseIds: string[]): TeachingBlock => ({ kind: 'exercise', id, exerciseIds });

export const FM01_STATIONS: Station[] = [
  /* ═════════════════ UNIT 02-1 «最初のあいさつ» — turns L1..L8 ═════════════════ */

  {
    slug: 'stn-fm01-01-anchor',
    type: 'anchor',
    titleFa: 'اولین برخورد — کل مکالمه',
    objectiveFa: 'کل مکالمهٔ ۱۳ خطی را فقط با گوش بشنو (بدون زیرنویس) و حس «شکاف دانستن» را تجربه کن',
    core: true,
    order: 1,
    prerequisites: [],
    /* ENGINE-REFORM 2026-11-22 §۲ (the honest full anchor): ALL 13 turns —
     * the previous data listed L9 twice and MISSED the joint closing turn L13
     * (both hosts speaking よろしく together). */
    lineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9), L(10), L(11), L(12), L(13)],
    objectiveCode: 'greet-first-meeting',
    estMinutes: 7,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'scene',
        id: 'blk-a1-scene',
        titleFa: 'کافه، بعدازظهر',
        /* LESSON-UX PART1 2026-11-26 — the chapter-opening law (owner order
         * «اول هر فصل یه اسلاید باید بگه طبیعیه بلد نباسی»): the reassurance
         * LEADS the slide (both ANCHOR_INTRO_* markers embedded verbatim), then
         * the who’s-who scene setup for the pure listen that follows. */
        bodyFa:
          'مکالمهٔ این فصل را فعلاً لازم نیست بفهمی — ' +
          `${ANCHOR_INTRO_REASSURANCE_MARKER_FA} هیچ‌چیزش را نمی‌فهمی؛ ` +
          `تا ${ANCHOR_INTRO_PROMISE_MARKER_FA} همهٔ آن را می‌آموزی. ` +
          'حالا فقط گوش کن: میکی دوستش سورا را برای اولین بار به کافهٔ یامادا می‌آورد. کنار پنجره، علی — استاد ایرانی — کتاب ژاپنی می‌خواند. سلام، معرفی، پرسش… و کمی بعد یک مهمان تازه وارد می‌شود.',
      },
      {
        /* ENGINE-REFORM 2026-11-22 §۲ (owner order «آزمون قبل از آموزش باید
         * کاملاً حذف شود»): the GRADED pre-viewing prediction is REMOVED —
         * the learner was forced to GUESS content they had neither been taught
         * nor even heard. The anchor is now the pure viewing experience
         * (JOURNEY-FIX 2026-11-23 §۴: the FIRST LISTEN plays with the Persian
         * subtitle OFF + pinned — «شکاف دانستن» pure listening; teaching
         * replays and the post-viewing gist checks below are unchanged, the
         * checks answerable straight from what was just heard). */
        kind: 'dialogue-player',
        id: 'blk-a1-dialogue',
        focusLineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9), L(10), L(11), L(12), L(13)],
      },
      ex('blk-a1-check', ['ex-fm01-a1-gist-1', 'ex-fm01-a1-gist-2', 'ex-fm01-a1-gist-3']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-02-vocab',
    type: 'vocab',
    titleFa: 'واژه‌های هویت',
    objectiveFa: '۸ واژهٔ هویت را با صدا بشناس: من، پسوند さん، سه ملیت، دانشگاه، استاد، آن شخص',
    core: true,
    order: 2,
    prerequisites: ['stn-fm01-01-anchor'],
    lineRefs: [L(1), L(3), L(5), L(6), L(7), L(8)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 9,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      { kind: 'vocab-card', id: 'blk-v1-card-watashi', wordId: 'voc-watashi' },
      { kind: 'vocab-card', id: 'blk-v1-card-san', wordId: 'voc-san' },
      { kind: 'vocab-card', id: 'blk-v1-card-nihonjin', wordId: 'voc-nihonjin' },
      ex('blk-v1-ret-1', ['ex-fm01-v1-p1-aud-1', 'ex-fm01-v1-p1-aud-2']),
      { kind: 'vocab-card', id: 'blk-v1-card-chuugokujin', wordId: 'voc-chuugokujin' },
      { kind: 'vocab-card', id: 'blk-v1-card-daigaku', wordId: 'voc-daigaku' },
      { kind: 'vocab-card', id: 'blk-v1-card-sensee', wordId: 'voc-sensee' },
      /* ENGINE-REFORM 2026-11-22 §۲ — the packet's engagement ramps d1 → d2:
       * the text recognition (d1, straight off the cards) comes FIRST, then
       * the harder audio recognition (d2). */
      ex('blk-v1-ret-2', ['ex-fm01-v1-p2-txt-1', 'ex-fm01-v1-p2-aud-1']),
      { kind: 'vocab-card', id: 'blk-v1-card-anokata', wordId: 'voc-anokata' },
      { kind: 'vocab-card', id: 'blk-v1-card-iranjin', wordId: 'voc-iranjin' },
      ex('blk-v1-ret-3', ['ex-fm01-v1-p3-match-1']),
      {
        kind: 'wrap-up',
        id: 'blk-v1-wrap',
        titleFa: 'امروز: ۸ واژهٔ هویت',
        itemsFa: [
          'わたし · 〜さん · にほんじん · ちゅうごくじん · だいがく · せんせい · あのかた · イランじん',
          '۱۶ کارت مرور (متن + صدا) ثبت شد — صف مرور روزانه با موتور FSRS فعال می‌شود.',
        ],
      },
    ],
    fsrsItems: [
      'w-fm01-watashi',
      's-fm01-watashi',
      'w-fm01-san',
      's-fm01-san',
      'w-fm01-nihonjin',
      's-fm01-nihonjin',
      'w-fm01-chuugokujin',
      's-fm01-chuugokujin',
      'w-fm01-daigaku',
      's-fm01-daigaku',
      'w-fm01-sensee',
      's-fm01-sensee',
      'w-fm01-anokata',
      's-fm01-anokata',
      'w-fm01-iranjin',
      's-fm01-iranjin',
    ],
  },
  {
    slug: 'stn-fm01-03-grammar-desu',
    type: 'grammar',
    titleFa: 'الگوی «X هست Y» — AはBです',
    objectiveFa: 'جملهٔ هویت را بفهم و بساز: わたしは にほんじんです',
    core: true,
    order: 3,
    prerequisites: ['stn-fm01-02-vocab'],
    lineRefs: [L(3), L(6), L(8)],
    objectiveCode: 'identity-statement',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* ENGINE-REFORM 2026-11-22 §۲/§۳ — the real teach-first rebuild of this
       * station. The dialogue-player becomes a LINE-TEACHING block (only
       * lines 3 & 6 render — speaker, reading, translation, per-line audio:
       * never the whole conversation); the old guided-discovery induction
       * quiz BEFORE the rule is REMOVED (a graded guess on an untaught rule —
       * «آزمون قبل از آموزش»); the rule-card now comes FIRST, then worked
       * examples, then ONE simple engagement straight off the teaching table,
       * then comprehension + production with a d1→d2 ramp. */
      { kind: 'dialogue-player', id: 'blk-g1-dialogue', lineTeaching: true, focusLineRefs: [L(3), L(6)] },
      {
        kind: 'rule-card',
        id: 'blk-g1-rule',
        patternJa: 'AはBです',
        titleFa: 'گزارهٔ هویت',
        bodyFa: '«A هست B»: A (موضوع) + は (علامت موضوع) + B (هویت) + です (پایان مؤدبانه). は اینجا wa خوانده می‌شود.',
        structureTable: {
          /* B1-REBUILD 2026-11-26 §۳: the columns are the SLOTS of the Japanese
           * pattern AはBです — the table lays out LTR so the sentence keeps its
           * real order (the RTL default reversed it into です|B|は|A for the
           * learner who had just been told Japanese reads left-to-right). */
          dir: 'ltr',
          headers: ['A (موضوع)', 'は', 'B (هویت)', 'です'],
          rows: [
            ['わたし', 'は', 'にほんじん', 'です'],
            ['ソラさん', 'は', 'ちゅうごくじん', 'です'],
            ['アリさん', 'は', 'だいがくの せんせい', 'です'],
          ],
        },
        persianBridgeFa: 'ترتیب فارسی و ژاپنی این‌جا یکی است: «من ژاپنی‌ام» — موضوع اول، «هستم» آخر.',
      },
      {
        kind: 'example-set',
        id: 'blk-g1-examples',
        examples: [
          {
            id: 'g1-ex-1',
            role: 'anchor',
            ja: 'わたしは にほんじんです。',
            reading: 'watashi wa nihonjin desu',
            fa: 'من ژاپنی‌ام.',
            whyFa: 'از خود مکالمه (خط ۳) — لنگر الگو.',
            lineRef: L(3),
          },
          {
            id: 'g1-ex-2',
            role: 'near',
            ja: 'ソラさんは ちゅうごくじんです。',
            reading: 'sora-san wa chuugokujin desu',
            fa: 'سورا چینی است.',
            whyFa: 'همان قاب، شخص سوم.',
            lineRef: L(6),
          },
          {
            id: 'g1-ex-3',
            role: 'varied',
            ja: 'アリさんは だいがくの せんせいです。',
            reading: 'ari-san wa daigaku no sensee desu',
            fa: 'علی استاد دانشگاه است.',
            whyFa: 'بافت تازه: شغل با ترکیب の.',
            lineRef: L(8),
          },
          {
            id: 'g1-ex-4',
            role: 'faded',
            ja: '___は イランじんです。',
            reading: '… wa iranjin desu',
            fa: '… ایرانی است.',
            whyFa: 'جای خالی = خودت! [نام]は イランじんです。',
            selfExplainFa: 'جای خالی را با نام خودت پر کن و بلند بگو.',
          },
        ],
      },
      /* ENGINE-REFORM 2026-11-22 §۲ — ONE simple engagement straight off the
       * rule-card's structure table (word-order, difficulty 1: the answer is
       * the table's own second row with the packet-1 nationality), THEN the
       * comprehension question, THEN production. The graded question is
       * declared (R5b) and comes AFTER its teaching. */
      ex('blk-g1-engage-1', ['ex-fm01-g1-order-1']),
      {
        kind: 'structured-input',
        id: 'blk-g1-input',
        questionFa: 'در خط ۸، چه کسی せんせい است؟',
        lineRef: L(8),
        assessesConcepts: ['gr-desu-identity', 'voc-sensee', 'voc-daigaku'],
        options: [
          { id: 'a', label: 'علی' },
          { id: 'b', label: 'یامادا' },
          { id: 'c', label: 'سورا' },
        ],
        correctOptionId: 'a',
        explainFa: 'アリさんは だいがくの せんせいです — الگوی AはBです دربارهٔ علی.',
      },
      ex('blk-g1-drill', ['ex-fm01-g1-cloze-1', 'ex-fm01-g1-prod-1', 'ex-fm01-g1-prod-2']),
    ],
    fsrsItems: ['gr-fm01-desu-identity'],
  },
  {
    slug: 'stn-fm01-04-structure',
    type: 'structure',
    titleFa: 'ترتیب ژاپنی و پل فارسی',
    objectiveFa: 'بفهم چرا سورا در خط ۴ «من» را نمی‌گوید — و چرا ترتیب برای تو غریبه نیست',
    core: true,
    order: 4,
    prerequisites: ['stn-fm01-03-grammar-desu'],
    lineRefs: [L(3), L(4)],
    objectiveCode: 'sov-bridge-persian',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'rule-card',
        id: 'blk-st-rule',
        patternJa: '(わたしは) …です',
        titleFa: 'حذف موضوع + ترتیب مشترک',
        bodyFa:
          'ژاپنی مثل فارسی موضوعِ معلوم را لازم نمی‌گوید: سورا در خط ۴ فقط می‌گوید «سورا هستم» — わたし حذف شد. و هر دو زبان فعل را آخر می‌آورند؛ پس ترتیب ژاپنی از روز اول برای تو آشناست.',
        structureTable: {
          headers: ['خط ۳ (با موضوع)', 'خط ۴ (حذف‌شده)'],
          rows: [['はじめまして、やまだです。わたしは にほんじんです。', 'はじめまして、ソラです。']],
        },
        persianBridgeFa: 'فارسی هم می‌گوید «(من) رفتم» بدون «من» — ژاپنی همین کار را می‌کند.',
        honestyLabelFa: 'برتری فارسی‌زبان‌ها در ترتیب SOV: پیش‌بینی ماست (استنتاج گونه‌شناختی)، نه اثبات‌شده.',
      },
      {
        kind: 'example-set',
        id: 'blk-st-examples',
        examples: [
          {
            id: 'st-ex-1',
            role: 'anchor',
            ja: 'わたしは にほんじんです。',
            reading: 'watashi wa nihonjin desu',
            fa: 'من ژاپنی‌ام. (با موضوع)',
            whyFa: 'خط ۳ — کامل.',
            lineRef: L(3),
          },
          {
            id: 'st-ex-2',
            role: 'varied',
            ja: 'はじめまして、ソラです。',
            reading: 'hajimemashite, sora desu',
            fa: 'از آشنایی‌تان خوشبختم؛ سورا هستم. (بدون わたしは)',
            whyFa: 'خط ۴ — موضوع حذف شد چون معلوم است.',
            lineRef: L(4),
          },
        ],
      },
      ex('blk-st-drill', ['ex-fm01-st-order-1']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-05-grammar-qa',
    type: 'grammar',
    titleFa: 'پرسش ですか و تأیید ですね',
    objectiveFa: 'هویت را بپرس (ですか) و شنیده‌ات را تأیید کن (ですね)',
    core: true,
    order: 5,
    prerequisites: ['stn-fm01-03-grammar-desu'],
    lineRefs: [L(5), L(7)],
    objectiveCode: 'identity-question',
    teachesConcepts: ['listen-final-intonation'],
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* ENGINE-REFORM 2026-11-22 §۲/§۳ — the teach-first rebuild: the two
       * model lines (5 & 7) render as the focused-line teaching view (never
       * the whole conversation); the guided-discovery induction quiz BEFORE
       * the rule is REMOVED (a graded guess on an untaught distinction);
       * the rule-card teaches the three forms FIRST, the はい expression
       * card joins the teaching packet, then ONE simple d1 engagement
       * straight off the table, then examples → listening → production. */
      { kind: 'dialogue-player', id: 'blk-g2-dialogue', lineTeaching: true, focusLineRefs: [L(5), L(7)] },
      {
        kind: 'rule-card',
        id: 'blk-g2-rule',
        patternJa: 'です / ですか / ですね',
        titleFa: 'سه شکل یک گزاره',
        bodyFa: 'به آخر です فقط یک ذره اضافه کن: か = سؤال شد؛ ね = «پس اینطور است، نه؟». آهنگ پایانی تمیزدهنده است.',
        structureTable: {
          headers: ['شکل', 'کار', 'آهنگ پایانی', 'مثال'],
          rows: [
            ['です', 'خبر', 'پایین', 'にほんじんです'],
            ['ですか', 'پرسش', 'بالا', 'にほんじんですか'],
            ['ですね', 'تأیید', 'نیمه‌پایین', 'ソラさんですね'],
          ],
        },
      },
      { kind: 'expression-card', id: 'blk-g2-card-hai', expressionId: 'chrk-hai' },
      /* §۲ — ONE simple engagement (difficulty 1) immediately after the
       * teaching packet: the single-blank cloze straight off the table's
       * ですね row. */
      ex('blk-g2-engage-1', ['ex-fm01-g2-engage-1']),
      {
        kind: 'example-set',
        id: 'blk-g2-examples',
        examples: [
          {
            id: 'g2-ex-1',
            role: 'anchor',
            ja: 'ソラさんですね。ちゅうごくじんですか。',
            reading: 'sora-san desu ne. chuugokujin desu ka.',
            fa: 'پس سورا هستید. چینی هستید؟',
            whyFa: 'بهترین جفتِ آموزشی مکالمه — هر دو در خط ۵.',
            lineRef: L(5),
          },
          {
            id: 'g2-ex-2',
            role: 'near',
            ja: 'あのかたは どなたですか。',
            reading: 'anokata wa donata desu ka.',
            fa: 'آن شخص کیست؟',
            whyFa: 'پرسش مؤدبانه با همین الگو (خط ۷).',
            lineRef: L(7),
          },
        ],
      },
      ex('blk-g2-drill-aud', ['ex-fm01-g2-aud-1']),
      ex('blk-g2-drill', ['ex-fm01-g2-cloze-1', 'ex-fm01-g2-prod-1', 'ex-fm01-g2-prod-2']),
    ],
    fsrsItems: ['gr-fm01-desu-qa', 'chrk-fm01-hai'],
  },
  {
    slug: 'stn-fm01-06-expression',
    type: 'expression',
    titleFa: 'آیین آشنایی — سه فرمول + پرسش مؤدبانه',
    objectiveFa: 'فرمول‌های آشنایی را در جای درست به‌کار ببر',
    core: true,
    order: 6,
    prerequisites: ['stn-fm01-02-vocab'],
    lineRefs: [L(1), L(3), L(7), L(13)],
    objectiveCode: 'greet-first-meeting',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* ENGINE-REFORM 2026-11-22 §۲ — every card packet now gets its immediate
       * SIMPLE engagement (difficulty 1, answerable straight off the card just
       * seen) BEFORE the harder d2 retrieval — the mandated teach→engage ramp. */
      { kind: 'expression-card', id: 'blk-e1-card-konnichiwa', expressionId: 'chrk-konnichiwa' },
      { kind: 'expression-card', id: 'blk-e1-card-hajimemashite', expressionId: 'chrk-hajimemashite' },
      ex('blk-e1-ret-1', ['ex-fm01-e1-resp-1']),
      { kind: 'expression-card', id: 'blk-e1-card-yoroshiku', expressionId: 'chrk-yoroshiku' },
      ex('blk-e1-engage-y', ['ex-fm01-e1-engage-yoroshiku']),
      ex('blk-e1-ret-2', ['ex-fm01-e1-resp-2']),
      { kind: 'expression-card', id: 'blk-e1-card-anokata', expressionId: 'chrk-anokata-donata' },
      ex('blk-e1-engage-a', ['ex-fm01-e1-engage-anokata']),
      ex('blk-e1-ret-3', ['ex-fm01-e1-order-1']),
      {
        kind: 'wrap-up',
        id: 'blk-e1-wrap',
        titleFa: 'آیین آشنایی',
        itemsFa: [
          'こんにちは (سلام) → はじめまして (از آشنایی‌تان خوشبختم) → [نام]です (معرفی) → よろしく おねがいします (از رابطه‌مان خوشحالم)',
          '۵ کارت عبارت ثبت شد.',
        ],
      },
    ],
    fsrsItems: [
      'chrk-fm01-konnichiwa',
      'chrk-fm01-hajimemashite',
      'chrk-fm01-yoroshiku',
      'chrk-fm01-anokata-donata',
      's-line-fm01-l3',
    ],
  },
  {
    slug: 'stn-fm01-07-listen',
    type: 'listen',
    titleFa: 'گوشِ اول — صداهای کشیده و آهنگ جمله',
    objectiveFa: 'بدون متن دنبال کن: جیست، چه‌کسی، و تفاوت‌های صدایی',
    core: true,
    order: 7,
    prerequisites: ['stn-fm01-02-vocab', 'stn-fm01-05-grammar-qa'],
    lineRefs: [L(3), L(5), L(6), L(7), L(8)],
    objectiveCode: 'listen-vowel-length',
    teachesConcepts: ['listen-final-intonation'],
    estMinutes: 4,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* B2-REBUILD §D1 — the intro card's copy is AUTHORED (the global
       * default assumed whole LINES play in this station; the actual flow is
       * rule-card teaching → word/sentence audio inside the exercises). The
       * honest intro sets the ear's goal before the vowel-length rule. */
      {
        kind: 'listening-task',
        id: 'blk-l1-task',
        taskId: 'listen-1',
        titleFa: 'گوشِ فعال',
        bodyFa:
          'در این درس فقط با گوش کار می‌کنی: اول تفاوتِ صداهای کشیده و کوتاه را می‌آموزی، بعد بدون دیدن متن، با صدا پاسخ می‌دهی. دکمهٔ پخش هر پرسش، همان چیزی را که باید بشنوی پخش می‌کند.',
      },
      /* ENGINE-REFORM 2026-11-22 §۲ — the station's NEW concept (vowel length)
       * is TAUGHT before it is tested: a rule-card models the two contrast
       * pairs with their real audio (the correct forms carry committed
       * hostword assets; the wrong forms honestly render no control — they
       * are not words). The minimal-pair items that previously tested this
       * untaught skill cold (difficulty 3 first!) now follow a modeled
       * engagement: teach → simple guided discrimination → recycling →
       * independent. */
      {
        kind: 'rule-card',
        id: 'blk-l1-vl-rule',
        patternJa: 'せんせい ↔ せんせ',
        titleFa: 'صدای کشیده — بلند یا کوتاه',
        bodyFa:
          'در ژاپنی طول واکه معنا را عوض می‌کند. せんせい (استاد) چهار موراست و واکهٔ پایانی‌اش کشیده است؛ کوتاهش کنی (せんせ) واژه نابود می‌شود. همین‌طور ちゅうごく (چین): «اوی» وسط واژه کشیده است — ちゅごく نادرست است.',
        structureTable: {
          headers: ['درست (کشیده)', 'نادرست (کوتاه)', 'شنیدن'],
          rows: [
            ['せんせい — سِنسِی (استاد)، ۴ مورا', 'せんせ — واژه نیست', 'سِ…ن…سِی — آخر کشیده'],
            ['ちゅうごく — چیووگوکو (چین)', 'ちゅごく — واژه نیست', 'چِیوْ…گو…کو — وسط کشیده'],
          ],
        },
        listenWords: ['せんせい', 'ちゅうごく'],
        listenNoteFa: 'صدای شکل‌های درست پخش می‌شود؛ شکل‌های نادرست واژه نیستند و صدای ثبت‌شده ندارند.',
        persianBridgeFa: 'مثل فارسی: «آب» با آی بلند — کوتاهش کنی «اب» می‌شود، بی‌معنا.',
      },
      /* §۲ — ONE simple engagement (difficulty 1) straight off the rule just
       * taught: recognize the modeled long form in the taught line 8. */
      ex('blk-l1-engage-1', ['ex-fm01-l1-engage-1']),
      /* recycling of ALREADY-taught material, ramping d1 → d2. */
      ex('blk-l1-drill-1', ['ex-fm01-l1-who-1', 'ex-fm01-l1-gist-1']),
      /* independent discrimination — now AFTER teaching + guided practice. */
      ex('blk-l1-drill-2', ['ex-fm01-l1-mp-1', 'ex-fm01-l1-mp-2']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-08-practice',
    type: 'practice',
    titleFa: 'تمرین — تثبیت بخش اول',
    objectiveFa: 'همهٔ آموخته‌های خط‌های ۱ تا ۸ را بازیابی کن',
    core: true,
    order: 8,
    prerequisites: [
      'stn-fm01-02-vocab',
      'stn-fm01-03-grammar-desu',
      'stn-fm01-05-grammar-qa',
      'stn-fm01-06-expression',
      'stn-fm01-07-listen',
    ],
    lineRefs: [L(3), L(5), L(6), L(8)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.7 },
    blocks: [
      ex('blk-p1-c1', ['ex-fm01-p1-c1-aud-1', 'ex-fm01-p1-c1-aud-2']),
      ex('blk-p1-c2', [
        'ex-fm01-p1-c2-order-1',
        'ex-fm01-p1-c2-cloze-1',
        'ex-fm01-p1-c2-prod-1',
        'ex-fm01-p1-c2-gist-1',
        'ex-fm01-p1-c2-mp-1',
      ]),
      ex('blk-p1-c3', ['ex-fm01-p1-c3-decode-1', 'ex-fm01-p1-c3-decode-2']),
      {
        kind: 'wrap-up',
        id: 'blk-p1-wrap',
        titleFa: 'بخش اول تمام شد!',
        itemsFa: [
          '۸ واژه + ۲ الگو + ۴ فرمول + اولین معرفی‌ات را داری.',
          'قسمت بعد: کیم خودش می‌آید — و یامادا یک پرسش دیگر دارد…',
        ],
      },
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-09-integrate',
    type: 'integrate',
    titleFa: 'معرفی خودت — با میکی',
    objectiveFa: 'خودت را در موقعیت واقعی معرفی کن',
    core: true,
    order: 9,
    prerequisites: ['stn-fm01-08-practice'],
    lineRefs: [],
    objectiveCode: 'self-intro-production',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    blocks: [
      {
        kind: 'character-scene',
        id: 'blk-i1-scene',
        steps: [
          { speaker: 'میکی', ja: 'こんにちは！', reading: 'konnichiwa!', fa: 'سلام!' },
          {
            speaker: 'میکی',
            ja: 'はじめまして、ミキです。',
            reading: 'hajimemashite, miki desu.',
            fa: 'از آشنایی‌تان خوشبختم؛ میکی هستم.',
          },
          {
            speaker: 'میکی',
            ja: 'おなまえは？',
            reading: 'onamae wa?',
            fa: 'اسمت چیست؟ — حالا نوبت توست: معرفی‌ات را بساز!',
            userReply: {
              kind: 'template-build',
              /* B2 §D4 — the prompt names the [نامت] tile exactly as it renders
               * (the b1 §۲ label) — «چیپ» was engine jargon a beginner has
               * never met. */
              promptFa: 'معرفی کامل خودت را بچین — جای [نامت]، نام خودت را بنویس',
              chips: [
                // UX-AUDIT #143: the name slot uses the engine's ___NAME___
                // convention — the runner renders a Persian-labelled input,
                // never the literal 'NAME' tile the audit screenshotted.
                { id: 'ic1', ja: 'はじめまして、' },
                { id: 'ic2', ja: '___NAME___' },
                { id: 'ic3', ja: 'です。' },
                { id: 'ic4', ja: 'よろしく おねがいします。' },
              ],
              acceptedOrders: [['ic1', 'ic2', 'ic3', 'ic4']],
              nameSlotChipId: 'ic2',
            },
          },
        ],
      },
      {
        kind: 'wrap-up',
        id: 'blk-i1-wrap',
        titleFa: 'اولین معرفی ژاپنی‌ات!',
        itemsFa: ['はじめまして、[نام تو]です。よろしく おねがいします。 — همین جمله را بلند تمرین کن.'],
      },
    ],
    fsrsItems: [],
  },

  /* ═════════════════ UNIT 02-2 «キムさんの紹介» — turns L9..L13 ═════════════════ */
  {
    slug: 'stn-fm01-10-reconnect',
    type: 'anchor',
    titleFa: 'بازگشت به مکالمه — این‌بار به کیم گوش کن',
    objectiveFa: 'همان مکالمه را با تمرکز خط‌های ۹ تا ۱۳ دوباره بشنو',
    core: true,
    order: 10,
    prerequisites: ['stn-fm01-09-integrate'],
    lineRefs: [L(9), L(10), L(11), L(12), L(13)],
    objectiveCode: 'greet-first-meeting',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'scene',
        id: 'blk-a2-scene',
        titleFa: 'مهمان تازه',
        bodyFa:
          'همکلاسیِ سورا — کیم — وارد کافه می‌شود. یامادا کنجکاو می‌شود: آیا او هم مثل سورا چینی است؟ این‌بار دقیق گوش کن: یک فرض غلط، یک ردّ مؤدبانه و یک معرفی تازه در راه است.',
      },
      {
        kind: 'dialogue-player',
        id: 'blk-a2-dialogue',
        /* B2-REBUILD §D5 — two fixes:
         * (۱) the graded pre-listening prediction is REMOVED — the anchor
         *     law (ENGINE-REFORM §۲ / PART1): a guess on content the learner
         *     has neither been taught (かんこく comes in the NEXT lesson) nor
         *     needs to make cold must never be graded, and the old reveal
         *     spoiled the very listening this station exists for. The scene
         *     body above already plants the curiosity hook («آیا او هم مثل
         *     سورا چینی است؟»); the a2-gist checks AFTER the listen carry
         *     the comprehension (answerable from the replay's subtitle).
         * (۲) focusLineRefs listed L9 TWICE and dropped the joint closing
         *     turn L13 (the unit is L9..L13) — the LINE-REFS-UNIQUE law
         *     (B2 §E3) now rejects this class at load time. */
        focusLineRefs: [L(9), L(10), L(11), L(12), L(13)],
      },
      ex('blk-a2-check', ['ex-fm01-a2-gist-1', 'ex-fm01-a2-gist-2', 'ex-fm01-a2-gist-3']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-11-vocab2',
    type: 'vocab',
    titleFa: 'واژه‌های بخش دوم',
    objectiveFa: '۳ واژهٔ تازه (کره‌ای، از، آمد) + بازیافت واژه‌های قبل',
    core: true,
    order: 11,
    prerequisites: ['stn-fm01-10-reconnect'],
    lineRefs: [L(9), L(10), L(12)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 4,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      ex('blk-v2-recycle', ['ex-fm01-v2-dec-1', 'ex-fm01-v2-dec-2']),
      { kind: 'vocab-card', id: 'blk-v2-card-kankokujin', wordId: 'voc-kankokujin' },
      { kind: 'vocab-card', id: 'blk-v2-card-kara', wordId: 'voc-kara' },
      { kind: 'vocab-card', id: 'blk-v2-card-kimashita', wordId: 'voc-kimashita' },
      ex('blk-v2-drill', ['ex-fm01-v2-aud-1', 'ex-fm01-v2-aud-2', 'ex-fm01-v2-txt-1']),
      {
        kind: 'wrap-up',
        id: 'blk-v2-wrap',
        titleFa: '۳ واژهٔ تازه',
        itemsFa: ['かんこくじん (کره‌ای) · から (از) · きました (آمد)', '۶ کارت مرور تازه ثبت شد.'],
      },
    ],
    fsrsItems: [
      'w-fm01-kankokujin',
      's-fm01-kankokujin',
      'w-fm01-kara',
      's-fm01-kara',
      'w-fm01-kimashita',
      's-fm01-kimashita',
    ],
  },
  {
    slug: 'stn-fm01-12-grammar-mo',
    type: 'grammar',
    titleFa: '「هم» — も',
    objectiveFa: 'با も بگو «او هم مثل قبلی است»: キムさんも ちゅうごくじんですか',
    core: true,
    order: 12,
    prerequisites: ['stn-fm01-11-vocab2'],
    lineRefs: [L(6), L(9)],
    objectiveCode: 'identity-question',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* B2-REBUILD §D7 — lineTeaching: the grammar station's dialogue block
       * shows ONLY its taught line (the focused-line card), exactly like the
       * batch-1 grammar stations (blk-g1/blk-g2); the old full-player replay
       * contradicted «هنگام آموزش یک خط، فقط همان خط نمایش داده شود». */
      { kind: 'dialogue-player', id: 'blk-g3-dialogue', lineTeaching: true, focusLineRefs: [L(9)] },
      {
        kind: 'guided-discovery',
        id: 'blk-g3-discovery',
        displayLineRef: L(9),
        highlightSurfaces: ['キムさんも'],
        compareLineRef: L(6),
        /* B2 §D7 — the も-question is dialogue line ۹ (the old «خط ۱۰» was
         * off by one; the «خط N» content law pins this class forever). */
        questionFa: 'جملهٔ خط ۶ را با خط ۹ مقایسه کن — も چه چیزی را عوض کرد؟',
        options: [
          { id: 'a', label: '«هم» را می‌رساند: مثل سورا' },
          { id: 'b', label: 'پرسش را مؤدبانه می‌کند' },
          { id: 'c', label: 'جمله را منفی می‌کند' },
        ],
        correctOptionId: 'a',
        explainFa:
          'わたしは ちゅうごくじんです (من چینی‌ام) → キムさんも ちゅうごくじんですか (کیم هم چینی است؟) — も جای は می‌نشیند و «افزودن به همان گروه» را می‌رساند.',
      },
      {
        kind: 'rule-card',
        id: 'blk-g3-rule',
        patternJa: 'AもBです',
        titleFa: 'افزودن به گروه',
        bodyFa: 'جای は، も بنشان = «این هم همان چیزِ قبلی است». キムさんも = «کیم هم» — با هم نمی‌آیند: یا は یا も.',
        structureTable: {
          headers: ['با は', 'با も'],
          rows: [
            [
              'キムさんは ちゅうごくじんですか (دربارهٔ کیم: چینی است؟)',
              'キムさんも ちゅうごくじんですか (کیم هم چینی است؟)',
            ],
          ],
        },
      },
      {
        kind: 'example-set',
        id: 'blk-g3-examples',
        examples: [
          {
            id: 'g3-ex-1',
            role: 'anchor',
            ja: 'キムさんも ちゅうごくじんですか。',
            reading: 'kim-san mo chuugokujin desu ka.',
            fa: 'کیم هم چینی است؟',
            whyFa: 'از مکالمه (خط ۹) — یامادا کیم را به گروهِ سورا اضافه می‌کند.',
            lineRef: L(9),
          },
          {
            id: 'g3-ex-2',
            role: 'near',
            ja: 'わたしも がくせいです。',
            reading: 'watashi mo gakusee desu.',
            fa: 'من هم دانشجوام. (がくせい = دانشجو)',
            whyFa: 'همان قاب دربارهٔ خودت.',
          },
          {
            id: 'g3-ex-3',
            role: 'varied',
            ja: 'アリさんも せんせいですか。',
            reading: 'ari-san mo sensee desu ka.',
            fa: 'علی هم استاد است؟',
            whyFa: 'بافت تازه با واژه‌های آشنا.',
          },
        ],
      },
      ex('blk-g3-drill', ['ex-fm01-g3-cloze-1', 'ex-fm01-g3-prod-1']),
    ],
    fsrsItems: ['gr-fm01-mo'],
  },
  {
    slug: 'stn-fm01-13-grammar-dewa',
    type: 'grammar',
    titleFa: 'نفی مؤدبانه — では ありません',
    objectiveFa: 'فرض غلط را مؤدبانه رد کن: ちゅうごくじんでは ありません',
    core: true,
    order: 13,
    prerequisites: ['stn-fm01-12-grammar-mo'],
    // NB: only L10 — keeping L9 here would double-anchor gr-mo (EQA-1 cluster warning).
    lineRefs: [L(10)],
    objectiveCode: 'identity-statement',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      { kind: 'dialogue-player', id: 'blk-g4-dialogue', focusLineRefs: [L(10)] },
      {
        kind: 'guided-discovery',
        id: 'blk-g4-discovery',
        displayLineRef: L(10),
        highlightSurfaces: ['では', 'ありません'],
        questionFa: 'سورا فرض یامادا را چطور رد کرد؟',
        options: [
          { id: 'a', label: 'با では ありません — «نیست»' },
          { id: 'b', label: 'با か — پرسش' },
          { id: 'c', label: 'با も — «هم»' },
        ],
        correctOptionId: 'a',
        explainFa:
          'キムさんは ちゅうごくじんでは ありません = «کیم چینی نیست» — では ありません خودش پایان مؤدبانهٔ نفی است؛ بعدش می‌توانی جملهٔ درست را بچسبانی: かんこくじんです.',
      },
      {
        kind: 'rule-card',
        id: 'blk-g4-rule',
        patternJa: 'AはBでは ありません',
        titleFa: '«نیست» — نفی مؤدبانه',
        bodyFa:
          'به‌جای です بنویس では ありません = «نیست». کلید: بعدش جملهٔ درست را اضافه کن — ردِ مؤدبانهٔ کامل مثل سورا: نه + نیست + درست.',
        structureTable: {
          headers: ['مثبت', 'نفی'],
          rows: [
            ['かんこくじんです (کره‌ای است)', 'ちゅうごくじんでは ありません (چینی نیست)'],
            ['せんせいです (استاد است)', 'せんせいでは ありません (استاد نیست)'],
          ],
        },
        persianBridgeFa: 'مثل فارسی: «نه، چینی نیست؛ کره‌ای است» — اول ردّ، بعد اصلاح.',
      },
      {
        kind: 'example-set',
        id: 'blk-g4-examples',
        examples: [
          {
            id: 'g4-ex-1',
            role: 'anchor',
            ja: 'キムさんは ちゅうごくじんでは ありません。かんこくじんです。',
            reading: 'kim-san wa chuugokujin dewa arimasen. kankokujin desu.',
            fa: 'کیم چینی نیست. کره‌ای است.',
            /* B2 §D8 (common defect — the «خط N» law): the sentence is
             * dialogue line ۱۰; the old «خط ۱۱» was off by one. */
            whyFa: 'از مکالمه (خط ۱۰) — اوج اصلاح اطلاعات.',
            lineRef: L(10),
          },
          {
            id: 'g4-ex-2',
            role: 'near',
            ja: 'わたしは せんせいでは ありません。がくせいです。',
            reading: 'watashi wa sensee dewa arimasen. gakusee desu.',
            fa: 'من استاد نیستم. دانشجوام.',
            whyFa: 'همان قاب دربارهٔ خودت (がくせい = دانشجو).',
          },
          {
            id: 'g4-ex-3',
            role: 'faded',
            ja: 'わたしは ___。イランじんです。',
            reading: 'watashi wa … . iranjin desu.',
            fa: 'من … نیستم. ایرانی‌ام.',
            whyFa: 'چه چیزی «نیستی»؟ خودت پر کن — مثلاً にほんじんでは ありません.',
            selfExplainFa: 'یک ملیت که «نیستی» را انتخاب کن و جمله را کامل بگو.',
          },
        ],
      },
      ex('blk-g4-drill', ['ex-fm01-g4-cloze-1', 'ex-fm01-g4-prod-1']),
    ],
    fsrsItems: ['gr-fm01-dewa-arimasen', 's-line-fm01-l10'],
  },
  {
    slug: 'stn-fm01-14-expression',
    type: 'expression',
    titleFa: 'واکنش‌ها — نه، آه‌می‌فهمم، فهمیدم',
    objectiveFa: 'سه واکنش گفتاری را در جای درست به‌کار ببر',
    core: true,
    order: 14,
    prerequisites: ['stn-fm01-13-grammar-dewa'],
    lineRefs: [L(10), L(11)],
    objectiveCode: 'react-new-info',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      { kind: 'expression-card', id: 'blk-e2-card-iie', expressionId: 'chrk-iie' },
      ex('blk-e2-ret-1', ['ex-fm01-e2-resp-1']),
      { kind: 'expression-card', id: 'blk-e2-card-soodesuka', expressionId: 'chrk-soodesuka' },
      ex('blk-e2-ret-2', ['ex-fm01-e2-resp-2']),
      { kind: 'expression-card', id: 'blk-e2-card-wakarimashita', expressionId: 'chrk-wakarimashita' },
      ex('blk-e2-ret-3', ['ex-fm01-e2-order-1', 'ex-fm01-e2-prod-1']),
    ],
    fsrsItems: ['chrk-fm01-iie', 'chrk-fm01-soodesuka', 'chrk-fm01-wakarimashita'],
  },
  {
    slug: 'stn-fm01-15-listen',
    type: 'listen',
    titleFa: 'گوشِ دوم — ん خیشومی و آهنگ ردّ مؤدب',
    objectiveFa: 'かんこく را از かこく تمیز بده و ردّ مؤدبانه را بشناس',
    core: true,
    order: 15,
    prerequisites: ['stn-fm01-11-vocab2', 'stn-fm01-14-expression'],
    lineRefs: [L(9), L(10), L(11), L(12)],
    objectiveCode: 'listen-vowel-length',
    teachesConcepts: ['listen-nasal-mora', 'listen-final-intonation'],
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      /* B3 §D — the intro card's copy is AUTHORED (the B2 §D1 pattern: the
       * global default assumed whole LINES play in this station; the actual
       * flow is rule-card teaching → word/line audio inside the exercises).
       * The honest intro sets the ear's goal before the nasal-mora rule. */
      {
        kind: 'listening-task',
        id: 'blk-l2-task',
        taskId: 'listen-2',
        titleFa: 'گوشِ دوم',
        bodyFa:
          'در این درس دوباره فقط با گوش کار می‌کنی: اول مورای خیشومی ん را می‌آموزی، بعد بدون دیدن متن، با صدا پاسخ می‌دهی. دکمهٔ پخش هر پرسش، همان چیزی را که باید بشنوی پخش می‌کند.',
      },
      /* B3 §D (the B2 §۲ pattern) — the station's NEW concept (the nasal
       * mora) is TAUGHT before it is tested: a rule-card models the contrast
       * with its real audio (the correct forms carry committed hostword
       * assets; the wrong form honestly renders no control — it is not a
       * word). The minimal-pair items that previously tested this untaught
       * skill cold now follow a modeled engagement: teach → guided
       * discrimination → recycling → independent. */
      {
        kind: 'rule-card',
        id: 'blk-l2-nm-rule',
        patternJa: 'かんこく ↔ かこく',
        titleFa: 'مورای خیشومی — ん',
        bodyFa:
          'در ژاپنی ん یک مورای کامل است، مثل هر صدای دیگر. かんこく (کره) چهار مورا دارد: か+ん+こ+く — اگر ん را جا بیندازی، かこく می‌ماند که واژه نیست. همین ん را در かんこくじん (کره‌ای) هم می‌شنوی.',
        structureTable: {
          headers: ['درست (با ん)', 'نادرست (بدون ん)', 'شنیدن'],
          rows: [
            ['かんこく — کان‌کوکو (کره)، ۴ مورا', 'かこく — واژه نیست', 'کانْ…کو — ん کامل ادا می‌شود'],
            ['かんこくじん — کان‌کوکوجین (کره‌ای)', 'かここじん — واژه نیست', 'همان ん، داخل واژهٔ ملیت'],
          ],
        },
        listenWords: ['かんこく', 'かんこくじん'],
        listenNoteFa: 'صدای شکل‌های درست پخش می‌شود؛ شکل‌های نادرست واژه نیستند و صدای ثبت‌شده ندارند.',
        persianBridgeFa: 'مثل فارسی: در «فانوس»، «ن» یک صدای کامل است — حذفش کنی «فاوس» می‌شود، بی‌معنا.',
      },
      /* §D — ONE simple engagement (difficulty 1) straight off the rule just
       * taught: recognize the modeled form. */
      ex('blk-l2-engage-1', ['ex-fm01-l2-engage-1']),
      /* recycling of ALREADY-taught material (the question intonation of the
       * grammar-qa station), ramping difficulty. */
      ex('blk-l2-drill-1', ['ex-fm01-l2-aud-1']),
      /* independent discrimination on a NEW surface (the full nationality
       * word) — now AFTER teaching + guided practice. */
      ex('blk-l2-drill-2', ['ex-fm01-l2-mp-1', 'ex-fm01-l2-who-1']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-16-grammar-kara',
    type: 'grammar',
    titleFa: 'خاستگاه — 〜から きました',
    objectiveFa: 'بگو از کجا آمده‌ای: かんこくから きました / イランから きました',
    core: true,
    order: 16,
    prerequisites: ['stn-fm01-11-vocab2'],
    lineRefs: [L(12)],
    objectiveCode: 'origin-statement',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'dialogue-player',
        id: 'blk-g5-dialogue',
        focusLineRefs: [L(12)],
      },
      {
        kind: 'guided-discovery',
        id: 'blk-g5-discovery',
        displayLineRef: L(12),
        highlightSurfaces: ['かんこくから', 'きました'],
        questionFa: 'در «از کره آمدم»، جای から کجاست؟',
        options: [
          { id: 'a', label: 'بعد از مکان، قبل از فعل' },
          { id: 'b', label: 'اول جمله، قبل از مکان' },
          { id: 'c', label: 'آخر جمله' },
        ],
        correctOptionId: 'a',
        explainFa:
          'かんこく + から + きました = مکان + «از» + «آمد» — برعکس فارسی که «از» قبل از مکان می‌آید: ژاپنی می‌گوید «کره‌از آمدم».',
      },
      {
        kind: 'rule-card',
        id: 'blk-g5-rule',
        patternJa: '〜から きました',
        titleFa: 'خاستگاه',
        bodyFa:
          '[مکان] から きました = از [مکان] آمده‌ام. から بعد از مکان می‌نشیند و ました یعنی کار در گذشته انجام شده. هویت با です، خاستگاه با 〜から きました — دو کار متفاوت، هر دو درست.',
        structureTable: {
          headers: ['هویت (です)', 'خاستگاه (から きました)'],
          rows: [['かんこくじんです (کره‌ای است)', 'かんこくから きました (از کره آمده)']],
        },
        persianBridgeFa:
          'فارسی: «از تهران آمدم» — ژاپنی همان را برعکس می‌چیند: «تهران-از آمدم». فعل آخر است، مثل همیشه.',
      },
      {
        kind: 'example-set',
        id: 'blk-g5-examples',
        examples: [
          {
            id: 'g5-ex-1',
            role: 'anchor',
            ja: 'かんこくから きました。',
            reading: 'kankoku kara kimashita.',
            fa: 'از کره آمده‌ام.',
            /* B2 §D8 (common defect — the «خط N» law): line ۱۲, not ۱۳. */
            whyFa: 'از مکالمه (خط ۱۲) — جملهٔ ورود کیم.',
            lineRef: L(12),
          },
          {
            id: 'g5-ex-2',
            role: 'near',
            ja: 'イランから きました。',
            reading: 'iran kara kimashita.',
            fa: 'از ایران آمده‌ام.',
            whyFa: 'جملهٔ خودِ تو!',
          },
          {
            id: 'g5-ex-3',
            role: 'varied',
            ja: 'とうきょうから きました。',
            reading: 'tookyoo kara kimashita.',
            fa: 'از توکیو آمده‌ام. (とうきょう = توکیو)',
            whyFa: 'شهر هم می‌نشیند، فقط کشور نه.',
          },
        ],
      },
      ex('blk-g5-drill', ['ex-fm01-l2-gist-1', 'ex-fm01-g5-order-1', 'ex-fm01-g5-prod-1']),
    ],
    fsrsItems: ['gr-fm01-kara-kimashita'],
  },
  {
    slug: 'stn-fm01-17-practice',
    type: 'practice',
    titleFa: 'تمرین — درهم‌آمیزی دو بخش',
    objectiveFa: 'الگوهای هر دو بخش را کنار هم بازیابی کن: は/も · ですか/ではありません · خاستگاه',
    core: true,
    order: 17,
    prerequisites: ['stn-fm01-16-grammar-kara', 'stn-fm01-15-listen'],
    lineRefs: [L(9), L(10), L(12)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 5,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.7 },
    blocks: [
      ex('blk-p2-c1', ['ex-fm01-p2-c1-decode-1', 'ex-fm01-p2-c1-decode-2']),
      ex('blk-p2-c2', ['ex-fm01-p2-c2-cloze-1', 'ex-fm01-p2-c2-prod-1', 'ex-fm01-p2-c2-prod-2']),
      ex('blk-p2-c3', ['ex-fm01-p2-c3-cloze-1', 'ex-fm01-p2-c3-cloze-2', 'ex-fm01-p2-c3-order-1']),
      {
        kind: 'wrap-up',
        id: 'blk-p2-wrap',
        titleFa: 'هر دو بخش تثبیت شد',
        itemsFa: [
          'حالا هر دو واحد داری: هویت + پرسش + «هم» + نفی + خاستگاه.',
          'گام بعد: بازگشت به کل مکالمه و گیت فهم — «این مکالمه را فهمیدی» منتظر توست.',
        ],
      },
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-18-integrate',
    type: 'integrate',
    titleFa: 'کاربرد کامل — ردّ فرض و معرفی با خاستگاه',
    objectiveFa: 'وقتی میکی حدس می‌زند چینی هستی، مؤدبانه اصلاح کن و خودت را کامل معرفی کن',
    core: true,
    order: 18,
    prerequisites: ['stn-fm01-17-practice'],
    lineRefs: [],
    objectiveCode: 'self-intro-production',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    blocks: [
      {
        kind: 'character-scene',
        id: 'blk-i2-scene',
        steps: [
          { speaker: 'میکی', ja: 'こんにちは！', reading: 'konnichiwa!', fa: 'سلام!' },
          {
            speaker: 'میکی',
            ja: 'NAMEさんは ちゅうごくじんですか。',
            reading: '…-san wa chuugokujin desu ka.',
            fa: 'آیا شما چینی هستید؟ — میکی حدسش را می‌گوید…',
            userReply: {
              kind: 'template-build',
              promptFa: 'ردّ مؤدبانه + معرفی کامل بساز: نه، ایرانی‌ام. از ایران آمده‌ام.',
              chips: [
                { id: 'i2c1', ja: 'いいえ、' },
                { id: 'i2c2', ja: 'わたしは' },
                { id: 'i2c3', ja: 'イランじんです。' },
                { id: 'i2c4', ja: 'イランから' },
                { id: 'i2c5', ja: 'きました。' },
              ],
              acceptedOrders: [
                ['i2c1', 'i2c2', 'i2c3', 'i2c4', 'i2c5'],
                ['i2c2', 'i2c1', 'i2c3', 'i2c4', 'i2c5'],
              ],
            },
          },
          {
            speaker: 'میکی',
            ja: 'そうですか！わかりました。',
            reading: 'soo desu ka! wakarimashita.',
            fa: 'آه، می‌فهمم! فهمیدم.',
          },
        ],
      },
      {
        kind: 'wrap-up',
        id: 'blk-i2-wrap',
        titleFa: 'کاربرد کامل شد!',
        itemsFa: [
          'いいえ、わたしは イランじんです。イランから きました。 — جملهٔ کاملاً شخصی‌ات.',
          'حالا برگرد به مکالمهٔ کامل و در گیت فهم ثابت کن که همه‌چیز را می‌فهمی.',
        ],
      },
    ],
    fsrsItems: [],
  },

  /* ═════════════════ OPTIONAL BRANCHES (never prerequisites — island §۷-۱) ═════════════════ */
  {
    slug: 'stn-fm01-opt-countries',
    type: 'deepdive',
    titleFa: 'کشورها و زبان‌ها (اختیاری)',
    objectiveFa: 'الگوی 〜じん را با کشورهای بیشتر تمرین کن — پیش‌نمایش 〜ご',
    core: false,
    order: 19,
    prerequisites: ['stn-fm01-02-vocab'],
    lineRefs: [L(10), L(12)],
    objectiveCode: 'country-pattern',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'example-set',
        id: 'blk-od1-table',
        examples: [
          {
            id: 'od1-ex-1',
            role: 'varied',
            ja: 'にほんじん',
            reading: 'nihonjin',
            fa: 'ژاپنی — にほん + じん',
            whyFa: 'الگوی پایه.',
            lineRef: L(3),
          },
          {
            id: 'od1-ex-2',
            role: 'varied',
            ja: 'かんこくじん',
            reading: 'kankokujin',
            fa: 'کره‌ای — かんこく + じん',
            whyFa: 'جدول کشور: نام کشور + じん.',
            lineRef: L(10),
          },
          {
            id: 'od1-ex-3',
            role: 'varied',
            ja: 'アメリカじん',
            reading: 'amerika-jin',
            fa: 'آمریکایی',
            whyFa: 'کشورهای خارجی با کاتاکانا.',
          },
          {
            id: 'od1-ex-4',
            role: 'faded',
            ja: 'にほんご',
            reading: 'nihongo',
            fa: 'زبان ژاپنی — پیش‌نمایش: 〜ご = زبان',
            whyFa: 'این الگو بعداً می‌آید؛ فعلاً فقط بشناس!',
          },
        ],
      },
      ex('blk-od1-drill', ['ex-fm01-od1-resp-1', 'ex-fm01-od1-prod-1']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-opt-review-desu',
    type: 'review',
    titleFa: 'مثال‌های محوشوندهٔ は+です (اختیاری)',
    objectiveFa: '۴ بافت تازه با جای‌خالی — الگو را خودت کامل کن',
    core: false,
    order: 20,
    prerequisites: ['stn-fm01-03-grammar-desu'],
    lineRefs: [L(3), L(8)],
    objectiveCode: 'identity-statement',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'viewed' },
    blocks: [
      {
        kind: 'example-set',
        id: 'blk-or1-faded',
        examples: [
          {
            id: 'or1-ex-1',
            role: 'faded',
            ja: 'ミキさんは ___です。',
            reading: 'miki-san wa … desu.',
            fa: 'میکی … است.',
            whyFa: 'با یک واژهٔ این فصل پر کن.',
            selfExplainFa: 'بلند بگو: مثلاً がくせい！',
          },
          {
            id: 'or1-ex-2',
            role: 'faded',
            ja: 'やまださんは ___です。',
            reading: 'yamada-san wa … desu.',
            fa: 'یامادا … است.',
            whyFa: 'شغل یا هویت — آزاد انتخاب کن.',
            selfExplainFa: 'مثلاً: てんちょう (مدیر کافه)؟ یا با آموخته‌ها: にほんじん！',
          },
          {
            id: 'or1-ex-3',
            role: 'faded',
            ja: 'アリさんは ___の せんせいです。',
            reading: 'ari-san wa … no sensee desu.',
            fa: 'علی استادِ … است.',
            whyFa: 'جای の را پر کن.',
            selfExplainFa: 'だいがく！',
          },
          {
            id: 'or1-ex-4',
            role: 'faded',
            ja: 'わたしは ___です。',
            reading: 'watashi wa … desu.',
            fa: 'من … هستم.',
            whyFa: 'جای توست — هویت خودت.',
            selfExplainFa: 'がくせい؟ エンジニア؟ انتخاب با تو.',
          },
        ],
      },
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-opt-jobs',
    type: 'deepdive',
    titleFa: 'شغل‌ها (اختیاری)',
    objectiveFa: '۸ واژهٔ شغل را بشناس تا شغل خودت را بگویی — فقط با انتخاب صریح تو کارت می‌شود',
    core: false,
    order: 21,
    prerequisites: ['stn-fm01-13-grammar-dewa'],
    lineRefs: [L(8)],
    objectiveCode: 'jobs-recognition',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'example-set',
        id: 'blk-od2-jobs',
        examples: [
          {
            id: 'od2-ex-1',
            role: 'varied',
            ja: 'がくせい',
            reading: 'gakusee',
            fa: 'دانشجو — واژهٔ نام‌گذارِ فصل!',
            whyFa: 'わたしは がくせいです = من دانشجوام.',
          },
          {
            id: 'od2-ex-2',
            role: 'varied',
            ja: 'エンジニア',
            reading: 'enjinia',
            fa: 'مهندس',
            whyFa: 'واژهٔ خارجی با کاتاکانا — از فصل کانا می‌شناسی‌اش!',
          },
          {
            id: 'od2-ex-3',
            role: 'varied',
            ja: 'いしゃ',
            reading: 'isha',
            fa: 'پزشک',
            whyFa: 'い (پزشکی) + しゃ (کار).',
          },
          {
            id: 'od2-ex-4',
            role: 'varied',
            ja: 'かいしゃいん',
            reading: 'kaishain',
            fa: 'کارمند شرکت',
            whyFa: 'かいしゃ (شرکت) + いん (عضو).',
          },
          {
            id: 'od2-ex-5',
            role: 'varied',
            ja: 'だいがくの せんせい',
            reading: 'daigaku no sensee',
            fa: 'استاد دانشگاه',
            whyFa: 'شغل علی — ترکیب با の.',
            lineRef: L(8),
          },
          {
            id: 'od2-ex-6',
            role: 'faded',
            ja: 'わたしは ___です。',
            reading: 'watashi wa … desu.',
            fa: 'من … هستم.',
            whyFa: 'شغل خودت را بگذار!',
            selfExplainFa: 'エンジニアです！ یا がくせいです！',
          },
        ],
      },
      ex('blk-od2-drill', ['ex-fm01-od2-resp-1', 'ex-fm01-od2-prod-1']),
    ],
    fsrsItems: [],
  },
  {
    slug: 'stn-fm01-opt-drill',
    type: 'review',
    titleFa: 'دریل تمایزی (اختیاری)',
    objectiveFa: 'جفت‌های مرگبار فصل را جدا کن: ですか/ですね · は/も · صداهای کشیده',
    core: false,
    order: 22,
    prerequisites: ['stn-fm01-17-practice'],
    lineRefs: [L(5), L(8), L(9)],
    objectiveCode: 'identity-question',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [ex('blk-or2-drill', ['ex-fm01-or2-mp-1', 'ex-fm01-or2-cloze-1', 'ex-fm01-or2-cloze-2'])],
    fsrsItems: [],
  },

  /* ════════════════════════ KANJI — the dedicated station (stn-fm01-23-kanji) ════════════════════════
   * AUDIO-UNIT/KANJI 2026-11-23 §۲ — the REAL kanji teaching station of chapter
   * 02, at exactly the kanji-pilot plan's position (P1-green: order 23, after
   * both anchor-word vocab stations 2 and 11 — every anchor word is taught
   * BEFORE this station; EQA-12 K3 enforces it).
   *
   * Deck design — the kanji-interaction-blueprint K-flow over the engine's own
   * block types: K0 scene encounter → kanji-card 人 (K1+K2 merged — pictographic,
   * per the blueprint's merge rule) → immediate retrieval (meaning + shape
   * discrimination) → reading-in-anchor-word (audio-meaning on the ANCHOR
   * WORD's standalone asset — D-0006 + the AUDIO-UNIT word-anchor binding) →
   * kanji-card 国 (K1+K2: the 囗+玉 decomposition) → retrieval + word-vessel
   * scanning → writing-practice 人/国 (K5 — KanjiVG stroke data committed in
   * writing-data; guided order observation → trace → free) → sound→form exit →
   * wrap-up. Readings ride INSIDE the anchor words (no on/kun list display —
   * the reference stays the reference); the kanji enter the Memory Station as
   * kj-rec/kj-wri cards through this station's completion (all-type FSRS). */
  {
    slug: 'stn-fm01-23-kanji',
    type: 'kanji',
    titleFa: 'کانجی‌های 人 و 国 — شکل نوشتاری ملیت‌ها',
    objectiveFa:
      'دو کانجیِ نهفته در واژه‌های ملیتی که یاد گرفتی (日本人، 中国人، イラン人، 韓国人) را بشناس: شکل، معنا، اجزا، خوانش درون واژه و ترتیب نوشتن',
    core: true,
    order: 23,
    prerequisites: ['stn-fm01-02-vocab', 'stn-fm01-11-vocab2'],
    lineRefs: [L(3), L(5), L(8), L(10)],
    objectiveCode: 'OBJ-FM01-KANJI-JIN-KUNI',
    teachesConcepts: ['kanji-jin-in-nationalities', 'kanji-kuni-in-countries'],
    estMinutes: 7,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    mastery: { threshold: 0.6 },
    blocks: [
      {
        kind: 'scene',
        id: 'sc-kanji-intro',
        titleFa: 'دو کانجی که تا حالا دیده‌ای',
        bodyFa:
          'چهار واژهٔ ملیت این فصل — 日本人 (にほんじん)، 中国人 (ちゅうごくじん)، イラン人 (イランじん) و 韓国人 (かんこくじん) — همه از دو کانجی مشترک ساخته شده‌اند: 人 (انسان) و 国 (کشور). تا حالا صدایشان را شنیدی و معنی‌شان را یاد گرفتی؛ حالا خودِ شکل‌ها را جدا می‌کنیم.',
      },
      {
        kind: 'kanji-card',
        id: 'kcard-jin',
        kanjiId: 'kj-4eba',
        anchorWordIds: ['voc-nihonjin', 'voc-chuugokujin', 'voc-iranjin', 'voc-kankokujin'],
        noteFa:
          '人 یعنی «انسان/شخص». کانجی تصویری است: دو ضربه که از بالا شروع می‌شوند و به پایین باز می‌شوند — مثل دو پای آدمی که راه می‌رود (K1+K2 ادغام‌شده: کانجی ساده، جزء مستقل ندارد). این کانجی آخرِ همهٔ ملیت‌های این فصل می‌نشیند و «بودنِ آدمِ آن سرزمین» را می‌سازد: 日本人 = ژاپنی، 中国人 = چینی، イラン人 = ایرانی، 韓国人 = کره‌ای. با 入 (ورود) قاطی‌اش نکن — ضربه‌های 入 پایین‌تر همدیگر را قطع می‌کنند؛ دو پای 人 هیچ‌وقت همدیگر را قطع نمی‌کنند.',
      },
      ex('blk-ex-kanji-jin-shape', ['ex-fm01-kj-jin-shape']),
      ex('blk-ex-kanji-jin-reading', ['ex-fm01-kj-jin-reading']),
      {
        kind: 'kanji-card',
        id: 'kcard-kuni',
        kanjiId: 'kj-56fd',
        anchorWordIds: ['voc-chuugokujin', 'voc-kankokujin'],
        noteFa:
          '国 یعنی «کشور». کانجی ترکیبی است: یک قاب چهارگوش (囗 — مرز یک سرزمین) و داخلش 玉 (گنج/گوهر): «سرزمینی که چیزهای گران‌بها دارد». 中国 (ちゅうごく) یعنی چین — «سرزمین میانه» — و 韓国 (かんこく) یعنی کره؛ 国 در هر دو «کشور» را می‌سازد. در واژه‌های این فصل با خوانش «کُوک» می‌آید: ちゅうごく、かんこく.',
      },
      ex('blk-ex-kanji-kuni-cloze', ['ex-fm01-kj-kuni-cloze']),
      {
        /* KANJI-WRITE-FIX 2026-11-23 §۱ (owner order «هر کانجی اسلاید مخصوص خودش
         * را دارد، از موتور»): the authored deck may list its kanji together —
         * the transport ENGINE splits it into ONE SLIDE PER KANJI
         * (`wp-kanji-jin-kuni@人` / `wp-kanji-jin-kuni@国`), each with its own
         * staged writing timeline (auto intro pass → confirm → guided trace →
         * free from memory → auto-advance). The instructions stay generic so
         * they read correctly on EVERY per-kanji slide. */
        kind: 'writing-practice',
        id: 'wp-kanji-jin-kuni',
        characters: ['人', '国'],
        initialMode: 'guided',
        instructionsFa:
          'اول تماشا کن: ترتیب ضربه‌های این کانجی خودش در بوم نوشته می‌شود و شکلِ نهایی‌اش همان‌جا می‌ماند. بعد با دکمهٔ «شروع تمرین نوشتن» وارد تمرین شو — یک بار با راهنمای خط‌چین بکش و در پایان از حافظه بنویس.',
      },
      ex('blk-ex-kanji-kuni-reading', ['ex-fm01-kj-kuni-reading']),
      ex('blk-ex-kanji-exit', ['ex-fm01-kj-exit']),
      {
        kind: 'wrap-up',
        id: 'wrapup-kanji',
        titleFa: 'جمع‌بندی ایستگاه کانجی',
        itemsFa: [
          '人 = انسان/شخص — دو ضربهٔ جدا از بالا؛ آخرِ هر ملیت (日本人، 中国人、イラン人، 韓国人) با خوانش «جین»',
          '国 = کشور — قاب مرز + گوهر داخل؛ 中国 چین و 韓国 کره با خوانش «کُوک»',
          'هر دو کانجی حالا وارد مرور روزانهٔ حافظه‌ات می‌شوند — هم به شکلِ تشخیص (دیدن و یادآوری) هم به شکل نوشتن (kj-rec / kj-wri).',
        ],
      },
    ],
    fsrsItems: ['kj-rec-kj-4eba', 'kj-wri-kj-4eba', 'kj-rec-kj-56fd', 'kj-wri-kj-56fd'],
  },
];
