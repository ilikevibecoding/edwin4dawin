#!/usr/bin/env node
/** Dump every console message / error from a page load, for shader debugging. */
import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/?dev=portrait&q=low';
const waitMs = Number(process.argv[3] ?? 45000);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=640,360', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--autoplay-policy=no-user-gesture-required',
  ],
  protocolTimeout: 300000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
const seen = new Set();
page.on('console', (m) => {
  const t = m.text();
  const key = t.slice(0, 200);
  if (seen.has(key)) return;
  seen.add(key);
  console.log(`[${m.type()}] ${t.slice(0, 4000)}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${String(e.stack ?? e).slice(0, 3000)}`));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await new Promise((r) => setTimeout(r, waitMs));
const info = await page.evaluate(() => {
  const e = window.__engine;
  if (!e) return 'no engine';
  const gl = e.renderer.getContext();
  return {
    frames: e.clock.frame,
    glError: gl.getError(),
    programs: e.renderer.info.programs?.length,
    memory: e.renderer.info.memory,
    passes: e.fx?.composer?.passes?.length,
  };
});
console.log('INFO', JSON.stringify(info));
await browser.close();
