/**
 * HANASO — Chapter 1 content items (TASK-LEARNING-01/02).
 *
 * PROVENANCE (TASK-LEARNING-02 — per owner's notes «HANASO-OWNER-EDUCATIONAL-NOTES-COMPLETE.fa.md»):
 * Word SELECTION traces to the owner's notes Lesson 1 vocabulary list (40 items):
 *   #1 わたし · #3 〜さん · #4+#30 にほん+じん · #5+#30 ちゅうごく+じん · #10 大学 · #13 先生 · #16 あの方
 *   (+ イランじん — HANASO personalization, NOT in the notes — dialogue L8/INTEGRATE).
 * Kanji/reading forms match the notes' list exactly (kanji + kana reading per card);
 * L2 shows kanji as RECOGNITION ONLY (island kanji: Int — no independent kanji station).
 * Romaji standard: double-vowel (sensee, chuugoku) — notes' notation rules + 13-09 §۴-۲.
 * Deferred from notes Lesson 1 (KB 13-09 §۱ unit-split, S3 density): がくせい (#14) +
 * occupation words → Unit 3; あなた/ともだち/どなた (standalone) → later units.
 *
 * Words/grammar/expressions of unit-first-meeting-01 per CHAPTER_CONTENT_BLUEPRINT §۳
 * (8 core words — L2 cap 4..8 ✓, 2 grammar clusters — cap 1..2 ✓, 4 expressions).
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
    lineRef: L(3),
    fsrs: { w: 'w-fm01-watashi', s: 's-fm01-watashi' },
    surfaceInLine: 'わたし',
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
  },
  {
    id: 'voc-daigaku',
    term: '大学',
    termFurigana: '大学[だいがく]',
    readingKana: 'だいがく',
    romaji: 'daigaku',
    meaningFa: 'دانشگاه',
    lineRef: L(8),
    fsrs: { w: 'w-fm01-daigaku', s: 's-fm01-daigaku' },
    surfaceInLine: 'だいがく',
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
];
