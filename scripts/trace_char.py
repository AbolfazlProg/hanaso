#!/usr/bin/env python3
"""Generate an agent-browser eval that traces the CURRENT writing character
using its exact dense template medians, N strokes, via pointer events."""
import json, sys, os

char = sys.argv[1]
p = f'apps/web/public/writing-data/{char}.json'
if not os.path.exists(p):
    print("'no-json-for:"+char+"'"); sys.exit(0)
d = json.load(open(p, encoding='utf-8'))

def dense(m):
    out = []
    for i in range(len(m)-1):
        for k in range(10):
            f = k/10
            out.append([round(m[i][0]+(m[i+1][0]-m[i][0])*f, 1), round(m[i][1]+(m[i+1][1]-m[i][1])*f, 1)])
    out.append(m[-1])
    return out

M = [dense(m) for m in d['medians']]
js = json.dumps(M)
print(f"""(function(){{var svg=Array.from(document.querySelectorAll('svg')).map(s=>({{s:s,r:s.getBoundingClientRect()}})).filter(o=>o.r.width>200&&o.r.height>100)[0];if(!svg)return 'no-svg';var s=svg.s,r=svg.r;function fire(type,x,y,id){{s.dispatchEvent(new PointerEvent(type,{{bubbles:true,clientX:x,clientY:y,pointerId:id,isPrimary:true,pressure:.5,pointerType:'pen',button:0,buttons:type==='pointerup'?0:1}}));}}var M={js};for(var si=0;si<M.length;si++){{var med=M[si];fire('pointerdown',r.x+med[0][0]/1024*r.width,r.y+med[0][1]/1024*r.height,300+si);for(var j=1;j<med.length;j++){{fire('pointermove',r.x+med[j][0]/1024*r.width,r.y+med[j][1]/1024*r.height,300+si);}}fire('pointerup',r.x+med[med.length-1][0]/1024*r.width,r.y+med[med.length-1][1]/1024*r.height,300+si);}}return '{char} strokes: '+M.length;}})()""")
