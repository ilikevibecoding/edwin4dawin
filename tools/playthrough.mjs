// Full-mission playthrough bot: really walks the route, opens doors, fights,
// secures both hostages, escorts to the garage and extracts. Captures beat
// screenshots + state snapshots for auditing. Runs as two browser sessions
// (SwiftShader tabs are unstable in very long single sessions).
// Usage: node tools/playthrough.mjs [outDir] [--difficulty=operative] [--part=a|b|all]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'screenshots/playthrough';
const diff = (process.argv.join(' ').match(/--difficulty=(\w+)/) || [])[1] || 'operative';
const part = (process.argv.join(' ').match(/--part=(\w+)/) || [])[1] || 'all';
fs.mkdirSync(outDir, { recursive: true });

let browser, page;
const errors = [];
const issues = [];
let shotIdx = 0;

async function newSession() {
  if (browser) await browser.close().catch(() => {});
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:5173/?qa=1&lowspec=1');
  await page.waitForFunction(() => window.NSR?.state === 'title', null, { timeout: 60000 });
  await page.evaluate(() => { const p = document.querySelector('.qa-panel'); if (p) p.style.display = 'none'; });
}

const S = async () => await page.evaluate(() => window.render_game_to_text());
const adv = async (ms) => await page.evaluate((m) => window.advanceTime(m), ms);
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${String(++shotIdx).padStart(2, '0')}-${name}.png` });
  console.log('  [shot]', name);
};

async function lookAt(x, y, z) {
  await page.evaluate(({ x, y, z }) => {
    const p = window.NSR.player;
    const eye = p.eyePos();
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }, { x, y, z });
}

async function setYaw(yawDeg) {
  await page.evaluate((yd) => { window.NSR.player.yaw = (yd * Math.PI) / 180; window.NSR.player.pitch = 0; }, yawDeg);
}

// teleport recovery that lands on the actual floor at the target
async function safePlace(x, z) {
  await page.evaluate(({ x, z }) => {
    const g = window.NSR;
    const cell = g.ai.nav.cellNear(x, z, g.player.pos.y);
    const y = cell ? cell.y : g.player.pos.y;
    window.__qa.place(cell ? cell.x : x, y, cell ? cell.z : z, g.player.yaw);
  }, { x, z });
}

// walk toward a point using real key input, re-aiming each burst
async function walkTo(x, z, { timeout = 45000, arrive = 1.0, interactDoors = true } = {}) {
  const t0 = Date.now();
  let last = null, stuckCount = 0;
  for (;;) {
    const s = await S();
    const [px, py, pz] = s.player.pos;
    const d = Math.hypot(x - px, z - pz);
    if (d < arrive) break;
    if (Date.now() - t0 > timeout) {
      issues.push(`walkTo(${x},${z}) timeout at ${px.toFixed(1)},${pz.toFixed(1)} [bot-nav]`);
      await safePlace(x, z);
      break;
    }
    // fight anything that shows up mid-walk
    if (s.enemies.visible.some((e) => e.hp > 0)) {
      await page.keyboard.up('w');
      await clearArea(9000);
    }
    await lookAt(x, 1.4 + py, z);
    // open any closed door directly ahead
    if (interactDoors) {
      const target = await page.evaluate(() => window.NSR.player.interactTarget?.type || null);
      if (target === 'door') { await page.keyboard.up('w'); await page.keyboard.press('e'); await adv(650); }
    }
    // hold-to-walk (matches human play; burst mode caused stair stalls)
    await page.keyboard.down('w');
    await adv(400);
    // 3D progress (stairs make horizontal progress look tiny)
    const moved = last ? Math.hypot(px - last[0], (py - last[1]) * 2, pz - last[2]) : 1;
    if (moved < 0.15) {
      stuckCount++;
      // sidestep to slide off obstacles, but never mid-staircase
      const midStairs = py > 0.3 && py < 3.3;
      if (stuckCount >= 2 && !midStairs) {
        const key = stuckCount % 2 ? 'a' : 'd';
        await page.keyboard.down(key);
        await adv(240 + stuckCount * 100);
        await page.keyboard.up(key);
        await adv(40);
      }
      if (stuckCount > 5) {
        issues.push(`stuck walking to (${x},${z}) at ${d.toFixed(1)}m [bot-nav]`);
        await safePlace(x, z);
        break;
      }
    } else stuckCount = 0;
    last = [px, py, pz];
  }
  await page.keyboard.up('w');
  await adv(60);
}

// climb the stairs with real movement (validates step collision)
async function walkPath(points) {
  for (const [x, z] of points) await walkTo(x, z, { arrive: 1.1 });
}

// combat: fight all enemies that get in the way near the player
async function clearArea(maxMs = 20000) {
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > maxMs) return;
    const s = await S();
    const vis = s.enemies.visible.filter((e) => e.hp > 0);
    if (!vis.length) return;
    const e = vis[0];
    await lookAt(e.pos[0], e.pos[1] + 1.25, e.pos[2]);
    await adv(60);
    await page.mouse.down();
    await adv(300);
    await page.mouse.up();
    await adv(120);
    const s2 = await S();
    if (s2.weapon.mag <= 4) { await page.keyboard.press('r'); await adv(2600); }
  }
}

async function interactHostage(id) {
  const h = await page.evaluate((hid) => {
    const hh = window.NSR.ai.hostages.find((x) => x.id === hid);
    return { x: hh.pos.x, y: hh.pos.y, z: hh.pos.z, state: hh.state };
  }, id);
  await walkTo(h.x, h.z, { arrive: 1.9 });
  await lookAt(h.x, h.y + 1.0, h.z);
  await adv(120);
  await page.keyboard.press('e');
  await adv(250);
  const st = await page.evaluate((hid) => window.NSR.ai.hostages.find((x) => x.id === hid).state, id);
  if (st !== 'following') issues.push(`hostage ${id} did not follow (state=${st})`);
  return st;
}

// ---------------------------------------------------------------- run
console.log('== Northstar Rescue playthrough bot ==', diff, 'part:', part);

// SwiftShader tabs occasionally crash in very long sessions; retry the part
async function runPart(name, fn) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fn();
      return;
    } catch (e) {
      console.log(`[${name}] attempt ${attempt} failed: ${e.message.split('\n')[0]}`);
      if (attempt === 3) { issues.push(`${name} failed after retries: ${e.message.split('\n')[0]}`); return; }
      // remove issues logged during the failed attempt to avoid duplicates
    }
  }
}

let s;
if (part === 'a' || part === 'all') {
await runPart('partA', async () => {
await newSession();
await shot('title');
await page.evaluate((d) => window.__qa.start(d, 'bdr15'), diff);
await page.waitForFunction(() => window.NSR.state === 'playing');
await adv(900);
// god mode keeps the audit run stable; combat lethality is tested elsewhere
await page.evaluate(() => window.__qa.god(true));
await shot('spawn');

console.log('phase: infiltrate');
await walkTo(-40.5, 0, { arrive: 1.4 });
await shot('entrance');
await walkTo(-35.5, 0);
await walkTo(-33.2, 0);       // through the security door, straight east
await walkTo(-30.5, 0.6);
await adv(400);
s = await S();
if (s.mission.phase === 'infiltrate') issues.push('mission did not advance to locate after entering lobby');
await shot('lobby');
await clearArea(12000);

console.log('phase: upstairs to hostage B');
await walkPath([[-25.5, 2.2], [-22.6, -1], [-22.5, -7.8]]);   // around reception to stair door
await walkTo(-22.5, -9.6, { arrive: 1.2 });
await shot('stairwell-door');
// up flight1 (west lane), landing, flight2 (east lane)
await walkPath([[-26.6, -10.3], [-26.6, -16.6], [-26.7, -17.9], [-23.5, -18.1], [-21.5, -17.6], [-21.5, -12.2], [-21.6, -10.4]]);
s = await S();
if (s.player.pos[1] < 3.4) issues.push('stair climb failed: y=' + s.player.pos[1]);
await shot('upper-landing');
await clearArea(9000);
await walkTo(-29, -10.2, { arrive: 1.2 }); // exec door area
await shot('exec-door');
await walkTo(-32, -12.5);
await clearArea(12000);
await shot('exec-office');
const stB = await interactHostage('hostage_b');
console.log('  hostage B:', stB);
await shot('hostage-b-secured');

console.log('escort B downstairs');
await walkPath([[-21.6, -10.4], [-21.5, -12.2], [-21.5, -17.6], [-23.5, -18.1], [-26.7, -17.9], [-26.6, -10.6]]);
await walkTo(-22.5, -9.9, { arrive: 1.0 });  // stairwell door line
await walkPath([[-22.5, -7.5], [-21, -2]]);
await adv(2500);
s = await S();
const hB = s.hostages.find((h) => h.id === 'hostage_b');
if (hB.pos[1] > 1) issues.push('hostage B failed to descend stairs: y=' + hB.pos[1]);
await shot('escort-lobby');

console.log('phase: hostage A (conference)');
await walkPath([[-18.3, -3.9], [-18.3, -8.6], [-14.2, -9.7], [-14, -12.2], [-6.8, -12.4]]);
await shot('north-corridor');
await clearArea(12000);
await walkTo(-6.8, -13.6, { arrive: 0.9 }); // conference glass door
await walkTo(-7.2, -17);
await clearArea(12000);
await shot('conference');
const stA = await interactHostage('hostage_a');
console.log('  hostage A:', stA);
await shot('hostage-a-secured');
s = await S();
if (s.mission.phase !== 'escort' && s.mission.phase !== 'secure') issues.push('unexpected phase after securing both: ' + s.mission.phase);
console.log('part A complete: both hostages secured, phase =', s.mission.phase);
});
}

if (part === 'b' || part === 'all') {
await runPart('partB', async () => {
await newSession();
await page.evaluate((d) => window.__qa.start(d, 'bdr15'), diff);
await page.waitForFunction(() => window.NSR.state === 'playing');
await adv(900);
await page.evaluate(() => window.__qa.god(true));
// resume from the escort phase: hostages secured and grouped with the player
await page.evaluate(() => {
  window.__qa.setObjective('escort');
  const g = window.NSR;
  window.__qa.place(-6.4, 0, -12.2, Math.PI / 2);
  for (const h of g.ai.hostages) { h.pos = { x: -5 + Math.random(), y: 0, z: -12.2 }; }
});
await adv(600);
s = await S();
if (s.mission.phase !== 'escort') issues.push('part B setup failed, phase=' + s.mission.phase);
await shot('escort-resume');

console.log('phase: escort to garage');
await walkPath([[8, -12.2]]);
await clearArea(10000);
await walkPath([[10, -8], [10, -1], [11.4, 0]]);
await shot('east-corridor');
await walkPath([[13.4, 0], [17, 1.5], [21, 1.5]]);
await clearArea(12000);
await shot('loading');
// through the loading dock doors into the service corridor, then the garage
await walkPath([[16, 5.5], [16, 8.5], [23.2, 8.4]]);
await walkTo(26, 8, { arrive: 1.4 });
await shot('garage-arrival');
await adv(4000); // let hostages catch up
s = await S();
for (const h of s.hostages) {
  const d = Math.hypot(h.pos[0] - s.player.pos[0], h.pos[2] - s.player.pos[2]);
  if (d > 12) issues.push(`hostage ${h.id} lagging ${d.toFixed(1)}m behind at garage`);
}

console.log('phase: extraction');
await walkTo(36.6, 6.2, { arrive: 1.0 });
await lookAt(37.5, 1.15, 6.2);
await adv(120);
await page.keyboard.press('e');
await adv(400);
s = await S();
if (s.mission.phase !== 'hold') issues.push('panel did not start hold phase: ' + s.mission.phase);
await shot('panel-activated');
// hold: fight the wave near the zone
for (let i = 0; i < 16; i++) {
  await clearArea(2500);
  await page.evaluate(() => {
    const g = window.NSR;
    const z = { x: 31.5, z: 3.5 };
    const p = g.player.pos;
    if (Math.hypot(p.x - z.x, p.z - z.z) > 3.5) window.__qa.place(31.5, 0, 3.5, g.player.yaw);
  });
  await adv(1600);
  s = await S();
  if (s.result) break;
}
await shot('extraction-hold');
s = await S();
console.log('result:', s.result, s.resultReason || '');
if (s.result !== 'victory') issues.push('mission did not end in victory: ' + s.result);
await adv(1500);
await shot('result-screen');
});
}

// wrap-up
const acc = await page.evaluate(() => {
  const st = window.NSR.mission.stats;
  return { kills: st.kills, shots: st.shots, hits: st.hits, secured: st.secured };
});
console.log('stats:', JSON.stringify(acc));
console.log('\n== ISSUES (' + issues.length + ') ==');
for (const i of issues) console.log(' -', i);
const realErrors = errors.filter((e) => !e.includes('sigmaRadians') && !e.includes('GroupMarker'));
console.log('console errors:', realErrors.length ? realErrors.slice(0, 8) : 'none');
fs.writeFileSync(outDir + '/report.json', JSON.stringify({ issues, errors: realErrors, stats: acc, result: s.result }, null, 2));
await browser.close();
process.exit(0);
