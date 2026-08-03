#!/usr/bin/env node
/**
 * Smoke test for interactive playback: boots the page as a viewer would, presses
 * Play, and checks that the audio clock actually drives the picture forward.
 *
 *   node tools/check-playback.mjs [--url http://127.0.0.1:5175/index.html]
 */
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const URL = flag('url', 'http://127.0.0.1:5175/index.html');

const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
    '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 560 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000 });
await page.click('#btn-start');
await new Promise((r) => setTimeout(r, 6000));

const state = await page.evaluate(() => ({
  tc: document.getElementById('tc')?.textContent,
  subtitle: document.getElementById('subs')?.textContent,
  audioState: window.__director?.audio?.actx?.state ?? 'none',
  clock: window.__director?.liveTime?.() ?? -1,
  playing: !!window.__director?.playing,
}));

console.log(JSON.stringify(state, null, 2));
const ok = state.playing && state.clock > 2 && state.audioState === 'running';
console.log(ok ? 'PASS: picture and audio clock are both advancing' : 'FAIL: playback did not start');
if (errs.length) console.log('page errors:\n  ' + [...new Set(errs)].slice(0, 8).join('\n  '));
await browser.close();
process.exit(ok ? 0 : 1);
