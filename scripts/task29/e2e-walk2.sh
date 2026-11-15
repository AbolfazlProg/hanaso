#!/bin/bash
# TASK29 E2E part 2 — honest grade via known exercise id (from repo content),
# M1 positive, F2 negative, resume, isolation, chapter-2 sample, F1 page check.
set -u
cd /home/z/my-project/hanaso16/apps/web
B="agent-browser --session s29e"
EV=/home/z/my-project/hanaso16/ops/checkpoints/TASK-HANASO-29/evidence
COOKIE=$($B cookies 2>/dev/null | grep -o 'hanaso_lid=[^;[:space:]]*' | head -1)
API=http://127.0.0.1:3100/api/curriculum/station

# pull REAL exercise ids from the content module via vitest node (one-off print)
cat > /tmp/t29-ids.test.ts <<'EOF'
import { it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
it('print', () => {
  const ch = getChapter('kana-foundation-01')!;
  for (const slug of ['stn-kana-h1', 'stn-kana-h2']) {
    const st = ch.stations.find((s) => s.slug === slug)!;
    for (const b of st.blocks) {
      if (b.kind === 'exercise') {
        const ids = (b as { exerciseIds: string[] }).exerciseIds;
        const ex = ch.exercises[ids[0]!];
        console.log(`IDS ${slug} ${ex.id} ${ex.correctOptionId}`);
        break;
      }
    }
  }
});
EOF
cp /tmp/t29-ids.test.ts tests/unit/t29-ids-tmp.test.ts
IDS=$(PATH=~/.local/bin:$PATH pnpm exec vitest run tests/unit/t29-ids-tmp.test.ts 2>/dev/null | grep "^IDS" | head -2)
rm -f tests/unit/t29-ids-tmp.test.ts
H1_ID=$(echo "$IDS" | grep "stn-kana-h1" | awk '{print $3}')
H1_OK=$(echo "$IDS" | grep "stn-kana-h1" | awk '{print $4}')
H2_ID=$(echo "$IDS" | grep "stn-kana-h2" | awk '{print $3}')
H2_OK=$(echo "$IDS" | grep "stn-kana-h2" | awk '{print $4}')
echo "h1: $H1_ID / h2: $H2_ID"

echo "=== [4b] honest grade + complete h1"
G=$(curl -s -o /tmp/g.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d "{\"action\":\"grade\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"stn-kana-h1\",\"exerciseId\":\"$H1_ID\",\"attemptNo\":1,\"answer\":{\"kind\":\"option\",\"optionId\":\"$H1_OK\"}}")
echo "grade h1: $G"
C=$(curl -s -o /tmp/c.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d '{"action":"complete","chapterSlug":"kana-foundation-01","stationSlug":"stn-kana-h1","score":1,"taskCompleted":true}')
echo "complete h1 after grade: $C (expect 200)"

echo "=== [5b] F2 cross-station: grade h2's exercise via h3 endpoint → expect 404"
F=$(curl -s -o /tmp/f.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d "{\"action\":\"grade\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"stn-kana-h3\",\"exerciseId\":\"$H2_ID\",\"attemptNo\":1,\"answer\":{\"kind\":\"option\",\"optionId\":\"$H2_OK\"}}")
FCODE=$(python3 -c "import json;print(json.load(open('/tmp/f.json'))['error']['code'])" 2>/dev/null)
echo "cross-station grade: $F code=$FCODE (expect 404 unknown_exercise)"

echo "=== [9] resume: enter h2 with anchor, then GET state shows anchor"
E=$(curl -s -o /tmp/e.json -w "%{http_code}" -X POST $API -H "content-type: application/json" -H "cookie: $COOKIE" -d '{"action":"enter","chapterSlug":"kana-foundation-01","stationSlug":"stn-kana-h2","currentBlockId":"blk-stn-kana-h2-card-hira-ka","stepIndex":0}')
ANCH=$(curl -s "$API?chapter=kana-foundation-01&station=stn-kana-h2" -H "cookie: $COOKIE" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['state'].get('currentBlock'))" 2>/dev/null)
echo "enter h2: $E anchor=$ANCH (expect blk-stn-kana-h2-card-hira-ka)"

echo "=== [10] journey UI for learner1 (h2 current) + screenshot"
$B open http://127.0.0.1:3100/learn >/dev/null 2>&1; sleep 2
ROW=$($B eval "Array.from(document.querySelectorAll('[aria-current]')).map(e=>e.innerText.split('\\n')[0]).join('|')" 2>/dev/null | tail -1)
echo "current-row learner1: $ROW"
$B screenshot $EV/E10-learner1-h2-current.png >/dev/null 2>&1

echo "=== [11] F1 home check: no /review link anywhere on home"
$B open http://127.0.0.1:3100/ >/dev/null 2>&1; sleep 2
RL=$($B eval "Array.from(document.querySelectorAll('a')).filter(a=>a.getAttribute('href')==='\/review').length" 2>/dev/null | tail -1)
echo "home /review links: $RL (expect 0)"
$B screenshot $EV/E11-home-no-review-link.png >/dev/null 2>&1

echo "=== [12] chapter-2 sample walk (learner2 fresh → fm01 gate blocks journey UI)"
B2="agent-browser --session s29e2"
$B2 open http://127.0.0.1:3100/learn/first-meeting-01/journey >/dev/null 2>&1; sleep 3
GATE_TXT=$($B2 eval "document.body.innerText.slice(0,200).replace(/\\n/g,' ')" 2>/dev/null | tail -1 | head -c 180)
echo "fm01 gate text: $GATE_TXT"
$B2 screenshot $EV/E12-fm01-gate.png >/dev/null 2>&1

echo "=== [13] isolation recheck: learner2 journey must show h0 current (its own frontier)"
$B2 open http://127.0.0.1:3100/learn >/dev/null 2>&1; sleep 2
ROW2=$($B2 eval "Array.from(document.querySelectorAll('[aria-current]')).map(e=>e.innerText.split('\\n')[0]).join('|')" 2>/dev/null | tail -1)
echo "current-row learner2: $ROW2 (expect خوش‌آمد/h0 — NOT h2)"
$B2 screenshot $EV/E13-learner2-isolation.png >/dev/null 2>&1
echo "=== done2"
