// Deterministic end-to-end story-path driver (headless).
// Plays a chapter by clicking through dialogue and picking named choices,
// mashing walls and QTEs, then asserts the expected marks/flags.
// Usage: node tools/e2e.mjs ch2-confession | ch3-deviant | ch1-peace

import puppeteer from 'puppeteer-core';

const scenario = process.argv[2] || 'ch2-confession';
const base = process.argv[3] || 'http://localhost:8080';

const SCENARIOS = {
  'ch2-confession': {
    url: `${base}/?ch=2&fast=1&nogate=1&mute=1`,
    picks: ['CASE FILE', 'THE RECORD', 'EMPATHY', 'HIS ARM', 'SHE FELT'],
    stopAt: 'flowchart',
    assert: (dp) => {
      if (!dp.marks.includes('m2_confess')) throw new Error('confession not reached; marks=' + dp.marks.join(','));
      console.log('ASSERT OK: m2_confess reached. stress=' + dp.flags.stress + ' open=' + dp.flags.open);
    },
  },
  'ch3-deviant': {
    url: `${base}/?ch=3&fast=1&nogate=1&mute=1`,
    picks: ['ADMIT', 'COMFORT', 'RESIST'],
    stopAt: 'end',
    assert: (dp) => {
      if (dp.flags.ending !== 'deviant') throw new Error('expected deviant ending, got ' + dp.flags.ending + '; marks=' + dp.marks.join(','));
      if (!dp.marks.includes('m3_wall_broken')) throw new Error('wall not broken');
      console.log('ASSERT OK: wall broken, deviant ending. ins=' + dp.flags.ins);
    },
  },
  'ch1-peace': {
    url: `${base}/?ch=1&fast=1&nogate=1&mute=1`,
    picks: ['FACTS', 'TRUTH', 'THE ORDER', 'THE TRADE'],
    stopAt: 'flowchart',
    assert: (dp) => {
      if (!dp.marks.includes('m_peace')) throw new Error('peaceful resolution not reached; marks=' + dp.marks.join(','));
      console.log('ASSERT OK: m_peace reached. prob=' + dp.flags.prob + ' evidence=' + dp.flags.evidence);
    },
  },
};

const sc = SCENARIOS[scenario];
if (!sc) { console.error('unknown scenario', scenario); process.exit(2); }

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1600,900'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(sc.url, { waitUntil: 'networkidle0' });

const picks = [...sc.picks];
const t0 = Date.now();
let lastLog = '';

while (Date.now() - t0 < 240000) {
  const state = await page.evaluate(() => {
    const vis = (el) => el && getComputedStyle(el).opacity !== '0' && el.offsetParent !== null;
    const opts = [...document.querySelectorAll('.ch-opt')].filter((o) => !o.classList.contains('locked'));
    if (opts.length) return { kind: 'choice', labels: opts.map((o) => o.querySelector('.ch-label').textContent) };
    if (document.querySelector('.redwall')) return { kind: 'mash' };
    if (document.querySelector('.qte-ring')) return { kind: 'qte' };
    // A hotspot's dialogue is open — advance it like normal dialogue.
    if (document.querySelector('.investwrap.busy')) return { kind: 'dialogue' };
    const spots = [...document.querySelectorAll('.inv-spot:not(.done)')];
    const proceed = document.querySelector('.inv-proceed.show');
    if (document.querySelector('.investwrap.show') && spots.length) return { kind: 'invest-spot' };
    if (proceed) return { kind: 'invest-proceed' };
    const flBtn = document.querySelector('.fl-continue.show');
    if (flBtn) return { kind: 'flowchart' };
    if (document.querySelector('.endwrap.show')) return { kind: 'end' };
    return { kind: 'dialogue' };
  });

  if (state.kind !== lastLog) { console.log('state:', state.kind, state.labels || ''); lastLog = state.kind; }

  if (state.kind === 'choice') {
    const want = picks.length ? picks[0] : null;
    const clicked = await page.evaluate((want) => {
      const opts = [...document.querySelectorAll('.ch-opt')].filter((o) => !o.classList.contains('locked'));
      let target = want ? opts.find((o) => o.querySelector('.ch-label').textContent.trim() === want) : null;
      if (!target) target = opts[0];
      if (!target) return null;
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return target.querySelector('.ch-label').textContent.trim();
    }, want);
    if (clicked) {
      console.log('picked:', clicked, want && clicked !== want ? `(WANTED ${want})` : '');
      if (want && clicked === want) picks.shift();
      await sleep(900);
    }
  } else if (state.kind === 'mash') {
    for (let i = 0; i < 22; i++) {
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
      await sleep(90);
    }
    await sleep(800);
  } else if (state.kind === 'qte') {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
    await sleep(500);
  } else if (state.kind === 'invest-spot') {
    await page.evaluate(() => {
      const s = document.querySelector('.inv-spot:not(.done)');
      if (s) s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    await sleep(400);
  } else if (state.kind === 'invest-proceed') {
    await page.evaluate(() => document.querySelector('.inv-proceed.show').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(900);
  } else if (state.kind === 'flowchart') {
    if (sc.stopAt === 'flowchart') break;
    await page.evaluate(() => document.querySelector('.fl-continue.show').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(1000);
  } else if (state.kind === 'end') {
    break;
  } else {
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(170);
  }
}

const dp = await page.evaluate(() => window.__dp ? { flags: window.__dp.flags, marks: [...window.__dp.marks] } : null);
await browser.close();

if (!dp) { console.error('FAIL: no __dp state'); process.exit(1); }
if (errors.length) { console.error('JS ERRORS:', errors); process.exit(1); }
console.log('flags:', JSON.stringify(dp.flags));
console.log('marks:', dp.marks.join(', '));
try {
  sc.assert(dp);
  console.log('SCENARIO PASS:', scenario);
} catch (e) {
  console.error('SCENARIO FAIL:', e.message);
  process.exit(1);
}
