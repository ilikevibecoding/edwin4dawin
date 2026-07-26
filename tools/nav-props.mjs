// Fable 3 nav check: nav-lab plus the prop pass, so prop colliders are baked into the navgrid.
// Verifies (a) every checkpoint reaches the garage, (b) both hostages reach the extraction
// point, (c) every enemy patrol waypoint is reachable from its spawn.
global.window = { addEventListener() {}, __consoleErrors: [], location: { search: '' } };
global.document = {
  createElement: () => ({
    width: 0, height: 0, style: {},
    getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }),
    addEventListener() {},
  }),
  addEventListener() {},
};
global.localStorage = { getItem: () => null, setItem() {} };
global.performance = global.performance || { now: () => Date.now() };

const THREE = await import('three');
const { CollisionWorld } = await import('../src/core/collide.js');
const { buildMap } = await import('../src/map/builder.js');
const { placeProps } = await import('../src/props/index.js');
const { NavGrid } = await import('../src/ai/navgrid.js');
const { CHECKPOINTS, HOSTAGES, ENEMIES, EXTRACTION } = await import('../src/map/layout.js');

const scene = new THREE.Scene();
const world = new CollisionWorld();
const map = buildMap(scene, world);
const before = world.colliders.length;
placeProps(scene, world, map);
console.log('colliders: map', before, '+ props', world.colliders.length - before);
const nav = new NavGrid(world, { minX: -10, maxX: 50, minZ: -8, maxZ: 46 }).bake();
console.log('nodes:', nav.nodes.length, 'bakeMs:', nav.bakeMs.toFixed(0));

function connected(a, b) {
  const ai = nav.nearestNode(...a), bi = nav.nearestNode(...b);
  if (ai < 0 || bi < 0) return { connected: false, reason: 'no node' };
  const seen = new Set([ai]);
  const stack = [ai];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === bi) return { connected: true };
    for (const nb of nav.nodes[cur].edges) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
  }
  return { connected: false, regionSize: seen.size };
}

const garage = [7, 0, 6];
let fails = 0;

console.log('\ncheckpoint connectivity sweep (target: garage):');
for (const [name, cp] of Object.entries(CHECKPOINTS)) {
  const r = connected([cp[0], cp[1], cp[2]], garage);
  if (!r.connected) { fails++; console.log(`  FAIL ${name}: ${JSON.stringify(r)}`); }
}
console.log(fails === 0 ? '  all checkpoints reach the garage' : `  ${fails} checkpoint(s) disconnected`);

console.log('\nhostage escort routes (hostage -> extraction):');
for (const h of HOSTAGES) {
  const r = connected(h.pos, EXTRACTION.center);
  console.log(`  ${h.id} ${JSON.stringify(h.pos)} -> extraction: ${r.connected ? 'ok' : 'FAIL ' + JSON.stringify(r)}`);
  if (!r.connected) fails++;
}

console.log('\nenemy patrol waypoints reachable from spawn:');
let patrolFails = 0;
for (const e of ENEMIES) {
  for (const wp of e.patrol) {
    const r = connected(e.pos, wp);
    if (!r.connected) { patrolFails++; fails++; console.log(`  FAIL ${e.id} spawn ${JSON.stringify(e.pos)} -> wp ${JSON.stringify(wp)}`); }
  }
}
console.log(patrolFails === 0 ? '  all patrol waypoints reachable' : `  ${patrolFails} waypoint(s) unreachable`);

process.exit(fails ? 1 : 0);
