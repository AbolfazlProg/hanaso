#!/usr/bin/env python3
"""TASK-26R round-2 fixes — RECREATED from the verified previous run
(the sandbox was recycled; the script existed only in that tree).
Fixes Subagent A/B/C round-2 findings, now INCLUDING the H9 drop bug:
the previous rebuild of stationSlugs omitted 'stn-kana-opt-r-h9'.
"""
import re, sys

S = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
M = 'src/modules/curriculum/content/chapter-kana01.ts'
log = []

# ---------- A: stationSlugs reorder (the visible /learn list) --------------
# exact final order: stations file order for the hira section, INCLUDING opt-r-h9
NEW_H = ['stn-kana-h0','stn-kana-h1','stn-kana-h2','stn-kana-h3','stn-kana-h4',
         'stn-kana-h5','stn-kana-h7','stn-kana-h8','stn-kana-h9','stn-kana-h10',
         'stn-kana-h11','stn-kana-h12','stn-kana-h14','stn-kana-h6','stn-kana-h13',
         'stn-kana-h15','stn-kana-m1-reading','stn-kana-opt-r-h9']
msrc = open(M, encoding='utf-8').read()
for a in list(re.finditer(r"stationSlugs: \[([^\]]*)\]", msrc)):
    slugs = re.findall(r"'(stn-kana-[a-z0-9-]+)'", a.group(1))
    if 'stn-kana-h6' not in slugs:
        continue
    hset = [s for s in slugs if s in NEW_H]
    new_hset = [s for s in NEW_H if s in hset] + [s for s in NEW_H if s not in hset and s == 'stn-kana-opt-r-h9']
    if hset == new_hset and set(hset) == set(new_hset):
        log.append('A: stationSlugs already in new order')
        break
    new_body = "[\n" + "".join(f"        '{s}',\n" for s in new_hset) + "      ]"
    msrc = msrc[:a.start()] + "stationSlugs: " + new_body + msrc[a.end():]
    log.append(f'A: stationSlugs rebuilt ({len(new_hset)} slugs, incl. opt-r-h9)')
    break
open(M, 'w', encoding='utf-8').write(msrc)

src = open(S, encoding='utf-8').read()

# ---------- C-P0A: Arabic ن inside Japanese words ---------------------------
for bad, good in [('びょういن', 'びょういん'), ('びよういن', 'びよういん')]:
    n = src.count(bad)
    if n:
        src = src.replace(bad, good)
        log.append(f'C-P0A: {bad!r} -> {good!r} ×{n}')

# ---------- C-P0B: MicroAsk ふ reading (option c + reveal) -------------------
if "label: 'هو'" in src:
    src = src.replace("{ id: 'c', label: 'هو' },", "{ id: 'c', label: 'فو' },", 1)
    log.append('C-P0B: option c label هو -> فو')
old_rev = 'درست! ふ + ゛ = ぶ. «پو» مال ゜ (هان‌داکوتن) است که بعداً می‌آید؛ «هو» خودِ ふ بدون ゛ است.'
new_rev = 'درست! ふ + ゛ = ぶ. «پو» مال ゜ (هان‌داکوتن) است که بعداً می‌آید؛ «فو» خودِ ふ بدون ゛ است.'
if old_rev in src:
    src = src.replace(old_rev, new_rev, 1)
    log.append('C-P0B: revealFa هو -> فو')

# ---------- B-R1: stale h6 honestyLabel ------------------------------------
m = re.search(r"(slug: 'stn-kana-h6'.*?)honestyLabelFa: '([^']*)'", src, re.S)
if m:
    log.append(f'B-R1: h6 honestyLabel was: {m.group(2)[:60]}…')
    src = src[:m.start(2)] + "ردیف ひ و は را در ایستگاه‌های پیش از این دیده‌ای؛ びょういん همین‌جا کامل خواندنی است." + src[m.end(2):]

# ---------- C: ロ — align to the kana card's taught reading ------------------
ki = open('src/modules/curriculum/content/kana-items.ts', encoding='utf-8').read()
ro_card = re.search(r"glyph: 'ロ'.{0,300}?readingFa: '([^']*)'", ki, re.S)
ro_card_reading = ro_card.group(1) if ro_card else '?'
log.append(f'C: kana-card ロ readingFa = {ro_card_reading!r}')
want = ro_card_reading  # the card is the taught truth
have = 'رو' if 'ロ(رو)' in src else ('رُ' if 'ロ(رُ)' in src else None)
if have and have != want:
    src = src.replace('ロ(رُ)' if have == 'رُ' else 'ロ(رو)', f'ロ({want})')
    log.append(f'C: ロ({have}) -> ロ({want})')
else:
    log.append(f'C: ロ wrapup already matches card ({have})')

# ---------- C: H9 / CONTENT-107 leaks in learner-facing objectiveFa --------
src, n1 = re.subn(r"(objectiveFa: '[^']*?)\bH9\b", r"\1فاز مرور", src)
if n1: log.append(f'C: H9 leak removed ×{n1}')
src, n2 = re.subn(r"(objectiveFa: '[^']*?)CONTENT-107\s*", r"\1", src)
if n2: log.append(f'C: CONTENT-107 leak removed ×{n2}')

# ---------- C: k1 objectiveFa — learner-friendly rewrite -------------------
m = re.search(r"objectiveFa: '[^']*کاتاکانا[^']*'", src)
if m and ('فاز K' in m.group(0) or 'K2' in m.group(0) or 'بازگشایی' in m.group(0)):
    src = src.replace(m.group(0), "objectiveFa: 'کاتاکانا، خط دوم ژاپنی: همان ۴۶ صدایی که حالا بلدی، با شکل‌های تازه. وام‌واژه‌های واقعی از همین‌جا شروع می‌شوند.'", 1)
    log.append('C: k1 objectiveFa rewritten learner-friendly')

# ---------- B-R2: duplicate やすみ (h14-2 -> やまだ, committed audio) --------
i2 = src.find("id: 'rd-stn-kana-h14-2'")
if i2 != -1:
    m = re.search(r"id: 'rd-stn-kana-h14-2',\s*\n\s*role: 'reading',\s*\n\s*ja: '([^']*)'", src)
    if m and m.group(1) == 'やすみ':
        end = src.find('},', m.start())
        seg = src[m.start():end]
        seg2 = seg.replace("ja: 'やすみ'", "ja: 'やまだ'") \
                  .replace("reading: 'یاسومی'", "reading: 'یامادا'")
        seg2 = re.sub(r"pronFa: '[^']*'", "pronFa: 'سه ضربه: یا — ما — دا (だ داکوتنِ た است).'", seg2, count=1)
        seg2 = re.sub(r"fa: '[^']*'", "fa: 'یامادا (نام خانوادگی)'", seg2, count=1)
        seg2 = re.sub(r"whyFa: '[^']*'", "whyFa: 'や همین‌جا آموختی، ま از ردیف قبل و だ داکوتنِ た — کاملاً خواندنی است.'", seg2, count=1)
        src = src[:m.start()] + seg2 + src[end:]
        log.append('B-R2: h14-2 やすみ -> やまだ (dedup, committed audio)')

open(S, 'w', encoding='utf-8').write(src)

# ---------- CL-16 gate ------------------------------------------------------
T = 'tests/unit/h25-content-lint.test.ts'
tst = open(T, encoding='utf-8').read()
if 'CL-16' not in tst:
    tst += """

/* ------------------------------- CL-16 (TASK-HANASO-26R round-2 A) -------
 * The VISIBLE journey list order comes from the section units' stationSlugs
 * arrays — not from station.order. Round-2 audit caught the fix shipping with
 * reordered stations but a STALE stationSlugs list (UI showed yōon before the
 * や row even though the API nodes were correct). Gate: each unit's
 * stationSlugs must list its stations in ascending station.order, and the
 * units' concatenation must equal the full ordered chapter (no drops — the
 * first round of this fix accidentally dropped stn-kana-opt-r-h9).
 */
test('CL-16 — every unit stationSlugs list matches the authored station order (UI list == API order)', () => {
  const ordered = [...ch1.stations].sort((a, b) => a.order - b.order).map((s) => s.slug);
  const byUnit: string[][] = (ch1 as unknown as { units: { stationSlugs: string[] }[] }).units.map((u) => u.stationSlugs);
  const flat = byUnit.flat();
  expect(new Set(flat).size).toBe(ordered.length); // permutation, no dupes
  expect([...new Set(flat)].sort()).toEqual([...new Set(ordered)].sort()); // no drops
  const pos = new Map(ordered.map((s, i) => [s, i]));
  for (const slugs of byUnit) {
    const positions = slugs.map((s) => pos.get(s));
    positions.forEach((p) => expect(p).toBeDefined());
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `unit list out of order at #${i}`).toBeGreaterThan(positions[i - 1]!);
    }
  }
});

test('CL-16 negative fixture — a stale stationSlugs list (old v26 order, or a dropped station) fails', () => {
  const mutated = JSON.parse(JSON.stringify(ch1)) as typeof ch1;
  const units = (mutated as unknown as { units: { stationSlugs: string[] }[] }).units;
  const u = units.find((x: { stationSlugs: string[] }) => x.stationSlugs.includes('stn-kana-h6'))!;
  const slugs = u.stationSlugs;
  const h6i = slugs.indexOf('stn-kana-h6');
  slugs.splice(h6i, 1);
  slugs.splice(slugs.indexOf('stn-kana-h7'), 0, 'stn-kana-h6'); // the v26 defect
  const ordered = [...mutated.stations].sort((a, b) => a.order - b.order).map((s) => s.slug);
  const pos = new Map(ordered.map((s, i) => [s, i]));
  const positions = slugs.map((s) => pos.get(s));
  let outOfOrder = false;
  for (let i = 1; i < positions.length; i++) if (positions[i]! < positions[i - 1]!) outOfOrder = true;
  expect(outOfOrder).toBe(true);
  // and a DROPPED station must also fail the permutation check
  const dropped = JSON.parse(JSON.stringify(ch1)) as typeof ch1;
  const du = (dropped as unknown as { units: { stationSlugs: string[] }[] }).units;
  const dtarget = du.find((x: { stationSlugs: string[] }) => x.stationSlugs.includes('stn-kana-h6'))!;
  dtarget.stationSlugs.splice(dtarget.stationSlugs.indexOf('stn-kana-opt-r-h9'), 1);
  const dflat = du.flat();
  expect(new Set(dflat).size).not.toBe([...dropped.stations].length);
});
"""
    open(T, 'w', encoding='utf-8').write(tst)
    log.append('CL-16 gate + negative fixtures appended')

print('\n'.join(log) or 'nothing changed')
