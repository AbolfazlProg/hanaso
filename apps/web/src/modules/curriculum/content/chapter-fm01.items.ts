/**
 * HANASO — Chapter 1 content items (TASK-LEARNING-01/02 → TASK-LEARNING-06 05B rebuild).
 *
 * PROVENANCE (TASK-LEARNING-02 — per owner's notes «HANASO-OWNER-EDUCATIONAL-NOTES-COMPLETE.fa.md»):
 * Word SELECTION traces to the owner's notes Lesson 1 vocabulary list (40 items):
 *   #1 わたし · #3 〜さん · #4+#30 にほん+じん · #5+#30 ちゅうごく+じん · #10 大学 · #13 先生 · #16 あの方
 *   (+ イランじん — HANASO personalization, NOT in the notes — dialogue L8/INTEGRATE).
 * Kanji/reading forms match the notes' list exactly (kanji + kana reading per card);
 * L2 shows kanji as RECOGNITION ONLY (island kanji: Int — no independent kanji station).
 * Romaji standard: double-vowel (sensee, chuugoku) — notes' notation rules + 13-09 §۴-۲.
 *
 * TASK-LEARNING-06 (05B — KB section 19, DD-123..126): the chapter is now the two-unit
 * «اولین مکالمه» rebuild — unit 02-1 «最初のあいさつ» (turns L1..L8) + unit 02-2
 * «キムさんの紹介» (turns L9..L14: Kim enters — も / ではありません / かんこくじん /
 * から きました / reactions). Word count 11 = the 05B-registered two-unit exception
 * (L2 cap raised to 11 in levels.ts with provenance); VOCAB-2 = かんこくじん・から・きました.
 * wordAudio ids = the DD-119 independent-audio contract (assets pending the audio task —
 * the UI falls back to the source-line audio honestly until files land).
 */
import type { ExpressionItem, GrammarCluster, VocabItem } from '../types';

const L = (n: number) => `s-first-meeting-01-l${n}`;

export const FM01_WORDS: VocabItem[] = [
  {
    id: 'voc-watashi',
    term: '私',
    termFurigana: '私[わたし]',
    readingKana: 'わたし',
    romaji: 'watashi',
    meaningFa: 'من',
    noteFa: 'در ژاپنی معمولاً حذفش می‌کنند وقتی معلوم است — نوبت ۴ سورا را ببین.',
    lineRef: L(3),
    fsrs: { w: 'w-fm01-watashi', s: 's-fm01-watashi' },
    surfaceInLine: 'わたし',
    wordAudio: 'wa-fm01-watashi',
  },
  {
    id: 'voc-san',
    term: '〜さん',
    readingKana: '〜さん',
    romaji: 'san',
    meaningFa: 'پسوند احترام پس از نام (مثل «آقای/خانمِ»)',
    noteFa: 'هرگز دربارهٔ خودت استفاده نکن — فقط برای طرف مقابل یا شخص سوم.',
    lineRef: L(1),
    fsrs: { w: 'w-fm01-san', s: 's-fm01-san' },
    surfaceInLine: 'やまださん',
    wordAudio: 'wa-fm01-san',
  },
  {
    id: 'voc-nihonjin',
    term: '日本人',
    termFurigana: '日本人[にほんじん]',
    readingKana: 'にほんじん',
    romaji: 'nihonjin',
    meaningFa: 'ژاپنی (اهل ژاپن)',
    noteFa: 'にほん = ژاپن + じん = اهلِ',
    lineRef: L(3),
    fsrs: { w: 'w-fm01-nihonjin', s: 's-fm01-nihonjin' },
    surfaceInLine: 'にほんじん',
    wordAudio: 'wa-fm01-nihonjin',
  },
  {
    id: 'voc-chuugokujin',
    term: '中国人',
    termFurigana: '中国人[ちゅうごくじん]',
    readingKana: 'ちゅうごくじん',
    romaji: 'chuugokujin',
    meaningFa: 'چینی (اهل چین)',
    noteFa: 'واکهٔ う را کش بده: chuugoku — کوتاه گفتنش یعنی کلمهٔ دیگری.',
    lineRef: L(5),
    fsrs: { w: 'w-fm01-chuugokujin', s: 's-fm01-chuugokujin' },
    surfaceInLine: 'ちゅうごくじん',
    wordAudio: 'wa-fm01-chuugokujin',
  },
  {
    id: 'voc-daigaku',
    term: '大学',
    termFurigana: '大学[だいがく]',
    readingKana: 'だいがく',
    romaji: 'daigaku',
    meaningFa: 'دانشگاه',
    noteFa: 'だい (بزرگ) + がく (مکتب) — با がっこう (مدرسه) اشتباه نشود؛ جفتشان بعداً می‌آید.',
    lineRef: L(8),
    fsrs: { w: 'w-fm01-daigaku', s: 's-fm01-daigaku' },
    surfaceInLine: 'だいがく',
    wordAudio: 'wa-fm01-daigaku',
  },
  {
    id: 'voc-sensee',
    term: '先生',
    termFurigana: '先生[せんせい]',
    readingKana: 'せんせい',
    romaji: 'sensee',
    meaningFa: 'استاد / معلم',
    noteFa: 'واکهٔ پایانی بلند است: sensee — «sensei» با املای انگلیسی ننویس.',
    lineRef: L(8),
    fsrs: { w: 'w-fm01-sensee', s: 's-fm01-sensee' },
    surfaceInLine: 'せんせい',
    wordAudio: 'wa-fm01-sensee',
  },
  {
    id: 'voc-anokata',
    term: 'あの方',
    termFurigana: 'あの方[かた]',
    readingKana: 'あのかた',
    romaji: 'anokata',
    meaningFa: 'آن شخص (اشارهٔ مؤدبانه به نفر سوم)',
    noteFa: 'همان «آن آقا/آن خانم» اما مؤدبانه؛ برای اشاره به حاضرِ جمع از こちら استفاده کن.',
    lineRef: L(7),
    fsrs: { w: 'w-fm01-anokata', s: 's-fm01-anokata' },
    surfaceInLine: 'あのかた',
    wordAudio: 'wa-fm01-anokata',
  },
  {
    id: 'voc-iranjin',
    term: 'イラン人',
    termFurigana: 'イラン人[じん]',
    readingKana: 'イランじん',
    romaji: 'iranjin',
    meaningFa: 'ایرانی (اهل ایران) — خودِ تویی!',
    noteFa: 'افزودهٔ HANASO برای تو (در فهرست جزوه نیست)؛ الگو همان 〜じん است.',
    lineRef: L(8),
    fsrs: { w: 'w-fm01-iranjin', s: 's-fm01-iranjin' },
    surfaceInLine: 'イランじん',
    wordAudio: 'wa-fm01-iranjin',
  },
  /* ---- TASK-LEARNING-06 (05B VOCAB-2 — unit 02-2) ---- */
  {
    id: 'voc-kankokujin',
    term: '韓国人',
    termFurigana: '韓国人[かんこくじん]',
    readingKana: 'かんこくじん',
    romaji: 'kankokujin',
    meaningFa: 'کره‌ای (اهل کره)',
    noteFa: 'صدای ん اینجا «ن» خیشومی است: ka-n-ko-ku — اگر ん را نیفکنی «かこく» می‌شود.',
    lineRef: L(11),
    fsrs: { w: 'w-fm01-kankokujin', s: 's-fm01-kankokujin' },
    surfaceInLine: 'かんこくじん',
    wordAudio: 'wa-fm01-kankokujin',
  },
  {
    id: 'voc-kara',
    term: '〜から',
    readingKana: '〜から',
    romaji: 'kara',
    meaningFa: 'از (نشانهٔ خاستگاه)',
    noteFa: 'برعکس فارسی: بعد از مکان می‌نشیند — かんこくから = «از کره».',
    lineRef: L(13),
    fsrs: { w: 'w-fm01-kara', s: 's-fm01-kara' },
    surfaceInLine: 'かんこくから',
    wordAudio: 'wa-fm01-kara',
  },
  {
    id: 'voc-kimashita',
    term: '来ました',
    termFurigana: '来ました[きました]',
    readingKana: 'きました',
    romaji: 'kimashita',
    meaningFa: 'آمد (شکل مؤدبانهٔ گذشتهٔ «آمدن»)',
    noteFa: 'در این فصل فقط در قالب 〜から きました استفاده می‌شود؛ فعل مجرد بعداً می‌آید.',
    lineRef: L(13),
    fsrs: { w: 'w-fm01-kimashita', s: 's-fm01-kimashita' },
    surfaceInLine: 'きました',
    wordAudio: 'wa-fm01-kimashita',
  },
];

export const FM01_GRAMMAR: GrammarCluster[] = [
  {
    id: 'gr-desu-identity',
    pattern: 'AはBです',
    titleFa: 'گزارهٔ هویت — «X هست Y»',
    lineRefs: [L(3), L(6), L(8)],
    fsrs: { gr: 'gr-fm01-desu-identity' },
  },
  {
    id: 'gr-desu-qa',
    pattern: 'ですか / ですね',
    titleFa: 'پرسش و تأیید هویت',
    lineRefs: [L(5), L(7)],
    fsrs: { gr: 'gr-fm01-desu-qa' },
  },
  /* ---- TASK-LEARNING-06 (05B — unit 02-2 clusters) ---- */
  {
    id: 'gr-mo',
    pattern: 'AもBです',
    titleFa: '「هم» — افزودن به همان گروه',
    lineRefs: [L(10)],
    fsrs: { gr: 'gr-fm01-mo' },
  },
  {
    id: 'gr-dewa-arimasen',
    pattern: 'AはBでは ありません',
    titleFa: 'نفی مؤدبانهٔ هویت — «نیست»',
    lineRefs: [L(11)],
    fsrs: { gr: 'gr-fm01-dewa-arimasen' },
  },
  {
    id: 'gr-kara-kimashita',
    pattern: '〜から きました',
    titleFa: 'خاستگاه — «از … آمده‌ام»',
    lineRefs: [L(13)],
    fsrs: { gr: 'gr-fm01-kara-kimashita' },
  },
];

export const FM01_EXPRESSIONS: ExpressionItem[] = [
  {
    id: 'chrk-konnichiwa',
    ja: 'こんにちは',
    reading: 'こんにちは',
    functionFa: 'سلام (احوال‌پرسی روزانه)',
    formalityFa: 'خنثی',
    replyFa: 'همان こんにちは',
    lineRef: L(1),
    fsrs: { chrk: 'chrk-fm01-konnichiwa' },
  },
  {
    id: 'chrk-hajimemashite',
    ja: 'はじめまして',
    reading: 'はじめまして',
    functionFa: '«از آشنایی‌تان خوشبختم» — آغازگر معرفی در اولین دیدار',
    formalityFa: 'مؤدب',
    replyFa: 'همان はじめまして + معرفی خودت',
    lineRef: L(3),
    fsrs: { chrk: 'chrk-fm01-hajimemashite' },
  },
  {
    id: 'chrk-yoroshiku',
    ja: 'よろしく おねがいします',
    reading: 'よろしく おねがいします',
    functionFa: '«از رابطه‌مان خوشحال می‌شوم» — بستن آیین آشنایی',
    formalityFa: 'مؤدب',
    replyFa: 'همان عبارت — در L9 هر دو با هم می‌گویند',
    taarofNoteFa: 'مثل «قربون شما» فرمول است، نه جملهٔ معنادار — ترجمه‌اش نکن، جایگاهش را یاد بگیر.',
    lineRef: L(9),
    fsrs: { chrk: 'chrk-fm01-yoroshiku' },
  },
  {
    id: 'chrk-anokata-donata',
    ja: 'あのかたは どなたですか',
    reading: 'あのかたは どなたですか',
    functionFa: '«آن [آقا/خانم] کیست؟» — پرسش مؤدبانه دربارهٔ شخص سوم',
    formalityFa: 'مؤدب',
    replyFa: '[نام]さん + هویت — مثل L8: アリさんです',
    lineRef: L(7),
    fsrs: { chrk: 'chrk-fm01-anokata-donata' },
  },
  /* ---- TASK-LEARNING-06 (05B — EXPRESSION-1 ④ + EXPRESSION-2 ×3; はい taught near
   * VOCAB-1 per traceability §۵, its card enrolled at GRAMMAR-2 station end) ---- */
  {
    id: 'chrk-hai',
    ja: 'はい',
    reading: 'はい',
    functionFa: '«بله» — تأیید مؤدب',
    formalityFa: 'مؤدب',
    replyFa: 'ادامهٔ جملهٔ تأییدی',
    taarofNoteFa: 'با آهنگ پایین گفته می‌شود؛ کشیدنش به «هـایِ» تعجبی معنای دفاعی می‌دهد.',
    lineRef: L(6),
    fsrs: { chrk: 'chrk-fm01-hai' },
  },
  {
    id: 'chrk-iie',
    ja: 'いいえ',
    reading: 'いいえ',
    functionFa: '«نه» — ردّ مؤدبانهٔ فرضِ غلط',
    formalityFa: 'مؤدب',
    replyFa: 'اصلاح اطلاعات + جملهٔ درست: かんこくじんです',
    taarofNoteFa: 'ردِ اطلاعات است نه شخص — بعدش حتماً جملهٔ درست را بگو (مثل L11).',
    lineRef: L(11),
    fsrs: { chrk: 'chrk-fm01-iie' },
  },
  {
    id: 'chrk-soodesuka',
    ja: 'そうですか',
    reading: 'そうですか',
    functionFa: '«آه، می‌فهمم» — واکنش به اطلاعات نو',
    formalityFa: 'خنثی',
    replyFa: 'ادامهٔ گفت‌وگو',
    taarofNoteFa: 'با آهنگ نزولی = «جالب بود»؛ そうですね (توافق) در این فصل نیست — با هم قاطی نکن.',
    lineRef: L(12),
    fsrs: { chrk: 'chrk-fm01-soodesuka' },
  },
  {
    id: 'chrk-wakarimashita',
    ja: 'わかりました',
    reading: 'わかりました',
    functionFa: '«فهمیدم / باشه» — دریافت اطلاعات',
    formalityFa: 'مؤدب-خنثی',
    replyFa: 'ادامهٔ گفت‌وگو یا شروع موضوع تازه',
    lineRef: L(12),
    fsrs: { chrk: 'chrk-fm01-wakarimashita' },
  },
];
