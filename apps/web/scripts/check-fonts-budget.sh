#!/usr/bin/env bash
# TASK-M0-09 — font size budget gate (spike M0-07 §۶-۲).
# Hard caps (MiB): fa ≤ 0.1 · zenkaku-starter ≤ 0.5 · noto-serif-vf ≤ 1.2 · total ≤ 2.3.
# Also enforces the OFL license file next to every shipped family (OFL requirement).
set -euo pipefail
cd "$(dirname "$0")/.."

W=src/styles/woff2
fail=0

bytes() { stat -c %s "$1"; }
check() { # name glob cap_bytes
  local total=0 f
  for f in $W/$2; do total=$((total + $(bytes "$f"))); done
  if [ "$total" -gt "$3" ]; then
    echo "FONT BUDGET FAIL: $1 = $total B > cap $3 B" >&2; fail=1
  else
    echo "font budget ok: $1 = $total B (cap $3 B)"
  fi
}

check "fa (vazirmatn-fd)"      'vazirmatn-fd-*.woff2'        $((100 * 1024))
check "ja-ui (zenkaku starter)" 'zenkaku-starter-*.woff2'     $((500 * 1024))
check "ja-serif (noto vf)"      'notoserif-vf.woff2'          $((1200 * 1024))

total=0
for f in $W/*.woff2; do total=$((total + $(bytes "$f"))); done
if [ "$total" -gt $((2300 * 1024)) ]; then
  echo "FONT BUDGET FAIL: total = $total B > hard cap $((2300 * 1024)) B" >&2; fail=1
else
  echo "font budget ok: total = $total B (hard cap $((2300 * 1024)) B)"
fi

for lic in OFL-Vazirmatn.txt OFL-ZenKakuGothicNew.txt OFL-NotoSerifJP.txt; do
  if [ ! -s "$W/$lic" ]; then echo "OFL MISSING: $W/$lic" >&2; fail=1; fi
done

[ "$fail" -eq 0 ] && echo "check:fonts — ALL GREEN"
exit "$fail"
