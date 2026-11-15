#!/bin/bash
# TASK29 E2E — fresh learner walk (h0→h1) + returning learner + isolation, via agent-browser.
set -u
B="agent-browser --session s29e"
EV=/home/z/my-project/hanaso16/ops/checkpoints/TASK-HANASO-29/evidence
mkdir -p "$EV"

echo "=== [1] fresh learner: home + learn"
$B open http://127.0.0.1:3100/ >/dev/null 2>&1; sleep 2
$B screenshot $EV/E1-home.png >/dev/null 2>&1
$B open http://127.0.0.1:3100/learn >/dev/null 2>&1; sleep 2
$B screenshot $EV/E1b-learn.png >/dev/null 2>&1
LOCKED=$($B eval "document.body.innerText.includes('قفل') ? 'lock-rows-shown' : 'NO-LOCK-ROWS'" 2>/dev/null | tail -1)
echo "journey lock rows: $LOCKED"

echo "=== [2] h0 completion via API-honest path: enter, grade?, complete"
# h0 is viewed-criterion + no exercise blocks → complete directly (honest)
COOKIE=$($B cookies 2>/dev/null | grep -o 'hanaso_lid=[^;[:space:]]*' | head -1)
echo "cookie: ${COOKIE:0:25}..."
API=http://127.0.0.1:3100/api/curriculum/station
C0=$(curl -s -o /tmp/r.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d '{"action":"complete","chapterSlug":"kana-foundation-01","stationSlug":"stn-kana-h0"}')
echo "h0 complete: $C0"

echo "=== [3] M1 guard negative check: h1 complete WITHOUT grade → expect 409 no_graded_answers"
CN=$(curl -s -o /tmp/rn.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d '{"action":"complete","chapterSlug":"kana-foundation-01","stationSlug":"stn-kana-h1","score":1,"taskCompleted":true}')
CODE=$(python3 -c "import json;print(json.load(open('/tmp/rn.json'))['error']['code'])" 2>/dev/null)
echo "h1 no-grade complete: $CN code=$CODE (expect 409 no_graded_answers)"

echo "=== [4] honest grade then complete h1"
# get h1 first exercise from the station page data (client payload has options)
EX=$(curl -s "http://127.0.0.1:3100/api/curriculum/station?chapter=kana-foundation-01&station=stn-kana-h1" -H "cookie: $COOKIE")
EID=$(echo "$EX" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for b in d.get('blocks',[]):
    for i in b.get('exerciseIds',[]):
        e=(d.get('exercises') or {}).get(i)
        if e and e.get('options'): print(i); break
    else: continue
    break" 2>/dev/null)
OPT=$(echo "$EX" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for b in d.get('blocks',[]):
    for i in b.get('exerciseIds',[]):
        e=(d.get('exercises') or {}).get(i)
        if e and e.get('options'): print(e['options'][0]['id']); break
    else: continue
    break" 2>/dev/null)
echo "first exercise: $EID opt=$OPT"
CG=$(curl -s -o /tmp/rg.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d "{\"action\":\"grade\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"stn-kana-h1\",\"exerciseId\":\"$EID\",\"attemptNo\":1,\"answer\":{\"kind\":\"option\",\"optionId\":\"$OPT\"}}")
echo "grade: $CG"
CC=$(curl -s -o /tmp/rc.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d '{"action":"complete","chapterSlug":"kana-foundation-01","stationSlug":"stn-kana-h1","score":1,"taskCompleted":true}')
echo "h1 complete after grade: $CC (expect 200)"

echo "=== [5] F2 negative: grade h2's exercise through h3 (cross-station) → expect 404"
EX2=$(curl -s "http://127.0.0.1:3100/api/curriculum/station?chapter=kana-foundation-01&station=stn-kana-h2" -H "cookie: $COOKIE")
EID2=$(echo "$EX2" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for b in d.get('blocks',[]):
    for i in b.get('exerciseIds',[]):
        e=(d.get('exercises') or {}).get(i)
        if e and e.get('options'): print(i); break
    else: continue
    break" 2>/dev/null)
OPT2=$(echo "$EX2" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for b in d.get('blocks',[]):
    for i in b.get('exerciseIds',[]):
        e=(d.get('exercises') or {}).get(i)
        if e and e.get('options'): print(e['options'][0]['id']); break
    else: continue
    break" 2>/dev/null)
CF=$(curl -s -o /tmp/rf.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d "{\"action\":\"grade\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"stn-kana-h3\",\"exerciseId\":\"$EID2\",\"attemptNo\":1,\"answer\":{\"kind\":\"option\",\"optionId\":\"$OPT2\"}}")
echo "cross-station grade via h3: $CF (expect 404)"

echo "=== [6] journey shows progress + current row"
$B open http://127.0.0.1:3100/learn >/dev/null 2>&1; sleep 2
CUR=$($B eval "document.querySelector('[aria-current]')?.innerText?.slice(0,40) ?? 'none'" 2>/dev/null | tail -1)
echo "current row: $CUR"
$B screenshot $EV/E6-journey-progress.png >/dev/null 2>&1

echo "=== [7] second learner isolation"
$B --session s29e2 open http://127.0.0.1:3100/learn >/dev/null 2>&1; sleep 2
CUR2=$($B --session s29e2 eval "document.querySelector('[aria-current]')?.innerText?.slice(0,40) ?? 'none'" 2>/dev/null | tail -1)
STAT2=$($B --session s29e2 eval "document.body.innerText.includes('۱ ایستگاه') || document.body.innerText.includes('۱ ایستگاه مسیر اصلی') ? 'sees-own-progress' : 'fresh-or-own'" 2>/dev/null | tail -1)
echo "learner2 current row: $CUR2 (must NOT be h2 — fresh learner sees h0) | stat=$STAT2"
$B --session s29e2 screenshot $EV/E7-learner2.png >/dev/null 2>&1

echo "=== [8] chapter-2 gate check (fresh learner → fm01 locked)"
GATE=$($B --session s29e2 eval "fetch('/learn/first-meeting-01/journey').then(r=>r.status).then(s=>{window.__g=s})" >/dev/null 2>&1; sleep 1; $B --session s29e2 eval "window.__g" 2>/dev/null | tail -1)
echo "fm01 journey status for locked learner: $GATE"
echo "=== done"
