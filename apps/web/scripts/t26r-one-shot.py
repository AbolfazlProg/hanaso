#!/usr/bin/env python3
"""TASK-HANASO-26R — ONE-SHOT restoration of all station changes (PHASE 4).
Idempotent pieces; run after the accidental `git checkout --` revert.
Order: (1) physical reorder  (2) prereq chain  (3) h6 firstLook removal +
prereq-block rewrite  (4) byouin h12->h6  (5) shashin h7->h6  (6) h12 dakuten-ha
teaching step  (7) h14 yoon reading -> clean word  (8) P0 text fixes.
"""
import re, sys

P = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
src = open(P, encoding='utf-8').read()
report = []

# ---------- (1) physical reorder -------------------------------------------
NEW_H = ['stn-kana-h0','stn-kana-h1','stn-kana-h2','stn-kana-h3','stn-kana-h4',
         'stn-kana-h5','stn-kana-h7','stn-kana-h8','stn-kana-h9','stn-kana-h10',
         'stn-kana-h11','stn-kana-h12','stn-kana-h14','stn-kana-h6','stn-kana-h13',
         'stn-kana-h15','stn-kana-m1-reading']
starts = [m.start() for m in re.finditer(r"(?m)^  \{\n(?:[ \t]*\*[^\n]*\n|[ \t]*/\*[^\n]*\n|[ \t]*//[^\n]*\n)*[ \t]*slug: 'stn-kana-", src)]
slugs_in_file = re.findall(r"\n    slug: '(stn-kana-[a-z0-9-]+)'", src)
if slugs_in_file[:17] != NEW_H:
    bounds = starts + [len(src)]
    header = src[:starts[0]]
    blocks = []
    for i in range(len(starts)):
        blk = src[bounds[i]:bounds[i+1]]
        blocks.append((re.search(r"slug: '(stn-kana-[a-z0-9-]+)'", blk).group(1), blk))
    by = dict(blocks)
    REST = [s for s, _ in blocks if s not in NEW_H]
    src = header + ''.join(by[s] for s in NEW_H + REST)
    report.append(f'(1) reordered: {len(blocks)} stations')
    # renumber orders
    cnt = [0]
    def renum(m):
        cnt[0] += 1
        return f"    order: {cnt[0]},"
    src = re.sub(r"(?m)^    order: \d+,$", renum, src)
    report.append(f'(1) orders renumbered 1..{cnt[0]}')
else:
    report.append('(1) already reordered')

# ---------- (2) prereq chain ------------------------------------------------
CHAIN = {'stn-kana-h0': [], 'stn-kana-h1': ['stn-kana-h0'], 'stn-kana-h2': ['stn-kana-h1'],
 'stn-kana-h3': ['stn-kana-h2'], 'stn-kana-h4': ['stn-kana-h3'],
 'stn-kana-h5': ['stn-kana-h4'], 'stn-kana-h7': ['stn-kana-h5'],
 'stn-kana-h8': ['stn-kana-h7'], 'stn-kana-h9': ['stn-kana-h8'],
 'stn-kana-h10': ['stn-kana-h9'], 'stn-kana-h11': ['stn-kana-h10'],
 'stn-kana-h12': ['stn-kana-h11'], 'stn-kana-h14': ['stn-kana-h12'],
 'stn-kana-h6': ['stn-kana-h14'], 'stn-kana-h13': ['stn-kana-h6'],
 'stn-kana-h15': ['stn-kana-h13']}
parts = re.split(r"(?m)^(?=  \{)", src)
out = []
npr = 0
for part in parts:
    m = re.search(r"slug: '(stn-kana-[a-z0-9-]+)'", part)
    if m and m.group(1) in CHAIN:
        reps = '[' + ', '.join(f"'{p}'" for p in CHAIN[m.group(1)]) + ']'
        part, n = re.subn(r"prerequisites: \[[^\]]*\]", f"prerequisites: {reps}", part, count=1)
        npr += n
    out.append(part)
src = ''.join(out)
report.append(f'(2) prereq chain rewritten: {npr}/16')

# ---------- (3) h6 firstLook removal + prereq block rewrite ----------------
if "introducesGlyphs: ['や', 'ゆ', 'よ']," in src:
    src = src.replace("introducesGlyphs: ['や', 'ゆ', 'よ'],", "introducesGlyphs: [],")
    report.append('(3) h6 introducesGlyphs -> []')
old_prereq = """        titleFa: 'اولین نگاه: سه جفتِ کوچک/بزرگ',
        items: [
          { glyph: 'ゃ', readingFa: 'یای کوچک', noteFa: 'به کانای قبل می‌چسبد.', firstLook: true },
          { glyph: 'や', readingFa: 'یا (یای بزرگ)', noteFa: 'مستقل — یک ضربهٔ خودش.', firstLook: true },
          { glyph: 'ゅ', readingFa: 'یوی کوچک', noteFa: 'چسبیده.', firstLook: true },
          { glyph: 'ゆ', readingFa: 'یو (یوی بزرگ)', noteFa: 'مستقل.', firstLook: true },
          { glyph: 'ょ', readingFa: 'یوی کوچکِ گرد', noteFa: 'چسبیده.', firstLook: true },
          { glyph: 'よ', readingFa: 'یُ (یوی بزرگِ گرد)', noteFa: 'مستقل.', firstLook: true },
        ],"""
new_prereq = """        titleFa: 'یادآوری ردیف や و دوقلوهای کوچکش',
        items: [
          { glyph: 'や', readingFa: 'یا', noteFa: 'یادت هست؟ مستقل — یک ضربهٔ خودش.' },
          { glyph: 'ゆ', readingFa: 'یو', noteFa: 'مستقل — یک ضربهٔ خودش.' },
          { glyph: 'よ', readingFa: 'یُ', noteFa: 'مستقل — یک ضربهٔ خودش.' },
          { glyph: 'ゃ', readingFa: 'دوقلوی کوچک や', noteFa: 'همان شکل، ولی کوچک — به کانای قبل می‌چسبد.' },
          { glyph: 'ゅ', readingFa: 'دوقلوی کوچک ゆ', noteFa: 'همان شکل، ولی کوچک — چسبیده.' },
          { glyph: 'ょ', readingFa: 'دوقلوی کوچک よ', noteFa: 'همان شکل، ولی کوچک — چسبیده.' },
        ],"""
if old_prereq in src:
    src = src.replace(old_prereq, new_prereq)
    report.append('(3) h6 prereq block -> review (no firstLook)')

# ---------- (4) byouin block h12 -> h6 --------------------------------------
m = re.search(r"      \{\n        kind: 'rule-step',\n        id: 'blk-stn-kana-h12-step-byouin'.*?\n      \},\n", src, re.S)
if m:
    blk = m.group(0)
    src = src.replace(blk, '', 1)
    blk2 = blk.replace("id: 'blk-stn-kana-h12-step-byouin',", "id: 'blk-stn-kana-h6-step-byouin',")
    blk2 = blk2.replace(
      "'حالا که ردیف は را داری، این جفت معروف را ببین: びょういん (بیمارستان) در برابر びよういん (آرایشگاه!) — یک نویسهٔ کوچک/بزرگ، دو جهان.',",
      "'یک جفت معروف که حالا می‌توانی کامل بخوانی: びょういん (بیمارستان) در برابر びよういん (آرایشگاه!) — یک نویسهٔ کوچک/بزرگ، دو جهان.',")
    anchor = "      {\n        kind: 'rule-card',\n        id: 'blk-stn-kana-h6-rule-yoon',"
    src = src.replace(anchor, blk2 + anchor, 1)
    report.append('(4) byouin h12 -> h6')

# ---------- (5) shashin h7 -> h6 --------------------------------------------
old_sh = """      {
            id: 'rd-stn-kana-h7-3',
            role: 'reading',
            ja: 'しゃしん',
            reading: 'شاشین',
            pronFa: '«شا» یک ضرب: «یـ»ی کوچک با «ش» یکی شده — «شاشین» (sha).',
            fa: 'عکس',
            whyFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
          },"""
if old_sh in src:
    src = src.replace(old_sh, '', 1)
    blk = """      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h6-step-shashin',
        role: 'notice',
        titleFa: 'خواندن با یُوئون: しゃしん',
        bodyFa:
          'حالا یک واژهٔ واقعی با ゃ: しゃしん (عکس). «しゃ» فشردهٔ «ش» + «یا» است — یک ضربه.',
        word: { ja: 'しゃしん', readingFa: 'شاشین', fa: 'عکس', highlight: ['しゃ'], beats: 2 },
      },
"""
    anchor = "      {\n        kind: 'rule-card',\n        id: 'blk-stn-kana-h6-rule-yoon',"
    src = src.replace(anchor, blk + anchor, 1)
    report.append('(5) shashin h7 -> h6')

# ---------- (6) h12 dakuten-ha teaching step (so ぶ/ば readings are legal) ---
if "blk-stn-kana-h12-step-dakuten-ha" not in src:
    # insert a rule-step BEFORE the example-set block that contains h12's readings
    i = src.find("id: 'rd-stn-kana-h12-2'")
    if i != -1:
        blk_start = src.rfind("      {\n", 0, i)
        step = """{
        kind: 'rule-step',
        id: 'blk-stn-kana-h12-step-dakuten-ha',
        role: 'explain',
        titleFa: 'داکوتن ردیف は — همان قاعدهٔ آشنا',
        bodyFa:
          'ردیف は هم مثل か و さ با ゛ واک‌دار می‌شود: は→ば، ひ→び、ふ→ぶ. قاعدهٔ جدیدی نیست — فقط سه صدای تازه با همان ゛.',
        miniTable: {
          headers: ['بی‌واک', 'با ゛', 'واژه'],
          rows: [
            ['は (ها)', 'ば (با)', 'かばん — کیف'],
            ['ひ (هی)', 'び (بی)', 'بعداً با یُوئون!'],
            ['ふ (فو)', 'ぶ (بو)', 'しんぶん — روزنامه'],
          ],
        },
      },
      """
        src = src[:blk_start] + step + src[blk_start:]
        report.append('(6) h12 dakuten-ha teaching step added')

# ---------- (7) h14 reading with ょ -> clean やま word ----------------------
i = src.find("id: 'rd-stn-kana-h14-3'")
if i != -1:
    seg = src[i-200:i+500]
    if 'ょ' in seg:
        # replace the whole reading item with a clean yama example
        m = re.search(r"\{\s*\n\s*id: 'rd-stn-kana-h14-3',.*?\n\s*\},", src, re.S)
        if m:
            new_item = """{
            id: 'rd-stn-kana-h14-3',
            role: 'reading',
            ja: 'やま',
            reading: 'یاما',
            pronFa: 'دو ضربهٔ روشن: یا — ما.',
            fa: 'کوه',
            whyFa: 'فقط با や همین‌جا آموختی و ま از ردیف قبل — کاملاً خواندنی است.',
          },"""
            src = src[:m.start()] + new_item + src[m.end():]
            report.append('(7) h14-3 yoon word -> clean やま')

# ---------- (8) P0 text fixes -----------------------------------------------
fixes = [
  ("'قاعدهٔ صادق فاز K: همان ۴۶ صدا، صورت دوم — وام‌واژه‌های آماده به‌عنوان اشتها (الگوی H0)؛ اولین بازگشایی واقعی در K2؛ انت',",
   "'قاعدهٔ صادق فاز K: همان ۴۶ صدا، این‌بار با صورت دوم (کاتاکانا). وام‌واژه‌های آماده اشتهایت را باز می‌کنند و بازگشایی واقعی در K2 ادامه می‌یابد.',"),
  ('FEAT-158 — تمرین بازشناسی با فیلتر ردیف/خط، خارج از مسیر اصلی',
   'تمرین آزاد بازشناسی: ردیف و خط را خودت انتخاب می‌کنی، خارج از مسیر اصلی درس.'),
  ('آویخته، هرگز گیت نمی‌شود (spec §3)', 'اختیاری است و دروازهٔ فصل را قفل نمی‌کند.'),
  ('ル(رو)، レ(ره)、ロ(رُ)', 'ル(رو)، レ(ره)、ロ(رو)'),
  ("این دو را بلند بگو: «کیّا» (یک‌تکه، مثل اسم کیا) و «کی‌یا» (دوتکه، با مکث). تفاوت کوچکِ نوشتاری همان تفاوت بزرگِ شنیداری است.",
   "اسم «کیّا» را یک‌تکه می‌گویی؛ اما اگر وسطش مکث کنی «کی‌یا» می‌شود — دو تکهٔ جدا. ゃゅょ کوچک = یک‌تکه؛ やゆよ بزرگ = دوتکه."),
]
for old, new in fixes:
    if old in src:
        src = src.replace(old, new)
        report.append(f'(8) text fix: {old[:28]}…')

open(P, 'w', encoding='utf-8').write(src)
print('\n'.join(report))
slugs = re.findall(r"\n    slug: '(stn-kana-[a-z0-9-]+)'", src)
print('FINAL ORDER (first 17):', ' '.join(slugs[:17]))
