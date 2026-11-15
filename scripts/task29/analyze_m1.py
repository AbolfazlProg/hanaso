#!/usr/bin/env python3
"""TASK-29 M1 analysis: which stations have exercise blocks vs task_completed criterion."""
import re

for path in [
    'src/modules/curriculum/content/chapter-fm01.stations.ts',
    'src/modules/curriculum/content/chapter-kana01.stations.ts',
    'src/modules/curriculum/content/chapter-kana01.practice.ts',
]:
    src = open(path).read()
    # split on station object starts: "slug: '...'"
    parts = re.split(r"slug: '([^']+)'", src)
    print(f"\n== {path}")
    # parts: [pre, slug1, body1, slug2, body2, ...]
    for i in range(1, len(parts) - 1, 2):
        slug = parts[i]
        body = parts[i + 1]
        # cut body at next station start (heuristic: next '  {' after a close) — just search in whole body slice
        has_ex_block = re.search(r"kind: 'exercise'", body) is not None
        # completion kind: first completion entry in this body
        m = re.search(r"completion: \{ kind: '([a-z_]+)'", body)
        comp = m.group(1) if m else '?'
        n_ex = len(re.findall(r"kind: 'exercise'", body))
        print(f"  {slug}: completion={comp} exercise_blocks={n_ex}")
