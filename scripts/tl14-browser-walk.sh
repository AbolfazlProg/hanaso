#!/usr/bin/env bash
# TL-14 CP-07 — browser walk of the redesigned rule decks (mobile 390 + desktop 1440)
# Runs the dev server AND all browser steps in ONE process (sandbox reaps background procs).
set -u
export PATH="/usr/lib/node_modules/corepack/shims:$PATH"
LOG=/tmp/hanaso-dev.log
SHOTS=/home/z/my-project/hanaso10/agent-ctx/tl14-shots
BASE=http://127.0.0.1:3000

echo "== starting dev server =="
cd /home/z/my-project/hanaso10
env -u DATABASE_URL pnpm dev > "$LOG" 2>&1 &
DEV_PID=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server ready (HTTP $code) after ~$((i*2))s"

shot() { agent-browser screenshot "$SHOTS/$1.png" >/dev/null 2>&1 && echo "  [shot] $1"; }
txt()  { agent-browser wait --text "$1" --timeout 8000 >/dev/null 2>&1 && echo "  [ok] text: $1" || echo "  [MISS] text: $1"; }
clicktxt() { agent-browser find text "$1" click >/dev/null 2>&1 && echo "  [click] $1" || echo "  [CLICK-FAIL] $1"; }

echo "== mobile 390x844 — H4 deck =="
agent-browser set viewport 390 844 >/dev/null 2>&1
agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-h4" >/dev/null 2>&1
sleep 6
# learner cookie (after a page is open, then reload)
agent-browser cookies set hanaso_lid 6581cb6e-4778-45cb-b65c-da53f11fa3a4 --domain 127.0.0.1 >/dev/null 2>&1 || agent-browser eval "document.cookie='hanaso_lid=6581cb6e-4778-45cb-b65c-da53f11fa3a4'" >/dev/null 2>&1
agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-h4" >/dev/null 2>&1
sleep 6

# if the TL-13 completion panel shows, restart the walk for a fresh review
agent-browser find text "مرور دوبارهٔ این ایستگاه" click >/dev/null 2>&1 && sleep 2 && echo "  [walk restarted]" || echo "  (no completion panel — fresh walk)"
sleep 3
shot 01-h4-mobile-warmup

# walk forward through the warmup exercise block (3 listening questions):
# answer each by clicking the FIRST kana option, then check, then next
for q in 1 2 3; do
  agent-browser find role radio click >/dev/null 2>&1 || true
  sleep 1
  clicktxt "بررسی پاسخ"
  sleep 2
  # auto-next fires on correct; manual continue otherwise
  agent-browser find text "ادامه" click >/dev/null 2>&1 || true
  sleep 1
done
shot 02-h4-mobile-prereq
txt "پیش از شروع: مصوت‌هایی که می‌کِشیم"

clicktxt "ادامه"; sleep 2
shot 03-h4-mobile-notice-ie
txt "این واژه دو ضربه دارد"

clicktxt "ادامه"; sleep 2
shot 04-h4-mobile-contrast-ie
txt "دو ضربه در برابر سه ضربه"
# answer the micro-question (correct: いいえ)
clicktxt "いいえ"; sleep 2
shot 05-h4-mobile-contrast-reveal
txt "واژهٔ دوم سه ضربه داشت"

clicktxt "ادامه"; sleep 2
shot 06-h4-mobile-explain
clicktxt "ادامه"; sleep 2
shot 07-h4-mobile-predict-ookii
txt "حدس بزن: مصوتِ اولِ این واژه کوتاه است یا کشیده؟"
clicktxt "کشیده (دو ضربه)"; sleep 2
shot 08-h4-mobile-predict-reveal

clicktxt "ادامه"; sleep 1; clicktxt "ادامه"; sleep 1; clicktxt "ادامه"; sleep 2
shot 09-h4-mobile-patterns
clicktxt "ادامه"; sleep 2

# guided exercise block (cloze おおさか + dec こうこう) — answer correctly twice
agent-browser find text "お" click >/dev/null 2>&1; sleep 1
clicktxt "بررسی پاسخ"; sleep 2
agent-browser find text "ادامه" click >/dev/null 2>&1 || true; sleep 2
agent-browser find text "«کووکوو»" click >/dev/null 2>&1; sleep 1
clicktxt "بررسی پاسخ"; sleep 2
agent-browser find text "ادامه" click >/dev/null 2>&1 || true; sleep 2
shot 10-h4-mobile-apply-oosaka

clicktxt "ادامه"; sleep 2
shot 11-h4-mobile-rulecard
txt "کارت مرجع: مصوتِ کشیده"

echo "== H6 first-look prereq (mobile) =="
agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-h6" >/dev/null 2>&1
sleep 6
agent-browser find text "مرور دوبارهٔ این ایستگاه" click >/dev/null 2>&1 && sleep 2
sleep 2
for q in 1 2 3; do
  agent-browser find role radio click >/dev/null 2>&1 || true; sleep 1
  clicktxt "بررسی پاسخ"; sleep 2
  agent-browser find text "ادامه" click >/dev/null 2>&1 || true; sleep 1
done
shot 12-h6-mobile-prereq-firstlook
txt "اولین نگاه: سه جفتِ کوچک/بزرگ"
clicktxt "ادامه"; sleep 2
shot 13-h6-mobile-notice-kyou
clicktxt "ادامه"; sleep 2
shot 14-h6-mobile-contrast-kyou
txt "کدام دو ضربه است؟"

echo "== K13 script-usage deck (mobile) =="
agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-k13" >/dev/null 2>&1
sleep 6
agent-browser find text "مرور دوبارهٔ این ایستگاه" click >/dev/null 2>&1 && sleep 2
sleep 2
shot 15-k13-mobile-scene
clicktxt "ادامه"; sleep 2
shot 16-k13-mobile-prereq-twoscripts
txt "دو خط، یک زبان"
clicktxt "ادامه"; sleep 2
shot 17-k13-mobile-contrast-neko
clicktxt "کاتاکانا"; sleep 2
shot 18-k13-mobile-contrast-reveal
clicktxt "ادامه"; sleep 2
shot 19-k13-mobile-explain-scriptrule

echo "== desktop 1440x900 — H4 + H13 decks =="
agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-h4" >/dev/null 2>&1
sleep 6
agent-browser find text "مرور دوبارهٔ این ایستگاه" click >/dev/null 2>&1 && sleep 2
sleep 2
shot 20-h4-desktop-warmup
for q in 1 2 3; do
  agent-browser find role radio click >/dev/null 2>&1 || true; sleep 1
  clicktxt "بررسی پاسخ"; sleep 2
  agent-browser find text "ادامه" click >/dev/null 2>&1 || true; sleep 1
done
shot 21-h4-desktop-prereq
clicktxt "ادامه"; sleep 2
shot 22-h4-desktop-contrast-ie
txt "پخش هر دو پشت‌سرهم"

agent-browser open "$BASE/learn/kana-foundation-01/journey/stn-kana-h13" >/dev/null 2>&1
sleep 6
agent-browser find text "مرور دوبارهٔ این ایستگاه" click >/dev/null 2>&1 && sleep 2
sleep 2
shot 23-h13-desktop-warmup
for q in 1 2 3; do
  agent-browser find role radio click >/dev/null 2>&1 || true; sleep 1
  clicktxt "بررسی پاسخ"; sleep 2
  agent-browser find text "ادامه" click >/dev/null 2>&1 || true; sleep 1
done
shot 24-h13-desktop-prereq
txt "پیش‌نیازهای این قاعده"
clicktxt "ادامه"; sleep 2
shot 25-h13-desktop-notice-gakkou
clicktxt "ادامه"; sleep 2
shot 26-h13-desktop-contrast-gakkou
clicktxt "ادامه"; sleep 2
shot 27-h13-desktop-explain-sokuon

echo "== errors/console =="
agent-browser errors 2>&1 | head -8

kill $DEV_PID 2>/dev/null
echo "== DONE — shots in $SHOTS =="
ls "$SHOTS" | wc -l
