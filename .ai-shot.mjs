#!/usr/bin/env node
/** Scratch: where do the fire-discipline rounds actually stop? */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL = process.argv[2] || 'http://127.0.0.1:5198/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--headless=new', '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--mute-audio'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`${URL}?showcase=ai&capture=1&quality=low`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });

const out = await page.evaluate(() => {
  const api = window.__AI__;
  const engine = window.__GAME__.engine;
  const THREE = window.__GAME__.THREE;
  const physics = engine.tryGet('physics');
  const ai = engine.get('ai');
  api.clear();
  const anchor = api.anchor();
  const id = api.spawn(anchor[0], anchor[1], anchor[2], 0, 'regular');
  const spot = api.openGround(id, 20);
  if (!spot) return { error: 'no open ground' };
  api.setPlayer(spot[0], spot[1], spot[2]);
  api.resetPlayerDamage();
  api.step(0.2);
  api.force(id, 'engage');

  const target = new THREE.Vector3(spot[0], spot[1], spot[2]);
  const misses = [];
  const off = engine.events.on('enemy:fire', (e) => {
    const o = e.origin.clone();
    const d = e.direction.clone();
    const centre = target.clone();
    centre.y += 1.05;
    const rel = centre.clone().sub(o);
    const t = rel.dot(d);
    const perp = rel.clone().addScaledVector(d, -t);
    misses.push(+perp.length().toFixed(2));
  });
  const marks = [];
  for (let s = 0; s < 4; s++) {
    api.step(4);
    marks.push({ at: 4 * (s + 1), shots: api.agent(id).shots, hits: api.playerDamage().hits });
  }
  off();
  misses.sort((a, b) => a - b);
  void physics;

  const agent = api.agent(id);
  const a = ai.byId(id);
  return {
    spot,
    agentPos: agent.position,
    state: agent.state,
    shots: agent.shots,
    hits: api.playerDamage().hits,
    damage: api.playerDamage().total,
    muzzleY: a && a.rig ? +a.rig.muzzle.y.toFixed(2) : null,
    eyeY: a && a.rig ? +a.rig.eye.y.toFixed(2) : null,
    aimPoint: a ? [+a.aimPoint.x.toFixed(2), +a.aimPoint.y.toFixed(2), +a.aimPoint.z.toFixed(2)] : null,
    marks,
    rounds: misses.length,
    missMin: misses[0],
    missP25: misses[Math.floor(misses.length * 0.25)],
    missMedian: misses[Math.floor(misses.length / 2)],
    missP75: misses[Math.floor(misses.length * 0.75)],
    inside: misses.filter((m) => m < 0.5).length,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
