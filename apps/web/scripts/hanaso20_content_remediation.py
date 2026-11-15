#!/usr/bin/env python3
"""
TASK-HANASO-20 — curriculum content remediation (PHASE 3).
Applies the 16 untaught-glyph fixes (audit UNTAUGHT_CONTENT_AUDIT) + the real
foreign-combination station (BUG-005). Idempotent: skips already-applied anchors.
"""
import re, sys

ST = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
CH = 'src/modules/curriculum/content/chapter-kana01.ts'
EX = 'src/modules/curriculum/content/chapter-kana01.exercises.ts'
GB = 'src/modules/curriculum/glyph-budget.ts'

src = open(ST, encoding='utf-8').read()
applied, skipped = [], []

def insert_before(anchor, text, label):
    global src
    if label in skipped: return
    if text.strip() in src:
        skipped.append(label); print(f"SKIP (already present): {label}"); return
    if anchor not in src:
        print(f"FAIL (anchor missing): {label}"); sys.exit(1)
    src = src.replace(anchor, text + anchor, 1)
    applied.append(label); print(f"OK: {label}")

def replace_once(old, new, label):
    global src
    if new in src and old not in src:
        skipped.append(label); print(f"SKIP (already applied): {label}"); return
    if old not in src:
        print(f"FAIL (old string missing): {label}"); sys.exit(1)
    src = src.replace(old, new, 1)
    applied.append(label); print(f"OK: {label}")

# ---------- 1. h5: add せ/ぜ + し/じ rows to the dakuten miniTable (audit items 1 & 16) ----------
replace_once(
    """          rows: [
            ['か (کا)', 'が (گا)', 'ک / گ'],
            ['さ (سا)', 'ざ (زا)', 'س / ز'],
            ['き (کی)', 'ぎ (گی)', 'ک / گ'],
          ],""",
    """          rows: [
            ['か (کا)', 'が (گا)', 'ک / گ'],
            ['さ (سا)', 'ざ (زا)', 'س / ز'],
            ['き (کی)', 'ぎ (گی)', 'ک / گ'],
            ['せ (سه)', 'ぜ (زه)', 'س / ز'],
            ['し (شی)', 'じ (جی)', 'ش / ج'],
          ],""",
    'h5 miniTable +ぜ +じ')

# ---------- 2. h12: miniTable on the びょういん rule-step showing ば/び (audit item 2) ----------
replace_once(
    """        word: { ja: 'びょういん', readingFa: 'بیووین', fa: 'بیمارستان', highlight: ['ょ'], beats: 4 },
        ask: {
          questionFa: '「びよういん» (با よ بزرگ) چه معنایی دارد؟',
          options: [
            { id: 'a', label: 'بیمارستان' },
            { id: 'b', label: 'آرایشگاه' },
          ],
          correctOptionId: 'b',
          revealFa:
            'آرایشگاه! 「びょういن» (ょ کوچک) بیمارستان است و 「びよういن» (よ بزرگ) آرایشگاه — اندازهٔ یک نویسه معنا را عوض می‌کند.',
        },
      },""",
    """        word: { ja: 'びょういん', readingFa: 'بیووین', fa: 'بیمارستان', highlight: ['ょ'], beats: 4 },
        miniTable: {
          headers: ['شکل', 'صدا', 'واژه'],
          rows: [
            ['は+゛ = ば', 'ب', 'かばん — کیف'],
            ['ひ+゛ = び', 'ب', 'びょういん — بیمارستان'],
          ],
        },
        ask: {
          questionFa: '「びよういん» (با よ بزرگ) چه معنایی دارد؟',
          options: [
            { id: 'a', label: 'بیمارستان' },
            { id: 'b', label: 'آرایشگاه' },
          ],
          correctOptionId: 'b',
          revealFa:
            'آرایشگاه! 「びょういن» (ょ کوچک) بیمارستان است و 「びよういن» (よ بزرگ) آرایشگاه — اندازهٔ یک نویسه معنا را عوض می‌کند.',
        },
      },""",
    'h12 step-byouin miniTable ば/び')

# ---------- 3. h15: fix でんわ note (だ→で mismatch) + add ぴ/ぼ/ぽ (audit items 4,5,6) ----------
replace_once(
    """        items: [
          { glyph: 'は', readingFa: 'ها', noteFa: 'بی‌علامت = «هـ».' },
          { word: 'でんわ', readingFa: 'دِنوا', noteFa: '゛ را یادت هست؟ (だ = た+゛) — تلفن.' },
        ],""",
    """        items: [
          { glyph: 'は', readingFa: 'ها', noteFa: 'بی‌علامت = «هـ».' },
          { word: 'でんわ', readingFa: 'دِنوا', noteFa: '゛ را یادت هست؟ (で = て+゛) — تلفن.' },
          { glyph: 'ぴ', readingFa: 'پی', noteFa: 'ひ+゜ — در えんぴつ (مداد).' },
          { glyph: 'ぼ', readingFa: 'بُ', noteFa: 'ほ+゛ — صدای «ب»، جفت کمینه‌ای با ぽ.' },
          { glyph: 'ぽ', readingFa: 'پُ', noteFa: 'ほ+゜ — در さんぽ (پیاده‌روی).' },
        ],""",
    'h15 prereq ぴ/ぼ/ぽ + で note fix')

# ---------- 4. k2: ド intro before the listening block (ドイツ/ドア examples) ----------
insert_before(
    """      {
        kind: 'exercise',
        id: 'blk-stn-kana-k2-listening',""",
    """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k2-prereq-dakuten',
        titleFa: 'پیش از خواندن: اولین داکوتنِ کاتاکانا',
        items: [
          { glyph: 'ド', readingFa: 'دُ', noteFa: 'ト+゛ — همان قاعدهٔ H5، این‌بار در خط دوم: ド (در ドイツ و ドア).' },
        ],
      },
""",
    'k2 ド prereq')

# ---------- 5. k4: ジ/ズ intro before the listening block (ラジオ/アジア/サイズ examples) ----------
insert_before(
    """      {
        kind: 'exercise',
        id: 'blk-stn-kana-k4-listening',""",
    """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k4-prereq-derived',
        titleFa: 'پیش از خواندن: داکوتنِ ردیف サ',
        items: [
          { glyph: 'ジ', readingFa: 'جی', noteFa: 'シ+゛ — در ラジオ (رادیو) و アジア (آسیا).' },
          { glyph: 'ズ', readingFa: 'زُ', noteFa: 'ス+゛ — در サイズ (اندازه).' },
        ],
      },
""",
    'k4 ジ/ズ prereq')

# ---------- 6. k5: バ/ビ/ピ/ザ intro before the listening block (バス/ビル/ピザ examples) ----------
insert_before(
    """      {
        kind: 'exercise',
        id: 'blk-stn-kana-k5-listening',""",
    """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k5-prereq-derived',
        titleFa: 'پیش از خواندن: مشتقات کاتاکانا',
        items: [
          { glyph: 'バ', readingFa: 'با', noteFa: 'ハ+゛ — در バス (اتوبوس).' },
          { glyph: 'ビ', readingFa: 'بی', noteFa: 'ヒ+゛ — در ビル (برج).' },
          { glyph: 'ピ', readingFa: 'پی', noteFa: 'ヒ+゜ — هان‌داکوتنِ کاتاکانا: در ピザ (پیتزا).' },
          { glyph: 'ザ', readingFa: 'زا', noteFa: 'サ+゛ — همان ザ که در ピザ می‌بینی.' },
        ],
      },
""",
    'k5 バ/ビ/ピ/ザ prereq')

# ---------- 7. k6: ャ/ュ/ョ/ゼ/プ/パ intro before the listening block (ジャパン/プレゼント examples) ----------
insert_before(
    "      { kind: 'exercise', id: 'blk-stn-kana-k6-listening', exerciseIds: ['ex-kana-k6-lis-kata-n'] },",
    """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k6-prereq-derived',
        titleFa: 'پیش از خواندن: یُوئون و مشتقاتِ کاتاکانا',
        items: [
          { glyph: 'ャ', readingFa: 'یای کوچک (کاتاکانا)', noteFa: 'کاتاکانا هم یُوئون دارد — ジ+ャ = «جا»: ジャパン.' },
          { glyph: 'ュ', readingFa: 'یوی کوچک (کاتاکانا)', noteFa: 'بعداً در ジュース.' },
          { glyph: 'ョ', readingFa: 'یوی گردِ کوچک (کاتاکانا)', noteFa: 'کامل‌کنندهٔ خانواده — مثل ひرای گانای ゃゅょ.' },
          { glyph: 'ゼ', readingFa: 'زه', noteFa: 'セ+゛ — در プレゼント (هدیه).' },
          { glyph: 'プ', readingFa: 'پُ', noteFa: 'フ+゜ — در プレゼント.' },
          { glyph: 'パ', readingFa: 'پا', noteFa: 'ハ+゜ — در ジャパン (پْا).' },
        ],
      },
""",
    'k6 ャ/ュ/ョ/ゼ/プ/パ prereq')

# ---------- 8. k8: add ボ/ペ items to the existing prereq (ボールペン) ----------
replace_once(
    """        items: [
          {
            word: 'こうこう',
            readingFa: 'کووکوو',
            noteFa: 'در هیراگانا کشش را با تکرار مصوت نوشتیم: こ+う. کاتاکانا راه کوتاه‌تری دارد.',
          },
        ],""",
    """        items: [
          {
            word: 'こうこう',
            readingFa: 'کووکوو',
            noteFa: 'در هیراگانا کشش را با تکرار مصوت نوشتیم: こ+う. کاتاکانا راه کوتاه‌تری دارد.',
          },
          { glyph: 'ボ', readingFa: 'بُ', noteFa: 'ホ+゛ — در ボールペン (خودکار).' },
          { glyph: 'ペ', readingFa: 'پِ', noteFa: 'ヘ+゛ — در ボールペن.' },
        ],""",
    'k8 prereq +ボ/ペ')

# ---------- 9. k11: デ intro before the listening block (デザイナー examples) ----------
insert_before(
    """      {
        kind: 'exercise',
        id: 'blk-stn-kana-k11-listening',""",
    """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k11-prereq-derived',
        titleFa: 'پیش از خواندن: داکوتنِ ردیف タ در واژه‌ها',
        items: [{ glyph: 'デ', readingFa: 'دِ', noteFa: 'テ+゛ — در デザイナー (طراح).' }],
      },
""",
    'k11 デ prereq')

# ---------- 10. k12: honest title/objective/wrap-up (BUG-005: no hollow promise) ----------
replace_once(
    "    titleFa: 'ردیف ワ + ترکیب خارجی (ファ/ティ/ヴ…)',\n    objectiveFa: 'تنها واحد فاز K با روماجی روشن (استثنای CONTENT-107)',",
    "    titleFa: 'ردیف ワ/ヲ',\n    objectiveFa: 'دو کارت آخرِ کاتاکانا: ワ و ヲ — با روماجی روشن (استثنای CONTENT-107)',",
    'k12 title/objective honest')
replace_once(
    """        titleFa: 'ردیف ワ + ترکیب خارجی (ファ/ティ/ヴ…) — جمع‌بندی',
        itemsFa: [
          '2 کانای جدید: ワ(وا)، ヲ(اُ)',
          'قاعدهٔ تازه: foreigncombo',
          '5 واژهٔ واقعی تازه خواندنی شد — مجموع 721 واژه از جزوهٔ N5.',
          'کارت‌های مرور (FSRS) برای همین کاناها ثبت شدند — صف مرور روزانه به‌زودی فعال می‌شود.',
        ],""",
    """        titleFa: 'ردیف ワ/ヲ — جمع‌بندی',
        itemsFa: [
          '2 کانای جدید: ワ(وا)، ヲ(اُ)',
          'ترکیب خارجی (ファ/ティ/ヴ) در ایستگاه بعدی آموزش داده می‌شود — اینجا فقط ردیف ワ.',
          '5 واژهٔ واقعی تازه خواندنی شد — مجموع 721 واژه از جزوهٔ N5.',
          'کارت‌های مرور (FSRS) برای همین کاناها ثبت شدند — صف مرور روزانه به‌زودی فعال می‌شود.',
        ],""",
    'k12 wrap-up honest')

# ---------- 11. renumber: opt-drill 31→32, opt-r-h9 30→31, k13 29→30 ----------
# (do in this order so each `order: N,` stays unique at replace time)
m = re.search(r"slug: 'stn-kana-opt-drill',\s*\n(?:.|\n)*?    order: (\d+),", src)
if m and m.group(1) == '31':
    replace_once(m.group(0), m.group(0).replace('order: 31,', 'order: 32,'), 'opt-drill order 32')
else:
    skipped.append('opt-drill order 32'); print('SKIP: opt-drill order 32')
m = re.search(r"slug: 'stn-kana-opt-r-h9',\s*\n(?:.|\n)*?    order: (\d+),", src)
if m and m.group(1) == '30':
    replace_once(m.group(0), m.group(0).replace('order: 30,', 'order: 31,'), 'opt-r-h9 order 31')
else:
    skipped.append('opt-r-h9 order 31'); print('SKIP: opt-r-h9 order 31')
m = re.search(r"slug: 'stn-kana-k13',\s*\n(?:.|\n)*?    order: (\d+),", src)
if m and m.group(1) == '29':
    replace_once(m.group(0), m.group(0).replace('order: 29,', 'order: 30,'), 'k13 order 30')
else:
    skipped.append('k13 order 30'); print('SKIP: k13 order 30')

# ---------- 12. NEW station: stn-kana-k12-foreign (the real foreign-combination teaching) ----------
FOREIGN_STATION = """  {
    slug: 'stn-kana-k12-foreign',
    type: 'kana',
    titleFa: 'ترکیب خارجی (ファ/ティ/ヴ)',
    objectiveFa: 'ترکیب خارجی: صداهای بیرونی با مصوتِ کوچک — ファ، ティ، ヴ',
    core: true,
    order: 29,
    prerequisites: ['stn-kana-k12'],
    lineRefs: [],
    objectiveCode: 'kana-katakana',
    estMinutes: 10,
    estLoad: 'light',
    completion: { kind: 'exercise_threshold', threshold: 0.7 },
    mastery: { threshold: 0.7 },
    introducesGlyphs: [],
    blocks: [
      {
        kind: 'exercise',
        id: 'blk-stn-kana-kf-warmup',
        exerciseIds: ['ex-kana-kf-warm-1', 'ex-kana-kf-warm-2'],
      },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-kf-prereq',
        titleFa: 'پیش از شروع: صداهایی که کانا ندارد',
        items: [
          { glyph: 'ァ', readingFa: 'آی کوچک', noteFa: 'مصوت کوچک — به صدای قبل می‌چسبد؛ مثل ゃ کوچک، ولی برای صداهای بیرونی.' },
          { glyph: 'ィ', readingFa: 'ای کوچک', noteFa: 'همان قاعده با مصوت i.' },
          { glyph: 'ヴ', readingFa: 'وُ (vu)', noteFa: 'ウ+゛ — نزدیک‌ترین صدای ژاپنی به «v».' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-kf-step-fa',
        role: 'notice',
        bodyFa: '«فایل»: ژاپنی «ف»ی جدا ندارد — フ + アِ کوچک آن را می‌سازد: ファ.',
        word: { ja: 'ファイル', readingFa: 'فایل', fa: 'فایل', highlight: ['ァ'], beats: 3 },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-kf-step-ti',
        role: 'notice',
        bodyFa: '«تیشّو»: «تی» در خط کانا نیست — テ + ィ کوچک آن را می‌سازد.',
        word: { ja: 'ティッシュ', readingFa: 'تیشّو', fa: 'دستمال کاغذی', highlight: ['ィ'], beats: 3 },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-kf-step-vu',
        role: 'notice',
        bodyFa: '«ویولین»: ヴ (ウ+゛) + アِ کوچک = ヴァ — نزدیک‌ترین ساختنی به «va».',
        word: { ja: 'ヴァイオリン', readingFa: 'وایولین', fa: 'ویولین', highlight: ['ヴ'], beats: 5 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-kf-contrast-fa',
        titleFa: 'کوچک = چسبیده، بزرگ = جدا',
        a: { ja: 'ファイル', readingFa: 'فایل', fa: 'با ァ کوچک — یک ضربهٔ «فا»', highlight: ['ァ'], beats: 3 },
        b: {
          ja: 'フアイル',
          readingFa: 'فُو-آ-ی-رُ',
          fa: 'این شکل واژه نیست — ア بزرگ جدا مانده (۴ ضربه)',
          highlight: ['ア'],
          beats: 4,
        },
        ask: {
          questionFa: 'کدام «فایل» است؟',
          options: [
            { id: 'a', label: 'ファイル (با ァ کوچک)' },
            { id: 'b', label: 'フアイル (با ア بزرگ)' },
          ],
          correctOptionId: 'a',
          revealFa: '「ファ» یک ضربه است؛ 「フア» دو ضربهٔ جدا — همان قاعدهٔ یُوئون، این‌بار برای صداهای بیرونی.',
        },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-kf-guided',
        exerciseIds: ['ex-kana-kf-dec-1', 'ex-kana-kf-lis-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-kf-reading',
        examples: [
          {
            id: 'rd-stn-kana-kf-0',
            role: 'reading',
            ja: 'パーティー',
            reading: 'پاتیی',
            pronFa: 'پا+ー+تی+ー — «پا-تیی» (pātī): ティ کوچک + دو کشش.',
            fa: 'مهمانی',
            whyFa: 'ترکیب خارجی ティ + کشش ー در یک واژهٔ واقعی.',
          },
          {
            id: 'rd-stn-kana-kf-1',
            role: 'reading',
            ja: 'ファイル',
            reading: 'فایل',
            fa: 'فایل (رایانه)',
            whyFa: 'ファ — اولین ترکیب خارجی که دیدی.',
          },
          {
            id: 'rd-stn-kana-kf-2',
            role: 'reading',
            ja: 'ヴァイオリン',
            reading: 'وایولین',
            fa: 'ویولین',
            whyFa: 'ヴ نادر است — معادل رایج‌تر バイオリン است.',
          },
        ],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-kf-rule-foreign',
        patternJa: 'ファ (۱ مورا) ≠ フア (۲ مورا)',
        titleFa: 'کارت مرجع: ترکیب خارجی',
        bodyFa:
          'صداهایی که کانا ندارد (f / ti / v) با مصوتِ کوچک ساخته می‌شوند: ファ・ティ・ヴァ. اندازهٔ کوچک همان فشردگی یُوئون است — این‌بار برای صداهای بیرونی.',
        structureTable: {
          headers: ['ترکیب', 'خوانش', 'واژه'],
          rows: [
            ['ファ', 'فا', 'ファイル (فایل)'],
            ['ティ', 'تی', 'ティッシュ (دستمال کاغذی)'],
            ['ヴァ', 'وا', 'ヴァイオリン (ویولین)'],
          ],
        },
        persianBridgeFa:
          'مثل فارسی که صداهای بیرونی را با همان حروف می‌نویسد، ژاپنی هم صدای بیرونی را با مصوتِ کوچک به کانای قبل می‌چسباند.',
        honestyLabelFa: 'ヴ کم‌رواج است — معادل رایج‌تر バイオリン (با «ب») است.',
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-kf-wrapup',
        titleFa: 'ترکیب خارجی — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: صدای بیرونی = مصوتِ کوچک (ァ ィ ゥ ェ ォ) + ヴ.',
          'ファ ≠ フア — کوچک یعنی چسبیده، همانند یُوئون.',
          'واژه‌های تازهٔ خواندنی: ファイル، ティッシュ، ヴァイオリン، パーティー.',
        ],
      },
    ],
    fsrsItems: [],
  },
"""
insert_before("  {\n    slug: 'stn-kana-k13',", FOREIGN_STATION, 'k12-foreign station')

# k13 prereq now chains through k12-foreign
replace_once(
    "    slug: 'stn-kana-k13',\n    type: 'integrate',",
    "    slug: 'stn-kana-k13',\n    type: 'integrate',",
    'k13 noop')  # placeholder; real change below
# undo the noop immediately (it is a no-op by design)
replace_once(
    "    prerequisites: ['stn-kana-k12'],\n    lineRefs: [],\n    objectiveCode: 'kana-two-script-use',",
    "    prerequisites: ['stn-kana-k12-foreign'],\n    lineRefs: [],\n    objectiveCode: 'kana-two-script-use',",
    'k13 prereq → k12-foreign')

open(ST, 'w', encoding='utf-8').write(src)

# ---------- 13. chapter assembly: island membership + counts ----------
ch = open(CH, encoding='utf-8').read()
def ch_replace(old, new, label):
    global ch
    if new in ch and old not in ch:
        print(f"SKIP: {label}"); return
    if old not in ch:
        print(f"FAIL (chapter anchor): {label}"); sys.exit(1)
    ch = ch.replace(old, new, 1); print(f"OK: {label}")

ch_replace(
    "      'stn-kana-k12',\n    ],\n  },",
    "      'stn-kana-k12',\n      'stn-kana-k12-foreign',\n    ],\n  },",
    'island-3 += k12-foreign')
ch_replace(
    "summaryFa: 'منو، برند و وام‌واژه‌ها را می‌خوانی (K1..K12)',",
    "summaryFa: 'منو، برند و وام‌واژه‌ها را می‌خوانی (K1..K12 + ترکیب خارجی)',",
    'island-3 summary')
ch_replace("۳۱ ایستگاه، ۹۲ شکل", "۳۲ ایستگاه، ۹۲ شکل", 'chapter summary count')
ch_replace("  estMinutes: 338,", "  estMinutes: 348,", 'chapter estMinutes 348')
open(CH, 'w', encoding='utf-8').write(ch)

# ---------- 14. exercises: kf warmups + guided (2 exercises per roadmap P1-2) ----------
ex = open(EX, encoding='utf-8').read()
KF_EX = """
  {
    id: 'ex-kana-kf-warm-1',
    type: 'kana-listening',
    targetSkill: 'vocab',
    targetConcept: 'kata-wo',
    assessesConcepts: ['kata-wo'],
    difficulty: 2,
    promptFa: 'به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟',
    promptJa: 'ヲ',
    options: [
      { id: 'a', label: 'ラ' },
      { id: 'b', label: 'ン' },
      { id: 'c', label: 'ヲ' },
    ],
    correctOptionId: 'c',
    distractorRationaleFa: { a: 'جفت اشتباه‌پذیرِ شکل — «ラ» صدای دیگری است.', b: '「ン» انتهای واژه است، نه این صدا.' },
    feedback: {
      f1Fa: 'این صدای کانای دیگری بود — دوباره پخشش کن و شکل گزینه‌ها را با آن مقایسه کن.',
      f2HintFa: 'صدا را یک بار دیگر پخش کن و شکل هر گزینه را با آن مقایسه کن.',
      f3ExplainFa: 'این صدا مال 「ヲ» است — پخشش کن و شکلش را به خاطر بسپار.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-kana-kf-warm-2',
    type: 'kana-recognition',
    targetSkill: 'vocab',
    targetConcept: 'kata-wa',
    assessesConcepts: ['kata-wa'],
    difficulty: 1,
    promptFa: 'این کانا چه صدایی دارد؟',
    promptJa: 'ワ',
    options: [
      { id: 'a', label: '«وا»' },
      { id: 'b', label: '«فو»' },
      { id: 'c', label: '«کو»' },
    ],
    correctOptionId: 'a',
    distractorRationaleFa: {
      b: '「フ» است — با «ワ» اشتباه‌پذیر است؛ درستش «فو».',
      c: '「ク» صدای دیگری است.',
    },
    feedback: {
      f1Fa: '「ワ» صدای «وا» دارد — یک بار دیگر به شکلش نگاه کن.',
      f2HintFa: 'به شکل ワ و یادسپارش برگرد؛ با 「フ» مقایسه‌اش کن.',
      f3ExplainFa: '「ワ」 = «وا» — همان کارتی که در این درس دیدی.',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-kana-kf-dec-1',
    type: 'kana-decode',
    targetSkill: 'vocab',
    targetConcept: 'kana-orientation',
    difficulty: 2,
    promptFa: 'این واژه را بخوان — راهنمایی: فایل',
    promptJa: 'ファイル',
    promptJaReading: 'فایل',
    options: [
      { id: 'a', label: '«فایری»' },
      { id: 'b', label: '«فایل»' },
      { id: 'c', label: '«هایرو»' },
    ],
    correctOptionId: 'b',
    distractorRationaleFa: {
      a: '「ル» را با 「リ» اشتباه گرفتی — آخرِ واژه «ru» است: فایل.',
      c: 'شکل 「フ» است نه 「ヘ» — «فـ» بخوان، نه «هـ».',
    },
    feedback: {
      f1Fa: '「ファ» را یک ضربه بخوان: «فا» — بعد 「イ» و 「ル».',
      f2HintFa: 'کانا به کانا بخوان: «فا»…',
      f3ExplainFa: '「ファイル» = «فایل» — ファ یک ضربه است (ترکیب خارجی).',
    },
    assessmentRole: 'practice',
  },
  {
    id: 'ex-kana-kf-lis-1',
    type: 'rule-listening',
    targetSkill: 'listening',
    targetConcept: 'kana-orientation',
    difficulty: 2,
    promptFa: 'به صدا گوش کن — کدام واژه را شنیدی؟ (فشرده یا جدا؟)',
    promptJa: 'ファイル',
    promptJaReading: 'فایل (فایل)',
    options: [
      { id: 'a', label: 'フアイル' },
      { id: 'b', label: 'ファイル' },
    ],
    correctOptionId: 'b',
    distractorRationaleFa: { a: '「ア» بزرگ یعنی جدا — فُو/آ/ی/رُ (۴ ضربه). شنیده‌شده فشرده بود: ファ یک ضربه.' },
    feedback: {
      f1Fa: '「ファ» و 「フア» را بلند بگو — فرق در فشردگی است.',
      f2HintFa: 'شنیده‌شده فشرده است: فا.',
      f3ExplainFa: '「ファイル» = «فایل» — ファ ترکیب خارجی است، یک مورا.',
    },
    assessmentRole: 'practice',
  },
"""
if "id: 'ex-kana-kf-warm-1'" in ex:
    print('SKIP: kf exercises (already present)')
else:
    # append at the end of the exercises array (before the closing "];" of KANA_EXERCISES)
    anchor = "];"
    idx = ex.rfind("\n];")
    if idx < 0:
        print('FAIL: exercises array end not found'); sys.exit(1)
    ex = ex[:idx] + "\n" + KF_EX + ex[idx:]
    print('OK: kf exercises appended')
open(EX, 'w', encoding='utf-8').write(ex)

# ---------- 15. glyph-budget.ts: comment update (foreign-small now taught) ----------
gb = open(GB, encoding='utf-8').read()
if 'until K12 teaches them' in gb:
    gb = gb.replace(
        "  /* wave-2 (registered, untaught): ファ/ティ/ヴ-style foreign smalls — using one\n     today is a content violation until K12 teaches them. */",
        "  /* TASK-HANASO-20: taught by stn-kana-k12-foreign (the real foreign-combination\n     station — BUG-005 remediation). Before that station existed these were a\n     registered wave-2 violation. */",
    )
    open(GB, 'w', encoding='utf-8').write(gb)
    print('OK: glyph-budget comment')
else:
    print('SKIP: glyph-budget comment')

print(f"\nApplied {len(applied)} edits; skipped {len(skipped)}")
