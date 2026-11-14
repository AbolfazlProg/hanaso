#!/bin/bash
# Targeted walker for the h12 QUIZ steps only (radio + submit + retry loop).
# Reading answers from kana-items romaji map would be ideal; here we brute-force
# options (max 3 options each) with retry handling — the deck tolerates retries.
cd /home/z/my-project/hanaso16
probe() { agent-browser eval "var t=document.body.innerText; t.slice(0,260)" 2>/dev/null | head -1; }
for iter in $(seq 1 60); do
  t=$(probe)
  if echo "$t" | grep -qE "داکوتن ردیف は|«ぶ» چه صدایی"; then echo "=== TARGET REACHED (iter $iter) ==="; echo "$t"; break; fi
  if echo "$t" | grep -q "واژگان"; then
    # try each radio option in order until one advances the question counter
    cur=$(echo "$t" | grep -oE "[۰-۹]+ / ۳" | head -1)
    advanced=0
    for r in $(agent-browser snapshot -i 2>/dev/null | grep -oP 'radio "[^"]+" \[checked=false, ref=(\w+)\]' | grep -oP 'ref=\K\w+'); do
      agent-browser click @$r >/dev/null 2>&1; sleep 1
      sub=$(agent-browser snapshot -i 2>/dev/null | grep -oP 'button "بررسی پاسخ"( \[disabled,)? ref=\K\w+' | head -1)
      [ -n "$sub" ] && { agent-browser click @$sub >/dev/null 2>&1; sleep 2; }
      t2=$(probe)
      if echo "$t2" | grep -q "درست"; then advanced=1; echo "iter$iter: correct"; sleep 2; break; fi
      if echo "$t2" | grep -q "دوباره تلاش"; then
        rt=$(agent-browser snapshot -i 2>/dev/null | grep -oP 'button "دوباره تلاش کن", ref=\K\w+' | head -1)
        [ -z "$rt" ] && rt=$(agent-browser snapshot -i 2>/dev/null | grep -oP 'button "دوباره تلاش کن" \[ref=\K\w+' | head -1)
        [ -n "$rt" ] && { agent-browser click @$rt >/dev/null 2>&1; sleep 1; }
      else
        # counter advanced => was correct (feedback style varies)
        cur2=$(echo "$t2" | grep -oE "[۰-۹]+ / ۳" | head -1)
        [ "$cur" != "$cur2" ] && { advanced=1; echo "iter$iter: advanced ($cur -> $cur2)"; break; }
      fi
      # click برعکس: if answered wrongly and retry appears, loop continues
    done
    [ $advanced -eq 0 ] && echo "iter$iter: quiz no-progress"
    continue
  fi
  echo "iter$iter: non-quiz state: $(echo "$t" | head -c 90)"
  sleep 2
done
