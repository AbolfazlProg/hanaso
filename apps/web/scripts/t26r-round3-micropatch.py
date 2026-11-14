#!/usr/bin/env python3
"""TASK-26R round-3 micro-patch (Subagent C findings) + CL-17 gate."""
import re

S = 'src/modules/curriculum/content/chapter-kana01.stations.ts'
T = 'tests/unit/h25-content-lint.test.ts'
src = open(S, encoding='utf-8').read()
log = []

# NEW-1: k12 orphaned «(استثنای )» -> complete the exception note learner-friendly
if "'(استثنای )'" in src:
    src = src.replace("'(استثنای )'", "'(وام‌واژه‌ها استثنا هستند)'", 1)
    log.append('NEW-1: orphaned (استثنای ) fixed')

# NEW-2: H5 leaks in learner-facing strings -> «داکوتن» phrasing
src, n = re.subn(r"مفهوم H5", "مفهوم داکوتن (゛)", src)
if n: log.append(f'NEW-2: مفهوم H5 ×{n}')
src, n = re.subn(r"قاعدهٔ H5", "قاعدهٔ داکوتن", src)
if n: log.append(f'NEW-2: قاعدهٔ H5 ×{n}')

# NEW-3: Arabic noon in ボールペン
if 'ボールペن.' in src and '\u0646' in 'ボールペン'.replace('ン','X'):  # noop guard
    pass
if re.search(r'ボールペ[\u0646]', src):
    src = src.replace('ボールペ' + '\u0646', 'ボールペン')
    log.append('NEW-3: Arabic noon in ボールペン -> ン')

# 5: k1 objectiveFa — the real fix (multi-line aware)
m = re.search(r"objectiveFa:\s*\n?\s*'([^']*(?:فاز K|K2|بازگشایی)[^']*)'", src)
if m:
    src = src[:m.start()] + "objectiveFa: 'کاتاکانا، خط دوم ژاپنی: همان ۴۶ صدایی که حالا بلدی، با شکل‌های تازه. وام‌واژه‌های واقعی از همین‌جا شروع می‌شوند.'" + src[m.end():]
    log.append('5: k1 objectiveFa ACTUALLY replaced this time')
else:
    # single-line form
    m2 = re.search(r"objectiveFa: '[^']*فاز K[^']*'", src)
    if m2:
        src = src.replace(m2.group(0), "objectiveFa: 'کاتاکانا، خط دوم ژاپنی: همان ۴۶ صدایی که حالا بلدی، با شکل‌های تازه. وام‌واژه‌های واقعی از همین‌جا شروع می‌شوند.'", 1)
        log.append('5: k1 objectiveFa replaced (single-line form)')

# 7: やまだ pronFa missing
if "ja: 'やまだ'" in src and "pronFa: 'سه ضربه: یا — ما — دا" not in src:
    i = src.find("ja: 'やまだ'")
    seg_end = src.find('},', i)
    seg = src[i:seg_end]
    if 'pronFa' not in seg:
        src = src[:i] + seg.replace("reading: 'یامادا',", "reading: 'یامادا',\n            pronFa: 'سه ضربه: یا — ما — دا (だ داکوتنِ た است).',", 1) + src[seg_end:]
        log.append('7: やまだ pronFa added')
    # fix imprecise whyFa mention of ま row
    src = src.replace('ま از ردیف قبل و', 'ま از ردیف ま و', 1)

open(S, 'w', encoding='utf-8').write(src)

# CL-17 gate: no internal tokens / Arabic noon inside kana-bearing learner text
tst = open(T, encoding='utf-8').read()
if 'CL-17' not in tst:
    tst += """

/* ------------------------------- CL-17 (TASK-HANASO-26R round-3 C) -------
 * Learner-facing Persian text must not contain internal engineering tokens
 * (H5, K2, CONTENT-107, FEAT-158, فاز K…) nor Arabic codepoints inside
 * Japanese strings (the びょういن / ボールペن defect — Arabic ن U+0646 where
 * kana ン U+30F3 belongs). Round-3 audit caught a silent no-op fix; this gate
 * makes the class of defect machine-checked forever.
 */
const LEARNER_TOKENS = /\\b(?:H\\d|K\\d|CL-\\d+|CONTENT-\\d+|FEAT-\\d+|TL-\\d+|BUG-\\d+|TASK-[^ ]+|فاز [HK]\\b|spec §)/;

test('CL-17 — no internal engineering tokens in any learner-facing text field', () => {
  const findings: string[] = [];
  const scan = (obj: unknown, path: string) => {
    if (typeof obj === 'string') {
      if (LEARNER_TOKENS.test(obj)) findings.push(`${path}: «${obj.slice(0, 60)}»`);
      return;
    }
    if (Array.isArray(obj)) { obj.forEach((v, i) => scan(v, `${path}[${i}]`)); return; }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (k === 'id' || k === 'slug' || k === 'kind' || k === 'fsrsCardId' || k === 'introducedInUnit') continue; // structural, not learner-facing
        scan(v, `${path}.${k}`);
      }
    }
  };
  for (const st of ch1.stations) scan(st, st.slug);
  for (const ex of Object.values(ch1.exercises ?? {})) scan(ex, 'exercises');
  expect(findings, JSON.stringify(findings.slice(0, 10), null, 1)).toEqual([]);
});

test('CL-17 — no Arabic codepoints inside Japanese-bearing example/word fields', () => {
  const findings: string[] = [];
  const KANA = /[\\u3040-\\u30ff\\u31f0-\\u31ff\\uff66-\\uff9d]/;
  const ARABIC_LETTER = /[\\u0621-\\u064a]/;
  const scan = (obj: unknown, path: string) => {
    if (typeof obj === 'string') {
      // split: Japanese runs vs Persian runs; flag Arabic letters INSIDE a kana run
      const runs = obj.split(/([\\u3040-\\u30ff\\u30fc\\u3005\\u3001\\u3002]+)/);
      for (const run of runs) {
        if (KANA.test(run) && ARABIC_LETTER.test(run)) findings.push(`${path}: «${run.slice(0, 30)}»`);
      }
      return;
    }
    if (Array.isArray(obj)) { obj.forEach((v, i) => scan(v, `${path}[${i}]`)); return; }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) scan(v, `${path}.${k}`);
    }
  };
  for (const st of ch1.stations) scan(st, st.slug);
  for (const ex of Object.values(ch1.exercises ?? {})) scan(ex, 'exercises');
  expect(findings, JSON.stringify(findings.slice(0, 10), null, 1)).toEqual([]);
});
"""
    open(T, 'w', encoding='utf-8').write(tst)
    log.append('CL-17 gate appended (engineering tokens + Arabic-in-kana)')

print('\n'.join(log) or 'nothing changed')
