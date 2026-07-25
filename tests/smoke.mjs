// Headless gameplay smoke test. Boots the game in Chromium, then drives the
// simulation directly (no rendering) to play through the core loop: weigh
// anchor, set sail, fire a cannon, spring a leak and patch it, dig up treasure,
// sell it, fight a skeleton, and swim back aboard.
//
//   node tests/smoke.mjs [--url=http://127.0.0.1:5173/?quality=low]
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const url = flag('url', 'http://127.0.0.1:5173/?quality=low');

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 520 } });

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(`console: ${msg.text()}`);
});

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.__gameReady === true, { timeout: 60000 });
await page.click('#btn-play');
// Stop the render loop; the tests advance the simulation themselves.
await page.evaluate(() => window.engine.stop());

const results = await page.evaluate(() => {
  const out = [];
  const game = window.game;
  const THREE = window.THREE;
  const ship = game.playerShip;
  const player = game.player;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const check = (name, condition, detail = '') => out.push({ name, pass: !!condition, detail: String(detail) });
  const step = (frames = 1) => game.stepSimulation(1 / 60, frames);
  const pressE = () => game.input.simulatePress('KeyE');
  // Press once and keep the key down, exactly like a real keyboard: pressing
  // every frame would re-trigger tap interactions.
  const holdKey = (code, frames) => {
    game.input.simulatePress(code);
    step(frames);
    game.input.simulateRelease(code);
  };
  const holdE = (frames) => holdKey('KeyE', frames);
  const holdMouse = (frames) => {
    game.input.simulateMousePress(0);
    step(frames);
    game.input.simulateMouseRelease(0);
  };

  // --- The world built at all.
  check('world has islands', game.islands.islands.length > 15, `${game.islands.islands.length} islands`);
  check('outposts built', game.outposts.length === 2, `${game.outposts.length}`);
  check('voyage assigned', !!game.voyage, game.voyage?.island?.name ?? 'none');
  check('player starts aboard', player.isAboard && player.mode === 'ship', player.mode);

  // --- Buoyancy: the hull should settle near the water line, not sink or fly.
  step(180);
  const surface = game.ocean.waterHeight(ship.position.x, ship.position.z);
  check('ship floats at the waterline', Math.abs(ship.position.y - surface) < 1.2, `y=${ship.position.y.toFixed(2)} water=${surface.toFixed(2)}`);
  check('player stays on deck', player.position.y > 0.5 && player.mode === 'ship', `local y=${player.position.y.toFixed(2)}`);

  // --- Walking about on a deck that is itself pitching and rolling.
  game.placePlayerOnShip(V(3.5, 1.05, -2.0), Math.PI);
  const walkStart = player.position.clone();
  holdKey('KeyW', 60);
  check('player walks on deck', player.position.distanceTo(walkStart) > 1.5, `${player.position.distanceTo(walkStart).toFixed(2)} m`);
  check('player stays at deck height', Math.abs(player.position.y - 1.05) < 0.35, `y=${player.position.y.toFixed(2)}`);
  check('player still aboard after walking', player.isAboard, player.mode);

  // Bulwarks should stop you walking off the side.
  game.placePlayerOnShip(V(2, 1.05, 0), -Math.PI / 2);
  holdKey('KeyW', 120);
  check('bulwark keeps the player aboard', player.isAboard && Math.abs(player.position.z) < 3.1, `z=${player.position.z.toFixed(2)}`);

  // The open hatch is a hole in the deck: step over it and you drop into the hold.
  game.placePlayerOnShip(V(2.3, 1.6, 0));
  step(90);
  check('open hatch drops you into the hold', player.position.y < -1.0, `y=${player.position.y.toFixed(2)}`);

  // --- Capstan: the anchor interaction and station.
  game.placePlayerOnShip(V(4.2, 1.05, 0));
  game.facePlayerAt(ship.model.anchors.capstan.getWorldPosition(V(0, 0, 0)));
  step(2);
  check('capstan interaction offered', game.currentInteractionId === 'anchor-raise', game.currentInteractionId);
  pressE();
  step(1);
  check('manning the capstan', game.station === 'capstan', game.station);
  step(240);
  check('anchor raised', ship.anchorRaise >= 1, ship.anchorRaise.toFixed(2));

  // --- Sails: raise them at the mast and check the ship makes way.
  game.placePlayerOnShip(V(0.4, 1.05, 1.4));
  game.facePlayerAt(ship.model.anchors.sails.getWorldPosition(V(0, 0, 0)));
  step(2);
  check('sail interaction offered', game.currentInteractionId === 'sails', game.currentInteractionId);
  pressE();
  step(1);
  check('working the sails', game.station === 'sails', game.station);
  holdKey('KeyW', 140);
  check('sails lowered', ship.sailAmount > 0.9, ship.sailAmount.toFixed(2));

  // Out into open water, well clear of the outpost's shallows.
  ship.place(0, 820, game.env.windAngle);
  game.placePlayerOnShip(V(2, 1.05, -1.5));
  step(60);

  // Sailing into the wind should barely move her: a square rig cannot do it.
  ship.heading = game.env.windAngle + Math.PI;
  for (let i = 0; i < 300; i++) {
    ship.autoTrim(game.env, 1 / 60);
    step(1);
  }
  check('cannot sail into the wind', ship.speed < 2.6, `${(ship.speed * 1.94).toFixed(1)} kn`);

  // Turn downwind, trim the yard, and she should pick up real speed.
  ship.heading = game.env.windAngle;
  const before = ship.position.clone();
  for (let i = 0; i < 900; i++) {
    ship.autoTrim(game.env, 1 / 60);
    step(1);
  }
  const travelled = ship.position.distanceTo(before);
  check('ship sails with the wind', ship.speed > 2.5, `${(ship.speed * 1.94).toFixed(1)} kn`);
  check('ship covered ground', travelled > 55, `${travelled.toFixed(0)} m`);
  check('sail trim is efficient', ship.trimQuality(game.env) > 0.7, ship.trimQuality(game.env).toFixed(2));

  // --- Steering.
  const headingBefore = ship.heading;
  game.placePlayerOnShip(V(-6.5, 2.45, 0));
  game.facePlayerAt(ship.model.anchors.helm.getWorldPosition(V(0, 0, 0)));
  step(2);
  check('helm interaction offered', game.currentInteractionId === 'helm', game.currentInteractionId);
  pressE();
  step(1);
  holdKey('KeyD', 180);
  check('rudder turns the ship', Math.abs(ship.heading - headingBefore) > 0.15, `turned ${(((ship.heading - headingBefore) * 180) / Math.PI).toFixed(0)} deg`);
  pressE();
  step(1);
  check('left the helm', game.station === 'none', game.station);

  // --- Cannons.
  const cannon = ship.model.cannons[0];
  game.placePlayerOnShip(cannon.stand.clone());
  game.facePlayerAt(ship.model.anchors['cannon-0'].getWorldPosition(V(0, 0, 0)));
  step(2);
  check('cannon interaction offered', game.currentInteractionId === 'cannon-0', game.currentInteractionId);
  pressE();
  step(1);
  check('manning a cannon', game.station === 'cannon', game.station);
  const ballsBefore = player.count('cannonballs');
  game.input.simulateMousePress(0);
  step(2);
  check('cannon fired', game.projectiles.activeCount > 0, `${game.projectiles.activeCount} in flight`);
  check('cannonball consumed', player.count('cannonballs') === ballsBefore - 1, `${player.count('cannonballs')} left`);
  step(120);
  pressE();
  step(1);

  // --- Damage, flooding, and repair.
  const hullPoint = ship.localToWorld(V(-2, -0.9, 2.6));
  ship.takeCannonHit(hullPoint, 1);
  check('cannon hit opens a breach', ship.openHoles > 0, `${ship.openHoles} holes`);
  step(240);
  check('breach floods the hold', ship.floodLevel > 0.01, `${(ship.floodLevel * 100).toFixed(1)}%`);

  player.equip(4); // planks
  const hole = ship.holes[0];
  game.placePlayerOnShip(V(hole.local.x, -1.35, hole.local.z * 0.4));
  game.facePlayerAt(ship.localToWorld(hole.local.clone()));
  step(2);
  check('repair interaction offered', game.currentInteractionId === 'repair', game.currentInteractionId);
  holdE(200);
  check('breach repaired', ship.openHoles === 0, `${ship.openHoles} holes`);

  player.equip(3); // bucket
  const floodBefore = ship.floodLevel;
  holdMouse(120);
  check('bailing lowers the water', ship.floodLevel < floodBefore, `${(floodBefore * 100).toFixed(1)}% -> ${(ship.floodLevel * 100).toFixed(1)}%`);

  // --- Swimming and climbing back aboard.
  const overboard = ship.localToWorld(V(-6, -1.6, 4.5));
  game.placePlayerInWorld(overboard);
  step(30);
  check('player swims when overboard', player.mode === 'swim' || player.mode === 'climb', player.mode);
  for (let i = 0; i < 400; i++) {
    if (player.mode === 'climb') game.input.simulatePress('KeyW');
    step(1);
    if (player.isAboard && player.mode === 'ship') break;
  }
  game.input.simulateRelease('KeyW');
  check('climbed back aboard', player.isAboard, `${player.mode}`);

  // --- Island guardians: they should rise as soon as we make landfall.
  const site = game.voyage.sites[0];
  game.placePlayerInWorld(V(site.position.x + 6, site.position.y + 0.2, site.position.z));
  step(5);
  check('skeletons rise on the voyage island', game.skeletons.length > 0, `${game.skeletons.length} skeletons`);
  const skeleton = game.skeletons[0];
  if (skeleton) {
    game.placePlayerInWorld(skeleton.position.clone().add(V(1.6, 0.2, 0)));
    game.facePlayerAt(skeleton.position);
    player.equip(0);
    step(2);
    const healthBefore = skeleton.health;
    game.input.simulateMousePress(0);
    step(2);
    game.input.simulateMouseRelease(0);
    check('cutlass damages skeletons', skeleton.health < healthBefore, `${healthBefore} -> ${skeleton.health}`);

    // Standing toe to toe with them should cost us blood.
    const playerHealthBefore = player.health;
    step(300);
    check('skeletons fight back', player.health < playerHealthBefore, `${playerHealthBefore} -> ${player.health} hp`);
  }
  // Patch ourselves up: the rest of the run is about hauling loot, not surviving.
  if (player.dead) game.respawnPlayer();
  player.health = player.maxHealth;

  // --- Digging up treasure.
  game.placePlayerInWorld(V(site.position.x + 1.4, site.position.y + 0.2, site.position.z));
  player.equip(2); // shovel
  game.facePlayerAt(site.position);
  step(3);
  check('dig interaction offered', game.currentInteractionId === 'dig', game.currentInteractionId);
  holdE(220);
  check('treasure unearthed', site.dug && game.chests.length > 0, `${game.chests.length} chests`);

  // --- Carrying and selling.
  const chest = game.chests[0];
  game.placePlayerInWorld(chest.worldPosition.clone().add(V(1.2, 0.2, 0)));
  game.facePlayerAt(chest.worldPosition);
  step(3);
  check('chest can be lifted', (game.currentInteractionId ?? '').startsWith('chest-'), game.currentInteractionId);
  pressE();
  step(2);
  check('carrying the chest', !!game.carriedChest, game.carriedChest?.def?.name ?? 'none');

  const outpost = game.outposts[0];
  game.placePlayerInWorld(outpost.sell.clone().add(V(2, 0.2, 0)));
  game.facePlayerAt(outpost.sell);
  step(3);
  const goldBefore = game.gold;
  check('sell interaction offered', game.currentInteractionId === 'sell', game.currentInteractionId);
  pressE();
  step(2);
  check('treasure sold for gold', game.gold > goldBefore, `${goldBefore} -> ${game.gold}`);

  // --- Enemy fleet exists and sails.
  const enemy = game.fleet[0];
  const enemyStart = enemy ? enemy.ship.position.clone() : null;
  step(600);
  check('skeleton fleet is sailing', !!enemy && enemy.ship.position.distanceTo(enemyStart) > 10, enemy ? `${enemy.ship.position.distanceTo(enemyStart).toFixed(0)} m` : 'no fleet');

  // --- Drowning, dying and the Ferry of the Damned.
  const deepWater = V(0, -6, 900);
  game.placePlayerInWorld(deepWater);
  step(5);
  check('deep water counts as underwater', player.isUnderwater({ ships: game.ships, ocean: game.ocean, islands: game.islands, env: game.env }) || player.mode === 'swim', player.mode);

  player.damage(500, 'Test.');
  step(3);
  check('mortal wounds kill the player', player.dead && game.state === 'dead', game.state);
  game.respawnPlayer();
  step(3);
  check('respawning puts you back on your ship', !player.dead && player.isAboard && player.health === player.maxHealth, `${player.health} hp, ${player.mode}`);

  // --- Day/night and weather keep ticking.
  const clock = game.env.clockString();
  step(3600);
  check('time of day advances', game.env.clockString() !== clock, `${clock} -> ${game.env.clockString()}`);

  return out;
});

await browser.close();

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
if (pageErrors.length) {
  console.log('\nPage errors:');
  for (const err of [...new Set(pageErrors)].slice(0, 12)) console.log(`  ${err}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 && pageErrors.length === 0 ? 0 : 1);
