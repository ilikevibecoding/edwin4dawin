// Cinematic demo driver: plays the game in a visible kiosk Chrome window on
// the desktop display with human-like pacing, for screen recording.
// Protocol: reaches the main menu, writes /tmp/demo_ready, waits for
// /tmp/demo_go (created by the orchestrator once recording starts), plays the
// scenario, then writes /tmp/demo_done and keeps the browser open.
// Usage: DISPLAY=:1 node tools/demo.mjs ch1 | ch3finale

import puppeteer from 'puppeteer-core';
import { writeFileSync, existsSync, rmSync } from 'node:fs';

const scenario = process.argv[2] || 'ch1';
const base = 'http://localhost:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const f of ['/tmp/demo_ready', '/tmp/demo_go', '/tmp/demo_done']) { try { rmSync(f); } catch {} }

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  args: [
    '--no-sandbox', '--disable-gpu', '--kiosk', '--no-first-run', '--disable-infobars',
    '--window-position=0,0', '--start-fullscreen', '--autoplay-policy=no-user-gesture-required',
  ],
  defaultViewport: null,
});
const page = (await browser.pages())[0];
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));

await page.goto(`${base}/`, { waitUntil: 'networkidle0' });

// gate
await page.waitForSelector('.gate.ready', { timeout: 60000 });
await sleep(800);
await page.mouse.click(960, 760);
await page.waitForSelector('.menu-box', { timeout: 30000 });
await sleep(1200);

writeFileSync('/tmp/demo_ready', 'ready');
console.log('READY — waiting for /tmp/demo_go');
while (!existsSync('/tmp/demo_go')) await sleep(300);
await sleep(1500); // let the recording settle on the title screen

const clickEl = async (sel, matchText) => {
  const handle = await page.evaluateHandle((sel, matchText) => {
    const els = [...document.querySelectorAll(sel)];
    if (!matchText) return els[0] || null;
    return els.find((e) => e.textContent.toUpperCase().includes(matchText.toUpperCase())) || null;
  }, sel, matchText);
  const el = handle.asElement();
  if (!el) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return true;
};

const advanceUntil = async (stopFn, opts = {}) => {
  const t0 = Date.now();
  while (Date.now() - t0 < (opts.timeout || 300000)) {
    if (await stopFn()) return true;
    const st = await page.evaluate(() => {
      if (document.querySelector('.investwrap.busy')) {
        return document.querySelector('#dlgNext.show') ? 'advance' : 'wait';
      }
      if ([...document.querySelectorAll('.ch-opt')].length) return 'choice';
      if (document.querySelector('.qte-ring')) return 'qte';
      if (document.querySelector('.redwall')) return 'mash';
      if (document.querySelector('.investwrap.show')) return 'invest';
      if (document.querySelector('.fl-continue.show')) return 'flowchart';
      if (document.querySelector('#dlgNext.show')) return 'advance';
      return 'wait';
    });
    if (st === 'advance') {
      await sleep(620); // linger so the line can be read on camera
      await page.mouse.click(960, 660);
      await sleep(260);
    } else if (st === 'qte') {
      await page.keyboard.press('Space');
      await sleep(700);
    } else if (st === 'mash') {
      await sleep(1300); // let the wall be seen
      for (let i = 0; i < 16; i++) { await page.keyboard.press('Space'); await sleep(170); }
      await sleep(1200);
    } else if (st === 'choice' || st === 'invest' || st === 'flowchart') {
      return st; // caller handles
    } else {
      await sleep(240);
    }
  }
  throw new Error('advanceUntil timeout');
};

const pickChoice = async (label) => {
  const st = await advanceUntil(async () => (await page.$('.ch-opt')) !== null);
  await sleep(1900); // gaze at the wheel
  if (!(await clickEl('.ch-opt .ch-label', label))) {
    console.log('WARN: option not found:', label, '— picking first');
    await clickEl('.ch-opt .ch-label');
  }
  console.log('picked', label);
  await sleep(900);
};

const investigate = async (order) => {
  await advanceUntil(async () => (await page.$('.investwrap.show')) !== null);
  await sleep(2200); // let the scan sweep play
  for (const label of order) {
    const ok = await clickEl('.inv-spot:not(.done) .sp-label', label);
    console.log('hotspot', label, ok);
    await sleep(700);
    // advance the evidence lines
    await advanceUntil(async () => await page.evaluate(() => !document.querySelector('.investwrap.busy')));
    await sleep(600);
  }
  await sleep(800);
  await page.waitForSelector('.inv-proceed.show');
  await clickEl('.inv-proceed');
  console.log('proceed clicked');
  await sleep(1200);
};

const continueFlowchart = async () => {
  await advanceUntil(async () => (await page.$('.fl-continue.show')) !== null);
  await sleep(4200); // let nodes reveal
  await clickEl('.fl-continue');
  console.log('flowchart continue');
  await sleep(1500);
};

if (scenario === 'ch1') {
  await clickEl('.menu-item', 'NEW GAME');
  console.log('new game');
  // boot + skyline + hallway dialogue
  await pickChoice('REASSURE');
  await investigate(['TABLET', 'FAMILY PHOTO', 'PISTOL CASE', 'THIRIUM TRACE']);
  await pickChoice('TRUTH');
  await pickChoice('THE ORDER');
  // QTE handled inside advanceUntil; then final choice
  await pickChoice('THE TRADE');
  await continueFlowchart();
  // stop once chapter 2's card shows
  await advanceUntil(async () => (await page.$('.chapcard.show')) !== null, { timeout: 120000 });
  await sleep(2600);
} else if (scenario === 'ch3finale') {
  await clickEl('.menu-item', 'CHAPTERS');
  await sleep(900);
  await clickEl('.chap-card', 'III');
  console.log('chapter 3 selected');
  await pickChoice('ADMIT');
  await pickChoice('COMFORT');
  await pickChoice('RESIST');
  // wall mash handled in advanceUntil; then ending + flowchart
  await continueFlowchart();
  await advanceUntil(async () => (await page.$('.endwrap.show')) !== null, { timeout: 120000 });
  await sleep(6000); // stat bars animate
}

writeFileSync('/tmp/demo_done', 'done');
console.log('DONE — holding browser open');
await sleep(8000);
await browser.close();
