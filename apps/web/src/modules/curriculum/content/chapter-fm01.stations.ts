/**
 * HANASO — Chapter 1 stations & teaching blocks (TASK-LEARNING-01) — ORIGINAL content.
 *
 * The 10 core + 2 optional island stations per CHAPTER_CONTENT_BLUEPRINT §۴..§۵
 * (validated KB blueprint 13-09 §۳..§۵ — no numeric redesign). Order/prerequisites
 * are DATA here; the journey resolver only walks them (O1..O5).
 */
import type { Station } from '../types';

const L = (n: number) => `s-first-meeting-01-l${n}`;

export const FM01_STATIONS: Station[] = [
  /* ---------------------------------------- 1. ANCHOR (stage A) — 2' */
  {
    slug: 'stn-fm01-01-anchor',
    type: 'anchor',
    titleFa: 'مکالمهٔ اولین دیدار',
    objectiveFa: 'با صحنه و صدای مکالمه آشنا شو — فعلاً لازم نیست همه‌چیز را بفهمی.',
    core: true,
    order: 1,
    prerequisites: [],
    lineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9)],
    objectiveCode: 'greet-first-meeting',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'viewed' },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-an-1',
        titleFa: 'صحنه: کافهٔ نزدیک دانشگاه',
        bodyFa:
          'بعدازظهر در توکیو. میکی، مشتری ثابت کافه، دوستش سورا را برای اولین بار به این کافه می‌آورد. یامادا، صاحب ژاپنی کافه، پشت پیشخان است. کنار پنجره هم مشتری تازه‌ای نشسته: آقای علی — استاد ایرانی دانشگاه — که کتاب ژاپنی می‌خواند. به مکالمه گوش کن: خودت ببین چه چیزهایی را می‌فهمی و چه چیزهایی را نه.',
      },
      {
        kind: 'dialogue-player',
        id: 'b-fm01-an-2',
        focusLineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9)],
        prediction: {
          questionFa: 'قبل از شنیدن، حدس بزن: یامادا در این گفت‌وگو خودش را چطور معرفی می‌کند؟',
          options: [
            { id: 'a', label: 'فقط می‌گوید سلام و خداحافظ' },
            { id: 'b', label: 'اسم و ملیتش را می‌گوید' },
            { id: 'c', label: 'دربارهٔ هوا حرف می‌زند' },
          ],
          correctOptionId: 'b',
          revealFa: 'درست! یامادا می‌گوید: はじめまして、やまだです。わたしは にほんじんです — هم اسم، هم ملیت.',
        },
      },
      {
        kind: 'wrap-up',
        id: 'b-fm01-an-3',
        titleFa: 'دیدی؟',
        itemsFa: [
          'برخی جمله‌ها را شاید کامل نفهمیدی — طبیعی است؛ این «شکاف دانستن» است.',
          'حالا مسیر یادگیری را می‌روی تا در پایان، همین مکالمه را کامل بفهمی.',
        ],
        fsrsNoteFa: undefined,
      },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- 2. VOCAB-1 — 8 core words — 2.5' */
  {
    slug: 'stn-fm01-02-vocab',
    type: 'vocab',
    titleFa: 'واژه‌های هویت',
    objectiveFa: 'هشت واژهٔ کلیدی مکالمه را با صدا و بافت بشناس.',
    core: true,
    order: 2,
    prerequisites: ['stn-fm01-01-anchor'],
    lineRefs: [L(1), L(3), L(5), L(7), L(8)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 0.75 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-vo-0',
        titleFa: 'صدا-اول',
        bodyFa:
          'در هر کارت اول صدا را گوش کن (خطی که واژه در آن است)، بعد معنی و بافتش را ببین. فعلاً فقط «تشخیص» کافی است — تولید بعداً.',
      },
      { kind: 'vocab-card', id: 'b-fm01-vo-1', wordId: 'voc-watashi' },
      { kind: 'vocab-card', id: 'b-fm01-vo-2', wordId: 'voc-san' },
      { kind: 'vocab-card', id: 'b-fm01-vo-3', wordId: 'voc-nihonjin' },
      { kind: 'vocab-card', id: 'b-fm01-vo-4', wordId: 'voc-chuugokujin' },
      { kind: 'vocab-card', id: 'b-fm01-vo-5', wordId: 'voc-daigaku' },
      { kind: 'vocab-card', id: 'b-fm01-vo-6', wordId: 'voc-sensee' },
      { kind: 'vocab-card', id: 'b-fm01-vo-7', wordId: 'voc-anokata' },
      { kind: 'vocab-card', id: 'b-fm01-vo-8', wordId: 'voc-iranjin' },
      {
        kind: 'exercise',
        id: 'b-fm01-vo-9',
        exerciseIds: ['ex-fm01-v1-01', 'ex-fm01-v1-02', 'ex-fm01-v1-03', 'ex-fm01-v1-04'],
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
    mastery: { threshold: 0.75 },
  },

  /* ---------------------------------------- 3. GRAMMAR-1 — AはBです — 3' */
  {
    slug: 'stn-fm01-03-grammar-desu',
    type: 'grammar',
    titleFa: 'الگوی هویت: AはBです',
    objectiveFa: 'جملهٔ «X هستِ Y» را بفهم و بساز — مهم‌ترین الگوی ژاپنی.',
    core: true,
    order: 3,
    prerequisites: ['stn-fm01-02-vocab'],
    lineRefs: [L(3), L(6), L(8)],
    objectiveCode: 'identity-statement',
    estMinutes: 3,
    estLoad: 'medium',
    completion: { kind: 'exercise_threshold', threshold: 0.67 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-g1-0',
        titleFa: 'کشف کن',
        bodyFa: 'اول به خط مکالمه نگاه کن و از خودت بپرس: ذرهٔ は دقیقاً کجای جمله است؟',
      },
      {
        kind: 'guided-discovery',
        id: 'b-fm01-g1-1',
        displayLineRef: L(6),
        highlightSurfaces: ['は', 'です'],
        compareLineRef: L(3),
        questionFa: 'ذرهٔ は همیشه بلافاصله بعد از چه چیزی می‌آید؟',
        options: [
          { id: 'a', label: 'بعد از فعل/هویت‌ساز پایانیِ جمله' },
          { id: 'b', label: 'بعد از چیزی که درباره‌اش حرف می‌زنیم (موضوع)' },
        ],
        correctOptionId: 'b',
        explainFa:
          'در L3 (わたしは にほんじんです) و L6 (わたしは ちゅうごくじんです)،は بلافاصله بعد از «من» می‌آید — یعنی بعد از موضوعِ جمله — و آن را علامت می‌زند؛ بعد از は گزاره/هویت‌ساز می‌آید. (در L8 موضوع حذف شده است — アリさんは نگفته نشد.)',
      },
      {
        kind: 'rule-card',
        id: 'b-fm01-g1-2',
        patternJa: '[موضوع]は [هویت] です',
        titleFa: 'گزارهٔ هویت — «X هست Y»',
        bodyFa:
          'は موضوع جمله را نشانه‌گذاری می‌کند (وقتی ذره است «wa» تلفظ می‌شود، نه «ha»). です درست مثل فعلِ «بودن» فارسی، جمله را مؤدبانه می‌بندد. با این یک الگو می‌توانی بگویی کی هستی، چه ملیتی داری و چه شغلی.',
        structureTable: {
          headers: ['موضوع', 'هویت', 'پایان'],
          rows: [
            ['わたし (من)', 'にほんじん (ژاپنی)', 'です'],
            ['ソラさん (سورا)', 'ちゅうごくじん (چینی)', 'です'],
            ['アリさん (علی)', 'だいがくの せんせい (استاد دانشگاه)', 'です'],
          ],
        },
        persianBridgeFa:
          'فعل/هویت‌ساز در فارسی هم آخر جمله می‌آید: «من ایرانی هستم» ← わたしは イランじんです — ترتیب برای تو غریبه نیست.',
        honestyLabelFa: 'مزیت فارسی‌زبانان در ترتیبِ مشابه، پیش‌بینی ماست — هنوز با آزمایش تأیید نشده.',
      },
      {
        kind: 'example-set',
        id: 'b-fm01-g1-3',
        examples: [
          {
            id: 'ex-g1-anchor',
            role: 'anchor',
            ja: 'わたしは ちゅうごくじんです。',
            reading: 'わたしは ちゅうごくじんです。',
            fa: 'من چینی‌ام.',
            whyFa: 'لنگر از خود مکالمه — بخش دوم L6.',
            lineRef: L(6),
          },
          {
            id: 'ex-g1-near',
            role: 'near',
            ja: 'ソラさんは ちゅうごくじんです。',
            reading: 'ソラさんは ちゅうごくじんです。',
            fa: 'سورا چینی است.',
            whyFa: 'فقط موضوع عوض شد — هم‌قاب (بر پایهٔ L5/L6).',
            selfExplainFa: 'چرا فقط موضوع عوض شد و بقیهٔ جمله همان ماند؟',
          },
          {
            id: 'ex-g1-varied',
            role: 'varied',
            ja: 'アリさんは だいがくの せんせいです。',
            reading: 'アリさんは だいがくの せんせいです。',
            fa: 'آقای علی استاد دانشگاه است.',
            whyFa: 'هویتِ دو-تکه‌ای با の — بر پایهٔ L8، این بار با موضوعِ صریح (アリさんは).',
          },
        ],
      },
      {
        kind: 'structured-input',
        id: 'b-fm01-g1-4',
        questionFa: 'در L8، شغلِ علی چه بود؟',
        lineRef: L(8),
        options: [
          { id: 'a', label: 'استاد دانشگاه' },
          { id: 'b', label: 'صاحب کافه' },
          { id: 'c', label: 'دانشجو' },
        ],
        correctOptionId: 'a',
        explainFa: 'だいがくの せんせい = استادِ دانشگاه — جملهٔ سومِ L8.',
      },
      {
        kind: 'exercise',
        id: 'b-fm01-g1-5',
        exerciseIds: ['ex-fm01-g1-01', 'ex-fm01-g1-02', 'ex-fm01-g1-03'],
      },
    ],
    fsrsItems: ['gr-fm01-desu-identity', 'line-fm01-l6'],
    mastery: { threshold: 1 },
  },

  /* ---------------------------------------- 4. STRUCTURE — SOV bridge — 1.5' */
  {
    slug: 'stn-fm01-04-structure',
    type: 'structure',
    titleFa: 'پل فارسی: ترتیب و حذف',
    objectiveFa: 'ببین ترتیب ژاپنی به فارسی چقدر نزدیک است و چه چیزهایی حذف می‌شود.',
    core: true,
    order: 4,
    prerequisites: ['stn-fm01-03-grammar-desu'],
    lineRefs: [L(3), L(4)],
    objectiveCode: 'sov-bridge-persian',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 1 },
    blocks: [
      {
        kind: 'rule-card',
        id: 'b-fm01-st-1',
        patternJa: 'わたしは | にほんじん | です',
        titleFa: 'ترتیبِ اجزای جمله — مقایسه با فارسی',
        bodyFa:
          'هر دو زبان فعل/هویت‌ساز را آخر می‌گذارند و موضوع را اول. تفاوت: ژاپنی موضوع را با ذرهٔ は علامت می‌زند؛ فارسی بی‌علامت است.',
        structureTable: {
          headers: ['فارسی', 'ژاپنی'],
          rows: [
            ['من | ژاپنی | هستم', 'わたしは | にほんじん | です'],
            ['سورا | چینی | است', 'ソラさんは | ちゅうごくじん | です'],
          ],
        },
        persianBridgeFa:
          'L3↔L4: یامادا گفت わたしは にほんじんです؛ سورا بلافاصله فقط گفت ソラです — بدون わたしは. چرا؟ چون معلوم بود دربارهٔ خودش حرف می‌زند؛ درست مثل فارسی که «من» را هر بار تکرار نمی‌کنیم.',
        honestyLabelFa: 'نزدیکی ترتیبِ دو زبان، مشاهدهٔ تیپولوژیک است — پیش‌بینی ما، نه ادعای اثبات‌شده.',
      },
      { kind: 'exercise', id: 'b-fm01-st-2', exerciseIds: ['ex-fm01-st-01'] },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- 5. GRAMMAR-2 — ですか/ですね — 3' */
  {
    slug: 'stn-fm01-05-grammar-qa',
    type: 'grammar',
    titleFa: 'پرسش و تأیید: ですか / ですね',
    objectiveFa: 'از گزارهٔ هویت، پرسش بساز و تأیید را بشناس.',
    core: true,
    order: 5,
    prerequisites: ['stn-fm01-04-structure'],
    lineRefs: [L(5), L(6), L(7)],
    objectiveCode: 'identity-question',
    estMinutes: 3,
    estLoad: 'medium',
    completion: { kind: 'exercise_threshold', threshold: 0.75 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-g2-0',
        titleFa: 'دو خواهرِ です',
        bodyFa: 'در L5 هر دو شکل روی یک خط آمده‌اند — تمایزشان خودِ هدفِ این ایستگاه است.',
      },
      {
        kind: 'guided-discovery',
        id: 'b-fm01-g2-1',
        displayLineRef: L(5),
        highlightSurfaces: ['ね', 'か'],
        questionFa: 'در این خط، کدام بخش «پرسش» است و کدام «تأیید»؟',
        options: [
          { id: 'a', label: 'ね = پرسش · か = تأیید' },
          { id: 'b', label: 'か = پرسش · ね = تأیید' },
        ],
        correctOptionId: 'b',
        explainFa:
          'ソラさんですね = «پس سورا هستید» (تأییدِ چیزی که شنیده/دیده). ちゅうごくじんですか = «چینی هستید؟» (پرسشِ واقعی).',
      },
      {
        kind: 'rule-card',
        id: 'b-fm01-g2-2',
        patternJa: 'です + か / ね',
        titleFa: 'سه شکل یک جمله',
        bodyFa:
          'です جمله را خبری می‌بندد. با か پرسش می‌شود (آهنگ پایانی بالا می‌رود) و با ね تبدیل به تأیید می‌شود («پس اینطور است؟» — آهنگ پایانی پایین می‌آید).',
        structureTable: {
          headers: ['شکل', 'مثال', 'کارکرد'],
          rows: [
            ['です', 'わたしは ちゅうごくじんです。', 'خبری — اطلاع‌رسانی'],
            ['ですか', 'ちゅうごくじんですか。', 'پرسش — آهنگ بالا'],
            ['ですね', 'ソラさんですね。', 'تأیید — آهنگ پایین'],
          ],
        },
      },
      {
        kind: 'example-set',
        id: 'b-fm01-g2-3',
        examples: [
          {
            id: 'ex-g2-anchor',
            role: 'anchor',
            ja: 'ソラさんですね。ちゅうごくじんですか。',
            reading: 'ソラさんですね。ちゅうごくじんですか。',
            fa: 'پس سورا هستید. چینی هستید؟',
            whyFa: 'لنگر از L5 — هر دو شکل در یک خط.',
            lineRef: L(5),
          },
          {
            id: 'ex-g2-near',
            role: 'near',
            ja: 'せんせいですか。',
            reading: 'せんせいですか。',
            fa: 'استاد هستید؟',
            whyFa: 'پرسشِ کوتاه — فقط か به جملهٔ خبری اضافه شد.',
          },
          {
            id: 'ex-g2-varied',
            role: 'varied',
            ja: 'アリさんは にほんじんですか。',
            reading: 'アリさんは にほんじんですか。',
            fa: 'آقای علی ژاپنی است؟',
            whyFa: 'پرسشِ کامل دربارهٔ شخص سوم — موضوع + は + هویت + ですか.',
          },
        ],
      },
      {
        kind: 'structured-input',
        id: 'b-fm01-g2-4',
        questionFa: 'کدام خط پرسش است؟',
        lineRef: L(5),
        options: [
          { id: 'a', label: 'L5 — ちゅうごくじんですか' },
          { id: 'b', label: 'L6 — はい、わたしは ちゅうごくじんです' },
        ],
        correctOptionId: 'a',
        explainFa: 'L5 با ですか تمام می‌شود (پرسش)؛ L6 با です (جوابِ خبری).',
      },
      {
        kind: 'exercise',
        id: 'b-fm01-g2-5',
        exerciseIds: ['ex-fm01-g2-01', 'ex-fm01-g2-02', 'ex-fm01-g2-03', 'ex-fm01-g2-04'],
      },
    ],
    fsrsItems: ['gr-fm01-desu-qa', 'line-fm01-l5'],
    mastery: { threshold: 1 },
  },

  /* ---------------------------------------- 6. EXPRESSION — 2.5' */
  {
    slug: 'stn-fm01-06-expression',
    type: 'expression',
    titleFa: 'عبارت‌های اولین دیدار',
    objectiveFa: 'چهار فرمول آشنایی را در جای درستِ آیین معرفی به‌کار ببر.',
    core: true,
    order: 6,
    prerequisites: ['stn-fm01-05-grammar-qa'],
    lineRefs: [L(1), L(3), L(4), L(7), L(9)],
    objectiveCode: 'greet-first-meeting',
    estMinutes: 3,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 1 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-e-0',
        titleFa: 'فرمول‌ها، نه جمله‌ها',
        bodyFa:
          'این عبارت‌ها مثل «قربون شما»ی ما فرمول‌اند — ترجمهٔ تحت‌اللفظی ندارند؛ جایگاهشان را در آیین معرفی یاد بگیر.',
      },
      { kind: 'expression-card', id: 'b-fm01-e-1', expressionId: 'chrk-konnichiwa' },
      { kind: 'expression-card', id: 'b-fm01-e-2', expressionId: 'chrk-hajimemashite' },
      { kind: 'expression-card', id: 'b-fm01-e-3', expressionId: 'chrk-yoroshiku' },
      { kind: 'expression-card', id: 'b-fm01-e-4', expressionId: 'chrk-anokata-donata' },
      { kind: 'exercise', id: 'b-fm01-e-5', exerciseIds: ['ex-fm01-e-01', 'ex-fm01-e-02', 'ex-fm01-e-03'] },
    ],
    fsrsItems: ['chrk-fm01-konnichiwa', 'chrk-fm01-hajimemashite', 'chrk-fm01-yoroshiku', 'chrk-fm01-anokata-donata'],
    mastery: { threshold: 1 },
  },

  /* ---------------------------------------- 7. LISTEN — 2' */
  {
    slug: 'stn-fm01-07-listen',
    type: 'listen',
    titleFa: 'گوشِ اول: کشش و آهنگ',
    objectiveFa: 'طول واکه و آهنگ پایانی را در صدای واقعی مکالمه تشخیص بده.',
    core: true,
    order: 7,
    prerequisites: ['stn-fm01-06-expression'],
    lineRefs: [L(3), L(5), L(6), L(7), L(8)],
    objectiveCode: 'listen-vowel-length',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 0.6 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-li-0',
        titleFa: 'سه‌شنونده',
        bodyFa:
          'اول بدون متن گوش کن (درکل دربارهٔ چیست؟)؛ بعد جزئیات (چه کسی گفت؟)؛ آخر زبان‌محور (کشش واکه و آهنگ پایانی). نکتهٔ فارسی‌ویژه: در فارسی کششِ صدا «حسی» است؛ در ژاپنی «کلمه‌ای» — せんせ(✗) کلمهٔ دیگری است!',
      },
      {
        kind: 'listening-task',
        id: 'b-fm01-li-1',
        taskId: 'fm01-three-listener',
      },
      {
        kind: 'exercise',
        id: 'b-fm01-li-2',
        exerciseIds: ['ex-fm01-l-01', 'ex-fm01-l-02', 'ex-fm01-l-03', 'ex-fm01-l-04', 'ex-fm01-l-05'],
      },
    ],
    fsrsItems: ['s-fm01-sensee', 's-fm01-chuugokujin'],
  },

  /* ---------------------------------------- 8. PRACTICE — C1..C4 — 3' */
  {
    slug: 'stn-fm01-08-practice',
    type: 'practice',
    titleFa: 'جلسهٔ تمرین',
    objectiveFa: 'همهٔ آموخته‌ها را بازیابی‌محور و درهم‌آمیخته تمرین کن.',
    core: true,
    order: 8,
    prerequisites: ['stn-fm01-07-listen'],
    lineRefs: [L(1), L(3), L(5), L(6), L(8)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 3,
    estLoad: 'medium',
    completion: { kind: 'exercise_threshold', threshold: 0.7 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-pr-0',
        titleFa: 'گرم → هسته → درهم‌آمیزی',
        bodyFa:
          'اول دو قلمِ آشنا (گرم‌کردن)، بعد پنج قلمِ جدید (هسته)، بعد دو قلم ترکیبی — ترتیبِ انواع عمداً درهم است.',
      },
      {
        kind: 'exercise',
        id: 'b-fm01-pr-1',
        exerciseIds: [
          'ex-fm01-p-01',
          'ex-fm01-p-02',
          'ex-fm01-p-03',
          'ex-fm01-p-04',
          'ex-fm01-p-05',
          'ex-fm01-p-06',
          'ex-fm01-p-07',
          'ex-fm01-p-08',
          'ex-fm01-p-09',
        ],
      },
      {
        kind: 'wrap-up',
        id: 'b-fm01-pr-2',
        titleFa: 'امروز سه چیز یاد گرفتی',
        itemsFa: [
          'هویت بگو: わたしは イランじんです',
          'بپرس و تأیید کن: ですか / ですね',
          'آیین معرفی را کامل اجرا کن: こんにちは → はじめまして → よろしく',
        ],
        fsrsNoteFa: 'کارت‌های این فصل (۲۴ کارت) ثبت می‌شوند و با فعال‌شدن موتور مرور، در صف روزانه می‌آیند.',
      },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- 9. INTEGRATE — 2.5' */
  {
    slug: 'stn-fm01-09-integrate',
    type: 'integrate',
    titleFa: 'خودت را معرفی کن',
    objectiveFa: 'وظیفهٔ واقعی: با میکی آشنا شو و خودت را معرفی کن.',
    core: true,
    order: 9,
    prerequisites: ['stn-fm01-08-practice'],
    lineRefs: [],
    objectiveCode: 'self-intro-production',
    estMinutes: 3,
    estLoad: 'medium',
    completion: { kind: 'task_completed' },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-in-0',
        titleFa: 'صحنهٔ جدید',
        bodyFa:
          'میکی به تازگی وارد کافه شده و تو را — مهمانِ تازه‌وارد — می‌بیند. نوبت توست: از همان چیزی که امروز یاد گرفتی استفاده کن.',
      },
      {
        kind: 'character-scene',
        id: 'b-fm01-in-1',
        steps: [
          {
            speaker: 'chr-miki',
            ja: 'こんにちは。はじめまして、ミキです。よろしく おねがいします。',
            reading: 'こんにちは。はじめまして、ミキです。よろしく おねがいします。',
            fa: 'سلام! از آشنایی‌تان خوشبختم، میکی هستم. یوروشیکو اونِگای‌شیماس.',
          },
          {
            speaker: 'user',
            ja: 'はじめまして、___です。よろしく おねがいします。',
            reading: 'はじめまして、[نام تو]です。よろしく おねがいします。',
            fa: 'از آشنایی‌تان خوشبختم، [نام تو] هستم. یوروشیکو اونِگای‌شیماس.',
            userReply: {
              kind: 'template-build',
              promptFa: 'جواب بده — اسمت را بنویس و جمله را کامل کن.',
              chips: [
                { id: 'c1', ja: 'はじめまして、' },
                { id: 'c2', ja: '___NAME___' },
                { id: 'c3', ja: 'です。' },
                { id: 'c4', ja: 'よろしく おねがいします。' },
              ],
              acceptedOrders: [['c1', 'c2', 'c3', 'c4']],
              nameSlotChipId: 'c2',
            },
          },
          {
            speaker: 'chr-miki',
            ja: '___NAME___さんは イランじんですか。',
            reading: '[نام تو]さんは イランじんですか。',
            fa: 'ایرانی هستید؟',
          },
          {
            speaker: 'user',
            ja: 'はい、わたしは イランじんです。',
            reading: 'はい、わたしは イランじんです。',
            fa: 'بله، من ایرانی‌ام.',
            userReply: {
              kind: 'choice',
              promptFa: 'جواب درست را انتخاب کن.',
              options: [
                { id: 'a', label: 'はい、わたしは イランじんです。' },
                { id: 'b', label: 'はじめまして、ミキです。' },
                { id: 'c', label: 'だいがくの せんせいです。' },
              ],
              correctOptionId: 'a',
            },
          },
          {
            speaker: 'chr-miki',
            ja: 'よろしく おねがいします。',
            reading: 'よろしく おねがいします。',
            fa: 'از رابطه‌مان خوشحال می‌شوم. (آینهٔ L9)',
          },
        ],
      },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- 10. MASTERY (stage D gate) — 3' */
  {
    slug: 'stn-fm01-10-mastery',
    type: 'mastery',
    titleFa: 'دروازهٔ فهم مکالمه',
    objectiveFa: 'برگرد به همان مکالمهٔ اول و ثابت کن کاملش را می‌فهمی.',
    core: true,
    order: 10,
    prerequisites: ['stn-fm01-09-integrate'],
    lineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9)],
    objectiveCode: 'identity-statement',
    estMinutes: 3,
    estLoad: 'heavy',
    completion: { kind: 'viewed' },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-ma-0',
        titleFa: 'حمایت کمتر',
        bodyFa: 'مکالمه را دوباره بشنو — این بار زیرنویس فقط با لمس هر خط باز می‌شود. بعد آزمون فهم از پنج سنجه.',
      },
      {
        kind: 'dialogue-player',
        id: 'b-fm01-ma-1',
        focusLineRefs: [L(1), L(2), L(3), L(4), L(5), L(6), L(7), L(8), L(9)],
        reducedSupport: true,
      },
      {
        kind: 'wrap-up',
        id: 'b-fm01-ma-2',
        titleFa: 'آمادهٔ آزمون فهم؟',
        itemsFa: [
          'مکالمه را یک بار دیگر بشنو — زیرنویس فقط با لمس هر خط.',
          'سپس در صفحهٔ دروازه، به ده پرسش فهم پاسخ بده.',
        ],
      },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- optional: OPT-REVIEW (off GRAMMAR-1) */
  {
    slug: 'stn-fm01-o1-review',
    type: 'review',
    titleFa: 'مرور: مثال‌های محوشوندهٔ です',
    objectiveFa: 'چهار مثال بیشتر با جای‌خالی — برای تثبیت الگوی هویت.',
    core: false,
    order: 11,
    prerequisites: ['stn-fm01-03-grammar-desu'],
    lineRefs: [L(3), L(8)],
    objectiveCode: 'identity-statement',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 0.5 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-re-0',
        titleFa: 'اختیاری',
        bodyFa: 'این ایستگاه اختیاری است — مسیر اصلی بدون آن هم باز می‌ماند.',
      },
      { kind: 'exercise', id: 'b-fm01-re-1', exerciseIds: ['ex-fm01-r-01', 'ex-fm01-r-02'] },
    ],
    fsrsItems: [],
  },

  /* ---------------------------------------- optional: OPT-DEEPDIVE (off VOCAB-1) */
  {
    slug: 'stn-fm01-o2-deepdive',
    type: 'deepdive',
    titleFa: 'عمیق‌تر: کشور، ملیت، زبان',
    objectiveFa: 'جدول 〜じん / 〜ご را ببین (〜ご فقط پیش‌نمایش است).',
    core: false,
    order: 12,
    prerequisites: ['stn-fm01-02-vocab'],
    lineRefs: [L(3), L(8)],
    objectiveCode: 'identity-vocab-core',
    estMinutes: 2,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 0.5 },
    blocks: [
      {
        kind: 'scene',
        id: 'b-fm01-de-0',
        titleFa: 'اختیاری',
        bodyFa:
          'جدول کشور/ملیت/زبان — الگوی پسوندها. 〜じん را همین‌جا تثبیت کن؛ 〜ご فقط بشناس (فصل بعد کامل می‌آید).',
      },
      {
        kind: 'rule-card',
        id: 'b-fm01-de-1',
        patternJa: '〜じん / 〜ご',
        titleFa: 'کشور + پسوند',
        bodyFa:
          'به نامِ کشور، پسوند می‌چسبد: じん = اهلِ آن کشور · ご = زبانِ آن کشور. فعلاً فقط 〜じین را کامل یاد بگیر — 〜ご در فصل بعد آموزش داده می‌شود.',
        structureTable: {
          headers: ['کشور', 'اهل (〜じん)', 'زبان (〜ご)'],
          rows: [
            ['にほん (ژاپن)', 'にほんじん (ژاپنی)', 'にほんご (ژاپنی)'],
            ['ちゅうごく (چین)', 'ちゅうごくじん (چینی)', 'ちゅうごくご (چینی)'],
            ['イラン (ایران)', 'イランじん (ایرانی)', 'ペルシアご (فارسی)'],
            ['かんこく (کره)', 'かんこくじん (کره‌ای)', 'かんこくご (کره‌ای)'],
          ],
        },
      },
      { kind: 'exercise', id: 'b-fm01-de-2', exerciseIds: ['ex-fm01-d-01', 'ex-fm01-d-02'] },
    ],
    fsrsItems: [],
  },
];
