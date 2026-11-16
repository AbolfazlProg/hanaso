/**
 * HANASO — TASK-HANASO-27: integrated practice stations (kana, section A).
 *
 * Pedagogy source: ops/checkpoints/TASK-HANASO-27/TASK27_PRACTICE_DESIGN.md
 * (Subagent B design, Main-approved). These stations reuse the ONE lesson
 * engine: blocks are ordinary `exercise` blocks graded by
 * /api/curriculum/station `grade` (F1→F2 hint→F3 ladder), completion flows
 * through the ordinary station `complete` action, progress lives in
 * app.station_progress like every other station. NO parallel engine.
 *
 * Content guardrails (per station, enforced by tests
 * h27-practice-content.test.ts):
 *   P1 — あ/か/さ rows + long vowel + dakuten が/ぎ/ご/ざ/じ/ぜ + h1–h5 words
 *        only. NO ん, NO later rows, NO ゜, NO ぬ/め pair (め untaught).
 *   P2 — + ん, な/た rows + だ + h7–h9 words. NO ま/ら/は/や/わ, NO ば,
 *        NO yōon/sokuon.
 *   P3 — + ま/ら/は rows + ば/び/ぶ + h12 words. NO ゃゅょ, NO っ, NO わ/を,
 *        NO ゜ (handakuten distractors forbidden — future content).
 *   P4 — full hiragana + all rules + all taught words. NO katakana glyphs,
 *        NO chōonpu ー, NO ぐ/ず/げ/づ/ぷ/べ/ぺ (never taught in this unit).
 * Distractor readings must be readings of TAUGHT kana; hints never name
 * future rows/rules; reading exercises never auto-play the answer audio.
 */
import type { Station } from '../types';

export const PRACTICE_STATIONS_KANA: Station[] = [
  /* ------------------------------------------------------------------ P1 */
  {
    slug: 'stn-kana-p1',
    type: 'practice',
    titleFa: 'تمرین ۱ — سه ردیف و دو قاعده',
    objectiveFa: 'آموخته‌های あ/か/さ و قواعد کشش و داکوتن را با بازیابی فعال تثبیت می‌کنی',
    core: true,
    order: 7,
    prerequisites: ['stn-kana-h5'],
    lineRefs: [],
    objectiveCode: 'kana-practice-1',
    estMinutes: 8,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    fsrsItems: [],
    blocks: [
      {
        kind: 'scene',
        id: 'blk-stn-kana-p1-scene',
        titleFa: 'تمرین ۱ — سه ردیف و دو قاعده',
        bodyFa:
          'تا اینجا سه ردیف اول هیراگانا (あ، か، さ) و دو قاعدهٔ مهم — کشش مصوت و داکوتن ゛ — را آموخته‌ای. این ایستگاه آموزش تازه‌ای ندارد؛ فقط با تمرین، آموخته‌هایت را از حافظهٔ فعال بیرون می‌کشی: شکل‌ها را می‌شناسی، صداها را از هم جدا می‌کنی و واژه‌های واقعی می‌خوانی. جایی گیر کردی، سرنخ‌ها قدم‌به‌قدم کمک می‌کنند.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-rec',
        exerciseIds: ['ex-kana-p1-rec-sa', 'ex-kana-p1-rec-o', 'ex-kana-p1-rec-se', 'ex-kana-p1-rec-ki'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-lis',
        exerciseIds: ['ex-kana-p1-lis-ko', 'ex-kana-p1-lis-shi', 'ex-kana-p1-lis-ga'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-rcl',
        exerciseIds: ['ex-kana-p1-rcl-a', 'ex-kana-p1-rcl-shi', 'ex-kana-p1-rcl-ga'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-dec',
        exerciseIds: ['ex-kana-p1-dec-asa', 'ex-kana-p1-dec-sushi', 'ex-kana-p1-dec-koko'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-word',
        exerciseIds: ['ex-kana-p1-dec-iie', 'ex-kana-p1-msg-gogo', 'ex-kana-p1-dec-ookii'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p1-mixed',
        exerciseIds: ['ex-kana-p1-rec-go', 'ex-kana-p1-lis-so', 'ex-kana-p1-dec-kasa'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-p1-wrapup',
        titleFa: 'تمرین ۱ — جمع‌بندی',
        itemsFa: [
          'پانزده کانای سه ردیف اول را از روی شکل و صدا می‌شناسی',
          'جفت‌های شبیه あ/お و き/さ و し/つ را با نشانهٔ تمایزشان جدا می‌کنی',
          'کشش مصوت و داکوتن ゛ را در واژه‌های واقعی می‌بینی و می‌خوانی',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ P2 */
  {
    slug: 'stn-kana-p2',
    type: 'practice',
    titleFa: 'تمرین ۲ — ん و ردیف‌های ن/ت',
    objectiveFa: 'شنیدن و خواندن ん و ردیف‌های な/た را با تمایز جفت‌های شبیه تثبیت می‌کنی',
    core: true,
    order: 11,
    prerequisites: ['stn-kana-h9'],
    lineRefs: [],
    objectiveCode: 'kana-practice-2',
    estMinutes: 8,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    fsrsItems: [],
    blocks: [
      {
        kind: 'scene',
        id: 'blk-stn-kana-p2-scene',
        titleFa: 'تمرین ۲ — ん و ردیف‌های ن/ت',
        bodyFa:
          'در این بخش سنگین‌ترین بار گلیفی مسیر را خواندی: ん و ردیف‌های な و た — یازده کانای تازه با چند جفت شبیه چالشی (さ/ち، し/つ، た/な، ん/そ). این تمرین قبل از رفتن سراغ ردیف‌های بعدی، آن‌ها را در حافظهٔ تازه جا می‌اندازد: هم از شکل، هم از صدا، هم در واژه‌های واقعی با ん.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-rec',
        exerciseIds: ['ex-kana-p2-rec-na', 'ex-kana-p2-rec-nu', 'ex-kana-p2-rec-chi', 'ex-kana-p2-rec-to'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-lis',
        exerciseIds: ['ex-kana-p2-lis-ni', 'ex-kana-p2-lis-tsu', 'ex-kana-p2-lis-da'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-rcl',
        exerciseIds: ['ex-kana-p2-rcl-tsu', 'ex-kana-p2-rec-ta', 'ex-kana-p2-rec-n'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-dec',
        exerciseIds: ['ex-kana-p2-dec-kuni', 'ex-kana-p2-dec-sono', 'ex-kana-p2-dec-ashita'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-word',
        exerciseIds: ['ex-kana-p2-dec-sensei', 'ex-kana-p2-dec-san', 'ex-kana-p2-dec-anata'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p2-mixed',
        exerciseIds: ['ex-kana-p2-lis-to', 'ex-kana-p2-dec-atsui'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-p2-wrapup',
        titleFa: 'تمرین ۲ — جمع‌بندی',
        itemsFa: [
          'صدای ん را به‌عنوان یک ضربهٔ کامل می‌شناسی و در واژه می‌خوانی',
          'جفت‌های さ/ち و し/つ و た/な را با نشانهٔ تمایزشان جدا می‌کنی',
          'شش ردیف نخست هیراگانا را در واژه‌های واقعی روان می‌خوانی',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ P3 */
  {
    slug: 'stn-kana-p3',
    type: 'practice',
    titleFa: 'تمرین ۳ — ردیف‌های م/ر/ه و داکوتن ば',
    objectiveFa: 'تمایز متراکم‌ترین جفت‌های شبیه هیراگانا و خواندن واژه‌های داکوتن ば',
    core: true,
    order: 15,
    prerequisites: ['stn-kana-h12'],
    lineRefs: [],
    objectiveCode: 'kana-practice-3',
    estMinutes: 9,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    fsrsItems: [],
    blocks: [
      {
        kind: 'scene',
        id: 'blk-stn-kana-p3-scene',
        titleFa: 'تمرین ۳ — ردیف‌های م/ر/ه و داکوتن ば',
        bodyFa:
          'با ردیف‌های ま، ら و は همهٔ صداهای پایهٔ هیراگانا آموخته شد — و همین‌جا متراکم‌ترین میدان جفت‌های شبیه مسیر است: ぬ/め، ね/れ، る/ろ، は/ほ/ま، く/へ. این تمرین قبل از قواعد پایانی، تمام این شبیه‌ها را یک‌جا و با نشانهٔ تمایز روشن تمرین می‌کند و خواندن واژه‌های واک‌دار ば (かばん، しんぶん) را که در همین بخش آموختی محک می‌زند.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-rec',
        exerciseIds: ['ex-kana-p3-rec-me', 'ex-kana-p3-rec-ho', 'ex-kana-p3-rec-ru', 'ex-kana-p3-rec-he'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-lis',
        exerciseIds: ['ex-kana-p3-lis-ne', 'ex-kana-p3-lis-ba', 'ex-kana-p3-lis-mi'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-pairs',
        exerciseIds: [
          'ex-kana-p3-rec-nu',
          'ex-kana-p3-rec-re',
          'ex-kana-p3-rcl-ro',
          'ex-kana-p3-rec-ha',
          'ex-kana-p3-rec-he2',
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-dec',
        exerciseIds: ['ex-kana-p3-dec-neko', 'ex-kana-p3-dec-mizu', 'ex-kana-p3-dec-kuruma'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-word',
        exerciseIds: ['ex-kana-p3-dec-kaban', 'ex-kana-p3-dec-shinbun', 'ex-kana-p3-dec-hon'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p3-mixed',
        exerciseIds: ['ex-kana-p3-rec-fu', 'ex-kana-p3-dec-tomodachi'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-p3-wrapup',
        titleFa: 'تمرین ۳ — جمع‌بندی',
        itemsFa: [
          'همهٔ جفت‌های شبیه ردیف‌های م/ر/ه را با نشانهٔ تمایز (جهت حلقه، شمار خط، دُم) جدا می‌کنی',
          'واژه‌های واک‌دار かばん و しんぶん را درست می‌خوانی',
          'برای دو قاعدهٔ پایانی — یوئون و سوکوئون — آماده‌ای',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ P4 */
  {
    slug: 'stn-kana-p4',
    type: 'practice',
    titleFa: 'تمرین ۴ — آیین کامل هیراگانا',
    objectiveFa: 'پیش از برگهٔ خواندن واقعی، کل هیراگانا با همهٔ قواعدش را یک‌جا مرور می‌کنی',
    core: true,
    order: 20,
    prerequisites: ['stn-kana-h15'],
    lineRefs: [],
    objectiveCode: 'kana-practice-4',
    estMinutes: 10,
    estLoad: 'light',
    completion: { kind: 'task_completed' },
    fsrsItems: [],
    blocks: [
      {
        kind: 'scene',
        id: 'blk-stn-kana-p4-scene',
        titleFa: 'تمرین ۴ — آیین کامل هیراگانا',
        bodyFa:
          'همهٔ مسیر پشت سر توست: چهل‌وشش کانای پایه، ん، و چهار قاعده — کشش، داکوتن ゛، هان‌داکوتن ゜، یوئون ゃゅょ و سوکوئون っ. این تمرین آخر، مانور کامل قبل از برگهٔ خواندن واقعی است: تفاوت اندازهٔ کاناهای کوچک و بزرگ را می‌سنجی، مکثِ っ را با گوش پیدا می‌کنی و نشان ゛ و ゜ را از هم جدا می‌کنی — همان مهارت‌هایی که ایستگاه بعدی از تو می‌خواهد.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-rec',
        exerciseIds: ['ex-kana-p4-rec-wa', 'ex-kana-p4-rec-wo', 'ex-kana-p4-rec-po', 'ex-kana-p4-rec-bo'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-lis',
        exerciseIds: ['ex-kana-p4-lis-wa', 'ex-kana-p4-lis-pa', 'ex-kana-p4-lis-yu'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-pairs',
        exerciseIds: ['ex-kana-p4-rec-ne', 'ex-kana-p4-rcl-ho', 'ex-kana-p4-rec-yo-small'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-rule',
        exerciseIds: ['ex-kana-p4-rl-gakkou', 'ex-kana-p4-rl-kyou', 'ex-kana-p4-rl-gogo'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-word',
        exerciseIds: [
          'ex-kana-p4-dec-gakkou',
          'ex-kana-p4-dec-enpitsu',
          'ex-kana-p4-dec-shashin',
          'ex-kana-p4-dec-watashi',
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-p4-mixed',
        exerciseIds: [
          'ex-kana-p4-rec-tsu',
          'ex-kana-p4-lis-chi',
          'ex-kana-p4-dec-sushi',
          'ex-kana-p4-msg-neko',
          'ex-kana-p4-rec-n',
          'ex-kana-p4-rec-ke',
          'ex-kana-p4-lis-ke',
          'ex-kana-p4-rec-no',
          'ex-kana-p4-lis-no',
          'ex-kana-p4-rec-te',
          'ex-kana-p4-rec-mu',
          'ex-kana-p4-rec-mo',
          'ex-kana-p4-lis-ra',
          'ex-kana-p4-rec-ri',
          'ex-kana-p4-rec-ro2',
          'ex-kana-p4-rec-hi',
          'ex-kana-p4-rec-fu2',
          'ex-kana-p4-rec-ya',
          'ex-kana-p4-rec-yu',
          'ex-kana-p4-lis-wo2',
          'ex-kana-p4-rcl-te',
          'ex-kana-p4-rcl-mu',
          'ex-kana-p4-rcl-ra',
          'ex-kana-p4-rcl-ri',
          'ex-kana-p4-rcl-hi',
        ],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-p4-wrapup',
        titleFa: 'تمرین ۴ — جمع‌بندی',
        itemsFa: [
          'اندازهٔ کانا (ょ کوچک در برابر よ بزرگ) و مکث っ را با گوش و چشم تشخیص می‌دهی',
          'نشان ゛ (با/دا) و ゜ (پا) را از هم جدا می‌کنی',
          'کل هیراگانا با همهٔ قواعدش را در واژه‌های واقعی می‌خوانی — برای ایستگاه واقعی آماده‌ای',
        ],
      },
    ],
  },
];
