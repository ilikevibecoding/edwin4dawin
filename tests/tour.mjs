// Multi-view screenshot harness. Boots the game once, then walks a list of
// camera setups and writes a PNG per view. Software rasterisation makes page
// loads expensive, so capturing a whole critique sheet in one session is much
// faster than running tests/shot.mjs per angle.
//
//   node tests/tour.mjs [--out=artifacts/tour] [--views=hero,helm,hold]
//   [--url=...] [--width=960] [--height=540] [--settle=1200]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const outDir = resolve(flag('out', 'artifacts/tour'));
const url = flag('url', 'http://127.0.0.1:5173/?quality=high');
const width = Number(flag('width', '960'));
const height = Number(flag('height', '540'));
const showHud = flag('hud', '0') !== '0';
const settle = Number(flag('settle', '1400'));
const only = flag('views', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Each view gets a `setup` snippet evaluated in the page. Helpers live on
 * `window.__t` (installed below): `free` parks the camera in world space,
 * `shipCam` parks it in the player ship's frame, `restore` gives the camera
 * back to the player controller.
 */
const VIEWS = [
  {
    name: 'sky',
    note: 'cumulus overhead, nothing else in frame',
    setup: `__t.sail(9.5, 0.3); __t.free([0, 40, 0], [500, 220, 120]);`,
  },
  {
    name: 'hero',
    note: 'three-quarter exterior from just above the water',
    setup: `__t.sail(9.5, 0.55); __t.shipCam([26, 5.5, 18], [0, 5, 0]);`,
  },
  {
    name: 'helm-third',
    note: 'over the shoulder at the wheel',
    setup: `__t.sail(9.5, 0.6); __t.thirdPerson(); __t.helm(); __t.rudder(0.7); __t.shipCam([-3.4, 4.2, 2.6], [-7.6, 3.1, 0]);`,
  },
  {
    name: 'helm-first',
    note: 'hands on the wheel, looking forward',
    setup: `__t.sail(9.5, 0.6); __t.firstPerson(); const r = __t.helm(); r + ' pos=' + JSON.stringify(window.game.player.position.toArray().map(v => +v.toFixed(2)));`,
  },
  {
    name: 'helm-close',
    note: 'the wheel itself, rudder hard over',
    setup: `__t.sail(9.5, 0.6); __t.rudder(0.9); __t.shipCam([-4.6, 3.9, 2.1], [-7.2, 3.4, 0]);`,
  },
  {
    name: 'helm-pirate',
    note: 'close on the helmsman with his hands on the spokes',
    setup: `__t.sail(9.5, 0.6); __t.thirdPerson(); __t.helm(); __t.rudder(0.8); __t.shipCam([-5.6, 3.6, 1.8], [-8.1, 3.2, 0]);`,
  },
  {
    name: 'deck',
    note: 'main deck looking forward under the sails',
    setup: `__t.sail(9.5, 0.6); __t.shipCam([-3.2, 3.9, 1.3], [9, 3.0, -0.6]);`,
  },
  {
    name: 'bow',
    note: 'bow wave at speed',
    setup: `__t.sail(9.5, 0.9); __t.shipCam([14, 2.4, 5.5], [6, 0.4, 0]);`,
  },
  {
    name: 'bow-nofoam',
    note: 'diagnostic: bow with the hull foam skirt suppressed',
    setup: `__t.sail(9.5, 0.9); window.game.playerShip.model.hullFoamMaterial.uniforms.uSpeed.value = 0; __t.shipCam([14, 2.4, 5.5], [6, 0.4, 0]);`,
  },
  {
    name: 'bow-nowake',
    note: 'diagnostic: bow with the ocean wake trail suppressed',
    setup: `__t.sail(9.5, 0.9); window.game.ocean.material.uniforms.uWakeActive.value = 0; __t.shipCam([14, 2.4, 5.5], [6, 0.4, 0]);`,
  },
  {
    name: 'hold',
    note: 'below deck, looking aft from the foot of the ladder',
    setup: `__t.sail(9.5, 0.4); __t.shipCam([1.6, 0.1, 0], [-7.4, -0.4, 0]);`,
  },
  {
    name: 'hold-fwd',
    note: 'below deck, looking forward past the cargo',
    setup: `__t.sail(9.5, 0.4); __t.shipCam([-6.4, 0.1, 0.4], [4.5, -0.3, -0.2]);`,
  },
  {
    name: 'hold-hatch',
    note: 'looking up the hatch from the hold',
    setup: `__t.sail(9.5, 0.4); __t.shipCam([-1.6, -0.4, 0.9], [1.4, 2.4, -0.1]);`,
  },
  {
    name: 'anchor',
    note: 'anchor dropped over the bow',
    setup: `__t.sail(9.5, 0.2); __t.anchor(true); __t.shipCam([16, 2.0, 4.5], [11.5, 0.6, 1.4]);`,
  },
  {
    name: 'island',
    note: 'beach and palms from the shallows',
    setup: `__t.island(2);`,
  },
  {
    name: 'ashore',
    note: 'standing on dry land among the scrub',
    setup: `__t.ashore(2);`,
  },
  {
    name: 'opensea',
    note: 'deep water under way, nothing else in frame',
    setup: `__t.opensea();`,
  },
  {
    name: 'island-far',
    note: 'island silhouette from the sea',
    setup: `__t.islandFar(2);`,
  },
  {
    name: 'combat',
    note: 'broadside on an enemy sloop',
    setup: `__t.combat();`,
  },
  {
    name: 'sunset',
    note: 'golden hour',
    setup: `__t.time(17.6); __t.sail(9.5, 0.5); __t.shipCam([26, 5.0, 16], [0, 5, 0]);`,
  },
  {
    name: 'night',
    note: 'lantern light at night',
    setup: `__t.time(21.6); __t.sail(9.5, 0.35); __t.shipCam([18, 4.2, 12], [0, 4, 0]);`,
  },
  {
    name: 'underwater',
    note: 'hull from below the surface',
    setup: `__t.sail(9.5, 0.6); __t.shipCam([9, -3.2, 7], [-2, -0.8, 0]);`,
  },
];

const helpers = `
window.__t = {
  get g() { return window.game; },
  _cam(fn) {
    const g = window.game;
    if (!g.__origCam) g.__origCam = g.player.updateCamera.bind(g.player);
    g.player.updateCamera = fn;
  },
  restore() {
    const g = window.game;
    if (g.__origCam) g.player.updateCamera = g.__origCam;
  },
  free(p, t) {
    this._cam(() => {
      const c = window.engine.camera;
      c.position.set(p[0], p[1], p[2]);
      c.lookAt(t[0], t[1], t[2]);
    });
  },
  shipCam(off, look) {
    const s = window.game.playerShip;
    this._cam(() => {
      const c = window.engine.camera;
      const p = s.localToWorld(new window.THREE.Vector3(off[0], off[1], off[2]));
      const l = s.localToWorld(new window.THREE.Vector3(look[0], look[1], look[2]));
      c.position.copy(p);
      c.lookAt(l);
    });
  },
  /** Sets the hour and stops the clock, so a slow capture cannot drift into night. */
  time(h) {
    window.env.secondsPerHour = 1e7;
    window.env.timeOfDay = h;
    window.env.update(0.016, window.engine.camera.position);
  },
  /** Wind bearing in radians plus how far the sails are lowered (0..1). */
  sail(windAngle, amount) {
    const s = window.game.playerShip;
    if (windAngle !== undefined) window.env.windAngle = windAngle;
    s.sailAmount = amount;
    s.anchorUp = true;
    s.anchorRaise = 1;
    s.autoTrim(window.env, 4);
    // Software rendering only manages a frame every few seconds, so the ship
    // would never actually accelerate during a tour: give it way directly.
    const knots = amount * 6.5;
    s.velocity.set(Math.cos(s.heading) * knots, 0, Math.sin(s.heading) * knots);
    if (s.model.hullFoamMaterial) s.model.hullFoamMaterial.uniforms.uSpeed.value = Math.min(1, amount * 1.4);
  },
  rudder(v) { window.game.playerShip.rudder = v; },
  anchor(down) {
    const s = window.game.playerShip;
    s.anchorUp = !down;
    s.anchorRaise = down ? 0 : 1;
  },
  helm() {
    const g = window.game;
    g.leaveStation();
    g.enterStation('helm');
    // The station lock constrains movement but does not teleport, and the
    // player may be anywhere aboard when a tour starts.
    if (g.player.stationLock) g.player.position.copy(g.player.stationLock);
    return 'station=' + g.station + ' pos=' + JSON.stringify(g.player.position.toArray());
  },
  firstPerson() { window.game.player.firstPerson = true; this.restore(); },
  thirdPerson() { window.game.player.firstPerson = false; this.restore(); },
  /** Parks the camera just off the beach, looking along the shore. */
  island(index) {
    const g = window.game;
    const isle = g.islands.islands[index];
    const angle = 2.3;
    // Walk out from the centre until the ground drops below the waterline.
    let r = isle.radius * 0.4;
    for (let i = 0; i < 400; i++) {
      const x = isle.x + Math.cos(angle) * r;
      const z = isle.z + Math.sin(angle) * r;
      if (g.islands.heightAt(x, z) < -1.2) break;
      r += 1;
    }
    const cx = isle.x + Math.cos(angle) * (r + 14);
    const cz = isle.z + Math.sin(angle) * (r + 14);
    const tx = isle.x + Math.cos(angle - 0.5) * (r - 26);
    const tz = isle.z + Math.sin(angle - 0.5) * (r - 26);
    this.free([cx, 2.6, cz], [tx, 5, tz]);
  },
  /** Drops the player on dry land above the tideline, seen over the shoulder. */
  ashore(index) {
    const g = window.game;
    const isle = g.islands.islands[index];
    const angle = 2.3;
    // Walk in from open water until the ground is clear of the surf.
    let r = isle.radius * 1.3;
    for (let i = 0; i < 800; i++) {
      if (g.islands.heightAt(isle.x + Math.cos(angle) * r, isle.z + Math.sin(angle) * r) > 1.8) break;
      r -= 0.4;
    }
    const px = isle.x + Math.cos(angle) * r;
    const pz = isle.z + Math.sin(angle) * r;
    const py = g.islands.heightAt(px, pz);
    const p = g.player;
    g.leaveStation();
    p.mode = 'land';
    p.ship = null;
    p.velocity.set(0, 0, 0);
    p.position.set(px, py, pz);
    // Facing back out to sea, camera over the shoulder a few paces behind.
    p.yaw = angle;
    p.pitch = 0;
    p.firstPerson = false;
    const back = 3.4;
    const side = 1.3;
    const cx = px - Math.cos(angle) * back + Math.cos(angle + Math.PI / 2) * side;
    const cz = pz - Math.sin(angle) * back + Math.sin(angle + Math.PI / 2) * side;
    // Stand the camera on whatever the ground does behind him: a few paces up
    // a dune is metres higher, and a fixed offset buries the lens in the hill.
    const cy = Math.max(g.islands.heightAt(cx, cz), py) + 1.7;
    this.free([cx, cy, cz], [px, py + 1.0, pz]);
    return 'r=' + r.toFixed(1) + ' y=' + py.toFixed(2);
  },
  /** Deep water, well away from any island. */
  opensea() {
    const g = window.game;
    const s = g.playerShip;
    s.position.set(0, s.position.y, 0);
    let best = null;
    for (let a = 0; a < 12; a++) {
      for (let d = 400; d < 2200; d += 200) {
        const x = Math.cos((a / 12) * Math.PI * 2) * d;
        const z = Math.sin((a / 12) * Math.PI * 2) * d;
        const h = g.islands.heightAt(x, z);
        if (!best || h < best.h) best = { x, z, h };
      }
    }
    s.position.set(best.x, s.position.y, best.z);
    this.sail(9.5, 0.85);
    this.shipCam([22, 6.0, 16], [0, 4, 0]);
    return 'depth=' + best.h.toFixed(1);
  },
  islandFar(index) {
    const g = window.game;
    const isle = g.islands.islands[index];
    const d = isle.radius + 120;
    this.free([isle.x + d, 8, isle.z + d * 0.6], [isle.x, 14, isle.z]);
  },
  combat() {
    const g = window.game;
    const s = g.playerShip;
    const e = g.fleet[0];
    if (!e) return 'no enemy';
    const p = s.position;
    e.ship.position.set(p.x + 34, e.ship.position.y, p.z + 8);
    e.ship.heading = s.heading;
    this.shipCam([-2, 6.5, 26], [4, 2.5, -6]);
    return 'ok';
  },
};
'installed';
`;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const page = await browser.newPage({ viewport: { width, height } });

const logs = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' || msg.type() === 'warning' || text.startsWith('READY')) logs.push(`[${msg.type()}] ${text}`);
});
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page
  .waitForFunction(() => window.__gameReady === true, { timeout: 120000 })
  .catch(() => logs.push('[warn] __gameReady never became true'));
await page.evaluate(helpers);
// Dismiss the title screen so gameplay systems are live.
await page.evaluate(() => {
  if (window.game.state !== 'playing') window.game.begin();
});
if (!showHud) await page.evaluate(() => window.game.hud.setVisible(false));
// Software rendering takes the best part of a minute per frame; without pinning
// the clock, a tour drifts from morning to dusk while it runs.
await page.evaluate(() => window.__t.time(9.4));
await page.waitForTimeout(1200);

const results = [];
for (const view of VIEWS) {
  if (only.length && !only.includes(view.name)) continue;
  const out = `${outDir}/${view.name}.png`;
  // A dev-server hot reload wipes the page, so put the harness back if needed.
  const alive = await page.evaluate(() => typeof window.__t !== 'undefined' && window.__gameReady === true);
  if (!alive) {
    await page.waitForFunction(() => window.__gameReady === true, { timeout: 120000 }).catch(() => {});
    await page.evaluate(helpers);
    await page.evaluate(() => {
      if (window.game.state !== 'playing') window.game.begin();
    });
    if (!showHud) await page.evaluate(() => window.game.hud.setVisible(false));
    await page.evaluate(() => window.__t.time(9.4));
    logs.push(`[reinstalled harness before ${view.name}]`);
  }
  try {
    const r = await page.evaluate(view.setup);
    if (r) logs.push(`[setup ${view.name}] ${r}`);
  } catch (err) {
    logs.push(`[setup error ${view.name}] ${err.message}`);
  }
  await page.waitForTimeout(settle);
  // Freeze the loop and draw exactly one frame before grabbing it: left
  // running, software rendering keeps queuing frames and the capture waits for
  // all of them. The game's own per-frame step has to run first, since that is
  // what places the camera and follows the sea with it.
  await page.evaluate(() => {
    window.engine.stop();
    for (let i = 0; i < 8; i++) window.engine.onFixedUpdate(1 / 60);
    window.engine.onRender(1 / 60);
    window.engine.render();
  });
  await page.screenshot({ path: out, timeout: 300000, animations: 'disabled' });
  await page.evaluate(() => window.engine.start());
  results.push(view.name);
}

const stats = await page.evaluate(() => {
  const info = window.engine?.renderer?.info;
  return info
    ? {
        frameMs: Number(window.engine.frameMs?.toFixed(1)),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs?.length ?? 0,
        textures: info.memory.textures,
      }
    : null;
});

console.log(JSON.stringify({ outDir, views: results, stats, logs }, null, 2));
await browser.close();
