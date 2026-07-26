#!/usr/bin/env node
/**
 * Ad-hoc inspection tool (Opus 4): loads the game, optionally runs a QA script,
 * captures screenshots + render_game_to_text output + console errors.
 *
 * Usage:
 *   node tools/shot.mjs --out artifacts/shots/x.png [--url "?test=1&mode=playing"]
 *     [--checkpoint lobby] [--script "..."] [--wait 800] [--text] [--all-checkpoints DIR]
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const has = (name) => args.includes(`--${name}`);

const base = 'http://127.0.0.1:5173/';
const url = base + (opt('url', '?test=1&mode=playing&quality=medium'));
const out = opt('out', 'artifacts/shots/shot.png');
const checkpoint = opt('checkpoint', null);
const script = opt('script', null);
const wait = parseInt(opt('wait', '600'), 10);
const allCheckpoints = opt('all-checkpoints', null);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.render_game_to_text === 'function', null, { timeout: 30000 });
// let boot finish
await page.waitForFunction(() => !document.getElementById('boot-overlay'), null, { timeout: 30000 });
await page.evaluate(() => window.advanceTime && window.advanceTime(500));
await page.waitForTimeout(wait);

async function settleAndShoot(file) {
  await page.evaluate(() => window.advanceTime && window.advanceTime(250));
  await page.waitForTimeout(120);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  console.log(`shot: ${file}`);
}

if (allCheckpoints) {
  const names = await page.evaluate(() => window.__qa.checkpoints());
  for (const name of names) {
    await page.evaluate((n) => window.__qa.teleport(n), name);
    await settleAndShoot(path.join(allCheckpoints, `${name}.png`));
  }
} else {
  if (checkpoint) {
    await page.evaluate((n) => window.__qa.teleport(n), checkpoint);
  }
  if (script) {
    await page.evaluate((s) => eval(s), script);
    await page.waitForTimeout(wait);
  }
  await settleAndShoot(out);
}

if (has('text')) {
  const text = await page.evaluate(() => window.render_game_to_text());
  console.log('STATE:', text);
}
if (errors.length) {
  console.log('CONSOLE ERRORS:');
  for (const e of errors.slice(0, 20)) console.log('  -', e.slice(0, 300));
  process.exitCode = 2;
} else {
  console.log('no console errors');
}
await browser.close();
