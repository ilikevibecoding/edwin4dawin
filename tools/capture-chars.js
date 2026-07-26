// Fable 4 capture scenarios: character turntables, first-person weapon views, animation
// mid-states and VFX close-ups. Copy of the shared harness in tools/capture.js (per the
// working agreement, agents add scenarios in their own tool file).
// Usage: SERVER=http://127.0.0.1:5173 node tools/capture-chars.js [scenario ...]
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5173';
const OUT = 'artifacts/shots';
fs.mkdirSync(OUT, { recursive: true });

function makeHelpers(page, scenarioName, report) {
  const helpers = {
    page,
    async qa(method, ...args) {
      return page.evaluate(([m, a]) => window.__qa[m](...a), [method, args]);
    },
    // quickStart + stop the RAF loop: advanceTime() steps/renders manually, and idle RAF
    // renders otherwise saturate the swiftshader GPU process (30 s+ per screenshot)
    async start(difficulty = 'operator') {
      await helpers.qa('quickStart', difficulty);
      await page.evaluate(() => { window.__game.engine.running = false; });
    },
    // NOTE: applyPlayerCamera() force-shows the viewmodel every frame while no camera
    // override is active, so the flag is re-applied (plus one frame) before each shot.
    async hideViewmodel(hide = true) {
      helpers._hideVm = hide;
      await page.evaluate((h) => { const vm = window.__game.mission.viewModel; if (vm) vm.root.visible = !h; }, hide);
    },
    async adv(ms) {
      return page.evaluate((v) => window.advanceTime(v), ms);
    },
    async shot(name) {
      if (helpers._hideVm) {
        await page.evaluate(() => { const vm = window.__game.mission.viewModel; if (vm) vm.root.visible = false; });
        await helpers.adv(20); // render a frame with the new visibility
      }
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      // generous timeout: swiftshader rasterization is slow when the VM is loaded
      await page.screenshot({ path: file, timeout: 120000 });
      report.shots.push(file);
      return file;
    },
    async state() {
      return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    },
    async holdKey(code, ms) {
      await helpers.qa('press', code);
      await helpers.adv(ms);
      await helpers.qa('release', code);
    },
    async fireBurst(ms = 300) {
      await helpers.qa('mouse', 0, true);
      await helpers.adv(ms);
      await helpers.qa('mouse', 0, false);
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return helpers;
}

// stage a frozen character in the open snow south of the entry-court wall
// (the courtyard wall sits at z~44.5 — keep clearance and shoot from the south)
const STAGE = [14, 0, 48.5];

async function stageChar(h, type, weapon = 'keep', pose = null, aiming = false) {
  await h.page.evaluate(([pos, t, w, p, aim]) => {
    const qa = window.__qa;
    qa.freezeAI(true);
    const m = window.__game.mission;
    // clear previous staged enemies
    for (const e of m.enemies.filter((x) => x.id.startsWith('qa-'))) { e.dispose(); m.enemies.splice(m.enemies.indexOf(e), 1); }
    const id = qa.spawnEnemy(t, pos);
    const e = m.enemies.find((x) => x.id === id);
    e.yaw = Math.PI; // face +Z (toward the sunlit south side)
    e.rig.group.rotation.y = e.yaw;
    if (w !== 'keep') e.rig.attachWeapon(w);
    if (p) e.rig.setPose(p);
    e.rig.setAiming(aim);
    window.__stagedEnemy = id;
    return id;
  }, [STAGE, type, weapon, pose, aiming]);
  await h.adv(400);
}

// subject faces +Z; a=90 puts the camera due south (sun side) for a lit front view
async function orbitShots(h, name, radius, height, angles = [90, 45, 150, 270]) {
  for (const a of angles) {
    await h.qa('cameraOrbit', STAGE[0], STAGE[1] + 0.9, STAGE[2], radius, height, a, 50);
    await h.adv(120);
    await h.shot(`${name}-r${radius}-a${a}`);
  }
}

export const SCENARIOS = {
  // ---- character turntables at 1m/3m/8m ----
  async 'char-hostiles'(h) {
    await h.start();
    await h.hideViewmodel();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    for (const type of ['scout', 'trooper', 'heavy']) {
      await stageChar(h, type, 'keep', null, true);
      await orbitShots(h, type, 3, 0.7);
      await h.qa('cameraOrbit', STAGE[0], STAGE[1] + 1.35, STAGE[2], 1.1, 0.25, 90, 50);
      await h.adv(100);
      await h.shot(`${type}-face-1m`);
      await h.qa('cameraOrbit', STAGE[0], STAGE[1] + 0.9, STAGE[2], 8, 2.2, 70, 50);
      await h.adv(100);
      await h.shot(`${type}-8m`);
    }
  },
  async 'char-hostages'(h) {
    await h.start();
    await h.hideViewmodel();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    // hostages live in the mission; view them in place (server room + exec office)
    await h.qa('cameraOrbit', 45.4, 0.9, 4.2, 2.4, 0.5, 150, 50);
    await h.adv(300);
    await h.shot('hostage-a-captive');
    await h.qa('cameraOrbit', 45.4, 1.3, 4.2, 1.1, 0.3, 170, 50);
    await h.adv(100);
    await h.shot('hostage-a-face');
    await h.qa('cameraOrbit', 45.0, 4.5, 21.0, 2.4, 0.5, 150, 50);
    await h.adv(150);
    await h.shot('hostage-b-captive');
    await h.qa('cameraOrbit', 45.0, 4.9, 21.0, 1.1, 0.3, 200, 50);
    await h.adv(100);
    await h.shot('hostage-b-face');
  },
  // ---- animation states ----
  async 'char-anim'(h) {
    await h.start();
    await h.hideViewmodel();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    // walk cycle mid-stride (frozen AI won't walk; use unfrozen patrol instead)
    await h.page.evaluate(([pos]) => {
      const qa = window.__qa;
      const m = window.__game.mission;
      qa.freezeAI(false);
      const id = qa.spawnEnemy('trooper', pos, [[pos[0], 0, pos[1] === 0 ? pos[2] : pos[2]], [pos[0] - 8, 0, pos[2]]]);
      window.__stagedEnemy = id;
      // keep the player far away so the patroller stays calm
      qa.teleport([24, 0, 55], 0);
      qa.god(true);
    }, [STAGE]);
    await h.adv(2400);
    await h.qa('cameraOrbit', STAGE[0] - 3, 0.9, STAGE[2], 4, 0.8, 110, 50);
    await h.adv(60);
    await h.shot('walk-mid');
    await h.adv(400);
    await h.shot('walk-mid2');
    // death variants
    for (let i = 0; i < 2; i++) {
      await stageChar(h, 'trooper');
      await h.qa('cameraOrbit', STAGE[0], 0.7, STAGE[2], 3.4, 1.0, 80, 50);
      await h.page.evaluate(() => {
        const m = window.__game.mission;
        const e = m.enemies.find((x) => x.id === window.__stagedEnemy);
        e.damage(9999, null, 'debug');
      });
      await h.adv(450);
      await h.shot(`death-${i}-mid`);
      await h.adv(1400);
      await h.shot(`death-${i}-settled`);
    }
    // flinch + cower + kneel on staged rig
    await stageChar(h, 'scout');
    await h.page.evaluate(() => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === window.__stagedEnemy);
      e.rig.flinch();
    });
    await h.qa('cameraOrbit', STAGE[0], 0.9, STAGE[2], 3, 0.7, 90, 50);
    await h.adv(80);
    await h.shot('flinch');
    await stageChar(h, 'trooper', 'keep', 'cower');
    await h.adv(200);
    await h.shot('cower');
    // reload gesture
    await stageChar(h, 'trooper', 'keep', null, false);
    await h.page.evaluate(() => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === window.__stagedEnemy);
      e.rig.playReload();
    });
    await h.adv(500);
    await h.shot('reload-gesture');
  },
  // ---- first-person weapons: idle / ADS / fire / reload / pump ----
  async 'fp-weapons'(h) {
    await h.start();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    await h.qa('teleport', 'plaza', 0);
    await h.adv(300);
    for (const id of ['halcyon-hc4', 'boreal-k5', 'vanta-s12', 'meridian-lr8']) {
      await h.qa('selectPrimary', id);
      await h.adv(200); // mid-draw
      await h.shot(`${id}-draw`);
      await h.adv(900);
      await h.shot(`${id}-idle`);
      await h.qa('mouse', 2, true);
      await h.adv(500);
      await h.shot(`${id}-ads`);
      await h.qa('mouse', 2, false);
      await h.adv(300);
      await h.fireBurst(140);
      await h.adv(30);
      await h.shot(`${id}-fire`);
      await h.adv(200);
      if (id === 'vanta-s12') {
        await h.adv(240); // mid-pump
        await h.shot(`${id}-pump`);
        await h.adv(1000);
      }
      await h.qa('press', 'KeyR');
      await h.adv(80);
      await h.qa('release', 'KeyR');
      await h.adv(700);
      await h.shot(`${id}-reload`);
      await h.adv(2600);
    }
    // sidearm + knife + throwables
    await h.qa('selectSlot', 1);
    await h.adv(800);
    await h.shot('karst-p9-idle');
    await h.fireBurst(80);
    await h.adv(30);
    await h.shot('karst-p9-fire');
    await h.qa('press', 'KeyR'); await h.adv(80); await h.qa('release', 'KeyR');
    await h.adv(650);
    await h.shot('karst-p9-reload');
    await h.adv(2200);
    await h.qa('selectSlot', 3);
    await h.adv(600);
    await h.shot('cq-blade-idle');
    await h.fireBurst(60);
    await h.adv(180);
    await h.shot('cq-blade-slash');
    await h.adv(800);
    await h.qa('selectSlot', 4);
    await h.adv(600);
    await h.shot('fb-3-idle');
    await h.qa('mouse', 0, true);
    await h.adv(200);
    await h.shot('fb-3-windup');
    await h.qa('mouse', 0, false);
    await h.adv(2200);
    await h.qa('selectSlot', 5);
    await h.adv(600);
    await h.shot('sg-2-idle');
  },
  // ---- enemies carrying weapons + dropped weapon on death ----
  async 'world-weapons'(h) {
    await h.start();
    await h.hideViewmodel();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    for (const [type, r] of [['scout', 2.2], ['trooper', 2.2], ['heavy', 2.2]]) {
      await stageChar(h, type, 'keep', null, true);
      await h.qa('cameraOrbit', STAGE[0], 1.1, STAGE[2], r, 0.35, 80, 50);
      await h.adv(120);
      await h.shot(`carry-${type}`);
    }
    // drop on death
    await h.page.evaluate(() => {
      const m = window.__game.mission;
      const e = m.enemies.find((x) => x.id === window.__stagedEnemy);
      e.damage(9999, null, 'debug');
    });
    await h.adv(1600);
    await h.qa('cameraOrbit', STAGE[0], 0.4, STAGE[2], 3.2, 1.6, 140, 50);
    await h.adv(100);
    await h.shot('dropped-weapon');
  },
  // ---- VFX: impacts per material, smoke, flash, tracers ----
  async 'vfx-suite'(h) {
    await h.start();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    // concrete/exterior wall impacts (plaza wall)
    await h.qa('teleport', 'plaza', 0);
    await h.qa('setYawPitch', 180, 2);
    await h.adv(700);
    await h.fireBurst(500);
    await h.adv(60);
    await h.shot('impact-exterior');
    // interior drywall
    await h.qa('teleport', 'corr-e', 0);
    await h.qa('setYawPitch', 90, 0);
    await h.adv(400);
    await h.fireBurst(400);
    await h.adv(60);
    await h.shot('impact-drywall');
    // metal (server racks) + glass
    await h.qa('teleport', 'server', 0);
    await h.adv(400);
    await h.fireBurst(400);
    await h.adv(50);
    await h.shot('impact-server');
    await h.qa('teleport', 'lobby', 180);
    await h.adv(400);
    await h.fireBurst(300);
    await h.adv(60);
    await h.shot('impact-lobby-glass');
    // muzzle flash per family (dark room for readability)
    await h.qa('setLighting', 'dark');
    for (const id of ['karst-p9', 'halcyon-hc4', 'vanta-s12']) {
      if (id === 'karst-p9') { await h.qa('selectSlot', 1); } else { await h.qa('selectPrimary', id); }
      await h.adv(1000);
      await h.qa('refillAmmo');
      await h.qa('mouse', 0, true);
      await h.adv(50);
      await h.shot(`flash-${id}`);
      await h.qa('mouse', 0, false);
      await h.adv(400);
    }
    await h.qa('setLighting', 'production');
    // smoke + flash volumes staged directly at a fixed point (the real throw path is
    // exercised in fp-weapons; thrown grenades bounce out of frame for beauty shots)
    await h.qa('teleport', 'plaza', 0);
    await h.adv(300);
    const vfxAt = async (fn, ...args) => h.page.evaluate(([f, a, p]) => {
      const m = window.__game.mission;
      m.vfx[f]({ x: p[0], y: p[1], z: p[2] }, ...a);
      window.__qa.cameraOrbit(p[0], 1.4, p[2], 6.5, 0.8, 90, 55);
    }, [fn, args, [STAGE[0], 0.2, STAGE[2]]]);
    await vfxAt('smokeVolume', 2.5, 16);
    await h.adv(1800);
    await h.shot('smoke-early');
    await h.adv(6000);
    await h.shot('smoke-mid');
    await h.adv(9500);
    await h.shot('smoke-late');
    await h.adv(6000);
    await vfxAt('flashBurst');
    await h.adv(60);
    await h.shot('flashbang');
    await h.adv(500);
    await h.shot('flash-sparkle');
    await h.qa('cameraOff');
    // breath vapor outside (force the interval timer so the puff lands mid-shot)
    await h.qa('teleport', 'plaza', 0);
    await stageChar(h, 'scout', 'keep', null, false);
    await h.qa('cameraOrbit', STAGE[0], 1.4, STAGE[2], 2.0, 0.2, 80, 50);
    await h.page.evaluate(() => {
      const e = window.__game.mission.enemies.find((x) => x.id === window.__stagedEnemy);
      e.rig.breathTimer = 0.01;
    });
    await h.adv(320); // puff at peak opacity (k~0.27)
    await h.shot('breath-1');
    await h.adv(400);
    await h.shot('breath-2');
    // dust motes in the lobby sunbeams
    await h.qa('cameraOff');
    await h.qa('teleport', [22, 0, 27], 210);
    await h.adv(500);
    await h.shot('dust-motes');
  },
  // ---- perf snapshot in a busy scene ----
  async 'perf-check'(h) {
    await h.start();
    await h.qa('god', true);
    await h.qa('freezeAI', true);
    await h.qa('teleport', 'lobby');
    await h.qa('spawnEnemy', 'trooper', [20, 0, 28]);
    await h.qa('spawnEnemy', 'scout', [24, 0, 29]);
    await h.qa('spawnEnemy', 'heavy', [28, 0, 28]);
    await h.adv(400);
    const perf = await h.qa('perf');
    h.log('perf:', JSON.stringify(perf));
    await h.shot('lobby-3-enemies');
  },
};

// ---------------------------------------------------------------------------
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) { console.error('unknown scenario:', name); failures++; continue; }
  console.log(`SCENARIO ${name}`);
  // the shared vite dev server full-reloads pages when other agents save files;
  // scenarios are idempotent, so retry from scratch when the context is destroyed
  let ok = false;
  for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
    // 720p: swiftshader rasterization cost scales with pixels and the shared VM is busy
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const report = { shots: [], errors: [] };
    page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
    try {
      await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 60000 });
      await fn(makeHelpers(page, name, report));
      const errs = await page.evaluate(() => window.__consoleErrors);
      report.errors.push(...errs);
      if (report.errors.length) {
        failures++;
        console.log(`  ERRORS(${report.errors.length}):`, JSON.stringify(report.errors.slice(0, 6), null, 1));
      } else {
        console.log(`  ok — ${report.shots.length} shots`);
      }
      ok = true;
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (attempt < 4 && /Execution context was destroyed|__qa|Cannot read properties of undefined|waitForFunction/.test(msg)) {
        console.log(`  retry ${attempt} (dev-server reload): ${msg}`);
      } else {
        failures++;
        console.error(`  FAILED: ${msg}`);
        try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`) }); } catch { /* ignore */ }
        ok = true;
      }
    }
    await page.close();
  }
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
