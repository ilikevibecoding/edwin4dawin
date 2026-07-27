#!/usr/bin/env node
/**
 * Checks the `IWorld` contract against the built level.
 *
 * The consumers of this interface are all invisible in a screenshot. The AI
 * navigates by `coverPoints`, the airstrike rejects markers by `skyVisibility`,
 * the lighting rig occludes by the same call, and the HUD compass reads
 * `landmarks` — so every one of them can be quietly wrong while the captures
 * look perfect, and none of them will be caught by a typecheck either, because
 * the types are satisfied by any number at all.
 *
 * So this asserts on values rather than shapes: that sky visibility really is
 * near zero under the souk roof and near one on a parapet, that spawns are not
 * facing a wall at arm's length, that cover points claim protection in
 * directions that are genuinely protected, and that the four interiors can
 * actually be stood up in.
 *
 * Usage: world-contract.mjs
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage',
    '--mute-audio', '--window-size=320,180',
  ],
  protocolTimeout: 600000,
  defaultViewport: { width: 320, height: 180 },
});
const page = await browser.newPage();
page.setDefaultTimeout(600000);
await page.goto('http://127.0.0.1:5173/?capture=1&quality=low', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 300000, polling: 250 });

const report = await page.evaluate(() => {
  const THREE = window.__GAME__.THREE;
  const world = window.__GAME__.engine.get('world');
  const physics = window.__GAME__.engine.get('physics');
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const out = { checks: [], stats: {} };
  const check = (name, pass, detail) => out.checks.push({ name, pass: !!pass, detail });

  /* ------------------------------- inventory ------------------------------ */

  const spawns = world.spawnPoints;
  const cover = world.coverPoints;
  const marks = world.landmarks;
  out.stats.spawns = spawns.length;
  out.stats.cover = cover.length;
  out.stats.landmarks = marks.length;
  out.stats.lowCover = cover.filter((c) => c.low).length;
  out.stats.teams = spawns.reduce((a, s) => ((a[s.team] = (a[s.team] || 0) + 1), a), {});
  out.stats.landmarkNames = marks.map((m) => m.name);

  check('12+ spawn points', spawns.length >= 12, spawns.length);
  check('60+ cover points', cover.length >= 60, cover.length);
  check('both teams spawned', Object.keys(out.stats.teams).length >= 2, out.stats.teams);
  check('landmarks named', marks.length >= 6, marks.length);

  /* ------------------------- spawns are not walled in --------------------- */

  // A spawn facing a wall a metre away is unusable however good the geometry
  // behind it is, and it is the classic failure of derived spawn placement.
  // `raycastInto` writes into the caller's struct, so the vectors must exist.
  const hit = {
    point: v(0, 0, 0), normal: v(0, 0, 0), distance: 0, object: null, surface: 'concrete',
  };
  let blocked = 0;
  let notWalkable = 0;
  let sunken = 0;
  for (const s of spawns) {
    const o = v(s.position.x, s.position.y + 1.5, s.position.z);
    const d = v(Math.sin(s.heading), 0, Math.cos(s.heading));
    if (physics.raycastInto(o, d, 2.5, hit, 0xffffffff)) blocked++;
    if (!world.isWalkable(s.position.x, s.position.z)) notWalkable++;
    // The spawn must stand on the surface, not in it.
    const gy = world.terrainHeight(s.position.x, s.position.z);
    if (s.position.y < gy - 0.4) sunken++;
  }
  check('no spawn faces a wall within 2.5 m', blocked === 0, `${blocked} of ${spawns.length}`);
  check('every spawn is on walkable ground', notWalkable === 0, `${notWalkable} bad`);
  check('no spawn below the terrain', sunken === 0, `${sunken} sunken`);

  /* --------------------------- cover is real cover ------------------------ */

  /*
   * Each cover point claims a set of protected directions. Fire a ray along each
   * claim from head height and from crouch height: a claim that is open in both
   * is a lie, and an agent that trusts it dies in the open.
   */
  let falseClaims = 0;
  let claims = 0;
  let peekable = 0;
  const step = Math.max(1, Math.floor(cover.length / 120));
  for (let i = 0; i < cover.length; i += step) {
    const c = cover[i];
    claims++;
    // `normal` is the direction the cover protects against, so something solid
    // has to be that way within arm's reach of the shoulder.
    const o = v(c.position.x, c.position.y + (c.low ? 0.5 : 1.5), c.position.z);
    const d = v(c.normal.x, 0, c.normal.z).normalize();
    if (!physics.raycastInto(o, d, 2.2, hit, 0xffffffff)) falseClaims++;
    // Low cover must be shootable over: blocked at crouch, open standing.
    if (c.low) {
      const hi = v(c.position.x, c.position.y + 1.75, c.position.z);
      if (!physics.raycastInto(hi, d, 2.2, hit, 0xffffffff)) peekable++;
    }
  }
  out.stats.coverClaimsTested = claims;
  out.stats.coverFalseClaims = falseClaims;
  out.stats.lowCoverPeekable = peekable;
  check('cover claims are protected (>=90%)',
    claims > 0 && falseClaims / claims <= 0.1, `${falseClaims}/${claims} open`);
  check('low cover can be peeked over', peekable > 0, `${peekable} of the low sample`);
  check('some cover is low/crouchable', out.stats.lowCover >= 10, out.stats.lowCover);

  /* ---------------------------- sky visibility ---------------------------- */

  /*
   * The value has to be *graded*, not just non-constant: open street near 1,
   * arcade near 0, and the alley somewhere in between, or the airstrike will
   * either accept shots through a roof or refuse them in the open.
   */
  const sky = {};
  for (const m of marks) {
    const p = m.position ?? m;
    sky[m.name] = +world.skyVisibility(v(p.x, world.terrainHeight(p.x, p.z) + 0.2, p.z)).toFixed(3);
  }
  out.stats.skyByLandmark = sky;

  /*
   * Raised cover splits into two populations that must not be averaged together:
   * roof decks, which are open to the sky, and upper-storey rooms, which are not.
   * Testing straight up separates them, and then each is judged on its own — the
   * decks for being open, the rooms for being properly enclosed.
   */
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : -1);
  const deckSky = [];
  const upstairsSky = [];
  for (const c of cover) {
    if (c.position.y <= world.terrainHeight(c.position.x, c.position.z) + 2.5) continue;
    const up = v(c.position.x, c.position.y + 0.4, c.position.z);
    const roofed = physics.raycastInto(up, v(0, 1, 0), 8, hit, 0xffffffff);
    (roofed ? upstairsSky : deckSky).push(world.skyVisibility(c.position));
  }
  out.stats.deckCover = deckSky.length;
  out.stats.deckSkyMean = +mean(deckSky).toFixed(3);
  out.stats.upstairsCover = upstairsSky.length;
  out.stats.upstairsSkyMean = +mean(upstairsSky).toFixed(3);
  check('roof-deck cover sees most of the sky', mean(deckSky) > 0.6, out.stats.deckSkyMean);
  check('upper-storey cover is enclosed',
    upstairsSky.length === 0 || mean(upstairsSky) < 0.4, out.stats.upstairsSkyMean);

  const skyVals = Object.values(sky);
  out.stats.skyRange = [Math.min(...skyVals), Math.max(...skyVals)];
  check('sky visibility is graded across the map',
    Math.max(...skyVals) - Math.min(...skyVals) > 0.4, out.stats.skyRange);

  /* ------------------------------- interiors ------------------------------ */

  /*
   * "Enterable" means a person can stand inside and there is a way in. Sampling
   * a grid for walkable cells that have something solid overhead finds real
   * rooms; testing headroom on each proves they are rooms and not crawlspaces.
   */
  const rooms = [];
  for (let x = -70; x <= 70; x += 2) {
    for (let z = -50; z <= 50; z += 2) {
      if (!world.isWalkable(x, z)) continue;
      const gy = world.terrainHeight(x, z);
      const o = v(x, gy + 0.4, z);
      if (!physics.raycastInto(o, v(0, 1, 0), 12, hit, 0xffffffff)) continue;
      // Roofed. Headroom is the distance to whatever is above.
      if (hit.distance < 1.9) continue;
      rooms.push({ x, z, head: +hit.distance.toFixed(2) });
    }
  }
  out.stats.interiorCells = rooms.length;
  check('interior floor area found (>=4 rooms worth)', rooms.length >= 40, rooms.length);

  /* ----------------------------- bounds & nav ----------------------------- */

  check('inBounds rejects outside the map',
    !world.inBounds(v(200, 2, 0)) && !world.inBounds(v(0, 2, 200)));
  check('inBounds accepts the centre', world.inBounds(v(0, 2, 0)));

  // nearestNavPoint must return somewhere actually walkable, including when
  // asked from inside a wall.
  /*
   * Ground-level queries must come back on the walk grid. Raised queries are
   * checked separately, because a roof deck is legitimately not "walkable" in a
   * grid that stores one floor height per cell — for those the requirement is
   * that the answer is somewhere a capsule fits, which is what the headroom test
   * below actually asks.
   */
  const navBad = [];
  for (const p of [v(0, 2, 0), v(-60, 2, -40), v(55, 2, 40), v(-30, 2, 25), v(20, 2, -35)]) {
    const n = world.nearestNavPoint(p);
    if (!world.isWalkable(n.x, n.z)) navBad.push([p.x, p.z, +n.x.toFixed(1), +n.z.toFixed(1)]);
  }
  check('nearestNavPoint lands on walkable ground', navBad.length === 0, JSON.stringify(navBad));

  const navRaised = [];
  for (const p of [v(0, 12, 0), v(-40, 9, -20), v(30, 10, 20)]) {
    const n = world.nearestNavPoint(p);
    const o = v(n.x, n.y + 0.35, n.z);
    // Standing room, and something solid to stand on.
    const head = physics.raycastInto(o, v(0, 1, 0), 2.0, hit, 0xffffffff);
    const floor = physics.raycastInto(o, v(0, -1, 0), 1.2, hit, 0xffffffff)
      || n.y <= world.terrainHeight(n.x, n.z) + 0.6;
    if (head || !floor) navRaised.push([p.x, p.y, p.z, head ? 'no headroom' : 'no floor']);
  }
  check('nearestNavPoint from above finds a real surface',
    navRaised.length === 0, JSON.stringify(navRaised));

  check('terrainHeight varies (not a flat plane)',
    Math.abs(world.terrainHeight(-60, -40) - world.terrainHeight(50, 35)) > 0.15,
    [world.terrainHeight(-60, -40).toFixed(2), world.terrainHeight(50, 35).toFixed(2)]);

  check('root holds the level', !!world.root && world.root.children.length > 0,
    world.root?.children.length);

  return out;
});

const pad = (s, n) => String(s).padEnd(n);
let failed = 0;
console.log('\nIWorld contract\n');
for (const c of report.checks) {
  if (!c.pass) failed++;
  console.log(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${pad(c.name, 46)} ${c.detail ?? ''}`);
}
console.log('\nStats\n');
for (const [k, val] of Object.entries(report.stats)) {
  console.log(`  ${pad(k, 22)} ${JSON.stringify(val)}`);
}
console.log(`\n${report.checks.length - failed}/${report.checks.length} checks passed\n`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
