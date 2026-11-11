#!/usr/bin/env bash
# TL-14 CP-07 v2 — deterministic slide-by-slide browser verification.
# Seeds walk snapshots directly (walk-persistence contract) to land on each
# slide, screenshots mobile + desktop, and exercises the micro-ask flow.
set -u
export PATH="/usr/lib/node_modules/corepack/shims:$PATH"
LOG=/tmp/hanaso-dev.log
SHOTS=/home/z/my-project/hanaso10/agent-ctx/tl14-shots
rm -f "$SHOTS"/*.png
BASE=http://127.0.0.1:3000
CH=kana-foundation-01
LID=6581cb6e-4778-45cb-b65c-da53f11fa3a4

echo "== starting dev server =="
cd /home/z/my-project/hanaso10
env -u DATABASE_URL pnpm dev > "$LOG" 2>&1 &
DEV_PID=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/" 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
echo "server ready (HTTP $code)"

shot() { agent-browser screenshot "$SHOTS/$1.png" >/dev/null 2>&1 && echo "  [shot] $1"; }
txt()  { agent-browser wait --text "$1" --timeout 6000 >/dev/null 2>&1 && echo "  [OK ] $1" || echo "  [MISS] $1"; }

# seed the walk snapshot at a given step (all exercise blocks pre-earned)
seed() { # station step
  agent-browser eval "localStorage.setItem('hanaso.walk.v1.$LID.$CH.$1', JSON.stringify({v:1,chapterSlug:'$CH',stationSlug:'$1',stepIndex:$2,blockResults:{'blk-stn-kana-h4-warmup':1,'blk-stn-kana-h4-guided':1,'blk-stn-kana-h4-apply-read':1,'blk-stn-kana-h4-independent':1,'blk-stn-kana-h4-assessment':1},exerciseProgress:{},sessionScore:1,updatedAt:Date.now()})); 'seeded'" >/dev/null 2>&1
}
seed6() {
  agent-browser eval "localStorage.setItem('hanaso.walk.v1.$LID.$CH.stn-kana-h6', JSON.stringify({v:1,chapterSlug:'$CH',stationSlug:'stn-kana-h6',stepIndex:$1,blockResults:{'blk-stn-kana-h6-warmup':1,'blk-stn-kana-h6-guided':1,'blk-stn-kana-h6-apply-read':1,'blk-stn-kana-h6-independent':1,'blk-stn-kana-h6-assessment':1},exerciseProgress:{},sessionScore:1,updatedAt:Date.now()})); 'seeded'" >/dev/null 2>&1
}
seed13() {
  agent-browser eval "localStorage.setItem('hanaso.walk.v1.$LID.$CH.stn-kana-h13', JSON.stringify({v:1,chapterSlug:'$CH',stationSlug:'stn-kana-h13',stepIndex:$1,blockResults:{'blk-stn-kana-h13-warmup':1,'blk-stn-kana-h13-guided':1,'blk-stn-kana-h13-apply-read':1,'blk-stn-kana-h13-independent':1,'blk-stn-kana-h13-assessment':1},exerciseProgress:{},sessionScore:1,updatedAt:Date.now()})); 'seeded'" >/dev/null 2>&1
}
seedk13() {
  agent-browser eval "localStorage.setItem('hanaso.walk.v1.$LID.$CH.stn-kana-k13', JSON.stringify({v:1,chapterSlug:'$CH',stationSlug:'stn-kana-k13',stepIndex:$1,blockResults:{'blk-stn-kana-k13-warmup':1,'blk-stn-kana-k13-script-drill':1},exerciseProgress:{},sessionScore:1,updatedAt:Date.now()})); 'seeded'" >/dev/null 2>&1
}
openh4() { agent-browser open "$BASE/learn/$CH/journey/stn-kana-h4" >/dev/null 2>&1; sleep 5; }
openh6() { agent-browser open "$BASE/learn/$CH/journey/stn-kana-h6" >/dev/null 2>&1; sleep 5; }
openh13() { agent-browser open "$BASE/learn/$CH/journey/stn-kana-h13" >/dev/null 2>&1; sleep 5; }
openk13() { agent-browser open "$BASE/learn/$CH/journey/stn-kana-k13" >/dev/null 2>&1; sleep 5; }

agent-browser set viewport 390 844 >/dev/null 2>&1
# establish the learner cookie first
agent-browser open "$BASE/" >/dev/null 2>&1; sleep 4
agent-browser eval "document.cookie='hanaso_lid=$LID;path=/;max-age=31536000'; localStorage.setItem('hanaso.learnerId.v1','$LID'); 'ok'" >/dev/null 2>&1

echo "== MOBILE 390 — H4 deck =="
openh4; seed stn-kana-h4 1; openh4
txt "پیش از شروع: مصوت‌هایی که می‌کِشیم"; shot h4-01-prereq-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "این واژه دو ضربه دارد"; shot h4-02-notice-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "دو ضربه در برابر سه ضربه"; shot h4-03-contrast-mobile
# interact with the micro-question (answer: いいえ)
agent-browser find role radio click --name "いいえ" >/dev/null 2>&1; sleep 2
txt "واژهٔ دوم سه ضربه داشت"; shot h4-04-contrast-reveal-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "مصوتِ بلند دقیقاً دو برابر"; shot h4-05-explain-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "حدس بزن: مصوتِ اولِ این واژه کوتاه است یا کشیده؟"; shot h4-06-predict-mobile
agent-browser find role radio click --name "کشیده (دو ضربه)" >/dev/null 2>&1; sleep 2
txt "کشیده — お+お یعنی یک اُوی دوضربه"; shot h4-07-predict-reveal-mobile
openh4; seed stn-kana-h4 7; openh4
txt "الگوهای نوشتاریِ کشش"; shot h4-08-patterns-mobile
openh4; seed stn-kana-h4 9; openh4
txt "اوساکا (نام شهر)"; shot h4-09-apply-mobile
openh4; seed stn-kana-h4 12; openh4
txt "کارت مرجع: مصوتِ کشیده"; shot h4-10-rulecard-mobile
openh4; seed stn-kana-h4 14; openh4
txt "قاعدهٔ طول مصوت — جمع‌بندی"; shot h4-11-wrapup-mobile

echo "== MOBILE — H6 first-look =="
openh6; seed6 1; openh6
txt "اولین نگاه: سه جفتِ کوچک/بزرگ"; shot h6-01-prereq-firstlook-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "«امروز»: «کیو»"; shot h6-02-notice-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "کوچک = فشرده، بزرگ = جدا"; shot h6-03-contrast-mobile

echo "== MOBILE — H13 =="
openh13; seed13 1; openh13
txt "پیش‌نیازهای این قاعده"; shot h13-01-prereq-mobile
openh13; seed13 3; openh13
txt "با っ و بدون っ"; shot h13-02-contrast-mobile

echo "== MOBILE — K13 script deck =="
openk13; seedk13 2; openk13
txt "دو خط، یک زبان"; shot k13-01-prereq-mobile
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "یک واژه، دو خط"; shot k13-02-contrast-mobile
agent-browser find role radio click --name "کاتاکانا" >/dev/null 2>&1; sleep 2
txt "کاتاکانا — وام‌واژه‌ها"; shot k13-03-contrast-reveal-mobile

echo "== DESKTOP 1440 — key slides =="
agent-browser set viewport 1440 900 >/dev/null 2>&1
openh4; seed stn-kana-h4 1; openh4
txt "پیش از شروع: مصوت‌هایی که می‌کِشیم"; shot h4-12-prereq-desktop
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
agent-browser find role button click --name "ادامه" >/dev/null 2>&1; sleep 2
txt "دو ضربه در برابر سه ضربه"; shot h4-13-contrast-desktop
txt "پخش هر دو پشت‌سرهم"
openh6; seed6 1; openh6
txt "اولین نگاه: سه جفتِ کوچک/بزرگ"; shot h6-04-prereq-desktop
openh13; seed13 3; openh13
txt "با っ و بدون っ"; shot h13-03-contrast-desktop

echo "== console errors =="
agent-browser errors 2>&1 | head -5
kill $DEV_PID 2>/dev/null
echo "== DONE: $(ls $SHOTS | wc -l) shots =="
