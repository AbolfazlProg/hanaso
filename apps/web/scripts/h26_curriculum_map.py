#!/usr/bin/env python3
"""h26 curriculum map generator — reads the REAL source (chapter-kana01.ts +
chapter-kana01.stations.ts) and emits the full 34-station journey map.

This recreates scripts/h26_curriculum_map.py (the original lived only in a
recycled sandbox). Output: ops/checkpoints/TASK-HANASO-26R/CURRICULUM_MAP.md
"""
import re, os, datetime

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'modules', 'curriculum', 'content')
CH = os.path.join(BASE, 'chapter-kana01.ts')
ST = os.path.join(BASE, 'chapter-kana01.stations.ts')

ch = open(CH, encoding='utf-8').read()
st = open(ST, encoding='utf-8').read()

# --- units (sections) in authored order, each with its stationSlugs ---
units = []
for um in re.finditer(r"slug:\s*'(section-[a-z-]+)',[\s\S]*?titleFa:\s*'([^']+)',[\s\S]*?stationSlugs:\s*\[([^\]]*)\]", ch):
    title = um.group(2)
    slugs = re.findall(r"'(stn-kana-[a-z0-9-]+)'", um.group(3))
    units.append((title, slugs))

# --- stations: slug -> (order, titleFa, objectiveFa, prereq) ---
stations = {}
for sm in re.finditer(r"slug:\s*'(stn-kana-[a-z0-9-]+)'", st):
    slug = sm.group(1)
    seg = st[sm.start():sm.start()+3000]
    def field(name):
        m = re.search(name + r":\s*'?([^'\n]*)'?", seg)
        return m.group(1).strip() if m else ''
    order = re.search(r"order:\s*(\d+)", seg)
    title = re.search(r"titleFa:\s*'([^']*)'", seg)
    obj = re.search(r"objectiveFa:\s*'([^']*)'", seg, re.S)
    prereq = re.search(r"prerequisites:\s*\[([^\]]*)\]", seg)
    stations[slug] = {
        'order': int(order.group(1)) if order else -1,
        'title': title.group(1) if title else '?',
        'obj': (obj.group(1) if obj else '')[:120],
        'prereq': re.findall(r"'(stn-kana-[a-z0-9-]+)'", prereq.group(1)) if prereq else [],
    }

total = sum(len(s) for _, s in units)
hira_slugs = next((s for t, s in units if 'stn-kana-h0' in s), [])
assert 'stn-kana-opt-r-h9' in hira_slugs, 'H9 missing from hira unit!'
h14i, h6i = hira_slugs.index('stn-kana-h14'), hira_slugs.index('stn-kana-h6')
assert h14i < h6i, 'yōon before や row!'

L = []
L.append('# CURRICULUM MAP — فصل ۰۱ (kana-foundation-01)')
L.append('')
L.append('> تولیدشده توسط `apps/web/scripts/h26_curriculum_map.py` از Source واقعی')
L.append('> (`chapter-kana01.ts` + `chapter-kana01.stations.ts`) — نه از حافظه یا حدس.')
L.append(f'> تاریخ تولید: {datetime.date.today().isoformat()} · مجموع ایستگاه‌ها: **{total}**')
L.append('')
L.append('## ترتیب نهایی (پس از TASK-HANASO-26R)')
L.append('')
L.append('ردیف や (h14) پیش از قاعدهٔ یُوئون (h6) آموزش داده می‌شود؛ ایستگاه مرور اختیاری H9 در انتهای بخش هیراگانا است.')
L.append('')
for title, slugs in units:
    L.append(f'### {title} ({len(slugs)} ایستگاه)')
    L.append('')
    L.append('| # | ایستگاه | عنوان | order | پیش‌نیاز | هدف (خلاصه) |')
    L.append('| --- | --- | --- | --- | --- | --- |')
    for i, s in enumerate(slugs, 1):
        d = stations.get(s, {})
        pr = '، '.join(p.replace('stn-kana-', '') for p in d['prereq']) or '—'
        L.append(f"| {i} | `{s}` | {d['title']} | {d['order']} | {pr} | {d['obj']} |")
    L.append('')

L.append('## نقشهٔ آموزشی (سلسله‌مراتب پیش‌نیازها)')
L.append('')
for title, slugs in units:
    for s in slugs:
        d = stations.get(s, {})
        if d['prereq']:
            for p in d['prereq']:
                L.append(f"- `{p.replace('stn-kana-','')}` ← `{s.replace('stn-kana-','')}`")
        else:
            L.append(f"- (آغاز) ← `{s.replace('stn-kana-','')}`")
L.append('')
L.append('## نکات کلیدی ترتیب (گیت‌های CL-14/CL-15/CL-16/CL-17)')
L.append('')
L.append('- や (h14) قبل از یُوئون (h6): **الزام پداگوژیک** — یُوئون فقط بعد از آموزش واقعی ゃ/ゅ/ょ.')
L.append('- stationSlugs هر واحد = دقیقاً ترتیب `order` ایستگاه‌ها (گیت CL-16).')
L.append('- حذف هر ایستگاه (ازجمله H9) تست را شکست می‌دهد (فیکسچر منفی CL-16).')
L.append('- هیچ توکن مهندسی (H9/K2/CONTENT-…) یا نویسهٔ عربی داخل رشتهٔ ژاپنی در متن آموزشی نیست (گیت CL-17).')
L.append('')

out = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ops', 'checkpoints', 'TASK-HANASO-26R', 'CURRICULUM_MAP.md')
out = os.path.normpath(out)
open(out, 'w', encoding='utf-8').write('\n'.join(L))
print(f'WROTE {out}: {total} stations, {len(units)} units; h14@{h14i} < h6@{h6i} in hira unit; H9 present.')
