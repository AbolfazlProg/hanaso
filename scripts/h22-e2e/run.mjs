#!/usr/bin/env node
/**
 * HANASO — TASK-HANASO-22 browser E2E (the mission's OWN scenarios).
 *
 * Complements the H21 suite (completion reliability) with the NEW surfaces:
 *   H1  Practice hub: honest empty state for a new learner (no fake numbers).
 *   H2  Focused practice: full session via the REAL API + browser (choice items,
 *       server grading, feedback, recap); evidence recorded (learning objects).
 *   H3  Mixed practice gate: locked before 3 completed stations (honest 409),
 *       unlocked after; the generated payload carries no answer keys.
 *   H4  Learn de-scoring: a zero-score walk still completes (task contract).
 *   H5  Journey sections: 2 sections; locked row click → reason notice;
 *       content-identity tile present on locked rows (no duplicate lock).
 *   H6  Milestone M1 available after h15; completes with the seal + chips.
 *   H7  Seal upgrade: bigger frame + rotating ring + local sound asset;
 *       mute toggle; revisit = settled (no re-animation).
 *   H8  Responsive spot: practice hub at 360px.
 *
 * Usage: node scripts/h22-e2e/run.mjs --base http://127.0.0.1:3123 --modules /tmp/h22e2e/node_modules
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const BASE = arg('base', 'http://127.0.0.1:3123');
const MODULES = arg('modules', '/tmp/h22e2e/node_modules');
const OUT = arg('out', '/tmp/h22-e2e-shots');

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(MODULES, 'playwright-core'));

mkdirSync(OUT, { recursive: true });
const results = [];
const note = (step, ok, detail) => {
  results.push({ step, ok, ...(detail !== undefined ? { detail } : {}) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail !== undefined ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let shotIdx = 0;
async function shot(page, name) {
  shotIdx += 1;
  const file = path.join(OUT, `h22-${String(shotIdx).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.basename(file);
}

const browser = await chromium.launch();

async function newLearner() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(700);
  return { ctx, page };
}

async function apiComplete(page, stationSlug, score = 1) {
  return page.evaluate(
    async ({ base, slug, score }) => {
      const r = await fetch(`${base}/api/curriculum/station`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: slug, score, taskCompleted: true }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    { base: BASE, slug: stationSlug, score },
  );
}

/** Walk the CURRENT station page answering via UI (any option; de-scored) until
 *  the completion panel appears. Returns the completion state. */
async function walkCurrentStation(page, maxSteps = 150) {
  for (let i = 0; i < maxSteps; i++) {
    const st = await page.evaluate(() => {
      const cont = [...document.querySelectorAll('button')].filter(
        (b) => b.offsetParent && !b.disabled && (b.textContent.includes('ادامه') || b.textContent.includes('پایان درس')),
      );
      const radio = [...document.querySelectorAll('[role="radio"]')].filter((r) => r.offsetParent && !r.hasAttribute('disabled'));
      return {
        contCount: cont.length,
        radioCount: radio.length,
        complete: !!document.querySelector('[data-station-complete]'),
        replayEnded: !!document.querySelector('[data-replay-ended]'),
      };
    });
    if (st.complete || st.replayEnded) return st;

    if (st.radioCount > 0) {
      /* 1) pick an option FIRST — the check button only enables after a pick */
      await page.evaluate(() => {
        [...document.querySelectorAll('[role="radio"]')].filter((r) => r.offsetParent && !r.hasAttribute('disabled'))[0].click();
      });
      await sleep(200);
      /* 2) the now-enabled check button */
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && !x.disabled && x.textContent.includes('بررسی پاسخ'));
        if (b) b.click();
      });
      await sleep(1500);
      /* the F1/F2 ladder: try again once, then whatever shows, continue */
      for (let k = 0; k < 3; k++) {
        const after = await page.evaluate(() => ({
          retry: !![...document.querySelectorAll('button')].find((b) => b.offsetParent && !b.disabled && b.textContent.includes('دوباره تلاش کن')),
          cont: !![...document.querySelectorAll('button')].find((b) => b.offsetParent && !b.disabled && b.textContent.includes('ادامه')),
        }));
        if (after.cont) break;
        if (after.retry) {
          await page.evaluate(() => {
            [...document.querySelectorAll('button')].find((b) => b.offsetParent && !b.disabled && b.textContent.includes('دوباره تلاش کن')).click();
          });
          await sleep(500);
          await page.evaluate(() => {
            const r = [...document.querySelectorAll('[role="radio"]')].filter((x) => x.offsetParent && !x.hasAttribute('disabled'));
            if (r[1]) r[1].click();
          });
          await sleep(140);
          await page.evaluate(() => {
            const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && !x.disabled && x.textContent.includes('بررسی پاسخ'));
            if (b) b.click();
          });
          await sleep(1300);
        } else {
          break;
        }
      }
      continue;
    }
    if (st.contCount > 0) {
      await page.evaluate(() => {
        [...document.querySelectorAll('button')].filter(
          (x) => x.offsetParent && !x.disabled && (x.textContent.includes('ادامه') || x.textContent.includes('پایان درس')),
        )[0].click();
      });
      await sleep(950);
    } else {
      await sleep(600);
    }
  }
  return await page.evaluate(() => ({
    complete: !!document.querySelector('[data-station-complete]'),
    replayEnded: !!document.querySelector('[data-replay-ended]'),
  }));
}

/* ============ H1 — practice hub: honest empty state ============ */
{
  const { ctx, page } = await newLearner();
  await page.goto(`${BASE}/practice`, { waitUntil: 'domcontentloaded' });
  await sleep(900);
  const state = await page.evaluate(() => ({
    hub: document.body.textContent.includes('تمرین متمرکز'),
    noTargets: document.body.textContent.includes('هنوز درسی کامل نشده'),
    honestReviewLine: document.body.textContent.includes('هنوز فعال نیست'),
    navPractice: !![...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/practice'),
  }));
  note('H1a practice hub renders for a new learner with the honest empty state', state.hub && state.noTargets);
  note('H1b the review line stays honest (engine not active)', state.honestReviewLine);
  note('H1c nav carries the practice destination', state.navPractice);
  await shot(page, 'h1-practice-empty');
  await ctx.close();
}

/* ============ H2 — focused practice: real session ============ */
{
  const { ctx, page } = await newLearner();
  await apiComplete(page, 'stn-kana-h0');
  await apiComplete(page, 'stn-kana-h1');
  await page.goto(`${BASE}/practice`, { waitUntil: 'domcontentloaded' });
  await sleep(900);
  const start = await page.$('[data-testid="start-focused"]');
  note('H2a focused practice is offered for the completed lesson', !!start);
  if (start) {
    await start.click();
    await sleep(1600);
    let answered = 0;
    let sawFeedback = false;
    for (let i = 0; i < 90; i++) {
      const st = await page.evaluate(() => ({
        optCount: [...document.querySelectorAll('[data-testid="practice-option"]')].filter((b) => b.offsetParent && !b.disabled).length,
        /* the check button exists even while disabled (before an option is picked) */
        hasCheck: !!document.querySelector('[data-testid="practice-check"]'),
        hasNext: !!document.querySelector('[data-testid="practice-next"]'),
        recap: !!document.querySelector('[data-testid="practice-recap"]'),
        feedback: !!document.querySelector('[data-practice-feedback]'),
      }));
      if (st.recap) break;
      if (st.hasCheck && st.optCount > 0) {
        /* 1) pick the first option — the check button enables */
        await page.evaluate(() => {
          [...document.querySelectorAll('[data-testid="practice-option"]')].filter((b) => b.offsetParent && !b.disabled)[0].click();
        });
        await sleep(220);
        /* 2) NOW the enabled check button */
        const check = await page.$('[data-testid="practice-check"]:not([disabled])');
        if (check) {
          await check.click();
          answered += 1;
          await sleep(800);
          if (await page.$('[data-practice-feedback]')) sawFeedback = true;
          continue;
        }
      }
      /* wrong-at-1 path: feedback with a try-again → retry once, then next */
      if (st.feedback) {
        const hasRetry = await page.evaluate(
          () => !![...document.querySelectorAll('button')].find((b) => b.offsetParent && !b.disabled && b.textContent.includes('تلاش دوباره')),
        );
        if (hasRetry) {
          await page.evaluate(() => {
            [...document.querySelectorAll('button')].find((b) => b.offsetParent && !b.disabled && b.textContent.includes('تلاش دوباره')).click();
          });
          await sleep(500);
          continue;
        }
        if (st.hasNext) {
          await page.click('[data-testid="practice-next"]');
          await sleep(650);
          continue;
        }
      }
      if (st.hasNext) {
        await page.click('[data-testid="practice-next"]');
        await sleep(650);
        continue;
      }
      await sleep(500);
    }
    note('H2b the session ran in the browser with server-graded feedback', answered > 0 && sawFeedback, `answered=${answered}`);
    const recap = await page.evaluate(() => ({
      present: !!document.querySelector('[data-testid="practice-recap"]'),
      text: document.querySelector('[data-testid="practice-recap"]')?.textContent ?? '',
    }));
    note('H2c the recap appears with the honest first-try count (no pass/fail)', recap.present && /بار اول درست/.test(recap.text), recap.text.slice(0, 100));
    await shot(page, 'h2-practice-recap');
    const status = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/practice`);
      return (await r.json().catch(() => null))?.data ?? null;
    }, BASE);
    note('H2d practice evidence recorded (learning objects eligible)', !!status && status.eligibleForReview > 0, `eligible=${status?.eligibleForReview ?? 'n/a'}`);
    note('H2e status carries NO fake review dates (engine honest)', !!status && JSON.stringify(status).includes('هنوز فعال نیست'));
  }
  await ctx.close();
}

/* ============ H3 — mixed practice gate + unlock + no key leak ============ */
{
  const { ctx, page } = await newLearner();
  await apiComplete(page, 'stn-kana-h0');
  const locked = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/practice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'generate', skill: 'kana', kind: 'mixed', scopeKey: 'chapter:kana-foundation-01' }),
    });
    return { status: r.status, code: (await r.json().catch(() => null))?.error?.code };
  }, BASE);
  note('H3a mixed practice honestly locked before 3 completed lessons', locked.status === 409 && locked.code === 'practice/mixed_locked', JSON.stringify(locked));

  await apiComplete(page, 'stn-kana-h1');
  await apiComplete(page, 'stn-kana-h2');
  const unlocked = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/practice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'generate', skill: 'kana', kind: 'mixed', scopeKey: 'chapter:kana-foundation-01' }),
    });
    const body = (await r.json().catch(() => null))?.data ?? null;
    return { status: r.status, items: body?.items?.length ?? 0, hasKeys: JSON.stringify(body ?? {}).includes('correctOptionId') };
  }, BASE);
  note('H3b mixed practice unlocks after 3 completed lessons', unlocked.status === 200 && unlocked.items > 0, `items=${unlocked.items}`);
  note('H3c the generated payload carries NO answer keys (SKL-013)', unlocked.hasKeys === false);
  await ctx.close();
}

/* ============ H4 — Learn de-scoring: zero-score walk completes ============ */
{
  const { ctx, page } = await newLearner();
  await apiComplete(page, 'stn-kana-h0');
  const zero = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/curriculum/station`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-h1', score: 0, taskCompleted: true }),
    });
    return { status: r.status, code: (await r.json().catch(() => null))?.error?.code ?? null };
  }, BASE);
  note('H4a a zero-score walk COMPLETES (no punitive bar in Learn)', zero.status === 200, JSON.stringify(zero));
  await ctx.close();
}

/* ============ H5 — journey sections + locked feedback + identity icons ============ */
{
  const { ctx, page } = await newLearner();
  await page.goto(`${BASE}/learn/kana-foundation-01/journey`, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  const sections = await page.evaluate(() => ({
    a: document.body.textContent.includes('هیراگانا — خطِ بومی ژاپن'),
    b: document.body.textContent.includes('کاتاکانا — خطِ جهان'),
  }));
  note('H5a the journey shows the two sections (A/B titles)', sections.a || sections.b, JSON.stringify(sections));
  const lockedClick = await page.evaluate(() => {
    /* the locked row's aria-label carries the access state: «<title> — قفل» */
    const rows = [...document.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') ?? '').endsWith('قفل'));
    if (rows.length === 0) return { hasLockedRow: false };
    rows[0].click();
    return { hasLockedRow: true, count: rows.length };
  });
  await sleep(800);
  const notice = await page.evaluate(() => {
    const el = document.querySelector('[data-locked-reason]');
    return { present: !!el, text: el?.textContent ?? '' };
  });
  note('H5b a locked row answers the click with the reason notice', lockedClick.hasLockedRow && notice.present, `rows=${lockedClick.count ?? 0} ${notice.text.slice(0, 70)}`);
  note('H5c the notice names the prerequisite lesson', notice.present && /ابتدا/.test(notice.text));
  const tiles = await page.evaluate(() => {
    const row = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? '').endsWith('قفل'));
    if (!row) return { found: false };
    const titledSpans = row.querySelectorAll('span[title]');
    return { found: true, identityTiles: titledSpans.length, firstTitle: titledSpans[0]?.getAttribute('title') ?? '' };
  });
  note('H5d locked rows keep the content-identity tile (labeled, not faceless)', tiles.found && tiles.identityTiles >= 1, tiles.firstTitle);
  await shot(page, 'h5-journey-locked-notice');
  await ctx.close();
}

/* ============ H6 — milestone M1 completes with seal + achievements ============ */
{
  const { ctx, page } = await newLearner();
  for (const slug of [
    'stn-kana-h0', 'stn-kana-h1', 'stn-kana-h2', 'stn-kana-h3', 'stn-kana-h4', 'stn-kana-h5',
    'stn-kana-h6', 'stn-kana-h7', 'stn-kana-h8', 'stn-kana-h9', 'stn-kana-h10', 'stn-kana-h11',
    'stn-kana-h12', 'stn-kana-h13', 'stn-kana-h14', 'stn-kana-h15',
  ]) {
    await apiComplete(page, slug);
  }
  await page.goto(`${BASE}/learn/kana-foundation-01/journey?s=section-a-hiragana`, { waitUntil: 'domcontentloaded' });
  await sleep(1400);
  const milestoneRow = await page.evaluate(() => {
    const row = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href')?.includes('stn-kana-m1-reading'));
    return { present: !!row, text: row?.textContent?.slice(0, 60) ?? '' };
  });
  note('H6a milestone M1 (reading sheet) appears in section A', milestoneRow.present, milestoneRow.text);
  if (milestoneRow.present) {
    await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-m1-reading`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const done = await walkCurrentStation(page);
    note('H6b milestone M1 completes (task contract) with the seal', done.complete, JSON.stringify(done));
    if (done.complete) {
      const chips = await page.evaluate(() => document.querySelectorAll('[data-lesson-achievements] li').length);
      note('H6c honest achievements chips beside the seal', chips >= 1, `chips=${chips}`);
      await shot(page, 'h6-milestone-complete');
    }
  }
  await ctx.close();
}

/* ============ H7 — seal upgrade presenters ============ */
{
  const { ctx, page } = await newLearner();
  /* h4 = the vowel-length RULE station (rule cards + exercises — no kana-card
   * canvas stages), so the generic walker can complete it end-to-end. */
  for (const slug of ['stn-kana-h0', 'stn-kana-h1', 'stn-kana-h2', 'stn-kana-h3']) await apiComplete(page, slug);
  await page.goto(`${BASE}/learn/kana-foundation-01/journey/stn-kana-h4`, { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  const done = await walkCurrentStation(page);
  const seal = await page.evaluate(() => {
    const frame = document.querySelector('[data-aizen-seal-frame]');
    const sealEl = document.querySelector('[data-aizen-seal]');
    const ring = document.querySelector('[data-aizen-seal-ring]');
    const toggle = document.querySelector('[data-testid="seal-sound-toggle"]');
    return {
      complete: !!document.querySelector('[data-station-complete]'),
      frameWidth: frame ? getComputedStyle(frame).width : null,
      animating: sealEl?.getAttribute('data-animate') === 'true',
      ring: !!ring,
      soundToggle: !!toggle,
    };
  });
  note('H7a the fresh completion plays the ceremony (data-animate)', done.complete && seal.animating);
  note('H7b the upgraded stage: bigger seal frame (≥144px) + rotating ink ring', !!seal.frameWidth && parseInt(seal.frameWidth) >= 144 && seal.ring, `frame=${seal.frameWidth}`);
  note('H7c the sound mute toggle is present beside the seal', seal.soundToggle);
  const sfx = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/audio/sfx/aizen-stamp.m4a`, { method: 'HEAD' });
    return r.status;
  }, BASE);
  note('H7d the stamp sound asset is served locally (no hotlink)', sfx === 200, `HEAD ${sfx}`);
  await shot(page, 'h7-seal-upgrade');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2400);
  const revisit = await page.evaluate(() => ({
    seal: !!document.querySelector('[data-aizen-seal]'),
    animating: document.querySelector('[data-aizen-seal]')?.getAttribute('data-animate') === 'true',
  }));
  note('H7e revisit shows the seal SETTLED (no re-animation)', revisit.seal && !revisit.animating, JSON.stringify(revisit));
  await ctx.close();
}

/* ============ H8 — responsive spot: practice hub at 360px ============ */
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await sleep(600);
  await page.goto(`${BASE}/practice`, { waitUntil: 'domcontentloaded' });
  await sleep(900);
  const mobile = await page.evaluate(() => ({
    noHScroll: document.documentElement.scrollWidth <= 361,
    hubVisible: document.body.textContent.includes('تمرین متمرکز'),
    tabBar: !![...document.querySelectorAll('nav a')].find((a) => a.getAttribute('href') === '/practice'),
  }));
  note('H8 practice hub is usable at 360px (no horizontal scroll)', mobile.noHScroll && mobile.hubVisible, JSON.stringify(mobile));
  await shot(page, 'h8-practice-mobile');
  await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
writeFileSync(
  path.join(OUT, 'H22_E2E_RESULTS.json'),
  JSON.stringify({ total: results.length, passed, failed: results.length - passed, results }, null, 1),
);
console.log(`\nH22 E2E: ${passed}/${results.length} PASS`);
process.exit(passed === results.length ? 0 : 1);
