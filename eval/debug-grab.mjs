import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on('pageerror', (e) => console.log('pageerror:', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game !== undefined);
await page.evaluate(() => { document.getElementById('splash').style.display = 'none'; });
await page.waitForTimeout(300);

const out = await page.evaluate(() => {
  const { robot, physics } = window.__game;
  const prop = physics.props.find((p) => p.name === 'CAN');
  const t = prop.obj.position;
  // park robot 0.5m south of the can, facing north (-z toward it)
  window.__game.teleport(t.x, t.z + 0.5, 0);
  const p = robot.root.position;
  const dx = t.x - p.x;
  const dz = t.z - p.z;
  const theta = Math.atan2(dx, -(dz + 0.04));
  const reach = Math.hypot(dx, dz + 0.04);
  window.__game.setArm(theta, reach, 0.05);
  // settle several frames so pose() runs and mast eases
  for (let i = 0; i < 240; i++) window.__game.step(1);
  const arm = robot.arms.R;
  const m = robot.mouthInfo(arm);
  const gripWorld = arm.palmWorld.toArray();
  const rec = {
    prop: t.toArray(),
    propWE: prop.we.toArray(),
    robot: p.toArray(),
    theta, reach,
    armState: { theta: arm.theta, reach: arm.reach, height: arm.height },
    mouth: m,
    gripWorld,
    dy: t.y - m.cy,
    alongJaw: (t.x - m.cx) * m.jx + (t.z - m.cz) * m.jz,
    alongDepth: (t.x - m.cx) * m.dxz + (t.z - m.cz) * m.dzz,
    inMouth: robot.inMouth(prop, m),
    jawHalf: prop.extentAlong(new (Object.getPrototypeOf(prop.we).constructor)(m.jx, 0, m.jz)),
    shoulderY: robot.shoulderY,
  };
  return JSON.stringify(rec, null, 1);
});
console.log(out);
await browser.close();
server.close();
