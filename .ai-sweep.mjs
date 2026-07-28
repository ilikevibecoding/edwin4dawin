import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio'], protocolTimeout: 900000 });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0,300)));
await page.goto('http://127.0.0.1:5199/?showcase=ai&capture=1&quality=medium', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true && window.__AI__, { timeout: 240000, polling: 250 });
for (const shot of ['ai_soldier','ai_squad','ai_cover','ai_ragdoll','ai_firefight']) {
  const r = await page.evaluate((s) => {
    const g = window.__GAME__, api = window.__AI__;
    g.pose(s);
    const sw = api.sweep();
    const cam = g.engine.camera ?? g.engine.get('render').camera;
    const p = new g.THREE.Vector3(); cam.getWorldPosition(p);
    const agents = api.agents();
    const deg = (r) => Math.round(r*180/Math.PI);
    return { shot: s, pass: sw.pass, seen: sw.seen, of: sw.of, offsetDeg: deg(sw.offset), storey: +sw.storey.toFixed(2), range: +sw.range.toFixed(1),
      facing: agents.map((a) => { const to = new g.THREE.Vector3(p.x-a.position[0],0,p.z-a.position[2]).normalize(); const f = new g.THREE.Vector3(Math.sin(a.heading),0,Math.cos(a.heading)); return Math.round(Math.acos(Math.max(-1,Math.min(1,f.dot(to))))*180/Math.PI); }) };
  }, shot);
  console.log(JSON.stringify(r));
}
await browser.close();
