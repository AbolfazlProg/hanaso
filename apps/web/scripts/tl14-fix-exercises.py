#!/usr/bin/env python3
"""TL-14 CP-06 — surgical fixes to chapter-kana01.exercises.ts
Every replacement is exact-string and must occur EXACTLY once (unless noted).
Fixes: (a) untaught-glyph distractors → taught glyphs (GLYPH-BUDGET),
(b) Persian readings normalized to the canonical convention (TRANSCRIPT-CONSISTENT),
(c) dead/typo distractors (Q4) and wrong answers (ざっしー)."""

import sys

PATH = 'src/modules/curriculum/content/chapter-kana01.exercises.ts'
src = open(PATH).read()

# (exercise context id, old string, new string) — old must be unique in file
REPLACEMENTS = [
    # ---- H1: vowel distractors (り/ら untaught until H11) → within-a-row
    ("h1-lis-hira-i",  "{ id: 'b', label: 'り' }", "{ id: 'b', label: 'え' }"),
    ("h1-rcl-hira-i",  "{ id: 'b', label: 'り' }", "{ id: 'b', label: 'え' }"),
    ("h1-lis-hira-u",  "{ id: 'a', label: 'ら' }", "{ id: 'a', label: 'お' }"),
    ("h1-rcl-hira-u",  "{ id: 'a', label: 'ら' }", "{ id: 'a', label: 'お' }"),
    # ---- H2: さ/へ untaught → same-row/shape taught
    ("h2-lis-hira-ki", "{ id: 'a', label: 'さ' }", "{ id: 'a', label: 'い' }"),
    ("h2-rcl-hira-ki", "{ id: 'a', label: 'さ' }", "{ id: 'a', label: 'い' }"),
    ("h2-lis-hira-ku", "{ id: 'b', label: 'へ' }", "{ id: 'b', label: 'こ' }"),
    ("h2-rcl-hira-ku", "{ id: 'b', label: 'へ' }", "{ id: 'b', label: 'こ' }"),
    ("h2-warm-2",      "{ id: 'a', label: 'り' }", "{ id: 'a', label: 'え' }"),
    ("h2-warm-3",      "{ id: 'b', label: 'ら' }", "{ id: 'b', label: 'お' }"),
    # ---- H3: ち/つ untaught → same-row
    ("h3-lis-hira-sa",  "{ id: 'c', label: 'ち' }", "{ id: 'c', label: 'す' }"),
    ("h3-rcl-hira-sa",  "{ id: 'c', label: 'ち' }", "{ id: 'c', label: 'す' }"),
    ("h3-lis-hira-shi", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    ("h3-rcl-hira-shi", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    ("h3-warm-3",       "{ id: 'b', label: 'へ' }", "{ id: 'b', label: 'こ' }"),
    # ---- H4/H5/H6/H7 warmups: ち/つ → same-row
    ("h4-warm-1", "{ id: 'c', label: 'ち' }", "{ id: 'c', label: 'す' }"),
    ("h4-warm-2", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    ("h5-warm-1", "{ id: 'a', label: 'ち' }", "{ id: 'a', label: 'す' }"),
    ("h5-warm-2", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    ("h6-warm-1", "{ id: 'c', label: 'ち' }", "{ id: 'c', label: 'す' }"),
    ("h6-warm-2", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    ("h7-warm-1", "{ id: 'c', label: 'ち' }", "{ id: 'c', label: 'す' }"),
    ("h7-warm-2", "{ id: 'b', label: 'つ' }", "{ id: 'b', label: 'せ' }"),
    # ---- H7 ん: katakana ン untaught (K6) → お
    ("h7-lis-hira-n", "{ id: 'b', label: 'ン' }", "{ id: 'b', label: 'お' }"),
    ("h7-rcl-hira-n", "{ id: 'b', label: 'ン' }", "{ id: 'b', label: 'お' }"),
    # ---- H8: め(H10)/れ(H11)/わ(H15)/ン(K6) untaught → same-row taught
    ("h8-warm-1",      "{ id: 'b', label: 'ン' }", "{ id: 'b', label: 'ね' }"),
    ("h8-lis-hira-nu",  "{ id: 'a', label: 'め' }", "{ id: 'a', label: 'に' }"),
    ("h8-rcl-hira-nu",  "{ id: 'a', label: 'め' }", "{ id: 'a', label: 'に' }"),
    ("h8-lis-hira-ne",  "{ id: 'b', label: 'れ' }", "{ id: 'b', label: 'の' }"),
    ("h8-lis-hira-ne",  "{ id: 'c', label: 'わ' }", "{ id: 'c', label: 'に' }"),
    ("h8-rcl-hira-ne",  "{ id: 'b', label: 'れ' }", "{ id: 'b', label: 'の' }"),
    ("h8-rcl-hira-ne",  "{ id: 'c', label: 'わ' }", "{ id: 'c', label: 'に' }"),
    # ---- H9 warmup: め → ね (both taught by then? ね H8 ✓)
    ("h9-warm-3", "{ id: 'b', label: 'め' }", "{ id: 'b', label: 'ね' }"),
    # ---- H11: わ untaught → る (same row)
    ("h11-lis-hira-re", "{ id: 'c', label: 'わ' }", "{ id: 'c', label: 'る' }"),
    ("h11-rcl-hira-re", "{ id: 'c', label: 'わ' }", "{ id: 'c', label: 'る' }"),
    # ---- H13 asm-3: ざっしー (ー is K8's mark, later unit) → さっし (dropped-dakuten error)
    ("h13-asm-3", "{ id: 'c', label: 'ざっしー' }", "{ id: 'c', label: 'さっし' }"),
    ("h13-asm-3", "c: 'کشش پایانی ندارد؛ し کوتاه تمام می‌شود.'",
                  "c: 'داکوتن ゛ جا افتاده — «سَشّی» بی‌واک است.'"),
    # ---- H15: katakana ワ (K12) → ね (shape-confusable with を, taught H8)
    ("h15-lis-hira-wo", "{ id: 'c', label: 'ワ' }", "{ id: 'c', label: 'ね' }"),
    ("h15-rcl-hira-wo", "{ id: 'c', label: 'ワ' }", "{ id: 'c', label: 'ね' }"),
    # ---- K1: ユ(K10)/ワ(K12) untaught → ウ/ア (K1 row)
    ("k1-lis-kata-e", "{ id: 'b', label: 'ユ' }", "{ id: 'b', label: 'ウ' }"),
    ("k1-rcl-kata-e", "{ id: 'b', label: 'ユ' }", "{ id: 'b', label: 'ウ' }"),
    ("k1-warm-2",     "{ id: 'c', label: 'ワ' }", "{ id: 'c', label: 'ア' }"),
    # ---- K2: ナ(K11)/シ(K4) untaught → ト/テ (same row)
    ("k2-lis-kata-ta",  "{ id: 'b', label: 'ナ' }", "{ id: 'b', label: 'ト' }"),
    ("k2-rcl-kata-ta",  "{ id: 'b', label: 'ナ' }", "{ id: 'b', label: 'ト' }"),
    ("k2-lis-kata-tsu", "{ id: 'b', label: 'シ' }", "{ id: 'b', label: 'テ' }"),
    ("k2-rcl-kata-tsu", "{ id: 'b', label: 'シ' }", "{ id: 'b', label: 'テ' }"),
    # ---- K3 warmups: ナ/シ → ラ/テ
    ("k3-warm-1", "{ id: 'a', label: 'ナ' }", "{ id: 'a', label: 'ラ' }"),
    ("k3-warm-3", "{ id: 'b', label: 'シ' }", "{ id: 'b', label: 'テ' }"),
    # ---- K4: ン(K6) → ス (same row)
    ("k4-lis-kata-so", "{ id: 'b', label: 'ン' }", "{ id: 'b', label: 'ス' }"),
    ("k4-rcl-kata-so", "{ id: 'b', label: 'ン' }", "{ id: 'b', label: 'ス' }"),
    # ---- K5: ワ(K12) → ヘ (same row)
    ("k5-lis-kata-fu", "{ id: 'b', label: 'ワ' }", "{ id: 'b', label: 'ヘ' }"),
    ("k5-rcl-kata-fu", "{ id: 'b', label: 'ワ' }", "{ id: 'b', label: 'ヘ' }"),
    # ---- K6 warmup: ワ → ホ
    ("k6-warm-3", "{ id: 'b', label: 'ワ' }", "{ id: 'b', label: 'ホ' }"),
    # ---- K8 cloze: ノ(K11) → ン (K6; ン/ー is the real confusion pair)
    ("k8-clo-1", "{ id: 'b', label: 'ノ' }", "{ id: 'b', label: 'ン' }"),
    ("k8-clo-1", "b: '「ノ» یک کاناست، علامت کشش نیست.'", "b: '「ン» یک کاناست، علامت کشش نیست.'"),
    # ---- K9: ヌ(K11) → モ (same row)
    ("k9-lis-kata-me", "{ id: 'b', label: 'ヌ' }", "{ id: 'b', label: 'モ' }"),
    ("k9-rcl-kata-me", "{ id: 'b', label: 'ヌ' }", "{ id: 'b', label: 'モ' }"),

    # ================= TRANSCRIPT-CONSISTENT canonical readings =================
    # H4 dec-1: こうこう → کووکوو (matches teaching example)
    ("h4-dec-1", "promptJaReading: 'کوکو',", "promptJaReading: 'کووکوو',"),
    ("h4-dec-1", "{ id: 'c', label: '«کوکو»' },", "{ id: 'c', label: '«کووکوو»' },"),
    ("h4-dec-1", "{ id: 'b', label: '«کُکو»' },", "{ id: 'b', label: '«کوکو»' },"),
    ("h4-dec-1", "f3ExplainFa: '«こうこう» = «کوکو» (دبیرستان).',", "f3ExplainFa: '«こうこう» = «کووکوو» (دبیرستان) — دو اُوی کشیده.',"),
    # H4 dec-2: おおきい → اووکیی
    ("h4-dec-2", "promptJaReading: 'اوکیی',", "promptJaReading: 'اووکیی',"),
    ("h4-dec-2", "{ id: 'b', label: '«اوکیی»' },", "{ id: 'b', label: '«اووکیی»' },"),
    ("h4-dec-2", "{ id: 'a', label: '«اُکیی»' },", "{ id: 'a', label: '«اوکیی»' },"),
    ("h4-dec-2", "f3ExplainFa: '«おおきい» = «اوکیی» (بزرگ).',", "f3ExplainFa: '«おおきい» = «اووکیی» (بزرگ) — اُوی اول کشیده.',"),
    # H4 dec-4: おおさか → اووساکا
    ("h4-dec-4", "promptJaReading: 'اوساکا',", "promptJaReading: 'اووساکا',"),
    # H4 asm-1: あさ dead distractor «آساا» → real error type
    ("h4-asm-1", "{ id: 'c', label: '«آساا»' },", "{ id: 'c', label: '«اسا»' },"),
    ("h4-asm-1", "c: 'کشش دوبل نادرست است.'", "c: 'هر دو مصوت کوتاه‌اند — کشش فقط در واژه‌های کشیده است.'"),
    # H5 dec-1: がくせい → گاکوسِی
    ("h5-dec-1", "promptJaReading: 'گَکسِی',", "promptJaReading: 'گاکوسِی',"),
    # H6 dec-3: きょう → کیو
    ("h6-dec-3", "promptJaReading: 'کیوو',", "promptJaReading: 'کیو',"),
    # H13 dec-1: がっこう → گَکّو
    ("h13-dec-1", "promptJaReading: 'گَکّوو',", "promptJaReading: 'گَکّو',"),
    # H13 dec-3: ちょっと → چُوتّو
    ("h13-dec-3", "promptJaReading: 'چُتّو',", "promptJaReading: 'چُوتّو',"),
    # H13 dec-4: いっしょ → ایْشّو
    ("h13-dec-4", "promptJaReading: 'ایشّو',", "promptJaReading: 'ایْشّو',"),
    # K8 dec-1: コーヒー → کووهی (typo fix)
    ("k8-dec-1", "promptJaReading: 'کوکیی',", "promptJaReading: 'کووهی',"),
    # K8 dec-2: ジュース → جووس
    ("k8-dec-2", "promptJaReading: 'جووسو',", "promptJaReading: 'جووس',"),
    # K8 dec-3: ボールペン → بوولپِن
    ("k8-dec-3", "promptJaReading: 'بوروپِن',", "promptJaReading: 'بوولپِن',"),
]

# K11 ノート reading: find the exercise-side reading «نُوتو» → «نووتو»
# (global unique string, verified below)
# (the two remaining reading conflicts — いえ «ایِ» at H1 and ノート «نُوتو» at K11 —
# live in the STATIONS file and are fixed with the CP-04 station rewrite)
GLOBAL_REPLACEMENTS: list[tuple[str, str]] = []

# group replacements by exercise id for context verification
import re
def exercise_span(src, xid):
    m = re.search(r"id: 'ex-kana-" + re.escape(xid) + r"',", src)
    if not m:
        return None
    start = src.rfind('{', 0, m.start())
    # find the matching closing brace of this object
    depth = 0
    i = start
    while i < len(src):
        if src[i] == '{': depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0: return (start, i+1)
        i += 1
    return None

errors = []
for xid, old, new in REPLACEMENTS:
    span = exercise_span(src, xid)
    if span is None:
        errors.append(f"exercise {xid} NOT FOUND"); continue
    body = src[span[0]:span[1]]
    n = body.count(old)
    if n != 1:
        errors.append(f"{xid}: expected exactly 1 occurrence of {old!r}, found {n}")
        continue
    newbody = body.replace(old, new)
    src = src[:span[0]] + newbody + src[span[1]:]

for old, new in GLOBAL_REPLACEMENTS:
    n = src.count(old)
    if n != 1:
        errors.append(f"global: expected exactly 1 occurrence of {old!r}, found {n}")
        continue
    src = src.replace(old, new)

if errors:
    print("ABORT — errors:")
    for e in errors: print("  " + e)
    sys.exit(1)

open(PATH, 'w').write(src)
print(f"OK — {len(REPLACEMENTS)} contextual + {len(GLOBAL_REPLACEMENTS)} global replacements applied")
