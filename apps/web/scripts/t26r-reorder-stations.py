#!/usr/bin/env python3
"""TASK-HANASO-26R PHASE 4a — physically reorder station blocks in
chapter-kana01.stations.ts so the Yōon rule comes AFTER the や row.

New hiragana order: h0..h5, h7(ん), h8(な), h9(た), h10(ま), h11(ら), h12(は),
h14(や row), h6(Yōon), h13(sokuon), h15(わ+handakuten), m1...
Katakana + optional stations unchanged.

Also rewrites:
- station `order:` values (renumber sequentially)
- station `prerequisites:` (chain follows the new physical order)
Idempotent: run once; re-running detects the new order and exits 0.
"""
import re, sys

P = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
src = open(P, encoding='utf-8').read()

# --- split the file into (header, [station-block...], footer) ---------------
# station objects start at "  {\n    slug: 'stn-..." at indent 2 and end at
# the matching "  }," at indent 2
starts = [m.start() for m in re.finditer(r"(?m)^  \{\n(?:[ \t]*\*[^\n]*\n|[ \t]*/\*[^\n]*\n|[ \t]*//[^\n]*\n)*[ \t]*slug: 'stn-kana-", src)]
if not starts:
    print('FATAL: no station objects found'); sys.exit(1)
header = src[:starts[0]]
ends = [m.start() for m in re.finditer(r"(?m)^  \},?\n", src)]
blocks = []
prev = starts[0]
# each block spans from its start to the NEXT start (or EOF) — safer than
# matching braces
bounds = starts + [len(src)]
for i in range(len(starts)):
    blk = src[bounds[i]:bounds[i+1]]
    m = re.search(r"slug: '(stn-kana-[a-z0-9-]+)'", blk)
    blocks.append((m.group(1), blk))
footer_match = re.search(r"\];\s*$", src)
# the last block already includes the footer (from its start to EOF)

def get_slug(b): return b[0]

# --- desired order (hiragana section reordered; rest unchanged) -------------
NEW_H = ['stn-kana-h0','stn-kana-h1','stn-kana-h2','stn-kana-h3','stn-kana-h4',
         'stn-kana-h5','stn-kana-h7','stn-kana-h8','stn-kana-h9','stn-kana-h10',
         'stn-kana-h11','stn-kana-h12','stn-kana-h14','stn-kana-h6','stn-kana-h13',
         'stn-kana-h15','stn-kana-m1-reading']
REST = [s for s, _ in blocks if s not in NEW_H]
DESIRED = NEW_H + REST
CURRENT = [s for s, _ in blocks]
if CURRENT == DESIRED:
    print('already in the new order — nothing to do'); sys.exit(0)

by_slug = dict(blocks)
out = [header]
for slug in DESIRED:
    out.append(by_slug[slug])
src2 = ''.join(out)

# --- renumber `order:` values sequentially ------------------------------------
def renum(m):
    renum.i += 1
    return f"    order: {renum.i},"
renum.i = 0
src2 = re.sub(r"(?m)^    order: \d+,$", renum, src2)

# --- rewrite prerequisites for the hiragana chain ---------------------------
# new chain: h0<-[], h1<-h0, h2<-h1, h3<-h2, h4<-h3, h5<-h4, h7<-h5,
# h8<-h7, h9<-h8, h10<-h9, h11<-h10, h12<-h11, h14<-h12, h6<-h14,
# h13<-h6, h15<-h13, m1<-h15 (keep whatever m1 had if not h15 — check below)
CHAIN = {
 'stn-kana-h0': [], 'stn-kana-h1': ['stn-kana-h0'], 'stn-kana-h2': ['stn-kana-h1'],
 'stn-kana-h3': ['stn-kana-h2'], 'stn-kana-h4': ['stn-kana-h3'],
 'stn-kana-h5': ['stn-kana-h4'], 'stn-kana-h7': ['stn-kana-h5'],
 'stn-kana-h8': ['stn-kana-h7'], 'stn-kana-h9': ['stn-kana-h8'],
 'stn-kana-h10': ['stn-kana-h9'], 'stn-kana-h11': ['stn-kana-h10'],
 'stn-kana-h12': ['stn-kana-h11'], 'stn-kana-h14': ['stn-kana-h12'],
 'stn-kana-h6': ['stn-kana-h14'], 'stn-kana-h13': ['stn-kana-h6'],
 'stn-kana-h15': ['stn-kana-h13'],
}
# m1-reading previously depended on h15 — keep that (h15 unchanged as its prereq)
for slug, prereqs in CHAIN.items():
    pat = re.compile(r"(slug: '" + slug + r"',\s*\n\s*order: \d+,\s*\n\s*prerequisites: )\[[^\]]*\]")
    rep = r"\1[" + ", ".join(f"'{p}'" for p in prereqs) + "]"
    src2, n = pat.subn(rep, src2, count=1)
    if n != 1:
        print(f'WARN: prereq rewrite missed {slug}')

open(P, 'w', encoding='utf-8').write(src2)
print('reordered. new sequence:')
orders2 = re.findall(r"\n    slug: '(stn-kana-[a-z0-9-]+)'", src2)
print(' -> '.join(orders2[:17]))
