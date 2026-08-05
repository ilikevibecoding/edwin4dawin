// Headless screenshot harness for art review: captures every plate (via the
// in-engine gallery) and every UI state (via ?ui= demo mode) at 1920x1080.
// Usage: node tools/shoot.mjs <outDir> [baseUrl]

import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const outDir = process.argv[2] || '/tmp/art_review/round1';
const base = process.argv[3] || 'http://localhost:8080';
mkdirSync(outDir, { recursive: true });

const PLATES = [
  'title_keyart', 'ch1_skyline', 'ch1_hallway', 'ch1_apartment', 'ch1_rooftop_wide',
  'ch1_lucas_close', 'ch1_adam_close', 'ch1_ledge_catch', 'ch1_resolution_peace',
  'ch2_interrogation', 'ch2_mira_close', 'ch2_observation',
  'ch3_orchard', 'ch3_bridge', 'ch3_adam_break', 'ch3_march', 'ch3_facility',
];

const UI_STATES = [
  ['dialogue', 3000], ['choice', 2200], ['qte', 1500], ['wall', 2600],
  ['card', 2400], ['banner', 1700], ['flow', 4200], ['invest', 3200],
  ['boot', 2800], ['stress', 3000],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1920,1080'],
  defaultViewport: { width: 1920, height: 1080 },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });

for (const name of PLATES) {
  await page.goto(`${base}/?shot=${name}&nogate=1&mute=1`, { waitUntil: 'networkidle0' });
  await sleep(3400);
  await page.screenshot({ path: `${outDir}/plate_${name}.png` });
  console.log('plate', name);
}

for (const [state, wait] of UI_STATES) {
  await page.goto(`${base}/?ui=${state}&nogate=1&mute=1`, { waitUntil: 'networkidle0' });
  await sleep(wait);
  await page.screenshot({ path: `${outDir}/ui_${state}.png` });
  console.log('ui', state);
}

// main menu
await page.goto(`${base}/?nogate=1&mute=1`, { waitUntil: 'networkidle0' });
await sleep(2600);
await page.screenshot({ path: `${outDir}/ui_menu.png` });
console.log('ui menu');

await browser.close();

if (errors.length) {
  console.error('\nJS ERRORS DETECTED:');
  errors.forEach((e) => console.error(' -', e));
  process.exit(1);
}
console.log(`\nOK — screenshots in ${outDir}, no JS errors.`);
