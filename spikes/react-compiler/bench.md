# Spike 1 — TASK-M0-05: React Compiler 1.0 — دفترچهٔ آزمایش (bench notes)

> تاریخ: 2026-11-01 · محیط: Node v24.22.1 · pnpm 12.16.1 · Next.js 16.4.3 (Turbopack) · React 19.3.1 · babel-plugin-react-compiler **1.0.0**
> مرورگر بنچ: HeadlessChrome/156.0.0.0 (agent-browser 0.40.0 = Playwright Chromium) روی سرور standalone تولیدی
> همهٔ اعداد زیر با دستورهای «بازتولید» قابل اجرای مجددند.

## ۱. روش

1. `pnpm --filter web add -D babel-plugin-react-compiler` → نسخهٔ نصب‌شده 1.0.0 (پرچم devDependency؛ بی‌اثر تا وقتی config روشنش نکند).
2. کلید config در Next 16.4.3 از نوع‌های `node_modules/next/dist/server/config-shared.d.ts`:
   `reactCompiler?: boolean | ReactCompilerOptions` — **top-level**، نه `experimental.reactCompiler`.
3. صفحهٔ بنچ (کد کامل: `bench-page.tsx.txt`، مسیر موقت `src/app/spike-react-compiler/page.tsx`) — client component با دو واریانت:
   - `VocabListNoMemo`: بدون هیچ memoization دستی (کاندید کامپایلر)؛ ۲۰۰ آیتم، استخراج رشته + JSX list.
   - `VocabListManualMemo`: `useMemo` دستی (مرجعِ «کد دستی خوب»).
   - درایور: `createRoot` روی host با `display:none`؛ N رندرِ مجدد اجباریِ همزمان (flushSync) از والد با props فرزندِ **ثابت**؛ warmup=200، ۵ اجرای ۱۰۰۰تایی، میانه گزارش می‌شود.
   - `display:none` ⇒ کارِ اندازه‌گیری‌شده = reconciliation ری‌اکت + جهش DOM است، بدون layout/paint (صادقانه: عددِ موردنظرِ production-ui از این کمی کمتر/متفاوت است؛ جهت مقایسه نسبی معتبر است).
4. دو بیلد (خاموش/روشن) با `time pnpm build`؛ اندازه‌ها با `du -sk`/`wc -c`/`find|wc -l`؛ سپس سرو standalone (`node .next/standalone/apps/web/server.js`) و اجرای بنچ در مرورگر headless دو بار (دو بارگذاری صفحه).

بازتولید:

```bash
export PATH=~/.local/bin:$PATH
cd /home/z/my-project/hanaso
mkdir -p apps/web/src/app/spike-react-compiler
cp spikes/react-compiler/bench-page.tsx.txt apps/web/src/app/spike-react-compiler/page.tsx
# در next.config.ts به‌صورت موقت: reactCompiler: true  (یا حذفش برای OFF)
cd apps/web && rm -rf .next && { time pnpm build ; } 2>&1 | tee build.log
du -sk .next .next/static; find .next -type f | wc -l
cp -r .next/static .next/standalone/apps/web/.next/static
(cd .next/standalone/apps/web && env -u DATABASE_URL PORT=3101 HOSTNAME=127.0.0.1 node server.js &)
agent-browser open http://127.0.0.1:3101/spike-react-compiler
agent-browser wait --fn "window.__BENCH__" --timeout 90000
agent-browser eval "JSON.stringify(window.__BENCH__)"
```

## ۲. خروجی بیلد (زوج نهایی، یک نشست، صفحهٔ بنچ حاضر)

| متریک                    | RC خاموش             | RC روشن              | Δ                                                       |
| ------------------------ | -------------------- | -------------------- | ------------------------------------------------------- |
| گام compile              | 5.7s                 | 6.2s                 | **+0.5s (+9٪)**                                         |
| گام TypeScript           | 3.1s                 | 3.0s                 | ~0                                                      |
| کل `real` بیلد           | 10.613s              | 11.061s              | +0.45s (+4٪)                                            |
| `.next/static`           | 608 KB / 12 فایل     | 608 KB / 12 فایل     | بدون تغییر در granularity چهار-کیلوبایتی du             |
| chunk صفحهٔ بنچ (client) | **2139 B**           | **2960 B**           | **+821 B (+38٪)**                                       |
| کل `.next`               | 77140 KB / 1477 فایل | 77628 KB / 1485 فایل | +492 KB (+0.6٪) — در محدودهٔ نویز cache توربوپک (پایین) |
| Warning/Error            | هیچ                  | هیچ                  | فقط پیام telemetry                                      |

زوج اول (صفحهٔ کوچک‌تر بدون درایور بنچ): OFF real=10.319s (compile 5.4s، کل 74332 KB/1476 فایل) / ON real=10.341s (compile 5.8s، کل 74880 KB/1484 فایل).
نمونه‌های تکمیلی خاموش: 10.809s و 10.186s؛ روشن: 10.757s و 10.006s — پراکندگی کلِ بیلد در محدودهٔ ±۰.۵s؛ اثر پایدار و معنادارِ واحد فقط روی گام compile است (+0.3 تا +0.5s).

نکتهٔ `.next/cache`: اندازهٔ cache توربوپک بین بیلدها ۲۶٫۲–۲۶٫۳ MB جابه‌جا می‌شود؛ مقایسهٔ «کل .next» را نویز می‌کند؛ مقایسهٔ دقیق = chunk-level (بالا).

## ۳. بنچ ران‌تایم (میانهٔ ۵ اجرا؛ هر اجرا = ۱۰۰۰ رندرِ مجدد؛ ۲۰۰ آیتم)

| واریانت               | RC خاموش (اجرای ۱ / ۲) | RC روشن (اجرای ۱ / ۲) | اثر                                                                 |
| --------------------- | ---------------------- | --------------------- | ------------------------------------------------------------------- |
| `VocabListNoMemo`     | **72.8 / 74.1 ms**     | **3.0 / 2.8 ms**      | **~۲۴–۲۶ برابر سریع‌تر**                                            |
| `VocabListManualMemo` | 2.7 / 3.0 ms           | 1.6 / 1.1 ms          | ~۱٫۷–۲٫۷ برابر سریع‌تر (کامپایلر حتی کد دستی را بازنویسی/بهینه کرد) |

اعداد خام (ms، ۵ اجرا): OFF-noMemo [116,85,72.8,69.3,68] و [96.8,74.1,69.9,74.5,68.2] · OFF-manual [3.8,3.1,2.6,2.7,2.7] و [3.7,3,2.8,3.2,2.9] · ON-noMemo [25.7,9,3,2.1,1.5] و [9.2,5.3,1.1,1.1,2.8] · ON-manual [1.4,1.1,2.9,1.7,1.6] و [1.1,1.1,1.1,1.2,1.5].
(اجراهای اول ON کندترند = گرم‌شدن JIT؛ میانه پایدار است.)

## ۴. تحلیل کد تولیدشده (مدرک memo/cache insertion)

`compiled-off-sample.js` (2139 B): `VocabListNoMemo` بدون هیچ کش — `let r=o(l,e)` در هر رندر:

```js
function u({ prefix: e }) {
  let r = o(l, e);
  return (0, n.jsx)('ul', { children: r.map((e) => (0, n.jsx)('li', { children: e }, e)) });
}
```

`compiled-on-sample.js` (2960 B): همان تابع با ۴ اسلات کش `useMemoCache` (ماژول runtime `react/compiler-runtime` به‌صورت inline: `r.c=function(e){return i.H.useMemoCache(e)}`) — هم مشتقه (`i[0]/i[1]`) و هم المان JSX (`i[2]/i[3]`) کش می‌شود:

```js
function u(e) {
  let t,
    o,
    i = (0, r.c)(4),
    { prefix: u } = e;
  return (
    i[0] !== u ? ((t = c(l, u).map(a)), (i[0] = u), (i[1] = t)) : (t = i[1]),
    i[2] !== t ? ((o = (0, n.jsx)('ul', { children: t })), (i[2] = t), (i[3] = o)) : (o = i[3]),
    o
  );
}
```

در واریانت دستی، کامپایلر `useMemo`های دستی را **حذف و با همان کش‌اسلات‌ها جایگزین** کرد (۶ اسلات). کامپوننت صفحه: ۱۸ اسلات + `Symbol.for("react.memo_cache_sentinel")` برای نودهای ایستا.

**یافتهٔ مهم (SSR):** chunk مربوط به رندر سمت سرورِ همان client component در بیلد ON با بیلد OFF **بایت‌به‌بایت یکسان** بود (md5 یکسان `a6322fb…`)؛ `useMemoCache` فقط در `.next/static` (باندل مرورگر) ظاهر شد. یعنی در Next 16.4.3/Turbopack، ترنسفورم کامپایلر روی تارگت مرورگر اعمال شد، نه باندل SSR. برای اسکلت فعلی (همهٔ صفحات server component) اثری ندارد؛ برای اپ واقعی یعنی سود کامپایلر فقط سمت کلاینت است — در میانهٔ تصمیم M0-09 ثبت شود.

## ۵. سلب مسئولیت/محدودیت‌ها

- محیط Agent (خارج از ایران)، یک ماشین، یک مرورگر (Chromium 156 headless)؛ پراکندگی بین اجراها در §۳ دیده می‌شود؛ جهت و بزرگی نسبی اثر پایدار بود.
- سناریوی بنش «props ثابت + رندر مجدد والد» دقیقاً سناریوی هدف memoization است؛ در UI واقعی همهٔ رندرها این‌شکلی نیستند.
- صفحهٔ تست و `reactCompiler` از کد نهایی حذف شدند؛ فقط devDependency `babel-plugin-react-compiler@1.0.0` (بی‌اثر) در `apps/web/package.json` ماند برای تصمیم M0-09.
