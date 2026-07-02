// Eval harness: serves the repo, drives the game through window.__game,
// captures head-cam screenshots and stats for the Ralph-loop rubric.
//
//   node eval/shot.mjs <scenario> [outPrefix]
//
// Scenarios: phase1, phase2, phase3, phase4, grab, perf, tour
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const data = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('nope');
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const scenario = process.argv[2] || 'phase1';
const prefix = process.argv[3] || scenario;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
await page.evaluate(() => {
  document.getElementById('splash').style.display = 'none';
});
await page.waitForTimeout(400);

const shot = async (name) => {
  await page.waitForTimeout(120);
  await page.screenshot({ path: join(ROOT, 'shots', `${prefix}-${name}.png`) });
  console.log(`shot: ${prefix}-${name}.png`);
};
const g = (fn, ...args) => page.evaluate(
  ({ fn, args }) => {
    const f = new Function('g', 'args', `return g.${fn}(...args)`);
    return f(window.__game, args);
  }, { fn, args });
const stats = () => page.evaluate(() => window.__game.stats());

async function driveKeys(codes, ms) {
  await page.evaluate((codes) => codes.forEach((c) => window.__game.key(c, true)), codes);
  await page.waitForTimeout(ms);
  await page.evaluate((codes) => codes.forEach((c) => window.__game.key(c, false)), codes);
}

// Deterministic variants: advance the sim with fixed steps regardless of how
// slowly the software rasterizer renders (the live loop stays dt-based).
const step = (frames) => page.evaluate((n) => window.__game.step(n), frames);
async function driveSteps(codes, frames) {
  await page.evaluate(({ codes }) => codes.forEach((c) => window.__game.key(c, true)), { codes });
  await step(frames);
  await page.evaluate(({ codes }) => codes.forEach((c) => window.__game.key(c, false)), { codes });
}
const press = async (code, settleFrames = 60) => {
  await page.evaluate((c) => window.__game.key(c), code);
  await step(settleFrames);
};

if (scenario === 'phase1' || scenario === 'tour') {
  // spawn view
  await shot('01-spawn');
  // look around the kitchen
  await g('setHead', -0.9, -0.05); await shot('02-look-left');
  await g('setHead', 0.9, -0.05); await shot('03-look-right');
  await g('setHead', 0, -1.1); await shot('04-look-down');
  await g('setHead', 0, 0);
  // drive into the north wall to prove collision (yaw 0 faces -z);
  // lane x=-4.75 is clear of the counter and the kitchen window sill
  await g('teleport', -4.75, -4.0, 0);
  await driveSteps(['KeyW'], 420);
  const s1 = await stats();
  console.log('pos after wall push (z must stop at -5.64):', s1.pos.map((v) => v.toFixed(2)).join(', '));
  await shot('05-wall-block');
  // tour each room
  const rooms = [
    ['kitchen', -3, -3, Math.PI * 0.75], ['living', 3, -3, -Math.PI * 0.75],
    ['bedroom', -3, 3, Math.PI * 0.25], ['bathroom', 3, 3, -Math.PI * 0.25],
  ];
  for (const [name, x, z, yaw] of rooms) {
    await g('teleport', x, z, yaw);
    await g('setHead', 0, -0.15);
    await page.waitForTimeout(250);
    await shot(`room-${name}`);
  }
}

if (scenario === 'phase2') {
  await g('setHead', 0, -1.35); await shot('01-look-straight-down');
  await g('setHead', 0, -0.75); await shot('02-look-down-forward');
  await g('setHead', -1.7, -0.5); await shot('03-look-left-shoulder');
  await g('setHead', 1.7, -0.5); await shot('04-look-right-shoulder');
  await g('setHead', 0.3, -0.8);
  await page.evaluate(() => window.__game.setArm(0.35, 0.62, 0.5));
  await page.waitForTimeout(400);
  await shot('05-arm-raised-in-view');
  // third person debug: pull camera out to verify full body (eval only)
  await page.evaluate(() => {
    const { robot, camera, scene } = window.__game;
    window.__game.teleport(-3, -3, Math.PI / 4);
    scene.attach(camera);
    camera.position.set(-3 + 1.3, 1.15, -3 + 1.5);
    camera.lookAt(-3, 0.72, -3);
  });
  await page.waitForTimeout(300);
  await shot('06-debug-third-person');
  await page.evaluate(() => {
    const { camera } = window.__game;
    camera.position.set(-3 - 1.6, 1.0, -3 + 1.3);
    camera.lookAt(-3, 0.7, -3);
  });
  await shot('07-debug-third-person-front');
}

if (scenario === 'phase3') {
  const s = await stats();
  const perRoom = {};
  for (const p of s.props) {
    perRoom[p.room] = perRoom[p.room] || [];
    perRoom[p.room].push(`${p.name}@${p.pos.map((v) => v.toFixed(2)).join(',')}${p.sleeping ? ' zzz' : ''}`);
  }
  console.log(JSON.stringify(perRoom, null, 1));
  const floors = s.props.filter((p) => p.pos[1] < -0.01);
  console.log('props below floor:', floors.length);
  const asleep = s.props.filter((p) => p.sleeping).length;
  console.log(`sleeping: ${asleep}/${s.props.length}`);
  const rooms = [
    ['kitchen', -3, -3, Math.PI * 0.75], ['living', 3, -3, -Math.PI * 0.75],
    ['bedroom', -3, 3, Math.PI * 0.25], ['bathroom', 3, 3, -Math.PI * 0.25],
  ];
  for (const [name, x, z, yaw] of rooms) {
    await g('teleport', x + Math.sin(yaw) * 2, z + Math.cos(yaw) * 2, yaw);
    await g('setHead', 0, -0.42);
    await page.waitForTimeout(300);
    await shot(`props-${name}`);
  }
  // knock test: drive through the kitchen scatter
  await g('teleport', -1.5, -1.2, 1.1);
  await driveSteps(['KeyW'], 240);
  await g('setHead', 0, -0.7);
  await shot('knock-after-drive');
  const s2 = await stats();
  console.log('props below floor after knock:', s2.props.filter((p) => p.pos[1] < -0.01).length);
}

if (scenario === 'grab') {
  // Deterministic grab test: place robot near a known prop, align, grab, carry, drop.
  const s = await stats();
  const target = s.props.find((p) => p.name === 'CAN' && !p.held) || s.props[0];
  console.log('target:', target.name, target.pos.map((v) => v.toFixed(2)).join(','));
  const [tx, , tz] = target.pos;
  // stand 0.55m away facing it
  await g('teleport', tx, tz + 0.55, 0);
  await g('setHead', 0, -0.95);
  await step(60);

  // 1. close on empty air far from target -> must fail
  await page.evaluate(() => window.__game.setArm(0, 0.4, 0.7));
  await step(90);
  await press('Space', 90);
  let st = await stats();
  console.log('air grab holding (expect null):', st.arm.holding);
  await press('Space', 60); // reopen
  await shot('01-air-grab-fail');

  // 2. align over the prop but stay HIGH -> close should still fail
  // Exact inverse of Arm.localTarget(): x = sin(t)*r, z = -cos(t)*r - 0.04
  const alignAndGrab = async (height) => {
    await page.evaluate(({ tx, tz, height }) => {
      const { robot } = window.__game;
      const p = robot.root.position;
      robot.yaw = 0;
      robot.root.rotation.y = 0;
      const dx = tx - p.x;
      const dz = tz - p.z;
      const theta = Math.atan2(dx, -(dz + 0.04));
      const reach = Math.hypot(dx, dz + 0.04);
      window.__game.setArm(theta, Math.min(reach, 0.68), height);
    }, { tx, tz, height });
    await step(150); // let mast + arm ease into position
    await press('Space', 90);
    return stats();
  };

  st = await alignAndGrab(0.55); // way above the can
  console.log('high grab holding (expect null):', st.arm.holding);
  if (!st.arm.holding) await press('Space', 60);
  await shot('02-high-grab-fail');

  // 3. lower to prop height -> should grab
  st = await alignAndGrab(0.052);
  console.log('aligned grab holding (expect CAN-ish):', st.arm.holding);
  await shot('03-grab-success');

  // 4. raise + carry, watch it in the claw
  await driveSteps(['ArrowUp'], 120);
  await g('setHead', st.arm.theta * -1, -0.75);
  await shot('04-carrying');

  // 5. release mid-air -> physics drop
  await page.evaluate(() => window.__game.key('Space'));
  await step(8);
  await shot('05-drop-midair');
  await step(180);
  st = await stats();
  const dropped = st.props.find((p) => p.name === (target.name));
  console.log('dropped resting y (expect ~half-extent):', dropped.pos[1].toFixed(3), 'sleeping:', dropped.sleeping);
  await shot('06-drop-settled');
}

if (scenario === 'bin') {
  // Grab a can, carry it to the kitchen bin, drop it in, verify score.
  const s = await stats();
  const target = s.props.find((p) => p.name === 'CAN');
  const [tx, , tz] = target.pos;
  await g('teleport', tx, tz + 0.5, 0);
  await page.evaluate(({ tx, tz }) => {
    const { robot } = window.__game;
    const p = robot.root.position;
    const dx = tx - p.x;
    const dz = tz - p.z;
    window.__game.setArm(Math.atan2(dx, -(dz + 0.04)), Math.hypot(dx, dz + 0.04), 0.05);
  }, { tx, tz });
  await step(150);
  await press('Space', 90);
  let st = await stats();
  console.log('holding:', st.arm.holding);

  // raise and drive to the bin (teleport for determinism)
  await driveSteps(['ArrowUp'], 150);
  await g('teleport', -0.85, -4.55, 0); // bin is at (-0.85, -5.3); face -z
  await page.evaluate(() => window.__game.setArm(0, 0.71, 0.75));
  await step(150);
  await g('setHead', 0, -0.85);
  await shot('01-over-bin');
  await press('Space', 240); // open -> drop, settle
  st = await stats();
  console.log('binned count (expect 1):', st.binned);
  const can = st.props.find((p) => p.name === target.name && p.binned);
  console.log('can rest pos:', can ? can.pos.join(', ') : 'NOT IN BIN');
  await shot('02-binned');
}

if (scenario === 'outside') {
  // stand at the living room picture window, look out at the street
  await g('teleport', 3.3, -4.35, 0);
  await g('setHead', 0, 0.08);
  await page.waitForTimeout(400);
  const carX = () => page.evaluate(() => window.__game.outside.cars.map((c) => +c.group.position.x.toFixed(2)));
  const a = await carX();
  // fast-forward until a car is passing in front of the window, then frame it
  await page.evaluate(() => {
    const { outside } = window.__game;
    for (let i = 0; i < 4000; i++) {
      const hit = outside.cars.some((c) => c.group.position.x > 1.5 && c.group.position.x < 5.5);
      if (hit) break;
      window.__game.step(1);
    }
  });
  await shot('01-living-window');
  await page.waitForTimeout(1200);
  await shot('02-living-window-later');
  const b = await carX();
  const moved = a.map((v, i) => Math.abs(b[i] - v));
  console.log('car x before:', a.join(', '));
  console.log('car x after :', b.join(', '));
  console.log('all cars moved:', moved.every((d) => d > 0.5));
  // kitchen window over the sink
  await g('teleport', -4.2, -4.7, Math.PI / 2);
  await g('setHead', 0, 0.15);
  await page.waitForTimeout(300);
  await shot('03-kitchen-window');
  // bedroom window
  await g('teleport', -4.3, 4.3, Math.PI);
  await g('setHead', 0, 0.1);
  await page.waitForTimeout(300);
  await shot('04-bedroom-window');
}

if (scenario === 'shelf') {
  // Placement surfaces: drop a can onto each new surface, confirm it rests there.
  const surfaces = [
    ['bookshelf-mid', 5.72, -3.6, 0.92],
    ['cart-top', -2.2, -2.85, 0.82],
    ['desk', -0.65, 1.2, 0.745],
    ['bench', 5.5, 2.55, 0.445],
    ['windowsill-living', 3.3, -5.97, 0.75],
    ['side-table', 4.75, -4.55, 0.4975],
  ];
  const out = await page.evaluate((surfaces) => {
    const { physics } = window.__game;
    const cans = physics.props.filter((p) => ['CAN', 'CUP', 'BOTTLE', 'TP ROLL', 'BOOK', 'REMOTE'].includes(p.name)).slice(0, surfaces.length);
    const res = [];
    surfaces.forEach(([name, x, z, y], i) => {
      const p = cans[i];
      p.obj.position.set(x, y + 0.25, z);
      p.obj.quaternion.identity();
      p.vel.set(0, 0, 0);
      p.angVel.set(0, 0, 0);
      p.wake();
      p.updateBounds();
    });
    for (let i = 0; i < 300; i++) window.__game.step(1);
    surfaces.forEach(([name, x, z, y], i) => {
      const p = cans[i];
      res.push(`${name}: ${p.name} rests y=${p.obj.position.y.toFixed(3)} (surface ~${y}) sleeping=${p.sleeping}`);
    });
    return res;
  }, surfaces);
  console.log(out.join('\n'));
  await g('teleport', 4.4, -2.2, -2.2);
  await g('setHead', 0.35, -0.15);
  await page.waitForTimeout(300);
  await shot('01-bookshelf');
}

if (scenario === 'perf') {
  await g('teleport', -1.2, -1.2, Math.PI * 0.25);
  await page.evaluate(() => window.__game.key('KeyW', true));
  await page.evaluate(() => window.__game.key('KeyA', true));
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.__game.key('KeyW', false));
  await page.evaluate(() => window.__game.key('KeyA', false));
  const s = await stats();
  console.log('fps while driving+turning (swiftshader):', s.fps);
  console.log('sim ms/frame:', s.simMs, '| draw calls:', s.drawCalls, '| tris:', s.triangles);
  await shot('driving');
}

console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');
await browser.close();
server.close();
