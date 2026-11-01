#!/usr/bin/env bash
# Spike M0-07 — بازتولید کامل اعداد گزارش SPIKE-M0-07-FONTS-IRAN.md
# محیط: Agent sandbox (خارج از ایران) · 2026-11-01 · fonttools 4.62.1 + brotli
# خروجی فایل فونت در /tmp مانده و هرگز کامیت نمی‌شود (قانون اسپایک).
set -euo pipefail
WORK=/tmp/spike-m0-07; mkdir -p $WORK/fonts $WORK/subsets $WORK/charsets
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36"
cd $WORK

### ۱) دسترس‌پذیری CDN از محیط Agent (خارج از ایران) — وضعیت + زمان
for host in fonts.googleapis.com fonts.gstatic.com cdn.jsdelivr.net cdnjs.cloudflare.com unpkg.com; do
  for i in 1 2 3; do
    curl -sI -o /dev/null --max-time 15 -w "$host try$i: HTTP %{http_code} dns=%{time_namelookup}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s ip=%{remote_ip}\n" "https://$host/"
  done
done
# درخواست واقعی CSS و woff2 (ریشهٔ دامنهٔ گوگل‌فونتس 404 طبیعی است؛ مسیر واقعی زیر):
curl -s -o /dev/null -w "css2 API: HTTP %{http_code} total=%{time_total}s size=%{size_download}B\n" -A "$UA" \
  "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap"

### ۲) دانلود فونت‌های رسمی (منابع canonical)
# Vazirmatn v33.003 (ریلیز رسمی نویسنده)
curl -sL -A "$UA" "https://github.com/rastikerdar/vazirmatn/releases/download/v33.003/vazirmatn-v33.003.zip" -o fonts/vazirmatn.zip
unzip -oq fonts/vazirmatn.zip -d fonts/vazirmatn
# فونت‌های JP از مخزن رسمی google/fonts (شاخهٔ main)
BASE="https://raw.githubusercontent.com/google/fonts/main/ofl"
for f in "zenkakugothicnew/ZenKakuGothicNew-Regular.ttf" "zenkakugothicnew/ZenKakuGothicNew-Medium.ttf" \
         "zenkakugothicnew/ZenKakuGothicNew-Bold.ttf" "notoserifjp/NotoSerifJP%5Bwght%5D.ttf" \
         "bizudgothic/BIZUDGothic-Regular.ttf" "bizudgothic/BIZUDGothic-Bold.ttf"; do
  curl -sL -A "$UA" "$BASE/$f" -o "fonts/$(basename "${f//%5B/[}")"
done
stat -c "%s %n" fonts/*.ttf   # ← اندازهٔ واقعی فایل‌های منبع (جدول ۲ گزارش)

### ۳) اندازهٔ سهم‌های CDN (gstatic) — جمع کامل هر وزن
for fam in "Zen+Kaku+Gothic+New:wght@400;500;700" "Noto+Serif+JP:wght@400;600" "Vazirmatn:wght@400;500;700"; do
  curl -s --max-time 20 -A "$UA" "https://fonts.googleapis.com/css2?family=$fam&display=swap" \
    -o "css-$(echo $fam | tr ':@+.;' '_____').css"
done
# سپس برای هر @font-face یک HEAD بزن و content-length ها را جمع بزن (اسکریپت پایتون در measurements.md §۳)

### ۴) زیرمجموعه‌سازی با pyftsubset
pip install fonttools brotli
# فایل‌های charset از spikes/fonts-iran/ همین ریپو (مسیر ریپو را ست کنید)
CS="${REPO_DIR:-$HOME/my-project/hanaso}/spikes/fonts-iran"
SUB() { pyftsubset "$1" --unicodes-file="$3" --flavor=woff2 --layout-features='*' --output-file="$2"; }
# Noto Serif JP: نسخهٔ variable → اینستنس 400 و 600
fonttools varLib.instancer -q -o fonts/NotoSerifJP-400.ttf fonts/NotoSerifJP-VF.ttf wght=400
fonttools varLib.instancer -q -o fonts/NotoSerifJP-600.ttf fonts/NotoSerifJP-VF.ttf wght=600
for w in Regular Medium Bold; do SUB fonts/ZenKakuGothicNew-$w.ttf subsets/ZenKakuGothicNew-$w-full.woff2     $CS/charset-set-full.txt; done
for w in Regular Medium Bold; do SUB fonts/ZenKakuGothicNew-$w.ttf subsets/ZenKakuGothicNew-$w-starter.woff2 $CS/charset-set-starter.txt; done
for w in 400 600; do SUB fonts/NotoSerifJP-$w.ttf subsets/NotoSerifJP-$w-full.woff2 $CS/charset-set-full.txt; done
SUB fonts/NotoSerifJP-VF.ttf subsets/NotoSerifJP-VF-full.woff2 $CS/charset-set-full.txt
for w in Regular Bold; do SUB fonts/BIZUDGothic-$w.ttf subsets/BIZUDGothic-$w-full.woff2     $CS/charset-set-full.txt; done
for w in Regular Bold; do SUB fonts/BIZUDGothic-$w.ttf subsets/BIZUDGothic-$w-starter.woff2 $CS/charset-set-starter.txt; done
for w in Regular Medium Bold; do SUB fonts/vazirmatn/misc/Farsi-Digits/fonts/ttf/Vazirmatn-FD-$w.ttf subsets/Vazirmatn-FD-$w.woff2 $CS/charset-set-fa.txt; done
stat -c "%s %n" subsets/*.woff2   # ← جدول ۴ گزارش

### ۵) اعتبارسنجی پوشش گلیف
python3 - <<'PY'
from fontTools.ttLib import TTFont
sample = "こんにちは。私の名前はアリです。日本語を勉強しています。東京タワーの高さは333メートルです。切符を買って、電車に乗ります。だいじょうぶですか。①②③"
import glob
for p in sorted(glob.glob('subsets/*.woff2')):
    cmap = TTFont(p).getBestCmap()
    miss = [c for c in set(sample) if ord(c) not in cmap]
    print(p, "OK" if not miss else "MISSING "+repr("".join(miss)))
PY
