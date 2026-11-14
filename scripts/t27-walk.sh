#!/usr/bin/env bash
# TASK-27 E2E helper: complete the h1..h5 prerequisite walk for the browser's
# OWN learner session (same POST /api/curriculum/station calls StationRunner
# sends) so the practice station p1 unlocks for REAL in the UI.
# Usage: bash walk.sh '<hanaso_lid cookie value>' <slug> [slug2 ...]
COOKIE="$1"; shift
for SLUG in "$@"; do
  CODE=$(curl -s -o /tmp/walk-resp.json -w "%{http_code}" -X POST "http://127.0.0.1:3100/api/curriculum/station" \
    -H 'content-type: application/json' -H "cookie: hanaso_lid=$COOKIE" \
    -d "{\"action\":\"complete\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"$SLUG\",\"score\":1,\"taskCompleted\":true}")
  ALREADY=$(python3 -c "import json;d=json.load(open('/tmp/walk-resp.json'));print(d.get('data',{}).get('already'))" 2>/dev/null)
  echo "$SLUG -> $CODE already=$ALREADY"
done
