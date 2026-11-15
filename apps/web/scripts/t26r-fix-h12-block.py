#!/usr/bin/env python3
"""TASK-HANASO-26R fix-2 — relocate blk-stn-kana-h12-step-dakuten-ha from
INSIDE the example-set's examples[] array (wrong: causes decomposeJa TypeError
because example rows are iterated as reading items with .ja strings) to a
sibling block BEFORE the example-set at the blocks level.
Also fixes the Japanese comma (、) slipped into Persian bodyFa.
Idempotent: exits 0 if the block is already at blocks level.
"""
import re, sys

P = 'apps/web/src/modules/curriculum/content/chapter-kana01.stations.ts'
src = open(P, encoding='utf-8').read()

# 1) extract the misplaced rule-step from inside examples[]
m = re.search(
    r"[ ]*\{\n\s*kind: 'rule-step',\n\s*id: 'blk-stn-kana-h12-step-dakuten-ha',.*?\n\s*\},\n",
    src, re.S)
if not m:
    if re.search(r"kind: 'example-set',\s*\n\s*id: 'blk-stn-kana-h12-reading'", src) and \
       src.find("blk-stn-kana-h12-step-dakuten-ha") < src.find("blk-stn-kana-h12-reading") and \
       re.search(r"^      \{$", src[max(0, src.find("blk-stn-kana-h12-step-dakuten-ha") - 200):src.find("blk-stn-kana-h12-step-dakuten-ha")], re.M):
        print('already at blocks level — nothing to do'); sys.exit(0)
    print('FATAL: block not found anywhere'); sys.exit(1)

step_raw = m.group(0)
# remove it from the examples array (with the preceding newline/indent kept tidy)
src = src.replace(step_raw, '', 1)

# 2) normalize the block to blocks-level formatting (6-space indent keys)
step = """      {
        kind: 'rule-step',
        id: 'blk-stn-kana-h12-step-dakuten-ha',
        role: 'explain',
        titleFa: 'داکوتن ردیف は — همان قاعدهٔ آشنا',
        bodyFa:
          'ردیف は هم مثل か و さ با ゛ واک‌دار می‌شود: は→ば، ひ→び، ふ→ぶ. قاعدهٔ جدیدی نیست — فقط سه صدای تازه با همان ゛.',
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

# 3) insert as a sibling block BEFORE the example-set that holds h12 readings
anchor = "      {\n        kind: 'example-set',\n        id: 'blk-stn-kana-h12-reading',"
if anchor not in src:
    print('FATAL: example-set anchor not found'); sys.exit(1)
src = src.replace(anchor, step + anchor, 1)

open(P, 'w', encoding='utf-8').write(src)

# verify: the block no longer sits between "examples: [" and the next "],"
ex = re.search(r"id: 'blk-stn-kana-h12-reading',\s*examples: \[(.*?)\n        \],", src, re.S)
bad = ex and 'rule-step' in ex.group(1)
print('relocated OK;' if not bad else 'STILL INSIDE examples!', )
sys.exit(1 if bad else 0)
