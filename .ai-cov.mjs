#!/usr/bin/env node
/** Scratch: why does one of six agents hold a cover point he never walks to? */
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
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=medium`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const api = window.__AI__;
  api.clear();
  const anchor = api.anchor();
  const ids = [];
  for (let i = 0; i < 6; i++) {
    ids.push(api.spawn(anchor[0] - 2 + (i % 3) * 1.6, anchor[1], anchor[2] - 2 + Math.floor(i / 3) * 1.6, 0));
  }
  const spot = api.openGround(ids[0], 20);
  api.setPlayer(spot ? spot[0] : anchor[0] + 18, spot ? spot[1] : anchor[1], spot ? spot[2] : anchor[2]);
  const log = [];
  for (let slice = 0; slice < 16; slice++) {
    for (const id of ids) api.force(id, 'engage');
    api.step(0.5);
    log.push(
      api.agents().map((a) => ({
        id: a.id,
        s: a.state,
        cv: a.cover,
        sc: Math.round(a.coverScore),
        cd: a.coverDistance === Infinity ? 'inf' : +a.coverDistance.toFixed(1),
        goal: +a.distanceToGoal.toFixed(1),
        ps: a.pathState,
        pw: a.pathWhy,
        n: a.pathCount,
        stuck: +a.stuck.toFixed(1),
        v: +Math.hypot(a.velocity[0], a.velocity[2]).toFixed(1),
        alive: a.alive,
      })),
    );
  }
  return { spot, log };
});
console.log('target', out.spot?.map((v) => +v.toFixed(1)));
out.log.forEach((row, i) => {
  console.log(`t=${((i + 1) * 0.5).toFixed(1)}`, row.map((a) => `#${a.id} ${a.s} cv${a.cv}(${a.sc}) d${a.cd} g${a.goal} n${a.n} v${a.v}${a.alive ? '' : ' DEAD'}`).join(' | '));
});
await browser.close();
