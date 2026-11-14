#!/bin/bash
# Walk the h12 deck forward handling each block type until the dakuten step.
cd /home/z/my-project/hanaso16
for i in $(seq 1 40); do
  t=$(agent-browser eval "document.body.innerText" 2>/dev/null | head -1)
  if echo "$t" | grep -q "داکوتن ردیف は"; then echo "=== DAKUTEN REACHED (iter $i) ==="; echo "$t" | head -50; break; fi
  if echo "$t" | grep -q "«ぶ» چه صدایی"; then echo "=== MICROASK REACHED (iter $i) ==="; echo "$t" | head -50; break; fi
  # 1) start drill button
  a=$(agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='شروع تمرین نوشتن'); b?(b.click(),'start'):''" 2>/dev/null | head -1)
  [ "$a" = "start" ] && { echo "iter$i: start drill"; sleep 2; continue; }
  # 2) writing canvas present? trace active char
  svg=$(agent-browser eval "Array.from(document.querySelectorAll('svg')).some(s=>{var r=s.getBoundingClientRect(); return r.width>200&&r.height>100})?'yes':'no'" 2>/dev/null | head -1)
  if [ "$svg" = "yes" ]; then
    ch=$(agent-browser eval "var t=document.body.innerText; var m=t.match(/«(.+?)»/); m?m[1]:''" 2>/dev/null | head -1 | tr -d '"')
    # fallback: heading contains the kana in «»
    if [ -z "$ch" ]; then ch=$(agent-browser snapshot 2>/dev/null | grep -oP '«\K[^»]+' | head -1); fi
    if [ -n "$ch" ] && [ -f "apps/web/public/writing-data/$ch.json" ]; then
      agent-browser eval "$(python3 scripts/trace_char.py "$ch")" >/dev/null 2>&1
      echo "iter$i: traced $ch"; sleep 3; continue
    else
      # unknown char: click راهنما then trace via generic char guess from title
      agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='راهنما'); b&&b.click()" >/dev/null 2>&1
      echo "iter$i: unknown char '$ch' — hint clicked"; sleep 2; continue
    fi
  fi
  # 3) quiz: pick first radio, submit, then advance
  q=$(agent-browser eval "var rad=Array.from(document.querySelectorAll('[role=radio],button')).filter(b=>b.getAttribute('role')==='radio'||/^[ぁ-ゖァ-ヺー]+$/.test(b.textContent.trim())); rad.length? (rad[0].click(),'picked'):'no-rad'" 2>/dev/null | head -1)
  if [ "$q" = "picked" ]; then
    sleep 1
    agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('بررسی پاسخ')); b&&!b.disabled?(b.click(),'sub'):''" >/dev/null 2>&1
    echo "iter$i: quiz answer"; sleep 2
    agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>/ادامه|بعدی|فهمیدم|متوجه|بستن/.test(x.textContent)); b?(b.click(),'adv'):''" >/dev/null 2>&1
    sleep 1; continue
  fi
  # 4) generic advance button
  adv=$(agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>/^(عادی|ادامه|بعدی|فهمیدم|باشه|متوجه شدم)$/.test(x.textContent.trim())); b?(b.click(),'adv'):''" 2>/dev/null | head -1)
  [ "$adv" = "adv" ] && { echo "iter$i: advance"; sleep 2; continue; }
  # 5) retry button
  r=$(agent-browser eval "var b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('دوباره تلاش')); b?(b.click(),'retry'):''" 2>/dev/null | head -1)
  [ "$r" = "retry" ] && { echo "iter$i: retry"; sleep 2; continue; }
  echo "iter$i: idle"; sleep 2
done
