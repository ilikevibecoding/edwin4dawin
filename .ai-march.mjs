#!/usr/bin/env node
/** Scratch: are the four men in the squad shot actually walking the same way? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5199/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 400)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=low`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const g = window.__GAME__;
  const api = window.__AI__;
  g.pose('ai_squad');
  const a = api.anchor();
  const deg = (r) => Math.round((r * 180) / Math.PI);
  return api.agents().map((x) => ({
    id: x.id,
    pos: x.position.map((v) => +v.toFixed(2)),
    fromAnchor: [+(x.position[0] - a[0]).toFixed(2), +(x.position[2] - a[2]).toFixed(2)],
    headingDeg: deg(x.heading),
    speed: +Math.hypot(x.velocity[0], x.velocity[2]).toFixed(2),
    velDeg: Math.hypot(x.velocity[0], x.velocity[2]) > 0.05 ? deg(Math.atan2(x.velocity[0], x.velocity[2])) : null,
    scripted: x.scripted,
    hasGoal: x.hasGoal,

    goal: x.goal ? x.goal.map((v) => +v.toFixed(2)) : null,
    goalDeg: deg(Math.atan2(x.goal[0] - x.position[0], x.goal[2] - x.position[2])),
    distanceToGoal: +x.distanceToGoal.toFixed(2),
    arrived: x.arrived,
    pathState: x.pathState,
    pathWhy: x.pathWhy,
    pathCount: x.pathCount,
    pathIndex: x.pathIndex,
    stuck: +x.stuck.toFixed(2),
    state: x.state,
  }));
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
