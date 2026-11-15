#!/usr/bin/env python3
"""TL-14 CP-04/05 — rewrite the 8 rule stations into slide-by-slide decks.

Splices new `blocks` arrays (rule-prereq / rule-step / rule-contrast slides +
smaller exercise/example blocks + reference rule-card) into
chapter-kana01.stations.ts, declares introducesGlyphs, and fixes the audit's
station-side findings (H1 いえ reading, K11 ノート reading, H12 びょういん
addition, K8 ノート→タクシー, H6 びょういん row removal, H7 honesty label).
Every anchor is exact-string verified before replacement."""

import re
import sys

PATH = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
src = open(PATH).read()

# ---------------------------------------------------------------- helpers
def station_span(slug):
    """Return (start, end) of the station object literal for slug."""
    m = re.search(r"slug: '" + slug + r"',", src)
    if not m:
        return None
    start = src.rfind('{', 0, m.start())
    depth = 0
    i = start
    while i < len(src):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return (start, i + 1)
        i += 1
    return None

def replace_blocks(slug, new_blocks_ts, introduces):
    """Replace the station's blocks array + insert introducesGlyphs."""
    global src
    sp = station_span(slug)
    if not sp:
        fail(f'station {slug} not found')
    body = src[sp[0]:sp[1]]
    m = re.search(r'blocks: \[', body)
    if not m:
        fail(f'{slug}: blocks array not found')
    # find matching ] for blocks[
    i = m.end() - 1
    depth = 0
    while i < len(body):
        if body[i] == '[':
            depth += 1
        elif body[i] == ']':
            depth -= 1
            if depth == 0:
                break
        i += 1
    blocks_end = i + 1
    body = body[:m.start()] + 'blocks: ' + new_blocks_ts.strip() + ',' + body[blocks_end:]
    # introducesGlyphs: replace existing or insert after mastery line
    if 'introducesGlyphs:' in body:
        body = re.sub(r'introducesGlyphs: \[[^\]]*\],', 'introducesGlyphs: ' + introduces + ',', body, count=1)
    else:
        mm = re.search(r'(mastery: \{ threshold: 0\.7 \},\n)', body)
        if not mm:
            fail(f'{slug}: mastery line not found')
        body = body[:mm.end()] + '    introducesGlyphs: ' + introduces + ',\n' + body[mm.end():]
    src = src[:sp[0]] + body + src[sp[1]:]

def fail(msg):
    print('ABORT: ' + msg)
    sys.exit(1)

def bump_minutes(slug, new_minutes):
    global src
    sp = station_span(slug)
    body = src[sp[0]:sp[1]]
    body = re.sub(r'estMinutes: \d+,', f'estMinutes: {new_minutes},', body, count=1)
    src = src[:sp[0]] + body + src[sp[1]:]

# ================================================================ H4 deck
H4_BLOCKS = """
[
      { kind: 'exercise', id: 'blk-stn-kana-h4-warmup', exerciseIds: ['ex-kana-h4-warm-1', 'ex-kana-h4-warm-2', 'ex-kana-h4-warm-3'] },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h4-prereq',
        titleFa: 'پیش از شروع: مصوت‌هایی که می‌کِشیم',
        items: [
          { glyph: 'あ', readingFa: 'اَ', noteFa: 'مصوت «ا»' },
          { glyph: 'い', readingFa: 'ای', noteFa: 'مصوت «ای»' },
          { glyph: 'う', readingFa: 'اُ', noteFa: 'مصوت «اُ»' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h4-step-ie',
        role: 'notice',
        bodyFa: 'این واژه دو ضربه دارد: ای — هِ. صدا را پخش کن و با انگشت همراه بزن.',
        word: { ja: 'いえ', readingFa: 'ایه', fa: 'خانه', highlight: [], beats: 2 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h4-contrast-ie',
        titleFa: 'دو ضربه در برابر سه ضربه',
        a: { ja: 'いえ', readingFa: 'ایه', fa: 'خانه', highlight: [], beats: 2 },
        b: { ja: 'いいえ', readingFa: 'اییه', fa: 'نه', highlight: ['いい'], beats: 3 },
        ask: {
          questionFa: 'هر دو را پشت‌سرهم گوش بده — کدام سه ضربه بود؟',
          options: [
            { id: 'a', label: 'いえ' },
            { id: 'b', label: 'いいえ' },
          ],
          correctOptionId: 'b',
          revealFa: 'واژهٔ دوم سه ضربه داشت: ای — ای — هِ. آیِ اول دوبار تکرار شد و «ایه» (خانه) را به «اییه» (نه) تبدیل کرد.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h4-step-concept',
        role: 'explain',
        titleFa: 'مصوتِ کشیده',
        bodyFa:
          'مصوتِ بلند دقیقاً دو برابرِ کوتاه است — دو ضربهٔ مساوی، نه صدای بلندتر و نه مؤکدتر. در فارسی بکشیدن مصوت حالِ جمله را عوض می‌کند («مادر!» التماس‌آمیز می‌شود)؛ در ژاپنی کشیدن مصوت خودِ واژه را عوض می‌کند.',
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h4-predict-ookii',
        role: 'notice',
        bodyFa: 'این واژه را ببین — «بزرگ». حدس بزن و بعد جواب را ببین.',
        word: { ja: 'おおきい', readingFa: 'اووکیی', fa: 'بزرگ', highlight: ['おお'], beats: 4 },
        ask: {
          questionFa: 'حدس بزن: مصوتِ اولِ این واژه کوتاه است یا کشیده؟',
          options: [
            { id: 'a', label: 'کوتاه (یک ضربه)' },
            { id: 'b', label: 'کشیده (دو ضربه)' },
          ],
          correctOptionId: 'b',
          revealFa:
            'کشیده — お+お یعنی یک اُوی دوضربه. چهار ضربه: اُو — کی — ای. اگر کوتاه بخوانی «اُکیی» می‌شود که واژه نیست.',
        },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h4-contrast-ee',
        titleFa: 'یک ضربه در برابر دو',
        a: { ja: 'え', readingFa: 'اِ', fa: 'نقاشی', highlight: [], beats: 1 },
        b: { ja: 'ええ', readingFa: 'اِی', fa: 'بله', highlight: ['ええ'], beats: 2 },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h4-step-patterns',
        role: 'explain',
        titleFa: 'الگوهای نوشتاریِ کشش',
        bodyFa:
          'کشش را با تکرار همان مصوت می‌نویسند. سه الگوی اصلی را ببین — بعداً همین‌ها را در واژه‌های واقعی می‌خوانی.',
        miniTable: {
          headers: ['الگو', 'مثال', 'شنیدن'],
          rows: [
            ['い段 + い', 'いいえ (نه)', 'ای — ای — هِ'],
            ['え段 + え', 'ええ (بله)', 'اِ — اِی'],
            ['う段 + う', 'く+う → «کوو»', 'کشیدن مصوت اُ'],
          ],
        },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h4-guided',
        exerciseIds: ['ex-kana-h4-clo-1', 'ex-kana-h4-dec-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h4-apply',
        examples: [
          {
            id: 'ex-stn-kana-h4-apply-0',
            role: 'varied',
            ja: 'おおさか',
            reading: 'اووساکا',
            fa: 'اوساکا (نام شهر)',
            whyFa: 'الگوی همان‌مصوت: お+お در ابتدای واژه.',
          },
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h4-independent',
        exerciseIds: ['ex-kana-h4-lis-1', 'ex-kana-h4-lis-2', 'ex-kana-h4-ind-1'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h4-rule-longvowel',
        patternJa: 'あ段+あ · い段+い · う段+う',
        titleFa: 'کارت مرجع: مصوتِ کشیده',
        bodyFa:
          'مصوتِ بلند = همان مصوت، دو برابر — با تکرار همان کانا نوشته می‌شود. جفت‌های واقعی که شنیدی: いえ/いいえ، え/ええ — کشش معنا را عوض می‌کند.',
        structureTable: {
          headers: ['واژهٔ کوتاه', 'واژهٔ بلند', 'تفاوت'],
          rows: [
            ['いえ (خانه) — ۲ مورا', 'いいえ (نه) — ۳ مورا', 'آیِ اول دوبار: い+い'],
            ['え (نقاشی) — ۱ مورا', 'ええ (بله) — ۲ مورا', 'اِی دوبار: え+え'],
            ['—', 'こうこう (دبیرستان) — ۴ مورا', 'دو کشش: こ+う و こ+う'],
          ],
        },
        persianBridgeFa:
          'با انگشت ضربه بشمار: «ایه» دو ضربه، «اییه» سه ضربه. اگر کشش را نمی‌شنوی، دو بار پخش کن و هم‌زمان بشمار.',
        honestyLabelFa: 'الگوی نوشتاری بر پایهٔ واج‌شناسی استاندارد ژاپنی؛ شمارش ضربه = مدل آموزشی ساده‌شدهٔ مورا.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h4-assessment',
        exerciseIds: ['ex-kana-h4-asm-1', 'ex-kana-h4-asm-2', 'ex-kana-h4-asm-3', 'ex-kana-h4-asm-4'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h4-wrapup',
        titleFa: 'قاعدهٔ طول مصوت — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: مصوتِ کشیده = دو برابرِ همان مصوت، نه «کمی بلندتر».',
          'جفت‌های واقعی را شنیدی و دیدی: いえ/いいえ، え/ええ — طول واکه معنا را عوض می‌کند.',
          'واژه‌های تازهٔ خواندنی: おおきい، おおさか — کشش را در نوشتارشان دیدی.',
        ],
      },
    ]"""

# ================================================================ H5 deck
H5_BLOCKS = """
[
      { kind: 'exercise', id: 'blk-stn-kana-h5-warmup', exerciseIds: ['ex-kana-h5-warm-1', 'ex-kana-h5-warm-2', 'ex-kana-h5-warm-3'] },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h5-prereq',
        titleFa: 'پیش از شروع: صامت‌های بی‌واک',
        items: [
          { glyph: 'か', readingFa: 'کا', noteFa: 'دست روی گلویت بگو: «کا» — گلو نمی‌لرزد (بی‌واک).' },
          { glyph: 'さ', readingFa: 'سا', noteFa: '«سا» هم بی‌واک است — مثل س/ک فارسی.' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h5-step-gakusei',
        role: 'notice',
        bodyFa:
          'این واژه «گاکوسِی» خوانده می‌شود — دانش‌آموز. گلیف اول か نیست: دو خطِ کوچک ゛ بالایش آن را واک‌دار کرده.',
        word: { ja: 'がくせい', readingFa: 'گاکوسِی', fa: 'دانش‌آموز', highlight: ['が'], beats: 4 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h5-contrast-koko',
        titleFa: 'فرق این دو واژه فقط یک ゛ است',
        a: { ja: 'ここ', readingFa: 'کوکو', fa: 'اینجا', highlight: [], beats: 2 },
        b: { ja: 'ごご', readingFa: 'گوگو', fa: 'بعدازظهر', highlight: ['ごご'], beats: 2 },
        ask: {
          questionFa: 'هر دو دو ضربه دارند — گوش بده و نگاه کن: فرقشان چیست؟',
          options: [
            { id: 'a', label: 'یکی ゛ (دو خط کوچک) دارد' },
            { id: 'b', label: 'یکی کشیده‌تر است' },
          ],
          correctOptionId: 'a',
          revealFa:
            'فقط ゛: ここ (اینجا) در برابر ごご (بعدازظهر). ゛ «ک» را «گ» می‌کند — معنا عوض می‌شود، طول‌ها یکی است.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h5-step-concept',
        role: 'explain',
        titleFa: 'داکوتن ゛',
        bodyFa:
          'داکوتن ゛ صامت را واک‌دار می‌کند — همان جفت‌هایی که از فارسی می‌دانی: ک/گ، س/ز. صدای جدیدی ساخته نمی‌شود؛ فقط گلو به لرزش می‌افتد.',
        miniTable: {
          headers: ['بی‌واک', 'با ゛', 'جفت فارسی'],
          rows: [
            ['か (کا)', 'が (گا)', 'ک / گ'],
            ['さ (سا)', 'ざ (زا)', 'س / ز'],
            ['き (کی)', 'ぎ (گی)', 'ک / گ'],
          ],
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h5-step-kazoku',
        role: 'notice',
        bodyFa:
          'این‌بار فقط یک گلیف واک‌دار شده: そ → ぞ. اگر ゛ را نبینی، «کاسوکو» می‌خوانی — واژه‌ای که وجود ندارد.',
        word: { ja: 'かぞく', readingFa: 'کازوکو', fa: 'خانواده', highlight: ['ぞ'], beats: 3 },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h5-guided',
        exerciseIds: ['ex-kana-h5-clo-1', 'ex-kana-h5-dec-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h5-apply',
        examples: [
          {
            id: 'ex-stn-kana-h5-apply-0',
            role: 'varied',
            ja: 'かいぎ',
            reading: 'کایگی',
            fa: 'جلسه',
            whyFa: 'واک‌دار در پایان واژه: き+゛ = ぎ.',
          },
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h5-apply-read',
        exerciseIds: ['ex-kana-h5-dec-2', 'ex-kana-h5-dec-3', 'ex-kana-h5-dec-4'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h5-independent',
        exerciseIds: ['ex-kana-h5-lis-1', 'ex-kana-h5-lis-2', 'ex-kana-h5-ind-1'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h5-rule-dakuten',
        patternJa: 'か→が · さ→ざ',
        titleFa: 'کارت مرجع: داکوتن ゛',
        bodyFa:
          '゛ = واک‌دار کردن صامت (ک→گ، س→ز). مفهوم را از فارسی داری — جفت‌های واک‌دار/بی‌واک؛ دشواری فقط «دیدنِ» علامت است.',
        structureTable: {
          headers: ['بی‌واک', 'با ゛ (واک‌دار)', 'جفت فارسی'],
          rows: [
            ['か (کا)', 'が (گا)', 'ک / گ'],
            ['さ (سا)', 'ざ (زا)', 'س / ز'],
            ['ここ (کوکو — اینجا)', 'ごご (گوگو — بعدازظهر)', 'جفت کمینه‌ای واقعی!'],
          ],
        },
        persianBridgeFa: 'تمرین فیزیکی: دست روی گلو، جفت‌ها را پشت‌سرهم بگو — کا/گا، سا/زا. همان لرزشی که در «ز» می‌شنوی، ゛ در نوشتن نشان می‌دهد.',
        honestyLabelFa: 'ردیف‌های た/は (だ/ば) بعداً همراه خودِ ردیف‌ها معرفی می‌شوند.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h5-assessment',
        exerciseIds: ['ex-kana-h5-asm-1', 'ex-kana-h5-asm-2', 'ex-kana-h5-asm-3', 'ex-kana-h5-asm-4'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h5-wrapup',
        titleFa: 'قاعدهٔ داکوتن — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: ゛ = واک‌دار کردن صامت (ک→گ، س→ز).',
          'جفت کمینه‌ای ここ/ごご را شنیدی و دیدی — فقط یک ゛ فرق دارد.',
          'واژه‌های تازهٔ خواندنی: かぞく، かいぎ — ゛ را در نوشتارشان دیدی.',
        ],
      },
    ]"""

# ================================================================ H6 deck
H6_BLOCKS = """
[
      { kind: 'exercise', id: 'blk-stn-kana-h6-warmup', exerciseIds: ['ex-kana-h6-warm-1', 'ex-kana-h6-warm-2', 'ex-kana-h6-warm-3'] },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h6-prereq',
        titleFa: 'اولین نگاه: سه جفتِ کوچک/بزرگ',
        items: [
          { glyph: 'ゃ', readingFa: 'یای کوچک', noteFa: 'به کانای قبل می‌چسبد.', firstLook: true },
          { glyph: 'や', readingFa: 'یا (یای بزرگ)', noteFa: 'مستقل — یک ضربهٔ خودش.', firstLook: true },
          { glyph: 'ゅ', readingFa: 'یوی کوچک', noteFa: 'چسبیده.', firstLook: true },
          { glyph: 'ゆ', readingFa: 'یو (یوی بزرگ)', noteFa: 'مستقل.', firstLook: true },
          { glyph: 'ょ', readingFa: 'یوی کوچکِ گرد', noteFa: 'چسبیده.', firstLook: true },
          { glyph: 'よ', readingFa: 'یُ (یوی بزرگِ گرد)', noteFa: 'مستقل.', firstLook: true },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h6-step-kyou',
        role: 'notice',
        bodyFa:
          '«امروز»: «کیو». ょ کوچک به き چسبیده و با آن «یک ضربه» شده است — نوشتنِ این واژه را بعدها می‌آموزی؛ الان فقط اندازه را ببین.',
        word: { ja: 'きょう', readingFa: 'کیو', fa: 'امروز', highlight: ['ょ'], beats: 2 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h6-contrast-kyou',
        titleFa: 'کوچک = فشرده، بزرگ = جدا',
        a: { ja: 'きょう', readingFa: 'کیو', fa: 'امروز (۲ ضربه)', highlight: ['ょ'], beats: 2 },
        b: { ja: 'きよう', readingFa: 'کی‌یو', fa: 'این شکل واژه نیست — よ بزرگ جدا مانده (۳ ضربه)', highlight: ['よ'], beats: 3 },
        ask: {
          questionFa: 'کدام دو ضربه است؟',
          options: [
            { id: 'a', label: 'きょう (با ょ کوچک)' },
            { id: 'b', label: 'きよう (با よ بزرگ)' },
          ],
          correctOptionId: 'a',
          revealFa:
            '«کیو» دو ضربه است (کیو — اُو)؛ «کی‌یو» سه ضربه (کی — یو — اُو). اندازهٔ ゃゅょ همان فشردگی است.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h6-step-concept',
        role: 'explain',
        titleFa: 'یُوئون — کوچک یعنی فشرده',
        bodyFa:
          'گانای کوچک ゃゅょ صدای مستقل ندارد — به کانای قبل می‌چسبد و با آن یک مورا می‌شود. اندازه در ژاپنی معنا دارد؛ مثل فرق «کیــا» و «کی‌یا» در تلفظ فارسی.',
        miniTable: {
          headers: ['فشرده (۱ مورا)', 'جدا (۲ مورا)', 'شنیدن'],
          rows: [
            ['きゃ = کیا', 'きや = کی‌یا', 'فشرده: یک ضربه'],
            ['しゃ = شا', 'しや = شی‌یا', 'فشرده: یک ضربه'],
          ],
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h6-predict-kaisha',
        role: 'notice',
        bodyFa: 'این واژه «شرکت» است. حدس بزن و جواب را ببین.',
        word: { ja: 'かいしゃ', readingFa: 'کایشا', fa: 'شرکت', highlight: ['しゃ'], beats: 3 },
        ask: {
          questionFa: '«しゃ» چند ضربه است؟',
          options: [
            { id: 'a', label: 'یک ضربه (فشرده)' },
            { id: 'b', label: 'دو ضربه (شی — یا)' },
          ],
          correctOptionId: 'a',
          revealFa: 'یک ضربه — «کایشا»: کا — اِی — شا. اگر «شی‌یا» بخوانی سه ضربهٔ جدا می‌شود.',
        },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h6-guided',
        exerciseIds: ['ex-kana-h6-clo-1', 'ex-kana-h6-prd-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h6-apply',
        examples: [
          {
            id: 'ex-stn-kana-h6-apply-0',
            role: 'varied',
            ja: 'いしゃ',
            reading: 'ایشا',
            fa: 'پزشک',
            whyFa: 'همان しゃ فشرده — با 「いしや» (ای-شی-یا) اشتباه نشود.',
          },
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h6-apply-read',
        exerciseIds: ['ex-kana-h6-dec-1', 'ex-kana-h6-dec-2', 'ex-kana-h6-dec-3', 'ex-kana-h6-dec-4'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h6-independent',
        exerciseIds: ['ex-kana-h6-lis-1', 'ex-kana-h6-lis-2'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h6-rule-yoon',
        patternJa: 'きゃ (۱ مورا) ≠ きや (۲ مورا)',
        titleFa: 'کارت مرجع: یُوئون ゃゅょ',
        bodyFa:
          'ゃゅょ کوچک = فشرده با کانای قبل (یک مورا)؛ やゆよ بزرگ = مورای مستقل. کوچک/بزرگ را دیدی و شنیدی: اندازه معنا می‌سازد.',
        structureTable: {
          headers: ['فشرده (۱ مورا)', 'جدا (۲ مورا)', 'شنیدن'],
          rows: [
            ['きゃ = کیا', 'きや = کی‌یا', 'فشرده: یک ضربه'],
            ['しゃ = شا', 'しや = شی‌یا', 'فشرده: یک ضربه'],
            ['きょう (امروز) = کیو', 'きよう = کی‌یو', 'معنا فقط در فشرده است'],
          ],
        },
        persianBridgeFa: 'این دو را بلند بگو: «کیّا» (یک‌تکه، مثل اسم کیا) و «کی‌یا» (دوتکه، با مکث). تفاوت کوچکِ نوشتاری همان تفاوت بزرگِ شنیداری است.',
        honestyLabelFa: 'ردیف ひ (و びょういن/びよういن) هنوز آموزش ندیده‌ای — این جفت معروف بعد از ردیف は می‌آید.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h6-assessment',
        exerciseIds: ['ex-kana-h6-asm-1', 'ex-kana-h6-asm-2', 'ex-kana-h6-asm-3', 'ex-kana-h6-asm-4'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h6-wrapup',
        titleFa: 'قاعدهٔ یُوئون — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: ゃゅょ کوچک = فشرده با کانای قبل (یک مورا).',
          'کوچک/بزرگ را دیدی و شنیدی: きょう ≠ きよう — اندازه معنا می‌سازد.',
          'واژه‌های تازهٔ خواندنی: いしゃ، かいしゃ — しゃ فشرده را در نوشتارشان دیدی.',
        ],
      },
    ]"""

# ================================================================ H7 deck (keeps glyph/writing blocks; inserts the teaching deck)
H7_BLOCKS = """
[
      {
        kind: 'writing-practice',
        id: 'blk-stn-kana-h7-writing',
        characters: ['ん'],
        initialMode: 'guided',
        instructionsFa: 'این نویسهٔ ویژهٔ پایان هیراگانا فقط یک ضربه دارد — از حافظه هم بنویسش.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h7-warmup',
        exerciseIds: ['ex-kana-h7-warm-1', 'ex-kana-h7-warm-2', 'ex-kana-h7-warm-3'],
      },
      { kind: 'kana-card', id: 'blk-stn-kana-h7-card-hira-n', kanaId: 'hira-n', showRomaji: false },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h7-prereq',
        titleFa: 'پیش از شروع: هر کانا، یک ضربه',
        items: [
          { glyph: 'さ', readingFa: 'سا', noteFa: 'یک ضربه.' },
          { glyph: 'せ', readingFa: 'سِ', noteFa: 'یک ضربه.' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h7-step-sensei',
        role: 'notice',
        bodyFa:
          '«معلم»: سِن — سِ — ای. ん خودش یک ضربهٔ کامل است، هم‌عرضِ هر کانا — نه یک «ن»ی سبکِ آخر واژه.',
        word: { ja: 'せんせい', readingFa: 'سِنسِی', fa: 'معلم / استاد', highlight: ['ん'], beats: 4 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h7-contrast-san',
        titleFa: 'همهٔ ضربه‌ها را بشمار',
        a: { ja: 'さん', readingFa: 'سان', fa: 'عدد ۳ / پسوند محترمانه', highlight: ['ん'], beats: 2 },
        b: { ja: 'せんせい', readingFa: 'سِنسِی', fa: 'معلم', highlight: ['ん'], beats: 4 },
        ask: {
          questionFa: '«سِنسِی» چند ضربه دارد؟',
          options: [
            { id: 'a', label: 'سه ضربه' },
            { id: 'b', label: 'چهار ضربه' },
          ],
          correctOptionId: 'b',
          revealFa:
            'چهار: سِ — ن — سِ — ای. اگر ん را نشماری «سِنسِ» می‌ماند — واژه‌ای که وجود ندارد.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h7-step-concept',
        role: 'explain',
        titleFa: 'ん — یک مورای کامل',
        bodyFa:
          '「ん」 صامتِ ساکتِ آخر نیست؛ یک ضربهٔ کامل است. نکتهٔ گوش: آوای ん با حرف بعدی کمی عوض می‌شود (مثل هم‌جذب فارسی) — اما در شمارش همیشه یک موراست.',
        miniTable: {
          headers: ['واژه', 'موراها', 'خوانش'],
          rows: [
            ['さん (عدد ۳)', 'さ+ん = ۲', 'سان'],
            ['せんせい (معلم)', 'せ+ん+せ+い = ۴', 'سِنسِی'],
          ],
        },
      },
      { kind: 'exercise', id: 'blk-stn-kana-h7-guided', exerciseIds: ['ex-kana-h7-nas-1', 'ex-kana-h7-nas-2'] },
      { kind: 'exercise', id: 'blk-stn-kana-h7-independent', exerciseIds: ['ex-kana-h7-lis-1', 'ex-kana-h7-asm-1'] },
      { kind: 'exercise', id: 'blk-stn-kana-h7-retrieval-1', exerciseIds: ['ex-kana-h7-rec-hira-n'] },
      { kind: 'exercise', id: 'blk-stn-kana-h7-recall', exerciseIds: ['ex-kana-h7-rcl-hira-n'] },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h7-rule-nasal',
        patternJa: 'せんせい = せ·ん·せ·い (۴ مورا)',
        titleFa: 'کارت مرجع: ん مورایی',
        bodyFa:
          '「ん» یک ضربهٔ کامل است، هم‌عرضِ هر کانا. اگر آن را «ن»ی سبک بخوانی و نشماری، 「せんせい» را «سِنسِ» می‌خوانی — و این واژه وجود ندارد.',
        structureTable: {
          headers: ['واژه', 'موراها', 'خوانش'],
          rows: [
            ['さん (عدد ۳)', 'さ+ん = ۲', 'سان'],
            ['せんせい (معلم)', 'せ+ん+せ+い = ۴', 'سِنسِی'],
            ['せんせ (نادرست)', 'واژهٔ ژاپنی نیست — مورای آخر حذف شده', '—'],
          ],
        },
        persianBridgeFa: 'با انگشت بشمار: سِ-ن-سِ-ی. چهار ضربه. اگر سه ضربه می‌شماریم، 「ん」 یا 「い» را جا انداخته‌ایم.',
        honestyLabelFa: 'تغییر آوای 「ん» بر اساس صامت بعد (m/n/ŋ) آگاهی‌بخش است — در سطح N5 ارزیابی نمی‌شود.',
      },
      { kind: 'exercise', id: 'blk-stn-kana-h7-listening', exerciseIds: ['ex-kana-h7-lis-hira-n'] },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h7-reading',
        examples: [
          {
            id: 'rd-stn-kana-h7-0',
            role: 'reading',
            ja: 'さん',
            reading: 'سان',
            fa: 'پسوند محترمانه پس از نام',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h7-1',
            role: 'reading',
            ja: 'せんせい',
            reading: 'سِنسِی',
            pronFa: '«اِی» آخر کشیده است و خمِ «ی» ندارد — «سِنسِیی» با «اِی» بلند (ē).',
            fa: 'معلم / استاد',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h7-2',
            role: 'reading',
            ja: 'かんこく',
            reading: 'کانکوکو',
            fa: 'کره',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h7-3',
            role: 'reading',
            ja: 'しゃしん',
            reading: 'شاشین',
            pronFa: '«شا» یک ضرب: «یـ»ی کوچک با «ش» یکی شده — «شاشین» (sha).',
            fa: 'عکس',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
        ],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h7-wrapup',
        titleFa: 'ん — جمع‌بندی',
        itemsFa: [
          '1 کانای جدید: ん(ن) — یک مورای کامل، نه «ن»ی سبک.',
          'شمارش ضربه را تمرین کردی: さん (۲)، せんせい (۴).',
          'کارت‌های مرور (FSRS) برای همین کاناها ثبت شدند — صف مرور روزانه به‌زودی فعال می‌شود.',
        ],
      },
    ]"""

# ================================================================ H13 deck
H13_BLOCKS = """
[
      { kind: 'exercise', id: 'blk-stn-kana-h13-warmup', exerciseIds: ['ex-kana-h13-warm-1', 'ex-kana-h13-warm-2', 'ex-kana-h13-warm-3'] },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h13-prereq',
        titleFa: 'پیش‌نیازهای این قاعده',
        items: [
          { word: 'きょう', readingFa: 'کیو', noteFa: 'ょ کوچک و فشرده را یادت هست؟ (قاعدهٔ یُوئون)' },
          { word: 'がくせい', readingFa: 'گاکوسِی', noteFa: '゛ را یادت هست؟ (قاعدهٔ داکوتن)' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h13-step-gakkou',
        role: 'notice',
        bodyFa:
          '«مدرسه»: گَک — کو — اُو. وسط واژه یک っ کوچک نشسته: صدا ندارد، اما یک ضربهٔ کاملِ سکوت و فشار است.',
        word: { ja: 'がっこう', readingFa: 'گَکّو', fa: 'مدرسه', highlight: ['っ'], beats: 4 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h13-contrast-gakkou',
        titleFa: 'با っ و بدون っ',
        a: { ja: 'がこう', readingFa: 'گاکو', fa: 'این شکل واژه نیست — っ حذف شده', highlight: [], beats: 3 },
        b: { ja: 'がっこう', readingFa: 'گَکّو', fa: 'مدرسه', highlight: ['っ'], beats: 4 },
        ask: {
          questionFa: 'کدام چهار ضربه دارد؟',
          options: [
            { id: 'a', label: 'がこう' },
            { id: 'b', label: 'がっこう' },
          ],
          correctOptionId: 'b',
          revealFa: 'چهار ضربه: が — っ — こ — う. بدون っ، «گاکو» می‌ماند — واژه نیست.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h13-step-concept',
        role: 'explain',
        titleFa: 'سوکوئون っ — تشدیدِ ژاپنی',
        bodyFa:
          'っ صامتِ بعدی را نگه می‌دارد و می‌فشارد — مثل «حقّ» در املای عربی. っ خودش صدا ندارد؛ یک مورای کامل است.',
        miniTable: {
          headers: ['با っ (درست)', 'بدون っ (نادرست)', 'شنیدن'],
          rows: [
            ['がっこう (مدرسه) — ۴ مورا', 'がこう (واژه نیست)', 'گَک…کو — مکث وسط'],
            ['ざっし (مجله) — ۳ مورا', 'ざし (واژه نیست)', 'زَش…شی'],
          ],
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h13-step-zasshi',
        role: 'notice',
        bodyFa:
          '«مجله»: زَشّی — سه مورا: ざ (داکوتن) — っ (فشار) — し. چند قاعده در یک واژه واقعی.',
        word: { ja: 'ざっし', readingFa: 'زَشّی', fa: 'مجله', highlight: ['っ'], beats: 3 },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h13-guided',
        exerciseIds: ['ex-kana-h13-prd-1', 'ex-kana-h13-clo-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h13-apply',
        examples: [
          {
            id: 'ex-stn-kana-h13-apply-0',
            role: 'varied',
            ja: 'ちょっと',
            reading: 'چُوتّو',
            fa: 'کمی',
            whyFa: 'ょ فشرده + っ فشار، پشت سر هم — سه قاعده در یک واژه.',
          },
          {
            id: 'ex-stn-kana-h13-apply-1',
            role: 'varied',
            ja: 'いっしょ',
            reading: 'ایْشّو',
            fa: 'با هم',
            whyFa: 'い+っ+しょ — فشار قبل از فشرده.',
          },
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h13-apply-read',
        exerciseIds: ['ex-kana-h13-dec-1', 'ex-kana-h13-dec-2', 'ex-kana-h13-dec-3', 'ex-kana-h13-dec-4'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h13-independent',
        exerciseIds: ['ex-kana-h13-lis-1', 'ex-kana-h13-lis-2'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h13-rule-sokuon',
        patternJa: 'がっこう = が·っ·こ·う (۴ مورا)',
        titleFa: 'کارت مرجع: سوکوئون っ',
        bodyFa:
          'っ کوچک = یک مورای فشار/مکث قبل از صامت — حذفش واژه را نابود می‌کند. مثل تشدید عربیِ درسی، با این فرق که っ خودش شکل نوشتاری دارد.',
        structureTable: {
          headers: ['با っ (درست)', 'بدون っ (نادرست)', 'شنیدن'],
          rows: [
            ['がっこう (مدرسه) — ۴ مورا', 'がこう (نادرست — واژه نیست)', 'گَک…کو — مکث وسط'],
            ['ざっし (مجله) — ۳ مورا', 'ざし (نادرست — واژه نیست)', 'زَش…شی'],
            ['いっしょ (با هم) — ۳ مورا', 'いしょ (نادرست)', 'ایْ…شو'],
          ],
        },
        persianBridgeFa: 'تمرین فیزیکی: دست روی گلو، «گَک…کو» بگو — لحظه‌ای که هوا بند می‌آید، همان っ است.',
        honestyLabelFa: 'تشدید عربیِ فارسی مقایسهٔ آموزشی است، نه ریشه‌شناسی — دو سازوکار مستقل با اثر شنیداری مشابه.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h13-assessment',
        exerciseIds: ['ex-kana-h13-asm-1', 'ex-kana-h13-asm-2', 'ex-kana-h13-asm-3', 'ex-kana-h13-asm-4'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h13-wrapup',
        titleFa: 'قاعدهٔ سوکوئون — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: っ کوچک = یک مورای فشار/مکث — حذفش واژه را نابود می‌کند.',
          'مکث را شنیدی و ساختی: がっこう، ざっし، ちょっと، いっしょ.',
          'واژه‌های ارزیابی تازه بودند: けっか، さっき — قاعده را به واژهٔ جدید منتقل کردی.',
        ],
      },
    ]"""

# ================================================================ H15 deck
H15_BLOCKS = """
[
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-warmup',
        exerciseIds: ['ex-kana-h15-warm-1', 'ex-kana-h15-warm-2', 'ex-kana-h15-warm-3'],
      },
      {
        kind: 'kana-card',
        id: 'blk-stn-kana-h15-card-hira-wa',
        kanaId: 'hira-wa',
        showRomaji: false,
        confusableNoteFa: 'با «ね» و «れ» اشتباه نشود.',
      },
      { kind: 'kana-card', id: 'blk-stn-kana-h15-card-hira-wo', kanaId: 'hira-wo', showRomaji: false },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-retrieval-1',
        exerciseIds: ['ex-kana-h15-rec-hira-wa', 'ex-kana-h15-rec-hira-wo'],
      },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-h15-prereq',
        titleFa: 'پیش از شروع: ردیف は و ゛',
        items: [
          { glyph: 'は', readingFa: 'ها', noteFa: 'بی‌علامت = «هـ».' },
          { word: 'でんわ', readingFa: 'دِنوا', noteFa: '゛ را یادت هست؟ (だ = た+゛) — تلفن.' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h15-step-sanpo',
        role: 'notice',
        bodyFa:
          '«پیاده‌روی»: سامپو. ぽ = ほ+゜ — دایرهٔ کوچک بالای گلیف، نه دو خطِ ゛.',
        word: { ja: 'さんぽ', readingFa: 'سامپو', fa: 'پیاده‌روی', highlight: ['ぽ'], beats: 3 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-h15-contrast-ba-pa',
        titleFa: 'دو خط در برابر دایره',
        a: { ja: 'ば', readingFa: 'با', fa: 'با ゛ (دو خط) — صدای «ب»', highlight: [], beats: 1 },
        b: { ja: 'ぱ', readingFa: 'پا', fa: 'با ゜ (دایره) — صدای «پ»', highlight: [], beats: 1 },
        ask: {
          questionFa: 'کدام «پ» است؟',
          options: [
            { id: 'a', label: 'ば' },
            { id: 'b', label: 'ぱ' },
          ],
          correctOptionId: 'b',
          revealFa: 'دایره ゜ = پ؛ دو خط ゛ = ب. فقط ردیف は این دایره را می‌گیرد.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h15-step-concept',
        role: 'explain',
        titleFa: 'هان‌داکوتن ゜',
        bodyFa:
          'ردیف は سه حالت دارد: بی‌علامت (هـ)، دو خط ゛ (ب)، دایرهٔ ゜ (پ) — مثل ه/ب/پ فارسی. دایره فقط برای همین ردیف است: «か゜» نداریم.',
        miniTable: {
          headers: ['شکل', 'علامت', 'صدا', 'مثال'],
          rows: [
            ['は', 'بی‌علامت', 'هـ', 'ほん (کتاب)'],
            ['ば', '゛ دو خط', 'ب', '—'],
            ['ぱ', '゜ دایره', 'پ', 'さんぽ (پیاده‌روی)'],
          ],
        },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-guided',
        exerciseIds: ['ex-kana-h15-clo-1', 'ex-kana-h15-asm-1'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-independent',
        exerciseIds: ['ex-kana-h15-lis-1', 'ex-kana-h15-lis-2'],
      },
      {
        kind: 'writing-practice',
        id: 'blk-stn-kana-h15-writing',
        characters: ['わ', 'を'],
        initialMode: 'guided',
        focusPairs: [['わ', 'れ']],
        instructionsFa:
          'کاناهای این ردیف را با دست بنویس: اول «نمایش ترتیب» را ببین، بعد در «روی الگو» بکش و در پایان با «از حافظه» امتحانش کن.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-recall',
        exerciseIds: ['ex-kana-h15-rcl-hira-wa', 'ex-kana-h15-rcl-hira-wo'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-h15-rule-handakuten',
        patternJa: 'は → ば (゛) → ぱ (゜)',
        titleFa: 'کارت مرجع: هان‌داکوتن ゜',
        bodyFa:
          'ردیف 「は» سه حالت دارد: بی‌علامت (هـ)، با دو خطِ ゛ (ب)، و با دایرهٔ کوچک ゜ (پ) — دقیقاً مثل ه/ب/پ فارسی. خط رایجِ خطا: ゛ و ゜ را قاطی کردن.',
        structureTable: {
          headers: ['شکل', 'علامت', 'صدا', 'مثال'],
          rows: [
            ['は', 'بی‌علامت', 'هـ', 'ほん (کتاب)'],
            ['ば', '゛ دو خط', 'ب', '—'],
            ['ぱ', '゜ دایره', 'پ', 'ぱん (نان)، さんぽ (پیاده‌روی)'],
          ],
        },
        persianBridgeFa: 'سه‌گانهٔ ه/ب/پ را از فارسی می‌دانی — فقط یاد بگیر کدام علامت کدام است: دو خط = ب، دایره = پ.',
        honestyLabelFa: '—',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-assessment',
        exerciseIds: ['ex-kana-h15-asm-2'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-h15-listening',
        exerciseIds: ['ex-kana-h15-lis-hira-wa', 'ex-kana-h15-lis-hira-wo'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-h15-reading',
        examples: [
          {
            id: 'rd-stn-kana-h15-0',
            role: 'reading',
            ja: 'わたし',
            reading: 'واتاشی',
            fa: 'من',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h15-1',
            role: 'reading',
            ja: 'でんわ',
            reading: 'دِنوا',
            pronFa: '«ن» پیش از «وا» آهنگی میان «ن» و «نگ» است — نوک زبان به دندان نمی‌خورد (n).',
            fa: 'تلفن',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h15-2',
            role: 'reading',
            ja: 'えんぴつ',
            reading: 'اِمپیتسو',
            pronFa: '«ن» نرم، بعد «پیتسو» — «تس» یک ضرب است، نه «تِسِ» جدا (pitsu).',
            fa: 'مداد',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
          {
            id: 'rd-stn-kana-h15-3',
            role: 'reading',
            ja: 'さんぽ',
            reading: 'سامپو',
            pronFa: '«ن» پیش از «پ» مثل «م» تلفظ می‌شود — لب‌ها بسته می‌شوند: «سامپو» (n→m).',
            fa: 'پیاده‌روی',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },
        ],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-h15-wrapup',
        titleFa: 'ردیف わ + قاعدهٔ هان‌داکوتن — جمع‌بندی',
        itemsFa: [
          '2 کانای جدید: わ(وا)، を(اُ) + قاعدهٔ ゜: دایره = پ (فقط ردیف は).',
          'سه‌گانهٔ は/ば/ぱ را دیدی و شنیدی — ゛ و ゜ را دیگر قاطی نمی‌کنی.',
          'واژه‌های تازهٔ خواندنی: わたし، えんぴつ، さんぽ.',
        ],
      },
    ]"""

# ================================================================ K8 deck
K8_BLOCKS = """
[
      { kind: 'exercise', id: 'blk-stn-kana-k8-warmup', exerciseIds: ['ex-kana-k8-warm-1', 'ex-kana-k8-warm-2', 'ex-kana-k8-warm-3'] },
      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k8-prereq',
        titleFa: 'پیش از شروع: کشش در هیراگانا',
        items: [
          { word: 'こうこう', readingFa: 'کووکوو', noteFa: 'در هیراگانا کشش را با تکرار مصوت نوشتیم: こ+う. کاتاکانا راه کوتاه‌تری دارد.' },
        ],
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-k8-step-kohi',
        role: 'notice',
        bodyFa:
          '«قهوه»: کوو — هیی. هر خطِ افقی ー یعنی: مصوتِ قبلی، یک ضربهٔ دیگر.',
        word: { ja: 'コーヒー', readingFa: 'کووهی', fa: 'قهوه', highlight: ['ー'], beats: 4 },
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-k8-contrast-kohi',
        titleFa: 'با ー و بدون ー',
        a: { ja: 'コヒー', readingFa: 'کوهی', fa: 'این شکل واژه نیست — کششِ اول حذف شده', highlight: [], beats: 3 },
        b: { ja: 'コーヒー', readingFa: 'کووهی', fa: 'قهوه', highlight: ['ー'], beats: 4 },
        ask: {
          questionFa: 'کدام «قهوه» است؟',
          options: [
            { id: 'a', label: 'コヒー' },
            { id: 'b', label: 'コーヒー' },
          ],
          correctOptionId: 'b',
          revealFa: 'دو ー: بعد از コ و بعد از ヒ — «کووهی»، چهار ضربه.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-k8-step-concept',
        role: 'explain',
        titleFa: 'کوچوئون‌پو ー',
        bodyFa:
          'ー خطی است که مصوتِ قبل را تکرار می‌کند — یک مورا. فقط در کاتاکانا است؛ در هیراگانا چنین خطی نداریم (آنجا الگوهای تکرار مصوت را می‌نویسیم).',
        miniTable: {
          headers: ['با ー (درست)', 'بدون ー (نادرست)', 'شنیدن'],
          rows: [
            ['コーヒー (قهوه) — ۴ مورا', 'コヒー (واژه نیست)', 'کوو — هیی'],
            ['ジュース (آب‌میوه) — ۳ مورا', 'ジュス (واژه نیست)', 'جوو — س'],
          ],
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-k8-predict-taxi',
        role: 'notice',
        bodyFa: 'این واژه «تاکسی» است. حدس بزن و جواب را ببین.',
        word: { ja: 'タクシー', readingFa: 'تاکوشیی', fa: 'تاکسی', highlight: ['ー'], beats: 4 },
        ask: {
          questionFa: '「تاکسی» با چند ー نوشته می‌شود؟',
          options: [
            { id: 'a', label: 'بدون ー' },
            { id: 'b', label: 'با یک ー (آخر)' },
          ],
          correctOptionId: 'b',
          revealFa: 'タ・ク・シ・ー — کشش فقط آخر: «تاکوشیی». صدای «شی» خودش بلند می‌شود.',
        },
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-k8-guided',
        exerciseIds: ['ex-kana-k8-clo-1', 'ex-kana-k8-dec-1'],
      },
      {
        kind: 'example-set',
        id: 'blk-stn-kana-k8-apply',
        examples: [
          {
            id: 'ex-stn-kana-k8-apply-0',
            role: 'varied',
            ja: 'ジュース',
            reading: 'جووس',
            fa: 'آب‌میوه',
            whyFa: 'ジュ+ー+ス — کششِ «او».',
          },
          {
            id: 'ex-stn-kana-k8-apply-1',
            role: 'varied',
            ja: 'ボールペン',
            reading: 'بوولپِن',
            fa: 'خودکار',
            whyFa: 'کشش فقط در «بوو»؛ «پِن» کوتاه.',
          },
        ],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-k8-apply-read',
        exerciseIds: ['ex-kana-k8-dec-2', 'ex-kana-k8-dec-3', 'ex-kana-k8-dec-4'],
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-k8-independent',
        exerciseIds: ['ex-kana-k8-lis-1', 'ex-kana-k8-lis-2'],
      },
      {
        kind: 'rule-card',
        id: 'blk-stn-kana-k8-rule-choonpu',
        patternJa: 'コーヒー = コ·ー·ヒ·ー (۴ مورا)',
        titleFa: 'کارت مرجع: کوچوئون‌پو ー',
        bodyFa:
          'ー = تکرار مصوتِ قبل (یک مورا) — فقط در کاتاکانا. در هیراگانا چنین خطی نداریم؛ آنجا با الگوهای تکرار مصوت می‌نویسیم.',
        structureTable: {
          headers: ['با ー (درست)', 'بدون ー (نادرست)', 'شنیدن'],
          rows: [
            ['コーヒー (قهوه) — ۴ مورا', 'コヒー (نادرست)', 'کوو — هیی'],
            ['ジュース (آب‌میوه) — ۳ مورا', 'ジュス (نادرست)', 'جوو — س'],
            ['タクシー (تاکسی) — ۴ مورا', 'タクシ (نادرست)', 'تا — کُو — شیی'],
          ],
        },
        persianBridgeFa: 'مثل کشیدنِ «آ» در خط فارسی: خودِ خط صدا ندارد، فقط مصوتِ قبل را کش می‌دهد. فرقش: در ژاپنی این کشش واجی است.',
        honestyLabelFa: 'در برخی وام‌واژه‌ها (تلفظ‌های فرانسوی‌گونه) ー رفتار متفاوت دارد — خارج از دامنهٔ N5.',
      },
      {
        kind: 'exercise',
        id: 'blk-stn-kana-k8-assessment',
        exerciseIds: ['ex-kana-k8-asm-1', 'ex-kana-k8-asm-2', 'ex-kana-k8-asm-3'],
      },
      {
        kind: 'wrap-up',
        id: 'blk-stn-kana-k8-wrapup',
        titleFa: 'قاعدهٔ کوچوئون‌پو — جمع‌بندی',
        itemsFa: [
          'قاعدهٔ تازه: ー = تکرار مصوت قبل (یک مورا) — فقط در کاتاکانا.',
          'جفت‌های با/بدون ー را دیدی و شنیدی: コーヒー، ジュース، タクシー.',
          'واژه‌های ارزیابی تازه بودند: ケーキ، コーラ — قاعده را به وام‌واژهٔ جدید منتقل کردی.',
        ],
      },
    ]"""

# ================================================================ K13 deck (inserted after the scene; rest kept)
K13_INSERT = """      {
        kind: 'rule-prereq',
        id: 'blk-stn-kana-k13-prereq',
        titleFa: 'دو خط، یک زبان',
        items: [
          { word: 'ねこ', readingFa: 'نِکو', noteFa: 'گربه — واژهٔ بومی → هیراگانا.' },
          { word: 'コーヒー', readingFa: 'کووهی', noteFa: 'قهوه — وام‌واژه → کاتاکانا.' },
        ],
      },
      {
        kind: 'rule-contrast',
        id: 'blk-stn-kana-k13-contrast-neko',
        titleFa: 'یک واژه، دو خط',
        a: { ja: 'ねこ', readingFa: 'نِکو', fa: 'گربه — صورت اصلیِ واژهٔ بومی: هیراگانا', highlight: [], beats: 2 },
        b: { ja: 'ネコ', readingFa: 'نِکو', fa: 'همان «گربه» — با کاتاکانا (تأکید/سبک نمایشی)', highlight: [], beats: 2 },
        ask: {
          questionFa: 'وام‌واژه‌ها (مثل قهوه، تاکسی) با کدام خط نوشته می‌شوند؟',
          options: [
            { id: 'a', label: 'هیراگانا' },
            { id: 'b', label: 'کاتاکانا' },
          ],
          correctOptionId: 'b',
          revealFa: 'کاتاکانا — وام‌واژه‌ها، نام‌های خارجی و روی‌نوشت‌های آهنگین. نام خودت هم با کاتاکانا نوشته می‌شود.',
        },
      },
      {
        kind: 'rule-step',
        id: 'blk-stn-kana-k13-step-script-rule',
        role: 'explain',
        titleFa: 'قاعدهٔ انتخاب خط',
        bodyFa:
          'واژه‌های بومی و پایانندهای دستوری → هیراگانا؛ وام‌واژه‌ها، نام‌های خارجی و تأکید → کاتاکانا. همین قاعده را در تمرین‌های بعدی روی واژه‌های واقعی پیاده می‌کنی.',
      },
"""

# ---------------------------------------------------------------- apply
replace_blocks('stn-kana-h4', H4_BLOCKS, "[]")
replace_blocks('stn-kana-h5', H5_BLOCKS, "[]")
replace_blocks('stn-kana-h6', H6_BLOCKS, "['や', 'ゆ', 'よ']")
replace_blocks('stn-kana-h7', H7_BLOCKS, "[]")
replace_blocks('stn-kana-h13', H13_BLOCKS, "[]")
replace_blocks('stn-kana-h15', H15_BLOCKS, "[]")
replace_blocks('stn-kana-k8', K8_BLOCKS, "[]")

# K13: insert the deck right after the scene block + declare introduces
sp = station_span('stn-kana-k13')
body = src[sp[0]:sp[1]]
anchor = "      {\n        kind: 'exercise',\n        id: 'blk-stn-kana-k13-script-drill',"
if anchor not in body:
    fail('K13 drill anchor not found')
body = body.replace(anchor, K13_INSERT + anchor)
if 'introducesGlyphs:' not in body:
    mm = re.search(r'(mastery: \{ threshold: 0\.7 \},\n)', body)
    if not mm:
        fail('K13 mastery line not found')
    body = body[:mm.end()] + '    introducesGlyphs: [],\n' + body[mm.end():]
src = src[:sp[0]] + body + src[sp[1]:]

# ---- station-side reading fixes
# H1: いえ reading «ایِ» → «ایه» (line ~168, inside H1 reading example)
old = "            reading: 'ایِ',"
if src.count(old) != 1:
    fail(f'H1 いえ reading anchor count = {src.count(old)}')
src = src.replace(old, "            reading: 'ایه',")

# K11: ノート reading «نُوتو» → «نووتو» (canonical long-vowel convention)
old = "reading: 'نُوتو',"
if src.count(old) != 1:
    fail(f'K11 ノート reading anchor count = {src.count(old)}')
src = src.replace(old, "reading: 'نووتو',")

# K12: add the びょういん reading example (the famous pair, now legal — ひ taught here)
anchor = "ja: 'ほん',"
idx = src.find(anchor)
if idx < 0:
    fail('K12 ほん anchor not found')
# find the end of that example object (next '},' at the example nesting level)
end = src.find('},', idx)
if end < 0:
    fail('K12 example end not found')
insert_after = end + 1
new_example = """
          {
            id: 'rd-stn-kana-h12-2',
            role: 'reading',
            ja: 'びょういん',
            reading: 'بیووین',
            pronFa: '«بیوو» یک‌ضربه‌چسبیده (びょ) + «اِی» کشیده — جفت معروف: びょういん (بیمارستان) در برابر びよういん (آرایشگاه!).',
            fa: 'بیمارستان',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },"""
src = src[:insert_after] + new_example + src[insert_after:]

# estMinutes bumps (decks are ~1.5-2 min richer than the old single-card lessons)
bump_minutes('stn-kana-h4', 14)
bump_minutes('stn-kana-h5', 13)
bump_minutes('stn-kana-h6', 15)
bump_minutes('stn-kana-h7', 12)
bump_minutes('stn-kana-h13', 15)
bump_minutes('stn-kana-h15', 16)
bump_minutes('stn-kana-k8', 14)
bump_minutes('stn-kana-k13', 13)

open(PATH, 'w').write(src)
print('OK — 7 stations rebuilt as slide decks + K13 deck inserted + H1/K11/K12 fixes + estMinutes bumps')
