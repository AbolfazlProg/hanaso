#!/bin/bash
# TASK28 CP-3 — seed walk progress (h0..h4 complete, h5 stays current) for the
# reduced-motion browser test, using the browser session's own cookie.
# Server-authoritative POSTs — the same actions the real runner sends.
set -e
COOKIE="hanaso_lid=$1"
API="http://127.0.0.1:3100/api/curriculum/station"
for S in stn-kana-h0 stn-kana-h1 stn-kana-h2 stn-kana-h3 stn-kana-h4; do
  CODE=$(curl -s -o /tmp/seed-resp.json -w "%{http_code}" -X POST "$API" \
    -H "content-type: application/json" -H "cookie: $COOKIE" \
    -d "{\"action\":\"complete\",\"chapterSlug\":\"kana-foundation-01\",\"stationSlug\":\"$S\",\"score\":1,\"taskCompleted\":true}")
  echo "$S -> $CODE"
  if [ "$CODE" != "200" ]; then cat /tmp/seed-resp.json; echo; exit 1; fi
done
