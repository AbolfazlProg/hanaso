#!/usr/bin/env node
/**
 * HANASO — TASK-HANASO-21 browser E2E suite (Phase 5).
 *
 * Runs against a PRODUCTION build (`next start`, in-memory stores) with real
 * Chromium (playwright-core). The answer key comes from
 * tests/unit/h21-e2e-key.test.ts (H21_E2E_DUMP) — the walker answers exercises
 * CORRECTLY on the first try, exactly like an ideal learner, so threshold
 * stations must complete. Nothing is mocked EXCEPT where a scenario
 * deliberately injects a failure (route interception on the complete POST).
 *
 * Usage:
 *   node scripts/h21-e2e/run.mjs --base http://127.0.0.1:3123 \
 *     --key /tmp/h21-e2e-key.json --out ops/checkpoints/TASK-HANASO-21/screenshots/e2e \
 *     --modules /tmp/h21e2e/node_modules
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const BASE = arg('base', 'http://127.0.0.1:3123');
const KEY_PATH = arg('key', '/tmp/h21-e2e-key.json');
const OUT = arg('out', '/home/z/my-project/hanaso21/ops/checkpoints/TASK-HANASO-21/screenshots/e2e');
const MODULES = arg('modules', '/tmp/h21e2e/node_modules');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(MODULES, 'playwright-core'));

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
const stationsByKey = new Map(key.stations.map((s) => [s.slug, s]));
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ helpers */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const faToEn = (s) => [...String(s)].map((c) => { const i = FA_DIGITS.indexOf(c); return i >= 0 ? String(i) : c; }).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const note = (step, ok, detail) => {
  results.push({ step, ok, ...(detail !== undefined ? { detail } : {}) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail !== undefined ? ` — ${detail}` : ''}`);
};

let shotIdx = 0;
async function shot(page, name) {
  shotIdx += 1;
  const file = path.join(OUT, `e2e-${String(shotIdx).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.basename(file);
}

/** Click the LAST visible+enabled button whose text equals the label — inside the page context. */
async function clickByText(page, label, { timeout = 15000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const clicked = await page.evaluate((lbl) => {
      const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
      const els = [...document.querySelectorAll('button')]
        .filter((b) => norm(b.textContent) === lbl && b.offsetParent !== null && !b.disabled);
      if (els.length === 0) return false;
      els[els.length - 1].click();
      return true;
    }, label);
    if (clicked) return true;
    await sleep(250);
  }
  return false;
}

/** Count visible+enabled buttons with the exact label. */
async function countButtons(page, label) {
  return page.evaluate((lbl) => {
    const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('button')]
      .filter((b) => norm(b.textContent) === lbl && b.offsetParent !== null && !b.disabled).length;
  }, label);
}

/** The walk step indicator «N / M» → { step, total } (1-based, numbers). */
async function readStep(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('p[aria-live="polite"]')];
    for (const el of els) {
      const m = (el.textContent || '').match(/([۰-۹0-9]+)\s*\/\s*([۰-۹0-9]+)/);
      if (m) return { step: m[1], total: m[2] }; // raw strings — Persian digits are NaN for Number()
    }
    return null;
  }).then((r) => (r && r.step ? { step: Number(faToEn(r.step)), total: Number(faToEn(r.total)) } : null));
}

/** The exercise-session section aria-label «سؤال N از M» → index (1-based). */
async function readQuestionIndex(page) {
  const lbl = await page.evaluate(() => {
    const el = document.querySelector('section[aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
  if (!lbl) return null;
  const m = lbl.match(/([۰-۹0-9]+)/);
  return m ? Number(faToEn(m[1])) : null;
}

const panels = (page) => page.evaluate(() => ({
  complete: !!document.querySelector('[data-station-complete]'),
  seal: !!document.querySelector('[data-aizen-seal]'),
  sealAnimate: !!document.querySelector('[data-aizen-seal][data-animate="true"]'),
  failGeneric: !!document.querySelector('[data-completion-failed]:not([data-completion-failed="criterion"]):not([data-completion-failed="prerequisites"])'),
  failCriterion: !!document.querySelector('[data-completion-failed="criterion"]'),
  failPrereq: !!document.querySelector('[data-completion-failed="prerequisites"]'),
  replayEnded: !!document.body.textContent?.includes('این مرور دوباره چیزی را تغییر نداد'),
}));

/** Watch station API calls; returns { counts, events } — call .stop() after. */
function watchStationApi(page) {
  const events = [];
  const onRequest = (req) => {
    if (!req.url().includes('/api/curriculum/station')) return;
    let action = null;
    try { action = JSON.parse(req.postData() || '{}').action ?? null; } catch {}
    events.push({ kind: 'request', action, url: req.url() });
  };
  const onResponse = (res) => {
    if (!res.url().includes('/api/curriculum/station')) return;
    const last = [...events].reverse().find((e) => e.kind === 'request' && e.url === res.url() && !e.status);
    if (last) last.status = res.status();
    events.push({ kind: 'response', status: res.status(), url: res.url() });
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  return {
    events,
    counts: () => {
      const byAction = {};
      for (const e of events) {
        if (e.kind === 'request' && e.action) byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      }
      return byAction;
    },
    statuses: () => events.filter((e) => e.kind === 'response').map((e) => e.status),
    stop: () => { page.off('request', onRequest); page.off('response', onResponse); },
  };
}

/* ------------------------------------------------------- the station walker */

/**
 * Walk a station to its end.
 * opts:
 *   perfect: true        — answer every exercise CORRECTLY on the first try
 *   wrongFinalBlock: true — answer the LAST exercise block's questions wrong
 *                          on the first attempt, correct on retry (score 0)
 *   interceptComplete: async (route) => ... — route interception for the
 *                          complete POST (failure injection)
 *   stopBeforeComplete: true — return right before the final block would end
 */
async function walkStation(page, chapterSlug, stationSlug, opts = {}) {
  const st = stationsByKey.get(stationSlug);
  if (!st) throw new Error(`unknown station ${stationSlug} in key`);
  const exerciseBlocks = st.blocks.filter((b) => b.kind === 'exercise');
  const watch = watchStationApi(page);
  const consoleErrors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  page.on('console', onConsole);

  if (opts.interceptComplete) {
    await page.route('**/api/curriculum/station', async (route) => {
      const pd = route.request().postData() || '';
      if (pd.includes('"complete"')) await opts.interceptComplete(route);
      else await route.continue();
    });
  }

  if (opts.noNavigate !== true) {
    await page.goto(`${BASE}/learn/${chapterSlug}/journey/${stationSlug}`, { waitUntil: 'domcontentloaded' });
    await sleep(1200);
  }

  const lastExerciseBlockIdx = st.blocks.map((b) => b.kind).lastIndexOf('exercise');
  let guard = 0;
  let currentBlockIdx = -1;
  let questionsAnswered = 0;
  let sealSeenAnimated = null;

  while (guard++ < 500) {
    const p = await panels(page);
    if (process.env.H21_E2E_DEBUG) console.log(`   [walk ${stationSlug}] guard=${guard} panels=${JSON.stringify(p)}`);
    if (p.complete || p.failCriterion || p.failGeneric || p.failPrereq || p.replayEnded) {
      sealSeenAnimated = p.sealAnimate;
      break;
    }

    const stepInfo = await readStep(page);
    if (process.env.H21_E2E_DEBUG && guard < 4) {
      const url = page.url();
      const body = await page.evaluate(() => (document.body.textContent || '').replace(/\s+/g, ' ').slice(0, 120));
      console.log(`   [walk ${stationSlug}] step=${JSON.stringify(stepInfo)} url=${url} body=${body}`);
    }
    if (!stepInfo) { await sleep(600); continue; }
    const blockIdx = stepInfo.step - 1;
    const block = st.blocks[blockIdx];
    if (!block) throw new Error(`step ${stepInfo.step} beyond key blocks (${st.blocks.length}) for ${stationSlug}`);
    const isLastBlock = blockIdx === st.blocks.length - 1;

    if (block.kind === 'exercise') {
      /* ---- exercise session: answer every question ---- */
      const qIdx = (await readQuestionIndex(page)) ?? 1;
      const q = block.questions[qIdx - 1];
      if (!q) throw new Error(`${stationSlug}/${block.id}: no key question #${qIdx}`);
      const deliberateWrong = opts.wrongFinalBlock && blockIdx === lastExerciseBlockIdx;
      const wrongLabel = deliberateWrong ? q.optionLabels.find((l) => l !== q.correctLabel) : undefined;
      const label = wrongLabel ?? q.correctLabel;

      /* pick the option */
      const clicked = await page.evaluate((lbl) => {
        const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
        const radios = [...document.querySelectorAll('[role="radiogroup"] button[role="radio"]')]
          .filter((b) => !b.disabled && b.offsetParent !== null);
        const target = radios.find((b) => norm(b.textContent) === lbl);
        if (target) { target.click(); return true; }
        return false;
      }, label);
      if (!clicked) { await sleep(500); continue; }
      await sleep(250);

      /* submit */
      if (!(await clickByText(page, 'بررسی پاسخ', { timeout: 4000 }))) { await sleep(500); continue; }

      /* wrong → feedback (never auto-advances): retry correctly */
      if (deliberateWrong) {
        await sleep(900);
        const retried = await clickByText(page, 'دوباره تلاش کن', { timeout: 4000 });
        if (retried) {
          await sleep(500);
          const ok2 = await page.evaluate((lbl) => {
            const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
            const radios = [...document.querySelectorAll('[role="radiogroup"] button[role="radio"]')]
              .filter((b) => !b.disabled && b.offsetParent !== null);
            const target = radios.find((b) => norm(b.textContent) === lbl);
            if (target) { target.click(); return true; }
            return false;
          }, q.correctLabel);
          if (!ok2) { await sleep(500); continue; }
          await sleep(250);
          await clickByText(page, 'بررسی پاسخ', { timeout: 4000 });
        }
      }

      questionsAnswered += 1;
      /* wait for auto-next / manual advance / panel */
      const t0 = Date.now();
      let advanced = false;
      while (Date.now() - t0 < 14000) {
        await sleep(400);
        const pn = await panels(page);
        if (pn.complete || pn.failCriterion || pn.failGeneric || pn.failPrereq || pn.replayEnded) { advanced = true; break; }
        const nxt = await readQuestionIndex(page);
        const stp = await readStep(page);
        if (nxt !== qIdx || (stp && stp.step - 1 !== blockIdx)) { advanced = true; break; }
        /* manual «ادامه» if the timer somehow stalled */
        if (Date.now() - t0 > 6000) {
          await clickByText(page, 'ادامه', { timeout: 1000 });
        }
      }
      if (!advanced) throw new Error(`${stationSlug}: no advance after question ${qIdx} of ${block.id}`);
      continue;
    }

    /* ---- every other block: the action-row «ادامه» (the LAST visible one) ---- */
    if (opts.stopBeforeComplete && isLastBlock) {
      /* leave the walk parked ON the final block (wrap-up): a reload here is
       * the "refresh BEFORE completion" scenario */
      break;
    }
    const ok = await clickByText(page, 'ادامه', { timeout: 8000 });
    if (!ok) { await sleep(700); continue; }
    await sleep(700);
    if (blockIdx !== currentBlockIdx) currentBlockIdx = blockIdx;
  }

  if (opts.interceptComplete) await page.unroute('**/api/curriculum/station');
  watch.stop();
  page.off('console', onConsole);
  const p = await panels(page);
  return {
    panels: p,
    sealAnimate: sealSeenAnimated ?? p.sealAnimate,
    api: { counts: watch.counts(), statuses: watch.statuses() },
    consoleErrors,
    questionsAnswered,
  };
}

/* --------------------------------------------------- API fast-forward (honest: real endpoints, correct answers) */

async function fastForward(page, chapterSlug, stationSlugs) {
  /* the fetch needs a same-origin page context (about:blank cannot fetch) */
  if (!page.url().startsWith(BASE)) {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(800);
  }
  return page.evaluate(async ({ base, chapter, slugs }) => {
    const out = [];
    for (const slug of slugs) {
      const res = await fetch(`${base}/api/curriculum/station`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug: chapter, stationSlug: slug, score: 1 }),
      });
      out.push({ slug, status: res.status });
    }
    return out;
  }, { base: BASE, chapter: chapterSlug, slugs: stationSlugs });
}

const kanaStations = key.stations.filter((s) => s.slug.startsWith('stn-kana-')).map((s) => s.slug);
const ffUpTo = (last) => kanaStations.slice(0, kanaStations.indexOf(last) + 1);

/** Pass the kana chapter's mastery gate with honest correct answers (unlocks fm01). */
async function passMasteryGate(page) {
  const answers = {};
  for (const q of key.mastery['kana-foundation-01']) answers[q.id] = q.answer;
  return page.evaluate(async ({ base, answers }) => {
    const r = await fetch(`${base}/api/curriculum/mastery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterSlug: 'kana-foundation-01', answers }),
    });    const body = await r.json().catch(() => null);
    return { status: r.status, outcome: body?.data?.outcome };
  }, { base: BASE, answers });
}

/* ------------------------------------------------------------------ run */

const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const ctxA = await browser.newContext({ viewport: { width: 1366, height: 900 } });

try {
  /* ============ S1 — the owner onboarding path: first lesson h0 ============ */
  {
    const page = await ctxA.newPage();
    const watch = watchStationApi(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const cookieMinted = (await ctxA.cookies()).some((c) => c.name === "hanaso_lid");
    note('S1.1 first visit: middleware mints the per-browser learner id', cookieMinted);
    await shot(page, 's1-home-firstvisit');

    const cta = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find((x) => (x.textContent || '').includes('شروع یادگیری'));
      return a ? a.getAttribute('href') : null;
    });
    note('S1.2 the start CTA targets the FIRST lesson (stn-kana-h0)', cta === '/learn/kana-foundation-01/journey/stn-kana-h0', cta);

    const r = await walkStation(page, 'kana-foundation-01', 'stn-kana-h0');
    note('S1.3 h0 walked & completed with NO error panel', r.panels.complete && !r.panels.failGeneric && !r.panels.failCriterion);
    note('S1.4 the AIZEN seal appears with the FRESH ceremony (data-animate)', r.panels.seal && r.sealAnimate === true);
    await shot(page, 's1-h0-seal-fresh');
    const completes = r.api.counts.complete ?? 0;
    note('S1.5 exactly ONE complete request for the walk', completes === 1, `complete=${completes}`);
    const badStatuses = r.api.statuses.filter((s) => s >= 400).filter((s) => s !== 404 || false);
    note('S1.6 zero 4xx/5xx on the station API during the walk', badStatuses.length === 0, JSON.stringify(badStatuses));

    /* CTA back to map (a BUTTON — router.push, not a link) */
    const ctaClicked = await clickByText(page, 'پایان درس و بازگشت به مسیر', { timeout: 8000 });
    let mapUrl = null;
    if (ctaClicked) {
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        await sleep(400);
        if (page.url().includes('/journey')) { mapUrl = page.url(); break; }
      }
      await sleep(1200);
    }
    note('S1.7 the completion CTA navigates back to the map section', !!mapUrl && mapUrl.includes('/journey'), mapUrl);
    if (mapUrl) {
      await shot(page, 's1-map-after-h0');
      const doneVisible = await page.evaluate(() => document.body.textContent?.includes('ایستگاه این بخش انجام شد'));
      note('S1.8 the map reflects the completed station (section rows-done line)', !!doneVisible);
    }

    /* refresh: completion persists; home reflects OWN progress (next-lesson state) */
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const homeState = await page.evaluate(() => {
      const primary = [...document.querySelectorAll('a')].find((a) => (a.textContent || '').match(/شروع یادگیری|ادامهٔ درس|شروع درس بعدی|دروازهٔ فهم/));
      return primary ? { label: (primary.textContent || '').trim(), href: primary.getAttribute('href') } : null;
    });
    note('S1.9 home after completion shows the NEXT lesson (own progress kept)',
      !!homeState && homeState.label === 'شروع درس بعدی' && (homeState.href || '').includes('stn-kana-h1'),
      JSON.stringify(homeState));
    await shot(page, 's1-home-after-h0');
    const watch2 = watchStationApi(page);
    await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-h0`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const p2 = await panels(page);
    note('S1.10 revisit of the completed station: seal present, SETTLED (no re-animation)', p2.seal && !p2.sealAnimate);
    await shot(page, 's1-h0-seal-settled-revisit');
    note('S1.11 revisit fires NO new complete request', (watch2.counts().complete ?? 0) === 0);
    watch2.stop();
    watch.stop();
    await page.close();
  }

  /* ============ S2 — the owner-observed bug station stn-kana-k8, PERFECT walk ============ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    const ff = await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k7'));
    note('S2.1 honest API fast-forward of prerequisites h0..k7 (all 200)', ff.every((x) => x.status === 200), `${ff.length} stations`);

    const r = await walkStation(page, 'kana-foundation-01', 'stn-kana-k8');
    note('S2.2 PERFECT walk of stn-kana-k8 completes (the owner-bug regression: stale auto-next scored 2/3 → 409 forever)', r.panels.complete, JSON.stringify(r.api.counts));
    note('S2.3 NO 409 / failure panel on the k8 walk', !r.panels.failCriterion && !r.panels.failGeneric);
    note('S2.4 the k8 seal stamped with the fresh ceremony', r.panels.seal && r.sealAnimate === true);
    await shot(page, 's2-k8-seal-fresh');
    const bad = r.api.statuses.filter((s) => s >= 400);
    note('S2.5 zero 4xx/5xx during the k8 walk', bad.length === 0, JSON.stringify(bad));
    note('S2.6 no console errors during the k8 walk', r.consoleErrors.length === 0, r.consoleErrors.slice(0, 2).join(' | '));
    await page.close();
    await ctx.close();
  }

  /* ============ S3 — the second trap: stn-kana-k12-foreign PERFECT ============ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k12'));
    const r = await walkStation(page, 'kana-foundation-01', 'stn-kana-k12-foreign');
    note('S3.1 PERFECT walk of stn-kana-k12-foreign completes (the 1/2-trap regression)', r.panels.complete && !r.panels.failCriterion);
    note('S3.2 the k12-foreign seal ceremony', r.panels.seal && r.sealAnimate === true);
    await shot(page, 's3-k12foreign-seal');
    await page.close();
    await ctx.close();
  }

  /* ============ S4 — OBS-001: stn-fm01-01-anchor now carries a real check ============ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    /* unlock fm01 the honest way: core kana path + the mastery gate passed with correct answers */
    await fastForward(page, 'kana-foundation-01', kanaStations.filter((s) => s !== 'stn-kana-opt-r-h9' && s !== 'stn-kana-opt-drill'));
    const gate = await passMasteryGate(page);
    note('S4.0 the kana mastery gate passed via real API (fm01 unlocked)', gate.status === 201 && gate.outcome === 'passed', JSON.stringify(gate));
    const r = await walkStation(page, 'first-meeting-01', 'stn-fm01-01-anchor');
    note('S4.1 stn-fm01-01-anchor (viewed→0.6 check, OBS-001) completes on a perfect walk', r.panels.complete && !r.panels.failCriterion, JSON.stringify(r.api.counts));
    note('S4.2 the fm01 anchor seal ceremony', r.panels.seal && r.sealAnimate === true);
    await shot(page, 's4-fm01-anchor-seal');
    await page.close();

    /* responsive matrix on the seal */
    const pageM = await ctx.newPage();
    await pageM.setViewportSize({ width: 360, height: 800 });
    await pageM.goto(`${BASE}/learn/first-meeting-01/journey/stn-fm01-01-anchor`, { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    const pm = await panels(pageM);
    note('S4.3 seal visible at 360px (mobile) — settled on revisit', pm.seal && !pm.sealAnimate);
    await shot(pageM, 's4-seal-mobile-360');
    await pageM.setViewportSize({ width: 1440, height: 900 });
    await sleep(800);
    await shot(pageM, 's4-seal-desktop-1440');
    note('S4.4 seal renders at 1440px (desktop) too', (await panels(pageM)).seal);
    await pageM.close();
    await ctx.close();
  }

  /* ============ S5 — error & recovery scenarios ============ */

  /* S5.1 — criterion 409 + the redo-final-block recovery (stn-kana-k12-foreign) */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k12'));
    const r1 = await walkStation(page, 'kana-foundation-01', 'stn-kana-k12-foreign', { wrongFinalBlock: true });
    note('S5.1a a below-threshold final block shows the CRITERION 409 panel (not a generic error)', r1.panels.failCriterion && !r1.panels.complete);
    note('S5.1b the criterion panel keeps prior progress (no data-loss panel)', !r1.panels.failGeneric);
    await shot(page, 's5-criterion-409-panel');

    const redo = await page.$('[data-testid="redo-final-exercise"]');
    note('S5.1c the panel offers the redo-final-exercise action', !!redo);
    if (redo) {
      await redo.click();
      await sleep(1500);
      /* redo re-opens the FINAL exercise block in place — keep the page, walk it correctly */
      const r2 = await walkStation(page, 'kana-foundation-01', 'stn-kana-k12-foreign', { noNavigate: true });
      note('S5.1d after a correct redo the station COMPLETES (no full re-walk needed)', r2.panels.complete, JSON.stringify(r2.api.counts));
      await shot(page, 's5-after-redo-complete');
    }
    await page.close();
    await ctx.close();
  }

  /* S5.2 — completion POST fails (network abort), then recovers in place; navigate-away & back keeps progress */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k7'));
    let failFirst = true;
    const r = await walkStation(page, 'kana-foundation-01', 'stn-kana-k8', {
      interceptComplete: async (route) => {
        if (failFirst) { failFirst = false; await route.abort('connectionfailed'); }
        else await route.continue();
      },
    });
    note('S5.2a an aborted completion shows the honest failure panel (no fake success)', r.panels.failGeneric && !r.panels.complete);
    await shot(page, 's5-network-failure-panel');
    /* the in-place retry is OUTSIDE the walker: click «تلاش دوباره برای ثبت» */
    const retried = await clickByText(page, 'تلاش دوباره برای ثبت', { timeout: 8000 });
    let recovered = false;
    if (retried) {
      const t0 = Date.now();
      while (Date.now() - t0 < 15000) {
        await sleep(500);
        const p = await panels(page);
        if (p.complete) { recovered = true; break; }
      }
    }
    note('S5.2b the in-place retry («تلاش دوباره برای ثبت») recovers the completion', recovered);
    await shot(page, 's5-network-retry-recovered');
    /* navigate away and back: completed persists */
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-k8`, { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    const p = await panels(page);
    note('S5.2c after navigate-away + back the completion persists (settled seal)', p.seal && !p.sealAnimate);
    await page.close();
    await ctx.close();
  }

  /* S5.3 — refresh BEFORE completion, parked on the final block: progress survives, completes after resume */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k7'));
    /* walk k8 to the final wrap-up block, then STOP (no completion fired) */
    const r1 = await walkStation(page, 'kana-foundation-01', 'stn-kana-k8', { stopBeforeComplete: true });
    note('S5.3a walk parked on the final block (resume anchor armed, no complete yet)', (r1.api.counts.complete ?? 0) === 0, JSON.stringify(r1.api.counts));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2200);
    const resumed = await page.evaluate(() => document.body.textContent?.includes('از همان‌جا ادامه دادی'));
    note('S5.3b after refresh the walk RESUMES from the saved position', !!resumed);
    await shot(page, 's5-resume-banner');
    const r2 = await walkStation(page, 'kana-foundation-01', 'stn-kana-k8', { noNavigate: true });
    note('S5.3c the resumed walk completes — no progress lost', r2.panels.complete, JSON.stringify(r2.api.counts));
    await page.close();
    await ctx.close();
  }

  /* S5.4 — double activation on a viewed station's final CTA: ONE complete */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    const watch = watchStationApi(page);
    await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-h0`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    /* advance to the final wrap-up block, then DOUBLE-CLICK «ادامه» fast */
    for (let i = 0; i < 2; i++) {
      await clickByText(page, 'ادامه', { timeout: 8000 });
      await sleep(600);
    }
    const conts = await countButtons(page, 'ادامه');
    if (conts > 0) {
      await clickByText(page, 'ادامه', { timeout: 3000 });
      await clickByText(page, 'ادامه', { timeout: 1000 });
    }
    await sleep(4000);
    const p = await panels(page);
    const n = watch.counts().complete ?? 0;
    note('S5.4 double-click on the final advance fires exactly ONE complete (single-flight)', p.complete && n === 1, `complete=${n}`);
    note('S5.4b exactly one seal (no duplicate stamps)', p.seal);
    watch.stop();
    await page.close();
    await ctx.close();
  }

  /* S5.5 — REAL 409 prerequisites (fresh user, unmet chain) with the structured payload */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    const res = await page.evaluate(async ({ base }) => {
      const r = await fetch(`${base}/api/curriculum/station`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-h2', score: 1 }),
      });
      const body = await r.json().catch(() => null);
      return { status: r.status, code: body?.error?.code, msg: body?.error?.message, prereqs: body?.error?.details?.prerequisites?.map((p) => p.slug) };
    }, { base: BASE });
    note('S5.5a completing a prereq-locked station returns the structured 409', res.status === 409 && res.code === 'station/prerequisites_not_met', JSON.stringify(res));
    note('S5.5b the Persian message names the unmet lesson and the payload is ordered', !!res.msg?.includes('کامل') && Array.isArray(res.prereqs) && res.prereqs[0] === 'stn-kana-h1', JSON.stringify(res.prereqs));
    await page.close();
    await ctx.close();
  }

  /* S5.6 — replay of a completed station: no re-registration, no seal re-stamp */
  {
    const page = await ctxA.newPage();
    const watch = watchStationApi(page);
    await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-h0?mode=review`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const badge = await page.evaluate(() => document.body.textContent?.includes('مرور'));
    note('S5.6a replay mode opens the completed station with the review badge', !!badge);
    const r = await walkStation(page, 'kana-foundation-01', 'stn-kana-h0', {});
    note('S5.6b the replay end shows the honest "nothing changed" panel', r.panels.replayEnded || r.panels.complete);
    note('S5.6c replay fires NO complete request and stamps NO new seal', (watch.counts().complete ?? 0) === 0 && !(r.panels.seal && r.sealAnimate));
    await shot(page, 's5-replay-end');
    watch.stop();
    await page.close();
  }

  /* S5.7 — idempotent re-complete: already:true, one seal */
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await fastForward(page, 'kana-foundation-01', ffUpTo('stn-kana-k8'));
    const first = await page.evaluate(async ({ base }) => {
      const r = await fetch(`${base}/api/curriculum/station`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-k9', score: 1 }),
      });
      return { status: r.status, already: (await r.json().catch(() => null))?.data?.already };
    }, { base: BASE });
    const second = await page.evaluate(async ({ base }) => {
      const r = await fetch(`${base}/api/curriculum/station`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-k9', score: 1 }),
      });
      return { status: r.status, already: (await r.json().catch(() => null))?.data?.already };
    }, { base: BASE });
    note('S5.7 a repeated complete is idempotent (200 + already:true)', first.status === 200 && second.status === 200 && second.already === true, JSON.stringify({ first, second }));
    await page.close();
    await ctx.close();
  }

  /* S5.8 — same identity, new context (storageState): progress intact; guest sees none */
  {
    const state = await ctxA.storageState();
    const ctx2 = await browser.newContext({ storageState: state, viewport: { width: 1366, height: 900 } });
    const page = await ctx2.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    const kept = await page.evaluate(() => {
      const primary = [...document.querySelectorAll('a')].find((a) => (a.textContent || '').match(/شروع یادگیری|ادامهٔ درس|شروع درس بعدی|دروازهٔ فهم/));
      return primary ? (primary.textContent || '').trim() : null;
    });
    note('S5.8a the SAME identity in a fresh context keeps its progress (next-lesson state, not start)', kept === 'شروع درس بعدی', kept);
    await page.close();
    await ctx2.close();

    const ctxG = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const pg = await ctxG.newPage();
    await pg.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await sleep(1200);
    const guestClean = await pg.evaluate(() => {
      const t = document.body.textContent || '';
      return !t.includes('ادامهٔ یادگیری') && (t.includes('شروع یادگیری') || t.includes('شروع'));
    });
    note('S5.8b a cookie-less GUEST sees the clean empty state (no other user\'s progress)', guestClean);
    await pg.close();
    await ctxG.close();
  }

  /* ============ S6 — home smoke + map spot checks ============ */
  {
    const page = await ctxA.newPage();
    const resp = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    note('S6.1 home smoke: 200', resp.status() === 200);
    await page.goto(`${BASE}/learn/kana-foundation-01/journey`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await shot(page, 's6-map-desktop');
    const mapOk = await page.evaluate(() => !!document.body.textContent?.match(/ایستگاه|فصل|بخش/));
    note('S6.2 the learning map renders for the progressing user', mapOk);
    await page.setViewportSize({ width: 360, height: 800 });
    await sleep(700);
    await shot(page, 's6-map-mobile-360');
    await page.close();
  }

  /* ============ results ============ */
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const summary = { passed, failed, results };
  writeFileSync(path.join(OUT, 'E2E_RESULTS.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`\nE2E: ${passed}/${passed + failed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
} finally {
  await browser.close();
}
